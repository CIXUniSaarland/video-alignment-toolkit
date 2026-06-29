import os
import sys

# Prevent the OpenMP duplicate-runtime abort (torch + MKL). Must precede torch import.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

# --- Locate the LAC research core (git submodule at <repo-root>/lac) -------------
# This file lives in <repo-root>/src/server/, while the encoders, datasets,
# evaluation, utils and configs live in the `lac` submodule. Put the submodule on
# the import path so `from dataset/model/utils/evaluation import ...` resolve, and
# chdir into it so the original relative paths (../datasets, config/...) keep working.
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_SERVER_DIR, "..", ".."))
_LAC_CORE = os.path.join(_REPO_ROOT, "lac")
for _p in (_LAC_CORE, _SERVER_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)
# Make this script's path absolute before the chdir so the reloader and
# multiprocessing 'spawn' can re-locate it (they resolve it relative to cwd).
sys.argv[0] = os.path.abspath(sys.argv[0])
_main = sys.modules.get("__main__")
if getattr(_main, "__file__", None):
    _main.__file__ = os.path.abspath(_main.__file__)
os.chdir(_LAC_CORE)
# --------------------------------------------------------------------------------

import json
from flask import Flask, Response, request, jsonify, stream_with_context, send_from_directory, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import subprocess
import os
from datetime import datetime
import re
from PIL import Image
import io

from loguru import logger

from dataset.util import read_video
from serverapi.frame_retr import frame_retr
from serverapi.align import align
from serverapi.anomaly_det import anomaly_det

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Training runs in a child process so it can be terminated cleanly (frees GPU memory).
import threading
import queue as _queue
import multiprocessing as mp
from train_runner import run_training
_mp_ctx = mp.get_context("spawn")
training_process = None
training_queue = None

# (dataset, video) -> duration in seconds; avoids re-reading unchanged files.
_duration_cache = {}

# (dataset, video) -> decoded frames array, so repeated get_frame calls are fast.
_frames_cache = {}
_FRAMES_CACHE_MAX = 4

@app.route('/')
def hello():
    return "Hello World!"

@app.route('/list_datasets', methods=['GET'])
def list_datasets():
    '''
    Retrieves a list of datasets available in the specified directory.
    Request:
        GET /list_datasets
    Returns:
        A JSON response containing the list of datasets.
    '''
    try:
        datasets_dir = '../datasets/'
        datasets = [name for name in os.listdir(datasets_dir) if os.path.isdir(os.path.join(datasets_dir, name))]
        return jsonify({'message': 'success', 'datasets': datasets})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/list_videos', methods=['POST'])
def list_videos():
    '''
    Retrieves a list of videos from a specified dataset.
    Request:
        POST /list_videos
        {
            "dataset": "dataset_name"
        }
    Returns:
        A JSON response containing the list of videos and a success message.
    '''
    try:
        data = request.get_json()
        logger.info(f"[POST /list_videos] Request received with data: {data}")
        dataset = data['dataset']
        videos_dir = f'../datasets/{dataset}/videos'
        videos = [name for name in os.listdir(videos_dir) if os.path.isfile(os.path.join(videos_dir, name))]
        return jsonify({'message': 'success', 'videos': videos})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_video_durations', methods=['POST'])
