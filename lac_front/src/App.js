import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import "./App.css";
// Components
import { Matrix2 } from "./Algo/Algo.js";
import { Dropdown } from "./Video/Dropdown/Dropdown.js";
import { Footer, Page } from "./Page/Page.js";
// Pages
import { VA_AL } from "./VA_AL/VA_AL.js";
import { VA_API } from "./VA_API/VA_API.js";
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
                            <h2>Video Alignment Toolkit Homepage</h2>
                            <p>The Video Alignment Toolkit integrates video alignment algorithms into applications with three key functions. 
                                <br/>1. <b>Training</b>, it supports the training of video embeddings to achieve accurate alignment across multiple video sources. 
                                <br/>2. <b>Analysis</b>, it offers advanced analysis tools that allow for detailed examination and understanding of videos based on alignment results. 
                                <br/>3. <b>Instruction</b>, it functions as middleware, enabling seamless integration of video data into mixed reality environments. </p>
                        </div>
                    </div>

                    <div className="row text-center">
                        <div className="col-md-4 position-relative">
                            <Link to="/va-api" className="menu-item" title="Start a training session">
                                <i className="bi bi-play-circle-fill"></i>
                                <h3 className="mt-3">Training <i className="bi bi-info-circle-fill tooltip-symbol"
                                   data-bs-toggle="tooltip" data-bs-placement="top"></i></h3>
                            </Link>
                        </div>
                        <div className="col-md-4 position-relative">
                            <Link to="/va-analysis" className="menu-item" title="Analyze Videos">
                                <i className="bi bi-graph-up"></i>
                                <h3 className="mt-3">Analysis <i className="bi bi-info-circle-fill tooltip-symbol"
                                   data-bs-toggle="tooltip" data-bs-placement="top"></i></h3>
                                
                            </Link>
                        </div>
                        <div className="col-md-4 position-relative">
                            <div className="menu-item" title="Instruction to Mixed Reality">
                                <i className="bi bi-book"></i>
                                <h3 className="mt-3">Instruction <i className="bi bi-info-circle-fill tooltip-symbol"
                                   data-bs-toggle="tooltip" data-bs-placement="top"></i></h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

function Home2() {

    const [isVisual, setIsVisual] = React.useState(false);
    const [matrixData, setMatrixData] = React.useState([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ]);

    const [path, setPath] = React.useState([
        [0, 0],
        [1, 1],
        [1, 2],
        [2, 2],
    ]);

    const [videoSrc, setVideoSrc] = React.useState("videos/test3.mp4");
    const [videoSrc1, setVideoSrc1] = React.useState("videos/vid0.mp4");
    const [videoSrc2, setVideoSrc2] = React.useState("videos/vid1.mp4");
    

    React.useEffect(() => {
        fetch(process.env.PUBLIC_URL + "/json/data.json")
            .then((res) => res.json())
            .then((data) => {
                setMatrixData(data["acc_cost_matrix"]);
                setPath(data["path"]);
                console.log(data);
            })
            .catch((err) => {
                console.log(process.env.PUBLIC_URL + "/cost.json");
                console.log("Error fetching tensor data:", err);
            });
    }, []);

    return (
        <div>
            <div className="App">
                {isVisual ?
                (
                <div>
                    <Matrix2 
                    matrixData={matrixData} 
                    path={path}
                    videoSrc={videoSrc}
                    videoSrc1={videoSrc1}
                    videoSrc2={videoSrc2}
                    setIsVisual={setIsVisual}/>
                </div>
                ) : (
                <div>
                    <Dropdown 
                    setVideoSrc={setVideoSrc}
                    setVideoSrc1={setVideoSrc1}
                    setVideoSrc2={setVideoSrc2}
                    setMatrixData={setMatrixData}
                    setPath={setPath}
                    setIsVisual={setIsVisual}/>
                </div>
                ) 
                }
            </div>
        </div>
    );
}

export default App;
