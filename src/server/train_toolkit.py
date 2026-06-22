import torch
from loguru import logger
from easydict import EasyDict as edict

from dataset import *
from model import *

def train_model(cfg, socketio):
    logger.info(f"Start {cfg.name}...")
    logger.info(f"Config: {cfg.cfg_path}")

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
        train(cfg, train_loader, train_eval_loader, val_eval_loader, socketio)
    else:
        train(cfg, train_loader, io=socketio)
