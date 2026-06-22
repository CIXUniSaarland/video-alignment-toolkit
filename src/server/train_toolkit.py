import json
import os

import torch
from loguru import logger
from easydict import EasyDict as edict

from dataset import *
from model import *


def load_config_file(filepath):
    """Load a JSON config file into an EasyDict.

    Server-side helper. The LAC core's utils.parser intentionally does not provide
    this (it parses argparse-style configs); the toolkit server loads a config path
    directly, so the helper lives here to keep the `lac/` submodule pristine.
    """
    with open(filepath, 'r') as f:
        cfg = edict(json.load(f))
    cfg.cfg_path = filepath
    return cfg


def train_model(cfg, socketio, stop_event=None):
    logger.info(f"Start {cfg.name}...")
    logger.info(f"Config: {cfg.cfg_path}")

    # Create output dirs (the CLI does this via ensure_dir; save_ckpt won't mkdir).
    for _key in ("save_dir", "log_dir", "loguru_dir"):
        _dir = cfg.trainer.get(_key) if hasattr(cfg.trainer, "get") else getattr(cfg.trainer, _key, None)
        if _dir:
            os.makedirs(_dir, exist_ok=True)

    # DataLoader workers spawned from this background thread can crash the server.
    cfg.data_loader.num_workers = 0

    # GUI inputs can arrive as strings; coerce numeric fields the model needs as ints.
    def _coerce_int(d, k):
        if k in d and isinstance(d[k], str) and d[k].strip().lstrip("-").isdigit():
            d[k] = int(d[k])
    _coerce_int(cfg, "n_gpu")
    for _k in ("batch_size", "num_frames", "num_steps"):
        _coerce_int(cfg.data_loader, _k)
    _coerce_int(cfg.trainer, "epochs")

    device = 'cpu'
    if torch.cuda.is_available():
        device = 'cuda'

    logger.info(f"Device: {device}")
    cfg.device = device

    logger.info(f"Loading dataset {cfg.data_loader.type} from {cfg.data_loader.data_dir}")
    train_dataset, train_loader = construct_train_loader(cfg)
    if cfg.eval:
        _, train_eval_loader = construct_eval_loader(cfg, pkl_name="train.pkl")
        _, val_eval_loader = construct_eval_loader(cfg, pkl_name="val.pkl")

    logger.info(f"Training dataset size: {len(train_dataset)}")
    logger.info(f"Training batch size: {cfg.data_loader.batch_size}")

    # Start training
    if cfg.eval:
        train(cfg, train_loader, train_eval_loader, val_eval_loader, io=socketio, stop_event=stop_event)
    else:
        train(cfg, train_loader, io=socketio, stop_event=stop_event)