def get_video_durations():
    '''
    Retrieves the durations of the specified videos from a dataset.
    Request:
        POST /get_video_durations
        {
            "videos": ["video1.mp4", "video2.mp4"],
            "dataset": "dataset_name"
        }
    Returns:
        A JSON response containing the durations of the videos.
    '''
    try:
        import av
        data = request.get_json()
        videos = data['videos']
        dataset = data['dataset']
        videos_dir = f'../datasets/{dataset}/videos'

        durations = {}
        for video in videos:
            key = (dataset, video)
            if key in _duration_cache:
                durations[video] = _duration_cache[key]
                continue

            video_path = os.path.join(videos_dir, video)
            if not (os.path.isfile(video_path) and video.endswith('.mp4')):
                durations[video] = None
                continue

            # Read duration from container metadata (fast — no full decode).
            try:
                with av.open(video_path) as container:
                    if container.duration is not None:
                        dur = float(container.duration) / av.time_base
                    else:
                        stream = container.streams.video[0]
                        dur = float(stream.duration * stream.time_base)
                durations[video] = round(dur, 2)
                _duration_cache[key] = durations[video]
            except Exception as e:
                logger.warning(f"Could not read duration for {video}: {e}")
                durations[video] = None

        return jsonify({'message': 'success', 'durations': durations})
    except Exception as e:
        logger.exception("get_video_durations failed.")
        return jsonify({'message': 'error', 'error': str(e)})

@app.route('/save_config', methods=['POST'])
def save_config():
    """
    Save the configuration data received from a POST request.
    Request:
        POST /save_config
        {
            "config": "config",
            "saved_dir": "saved_dir",
        }
    Returns:
        A JSON response containing the success message, configuration path, 
        configuration directory, and whether the same directory flag is set.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /save_config] Request received with data: {data}")
        config = data['config']
        saved_dir = data['saved_dir']

        # Get the current date
        now = datetime.now()
        dd = now.strftime("%d")
        mm = now.strftime("%m")
        yyyy = now.strftime("%Y")
        
        os.makedirs(os.path.dirname(saved_dir), exist_ok=True)
        config_dir = f'{saved_dir}/{data["dataset"]}-{dd}-{mm}-{yyyy}'
        os.makedirs(config_dir, exist_ok=True)
        config_path = os.path.join(config_dir, 'config.json')

        if data["is_same_dir"]:
            config["trainer"]["log_dir"] = f'{config_dir}/logs'
            config["trainer"]["save_dir"] = f'{config_dir}/models'
            config["trainer"]["loguru_dir"] = f'{config_dir}/loguru'

        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)
        return jsonify({'message': 'success', 
                        'config_path': config_path, 
                        'config_dir': config_dir, 
                        "is_same_dir": data["is_same_dir"]})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

# @app.route('/train', methods=['POST'])
# def train():
#     try:
#         data = request.get_json()
#         logger.info(f"[POST /train] Request received with data: {data}")
#         config = data['config']
#         args = f"--config='{config}'"
        
#         command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python train.py {args}"
#         subprocess.run(command, shell=True, check=True, executable='/bin/bash')
        
#         return jsonify({'message': 'success'})
#     except Exception as e:
#         return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/train', methods=['POST'])
def train():
    """
    Start the training process using the configuration data received from a POST request.
    Request:
        POST /train
        {
            "config": "config"
        }
    Returns:
        A JSON response containing the success message.
    """
    global training_process, training_queue
    try:
        data = request.get_json()
        logger.info(f"[POST /train] Request received with data: {data}")
        config_path = data['config']

        # Stop any previous run before starting a new one.
        _terminate_training()

        training_queue = _mp_ctx.Queue()
        training_process = _mp_ctx.Process(
            target=run_training, args=(config_path, training_queue), daemon=True)
        training_process.start()

        # Forward the child's progress queue to the websocket.
        threading.Thread(target=_pump_logs, args=(training_process, training_queue), daemon=True).start()

        return jsonify({'message': 'Training started'})

    except Exception as e:
        logger.exception("Failed to start training process.")
        return jsonify({'message': 'error', 'error': str(e)})


def _pump_logs(proc, q):
    while True:
        try:
            event, payload = q.get(timeout=1)
        except _queue.Empty:
            if not proc.is_alive():
                break
            continue
        if event == "__done__":
            break
        socketio.emit(event, payload)


def _terminate_training():
    """Terminate the training child process if running (frees its GPU memory)."""
    global training_process
    proc = training_process
    if proc is not None and proc.is_alive():
        proc.terminate()
        proc.join(timeout=10)
        if proc.is_alive():
            proc.kill()
            proc.join(timeout=5)
    training_process = None


@app.route('/stop_training', methods=['GET'])
def stop_training():
    """
    Stop the training process.
    Request:
        GET /stop_training
    Returns:
        A JSON response containing the success message.
    """
    try:
        was_running = training_process is not None and training_process.is_alive()
        _terminate_training()
        if was_running:
            socketio.emit('training_progress', {'data': 'Training stopped by user.', 'stopped': True})
            return jsonify({'message': 'Training stopped'})
        return jsonify({'message': 'No training running'})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
def generate_logs(command):
    """
    Generate logs from the specified command.
    Args:
        command (str): The command to execute.
    Yields:
        str: The log data.
    """
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, executable='/bin/bash')
    for line in iter(process.stdout.readline, b''):
        yield f"data: {line.decode('utf-8')}\n\n"
    process.stdout.close()
    process.wait()
    
@app.route('/train_sse', methods=['GET'])
def train_sse():
    try:
        config_path = request.args.get('config')
        logger.info(f"[GET /train_sse] Request received with config: {config_path}")
        if not config_path:
            return jsonify({'message': 'error', 'error': "Missing 'config' parameter."}), 400

        command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python train.py --config='{config_path}'"

        return Response(stream_with_context(generate_logs(command)), content_type='text/event-stream')

    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/list_folders', methods=['POST'])
def list_folders():
    """
    List folders in the specified directory.
    Request:
        POST /list_folders
        {
            "directory": "directory"
        }
    Returns:
        A JSON response containing the list of folders and folders with config.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /list_folders] Request received with data: {data}")
        directory = data['directory']
        folders = [name for name in os.listdir(directory) if os.path.isdir(os.path.join(directory, name))]
        folders_with_config = []
        for folder in folders:
            config_file = os.path.join(directory, folder, 'config.json')
            if os.path.exists(config_file):
                folders_with_config.append(folder)
        return jsonify({'message': 'success', 'folders': folders, 'folders_with_config': folders_with_config})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_video', methods=['GET', 'POST'])
