# Frame Retrieval

Find the frames in other videos that **best match specific moments** of a query video.
Bookmark the moments you care about in one video, and the toolkit locates the closest
matching frame in each of the other videos.

> You need a model trained in the **Training** tab first.

---

## Step 1 — Select Model & Dataset

1. Pick the **dataset** with your videos.
2. Set the **working directory** (default `../train-results`) and click **Load models**.
3. Choose a trained run.

![Step 1 — select model & dataset](/instructions/a-retr-1.png)

---

## Step 2 — Query Video & Reference Videos

On the left, pick a **query video** and play it; click **Add Bookmark** to mark the
moments you want to find. On the right, select the **reference videos** to search.
Then click **Retrieve Frames**.

![Step 2 — query bookmarks and reference videos](/instructions/a-retr-2.png)

---

## Step 3 — Retrieved Frames

Each reference video shows the frame that best matches your bookmarks. Click a video to
expand it: you'll see its **player** alongside the matched **frame thumbnails** (labeled
with the bookmark name and frame number). Click a thumbnail to jump the player there.

![Step 3 — retrieved frames](/instructions/a-retr-3.png)
