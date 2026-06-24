# def frame_retr(dataset, directory, video1, queryframe1, video2, device="cuda", name=""):
import os
from easydict import EasyDict
from model.model import *
from utils.util import load_ckpt
import utils.parser as parser
from dataset.util import read_videos_from_folder
import pandas as pd
from fastdtw import fastdtw
import json

model_dict = {
    "Inceptionv3_SpatialSoftmax": Inceptionv3_SpatialSoftmax,
    "ResNet50_Conv": ResNet50_Conv,
    "ResNet50_Conv2": ResNet50_Conv2,
    "ResNet50_Transformer1": ResNet50_Transformer1,
    "ResNet50_Transformer2": ResNet50_Transformer2,
}

# args = {
#     'dataset': dataset,
#     'directory': directory,
#     'video1': video1,
#     'queryframe1': queryframe1,
#     'video2': video2,
#     'device': device,
#     'name': name,
# }

# logger.info(f"Start Frame Retrieval with args: {args}")
# args = SimpleNamespace(**args)
config = '/home/joao/Code/video-alignment-toolkit/lac/config/jester/tcc.json'

with open(config, 'r') as f:
    cfg = EasyDict(json.load(f))
    cfg.cfg_path = config


# check if outdr exist, if not create it
# outdir = args.directory + '/output'
# os.makedirs(outdir, exist_ok=True)

# dataset_path = os.path.join("../datasets", args.dataset)
# video1_path = os.path.join(dataset_path, 'videos', args.video1)
# video2_path = os.path.join(dataset_path, 'videos', args.video2)
# video1_name = os.path.splitext(os.path.basename(args.video1))[0]
# video2_name = os.path.splitext(os.path.basename(args.video2))[0]
# os.makedirs(os.path.join(outdir, f"{video1_name}_{video2_name}"), exist_ok=True)
# output_path = os.path.join(outdir, f"{video1_name}_{video2_name}/data.json")

def dist_fn(x, y):
    x = torch.tensor(x) if not isinstance(x, torch.Tensor) else x
    y = torch.tensor(y) if not isinstance(y, torch.Tensor) else y
    dist = torch.sum((x - y) ** 2)
    return dist

# # if the data file already exists, return it
# if os.path.exists(output_path):
#     logger.info(f"Data file already exists at {output_path}")
#     data = json.load(open(output_path))
#     path = data['path']

# else:

model_path = "/home/joao/Code/video-alignment-toolkit/lac/saved/models/TCC-ckpt_epoch_199.pth"
model = model_dict[cfg.arch.type](cfg)
model, _, _ = load_ckpt(cfg, model, None, model_path)

# check embedding exist or not
# embeddings_dir = os.path.join(args.directory, 'embeddings')
# os.makedirs(embeddings_dir, exist_ok=True)
# embedding_path1 = os.path.join(embeddings_dir, f'{video1_name}.npy')
# embedding_path2 = os.path.join(embeddings_dir, f'{video2_name}.npy')

chosen_classes = [
    # 'Swiping Left',
    # 'Swiping Right',
    # 'Swiping Down',
    # 'Swiping Up',
    # 'Sliding Two Fingers Down',
    # 'Sliding Two Fingers Up',
    # 'Thumb Down',
    'Thumb Up',
]

dataset_path = "/home/joao/Code/video-alignment-toolkit/datasets/jester"

df = pd.read_csv(os.path.join(dataset_path, 'Train.csv'))

video_idx = []
for label in chosen_classes:
    video_idx.append(df[df['label'] == label].iloc[61]['video_id'])

video1 = read_videos_from_folder(dataset_path + "/Train", video_idx)
test_class = 'Thumb Down'
video2 = read_videos_from_folder(dataset_path + "/Train", [df[df['label'] == test_class].iloc[55]['video_id']])

print(video_idx, df[df['label'] == test_class].iloc[55]['video_id'])
# if os.path.exists(embedding_path1):
#     logger.info(f"Embedding file for {video1_name} already exists.")
#     embs1 = np.load(embedding_path1)
# else:
frames1 = torch.from_numpy(video1).float()
frames1 = frames1.permute(0, 3, 1, 2)

with torch.no_grad():
    embs1 = model(frames1.unsqueeze(0), num_context=1)
    embs1 = embs1.squeeze(0)
    # np.save(embedding_path1, embs1.cpu().numpy())
    # logger.success(f"Embedding saved to {embedding_path1}")

# if os.path.exists(embedding_path2):
#     logger.info(f"Embedding file for {video2_name} already exists.")
#     embs2 = np.load(embedding_path2)
# else:
frames2 = torch.from_numpy(video2).float()
frames2 = frames2.permute(0, 3, 1, 2)

with torch.no_grad():
    embs2 = model(frames2.unsqueeze(0), num_context=1)
    embs2 = embs2.squeeze(0)
    # np.save(embedding_path2, embs2.cpu().numpy())
    # logger.success(f"Embedding saved to {embedding_path2}")



# print(embs1.shape)
# print(embs2.shape)

# d, path = fastdtw(embs1, embs2, dist=dist_fn)
# path = torch.tensor(path)

# normalized_acc_cost_mat = acc_cost_mat / acc_cost_mat.max()
# normalized_acc_cost_mat = [[float(f"{x:.3f}") for x in y] for y in normalized_acc_cost_mat.tolist()]

# path = path.T.tolist()

# data = {
#     "v1": video1_name,
#     "v2": video2_name,
#     "path": path,
#     # "acc_cost_mat": normalized_acc_cost_mat,
#     "acc_cost_mat": None,
#     "dtw_cost": d
# }

# with open(output_path, 'w') as f:
#     json.dump(data, f)
#     logger.success(f"Data saved to {output_path}")

# queryframe = 10
# closest_frames = []
# path_ = torch.tensor(path)
# for i in range(len(path)):
#     if path[i][0] == queryframe:
#         closest_frames.append(path[i][1])
# logger.info(f"Closest frames: {closest_frames}")

# print(path)

d, path = fastdtw(embs1, embs2, dist=dist_fn)

print(d)


m = None
idx = None

# for j in range(embs1.shape[0]):
#     d = dist_fn(embs1[j], embs2[20])
#     if m is None or d < m:
#         m = d
#         idx = j
total_dist = 0

for i in range(embs1.shape[0]):
    for j in range(embs2.shape[0]):
        d = dist_fn(embs1[i], embs2[j])
        if m is None or d < m:
            m = d
            idx = j
    total_dist += m

print(total_dist)