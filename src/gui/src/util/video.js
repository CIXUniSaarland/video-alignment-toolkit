import React, { useEffect } from "react";
import './video.css';
import { getVideoFrameRate } from "./api";

function VideoPlayer({ videoSrc, frameRate, setCurrentFrameVideo }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);

    React.useEffect(() => {
        const handleLoadedMetadata = () => {
            const duration = videoRef.current.duration;
            const calculatedTotalFrames = Math.floor(duration * frameRate);
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
            <video ref={videoRef} src={videoSrc} onClick={handlePlayPause} />
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

function VideoPlayerBookmark({ videoSrc, setCurrentFrameVideo, frameRate, bookmarks, setBookmarks }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [bookmarkTitle, setBookmarkTitle] = React.useState("");
    const [bookmarkIndexToModify, setBookmarkIndexToModify] = React.useState(null);

    React.useEffect(() => {
        const handleLoadedMetadata = () => {
            const duration = videoRef.current.duration;
            const calculatedTotalFrames = Math.floor(duration * frameRate);
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
    }, [frameRate, setCurrentFrameVideo]);

    React.useEffect(() => {
        if (videoSrc) {
            setBookmarks([]);
            setCurrentFrame(0);
        }
    }, [videoSrc]);

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

    const openBookmarkModal = (index = null) => {
        setIsModalOpen(true);
        if (index !== null) {
            setBookmarkTitle(bookmarks[index].title);
            setBookmarkIndexToModify(index);
        } else {
            setBookmarkTitle("");
            setBookmarkIndexToModify(null);
        }
    };

    const closeBookmarkModal = () => {
        setIsModalOpen(false);
        setBookmarkTitle("");
        setBookmarkIndexToModify(null);
    };

    const handleAddOrModifyBookmark = () => {
        if (bookmarkTitle.trim() === "") {
            return; // Do nothing if the title is empty
        }
        if (bookmarkIndexToModify === null) {
            setBookmarks([...bookmarks, { frame: currentFrame, title: bookmarkTitle, time: videoRef.current.currentTime.toFixed(2) }]);
        } else {
            const updatedBookmarks = bookmarks.map((bookmark, idx) => 
                idx === bookmarkIndexToModify ? { ...bookmark, title: bookmarkTitle } : bookmark
            );
            setBookmarks(updatedBookmarks);
        }
        closeBookmarkModal();
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
            <video ref={videoRef} src={videoSrc} width="600" height="600" style={{ maxWidth: '100%' }} />
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
            <button onClick={() => openBookmarkModal()} className="btn btn-primary">Add Bookmark</button>
            <div className="bookmarks-list w-100">
                {bookmarks.map((bookmark, index) => (
                    <div key={index} className="row mt-1">
                        <div className="col-md-10" onClick={() => handleBookmarkSelect(bookmark)}>
                            {bookmark.title} - {bookmark.time}s ({bookmark.frame})
                        </div>
                        <div className="col-md-1">
                            <button className="btn" onClick={() => openBookmarkModal(index)}>
                                <i className="bi bi-pencil-square"></i>
                            </button>
                        </div>
                        <div className="col-md-1">
                            <button className="btn" onClick={() => handleDeleteBookmark(index)}>
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="bmModal">
                    <div className="bmModal-content">
                        <h5>{bookmarkIndexToModify !== null ? "Modify Bookmark" : "Add Bookmark"}</h5>
                        <input
                            type="text"
                            value={bookmarkTitle}
                            onChange={(e) => setBookmarkTitle(e.target.value)}
                            placeholder="Enter bookmark title"
                        />
                        <div className="bmModal-actions">
                            <button onClick={closeBookmarkModal} className="btn btn-secondary me-2">Cancel</button>
                            <button onClick={handleAddOrModifyBookmark} className="btn btn-primary w-100 ">
                                {bookmarkIndexToModify !== null ? "Modify" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function VideoPlayerBookmarkCard({ videoSrc, setCurrentFrameVideo, frameRate, bookmarks }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);
    const [localBookmarks, setLocalBookmarks] = React.useState(bookmarks);

    React.useEffect(() => {
        const handleLoadedMetadata = () => {
            const duration = videoRef.current.duration;
            const calculatedTotalFrames = Math.floor(duration * frameRate);
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
    }, [frameRate, setCurrentFrameVideo]);

    useEffect(() => {
        setLocalBookmarks(bookmarks);
    }, [bookmarks]);

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
            <video ref={videoRef} src={videoSrc} width="400" height="400" style={{ maxWidth: '100%' }} />
            <div className="controls">
                <button onClick={handlePlayPause} className="btn">
                    {isPlaying ? <i className="bi bi-pause-fill white"></i> : <i className="bi bi-play-fill white"></i>}
                </button>
                <div className="timeline" ref={timelineRef} onClick={handleTimelineClick}>
                    {localBookmarks.map(lbm => (
                        <div key={lbm.frame}
                            className="bookmark"
                            style={{ left: `${(lbm.frame / totalFrames) * 100}%` }}
                            title={lbm.title}
                        />
                    ))}
                    <div className="timeline-progress" style={{ width: `${(currentFrame / totalFrames) * 100}%` }}></div>
                </div>
                <div className="time">{currentFrame} / {totalFrames}</div>
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

export {VideoPlayer, ShowFrames, VideoPlayerBookmark, VideoPlayerBookmarkCard};