def get_video():
    """
    Retrieve the specified video file.
    Request:
        GET /get_video?dataset=dataset&video=video
        POST /get_video
        {
            "dataset": "dataset",
            "video": "video"
        }
    Returns:
        The video file.
    """
    try:
        if request.method == 'POST':
            # Handle POST request
            data = request.get_json()
            if not data or 'dataset' not in data or 'video' not in data:
                return jsonify({'message': 'error', 'error': 'Invalid request payload'}), 400
            
            dataset = data['dataset']
            video = data['video']
        
        elif request.method == 'GET':
            # Handle GET request
            dataset = request.args.get('dataset')
            video = request.args.get('video')
            if not dataset or not video:
                return jsonify({'message': 'error', 'error': 'Missing dataset or video parameter'}), 400

        # Absolute path: send_from_directory resolves relative dirs against the app
        # root (src/server), not the cwd (lac/), so build an absolute path here.
        video_path = os.path.abspath(os.path.join('..', 'datasets', dataset, 'videos'))

        if not os.path.isfile(os.path.join(video_path, video)):
            return jsonify({'message': 'error', 'error': 'Video file not found'}), 404

        return send_from_directory(video_path, video, mimetype='video/mp4')
        
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)}), 500
    
@app.route('/get_videos', methods=['POST'])
def get_videos():
    """
    Retrieve the specified video files.
    Request:
        POST /get_videos
        {
            "dataset": "dataset",
            "videos": ["video1", "video2"]
        }
    Returns:
        A JSON response containing the video GET URLs (above).
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /get_videos] Request received with data: {data}")
        dataset = data['dataset']
        videos = data['videos'] # list of video names
        video_path = f'../datasets/{dataset}/videos/'

        video_urls = []
        for video in videos:
            full_path = os.path.join(video_path, video)
            if os.path.exists(full_path):
                video_url = url_for('get_video', dataset=dataset, video=video)
                video_urls.append(video_url)
            else:
                return jsonify({'message': 'error', 'error': f"Video {video} not found."})
        
        return jsonify({'message': 'success', 'video_urls': video_urls})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

@app.route('/get_video_framerate', methods=['GET', 'POST'])
def get_video_framerate():
    """
    Retrieve the frame rate of the specified video.
    Request:
        GET /get_video_framerate?dataset=dataset&video=video
        POST /get_video_framerate
        {
            "dataset": "dataset",
            "video": "video"
        }
    Returns:
        A JSON response containing the frame rate of the video.
    """
    try:
        if request.method == 'POST':
            data = request.get_json()
            logger.info(f"[POST /get_video_framerate] Request received with data: {data}")
            dataset = data['dataset']
            video = data['video']
        elif request.method == 'GET':
            dataset = request.args.get('dataset')
            video = request.args.get('video')
            if not dataset or not video:
                return jsonify({'message': 'error', 'error': 'Missing dataset or video parameter'}), 400

        video_path = f'../datasets/{dataset}/videos/{video}'
        if not os.path.isfile(video_path):
            return jsonify({'message': 'error', 'error': 'Video file not found'}), 404
        # Read fps from container metadata (fast — no full decode).
        import av
        with av.open(video_path) as container:
            stream = container.streams.video[0]
            fps = float(stream.average_rate) if stream.average_rate else 30.0
        return jsonify({'message': 'success', 'frame_rate': fps})
    except Exception as e:
        logger.exception("get_video_framerate failed.")
        return jsonify({'message': 'error', 'error': str(e)})
    
    
@app.route('/align_videos', methods=['POST'])
def align_videos():
    """
    Align two videos based on dynamic time warping.
    Request:
        POST /align_videos
        {
            "dataset": "dataset",
            "video1": "video1",
            "video2": "video2",
            "directory": "directory"
        }
    Returns:
        A JSON response containing the success message and the alignment data.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /align_videos] Request received with data: {data}")
        dataset = data['dataset']
        video1 = data['video1']
        video2 = data['video2']
        directory = data['directory']
        
        data = align(dataset, directory, video1, video2)
        return jsonify({'message': 'success', 'result': data})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_frame', methods=['POST'])
