
import torch
import math
import numpy as np
import matplotlib.pyplot as plt
from dtw import dtw
from matplotlib.animation import FuncAnimation
from scipy.spatial.distance import cdist
from loguru import logger

"""
References:
[1] https://github.com/google-research/google-research/tree/master/tcc
"""

def dist_fn(x, y):
    x = torch.tensor(x) if not isinstance(x, torch.Tensor) else x
    y = torch.tensor(y) if not isinstance(y, torch.Tensor) else y
    dist = torch.sum((x - y) ** 2)
    return dist

def get_nn(embs, query_emb):
    dist = cdist(embs, query_emb, axis=1)
    assert len(dist) == len(embs)
    return np.argmin(dist), np.min(dist)


def unnorm(query_frame):
    min_v = query_frame.min()
    max_v = query_frame.max()
    query_frame = (query_frame - min_v) / (max_v - min_v)
    return query_frame


def align(query_feats, candidate_feats, use_dtw):
    """Align videos based on dynamic time warping."""
    if use_dtw:
        _, _, _, path = dtw(query_feats, candidate_feats, dist=dist_fn)
        _, uix = np.unique(path[0], return_index=True)
        nns = path[1][uix] 
    else:
        nns = []
        for i in range(len(query_feats)):
            nn_frame_id, _ = get_nn(candidate_feats, query_feats[i])
            nns.append(nn_frame_id)
    return nns

def create_dynamic_video(embs, frames, video_path, use_dtw, query=0):
    """Create aligned videos."""
    logger.info("Creating dynamic video..")
    fig, ax = plt.subplots(ncols=2, figsize=(10, 5), tight_layout=True)
    
    ax[0].set_title('Reference (Teacher) Frame')
    ax[1].set_title('Aligned (Student) Frame')
    nns = []
    for candidate in range(len(embs)):
        nns.append(align(embs[query], embs[candidate], use_dtw))
    
    switch_video = max(1, len(embs[query])//len(embs))
    
    im0 = ax[0].imshow(unnorm(frames[0][0]))
    im1 = ax[1].imshow(unnorm(frames[1][nns[1][0]]))
    
    def update(i):
        """Update plot with next frame."""
        candidate = min(i // switch_video + 1,
                        len(embs)-1)
        
        im0.set_data(unnorm(frames[query][i]))
        im1.set_data(unnorm(frames[candidate][nns[candidate][i]]))
        # Hide grid lines   
        ax[0].grid(False)
        ax[1].grid(False)
        
        # Hide axes ticks
        ax[0].set_xticks([])
        ax[1].set_xticks([])
        ax[0].set_yticks([])
        ax[1].set_yticks([])
        plt.tight_layout()
    
    anim = FuncAnimation(
        fig,
        update,
        frames=np.arange(len(embs[query])),
        interval=100,
        blit=False)
    anim.save(video_path, dpi=80)
    plt.close()