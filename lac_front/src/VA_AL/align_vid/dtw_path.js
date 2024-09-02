import React, { useEffect, useRef, useState } from 'react';

const DTWPathVisualizer = ({ costMatrix, dtwPath, setFrame1, setFrame2, cellSize = 4 }) => {
    const canvasRef = useRef(null);
    const [hoveredCell, setHoveredCell] = useState({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        const numRows = costMatrix.length;
        const numCols = costMatrix[0].length;
        
        canvas.width = numCols * cellSize;
        canvas.height = numRows * cellSize;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                const value = costMatrix[i][j];
                const grayScale = Math.floor(value * 255); 
                ctx.fillStyle = `rgb(${grayScale}, ${grayScale}, ${grayScale})`; 
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize); 
            }
        }

        if (!dtwPath || dtwPath.length === 0) {
            return;
        }

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        dtwPath.forEach(([x, y], index) => {
            const posX = y * cellSize + cellSize / 2; 
            const posY = x * cellSize + cellSize / 2;
            if (index === 0) {
                ctx.moveTo(posX, posY);
            } else {
                ctx.lineTo(posX, posY);
            }
        });
        ctx.stroke();

        const handleMouseMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = Math.floor((event.clientX - rect.left) / cellSize);
            const mouseY = Math.floor((event.clientY - rect.top) / cellSize);

            let closestPoint = null;
            let minDistance = Infinity;

            dtwPath.forEach(([pathY, pathX]) => {
                const distance = Math.sqrt((mouseX - pathX) ** 2 + (mouseY - pathY) ** 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = { x: pathX, y: pathY };
                }
            });

            if (closestPoint) {
                setHoveredCell(closestPoint);
                
                setFrame1(closestPoint.y);
                setFrame2(closestPoint.x);
            }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [costMatrix, dtwPath, cellSize]);

    // Draw the dot at the closest point in the DTW path
    useEffect(() => {
        if (hoveredCell.x !== null && hoveredCell.y !== null) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < costMatrix.length; i++) {
                for (let j = 0; j < costMatrix[i].length; j++) {
                    const value = costMatrix[i][j];
                    const grayScale = Math.floor(value * 255);
                    ctx.fillStyle = `rgb(${grayScale}, ${grayScale}, ${grayScale})`;
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                }
            }

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            dtwPath.forEach(([x, y], index) => {
                const posX = y * cellSize + cellSize / 2;
                const posY = x * cellSize + cellSize / 2;
                if (index === 0) {
                    ctx.moveTo(posX, posY);
                } else {
                    ctx.lineTo(posX, posY);
                }
            });
            ctx.stroke();

            // Draw the dot
            const dotX = hoveredCell.x * cellSize + cellSize / 2;
            const dotY = hoveredCell.y * cellSize + cellSize / 2;
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2 * cellSize , 0, 2 * Math.PI);
            ctx.fill();
        }
    }, [hoveredCell, costMatrix, dtwPath, cellSize]);

    return (
        <div>
            <canvas ref={canvasRef} style={{ border: '1px solid black' }} />
            {hoveredCell.x !== null && hoveredCell.y !== null && (
                <div>
                    Snapped to Path: Row {hoveredCell.y}, Column {hoveredCell.x}
                </div>
            )}
        </div>
    );
};

export {DTWPathVisualizer};
