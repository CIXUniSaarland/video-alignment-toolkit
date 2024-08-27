import React from "react";
import { Breadcrumbs } from "../VA_AL";
import { VideoPlayer, ShowFrames } from "../../util/video";

function FrameRetrieval() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Frame Retrieval' }  // Current page, no link
    ];

    const [currentStep, setCurrentStep] = React.useState(1);
    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

    const [datasets, setDatasets] = React.useState([]);
    const [videos, setVideos] = React.useState([]);
    const [savedDir, setSavedDir] = React.useState('./train-results');
    const [selectedDataset, setSelectedDataset] = React.useState('');
    const [folders, setFolders] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState('');
    const [selectedVideos1, setSelectedVideos1] = React.useState('');
    const [videoSrc1, setVideoSrc1] = React.useState('');
    const [video1Frame, setVideo1Frame] = React.useState(0);
    const [selectedVideos2, setSelectedVideos2] = React.useState('');
    const [videoSrc2, setVideoSrc2] = React.useState('');
    const [video2Frame, setVideo2Frame] = React.useState(0);
    const [closestFrames, setClosestFrames] = React.useState([]);

    React.useEffect(() => {
        fetch('http://localhost:5001/list_datasets')
            .then(response => response.json())
            .then(data => {
                if (data.message === 'success') {
                    setDatasets(data.datasets);
                } else {
                    console.error('Failed to fetch datasets:', data.error);
                }
            })
            .catch(error => console.error('Error fetching datasets:', error));
    }, []);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!selectedDataset) return;
    
            try {
                const responseVideos = await fetch('http://localhost:5001/list_videos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ dataset: selectedDataset })
                });
    
                const dataVideos = await responseVideos.json();
    
                if (dataVideos.message === 'success') {
                    setVideos(dataVideos.videos);
                } else {
                    console.error('Failed to fetch videos:', dataVideos.error);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
            }
        };
    
        fetchData();
    }, [selectedDataset]);

    function getVideoSrc(video, setVideoSrc) {
        try {
            fetch('http://localhost:5001/get_video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    video: video,
                    dataset: selectedDataset,
                })
            })
                .then(response => response.blob())
                .then(blob => {
                    const videoUrl = URL.createObjectURL(blob);
                    setVideoSrc(videoUrl);
                })
                .catch(error => console.error('Error fetching video:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function getFolderList() {
        try {
            fetch('http://localhost:5001/list_folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ directory: savedDir })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        setFolders(data.folders_with_config);
                    } else {
                        console.error('Failed to fetch folders:', data.error);
                    }
                })
                .catch(error => console.error('Error fetching folders:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function retrFrames() {
        try {
            fetch('http://localhost:5001/frame_retrieval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataset: selectedDataset,
                    directory: savedDir + '/' + selectedFolder,
                    video1: selectedVideos1,
                    video2: selectedVideos2,
                    frame1: video1Frame,
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        console.log('Frames retrieved:', data);
                        setClosestFrames(data.result.closest_frames);
                    } else {
                        console.error('Failed to retrieve frames:', data.error);
                    }
                })
                .catch(error => console.error('Error fetching embeddings:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2>Frame Retrieval</h2>

            <div className="row">

                <div className="col-md-6">
                    
                    {/* STEP1 */}
                    <div className={currentStep === 1 ? "" : "d-none"}>
                        <h5>1. Select dataset</h5>
                        <div className="row">
                            <div className="col-md-4">
                                <label>Select Dataset</label>
                            </div>
                            <div className="col-md-8">
                                <select
                                    className="form-select"
                                    onChange={(e) => {
                                        setSelectedDataset(e.target.value);
                                    }}
                                >
                                    <option value="">Select a dataset</option>
                                    {datasets.map((dataset, index) => (
                                        <option key={index} value={dataset}>
                                            {dataset}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="row mt-3">
                            <div className="col-md-4">
                                <label>Working Directory</label>
                            </div>
                            <div className="col-md-8">
                                <input 
                                    type="text" 
                                    value={savedDir} 
                                    onChange={(e) => setSavedDir(e.target.value)}
                                    className="form-control"
                                />

                                <div className="d-flex justify-content-between">
                                    <button 
                                        className="btn btn-secondary mt-3 ms-auto"
                                        onClick={getFolderList}
                                    >Get Directory</button>
                                </div>

                                <select 
                                value={selectedFolder}
                                onChange={e => {
                                    setSelectedFolder(e.target.value);
                                }}
                                disabled={folders.length === 0}
                                data-bs-toggle="tooltip" data-bs-placement="top" 
                                title="Select folder to extract embeddings"
                                className="form-select mt-3">
                                    <option value="">Select Folder</option>
                                    {folders.map((folder, index) => (
                                        <option key={index} value={folder}>{folder}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* STEP2 */}
                    <div className={currentStep === 2 ? "" : "d-none"}>
                        <div className="row">
                            <div className="col-md-4">
                                <label>Select Video</label>
                            </div>
                            <div className="col-md-8">
                                <select
                                    className="form-select"
                                    value={selectedVideos1}
                                    onChange={(e) => {
                                        setSelectedVideos1(e.target.value);
                                        getVideoSrc(e.target.value, setVideoSrc1);
                                    }}
                                >
                                    <option value="">Select a video</option>
                                    {videos.map((video, index) => (
                                        <option key={index} value={video}>
                                            {video}
                                        </option>
                                    ))}
                                </select>
                                {selectedVideos1 && (
                                    <div className="mt-3">
                                        <VideoPlayer videoSrc={videoSrc1} setCurrentFrameVideo={setVideo1Frame} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between mt-3">
                        {currentStep > 1 && (
                            <button onClick={prevStep} className="btn btn-secondary">Go Back</button>
                        )}
                        {currentStep < 2 && (
                            <button 
                            onClick={nextStep} 
                            className="btn btn-primary ms-auto">Next</button>
                        )}
                        {currentStep === 2 && (
                            <button
                            className="btn btn-primary ms-auto"
                            onClick={retrFrames}
                            >Retrieve Frames</button>
                        )}
                    </div>
                </div>
                
                {/* right */}
                <div className="col-md-6">
                {currentStep === 1 && (
                        
                        <div className="video-list row w-100">
                            {videos.map((video, index) => (
                                <li key={index} className="list-group-item">
                                    {video}
                                </li>
                            ))}
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div>
                            <select
                            value={selectedVideos2}
                            onChange={e => {
                                setSelectedVideos2(e.target.value);
                                getVideoSrc(e.target.value, setVideoSrc2);
                            }}
                            className="form-select"
                            >
                                <option value="">Select video 2</option>
                                {videos.map((video, index) => (
                                    <option key={index} value={video}>{video}</option>
                                ))}
                            </select>
                            {selectedVideos2 && (
                                <div className="mt-3">
                                    <VideoPlayer videoSrc={videoSrc2} setCurrentFrameVideo={setVideo2Frame} />
                                    <ShowFrames closestFrames={closestFrames} videoSrc={videoSrc2} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export { FrameRetrieval };