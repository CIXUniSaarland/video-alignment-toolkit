import glob
import random
import sys
import argparse
import os

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

from model.tcn import TCN
from model.tcc import TCC
from model.lac import LAC
import utils.parser as parser
import torch

import os
import math
import numpy as np

# from dtw import dtw
from utils.util import load_ckpt
from dataset.util import read_video
from loguru import logger

from easydict import EasyDict
from model.model import *

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
    args.add_argument('-c', '--config', default=None, type=str,
                      help='config file path (default: None)', required=True)
    args.add_argument('-d', '--device', default="cuda", type=str,
                        help='indices of GPUs to enable (default: all)')
    args.add_argument('-o', '--outdir', default=None, type=str, required=True,
                        help='output directory')
    args.add_argument('-n', '--name', default=None, type=str, help='name of the experiment')
    
    args = args.parse_args()
    cfg = parser.load_config(args)
    cfg = EasyDict(cfg)

    logger.info("Start extract embedding...")

    model = model_dict[cfg.arch.type](cfg)
    model = model.cuda()
    model, _, _ = load_ckpt(cfg, model, None)
    model.eval()

    video_filenames = glob.glob(os.path.join(cfg.data_loader.data_dir, 'videos', '*.mp4'))
    logger.info(f"Video filenames: {video_filenames}")

    for video in tqdm(video_filenames, desc="Extracting embeddings"):
        # logger.info(f"Extracting embedding for video: {video}")
        frames = read_video(video)
        frames = torch.from_numpy(frames).float()
        frames = frames.cuda()
        frames = frames.permute(0, 3, 1, 2)
        # logger.info(f"Frames shape: {frames.shape}")

        with torch.no_grad():
            embs = model(frames.unsqueeze(0), num_context=1)
            # logger.info(f"Embedding shape: {embs.shape}")
            embs = embs.squeeze(0)
            outdir = os.path.join(args.outdir, 'embeddings')
            os.makedirs(outdir, exist_ok=True)
            video_name = os.path.splitext(os.path.basename(video))[0]
            np.save(os.path.join(outdir,f'{video_name}.npy'), embs.cpu().numpy())
            logger.success(f"Embedding saved to {outdir} with name {video_name}.npy")

