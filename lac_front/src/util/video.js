import React from "react";
import './video.css';

function VideoPlayer({ videoSrc, setCurrentFrameVideo }) {
    const videoRef = React.useRef(null);
    const timelineRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [totalFrames, setTotalFrames] = React.useState(0);
    const [frameRate, setFrameRate] = React.useState(30); 

    React.useEffect(() => {
        if (videoRef.current) {
            videoRef.current.addEventListener("loadedmetadata", () => {
                const tracks = videoRef.current.videoTracks;
                if (tracks && tracks[0] && tracks[0].frameRate) {
                    setFrameRate(tracks[0].frameRate);
                }
                setTotalFrames(Math.floor(videoRef.current.duration * frameRate));
            });

            videoRef.current.addEventListener("timeupdate", () => {
                const frame_i = Math.floor(videoRef.current.currentTime * frameRate);
                setCurrentFrame(frame_i);
                if (setCurrentFrameVideo) setCurrentFrameVideo(frame_i);
            });
        }
    }, [frameRate]);

    const handlePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }

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
    )
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

export {VideoPlayer, ShowFrames};