def get_frame():
    """
    Retrieve the specified frame from the video.
    Request:
        POST /get_frame
        {
            "dataset": "dataset",
            "video": "video",
            "frame": "frame"
        }
    Returns:
        The frame image.
    """
    try:
        data = request.get_json()
        dataset = data['dataset']
        video = data['video']
        frame = int(data['frame'])
        video_path = f'../datasets/{dataset}/videos/{video}'

        # Decode the video once and cache the frames; subsequent frame requests
        # (e.g. hovering the alignment matrix) are then instant array lookups.
        key = (dataset, video)
        frames = _frames_cache.get(key)
        if frames is None:
            frames = read_video(video_path)
            if len(_frames_cache) >= _FRAMES_CACHE_MAX:
                _frames_cache.pop(next(iter(_frames_cache)))
            _frames_cache[key] = frames

        frame = max(0, min(frame, len(frames) - 1))
        image = Image.fromarray(frames[frame].astype('uint8'))
        img_io = io.BytesIO()
        image.save(img_io, 'JPEG')
        img_io.seek(0)

        return Response(img_io, mimetype='image/jpeg')
    except Exception as e:
        logger.exception("get_frame failed.")
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/frame_retrieval', methods=['POST'])
def frame_retrieval():
    """
    Retrieve the specified frame from the video.
    Request:
        POST /frame_retrieval
        {
            "dataset": "dataset",
            "video1": "video1",
            "video2": "video2",
            "frame1": "frame1",
            "directory": "directory"
        }
    Returns:
        A JSON response containing the success message and the frame retrieval data.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /frame_retrieval] Request received with data: {data}")
        dataset = data['dataset']
        video1 = data['video1']
        video2 = data['video2']
        frame1 = data['frame1']
        directory = data['directory']
        
        data = frame_retr(dataset, directory, video1, frame1, video2)

        return jsonify({'message': 'success', 'result': data })
    
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_default_config', methods=['GET'])
def get_default_config():
    """
    Get the default configuration for the training process.
    Request:
        GET /get_default_config
    Returns:
        A JSON response containing the default configuration.
    """
    try:
        config_path = 'config/pouring/lac.json'
        with open(config_path, 'r') as f:
            config = json.load(f)
        return jsonify({'message': 'success', 'config': config})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

@app.route('/list_config_files', methods=['GET'])
def list_config_files():
    """
    List all JSON configuration files under the config directory.
    Request:
        GET /list_config_files
    Returns:
        A JSON response containing relative config file paths.
    """
    try:
        config_root = 'config'
        configs = []

        for root, _, files in os.walk(config_root):
            for file_name in files:
                if file_name.endswith('.json'):
                    abs_path = os.path.join(root, file_name)
                    rel_path = os.path.relpath(abs_path, config_root)
                    configs.append(rel_path.replace('\\', '/'))

        configs.sort()
        return jsonify({'message': 'success', 'configs': configs})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

@app.route('/get_config_file', methods=['POST'])
def get_config_file():
    """
    Load a JSON configuration file from the config directory.
    Request:
        POST /get_config_file
        {
            "config_path": "relative/path.json"
        }
    Returns:
        A JSON response containing the config content.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /get_config_file] Request received with data: {data}")

        config_path = data.get('config_path') if data else None
        if not config_path:
            return jsonify({'message': 'error', 'error': "Missing 'config_path' parameter."}), 400

        config_root_abs = os.path.abspath('config')
        requested_path_abs = os.path.abspath(os.path.join(config_root_abs, config_path))

        if not requested_path_abs.startswith(config_root_abs + os.sep):
            return jsonify({'message': 'error', 'error': 'Invalid config path.'}), 400

        if not os.path.exists(requested_path_abs):
            return jsonify({'message': 'error', 'error': 'Config file not found.'}), 404

        with open(requested_path_abs, 'r') as f:
            config = json.load(f)

        return jsonify({'message': 'success', 'config': config, 'config_path': config_path})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_model_options', methods=['POST'])
