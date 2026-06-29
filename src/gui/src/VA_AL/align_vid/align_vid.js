import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../VA_AL";
import { VideoPlayer } from "../../util/video";
import { getVideoFrameRate } from "../../util/api";
import { DTWPathVisualizer } from "./dtw_path";
import axios from "axios";
import "../VA_AL.css";
import "../../VA_API/VA_API.css";

const API = process.env.REACT_APP_API_HOST;

function AlignVideos() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Align Videos' }
    ];

    const [currentStep, setCurrentStep] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    // Confirm before leaving once the user is past step 1 (header / breadcrumb links).
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
    const [videoFrame1, setVideoFrame1] = React.useState(0);
    const [frame1, setFrame1] = React.useState(null);
    const [frameRate1, setFrameRate1] = React.useState(30);
    const [selectedVideos2, setSelectedVideos2] = React.useState('');
    const [videoSrc2, setVideoSrc2] = React.useState('');
    const [videoFrame2, setVideoFrame2] = React.useState(0);
    const [frame2, setFrame2] = React.useState(null);
    const [frameRate2, setFrameRate2] = React.useState(30);

    const selectVideo = (video, setSelected, setSrc, setRate) => {
        setSelected(video);
        if (!video) return;
        getVideoSrc(video, setSrc);
        getVideoFrameRate(video, selectedDataset).then(fps => { if (fps) setRate(fps); });
    };

    const [costMatrix, setCostMatrix] = React.useState([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    const [path, setPath] = React.useState([[0, 0], [1, 1], [1, 2], [2, 2]]);

    // Fetch the dataset list once.
    React.useEffect(() => {
        fetch(`${API}/list_datasets`)
            .then(r => r.json())
            .then(data => {
                if (data.message === 'success') setDatasets(data.datasets);
                else console.error('Failed to fetch datasets:', data.error);
            })
            .catch(e => console.error('Error fetching datasets:', e));
    }, []);

    // Fetch the hovered frames, debounced so dragging across the matrix doesn't
    // queue a request per pixel. Old blob URLs are revoked to avoid leaks.
    React.useEffect(() => {
        if (videoFrame1 === 0 && videoFrame2 === 0) return;
        const timer = setTimeout(() => {
            if (videoFrame1 !== 0 && selectedVideos1) {
                axios.post(`${API}/get_frame`,
                    { video: selectedVideos1, frame: videoFrame1, dataset: selectedDataset },
                    { responseType: 'blob' })
                    .then(res => {
                        const url = URL.createObjectURL(res.data);
                        setFrame1(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                    })
                    .catch(e => console.error('Error fetching frame:', e));
            }
            if (videoFrame2 !== 0 && selectedVideos2) {
                axios.post(`${API}/get_frame`,
                    { video: selectedVideos2, frame: videoFrame2, dataset: selectedDataset },
                    { responseType: 'blob' })
                    .then(res => {
                        const url = URL.createObjectURL(res.data);
                        setFrame2(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
                    })
                    .catch(e => console.error('Error fetching frame:', e));
            }
        }, 100);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoFrame1, videoFrame2]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!selectedDataset) { setVideos([]); return; }
            try {
                const res = await fetch(`${API}/list_videos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dataset: selectedDataset })
                });
                const data = await res.json();
                if (data.message === 'success') setVideos(data.videos);
                else console.error('Failed to fetch videos:', data.error);
            } catch (e) {
                console.error('Error fetching data:', e);
            }
        };
        fetchData();
    }, [selectedDataset]);

    function getFolderList() {
        fetch(`${API}/list_folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory: savedDir })
        })
            .then(r => r.json())
            .then(data => {
                if (data.message === 'success') setFolders(data.folders_with_config);
                else console.error('Failed to fetch folders:', data.error);
            })
            .catch(e => console.error('Error fetching folders:', e));
    }

    function getVideoSrc(video, setVideoSrc) {
        fetch(`${API}/get_video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video, dataset: selectedDataset })
        })
            .then(r => r.blob())
            .then(blob => setVideoSrc(URL.createObjectURL(blob)))
            .catch(e => console.error('Error fetching video:', e));
    }

    function alignVid() {
        setLoading(true);
        fetch(`${API}/align_videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video1: selectedVideos1,
                video2: selectedVideos2,
                dataset: selectedDataset,
                directory: savedDir + '/' + selectedFolder
            })
        })
            .then(r => r.json())
            .then(data => {
                if (data.message === 'success') {
                    setCostMatrix(data.result.acc_cost_mat);
                    setPath(data.result.path);
                    nextStep();
                } else {
                    console.error('Failed to align videos:', data.error);
                }
                setLoading(false);
            })
            .catch(e => {
                console.error('Error aligning videos:', e);
                setLoading(false);
            });
    }

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <div className="row py-3">
                <div className="col-md-12">
                    <h2>Align Videos</h2>
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
                            Are you sure you want to leave? Your current alignment selection will be lost.
                        </div>
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={cancelLeave}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={confirmLeave}>Leave</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* STEP 3 — full-width alignment result */}
            {/* STEP 3 — alignment result */}
            {currentStep === 3 && (
                <div className="vat-card mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="m-0">3. Alignment Result</h5>
                        <button className="btn btn-secondary btn-sm" onClick={prevStep}>Go Back</button>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        The matrix shows the frame-to-frame distance between the two videos; the orange line is
                        the optimal alignment path. Hover over it to preview the matched frames.
                    </p>
                    <div className="align-result">
                        <div className="align-matrix">
                            <div className="align-matrix-row">
                                <div className="align-axis-y">Reference frame</div>
                                <DTWPathVisualizer
                                    costMatrix={costMatrix}
                                    dtwPath={path}
                                    setFrame1={setVideoFrame1}
                                    setFrame2={setVideoFrame2}
                                />
                            </div>
                            <div className="align-axis-x">Query frame</div>
                        </div>
                        <div className="align-frames">
                            <div className="align-frame-card">
                                <div className="align-frame-label">Reference · frame {videoFrame1}</div>
                                {frame1 ? (
                                    <img src={frame1} alt="Reference frame" className="align-frame" />
                                ) : (
                                    <div className="align-frame-placeholder">Hover the matrix to preview</div>
                                )}
                            </div>
                            <div className="align-frame-card">
                                <div className="align-frame-label">Query · frame {videoFrame2}</div>
                                {frame2 ? (
                                    <img src={frame2} alt="Query frame" className="align-frame" />
                                ) : (
                                    <div className="align-frame-placeholder">Hover the matrix to preview</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 1 — model & dataset */}
            {currentStep === 1 && (
                <div className="row">
                    <div className="col-md-6">
                        <div className="vat-card">
                            <h5 className="mb-2">1. Select Model &amp; Dataset</h5>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Align two videos frame-by-frame using a trained encoder. You need a
                                model trained in the <b>Training</b> tab first.
                            </p>
                            <ol className="text-muted ps-3 mb-3" style={{ fontSize: '0.9rem' }}>
                                <li>Pick the <b>dataset</b> that contains the videos you want to align.</li>
                                <li>Set the <b>working directory</b> where your trained models are saved (default <code>../train-results</code>).</li>
                                <li>Click <b>Load models</b> and choose a trained run.</li>
                            </ol>

                            <div className="mb-3">
                                <label className="form-label">Dataset</label>
                                <select
                                    className="form-select"
                                    value={selectedDataset}
                                    onChange={e => setSelectedDataset(e.target.value)}
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
                                    onChange={e => setSavedDir(e.target.value)}
                                    className="form-control"
                                />
                                <button className="btn btn-secondary btn-sm mt-2" onClick={getFolderList}>
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

            {/* STEP 2 — pick the two videos */}
            {currentStep === 2 && (
                <>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="vat-card h-100">
                                <h5 className="mb-1">2. Reference Video</h5>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>The video to align against.</p>
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
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>The video to compare against the reference.</p>
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
                                onClick={alignVid}
                                disabled={loading || !selectedVideos1 || !selectedVideos2}
                            >
                                Align Videos
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export { AlignVideos };
