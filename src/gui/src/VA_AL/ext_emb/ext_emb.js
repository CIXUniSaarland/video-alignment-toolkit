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
    const [folders, setFolders] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState('');
    const [emb_checked, setEmbChecked] = React.useState({});
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
        try {
            fetch('http://localhost:5001/extract_embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    'config': savedDir + '/' + selectedFolder + '/config.json',
                    'directory': savedDir + '/' + selectedFolder
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        console.log('Extracted embeddings:', data);
                    } else {
                        console.error('Failed to extract embeddings:', data.error);
                    }
                })
                .catch(error => console.error('Error fetching embeddings:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function check_embeddings() {
        try {
            fetch('http://localhost:5001/check_embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    'videos': videos,
                    'directory': savedDir + '/' + selectedFolder
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        setEmbChecked(data.embeddings);
                    } else {
                        console.error('Failed to check embeddings:', data.error);
                    }
                })
                .catch(error => console.error('Error fetching embeddings:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function getFolderList() {
        try {
            fetch('http://localhost:5001/list_folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ directory: savedDir })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        setFolders(data.folders_with_config);
                    } else {
                        console.error('Failed to fetch folders:', data.error);
                    }
                })
                .catch(error => console.error('Error fetching folders:', error));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
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
                                    onClick={getFolderList}
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

                    <div className="row w-100 my-3">
                        <div className="col-md-6">
                            <button 
                            className="btn btn-primary flex-grow-1 w-100"
                            onClick={extract_embeddings}
                            disabled={!selectedFolder}
                            data-bs-toggle="tooltip" data-bs-placement="top"
                            title="Extract embeddings from selected folder"
                        >Extract embeddings</button>
                        </div>
                        <div className="col-md-6">
                            <button 
                            className="btn btn-secondary w-100"
                            disabled={!selectedFolder || !selectedDataset}
                            data-bs-toggle="tooltip" data-bs-placement="top"
                            title="Check embeddings for selected videos"
                            onClick={check_embeddings}
                            >Check Embedding</button>
                        </div>
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
                                    <div className="col-md-4 text-end">
                                        {emb_checked[video] ? '✅' : '❌'}
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