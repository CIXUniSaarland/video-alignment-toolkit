import glob
import random
import sys
import argparse
import os
sys.path.insert(1, '/home/cix-desktop-2/Documents/k/thesis-tmp')

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

from model.tcn import TCN
from model.tcc import TCC
from model.lac2 import LAC
import utils.parser as parser
import torch

import os
import math
import numpy as np
import matplotlib.pyplot as plt

# from dtw import dtw
from matplotlib.animation import FuncAnimation
from scipy.spatial.distance import cdist
from dataset import construct_eval_loader
from utils.util import load_ckpt
from dataset.util import read_video
from loguru import logger

from easydict import EasyDict
from model.model import *
from util import *

import json
from tqdm import tqdm

model_dict = {
    "Inceptionv3_SpatialSoftmax": Inceptionv3_SpatialSoftmax,
    "ResNet50_Conv": ResNet50_Conv,
    "ResNet50_Conv2": ResNet50_Conv2,
    "ResNet50_Transformer1": ResNet50_Transformer1,
    "ResNet50_Transformer2": ResNet50_Transformer2,
}

if __name__ == '__main__':
    args = argparse.ArgumentParser(description='Training')
    args.add_argument('-ds', '--dataset', default=None, type=str, required=True,)
    args.add_argument('-dr', '--directory', default=None, type=str, required=True,)
    args.add_argument('-v1', '--video1', default=None, type=str, required=True)
    args.add_argument('-v2', '--video2', default=None, type=str, required=True)
    args.add_argument('-d', '--device', default="cuda", type=str,
                        help='indices of GPUs to enable (default: all)')
    args.add_argument('-n', '--name', default=None, type=str, help='name of the experiment')
    
    args = args.parse_args()
    args.config = args.directory + '/config.json'
    cfg = parser.load_config(args)
    cfg = EasyDict(cfg)

    logger.info("Start extract embedding...")

    model = model_dict[cfg.arch.type](cfg)
    model = model.cuda()
    model, _, _ = load_ckpt(cfg, model, None)
    model.eval()
    
    dataset_path = os.path.join("../datasets", args.dataset)
    video1_path = os.path.join(dataset_path, 'videos', args.video1)
    video2_path = os.path.join(dataset_path, 'videos', args.video2)

    video1 = read_video(video1_path)
    video2 = read_video(video2_path)

    video1_name = os.path.splitext(os.path.basename(args.video1))[0]
    video2_name = os.path.splitext(os.path.basename(args.video2))[0]

    # check embedding exist or not
    embeddings_dir = os.path.join(args.directory, 'embeddings')
    os.makedirs(embeddings_dir, exist_ok=True)
    embedding_path1 = os.path.join(embeddings_dir, f'{video1_name}.npy')
    embedding_path2 = os.path.join(embeddings_dir, f'{video2_name}.npy')

    # check if outdr exist, if not create it
    outdir = args.directory + '/output'
    logger.info(f"Output directory: {outdir}")
    os.makedirs(outdir, exist_ok=True)

    if os.path.exists(embedding_path1) and os.path.exists(embedding_path2):
        logger.info(f"Embedding files for {video1_name} and {video2_name} already exist.")
        # get embeddings
        embs1 = np.load(embedding_path1)
        embs2 = np.load(embedding_path2)

        video_out_path = os.path.join(outdir, f"{video1_name}_{video2_name}/vid.mp4")
        os.makedirs(os.path.join(outdir, f"{video1_name}_{video2_name}"), exist_ok=True)

        # check if video exist, if not create_dynamic_video
        if not os.path.exists(video_out_path):
            create_dynamic_video(embs=[embs1, embs2], frames=[video1, video2], video_path=video_out_path, use_dtw=True)
            logger.success(f"Dynamic video created at {video_out_path}")

        output_path = os.path.join(outdir, f"{video1_name}_{video2_name}/data.json")
        if not os.path.exists(output_path):
            d, cost_mat, acc_cost_mat, path = dtw(embs1, embs2, dist=dist_fn)
            path = torch.tensor(path)

            normalized_acc_cost_mat = acc_cost_mat / acc_cost_mat.max()
            normalized_acc_cost_mat = [[float(f"{x:.3f}") for x in y] for y in normalized_acc_cost_mat.tolist()]

            data = {
                "v1": video1_name,
                "v2": video2_name,
                "path": path.T.tolist(),
                "acc_cost_mat": normalized_acc_cost_mat,
                "dtw_cost": d
            }
            with open(output_path, 'w') as f:
                json.dump(data, f)
            logger.success(f"Data saved to {output_path}")
            
        data = json.load(open(output_path))
        print(json.dumps(data))
        


    