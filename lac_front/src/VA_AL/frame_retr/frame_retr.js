import React, { useState, useEffect } from "react";
import { Breadcrumbs } from "../VA_AL";
import { VideoPlayer, ShowFrames, VideoPlayerBookmark } from "../../util/video";
import { 
    fetchDatasets,
    fetchVideos,
    getVideoSrc,
    getVideosSrc,
    getVideoFrameRate,
    fetchFolderList
 } from "../../util/api";
import "./frame_retr.css";

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
    const [video1FrameRate, setVideo1FrameRate] = React.useState(30);

    const [selectedVideos2, setSelectedVideos2] = React.useState([]);
    const [videoSources2, setVideoSources2] = React.useState([]);
    const [expandedVideos2, setExpandedVideos2] = React.useState(
        Array(selectedVideos2.length).fill(false));

    useEffect(() => {
        const loadDatasets = async () => {
            const datasets = await fetchDatasets();
            setDatasets(datasets);
        }

        const loadVideos = async () => {
            if (!selectedDataset) return;
            const videos = await fetchVideos(selectedDataset);
            setVideos(videos);
        }

        loadDatasets();
        if (selectedDataset) {
            loadVideos();
        }

    }, [selectedDataset]);

    const retrieveFrames = async () => {
        try {
            await getVideosSrc(selectedVideos2, selectedDataset, setVideoSources2);
            nextStep();
        } catch (error) {
            console.error("Error fetching video sources:", error);
        } finally {
            console.log("Video sources fetched", videoSources2);
        }
    };

    const toggleExpand = (e) => {
        const cardBody = e.target.nextElementSibling;
        if (cardBody.style.display === 'none') {
            cardBody.style.display = 'block';
        } else {
            cardBody.style.display = 'none';
        }

        const videoIndex = selectedVideos2.indexOf(e.target.innerText);
        const expanded = expandedVideos2[videoIndex];
        const newExpanded = [...expandedVideos2];
        newExpanded[videoIndex] = !expanded;
        setExpandedVideos2(newExpanded);
    };

    const getExpandedVideos = () => {
        const expandedVideos = [];
        for (let i = 0; i < selectedVideos2.length; i++) {
            if (expandedVideos2[i]) {
                expandedVideos.push(selectedVideos2[i]);
            }
        }
        return expandedVideos;
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
                                        onClick={async () => {
                                            const folderList = await fetchFolderList(savedDir);
                                            setFolders(folderList);
                                        }}
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
                                    onChange={async (e) => {
                                        setSelectedVideos1(e.target.value);
                                        await getVideoSrc(
                                            e.target.value,
                                            selectedDataset,
                                            setVideoSrc1
                                        );
                                        const videoFrameRate = await getVideoFrameRate(
                                            e.target.value,
                                            selectedDataset
                                        );
                                        setVideo1FrameRate(videoFrameRate);
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
                                        <VideoPlayerBookmark videoSrc={videoSrc1} setCurrentFrameVideo={setVideo1Frame} frameRate={video1FrameRate} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* STEP3 */}
                    <div className={currentStep === 3 ? "" : "d-none"}>
                        {selectedVideos1 && (
                            <div className="mt-3">
                                <VideoPlayerBookmark videoSrc={videoSrc1} setCurrentFrameVideo={setVideo1Frame} frameRate={video1FrameRate} />
                            </div>
                        )}
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
                    </div>
                </div>
                
                {/* right */}
                <div className="col-md-6">
                    {/* STEP1 */}
                    {currentStep === 1 && (
                        
                        <div className="video-list row w-100">
                            {videos.map((video, index) => (
                                <li key={index} className="list-group-item">
                                    {video}
                                </li>
                            ))}
                        </div>
                    )}
                    {/* STEP2 */}
                    {currentStep === 2 && (
                        <div>
                            <VideoCheckboxes videos={videos} selectedVideos={selectedVideos2} setSelectedVideos={setSelectedVideos2} />
                            <div className="d-flex justify-content-end">
                                <button className="btn btn-primary mt-3" onClick={retrieveFrames}>Retrieve Frames</button>
                            </div>
                        </div>
                    )}
                    {/* STEP3 */}
                    {currentStep === 3 && (
                        <div className="">
                             {videoSources2.map((videoSrc, index) => (
                                <div key={index} className="mt-3 video-card">
                                    <div className="card-header" onClick={toggleExpand} style={{cursor: 'pointer'}}>
                                        {selectedVideos2[index]}
                                    </div>
                                    <div className="card-body" style={{display: 'none'}}>
                                        <VideoPlayer videoSrc={`${process.env.REACT_APP_API_HOST}${videoSrc}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const VideoCheckboxes = ({ videos, selectedVideos, setSelectedVideos }) => {
    const handleCheckboxChange = (e) => {
        const video = e.target.value;
        if (e.target.checked) {
            setSelectedVideos([...selectedVideos, video]);
        } else {
            setSelectedVideos(selectedVideos.filter((v) => v !== video));
        }
    };

    const handleSelectAll = () => {
        setSelectedVideos(videos);
    };

    const handleUnselectAll = () => {
        setSelectedVideos([]);
    };

    return (
        <div className="">
            <div className="mb-3">
                <button className="btn btn-primary me-2" onClick={handleSelectAll}>
                    Select All
                </button>
                <button className="btn btn-secondary" onClick={handleUnselectAll}>
                    Unselect All
                </button>
            </div>
            <div className="video-checkboxes">
                {videos.map((video, index) => (
                    <div className="form-check" key={index}>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            value={video}
                            id={`video-checkbox-${index}`}
                            checked={selectedVideos.includes(video)}
                            onChange={handleCheckboxChange}
                        />
                        <label className="form-check-label" htmlFor={`video-checkbox-${index}`}>
                            {video}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export { FrameRetrieval };