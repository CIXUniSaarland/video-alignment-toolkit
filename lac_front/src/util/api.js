import React from "react";
import io from 'socket.io-client';

const fetchDatasets = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/list_datasets`);
        const data = await response.json();
        if (data.message === 'success') {
            return data.datasets;
        } else {
            console.error('Failed to fetch datasets:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching datasets:', error);
        return [];
    }
};

const fetchVideos = async (dataset) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/list_videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset })
        });
        const data = await response.json();
        if (data.message === 'success') {
            return data.videos;
        } else {
            console.error('Failed to fetch videos:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
};

const fetchVideoDurations = async (dataset, videos) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_video_durations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset, videos })
        });
        const data = await response.json();
        if (data.message === 'success') {
            console.log(data);
            return data.durations;
        } else {
            console.error('Failed to fetch video durations:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching video durations:', error);
        return [];
    }
};

const saveConfig = async (selectedDataset, savedDir, configData, isSameDirectory) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/save_config`, {
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
        });

        const saveConfigData = await response.json();

        if (saveConfigData.message !== 'success') {
            throw new Error('Failed to save config: ' + saveConfigData.error);
        }

        console.log('Config saved:', saveConfigData);
        return saveConfigData.config_path;
    } catch (error) {
        console.error('Error saving config:', error);
        throw error;
    }
};

const startEventSource = (configPath, setLogs, setIsTrain) => {
    const url = new URL(`${process.env.REACT_APP_API_HOST}/train_sse`);
    url.searchParams.append('config', configPath);

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
        setLogs((prevLogs) => prevLogs + event.data);
    };

    eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        setIsTrain(false);
    };

    return () => eventSource.close();
};

const startWebSocketConnection = (config, setLogs, setIsTrain) => {
    const socket = io(process.env.REACT_APP_API_HOST);

    socket.on('training_progress', (data) => {
        if (data.data) {
            setLogs((prevLogs) => prevLogs + '\n' + data.data);
        }

        if (data.match) {
            
        }

        if (data.error) {
            setIsTrain(false);
        }
    });

    fetch(`${process.env.REACT_APP_API_HOST}/train`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
    })
    .then((response) => response.json())
    .then((data) => {
        console.log(data.message);
        if (data.error) {
            setIsTrain(false);
            socket.disconnect(); // Disconnect socket if there's an error
        } else {
            setIsTrain(true);
        }
    })
    .catch((error) => {
        console.error('Failed to start training:', error);
        setIsTrain(false);
        socket.disconnect(); // Disconnect socket if there's an error
    });

    return () => socket.disconnect(); // Cleanup on unmount
};

const stopTrainingSocket = () => {
    fetch(`${process.env.REACT_APP_API_HOST}/stop_training`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then((response) => response.json())
    .then((data) => {
        console.log(data.message);
    })
    .catch((error) => {
        console.error('Failed to stop training:', error);
    });
}

const getDefaultConfig = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_default_config`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (data.message === 'success') {
            return data.config;
        } else {
            console.error('Failed to fetch default config:', data.error);
            return {};
        }
    } catch (error) {
        console.error('Error fetching default config:', error);
        return {};
    }
};

const fetchConfigFiles = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/list_config_files`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (data.message === 'success') {
            return data.configs || [];
        }

        console.error('Failed to fetch config files:', data.error);
        return [];
    } catch (error) {
        console.error('Error fetching config files:', error);
        return [];
    }
};

const fetchConfigFile = async (configPath) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_config_file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config_path: configPath }),
        });

        const data = await response.json();
        if (data.message === 'success') {
            return data.config;
        }

        console.error('Failed to fetch config file:', data.error);
        return null;
    } catch (error) {
        console.error('Error fetching config file:', error);
        return null;
    }
};

const getVideoSrc = (video, selectedDataset, setVideoSrc) => {
    try {
        fetch(`${process.env.REACT_APP_API_HOST}/get_video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video: video,
                dataset: selectedDataset
             })
        })
        .then((response) => response.blob())
        .then((blob) => {
            setVideoSrc(URL.createObjectURL(blob));
        })
        .catch((error) => {
            console.error('Failed to fetch video:', error);
        });
    } catch (error) {
        console.error('Error fetching video:', error);
    }
};

const getVideosSrc =  async(videos, selectedDataset, setVideoSources, setFrameRates) => {
    try {
        console.log(videos, selectedDataset);
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videos: videos,
                dataset: selectedDataset
             })
        });

        const data = await response.json();
        console.log(data);
        if (data.message === 'success') {
            const frameRateURLs = [];
            for (let i = 0; i < data.video_urls.length; i++) {
                frameRateURLs.push(data.video_urls[i].replace('/get_video', '/get_video_framerate'));
            }
            const frameRates = [];
            await Promise.all(frameRateURLs.map(async (url) => {
                const response2 = await fetch(`${process.env.REACT_APP_API_HOST}${url}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data2 = await response2.json();
                frameRates.push(data2.frame_rate);
            }))
            .then(() => {
                setVideoSources(data.video_urls);
                setFrameRates(frameRates);
            });
        } else {
            console.error('Failed to fetch videos:', data.error);
        }

    } catch (error) {
        console.error('Error fetching videos:', error);
    } finally {
    }
}

const getVideoFrameRate = async (video, selectedDataset) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/get_video_framerate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video: video,
                dataset: selectedDataset
             })
        });

        const data = await response.json();
        if (data.message === 'success') {
            return data.frame_rate;
        } else {
            console.error('Failed to fetch video frame rate:', data.error);
            return 0;
        }
    } catch (error) {
        console.error('Error fetching video frame rate:', error);
        return 0;
    }
};

const fetchFolderList = async (dir) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_HOST}/list_folders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                directory: dir
            })
        });

        const data = await response.json();

        if (data.message === 'success') {
            return data.folders_with_config;
        } else {
            console.error('Failed to fetch folders:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
    }
};


export { 
    fetchDatasets, 
    fetchVideos, 
    fetchVideoDurations,
    saveConfig,
    startEventSource,
    getDefaultConfig,
    startWebSocketConnection,
    stopTrainingSocket,
    getVideoSrc,
    getVideosSrc,
    getVideoFrameRate,
    fetchFolderList,
    fetchConfigFiles,
    fetchConfigFile
};