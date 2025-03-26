import glob
import random
import sys
import argparse
import os
sys.path.insert(1, '../')

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

from model.tcn import TCN
from model.tcc import TCC
from model.lac import LAC
import utils.parser as parser
import torch

import os
import numpy as np
import matplotlib.pyplot as plt

from fastdtw import fastdtw
from matplotlib.animation import FuncAnimation
from scipy.spatial.distance import cdist
from dataset import construct_eval_loader
from utils.util import load_ckpt
from dataset.util import read_video
from loguru import logger

from easydict import EasyDict
from model.model import *
from types import SimpleNamespace
from serverapi.util import *

import json
from tqdm import tqdm

model_dict = {
    "Inceptionv3_SpatialSoftmax": Inceptionv3_SpatialSoftmax,
    "ResNet50_Conv": ResNet50_Conv,
    "ResNet50_Conv2": ResNet50_Conv2,
    "ResNet50_Transformer1": ResNet50_Transformer1,
    "ResNet50_Transformer2": ResNet50_Transformer2,
}

def frame_retr(dataset, directory, video1, queryframe1, video2, device="cuda", name=""):
    args = {
        'dataset': dataset,
        'directory': directory,
        'video1': video1,
        'queryframe1': queryframe1,
        'video2': video2,
        'device': device,
        'name': name,
    }
    logger.info(f"Start Frame Retrieval with args: {args}")
    args = SimpleNamespace(**args)
    args.config = args.directory + '/config.json'
    cfg = parser.load_config(args)
    cfg = EasyDict(cfg)

    # check if outdr exist, if not create it
    outdir = args.directory + '/output'
    os.makedirs(outdir, exist_ok=True)
    
    dataset_path = os.path.join("../datasets", args.dataset)
    video1_path = os.path.join(dataset_path, 'videos', args.video1)
    video2_path = os.path.join(dataset_path, 'videos', args.video2)
    video1_name = os.path.splitext(os.path.basename(args.video1))[0]
    video2_name = os.path.splitext(os.path.basename(args.video2))[0]
    os.makedirs(os.path.join(outdir, f"{video1_name}_{video2_name}"), exist_ok=True)
    output_path = os.path.join(outdir, f"{video1_name}_{video2_name}/data.json")

    def dist_fn(x, y):
        x = torch.tensor(x) if not isinstance(x, torch.Tensor) else x
        y = torch.tensor(y) if not isinstance(y, torch.Tensor) else y
        dist = torch.sum((x - y) ** 2)
        return dist

    # if the data file already exists, return it
    if os.path.exists(output_path):
        logger.info(f"Data file already exists at {output_path}")
        data = json.load(open(output_path))
        path = data['path']

    else:
        model = model_dict[cfg.arch.type](cfg)
        model, _, _ = load_ckpt(cfg, model, None)

        # check embedding exist or not
        embeddings_dir = os.path.join(args.directory, 'embeddings')
        os.makedirs(embeddings_dir, exist_ok=True)
        embedding_path1 = os.path.join(embeddings_dir, f'{video1_name}.npy')
        embedding_path2 = os.path.join(embeddings_dir, f'{video2_name}.npy')

        video1 = read_video(video1_path)
        video2 = read_video(video2_path)
        if os.path.exists(embedding_path1):
            logger.info(f"Embedding file for {video1_name} already exists.")
            embs1 = np.load(embedding_path1)
        else:
            frames1 = torch.from_numpy(video1).float()
            frames1 = frames1.permute(0, 3, 1, 2)

            with torch.no_grad():
                embs1 = model(frames1.unsqueeze(0), num_context=1)
                embs1 = embs1.squeeze(0)
                np.save(embedding_path1, embs1.cpu().numpy())
                logger.success(f"Embedding saved to {embedding_path1}")

        if os.path.exists(embedding_path2):
            logger.info(f"Embedding file for {video2_name} already exists.")
            embs2 = np.load(embedding_path2)
        else:
            frames2 = torch.from_numpy(video2).float()
            frames2 = frames2.permute(0, 3, 1, 2)

            with torch.no_grad():
                embs2 = model(frames2.unsqueeze(0), num_context=1)
                embs2 = embs2.squeeze(0)
                np.save(embedding_path2, embs2.cpu().numpy())
                logger.success(f"Embedding saved to {embedding_path2}")
    
        d, path = fastdtw(embs1, embs2, dist=dist_fn)
        path = torch.tensor(path)

        # normalized_acc_cost_mat = acc_cost_mat / acc_cost_mat.max()
        # normalized_acc_cost_mat = [[float(f"{x:.3f}") for x in y] for y in normalized_acc_cost_mat.tolist()]

        path = path.T.tolist()

        data = {
            "v1": video1_name,
            "v2": video2_name,
            "path": path,
            # "acc_cost_mat": normalized_acc_cost_mat,
            "acc_cost_mat": None,
            "dtw_cost": d
        }

        with open(output_path, 'w') as f:
            json.dump(data, f)
            logger.success(f"Data saved to {output_path}")
    
    closest_frames = []
    path_ = torch.tensor(path)
    for i in range(len(path)):
        if path[i][0] == queryframe1[0]:
            closest_frames.append(path[i][1])
            queryframe1.pop(0)
        if len(queryframe1) == 0:
            break
    logger.info(f"Closest frames: {closest_frames}")
    result = {
        'closest_frames': closest_frames,
    }

    return result
