import React, { useState, useEffect } from 'react';
import './VA_AL.css';
import { VideoPlayer } from '../util/video';
import { Link } from 'react-router-dom';

function Dropdown2({setVideoSrc, VideoTitle}) {
    const [options, setOptions] = React.useState([
        "Option 1",
        "Option 2",
        "Option 3",
    ]);
    const [videoPath, setVideoPath] = React.useState("videos/test3.mp4");

    React.useEffect(() => {
        fetch("http://localhost:5000/video-filenames", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                setOptions(data["video_filenames"]);
                setVideoPath(data["video_filepath"]);
            })
            .catch((error) => console.error("Error fetching data:", error));
    }
    , []);

    const handleVideoSelect = async (option, index) => {
        setSelectedVideo({video: option, index: index});
        try {
            const response = await fetch("http://localhost:5000/video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({filename: option}),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch video");
            } else {
                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);
                setVideoSrc(videoUrl);
            }
        } catch (error) {
            console.error("Error fetching video:", error);
        }
    };

    const [selectedVideo, setSelectedVideo] = React.useState({video: null, index: 0});
    
    return (
        <div className="row">
            <div className="w-100">
                <h2>{VideoTitle}</h2>
                <div className="list-group mt-3 mb-3">
                    {options.map((option, index) => (
                        <a
                            href="#"
                            className={`list-group-item list-group-item-action ${
                                selectedVideo.video === option ? "active bg-orange" : ""
                            }`}
                            key={index}
                            onClick={() => {
                                handleVideoSelect(option, index);
                                // setSelectedVideo({video: option, index: index});
                            }}
                        >
                            {option}
                        </a>
                    ))}
                </div>
                <p>Selected: {selectedVideo.video} 
                <br/>Index: {selectedVideo.index}</p>
            </div>
        </div>
    );
};

const VA_AL2 = () => {
    const [videoSrc1, setVideoSrc1] = React.useState(null);
    const [videoSrc2, setVideoSrc2] = React.useState(null);

    const [currentStep, setCurrentStep] = useState(1);

    const nextStep = () => {
        setCurrentStep(prevStep => prevStep + 1);
    };

    const prevStep = () => {
        setCurrentStep(prevStep => Math.max(prevStep - 1, 1));
    };

    return (
        <div className="App">
        <div className="container" style={{height: '100vh'}}>

            {/* STEP 1 */}
            <div className={`step row center-vertical ${currentStep === 1 ? 'visible' : ''}`}>
                <div className="col-md-5 center-vertical">
                    <Dropdown2 setVideoSrc={setVideoSrc1} VideoTitle={"Reference Video"} />
                    
                </div>
                <div className="col-md-7 center-vertical">
                    {videoSrc1 && 
                        <VideoPlayer videoSrc={videoSrc1} />
                    } 
                </div>

                <div className="d-flex justify-content-between">
                    {currentStep > 1 && (
                        <button onClick={prevStep} className="btn btn-secondary">Go Back</button>
                    )}
                    {currentStep < 5 && (
                        <button onClick={nextStep} className="btn btn-primary">Next</button>
                    )}
                </div>
            </div>

            {/* STEP 2 */}
            <div className={`step row center-vertical ${currentStep === 2 ? 'visible' : ''}`}>
                <div className="col-md-5 center-vertical">
                    <Dropdown2 setVideoSrc={setVideoSrc2} VideoTitle={"Student Video"}/>
                </div>
                <div className="col-md-7 center-vertical">
                    {videoSrc2 && 
                        <VideoPlayer videoSrc={videoSrc2} />
                    } 
                </div>
            </div>
        </div>
        </div>
    );
}

const Breadcrumbs = ({ breadcrumbs }) => {
    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                {breadcrumbs.map((breadcrumb, index) => (
                    <li key={index} className="breadcrumb-item">
                        {breadcrumb.link ? (
                            <Link to={breadcrumb.link}>{breadcrumb.label}</Link>
                        ) : (
                            <span>{breadcrumb.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

function VA_AL() {
    return (
        <div className='w-100'>
            <h2>VAT: Analysis</h2>
            {/* Menu
            1. Extract embeddings
            2. Align Videos (matrix)
            3. Frame Retrieval
            4. Anomaly Detection */}
            <p>
                The alignment API offers various functionalities:
                <br/>1. <b>Align Videos</b>, Perform alignment between two videos.
                <br/>2. <b>Frame Retrieval</b>, Retrieve frames based on phases.
                <br/>3. <b>Anomaly Detection</b>, Detect anomalies between videos.
            </p>

            <div className='w-100'>
                <div className='row text-center'>
                    {/* <div className="col-md-6 position-relative">
                        <Link to="./ext-emb" className="menu-item" title="Extract embeddings from data">
                            <i className="bi bi-box-arrow-in-down"></i>
                            <h4 className="mt-3">Extract Embeddings <i className="bi bi-info-circle-fill tooltip-symbol"
                            data-bs-toggle="tooltip" data-bs-placement="top"></i></h4>
                        </Link>
                    </div> */}
                    <div className="col-md-4 position-relative">
                        <Link to="./align-vid" className="menu-item" title="Align videos using matrix operations">
                            <i className="bi bi-aspect-ratio"></i>
                            <h4 className="mt-3">Align Videos <i className="bi bi-info-circle-fill tooltip-symbol"
                            data-bs-toggle="tooltip" data-bs-placement="top"></i></h4>
                        </Link>
                    </div>
                    <div className="col-md-4 position-relative">
                        <Link to="./frame-retr" className="menu-item" title="Retrieve frames from videos">
                            <i className="bi bi-collection"></i>
                            <h4 className="mt-3">Frame Retrieval <i className="bi bi-info-circle-fill tooltip-symbol"
                            data-bs-toggle="tooltip" data-bs-placement="top"></i></h4>
                        </Link>
                    </div>
                    <div className="col-md-4 position-relative">
                        <Link to="./anomaly-det" className="menu-item" title="Detect anomalies in data">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <h4 className="mt-3">Anomaly Detection <i className="bi bi-info-circle-fill tooltip-symbol"
                            data-bs-toggle="tooltip" data-bs-placement="top"></i></h4>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { VA_AL, Breadcrumbs};