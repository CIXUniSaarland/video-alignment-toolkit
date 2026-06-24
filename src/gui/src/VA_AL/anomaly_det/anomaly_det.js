import React, { useEffect } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../VA_AL";
import {
    fetchDatasets,
    fetchVideos,
    fetchFolderList,
    getVideoSrc,
    getVideoFrameRate
} from "../../util/api";
import { VideoPlayer } from "../../util/video";
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import "../VA_AL.css";
import "../../VA_API/VA_API.css";
Chart.register(...registerables);

function AnomalyDetection() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Anomaly Detection' }
    ];

    const [currentStep, setCurrentStep] = React.useState(1);
    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

    // Confirm before leaving once past step 1 (header / breadcrumb links).
    const navigate = useNavigate();
    const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
    const [pendingDest, setPendingDest] = React.useState(null);
    React.useEffect(() => { window.__vatGuardActive = currentStep > 1; }, [currentStep]);
    React.useEffect(() => () => { window.__vatGuardActive = false; }, []);
    React.useEffect(() => {
        const handler = (e) => {
            setPendingDest((e.detail && e.detail.dest) || null);
            setShowLeaveConfirm(true);
        };
        window.addEventListener('vat-confirm-leave', handler);
        return () => window.removeEventListener('vat-confirm-leave', handler);
    }, []);
    const confirmLeave = () => {
        const dest = pendingDest;
        setShowLeaveConfirm(false);
        setPendingDest(null);
        window.__vatGuardActive = false;
        if (dest) navigate(dest);
    };
    const cancelLeave = () => {
        setShowLeaveConfirm(false);
        setPendingDest(null);
    };

    const [datasets, setDatasets] = React.useState([]);
    const [videos, setVideos] = React.useState([]);
    const [savedDir, setSavedDir] = React.useState('../train-results');
    const [selectedDataset, setSelectedDataset] = React.useState('');
    const [folders, setFolders] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState('');

    const [selectedVideos1, setSelectedVideos1] = React.useState('');
    const [videoSrc1, setVideoSrc1] = React.useState('');
    const [frameRate1, setFrameRate1] = React.useState(30);
    const [selectedVideos2, setSelectedVideos2] = React.useState('');
    const [videoSrc2, setVideoSrc2] = React.useState('');
    const [frameRate2, setFrameRate2] = React.useState(30);

    const [distances, setDistances] = React.useState([]);
    const [threshold, setThreshold] = React.useState(0);
    const [anomalousFrames, setAnomalousFrames] = React.useState([]);
    const [path, setPath] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [detectError, setDetectError] = React.useState('');

    const selectVideo = (video, setSelected, setSrc, setRate) => {
        setSelected(video);
        if (!video) return;
        getVideoSrc(video, selectedDataset, setSrc);
        getVideoFrameRate(video, selectedDataset).then(fps => { if (fps) setRate(fps); });
    };

    useEffect(() => { fetchDatasets().then(setDatasets); }, []);
    useEffect(() => {
        if (!selectedDataset) { setVideos([]); return; }
        fetchVideos(selectedDataset).then(setVideos);
    }, [selectedDataset]);

    function detectAnomaly() {
        setLoading(true);
        setDetectError('');
        fetch(`${process.env.REACT_APP_API_HOST}/detect_anomaly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dataset: selectedDataset,
                video1: selectedVideos1,
                video2: selectedVideos2,
                directory: savedDir + '/' + selectedFolder
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.message !== 'success' || !data.result) {
                    throw new Error(data.error || 'Anomaly detection failed.');
                }
                setDistances(data.result.distances);
                setThreshold(data.result.threshold);
                setAnomalousFrames(data.result.anomalous_frames);
                setPath(data.result.path || []);
                nextStep();
            })
            .catch(error => {
                console.error('Error detecting anomaly:', error);
                setDetectError(error.message);
            })
            .finally(() => setLoading(false));
    }

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <div className="row py-3">
                <div className="col-md-12">
                    <h2>Anomaly Detection</h2>
                </div>
            </div>

            {showLeaveConfirm && createPortal(
                <div
                    onClick={cancelLeave}
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
                            Leave this page?
                        </div>
                        <div style={{ padding: '1.25rem' }}>
                            Are you sure you want to leave? Your current selection and result will be lost.
                        </div>
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={cancelLeave}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={confirmLeave}>Leave</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* STEP 3 — result */}
            {currentStep === 3 && (
                <div className="vat-card mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="m-0">3. Anomaly Result</h5>
                        <button className="btn btn-secondary btn-sm" onClick={prevStep}>Go Back</button>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Distance between the two videos at each aligned frame. The red dashed line is the
                        anomaly threshold; points above it (in red) are flagged as anomalies.
                    </p>
                    <div className="d-flex gap-4 mb-3">
                        <div className="summary-fact">
                            <span className="summary-fact-label">Anomalous frames</span>
                            <span className="summary-fact-value">{anomalousFrames.length}</span>
                        </div>
                        <div className="summary-fact">
                            <span className="summary-fact-label">Threshold</span>
                            <span className="summary-fact-value">{Number(threshold).toFixed(3)}</span>
                        </div>
                        <div className="summary-fact">
                            <span className="summary-fact-label">Aligned frames</span>
                            <span className="summary-fact-value">{distances.length}</span>
                        </div>
                    </div>
                    <AnomalyResult
                        dataset={selectedDataset}
                        video1={selectedVideos1}
                        video2={selectedVideos2}
                        distances={distances}
                        threshold={threshold}
                        anomalousFrames={anomalousFrames}
                        path={path}
                    />
                </div>
            )}

            {/* STEP 1 — model & dataset */}
            {currentStep === 1 && (
                <div className="row">
                    <div className="col-md-6">
                        <div className="vat-card">
                            <h5 className="mb-2">1. Select Model &amp; Dataset</h5>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Compare a video against a correct reference and flag frames that deviate. You
                                need a model trained in the <b>Training</b> tab first.
                            </p>
                            <ol className="text-muted ps-3 mb-3" style={{ fontSize: '0.9rem' }}>
                                <li>Pick the <b>dataset</b> that contains your videos.</li>
                                <li>Set the <b>working directory</b> where your trained models are saved (default <code>../train-results</code>).</li>
                                <li>Click <b>Load models</b> and choose a trained run.</li>
                            </ol>

                            <div className="mb-3">
                                <label className="form-label">Dataset</label>
                                <select
                                    className="form-select"
                                    value={selectedDataset}
                                    onChange={(e) => setSelectedDataset(e.target.value)}
                                >
                                    <option value="">Select a dataset</option>
                                    {datasets.map((dataset, index) => (
                                        <option key={index} value={dataset}>{dataset}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Working Directory</label>
                                <input
                                    type="text"
                                    value={savedDir}
                                    onChange={(e) => setSavedDir(e.target.value)}
                                    className="form-control"
                                />
                                <button
                                    className="btn btn-secondary btn-sm mt-2"
                                    onClick={async () => setFolders(await fetchFolderList(savedDir))}
                                >
                                    Load models
                                </button>
                            </div>

                            <div>
                                <label className="form-label">Model (trained run)</label>
                                <select
                                    value={selectedFolder}
                                    onChange={e => setSelectedFolder(e.target.value)}
                                    disabled={folders.length === 0}
                                    className="form-select"
                                    title="Select a trained model folder"
                                >
                                    <option value="">Select a model folder</option>
                                    {folders.map((folder, index) => (
                                        <option key={index} value={folder}>{folder}</option>
                                    ))}
                                </select>
                                {folders.length === 0 && (
                                    <small className="text-muted">
                                        Click “Load models” to list trained runs in the working directory.
                                    </small>
                                )}
                            </div>
                        </div>

                        {(!selectedDataset || !selectedFolder) && (
                            <div className="alert alert-warning d-flex align-items-center py-2 mt-3 mb-0" style={{ fontSize: '0.88rem' }}>
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                Please select {[!selectedDataset && 'a dataset', !selectedFolder && 'a trained model'].filter(Boolean).join(' and ')} before continuing.
                            </div>
                        )}
                        <div className="d-flex justify-content-end mt-3">
                            <button
                                className="btn btn-primary"
                                disabled={!selectedDataset || !selectedFolder}
                                title="Select a dataset and model to proceed"
                                onClick={nextStep}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="dataset-files">
                            <div className="dataset-files-header">
                                <strong>Files in dataset</strong>
                                <span className="badge bg-secondary">{videos.length}</span>
                            </div>
                            {videos.length === 0 ? (
                                <p className="dataset-files-empty">
                                    {selectedDataset ? 'No videos found in this dataset.' : 'Select a dataset to see its files.'}
                                </p>
                            ) : (
                                <ul className="list-group video-file-list">
                                    {videos.map((video, index) => (
                                        <li key={index} className="list-group-item">
                                            <span className="video-name" title={video}>
                                                <span className="video-index">{index + 1}.</span> {video}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2 — reference & query videos */}
            {currentStep === 2 && (
                <>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="vat-card h-100">
                                <h5 className="mb-1">2. Reference Video</h5>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>A correct execution to compare against.</p>
                                <select
                                    value={selectedVideos1}
                                    onChange={e => selectVideo(e.target.value, setSelectedVideos1, setVideoSrc1, setFrameRate1)}
                                    className="form-select"
                                >
                                    <option value="">Select reference video</option>
                                    {videos.map((video, index) => (
                                        <option key={index} value={video}>{video}</option>
                                    ))}
                                </select>
                                <div className="mt-3 video-slot">
                                    {selectedVideos1 ? (
                                        <VideoPlayer videoSrc={videoSrc1} frameRate={frameRate1} />
                                    ) : (
                                        <div className="video-placeholder">Select a reference video to preview</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="vat-card h-100">
                                <h5 className="mb-1">Query Video</h5>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>The video to check for anomalies.</p>
                                <select
                                    value={selectedVideos2}
                                    onChange={e => selectVideo(e.target.value, setSelectedVideos2, setVideoSrc2, setFrameRate2)}
                                    className="form-select"
                                >
                                    <option value="">Select query video</option>
                                    {videos.map((video, index) => (
                                        <option key={index} value={video}>{video}</option>
                                    ))}
                                </select>
                                <div className="mt-3 video-slot">
                                    {selectedVideos2 ? (
                                        <VideoPlayer videoSrc={videoSrc2} frameRate={frameRate2} />
                                    ) : (
                                        <div className="video-placeholder">Select a query video to preview</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {detectError && (
                        <div className="alert alert-danger py-2 mt-3" style={{ fontSize: '0.85rem' }}>{detectError}</div>
                    )}

                    <div className="d-flex align-items-center mt-3">
                        <button className="btn btn-secondary" onClick={prevStep}>Go Back</button>
                        <div className="ms-auto d-flex align-items-center gap-2">
                            {loading && (
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={detectAnomaly}
                                disabled={loading || !selectedVideos1 || !selectedVideos2}
                            >
                                Detect Anomaly
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Plot + frame preview: hovering/dragging over the plot shows the reference and
// query frames for that aligned position (like the Align Videos matrix).
const AnomalyResult = ({ dataset, video1, video2, distances, threshold, anomalousFrames, path }) => {
    const [hoverIdx, setHoverIdx] = React.useState(null);
    const [refFrame, setRefFrame] = React.useState(null);
    const [queryFrame, setQueryFrame] = React.useState(null);
    const lastIdxRef = React.useRef(null);

    const onHoverIndex = (idx) => {
        if (idx !== lastIdxRef.current) {
            lastIdxRef.current = idx;
            setHoverIdx(idx);
        }
    };

    // Debounced fetch of both frames when the hovered aligned index changes.
    React.useEffect(() => {
        if (hoverIdx == null || !path || !path[hoverIdx]) return;
        const [rf, qf] = path[hoverIdx];
        const timer = setTimeout(() => {
            axios.post(`${process.env.REACT_APP_API_HOST}/get_frame`,
                { dataset, video: video1, frame: rf }, { responseType: 'blob' })
                .then(r => {
                    const url = URL.createObjectURL(r.data);
                    setRefFrame(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url, frame: rf }; });
                }).catch(() => {});
            axios.post(`${process.env.REACT_APP_API_HOST}/get_frame`,
                { dataset, video: video2, frame: qf }, { responseType: 'blob' })
                .then(r => {
                    const url = URL.createObjectURL(r.data);
                    setQueryFrame(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url, frame: qf }; });
                }).catch(() => {});
        }, 80);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoverIdx]);

    return (
        <>
            <AnomalousDistancePlot
                data={distances}
                threshold={threshold}
                anomalousFrames={anomalousFrames}
                onHoverIndex={onHoverIndex}
            />
            <div className="row mt-3">
                <div className="col-md-6 text-center">
                    <div className="align-frame-label">Reference{refFrame ? ` · frame ${refFrame.frame}` : ''}</div>
                    {refFrame
                        ? <img src={refFrame.url} alt="reference frame" className="align-frame" />
                        : <div className="align-frame-placeholder">Hover the plot to preview</div>}
                </div>
                <div className="col-md-6 text-center">
                    <div className="align-frame-label">Query{queryFrame ? ` · frame ${queryFrame.frame}` : ''}</div>
                    {queryFrame
                        ? <img src={queryFrame.url} alt="query frame" className="align-frame" />
                        : <div className="align-frame-placeholder">Hover the plot to preview</div>}
                </div>
            </div>
        </>
    );
};

const AnomalousDistancePlot = ({ data, threshold, anomalousFrames, onHoverIndex }) => {
    const labels = data.map((_, index) => index);
    const anomalySet = new Set(anomalousFrames);
    const pointColors = data.map((_, i) => (anomalySet.has(i) ? '#dc3545' : 'rgba(75,192,192,1)'));

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Aligned distance',
                data,
                borderColor: 'rgba(75,192,192,0.5)',
                backgroundColor: pointColors,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors,
                pointRadius: data.map((_, i) => (anomalySet.has(i) ? 5 : 3)),
                tension: 0.2,
            },
            {
                label: 'Threshold',
                data: new Array(data.length).fill(threshold),
                borderColor: '#dc3545',
                borderDash: [6, 6],
                pointRadius: 0,
            }
        ]
    };

    const options = {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        onHover: (event, elements) => {
            if (onHoverIndex && elements && elements.length > 0) {
                onHoverIndex(elements[0].index);
            }
        },
        plugins: {
            legend: { display: true },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            x: { title: { display: true, text: 'Aligned frame index' } },
            y: { title: { display: true, text: 'Distance' }, beginAtZero: true },
        },
    };

    return <Line data={chartData} options={options} />;
};

export { AnomalyDetection };
