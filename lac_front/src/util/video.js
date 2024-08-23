import React from "react";
import './video.css';

function VideoPlayer({ videoSrc }) {
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
                setCurrentFrame(Math.floor(videoRef.current.currentTime * frameRate));
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

export {VideoPlayer};