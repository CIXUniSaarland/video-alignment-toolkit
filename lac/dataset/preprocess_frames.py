import os
import cv2
import pandas as pd
from natsort import natsorted

def frames_to_mp4(csv_path, label_to_filter, max_videos=100, base_dir='jester/Train', output_dir='jester/videos'):
    df = pd.read_csv(csv_path)
    print(f"Total entries in CSV: {len(df)}")
    filtered_df = df[df['label'] == label_to_filter].head(max_videos)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    print(f"Total '{label_to_filter}': {len(filtered_df)}")

    for _, row in filtered_df.iterrows():
        video_id = row['video_id']
        video_folder = os.path.join(base_dir, str(video_id))

        if not os.path.exists(video_folder):
            print(f"Folder not found: {video_folder}")
            continue

        images = natsorted([img for img in os.listdir(video_folder) if img.endswith('.jpg')])
        if not images:
            print(f"No JPG files in: {video_folder}")
            continue

        first_frame_path = os.path.join(video_folder, images[0])
        frame = cv2.imread(first_frame_path)
        height, width, _ = frame.shape

        out_path = os.path.join(output_dir, f"{video_id}.mp4")
        out = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*'mp4v'), 15, (width, height))

        for img_name in images:
            img_path = os.path.join(video_folder, img_name)
            frame = cv2.imread(img_path)
            if frame is None:
                continue
            out.write(frame)

        out.release()
        print(f"{out_path}")

if __name__ == "__main__":
    frames_to_mp4('../../datasets/jester/Train.csv', 
                  'Thumb Up',
                  base_dir='../../datasets/jester/Train/',
                  max_videos=100,
                  output_dir='../../datasets/jester/v4')