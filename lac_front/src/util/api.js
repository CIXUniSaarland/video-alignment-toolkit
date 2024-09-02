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
}
                

export { 
    fetchDatasets, 
    fetchVideos, 
    fetchVideoDurations,
    saveConfig,
    startEventSource,
    getDefaultConfig,
    startWebSocketConnection,
    stopTrainingSocket
};