import json
from flask import Flask, Response, request, jsonify, stream_with_context, send_from_directory, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import subprocess
import os
import glob
from datetime import datetime, timedelta
import re
from PIL import Image
import io

from loguru import logger
from moviepy.editor import VideoFileClip

from dataset.util import read_video
from serverapi.frame_retr import frame_retr
from serverapi.align import align

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Training process
training_process = None

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
        data = request.get_json()
        videos = data['videos']
        dataset = data['dataset']
        videos_dir = f'../datasets/{dataset}/videos'
        
        durations = {}
        for video in videos:
            video_path = os.path.join(videos_dir, video)
            if os.path.exists(video_path) and video_path.endswith('.mp4'):
                clip = VideoFileClip(video_path)
                durations[video] = clip.duration
                clip.close()
            else:
                durations[video] = "File not found or unsupported format"
        
        return jsonify({'message': 'success', 'durations': durations})
    except Exception as e:
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
    global training_process
    try:
        data = request.get_json()
        logger.info(f"[POST /train] Request received with data: {data}")
        config = data['config']
        args = f"--config='{config}'"
        
        # Use subprocess.Popen instead of subprocess.run to non-blockingly handle the process
        training_process = subprocess.Popen(
            f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python train.py {args}",
            shell=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            executable='/bin/bash'
        )

        loss_list = []

        def stream_process(process):
            for line in iter(process.stdout.readline, b''):
                line_decoded = line.decode().strip()
                logger.info(line_decoded)

                match = re.match(r"Epoch: (\d+) / (\d+), Loss: ([\d\.]+), Time: (.+)", line_decoded)
                if match:
                    logger.info("Matched")
                    epoch = int(match.group(1))
                    total_epochs = int(match.group(2))
                    loss = float(match.group(3))
                    time_elapsed = match.group(4) 
                    time_elapsed_obj = datetime.strptime(time_elapsed, "%H:%M:%S.%f") - datetime.strptime("00:00:00.0", "%H:%M:%S.%f")

                    progress = (epoch / total_epochs) * 100
                    if progress > 0:
                        # Calculate remaining time
                        estimated_total_time = time_elapsed_obj / (progress / 100)
                        remaining_time = estimated_total_time - time_elapsed_obj

                        remaining_time = str(remaining_time).split(".")[0]
                    else:
                        remaining_time = "Calculating..."

                    loss_list.append(loss)

                    socketio.emit('training_progress', {
                        'data': line_decoded,
                        'match': True,
                        'epoch': epoch,
                        'loss': loss,
                        'loss_list': loss_list,
                        'time': time_elapsed,
                        'progress': progress,
                        'remaining_time': remaining_time
                    })
                else:
                    socketio.emit('training_progress', {'data': line_decoded})

            process.stdout.close()
            return_code = process.wait()
            if return_code == 0:
                socketio.emit('training_progress', {'data': 'Training completed successfully.'})
            else:
                socketio.emit('training_progress', {'data': 'Error in training process.', 'error': True})
        
        from threading import Thread
        thread = Thread(target=stream_process, args=(training_process,))
        thread.start()

        return jsonify({'message': 'Training started'})
    except Exception as e:
        logger.exception("Failed to start training process.")
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/stop_training', methods=['GET'])
def stop_training():
    """
    Stop the training process.
    Request:
        GET /stop_training
    Returns:
        A JSON response containing the success message.
    """
    global training_process
    try:
        if training_process:
            training_process.terminate()
            training_process = None
            return jsonify({'message': 'Training stopped'})
        else:
            return jsonify({'message': 'No training process to stop'})
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

        # Common path for both GET and POST
        video_path = os.path.join('..', 'datasets', dataset, 'videos')

        if not os.path.exists(os.path.join(video_path, video)):
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
    
@app.route('/get_video_framerate', methods=['POST'])
def get_video_framerate():
    """
    Retrieve the frame rate of the specified video.
    Request:
        POST /get_video_framerate
        {
            "dataset": "dataset",
            "video": "video"
        }
    Returns:
        A JSON response containing the frame rate of the video.
    """
    try:
        data = request.get_json()
        logger.info(f"[POST /get_video_framerate] Request received with data: {data}")
        dataset = data['dataset']
        video = data['video']
        video_path = f'../datasets/{dataset}/videos/{video}'
        clip = VideoFileClip(video_path)
        # test = read_video(video_path)
        # logger.info(f"Test: {test.shape}")
        return jsonify({'message': 'success', 'frame_rate': clip.fps})
    except Exception as e:
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
        logger.info(f"[POST /get_frame] Request received with data: {data}")
        dataset = data['dataset']
        video = data['video']
        frame = data['frame']
        video_path = f'../datasets/{dataset}/videos/{video}'
        video = read_video(video_path)
        frame = video[frame]
        image = Image.fromarray(frame.astype('uint8'))
        img_io = io.BytesIO()
        image.save(img_io, 'JPEG')
        img_io.seek(0)

        return Response(img_io, mimetype='image/jpeg')
    except Exception as e:
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

if __name__ == '__main__':
    # app.run(debug=True, port=5001)
    socketio.run(app, debug=True, port=5001)