def get_model_options():
    """
    Get the available models in the specified working directory.
    Request:
        POST /get_model_options
        {
            "working_dir": "working_dir"
        }
    Returns:
        A JSON response containing the available models.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /get_model_options] Request received with data: {data}")
        working_dir = data['working_dir']
        # check if working_dir exists
        model_working_dir = os.path.join(working_dir, 'models')
        if not os.path.exists(working_dir) or not os.path.exists(model_working_dir):
            return jsonify({'message': 'error', 'error': f"Working directory {working_dir} does not exist."})
        models = os.listdir(model_working_dir)
        return jsonify({'message': 'success', 'models': models})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/detect_anomaly', methods=['POST'])
def detect_anomaly():
    """
    Detect anomalies in the specified videos.
    Request:
        POST /detect_anomaly
        {
            "dataset": "dataset",
            "video1": "video1",
            "video2": "video2",
            "directory": "directory"
        }
    Returns:
        A JSON response containing the success message and the anomaly detection data.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /detect_anomaly] Request received with data: {data}")
        dataset = data['dataset']
        video1 = data['video1']
        video2 = data['video2']
        directory = data['directory']
        
        data = anomaly_det(dataset, directory, video1, video2)
        return jsonify({'message': 'success', 'result': data})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

if __name__ == '__main__':
    # use_reloader=False: reloader restarts kill in-flight training. Restart manually after edits.
    socketio.run(app, debug=True, port=5001, use_reloader=False)