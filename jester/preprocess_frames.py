import os
import shutil
import subprocess
import cv2
import pandas as pd
from natsort import natsorted


def _to_h264(src, dst):
    """Transcode `src` to a browser-playable H.264 (yuv420p) mp4 at `dst`.

    OpenCV writes MPEG-4 Part 2 ('mp4v'), which HTML5 <video> can't play, so the
    clips wouldn't show in the web app. We re-encode with ffmpeg — trying libx264
    then libopenh264 (whichever the installed ffmpeg has).
    """
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is not None:
        for encoder in ("libx264", "libopenh264"):
            cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", src,
                   "-c:v", encoder, "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst]
            if subprocess.run(cmd).returncode == 0:
                os.remove(src)
                return
    # No ffmpeg / no H.264 encoder: keep the raw file so training still works.
    shutil.move(src, dst)
    print("WARNING: no H.264 encoder available; video left as MPEG-4 (won't play in the browser).")


def frames_to_mp4(csv_path, label_to_filter, max_videos=100, base_dir='jester/Train', output_dir='jester/videos'):
    df = pd.read_csv(csv_path)
    print(f"Total entries in CSV: {len(df)}")
    filtered_df = df[df['label'] == label_to_filter].head(max_videos)
    os.makedirs(output_dir, exist_ok=True)
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

        height, width, _ = cv2.imread(os.path.join(video_folder, images[0])).shape

        out_path = os.path.join(output_dir, f"{video_id}.mp4")
        tmp_path = os.path.join(output_dir, f"{video_id}.tmp.mp4")
        out = cv2.VideoWriter(tmp_path, cv2.VideoWriter_fourcc(*'mp4v'), 15, (width, height))

        for img_name in images:
            frame = cv2.imread(os.path.join(video_folder, img_name))
            if frame is None:
                continue
            out.write(frame)
        out.release()

        # Re-encode to H.264 so the clip plays in the web app's video player.
        _to_h264(tmp_path, out_path)
        print(out_path)


if __name__ == "__main__":
    # Resolve paths relative to the repo so this runs from anywhere.
    here = os.path.dirname(os.path.abspath(__file__))
    jester = os.path.join(here, '..', 'datasets', 'jester')
    # Encode the first 100 "Thumb Up" clips (folders of JPEG frames) into mp4s
    # under datasets/jester/videos/ — where the Jester loader looks for them.
    frames_to_mp4(os.path.join(jester, 'Train.csv'),
                  'Thumb Up',
                  base_dir=os.path.join(jester, 'Train'),
                  max_videos=100,
                  output_dir=os.path.join(jester, 'videos'))
