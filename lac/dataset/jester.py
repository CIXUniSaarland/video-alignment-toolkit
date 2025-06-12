import torch
import os
import glob
import pickle
import math
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd

from loguru import logger
from .util import create_data_augment, pad_zeros, read_videos_from_folder

class Jester(torch.utils.data.Dataset):
    def __init__(self, cfg, csv_name="Train.csv"):
        """
        Initialize the 20bJester dataset loader.

        Args:
            cfg: Configuration object with data loader parameters.
            mode: Either 'train' or 'eval'; affects the data returned.
        """
        self.cfg = cfg
        self.size = cfg.data_loader.size
        self.data_dir = self.cfg.data_loader.data_dir

        self.chosen_classes = [
            'Swiping Left',
            'Swiping Right',
            'Swiping Down',
            'Swiping Up',
            'Sliding Two Fingers Down',
            'Sliding Two Fingers Up',
            'Thumb Down',
            'Thumb Up',
        ]

        self.df = pd.read_csv(os.path.join(self.data_dir, csv_name))

        filtered_df = self.df[self.df['label'].isin(self.chosen_classes)]
        self.size = min(filtered_df['label'].value_counts().min(), self.size)

        
        self.num_frames = cfg.data_loader.num_frames
        self.num_contexts = cfg.data_loader.num_contexts
        self.num_context_steps = cfg.data_loader.num_context_steps
        self.frame_stride = cfg.data_loader.frame_stride
        self.sampling = cfg.data_loader.sampling
        self.random_offset = cfg.data_loader.random_offset
        self.context_stride = cfg.data_loader.context_stride

        self.augment = create_data_augment(cfg, augment=True)

    def __len__(self):
        return self.size
    
    def __getitem__(self, idx):
        video_idx = []
        for label in self.chosen_classes:
            video_idx.append(self.df[self.df['label'] == label].iloc[idx]['video_id'])

        frames = read_videos_from_folder(self.data_dir + '/Train', video_idx)
        
        seq_len = frames.shape[0]

        frames = torch.tensor(frames)
        frames = frames.permute(0, 3, 1, 2).float() / 255.0

        a_steps, a_chosen_steps, a_vmask = self.sample_frames(
            seq_len = seq_len,
            num_frames = self.num_frames,
            pre_steps = None
        )
        a_frames = self.augment(frames[a_steps.long()])

        b_steps, b_chosen_steps, b_vmask = self.sample_frames(
            seq_len = seq_len,
            num_frames = self.num_frames,
            pre_steps = a_steps
        )
        b_frames = self.augment(frames[b_steps.long()])

        ab_frames = torch.stack([a_frames, b_frames], dim=0)
        ab_steps = torch.stack([a_chosen_steps, b_chosen_steps], dim=0)
        ab_seq_lens = torch.tensor([seq_len, seq_len], dtype=torch.float32)
        ab_masks = torch.stack([a_vmask, b_vmask], dim=0)

        return {
            "frames": ab_frames,
            "steps": ab_steps,
            "seq_lens": ab_seq_lens,
            "masks": ab_masks
        }
    
    def sample_frames(self, seq_len, num_frames, pre_steps=None):
        sampling = self.cfg.data_loader.sampling
        pre_offset = min(pre_steps) if pre_steps is not None else 0

        if sampling == "offset_uniform":
            if seq_len >= num_frames:
                steps = torch.randperm(seq_len)
                steps = torch.sort(steps[:num_frames])[0]
            else:
                steps = torch.arange(0, num_frames)
        elif sampling == "time_augment":
            num_valid = min(seq_len, num_frames)
            expand_ratio = np.random.uniform(low=1.0, high=self.cfg.data_loader.sampling_region)\
                if self.cfg.data_loader.sampling_region > 1 else 1.0

            block_size = math.ceil(expand_ratio*seq_len)
            if pre_steps is not None and self.cfg.data_loader.consistent_offset != 0:
                shift = int((1-self.cfg.data_loader.consistent_offset)*num_valid)
                offset = np.random.randint(low=max(0, min(seq_len-block_size, pre_offset-shift)), 
                                           high=max(1, min(seq_len-block_size+1, pre_offset+shift+1)))
            else:
                offset = np.random.randint(low=0, high=max(seq_len-block_size, 1))
            steps = offset + torch.randperm(block_size)[:num_valid]
            steps = torch.sort(steps)[0]
            if num_valid < num_frames:
                steps = F.pad(steps, (0, num_frames-num_valid), "constant", seq_len)
        else:
            raise NotImplementedError
        
        video_mask = torch.ones(num_frames)
        video_mask[steps < 0] = 0
        video_mask[steps >= seq_len] = 0
        chosen_steps = torch.clamp(steps.clone(), 0, seq_len - 1)
        if self.num_contexts == 1:
            steps = chosen_steps
        else:
            context_stride = self.cfg.data_loader.context_stride
            steps = steps.view(-1,1) + context_stride*torch.arange(-(self.num_contexts-1), 1).view(1,-1)
            steps = torch.clamp(steps.view(-1), 0, seq_len - 1)
        return steps, chosen_steps, video_mask
