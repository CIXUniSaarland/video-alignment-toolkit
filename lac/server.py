import json
from flask import Flask, Response, request, jsonify, stream_with_context, send_from_directory
from flask_cors import CORS
import subprocess
import os
import glob
from datetime import datetime

from loguru import logger
from moviepy.editor import VideoFileClip

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return "Hello World!"

@app.route('/list_datasets', methods=['GET'])
def list_datasets():
    try:
        datasets_dir = '../datasets/'
        datasets = [name for name in os.listdir(datasets_dir) if os.path.isdir(os.path.join(datasets_dir, name))]
        return jsonify({'message': 'success', 'datasets': datasets})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/list_videos', methods=['POST'])
def list_videos():
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

@app.route('/train', methods=['POST'])
def train():
    try:
        data = request.get_json()
        logger.info(f"[POST /train] Request received with data: {data}")
        config = data['config']
        args = f"--config='{config}'"
        
        command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python train.py {args}"
        subprocess.run(command, shell=True, check=True, executable='/bin/bash')
        
        return jsonify({'message': 'success'})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
def generate_logs(command):
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

@app.route('/extract_embeddings', methods=['POST'])
def extract_embeddings():
    try:
        data = request.get_json()
        logger.info(f"[POST /extract_embeddings] Request received with data: {data}")
        config = data['config']
        outdir = data['directory']
        args = f"--config='{config}' --outdir='{outdir}'"
        
        command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python server/extract_embed.py {args}"
        subprocess.run(command, shell=True, check=True, executable='/bin/bash')
        
        return jsonify({'message': 'success'})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})

@app.route('/check_embeddings', methods=['POST'])
def check_embeddings():
    try:
        data = request.get_json()
        logger.info(f"[POST /check_embeddings] Request received with data: {data}")
        directory = data['directory']
        videos = data['videos']
        embeddings_dir = f'{directory}/embeddings'
        
        embeddings = {}
        for video in videos:
            video_name = os.path.splitext(video)[0]
            embedding_path = os.path.join(embeddings_dir, f'{video_name}.npy')
            embeddings[video] = os.path.exists(embedding_path)
        
        return jsonify({'message': 'success', 'embeddings': embeddings})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/list_folders', methods=['POST'])
def list_folders():
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
    
@app.route('/get_video', methods=['POST'])
def get_video():
    try:
        data = request.get_json()
        data_dir = '/home/cix-desktop-2/Documents/k/datasets/pouring/videos/'

        logger.info(f"[POST /get_video] Request received with data: {data}")
        dataset = data['dataset']
        video = data['video']
        video_path = f'../datasets/{dataset}/videos/{video}'
        # send from directory
        return send_from_directory(data_dir, video)
        
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/align_videos', methods=['POST'])
def align_videos():
    try:
        data = request.get_json()
        logger.info(f"[POST /align_videos] Request received with data: {data}")
        dataset = data['dataset']
        video1 = data['video1']
        video2 = data['video2']
        directory = data['directory']
        args = f"--dataset='{dataset}' --video1='{video1}' --video2='{video2}' --directory='{directory}'"
        
        command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python server/align.py {args}"
        result = subprocess.run(command, 
                       shell=True, 
                       check=True, 
                       executable='/bin/bash',
                       capture_output=True,
                       text=True)
        output_json = json.loads(result.stdout)
        
        return jsonify({'message': 'success', 'result': output_json})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/frame_retrieval', methods=['POST'])
def frame_retrieval():
    try:
        data = request.get_json()
        logger.info(f"[POST /frame_retrieval] Request received with data: {data}")
        dataset = data['dataset']
        video1 = data['video1']
        video2 = data['video2']
        frame1 = data['frame1']
        directory = data['directory']
        args = f"--dataset='{dataset}' --video1='{video1}' --video2='{video2}' --video1_frame={frame1} --directory='{directory}'"

        command = f"source ~/anaconda3/etc/profile.d/conda.sh && conda activate carl && python server/frame_retr.py {args}"
        result = subprocess.run(command, 
                                shell=True, 
                                check=True, 
                                executable='/bin/bash', 
                                capture_output=True, 
                                text=True)

        output_json = json.loads(result.stdout)

        return jsonify({'message': 'success', 'result': output_json})
    
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_default_config', methods=['GET'])
def get_default_config():
    try:
        config_path = 'config/pouring/lac.json'
        with open(config_path, 'r') as f:
            config = json.load(f)
        return jsonify({'message': 'success', 'config': config})
    except Exception as e:
        return jsonify({'message': 'error', 'error': str(e)})
    
@app.route('/get_model_options', methods=['POST'])
def get_model_options():
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
    app.run(debug=True, port=5001)