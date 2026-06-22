import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { 
    fetchDatasets, 
    fetchVideos, 
    fetchVideoDurations,
    saveConfig,
    startEventSource,
    getDefaultConfig,
    fetchConfigFiles,
    fetchConfigFile,
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
    const [collapsedSections, setCollapsedSections] = useState({
        data_loader: true,
        trainer: true,
    });
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
        // HTML inputs/selects return strings; keep int fields numeric for the backend.
        let value;
        if (acceptedKeys[key].type === 'bool') {
            value = e.target.checked;
        } else if (acceptedKeys[key].type === 'int') {
            value = e.target.value === '' ? '' : Number(e.target.value);
        } else {
            value = e.target.value;
        }
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

    const isCollapsibleSection = (key) => key === 'data_loader' || key === 'trainer';
    const hasDataLoaderSection = typeof data.data_loader === 'object' && data.data_loader !== null;

    const toggleSection = (key) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const renderFieldRow = (fieldKey, extraClass = '') => {
        if (fieldKey === 'resume_model') {
            return null;
        }

        return (
            <div className={`row step3-json w-100 ${extraClass}`.trim()}>
                <div className="col-md-3">
                    <label className="form-label">{acceptedKeys[fieldKey]["name"]}</label>
                </div>
                <div className="col-md-9">
                    {acceptedKeys[fieldKey].options ? (
                        <select
                            value={data[fieldKey] ?? acceptedKeys[fieldKey].options[0]}
                            onChange={e => handleChange(e, fieldKey)}
                            className="form-select"
                        >
                            {acceptedKeys[fieldKey].options.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    ) : acceptedKeys[fieldKey].type === 'bool' ? (
                        <input 
                            type="checkbox" 
                            checked={!!data[fieldKey]} 
                            onChange={e => handleChange(e, fieldKey)} 
                            className="form-check-input"
                        />
                    ) : (
                        <input 
                            type="text" 
                            value={data[fieldKey] ?? ''} 
                            onChange={e => handleChange(e, fieldKey)} 
                            className="form-control"
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="json-editor">
            {Object.keys(data)
            .filter(key => filterKey(key))
            .map((key) => (
                <div key={key} className="mb-3">
                    {typeof data[key] === 'object' && data[key] !== null ? (
                        <div className="nested">
                            {isCollapsibleSection(key) ? (
                                <button
                                    type="button"
                                    className="btn btn-link config-collapse-button"
                                    onClick={() => toggleSection(key)}
                                >
                                    <span className={`config-collapse-arrow ${collapsedSections[key] ? 'collapsed' : ''}`}>▾</span>
                                    <strong><u>{acceptedKeys[key]?.name || key}</u></strong>
                                </button>
                            ) : (
                                <label className="form-label"><strong><u>{acceptedKeys[key]?.name || key}</u></strong></label>
                            )}

                            {(!isCollapsibleSection(key) || !collapsedSections[key]) && (
                                <>
                                    {key === 'data_loader' && hasDataLoaderSection && renderFieldRow('n_gpu', 'mt-2 mb-3')}
                                    <RecursiveJsonEditor 
                                        data={data[key]} 
                                        onChange={(updatedValue) => handleNestedChange(key, updatedValue)} 
                                        setWarningMessage={setWarningMessage}
                                    />
                                </>
                            )}
                        </div>
                    ) : (
                        key !== "resume_model" && !(key === 'n_gpu' && hasDataLoaderSection) && renderFieldRow(key)
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
    const [epoch, setEpoch] = useState(null);

    useEffect(() => {
        const socket = io(process.env.REACT_APP_API_HOST);

        socket.on('training_progress', (data) => {
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.remaining_time) setRemainingTime(data.remaining_time);
            if (data.loss !== undefined) setLoss(data.loss);
            if (data.epoch !== undefined) setEpoch(data.epoch);
        });

        return () => socket.disconnect();
    }, []);

    const pct = Math.min(100, Math.max(0, progress));

    return (
        <div className="training-progress">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>Training Progress</strong>
                <span className="training-progress-pct">{Math.round(pct)}%</span>
            </div>
            <div className="progress" style={{ height: '20px' }}>
                <div
                    className={`progress-bar ${pct >= 100 ? 'bg-success' : ''}`}
                    role="progressbar"
                    style={{ width: `${pct}%`, transition: 'width 0.3s ease' }}
                    aria-valuenow={pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            </div>
            <div className="training-progress-stats mt-2">
                <div><span>Remaining</span><strong>{remainingTime}</strong></div>
                {epoch !== null && <div><span>Epoch</span><strong>{epoch}</strong></div>}
                {loss !== null && <div><span>Current Loss</span><strong>{loss.toFixed(4)}</strong></div>}
            </div>
        </div>
    );
};

const MAX_POINTS = 300; // rolling window so long runs stay responsive

const LossChart = () => {
    const [lossData, setLossData] = useState([]);
    const [stepData, setStepData] = useState([]);

    useEffect(() => {
        const socket = io(process.env.REACT_APP_API_HOST);

        socket.on('training_progress', (data) => {
            // Plot per batch/step (the per-epoch emit has no `step`, so it's skipped).
            if (data.step !== undefined && data.loss !== undefined) {
                setLossData((prev) => [...prev, data.loss].slice(-MAX_POINTS));
                setStepData((prev) => [...prev, data.step].slice(-MAX_POINTS));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const data = {
        labels: stepData,
        datasets: [
            {
                label: 'Loss (per step)',
                data: lossData,
                fill: false,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                tension: 0.1,
                pointRadius: 0,
            },
        ],
    };

    const options = {
        animation: false,
        scales: {
            x: { title: { display: true, text: 'Step' } },
            y: { title: { display: true, text: 'Loss' }, beginAtZero: true },
        },
    };

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <Line data={data} options={options} />
        </div>
    );
};

// Pretty, readable rendering of the configuration object for the summary step.
// Scalars are shown as a flat list; nested objects (data_loader, trainer, loss, ...)
// become titled groups of key/value rows.
function ConfigSummary({ config }) {
    if (!config) return null;

    const prettyKey = (k) =>
        k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const renderValue = (v) => {
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        if (v === null || v === undefined || v === '') return '—';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    };

    const entries = Object.entries(config).filter(([k]) => k !== 'cfg_path');
    const scalars = entries.filter(([, v]) => typeof v !== 'object' || v === null);
    const groups = entries.filter(([, v]) => typeof v === 'object' && v !== null);

    return (
        <div className="config-pretty">
            {scalars.length > 0 && (
                <div className="config-pretty-group">
                    {scalars.map(([k, v]) => (
                        <div className="config-pretty-row" key={k}>
                            <span className="config-pretty-key">{prettyKey(k)}</span>
                            <span className="config-pretty-val">{renderValue(v)}</span>
                        </div>
                    ))}
                </div>
            )}
            {groups.map(([section, vals]) => (
                <div className="config-pretty-group" key={section}>
                    <div className="config-pretty-title">{prettyKey(section)}</div>
                    {Object.entries(vals).map(([k, v]) => (
                        <div className="config-pretty-row" key={k}>
                            <span className="config-pretty-key">{prettyKey(k)}</span>
                            <span className="config-pretty-val">{renderValue(v)}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function VA_API() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [datasets, setDatasets] = useState([]);
    const [videos, setVideos] = useState([]);
    const [videoDurations, setVideoDurations] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState('');
    const [warningMessage, setWarningMessage] = useState('');

    // Load the list of datasets once on mount.
    useEffect(() => {
        let cancelled = false;
        fetchDatasets().then((fetched) => {
            if (!cancelled) setDatasets(fetched);
        });
        return () => { cancelled = true; };
    }, []);

    // Load videos + durations whenever the selected dataset changes.
    // `loading` stays true until BOTH the file list AND the durations are in, so
    // the user cannot advance to the next step mid-load. The `cancelled` flag stops
    // a slow previous dataset from overwriting a newer selection (race condition).
    useEffect(() => {
        if (!selectedDataset) {
            setVideos([]);
            setVideoDurations({});
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setVideos([]);          // clear stale list immediately
        setVideoDurations({});

        (async () => {
            const fetchedVideos = await fetchVideos(selectedDataset);
            if (cancelled) return;
            setVideos(fetchedVideos);

            if (fetchedVideos.length > 0) {
                const fetchedDurations = await fetchVideoDurations(selectedDataset, fetchedVideos);
                if (cancelled) return;
                setVideoDurations(fetchedDurations);
            }
            if (!cancelled) setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [selectedDataset]);

    // Load configuration files when entering the configuration step.
    useEffect(() => {
        if (currentStep !== 3) return;
        let cancelled = false;
        fetchConfigFiles().then((configs) => {
            if (cancelled) return;
            setConfigFiles(configs);

            if (configs.length > 0 && !selectedConfigFile) {
                const preferredConfig = configs.includes('pouring/lac.json') ? 'pouring/lac.json' : configs[0];
                setSelectedConfigFile(preferredConfig);
                loadSelectedConfig(preferredConfig);
            } else if (configs.length === 0 && !configData) {
                getDefaultConfig().then((config) => {
                    if (!cancelled) {
                        setConfigData(config);
                        setConfigFileName('Default');
                    }
                });
            }
        });
        return () => { cancelled = true; };
    }, [currentStep]);

    // Auto-dismiss the warning banner after 5 seconds.
    useEffect(() => {
        if (!warningMessage) return;
        const timer = setTimeout(() => setWarningMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [warningMessage]);

    const nextStep = () => {
        setCurrentStep((prevStep) => {
            if (prevStep === 1) return 3;
            if (prevStep === 3) return 4;
            return prevStep;
        });
    };

    const prevStep = () => {
        setCurrentStep((prevStep) => {
            if (prevStep === 4) return 3;
            if (prevStep === 3) return 1;
            return Math.max(prevStep - 1, 1);
        });
    };

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

    // Dataset quality grade (0–10), based on the number of videos in the dataset.
    // The paper finds ~25 videos is typically enough for good results, and accuracy
    // keeps improving up to ~50+. We map that guidance onto the score:
    //   0 videos -> 0, 25 videos -> 7 ("recommended"), 50+ videos -> 10.
    useEffect(() => {
        const n = videos.length;
        let grade;
        if (n <= 0) grade = 0;
        else if (n >= 50) grade = 10;
        else if (n >= 25) grade = 7 + ((n - 25) / 25) * 3; // 25 -> 7, 50 -> 10
        else grade = (n / 25) * 7;                          // 0 -> 0, 25 -> 7
        setDatasetGrade(Number(grade.toFixed(1)));
    }, [videos]);

    const [configData, setConfigData] = useState(null);
    const [configFileName, setConfigFileName] = useState('');
    const [configFiles, setConfigFiles] = useState([]);
    const [selectedConfigFile, setSelectedConfigFile] = useState('');
    const handleConfigChange = (updatedConfig) => {
        setConfigData(updatedConfig);
    };

    const loadSelectedConfig = async (configPath) => {
        const selectedConfig = await fetchConfigFile(configPath);
        if (selectedConfig) {
            setConfigData(selectedConfig);
            setConfigFileName(configPath);
            setWarningMessage('');
            return;
        }

        setWarningMessage('Failed to load selected configuration file.');
    };

    const handleConfigSelection = async (event) => {
        const configPath = event.target.value;
        setSelectedConfigFile(configPath);

        if (!configPath) {
            return;
        }

        await loadSelectedConfig(configPath);
    };

    // Save each run's config + checkpoints + logs together under the repo-root
    // train-results/ folder (cwd at runtime is the lac/ submodule, so '../').
    // isSameDirectory=true makes the backend point save_dir/log_dir/loguru_dir there too.
    const [savedDir, setSavedDir] = useState('../train-results');
    const [isSameDirectory, setIsSameDirectory] = useState(true);
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

    // Reset-confirmation flow, triggered when leaving training (header links / logo).
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [pendingDest, setPendingDest] = useState(null);
    const navigate = useNavigate();

    // Publish the current step so the header can decide whether to guard navigation.
    useEffect(() => { window.__vatTrainingStep = currentStep; }, [currentStep]);
    useEffect(() => () => { window.__vatTrainingStep = undefined; }, []);

    useEffect(() => {
        const handler = (e) => {
            setPendingDest((e.detail && e.detail.dest) || null);
            setShowResetConfirm(true);
        };
        window.addEventListener('vat-training-leave', handler);
        return () => window.removeEventListener('vat-training-leave', handler);
    }, []);

    const closeResetConfirm = () => {
        setShowResetConfirm(false);
        setPendingDest(null);
    };

    const confirmReset = () => {
        if (isTrain) stopTrainingSocket();
        setCurrentStep(1);
        setSelectedDataset('');
        setVideos([]);
        setVideoDurations([]);
        setConfigData(null);
        setConfigFileName('');
        setSelectedConfigFile('');
        setConfigFiles([]);
        setIsTrain(false);
        setLogs('');
        setWarningMessage('');
        setUploadedFile(null);
        setDatasetGrade(0);
        setShowResetConfirm(false);
        if (pendingDest && pendingDest !== '/va-api') {
            navigate(pendingDest);
        }
        setPendingDest(null);
    };

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

    // Next button disabled conditions:
    //  Step 1 — no dataset selected, still loading, or the dataset has no videos.
    //  Step 3 — no configuration loaded yet.
    const isDisabled =
        (currentStep === 1 && (!selectedDataset || loading || videos.length === 0)) ||
        (currentStep === 3 && !configData);
    
    return (
        <div className="w-100">
            <div className="row py-5">
                <div className="col-md-12">
                    <h2>VAT: Training</h2>
                </div>
            </div>

            {warningMessage && (
                <div
                    className="alert alert-warning alert-dismissible fade show position-fixed top-0 end-0 m-3"
                    role="alert"
                    style={{ zIndex: 1080, maxWidth: '360px' }}
                >
                    {warningMessage}
                    <button type="button" className="btn-close" aria-label="Close" onClick={handleDismissWarning}></button>
                </div>
            )}

            {showResetConfirm && createPortal(
                <div
                    onClick={closeResetConfirm}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 2000,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', color: '#000', borderRadius: '8px',
                            width: '90%', maxWidth: '440px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', fontWeight: 600, fontSize: '1.1rem' }}>
                            Reset training?
                        </div>
                        <div style={{ padding: '1.25rem' }}>
                            Are you sure you want to reset everything?
                            {isTrain && ' This will stop the running training.'}
                            {' '}Your dataset selection and configuration will be cleared.
                        </div>
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={closeResetConfirm}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={confirmReset}>Yes, reset</button>
                        </div>
                    </div>
                </div>,
                document.body
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

                        <p>There are <strong>two ways</strong> to choose a dataset for training. Use either one.</p>

                        {/* OPTION 1 — pick an existing dataset */}
                        <div className="dataset-option">
                            <div className="dataset-option-head">
                                <span className="dataset-option-badge">Option 1</span>
                                <span className="dataset-option-title">Select an existing dataset</span>
                            </div>
                            <p className="dataset-option-desc">
                                Datasets already placed in the server's <code>datasets/</code> folder appear here.
                            </p>
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

                        <div className="dataset-option-or"><span>OR</span></div>

                        {/* OPTION 2 — upload a new dataset (zip) */}
                        <div className="dataset-option">
                            <div className="dataset-option-head">
                                <span className="dataset-option-badge">Option 2</span>
                                <span className="dataset-option-title">Upload a new dataset (.zip)</span>
                            </div>
                            <p className="dataset-option-desc">
                                Zip your dataset with all the videos inside a single folder, then upload it here.
                            </p>
                            <div className="d-flex justify-content-between align-items-center gap-2">
                                <input
                                    type="file"
                                    id="datasetUpload"
                                    accept=".zip"
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

                        {/* Paper rule: warn when a selected dataset has fewer than 25 videos */}
                        {selectedDataset && !loading && videos.length > 0 && videos.length < 25 && (
                            <div className="alert alert-warning mt-3 mb-0 py-2">
                                ⚠ This dataset has only <strong>{videos.length}</strong> videos. The toolkit
                                recommends <strong>at least 25</strong> for good results — it may be too small.
                            </div>
                        )}
                    </div>

                    {/* STEP2
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
                    */}

                    {/* STEP2 */}
                    <div className={`step ${currentStep === 3 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>2. Configuration</h5>
                        </div>

                        <p>Configure the training settings according to your computer's hardware capabilities. 
                            The default settings are optimized for a single GPU. 
                            If you have multiple or more powerful GPUs, you can increase the number of frames, batch size, epochs, and other relevant parameters.
                        </p>

                        <p>
                        You can resume training after adding more training files or if you want to improve performance from a previous checkpoint by providing the path to the saved model.
                        </p>

                        <div className="vat-card mb-3">
                            <label className="form-label">Choose a Configuration File</label>
                            <select
                                value={selectedConfigFile}
                                onChange={handleConfigSelection}
                                className="form-select"
                            >
                                <option value="">Select a configuration file</option>
                                {configFiles.map((configPath) => (
                                    <option key={configPath} value={configPath}>{configPath}</option>
                                ))}
                            </select>
                        </div>

                        {configData && (
                            <div className="vat-card my-3 config-section">
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

                    {/* STEP3 */}
                    <div className={`step ${currentStep === 4 ? 'visible' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>3. Summary & Training</h5>
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
                            <div className="summary-facts">
                                <div className="summary-fact">
                                    <span className="summary-fact-label">Dataset</span>
                                    <span className="summary-fact-value">{selectedDataset || '—'}</span>
                                </div>
                                <div className="summary-fact">
                                    <span className="summary-fact-label">Number of Videos</span>
                                    <span className="summary-fact-value">{videos.length}</span>
                                </div>
                                <div className="summary-fact">
                                    <span className="summary-fact-label">Config File</span>
                                    <span className="summary-fact-value">{configFileName || '—'}</span>
                                </div>
                            </div>

                            <div className="summary-grade">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="summary-fact-label">Dataset Quality Grade</span>
                                    <span className="summary-grade-number">{datasetGrade} / 10</span>
                                </div>
                                <div className="progress mt-1" style={{ height: '10px' }}>
                                    <div
                                        className={`progress-bar ${datasetGrade >= 7 ? 'bg-success' : datasetGrade >= 4 ? 'bg-warning' : 'bg-danger'}`}
                                        role="progressbar"
                                        style={{ width: `${(datasetGrade / 10) * 100}%` }}
                                        aria-valuenow={datasetGrade}
                                        aria-valuemin="0"
                                        aria-valuemax="10"
                                    />
                                </div>
                                <small className="text-muted">
                                    Based on the number of videos — ~25 is recommended, 50+ is ideal.
                                </small>
                            </div>

                            {configData && (
                                <div className="config-section mt-3">
                                    <h6>Configuration</h6>
                                    <ConfigSummary config={configData} />
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

                <div className="col-md-6">
                    {currentStep <= 3 && (
                        <div className="dataset-files">
                            <div className="dataset-files-header">
                                <strong>Files in dataset</strong>
                                <span className="badge bg-secondary">{videos.length}</span>
                            </div>
                            {videos.length === 0 ? (
                                <p className="dataset-files-empty">
                                    {selectedDataset
                                        ? 'No videos found in this dataset.'
                                        : 'Select a dataset to see its files.'}
                                </p>
                            ) : (
                                <ul className="list-group video-file-list">
                                    {videos.map((video, index) => (
                                        <li
                                            key={index}
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            <span className="video-name" title={video}>
                                                <span className="video-index">{index + 1}.</span> {video}
                                            </span>
                                            <span className="video-duration">
                                                {videoDurations[video]
                                                    ? `${videoDurations[video].toFixed(2)}s`
                                                    : '—'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="w-100" id="logs">
                            <div className="vat-card mb-3">
                                <TrainingProgressBar />
                            </div>
                            <div className="vat-card mb-3">
                                <h6 className="mb-2">Loss</h6>
                                <LossChart />
                            </div>
                            <div className="vat-card">
                                <h6 className="mb-2">Training Logs</h6>
                                <pre className="training-log">{logs || 'Waiting for training to start…'}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export {VA_API};
