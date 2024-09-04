import React from "react";
import './video.css';
import { getVideoFrameRate } from "./api";

function VideoPlayer({ videoSrc, setCurrentFrameVideo }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);
    const [frameRate, setFrameRate] = React.useState(30); 

    React.useEffect(() => {
        const handleLoadedMetadata = () => {
            const duration = videoRef.current.duration;
            // Assuming the video is encoded at 30 fps as a fallback
            const calculatedFrameRate = 30;
            const calculatedTotalFrames = Math.floor(duration * calculatedFrameRate);

            setFrameRate(calculatedFrameRate);
            setTotalFrames(calculatedTotalFrames);
        };

        const handleTimeUpdate = () => {
            const frame_i = Math.floor(videoRef.current.currentTime * frameRate);
            setCurrentFrame(frame_i);
            if (setCurrentFrameVideo) setCurrentFrameVideo(frame_i);
        };

        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
            videoElement.addEventListener("timeupdate", handleTimeUpdate);
        }

        return () => {
            if (videoElement) {
                videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
                videoElement.removeEventListener("timeupdate", handleTimeUpdate);
            }
        };
    }, [frameRate]);

    const handlePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimelineClick = (event) => {
        const timelineWidth = timelineRef.current.offsetWidth;
        const clickPosition = event.nativeEvent.offsetX;
        const newFrame = Math.floor((clickPosition / timelineWidth) * totalFrames);
        const newTime = newFrame / frameRate;
        videoRef.current.currentTime = newTime;
        setCurrentFrame(newFrame);
    };

    return (
        <div className="video-player">
            <video ref={videoRef} src={videoSrc} width="600" height="600" />
            <div className="controls">
                <button onClick={handlePlayPause} className="btn">
                    {isPlaying ? <i className="bi bi-pause-fill white"></i> : <i className="bi bi-play-fill white"></i>}
                </button>
                <div className="timeline" ref={timelineRef} onClick={handleTimelineClick}>
                    <div
                        className="timeline-progress"
                        style={{ width: `${(currentFrame / totalFrames) * 100}%` }}
                    ></div>
                </div>
                <div className="time">{currentFrame} / {totalFrames}</div>
            </div>
        </div>
    );
}

function VideoPlayerBookmark({ videoSrc, setCurrentFrameVideo, frameRate=30 }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);
    const [bookmarks, setBookmarks] = React.useState([]);

    React.useEffect(() => {
        const handleLoadedMetadata = () => {
            const duration = videoRef.current.duration;
            const calculatedFrameRate = frameRate;
            const calculatedTotalFrames = Math.floor(duration * calculatedFrameRate);
            setTotalFrames(calculatedTotalFrames);
        };

        const handleTimeUpdate = () => {
            const frame_i = Math.floor(videoRef.current.currentTime * frameRate);
            setCurrentFrame(frame_i);
            if (setCurrentFrameVideo) setCurrentFrameVideo(frame_i);
        };

        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
            videoElement.addEventListener("timeupdate", handleTimeUpdate);
        }

        return () => {
            if (videoElement) {
                videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
                videoElement.removeEventListener("timeupdate", handleTimeUpdate);
            }
        };
    }, [frameRate]);

    const handlePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimelineClick = (event) => {
        const timelineWidth = timelineRef.current.offsetWidth;
        const clickPosition = event.nativeEvent.offsetX;
        const newFrame = Math.floor((clickPosition / timelineWidth) * totalFrames);
        const newTime = newFrame / frameRate;
        videoRef.current.currentTime = newTime;
        setCurrentFrame(newFrame);
    };

    const handleAddBookmark = () => {
        const title = prompt("Enter bookmark title:");
        if (title) {
            setBookmarks([...bookmarks, { frame: currentFrame, title, time: videoRef.current.currentTime.toFixed(2) }]);
        }
    };

    const handleModifyBookmark = (index) => {
        const newTitle = prompt("Modify bookmark title:", bookmarks[index].title);
        if (newTitle !== null) {
            const updatedBookmarks = bookmarks.map((bookmark, idx) => idx === index ? { ...bookmark, title: newTitle } : bookmark);
            setBookmarks(updatedBookmarks);
        }
    };

    const handleDeleteBookmark = (index) => {
        setBookmarks(bookmarks.filter((_, idx) => idx !== index));
    };

    const handleBookmarkSelect = (bookmark) => {
        videoRef.current.currentTime = bookmark.time;
        setCurrentFrame(bookmark.frame);
    };

    return (
        <div className="video-player">
            <video ref={videoRef} src={videoSrc} width="600" height="600" />
            <div className="controls">
                <button onClick={handlePlayPause} className="btn">
                    {isPlaying ? <i className="bi bi-pause-fill white"></i> : <i className="bi bi-play-fill white"></i>}
                </button>
                <div className="timeline" ref={timelineRef} onClick={handleTimelineClick}>
                    {bookmarks.map(bookmark => (
                        <div key={bookmark.frame}
                            className="bookmark"
                            style={{ left: `${(bookmark.frame / totalFrames) * 100}%` }}
                            title={bookmark.title}
                        />
                    ))}
                    <div className="timeline-progress" style={{ width: `${(currentFrame / totalFrames) * 100}%` }}></div>
                </div>
                <div className="time">{currentFrame} / {totalFrames}</div>
            </div>
            <button onClick={handleAddBookmark} className="btn btn-primary">Add Bookmark</button>
            <div className="bookmarks-list w-100">
                {bookmarks.map((bookmark, index) => (
                    <div key={index} className="row mt-1">
                        <div className="col-md-8" onClick={() => handleBookmarkSelect(bookmark)}>
                            {bookmark.title} - {bookmark.time}s
                        </div>
                        <div className="col-md-2">
                            <button className="btn" onClick={() => handleModifyBookmark(index)}>
                                <i className="bi bi-pencil-square"></i> {/* Pencil icon for modify */}
                            </button>
                        </div>
                        <div className="col-md-2">
                            <button className="btn" onClick={() => handleDeleteBookmark(index)}>
                                <i className="bi bi-trash"></i> {/* Trash icon for delete */}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


function ShowFrames({ closestFrames, videoSrc }) {
    const [frameImages, setFrameImages] = React.useState([]);

    React.useEffect(() => {
        if (closestFrames && videoSrc) {
            const frameImagePromises = closestFrames.map((frame) => {
                return new Promise((resolve) => {
                    const video = document.createElement('video');
                    video.src = videoSrc;
                    video.currentTime = frame / 30; // Assuming a 30 FPS video, adjust if necessary
                    video.muted = true;
                    video.addEventListener('loadeddata', () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/png'));
                    });
                });
            });

            Promise.all(frameImagePromises).then((images) => {
                setFrameImages(images);
            });
        }
    }, [closestFrames, videoSrc]);

    return (
        <div className="closest-frames">
            <h3>Closest Frames</h3>
            <div className="frame-list">
                {frameImages.map((image, index) => (
                    <div key={index} className="frame-item">
                        <img src={image} alt={`Frame ${closestFrames[index]}`} width="120" height="90" />
                        <p>Frame {closestFrames[index]}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export {VideoPlayer, ShowFrames, VideoPlayerBookmark};