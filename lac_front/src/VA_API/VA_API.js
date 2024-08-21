import React, { useState, useEffect } from "react";
import "./VA_API.css";

function RecursiveJsonEditor({ data, onChange }) {
    const handleChange = (e, key) => {
        const value = e.target.value;
        onChange({ ...data, [key]: value });
    };

    const handleNestedChange = (key, updatedValue) => {
        onChange({ ...data, [key]: updatedValue });
    };

    return (
        <div className="json-editor">
            {Object.keys(data).map((key) => (
                <div key={key} className="mb-3">
                    {typeof data[key] === 'object' && data[key] !== null ? (
                        <div className="nested">
                            <label className="form-label"><strong><u>{key}</u></strong></label>
                            <RecursiveJsonEditor 
                                data={data[key]} 
                                onChange={(updatedValue) => handleNestedChange(key, updatedValue)} 
                            />
                        </div>
                    ) : (
                        <div className="row step3-json w-100">
                            <div className="col-md-3">
                                <label className="form-label">{key}</label>
                            </div>
                            <div className="col-md-9">
                                <input 
                                    type="text" 
                                    value={data[key]} 
                                    onChange={e => handleChange(e, key)} 
                                    className="form-control"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function VA_API() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = React.useState(false);

    const nextStep = () => {
        setCurrentStep(prevStep => prevStep + 1);
    };

    const prevStep = () => {
        setCurrentStep(prevStep => Math.max(prevStep - 1, 1));
    };

    const [datasets, setDatasets] = useState([]);
    const [videos, setVideos] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState('');
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
            setLoading(true);
    
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
    
                    const responseDurations = await fetch('http://localhost:5001/get_video_durations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            dataset: selectedDataset,
                            videos: dataVideos.videos
                        })
                    });
    
                    const dataDurations = await responseDurations.json();
    
                    if (dataDurations.message === 'success') {
                        setVideoDurations(dataDurations.durations);
                        // nextStep(); // Move to next step if necessary
                    } else {
                        console.error('Failed to fetch video durations:', dataDurations.error);
                    }
                } else {
                    console.error('Failed to fetch videos:', dataVideos.error);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false); // Stop loading
            }
        };
    
        fetchData();
        if (currentStep === 2) {
            evaluateDataset();
        }
    }, [selectedDataset]);
    const [videoDurations, setVideoDurations] = useState({});

    const [warningMessage, setWarningMessage] = useState('');
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
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        };
        setConfigFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const json = JSON.parse(event.target.result);
            setConfigData(json);
            // nextStep();
        };
        reader.readAsText(file);
    };

    const handleConfigChange = (updatedConfig) => {
        setConfigData(updatedConfig);
    };

    const [savedDir, setSavedDir] = useState('./train-results');
    const [isSameDirectory, setIsSameDirectory] = useState(false);
    const [isTrain, setIsTrain] = useState(false);
    const [logs, setLogs] = useState('');
    function startTraining() {
        setIsTrain(true);

        // API call to save the config first
        fetch('http://localhost:5001/save_config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset: selectedDataset,
                saved_dir: savedDir,
                config: configData,
                is_same_dir: isSameDirectory,
            }),
        })
        .then(response => response.json())
        .then(saveConfigData => {
            if (saveConfigData.message !== 'success') {
                throw new Error('Failed to save config: ' + saveConfigData.error);
            }
            
            console.log('Config saved:', saveConfigData);
            const url = new URL('http://localhost:5001/train_sse');
            url.searchParams.append('config', saveConfigData.config_path);
            const eventSource = new EventSource(url.toString());

            eventSource.onmessage = function(event) {
                // console.log('New training log:', event.data);
                setLogs(prevLogs => prevLogs + event.data);
            };

            eventSource.onerror = function(error) {
                console.error('EventSource failed:', error);
                eventSource.close();
                setIsTrain(false);
            };

            return () => {
                eventSource.close();
            };
        })
        .catch(error => {
            console.error('Error during the training process:', error);
            setIsTrain(false);
        });
    }

    const isDisabled = (!selectedDataset && currentStep === 1) || loading || (!configFileName && currentStep === 3);

    React.useEffect(() => {
        if (warningMessage) {
            const timer = setTimeout(() => {
                setWarningMessage('');
            }, 5000); // 5000 milliseconds = 5 seconds

            return () => clearTimeout(timer);
        }
    }, [warningMessage]);
    
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
                            <h5>3. Load and Edit Config JSON File</h5>
                        </div>

                        <p>Load a JSON configuration file to edit the parameters for training.</p>
                        <div className="my-3">
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleFileUpload} 
                                className="form-control"
                            />
                        </div>

                        {configData && (
                            <div className="my-3 config-section">
                                {/* <h4>Editing: {configFileName}</h4> */}
                                <form>
                                    <RecursiveJsonEditor 
                                        data={configData} 
                                        onChange={handleConfigChange} 
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

                        <div className="row mb-3">
                            <div className="col-md-4">
                                <label className="form-label">Saved Directory:</label>
                            </div>
                            <div className="col-md-8 custom-input">
                                <input 
                                    type="text" 
                                    value={savedDir} 
                                    onChange={(e) => setSavedDir(e.target.value)}
                                    className="form-control"
                                />
                            </div>
                        </div>

                        <div className="row mb-5 form-switch">
                            <div className="col-md-4">
                                <label class="form-check-label" for="flexSwitchCheckDefault">Set the results directory the same as the saved directory above</label>
                            </div>
                            <div className="col-md-8 custom-input">
                                <input 
                                    className="form-check-input me-2" 
                                    type="checkbox" 
                                    id="flexSwitchCheckDefault"
                                    checked={isSameDirectory}
                                    onChange={(e) => setIsSameDirectory(e.target.checked)}
                                ></input> {isSameDirectory ? 'Yes' : 'No'}
                            </div>
                        </div>
                        
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
                        {currentStep === 4 && (
                            <button 
                            className="btn btn-success flex-grow-1 ms-3"
                            onClick={startTraining}
                            disabled={isTrain}
                            >Train</button>
                        )}
                    </div>
                </div>

                <div className="col-md-6 video-list">
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
                                    <h5>Training Logs:</h5>
                                    <pre>
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
