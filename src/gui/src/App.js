import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import "./App.css";
// Components
import { Footer, Page } from "./Page/Page.js";
// Pages
import { VA_AL } from "./VA_AL/VA_AL.js";
import { VA_API } from "./VA_API/VA_API.js";
import { VA_IT } from "./VA_IT/VA_IT.js";
import { ExtractEmbeddings } from "./VA_AL/ext_emb/ext_emb.js";
import { AlignVideos } from "./VA_AL/align_vid/align_vid.js";
import { FrameRetrieval } from "./VA_AL/frame_retr/frame_retr.js";
import { AnomalyDetection } from "./VA_AL/anomaly_det/anomaly_det.js";
import About from "./About/About.js";

function TestPage() {
    return (
        <div>
            <h1>Test Page</h1>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="test" element={<Page PageComponent={TestPage}/>} />
                {/* 1 */}
                <Route path="va-api" element={<Page PageComponent={VA_API} />} />
                {/* 2 */}
                <Route path="va-analysis" element={<Page PageComponent={VA_AL} />} />
                <Route path="va-analysis/ext-emb" element={<Page PageComponent={ExtractEmbeddings}/>} />
                <Route path="va-analysis/align-vid" element={<Page PageComponent={AlignVideos} />} />
                <Route path="va-analysis/frame-retr" element={<Page PageComponent={FrameRetrieval} />} />
                <Route path="va-analysis/anomaly-det" element={<Page PageComponent={AnomalyDetection} />} />
                {/* 3 */}
                <Route path="va-instruction" element={<Page PageComponent={VA_IT} />} />

                <Route path="about" element={<Page PageComponent={About} />} />
            </Routes>
        </Router>
    );
}

function Home() {
    React.useEffect(() => {
        import('bootstrap/dist/js/bootstrap.bundle.min').then(({ Tooltip }) => {
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach((tooltipTriggerEl) => {
                new Tooltip(tooltipTriggerEl);
            });
        });
    }, []);

    return (
        <div className="App">
            <div className="container home">
                <div className="w-100">
                    <div className="row py-5">
                        <div className="col-md-12">
                            <h2>VideoAlign Toolkit Homepage</h2>
                            <p>This toolkit makes video alignment algorithms accessible through two major components: 
                                <br/>1. <b>Training Models</b>, it supports the training of video embeddings by aligning multiple videos of a specific task or action. 
                                <br/>2. <b>Using Models</b>, once a model is trained, the toolkit can align videos, retrieve video frames from a picture, and detect anomalies.
                            </p>
                        </div>
                    </div>

                    <div className="row text-center justify-content-center">
                        <div className="col-6 col-md-4 position-relative">
                            <Link to="/va-api" className="menu-item" title="Start a training session">
                                <i className="bi bi-play-circle-fill"></i>
                                <h3 className="mt-3">Train Model <i className="bi bi-info-circle-fill tooltip-symbol"
                                   data-bs-toggle="tooltip" data-bs-placement="top"></i></h3>
                            </Link>
                        </div>
                        <div className="col-6 col-md-4 position-relative">
                            <Link to="/va-analysis" className="menu-item" title="Analyze Videos">
                                <i className="bi bi-graph-up"></i>
                                <h3 className="mt-3">Use Model <i className="bi bi-info-circle-fill tooltip-symbol"
                                   data-bs-toggle="tooltip" data-bs-placement="top"></i></h3>
                                
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default App;
