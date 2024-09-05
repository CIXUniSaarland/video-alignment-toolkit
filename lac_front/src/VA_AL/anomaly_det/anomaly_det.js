import React, {useState, useEffect} from "react";
import { Breadcrumbs } from "../VA_AL";
import { 
    fetchDatasets, 
    fetchVideos, 
    fetchFolderList,
    getVideoSrc
} from "../../util/api";
import { VideoPlayer } from "../../util/video";
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function AnomalyDetection() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Anomaly Detection' }  // Current page, no link
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
    const [videoFrame1, setVideoFrame1] = React.useState(0);
    const [frame1, setFrame1] = React.useState(null);
    const [selectedVideos2, setSelectedVideos2] = React.useState('');
    const [videoSrc2, setVideoSrc2] = React.useState('');
    const [videoFrame2, setVideoFrame2] = React.useState(0);
    const [frame2, setFrame2] = React.useState(null);

    const [distances, setDistances] = React.useState([]);
    const [threshold, setThreshold] = React.useState(0);
    const [anomalousFrames, setAnomalousFrames] = React.useState([]);

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

    function detectAnomaly() {
        console.log('Detecting anomaly...');
        fetch(`${process.env.REACT_APP_API_HOST}/detect_anomaly`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset: selectedDataset,
                video1: selectedVideos1,
                video2: selectedVideos2,
                directory: savedDir + '/' + selectedFolder
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'success') {
                console.log(data);
                setDistances(data.result.distances);
                setThreshold(data.result.threshold);
                setAnomalousFrames(data.result.anomalous_frames);
            } else {
                console.error('Failed to detect anomaly:', data.error);
            }
        })
        .catch(error => console.error('Error detecting anomaly:', error))
        .finally(() => {nextStep()});
    }

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2>Anomaly Detection</h2>



            {/* STEP3 */}
            <div className={currentStep === 3 ? "" : "d-none"}>
                <AnomalousDistancePlot
                data={distances}
                threshold={threshold}
                anomalousFrames={anomalousFrames}
                />
            </div>

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
                        <h5>Video 1 (Reference Video): </h5>
                        <select
                        value={selectedVideos1}
                        onChange={e => {
                            setSelectedVideos1(e.target.value);
                            getVideoSrc(e.target.value, selectedDataset, setVideoSrc1);
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
                            <button
                            onClick={prevStep}
                            className="btn btn-secondary">
                                Go Back
                            </button>
                        )}
                        
                        {currentStep < 2 && (
                            <button
                            onClick={nextStep}
                            className="btn btn-primary ms-auto">
                                Next
                            </button>
                        )}

                    </div>
                </div>

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
                            <h5>Video 2 (Query Video): </h5>
                            <select
                            value={selectedVideos2}
                            onChange={e => {
                                setSelectedVideos2(e.target.value);
                                getVideoSrc(e.target.value, selectedDataset,setVideoSrc2);
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
                                <button
                                className={`btn btn-primary mt-3 ms-auto`}
                                onClick={detectAnomaly}
                                disabled={!selectedVideos1 || !selectedVideos2}
                                >
                                    Detect Anomaly
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}

const AnomalousDistancePlot = ({ data, threshold, anomalousFrames }) => {
    const labels = data.map((_, index) => index);
    const annotations = data.map((distance, index) => ({
        type: 'label',
        xValue: index,
        yValue: distance,
        backgroundColor: 'white',
        content: anomalousFrames.includes(index) ? '✗' : '✓',
        color: anomalousFrames.includes(index) ? 'red' : 'green',
        xAdjust: 0,
        yAdjust: 10,
    }));

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Aligned Distance',
                data: data,
                borderColor: 'blue',
                backgroundColor: 'blue',
                pointStyle: 'circle',
                pointRadius: 5,
                showLine: true, // no line shown by default
            },
            {
                label: 'Threshold',
                data: new Array(data.length).fill(threshold),
                borderColor: 'red',
                borderDash: [5, 5],
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            annotation: {
                annotations: annotations
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Frame index'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Distance'
                }
            }
        },
        layout: {
            backgroundColor: 'white', // Set background color to white
        }
    };

    return (
        <div style={{ backgroundColor: 'white' }}> {/* Wrapper div style */}
            <Line data={chartData} options={options} />
        </div>
    );
};


export { AnomalyDetection };