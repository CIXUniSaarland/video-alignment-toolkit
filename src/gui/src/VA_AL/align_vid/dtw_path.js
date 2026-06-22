import React, { useEffect, useRef, useState } from 'react';

const PATH_COLOR = '#F78F26';   // theme orange

// v in [0,1]: 0 = similar (dark navy) -> 1 = dissimilar (light), so the orange path pops.
const cellColor = (v) => {
    const t = Math.max(0, Math.min(1, v));
    const c0 = [45, 48, 71];     // #2D3047
    const c1 = [234, 242, 239];  // #EAF2EF
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    return `rgb(${lerp(c0[0], c1[0])}, ${lerp(c0[1], c1[1])}, ${lerp(c0[2], c1[2])})`;
};

const DTWPathVisualizer = ({ costMatrix, dtwPath, setFrame1, setFrame2 }) => {
    const canvasRef = useRef(null);
    const lastSnapRef = useRef({ x: null, y: null });
    const [hoveredCell, setHoveredCell] = useState({ x: null, y: null });

    const numRows = costMatrix.length;
    const numCols = costMatrix[0] ? costMatrix[0].length : 0;
    // Adaptive cell size so the matrix fills ~380px regardless of video length.
    const cellSize = Math.max(2, Math.min(8, Math.floor(380 / Math.max(numRows, numCols, 1))));

    const drawBase = (ctx) => {
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                ctx.fillStyle = cellColor(costMatrix[i][j]);
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            }
        }
        if (!dtwPath || dtwPath.length === 0) return;
        ctx.strokeStyle = PATH_COLOR;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        dtwPath.forEach(([x, y], index) => {
            const posX = y * cellSize + cellSize / 2;
            const posY = x * cellSize + cellSize / 2;
            if (index === 0) ctx.moveTo(posX, posY);
            else ctx.lineTo(posX, posY);
        });
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = numCols * cellSize;
        canvas.height = numRows * cellSize;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBase(ctx);

        const handleMouseMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) / cellSize;
            const mouseY = (event.clientY - rect.top) / cellSize;

            let closestPoint = null;
            let minDistance = Infinity;
            dtwPath.forEach(([pathY, pathX]) => {
                const d = (mouseX - pathX) ** 2 + (mouseY - pathY) ** 2;
                if (d < minDistance) {
                    minDistance = d;
                    closestPoint = { x: pathX, y: pathY };
                }
            });

            // Only update when the snapped path cell changes — avoids flooding the
            // backend with get_frame requests on every pixel of mouse movement.
            if (closestPoint &&
                (closestPoint.x !== lastSnapRef.current.x || closestPoint.y !== lastSnapRef.current.y)) {
                lastSnapRef.current = closestPoint;
                setHoveredCell(closestPoint);
                setFrame1(closestPoint.y);
                setFrame2(closestPoint.x);
            }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        return () => canvas.removeEventListener('mousemove', handleMouseMove);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [costMatrix, dtwPath, cellSize]);

    useEffect(() => {
        if (hoveredCell.x === null || hoveredCell.y === null) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBase(ctx);

        const dotX = hoveredCell.x * cellSize + cellSize / 2;
        const dotY = hoveredCell.y * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, Math.max(4, cellSize * 1.4), 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = PATH_COLOR;
        ctx.stroke();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoveredCell, costMatrix, dtwPath, cellSize]);

    return <canvas ref={canvasRef} className="align-canvas" />;
};

export { DTWPathVisualizer };
