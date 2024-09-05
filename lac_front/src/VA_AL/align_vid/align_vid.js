import React from "react";
import { Breadcrumbs } from "../VA_AL";
import { VideoPlayer } from "../../util/video";
import { DTWPathVisualizer } from "./dtw_path";
import axios from "axios";

function AlignVideos() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Align Videos' }  // Current page, no link
    ];

    const [currentStep, setCurrentStep] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const nextStep = () => {
        setCurrentStep(prevStep => prevStep + 1);
    };

    const prevStep = () => {
        setCurrentStep(prevStep => Math.max(prevStep - 1, 1));
    };

    const [datasets, setDatasets] = React.useState([]);
    const [videos, setVideos] = React.useState([]);
    const [savedDir, setSavedDir] = React.useState('./train-results');
    const [selectedDataset, setSelectedDataset] = React.useState('');
    const [folders, setFolders] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState('');
    
    const [selectedVideos1, setSelectedVideos1] = React.useState('');
    const [videoSrc1, setVideoSrc1] = React.useState('');
    const [videoFrame1, setVideoFrame1] = React.useState(0);
    const [frame1, setFrame1] = React.useState(null);
    const [selectedVideos2, setSelectedVideos2] = React.useState('');
    const [videoSrc2, setVideoSrc2] = React.useState('');
    const [videoFrame2, setVideoFrame2] = React.useState(0);
    const [frame2, setFrame2] = React.useState(null);

    const [costMatrix, setCostMatrix] = React.useState([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    const [path, setPath] = React.useState([[0,0], [1,1], [1,2], [2,2]]);

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

        // detect videoFrame1 changes
        if (videoFrame1 !== 0) {
            axios.post('http://localhost:5001/get_frame', {
                video: selectedVideos1,
                frame: videoFrame1,
                dataset: selectedDataset,
            }, {
                responseType: 'blob'
            })
            .then(response => {
                const blob = response.data;
                const img = URL.createObjectURL(blob);
                setFrame1(img);
            })
            .catch(error => console.error('Error fetching frame:', error));
        }

        // detect videoFrame2 changes
        if (videoFrame2 !== 0) {
            axios.post('http://localhost:5001/get_frame', {
                video: selectedVideos2,
                frame: videoFrame2,
                dataset: selectedDataset,
            }, {
                responseType: 'blob'
            })
            .then(response => {
                const blob = response.data;
                const img = URL.createObjectURL(blob);
                setFrame2(img);
            }
            )
            .catch(error => console.error('Error fetching frame:', error));
        }

    }, [videoFrame1, videoFrame2]);

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

    function alignVid() {
        setLoading(true);
        try {
            fetch('http://localhost:5001/align_videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video1: selectedVideos1,
                    video2: selectedVideos2,
                    dataset: selectedDataset,
                    directory: savedDir + '/' + selectedFolder
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        console.log('Successfully aligned videos:', data);
                        setCostMatrix(data.result.acc_cost_mat);
                        setPath(data.result.path);
                        nextStep();
                        setLoading(false);
                    } else {
                        console.error('Failed to align videos:', data.error);
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
            <h2>Align Videos</h2>



            {/* STEP3 */}
            <div className={currentStep === 3 ? "w-100" : "d-none"}>
                <div className="row">
                    <div className="col-md-12">
                        <DTWPathVisualizer 
                        costMatrix={costMatrix} 
                        dtwPath={path} 
                        cellSize={3} 
                        setFrame1={setVideoFrame1}
                        setFrame2={setVideoFrame2}/>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <h5>Reference Video Frame: {videoFrame1}</h5>
                        <img src={frame1} alt="Video Frame" style={{ width: '300px' }} />
                    </div>
                    <div className="col-md-6">
                        <h5>Query Video Frame: {videoFrame2}</h5>
                        <img src={frame2} alt="Video Frame" style={{ width: '300px' }} />
                    </div>
                </div>
            </div>
            
            <div className="row">
                {/* left */}
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
                        <h5>Video 1 (Reference Video): </h5>
                        <select
                        value={selectedVideos1}
                        onChange={e => {
                            setSelectedVideos1(e.target.value);
                            getVideoSrc(e.target.value, setVideoSrc1);
                        }}
                        className="form-select"
                        >
                            <option value="">Select video 1</option>
                            {videos.map((video, index) => (
                                <option key={index} value={video}>{video}</option>
                            ))}
                        </select>
                        {selectedVideos1 && (
                            <div className="mt-3">
                                <VideoPlayer videoSrc={videoSrc1} />
                            </div>
                        )}
                    </div>

                    <div className="d-flex justify-content-between mt-3">
                        {currentStep > 1 && (
                            <button className="btn btn-secondary" onClick={prevStep}>
                                Go Back
                            </button>
                        )}
                        {currentStep < 2 && (
                            <button 
                            className="btn btn-primary ms-auto" 
                            disabled={!selectedDataset || !selectedFolder}
                            data-bs-toggle="tooltip" data-bs-placement="top"
                            title="Select dataset and folder to proceed"
                            onClick={nextStep}>
                                Next
                            </button>
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
                            <h5>Video 2 (Query Video): </h5>
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
                                    <VideoPlayer videoSrc={videoSrc2} />
                                </div>
                            )}
                            <div className="d-flex justify-content-between mt-3">
                            {(loading &&
                                <div className="loading-spinner ms-auto me-3">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                                <button
                                className={`btn btn-primary ${loading ? '' : 'ms-auto'}`}
                                onClick={alignVid}
                                disabled={loading || (!selectedVideos1 || !selectedVideos2)}
                                >Align</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export { AlignVideos };