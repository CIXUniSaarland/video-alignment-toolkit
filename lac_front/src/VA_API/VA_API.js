import React, { useState, useEffect } from "react";
import { 
    fetchDatasets, 
    fetchVideos, 
    fetchVideoDurations,
    saveConfig,
    startEventSource,
    getDefaultConfig,
    startWebSocketConnection,
    stopTrainingSocket
} from "../util/api";
import "./VA_API.css";
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


function RecursiveJsonEditor({ data, onChange, setWarningMessage }) {
    const [modelOptions, setModelOptions] = useState(["model1", "model2", "model3"]);
    const acceptedKeys = {
        "n_gpu": {
            "name": "Number of GPUs",
            "type": "int"
        },
        "data_loader": {
            "name": "Data Loader",
            "type": "object"
        },
        "batch_size": {
            "name": "Batch Size",
            "type": "int"
        },
        "num_frames": {
            "name": "Number of Frames",
            "type": "int",
            "options": [16, 32, 64, 128]
        },
        "trainer": {
            "name": "Trainer",
            "type": "object"
        },
        "epochs": {
            "name": "Epochs",
            "type": "int"
        },
        "resume": {
            "name": "Resume",
            "type": "bool"
        },
        "working_dir": {
            "name": "Working Directory",
            "type": "str"
        },
        "resume_model": {
            "name": "Resume Model",
            "type": "str",
            "options": modelOptions
        }
    };

    const fetchModelOptions = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_model_options`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ working_dir: data.working_dir })
            });
            const data_ = await response.json();
            
            if (response.ok && data_.message === 'success') {
                if (data_.models.length > 0) {
                    setModelOptions(data_.models);
                } else {
                    setWarningMessage('No models found in the working directory.');
                    setModelOptions([]);
                    onChange({ ...data, resume: false });
                }
            } else {
                setWarningMessage('Failed to fetch model options: ' + data_.error +
                    ' Please check if the working directory is correct.');
                console.error('Failed to fetch model options:', data_.error);
                onChange({ ...data, resume: false });
            }
        } catch (err) {
            console.error('Error fetching model options:', err);
        }
    };
        
    const handleChange = (e, key) => {
        const value = acceptedKeys[key].type === 'bool' ? e.target.checked : e.target.value;
        onChange({ ...data, [key]: value });
        if (key === 'resume' && value) {
            fetchModelOptions();
        }
    };

    const handleNestedChange = (key, updatedValue) => {
        onChange({ ...data, [key]: updatedValue });
    };

    const filterKey = (key) => {
        return acceptedKeys[key] !== undefined;
    };

    return (
        <div className="json-editor">
            {Object.keys(data)
            .filter(key => filterKey(key))
            .map((key) => (
                <div key={key} className="mb-3">
                    {typeof data[key] === 'object' && data[key] !== null ? (
                        <div className="nested">
                            <label className="form-label"><strong><u>{key}</u></strong></label>
                            <RecursiveJsonEditor 
                                data={data[key]} 
                                onChange={(updatedValue) => handleNestedChange(key, updatedValue)} 
                                setWarningMessage={setWarningMessage}
                            />
                        </div>
                    ) : (
                        key !== "resume_model" && <div className="row step3-json w-100">
                            <div className="col-md-3">
                                <label className="form-label">{acceptedKeys[key]["name"]}</label>
                            </div>
                            <div className="col-md-9">
                                {acceptedKeys[key].options ? (
                                    <select
                                        value={data[key] || acceptedKeys[key].options[0]}
                                        onChange={e => handleChange(e, key)}
                                        className="form-select"
                                    >
                                        {acceptedKeys[key].options.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : acceptedKeys[key].type === 'bool' ? (
                                    <input 
                                        type="checkbox" 
                                        checked={!!data[key]} 
                                        onChange={e => handleChange(e, key)} 
                                        className="form-check-input"
                                    />
                                ) : (
                                    <input 
                                        type="text" 
                                        value={data[key]} 
                                        onChange={e => handleChange(e, key)} 
                                        className="form-control"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Show "Resume Model" select dropdown only if "Resume" checkbox is true */}
                    {key === 'resume' && data.resume && (
                        <div className="row step3-json w-100 mt-3">
                            <div className="col-md-3">
                                <label className="form-label">{acceptedKeys['resume_model'].name}</label>
                            </div>
                            <div className="col-md-9">
                                <select 
                                    value={data['resume_model'] || acceptedKeys['resume_model'].options[0]} 
                                    onChange={e => handleChange(e, 'resume_model')} 
                                    className="form-select"
                                >
                                    {acceptedKeys['resume_model'].options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const TrainingProgressBar = () => {
    const [progress, setProgress] = useState(0);
    const [remainingTime, setRemainingTime] = useState("Calculating...");
    const [loss, setLoss] = useState(null);

    useEffect(() => {
        const socket = io(process.env.REACT_APP_API_HOST);

        socket.on('training_progress', (data) => {
            if (data.progress !== undefined) {
                setProgress(data.progress);
            }
            if (data.remaining_time) {
                setRemainingTime(data.remaining_time);
            }
            if (data.loss !== undefined) {
                setLoss(data.loss);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div style={{ width: '100%', padding: '20px' }}>
            <div style={{ marginBottom: '10px', fontSize: '18px' }}>
                <strong>Training Progress</strong>
            </div>
            <div style={{ position: 'relative', height: '30px', background: '#e0e0e0', borderRadius: '15px' }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: progress >= 100 ? '#4caf50' : 'rgba(75,192,192,1)',
                        borderRadius: '15px',
                        transition: 'width 0.5s ease-in-out',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#fff',
                        fontWeight: 'bold',
                    }}
                >
                    {Math.round(progress)}%
                </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '16px' }}>
                <div><strong>Estimated Remaining Time:</strong> {remainingTime}</div>
                {loss !== null && (
                    <div><strong>Current Loss:</strong> {loss.toFixed(4)}</div>
                )}
            </div>
        </div>
    );
};

const LossChart = () => {
    const [lossData, setLossData] = useState([]);
    const [epochData, setEpochData] = useState([]);

    useEffect(() => {
        const socket = io(process.env.REACT_APP_API_HOST);

        socket.on('training_progress', (data) => {
            if (data.loss !== undefined && data.epoch !== undefined) {
                setLossData((prevLossData) => [...prevLossData, data.loss]);
                setEpochData((prevEpochData) => [...prevEpochData, data.epoch]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const data = {
        labels: epochData, // X-axis labels (Epochs)
        datasets: [
            {
                label: 'Loss',
                data: lossData, // Y-axis values (Loss)
                fill: false,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                tension: 0.1,
            },
        ],
    };

    const options = {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Epoch',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Loss',
                },
                beginAtZero: true,
            },
        },
    };

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <Line data={data} options={options} />
        </div>
    );
};

function VA_API() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [datasets, setDatasets] = useState([]);
    const [videos, setVideos] = useState([]);
    const [videoDurations, setVideoDurations] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState('');
    const [warningMessage, setWarningMessage] = useState('');

    useEffect(() => {
        const loadDatasets = async () => {
            const fetchedDatasets = await fetchDatasets();
            setDatasets(fetchedDatasets);
        };

        const loadVideosAndDurations = async () => {
            if (!selectedDataset) return;

            setLoading(true);
            const fetchedVideos = await fetchVideos(selectedDataset);
            setLoading(false);
            setVideos(fetchedVideos);

            if (fetchedVideos.length > 0) {
                const fetchedDurations = await fetchVideoDurations(selectedDataset, fetchedVideos);
                setVideoDurations(fetchedDurations);
            }
        };

        // Fetch datasets on initial render
        loadDatasets();

        // Fetch videos and durations when selectedDataset changes
        if (selectedDataset) {
            loadVideosAndDurations();
        }

        if (currentStep === 2) {
            evaluateDataset();
        }

        // warning
        if (warningMessage) {
            const timer = setTimeout(() => {
                setWarningMessage('');
            }, 5000);

            return () => clearTimeout(timer);
        }

        // config
        if (currentStep === 3 && !configData) {
            getDefaultConfig().then((config) => {
                setConfigData(config);
            });
        }

    }, [selectedDataset, currentStep, warningMessage]);

    const nextStep = () => setCurrentStep(prevStep => prevStep + 1);
    const prevStep = () => setCurrentStep(prevStep => Math.max(prevStep - 1, 1));

    const [datasetGrade, setDatasetGrade] = useState(0);
    const handleWarning = () => {

        if (currentStep === 1 ) {
            if (!selectedDataset) {
                setWarningMessage('Please select a dataset before proceeding.');
                return;
            }
            if (loading) {
                setWarningMessage('Please wait until loading is finished.');
                return;
            }
        }

        if (currentStep === 3) {
            if (!configData) {
                setWarningMessage('Please upload a configuration file before proceeding.');
                return;
            }
        }
        setWarningMessage('');
    }
    
    const handleDismissWarning = () => {
        setWarningMessage('');
    };

    const [activityCount, setActivityCount] = useState(0);
    function evaluateDataset() {
        // DUMMY
        // TODO: CHANGE LATER
        console.log(activityCount);
        const totalDuration = Object.values(videoDurations).reduce((sum, duration) => sum + duration, 0);
        const numVideos = videos.length;
        const maxDuration = 3600;
        const maxActivities = 5; 

        let score = 0;
        // Evaluate number of videos
        score += Math.min(4, (numVideos / 10) * 4);
        // Evaluate total duration
        score += Math.min(3, (totalDuration / maxDuration) * 3);
        // Evaluate number of activities
        score += Math.min(3, (activityCount / maxActivities) * 3);

        setDatasetGrade(score.toFixed(1));
    };

    const [configData, setConfigData] = useState(null);
    const [configFileName, setConfigFileName] = useState('');
    const handleConfigChange = (updatedConfig) => {
        setConfigData(updatedConfig);
    };

    const [savedDir, setSavedDir] = useState('./train-results');
    const [isSameDirectory, setIsSameDirectory] = useState(false);
    const [isTrain, setIsTrain] = useState(false);
    const [logs, setLogs] = useState('');
    function startTraining() {
        setIsTrain(true);
    
        saveConfig(selectedDataset, savedDir, configData, isSameDirectory)
            .then((configPath) => {
                const closeWebSocketConnection = startWebSocketConnection(configPath, setLogs, setIsTrain);
                return closeWebSocketConnection;
            })
            .catch((error) => {
                console.error('Error during the training process:', error);
                setIsTrain(false);
            });
    }

    function stopTraining() {
        stopTrainingSocket();
        setIsTrain(false);
    }

    const [uploadedFile, setUploadedFile] = useState(null);

    // Handle file selection
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFile(file);
            setSelectedDataset(file.name);
            setWarningMessage('');
            // You can also send the file to a backend for storage if needed
            uploadDataset(file);
        }
    };

    // Function to handle file upload (Optional: Send to backend)
    const uploadDataset = async (file) => {
        const formData = new FormData();
        formData.append("dataset", file);

        try {
            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                console.log("Upload successful");
            } else {
                console.error("Upload failed");
            }
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    // next button: disabled
    const isDisabled = (!selectedDataset && currentStep === 1) || loading || (!configData && currentStep === 3);
    
    return (
        <div className="w-100">
            <div className="row py-5">
                <div className="col-md-12">
                    <h2>VAT: Training</h2>
                </div>
            </div>

            {warningMessage && (
                <div className="alert alert-warning alert-dismissible fade show position-fixed top-3 end-0 mt-5 me-3" role="alert">
                    {warningMessage}    
                    <button type="button" className="btn-close" aria-label="Close" onClick={handleDismissWarning}></button>
                </div>
            )}

            <div className="row">
                <div className="col-md-6">
                    {/* STEP1 */}
                    {/* <div className={`step ${currentStep === 1 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>1. Select a Dataset</h5>
                            {loading && (
                                <div className="loading-spinner">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p>Dataset path should be 'datasets/' adjacent to this server folder. After selecting the dataset folder, the list of videos in that folder should appear on the right side.</p>
                        <select
                            value={selectedDataset}
                            onChange={e => {
                                setSelectedDataset(e.target.value);
                                setWarningMessage(''); // Clear warning when a selection is made
                            }}
                            className="form-select"
                        >
                            <option value="">Select a Dataset</option>
                            {datasets.map((dataset, index) => (
                                <option key={index} value={dataset}>{dataset}</option>
                            ))}
                        </select>
                    </div> */}
                    <div className={`step ${currentStep === 1 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>1. Select a Dataset</h5>
                            {loading && (
                                <div className="loading-spinner">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p>Select a previous uploaded dataset or upload a new one. For uploading, zip the dataset with all the videos inside a single folder.</p>

                        {/* File Upload Input */}
                        <div className="mb-3">
                            <label htmlFor="datasetUpload" className="form-label">Upload a Dataset:</label>
                            <div className="d-flex justify-content-between align-items-center gap-2">
                                <input
                                    type="file"
                                    id="datasetUpload"
                                    className="form-control"
                                    onChange={e => setUploadedFile(e.target.files[0])}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleFileUpload(uploadedFile)}
                                    disabled={!uploadedFile}
                                >
                                    Upload
                                </button>
                            </div>
                            {uploadedFile && <p className="text-success mt-2">Selected: {uploadedFile.name}</p>}
                        </div>

                        {/* Dataset Selection Dropdown */}
                        <select
                            value={selectedDataset}
                            onChange={e => {
                                setSelectedDataset(e.target.value);
                                setWarningMessage('');
                            }}
                            className="form-select"
                        >
                            <option value="">Select a Dataset</option>
                            {datasets.map((dataset, index) => (
                                <option key={index} value={dataset}>{dataset}</option>
                            ))}
                        </select>
                    </div>

                    {/* STEP2 */}
                    <div className={`step ${currentStep === 2 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>2. Dataset Quality</h5>
                        </div>

                        <p>Dataset quality is determined by our metrics, which include the number of videos, the duration of the videos, and the number of activities captured in the videos. 
                        Based on this information, you can determine whether or not to continue with training.
                        </p>
                        <p>Number of activities: {activityCount}</p>
                        <input
                            type="range"
                            id="activity-slider"
                            value={activityCount}
                            onChange={e => {
                                setActivityCount(e.target.value);
                                evaluateDataset();
                            }}
                            min="0"
                            max="5"
                            step="1"
                            className="w-100"
                        />

                        <label>Dataset Quality Grade: {datasetGrade} / 10</label> <br/>
                        <div className="mt-1 progress">
                            <div 
                                className={`progress-bar ${datasetGrade >= 7 ? 'bg-success' : datasetGrade >= 4 ? 'bg-warning' : 'bg-danger'}`} 
                                role="progressbar" 
                                style={{ width: `${(datasetGrade / 10) * 100}%`, padding: 0 }} 
                                aria-valuenow={datasetGrade} 
                                aria-valuemin="0" 
                                aria-valuemax="10"
                            >
                                {datasetGrade} / 10
                            </div>
                        </div>


                        <div className={`mt-2`}>
                            <p className="mb-0">Legend:</p>
                            <ul className="list-unstyled">
                                <li><span className="badge bg-success">&nbsp;&nbsp;</span> 7 - 10: Passing (Green)</li>
                                <li><span className="badge bg-warning">&nbsp;&nbsp;</span> 4 - 6: Middle Range (Yellow)</li>
                                <li><span className="badge bg-danger">&nbsp;&nbsp;</span> 0 - 3: Insufficient (Red)</li>
                            </ul>
                        </div>
                    </div>

                    {/* STEP3 */}
                    <div className={`step ${currentStep === 3 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>3. Configuration</h5>
                        </div>

                        <p>Configure the training settings according to your computer's hardware capabilities. 
                            The default settings are optimized for a single GPU. 
                            If you have multiple or more powerful GPUs, you can increase the number of frames, batch size, epochs, and other relevant parameters.
                        </p>

                        <p>
                        You can resume training after adding more training files or if you want to improve performance from a previous checkpoint by providing the path to the saved model.
                        </p>

                        {configData && (
                            <div className="my-3 config-section">
                                {/* <h4>Editing: {configFileName}</h4> */}
                                <form>
                                    <RecursiveJsonEditor 
                                        data={configData} 
                                        onChange={handleConfigChange} 
                                        setWarningMessage={setWarningMessage}
                                    />
                                </form>
                            </div>
                        )}
                    </div>

                    {/* STEP4 */}
                    <div className={`step ${currentStep === 4 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>4. Summary & Training</h5>
                            {isTrain && (
                                <div className="loading-spinner">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p>Here is a summary of the settings. If you are sure, you can click the 'Train' button below.</p>
                        
                        <div className="summary w-100">
                            <h6>Dataset: {selectedDataset}</h6>
                            <h6>Number of Videos: {videos.length}</h6>
                            <h6>Dataset Quality Grade: {datasetGrade} / 10</h6>

                            <h6>Config File: {configFileName}</h6>
                            {configData && (
                                <div className="config-section">
                                    <h6>Configuration:</h6>
                                    <pre>{JSON.stringify(configData, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="d-flex justify-content-between my-3">
                        {currentStep > 1 && (
                            <button 
                                onClick={prevStep} 
                                className="btn btn-secondary"
                                disabled={isTrain}
                            >Go Back</button>
                        )}
                        {currentStep <= 3 && (
                            <div
                                className="ms-auto"
                                onMouseEnter={() => {
                                    handleWarning();
                                }}
                                data-bs-toggle="tooltip"
                                title={isDisabled ? warningMessage : ''}
                            >
                                <button
                                    onClick={nextStep}
                                    className="btn btn-primary ms-auto"
                                    disabled={isDisabled} // Disable button based on conditions
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        {currentStep === 4 && !isTrain ? (
                            <button 
                            className="btn btn-success flex-grow-1 ms-3"
                            onClick={startTraining}
                            disabled={isTrain}
                            >Train</button>
                        ) : currentStep === 4 && isTrain && (
                            <button
                            className="btn btn-danger flex-grow-1 ms-3"
                            onClick={stopTraining}
                            >
                                Stop Training
                            </button>
                        )}
                    </div>
                </div>

                <div className={`col-md-6 ${currentStep <= 3 ? 'video-list' : ''}`}  style={{ height: '30vh' }}>
                    <div className="row w-100">
                            {currentStep <= 3 && videos.map((video, index) => (
                                <li key={index} className="list-group-item">
                                    <div className="row">
                                        <div className="col-md-8">
                                            {video}
                                        </div>
                                        <div className="col-md-4 text-end">
                                            {videoDurations[video] && (
                                                <span>{videoDurations[video].toFixed(2)}s</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {currentStep === 4 && (
                                <div className="logs w-100" id="logs">
                                    <TrainingProgressBar />
                                    <LossChart />

                                    <h5>Training Logs:</h5>
                                    <pre style={{ overflowY: 'auto', maxHeight: '300px' }}>
                                        {logs}
                                    </pre>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export {VA_API};
