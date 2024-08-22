import React from "react";
import { Breadcrumbs } from "../VA_AL";
import  "./ext_emb.css";

function ExtractEmbeddings() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Extract Embeddings' }  // Current page, no link
    ];

    const [datasets, setDatasets] = React.useState([]);
    const [videos, setVideos] = React.useState([]);
    const [savedDir, setSavedDir] = React.useState('./train-results');
    const [selectedDataset, setSelectedDataset] = React.useState('');
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

    function extract_embeddings() {

    }

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2 className="mb-3">VAT Analysis: Extract Embeddings</h2>
            <div className="row">
                <div className="col-md-6">
                    <div className="row">
                        <div className="col-md-4">
                            <label>Select Dataset</label>
                        </div>
                        <div className="col-md-8">
                            <select
                                value={selectedDataset}
                                onChange={e => {
                                    setSelectedDataset(e.target.value);
                                }}
                                className="form-select"
                            >
                                <option value="">Select dataset</option>
                                {datasets.map((dataset, index) => (
                                    <option key={index} value={dataset}>{dataset}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col-md-4">
                            <label>Working & Saved Directory</label>
                        </div>
                        <div className="col-md-8">
                            <input 
                                type="text" 
                                value={savedDir} 
                                onChange={(e) => setSavedDir(e.target.value)}
                                className="form-control"
                            />
                        </div>
                    </div>

                    <div className="d-flex justify-content-between my-3">
                        <button 
                            className="btn btn-primary flex-grow-1"
                            onClick={extract_embeddings}
                        >Extract embeddings</button>
                    </div>

                </div>

                <div className="col-md-6 video-list">
                    <div className="row w-100">
                        {videos.map((video, index) => (
                            <li key={index} className="list-group-item">
                                <div className="row">
                                    <div className="col-md-8">
                                        {video}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { ExtractEmbeddings };