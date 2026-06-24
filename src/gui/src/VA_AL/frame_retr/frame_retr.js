import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Breadcrumbs } from "../VA_AL";
import { VideoPlayerBookmark, VideoPlayerBookmarkCard } from "../../util/video";
import {
    fetchDatasets,
    fetchVideos,
    getVideoSrc,
    getVideosSrc,
    getVideoFrameRate,
    fetchFolderList
} from "../../util/api";
import "./frame_retr.css";
import "../VA_AL.css";
import "../../VA_API/VA_API.css";
import { FullPageSpinner } from "../../Page/Page";

function FrameRetrieval() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Frame Retrieval' }
    ];

    const [currentStep, setCurrentStep] = React.useState(1);
    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

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
    const [video1Frame, setVideo1Frame] = React.useState(0);
    const [video1FrameRate, setVideo1FrameRate] = React.useState(0);

    const [selectedVideos2, setSelectedVideos2] = React.useState([]);
    const [videoSources2, setVideoSources2] = React.useState([]);
    const [frameRates2, setFrameRates2] = React.useState([]);
    const [expandedVideos2, setExpandedVideos2] = React.useState([]);
    const [bookmarks, setBookmarks] = React.useState([]);
    const [videos2Bookmarks, setVideos2Bookmarks] = React.useState([]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [matchError, setMatchError] = React.useState('');

    useEffect(() => {
        fetchDatasets().then(setDatasets);
    }, []);

    useEffect(() => {
        if (!selectedDataset) { setVideos([]); return; }
        fetchVideos(selectedDataset).then(setVideos);
    }, [selectedDataset]);

    const retrieveFrames = async () => {
        setIsLoading(true);
        try {
            await getVideosSrc(selectedVideos2, selectedDataset, setVideoSources2, setFrameRates2)
                .then(() => {
                    setExpandedVideos2(Array(selectedVideos2.length).fill(false));
                    setVideos2Bookmarks(Array(selectedVideos2.length).fill(bookmarks));
                })
                .finally(() => {
                    setIsLoading(false);
                    nextStep();
                });
        } catch (error) {
            console.error("Error fetching video sources:", error);
            setIsLoading(false);
        }
    };

    const toggleExpand = (videoIndex) => {
        const expanded = expandedVideos2[videoIndex];
        if (expanded) {
            const newExpanded = [...expandedVideos2];
            newExpanded[videoIndex] = false;
            setExpandedVideos2(newExpanded);
            return;
        }

        // Fetch the closest-matching frames for this reference video, then expand.
        setIsLoading(true);
        setMatchError('');
        const bframes = bookmarks.map(bookmark => bookmark.frame);
        const refVideo = selectedVideos2[videoIndex];
        fetch(`${process.env.REACT_APP_API_HOST}/frame_retrieval`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dataset: selectedDataset,
                video1: selectedVideos1,
                video2: refVideo,
                frame1: bframes,
                directory: savedDir + '/' + selectedFolder,
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.message !== 'success' || !data.result || !data.result.closest_frames) {
                    throw new Error(data.error || 'Frame retrieval failed (no result).');
                }
                const closest = data.result.closest_frames;
                console.log(`Matches for ${refVideo}:`, closest, 'from query', bframes);
                const newBookmarks = bookmarks.map((bookmark, i) => ({
                    ...bookmark,
                    frame: closest[i],
                }));
                const updatedVideos2Bookmarks = [...videos2Bookmarks];
                updatedVideos2Bookmarks[videoIndex] = newBookmarks;
                setVideos2Bookmarks(updatedVideos2Bookmarks);
                const newExpanded = [...expandedVideos2];
                newExpanded[videoIndex] = true;
                setExpandedVideos2(newExpanded);
            })
            .catch(error => {
                console.error("Error retrieving frames:", error);
                setMatchError(`Could not retrieve frames for ${refVideo}: ${error.message}`);
            })
            .finally(() => setIsLoading(false));
    };

    return (
        <div className="w-100">
            {isLoading && currentStep !== 2 && <FullPageSpinner />}
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <div className="row py-3">
                <div className="col-md-12">
                    <h2>Frame Retrieval</h2>
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
                            Are you sure you want to leave? Your current selection and bookmarks will be lost.
                        </div>
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={cancelLeave}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={confirmLeave}>Leave</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* STEP 1 — model & dataset */}
            {currentStep === 1 && (
                <div className="row">
                    <div className="col-md-6">
                        <div className="vat-card">
                            <h5 className="mb-2">1. Select Model &amp; Dataset</h5>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Find the frames in other videos that match specific moments of a query
                                video. You need a model trained in the <b>Training</b> tab first.
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

            {/* STEP 2 — query video + reference videos */}
            {currentStep === 2 && (
                <>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="vat-card h-100">
                                <h5 className="mb-1">2. Query Video &amp; Bookmarks</h5>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Play the video and click <b>Add Bookmark</b> to mark the moments you want to find in other videos.
                                </p>
                                <select
                                    className="form-select"
                                    value={selectedVideos1}
                                    onChange={async (e) => {
                                        setSelectedVideos1(e.target.value);
                                        if (!e.target.value) return;
                                        const frameRate = await getVideoFrameRate(e.target.value, selectedDataset);
                                        setVideo1FrameRate(frameRate);
                                        getVideoSrc(e.target.value, selectedDataset, setVideoSrc1);
                                    }}
                                >
                                    <option value="">Select a query video</option>
                                    {videos.map((video, index) => (
                                        <option key={index} value={video}>{video}</option>
                                    ))}
                                </select>
                                <div className="mt-3 video-slot">
                                    {selectedVideos1 ? (
                                        <VideoPlayerBookmark
                                            videoSrc={videoSrc1}
                                            setCurrentFrameVideo={setVideo1Frame}
                                            frameRate={video1FrameRate}
                                            bookmarks={bookmarks}
                                            setBookmarks={setBookmarks} />
                                    ) : (
                                        <div className="video-placeholder">Select a query video to preview</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="vat-card h-100">
                                <h5 className="mb-1">Reference Videos</h5>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Select the videos to search for matching frames.
                                </p>
                                <VideoCheckboxes
                                    videos={videos}
                                    selectedVideos={selectedVideos2}
                                    setSelectedVideos={setSelectedVideos2} />
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center mt-3">
                        <button className="btn btn-secondary" onClick={prevStep}>Go Back</button>
                        <div className="ms-auto d-flex align-items-center gap-2">
                            {bookmarks.length === 0 && (
                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Add at least one bookmark first.
                                </span>
                            )}
                            {isLoading && (
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={retrieveFrames}
                                disabled={isLoading || !selectedVideos1 || selectedVideos2.length === 0 || bookmarks.length === 0}
                            >
                                Retrieve Frames
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* STEP 3 — retrieved frames */}
            {currentStep === 3 && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="m-0">3. Retrieved Frames</h5>
                        <button className="btn btn-secondary btn-sm" onClick={prevStep}>Go Back</button>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Each reference video below shows the frame that best matches your bookmarks. Click a
                        card to expand and inspect it.
                    </p>
                    <div className="row g-3">
                        <div className="col-md-5">
                            <div className="vat-card h-100">
                                <h6 className="mb-2">Query Video</h6>
                                {selectedVideos1 && (
                                    <VideoPlayerBookmark
                                        videoSrc={videoSrc1}
                                        setCurrentFrameVideo={setVideo1Frame}
                                        frameRate={video1FrameRate}
                                        bookmarks={bookmarks}
                                        setBookmarks={setBookmarks} />
                                )}
                            </div>
                        </div>
                        <div className="col-md-7">
                            <div className="vat-card">
                                <h6 className="mb-1">Matches</h6>
                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Click a video to load its frames that best match your bookmarks.
                                </p>
                                {matchError && (
                                    <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>
                                        {matchError}
                                    </div>
                                )}
                                {selectedVideos2.map((videoName, index) => (
                                    <div key={index} className="mb-2 video-card">
                                        <div className="card-header" onClick={() => toggleExpand(index)} style={{ cursor: 'pointer' }}>
                                            {videoName}
                                            <i
                                                className={`bi ${expandedVideos2[index] ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`}
                                                style={{ float: 'right' }}
                                            ></i>
                                        </div>
                                        <div className={`card-body ${expandedVideos2[index] ? 'expanded' : 'collapsed'}`}>
                                            {expandedVideos2[index] && (
                                                <MatchResult
                                                    dataset={selectedDataset}
                                                    video={videoName}
                                                    videoSrc={`${process.env.REACT_APP_API_HOST}${videoSources2[index]}`}
                                                    frameRate={frameRates2[index]}
                                                    matched={videos2Bookmarks[index]}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Reference video player (left) + its matched-frame thumbnails (right); clicking a
// thumbnail seeks the player to that frame.
const MatchResult = ({ dataset, video, videoSrc, frameRate, matched }) => {
    const [seek, setSeek] = React.useState({ frame: null, n: 0 });
    return (
        <div className="match-result">
            <div className="match-player">
                <VideoPlayerBookmarkCard
                    videoSrc={videoSrc}
                    frameRate={frameRate}
                    bookmarks={matched}
                    seekFrame={seek}
                    setCurrentFrameVideo={0}
                />
            </div>
            <div className="match-thumbs">
                <RetrievedFrames
                    dataset={dataset}
                    video={video}
                    matched={matched}
                    onFrameClick={(frame) => setSeek((s) => ({ frame, n: s.n + 1 }))}
                />
            </div>
        </div>
    );
};

// Shows the best-matching frame (image) for each bookmark in a reference video.
const RetrievedFrames = ({ dataset, video, matched, onFrameClick }) => {
    const [images, setImages] = React.useState([]);

    React.useEffect(() => {
        let cancelled = false;
        if (!matched || matched.length === 0) { setImages([]); return; }
        Promise.all(matched.map(bm =>
            axios.post(`${process.env.REACT_APP_API_HOST}/get_frame`,
                { dataset, video, frame: bm.frame }, { responseType: 'blob' })
                .then(r => ({ url: URL.createObjectURL(r.data), title: bm.title, frame: bm.frame }))
                .catch(() => null)
        )).then(imgs => { if (!cancelled) setImages(imgs.filter(Boolean)); });
        return () => { cancelled = true; };
    }, [dataset, video, matched]);

    if (!matched || matched.length === 0) {
        return <div className="text-muted px-3 py-2" style={{ fontSize: '0.85rem' }}>No bookmarks to match.</div>;
    }
    return (
        <div className="retrieved-frames">
            {images.map((img, i) => (
                <button
                    key={i}
                    className="retrieved-frame"
                    onClick={() => onFrameClick && onFrameClick(img.frame)}
                    title="Jump to this frame in the video"
                >
                    <img src={img.url} alt={img.title || `match ${i + 1}`} />
                    <div className="retrieved-frame-label">
                        {img.title || `Bookmark ${i + 1}`}
                        <span>frame {img.frame}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};

const VideoCheckboxes = ({ videos, selectedVideos, setSelectedVideos }) => {
    const toggle = (video) => {
        if (selectedVideos.includes(video)) {
            setSelectedVideos(selectedVideos.filter((v) => v !== video));
        } else {
            setSelectedVideos([...selectedVideos, video]);
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center mb-2">
                <button className="btn btn-secondary btn-sm me-2" onClick={() => setSelectedVideos(videos)}>
                    Select All
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVideos([])}>
                    Clear
                </button>
                <span className="ms-auto text-muted" style={{ fontSize: '0.85rem' }}>
                    {selectedVideos.length} selected
                </span>
            </div>
            <div className="ref-video-list">
                {videos.map((video, index) => {
                    const checked = selectedVideos.includes(video);
                    return (
                        <label key={index} className={`ref-video-item ${checked ? 'selected' : ''}`}>
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(video)}
                            />
                            <span className="ref-video-name">{video}</span>
                            {checked && <i className="bi bi-check-circle-fill"></i>}
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export { FrameRetrieval };
