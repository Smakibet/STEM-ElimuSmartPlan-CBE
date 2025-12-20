import React, { useRef, useState, useEffect } from 'react';
import { DrawingTool } from '../../types';

type ExtendedDrawingTool = DrawingTool | 'RECT' | 'CIRCLE' | 'TEXT';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<ExtendedDrawingTool>(DrawingTool.PEN);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory();
      }
    }
  }, []);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Remove future history if we were in middle of stack
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

    // Limit history size for memory
    if (newHistory.length > 20) newHistory.shift();

    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      restoreHistory(newStep);
      setHistoryStep(newStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      restoreHistory(newStep);
      setHistoryStep(newStep);
    }
  };

  const restoreHistory = (step: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(history[step], 0, 0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'TEXT') {
      const text = prompt("Enter text:");
      if (text) {
        ctx.font = `${lineWidth * 10}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        saveHistory();
      }
      return;
    }

    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === DrawingTool.ERASER ? '#ffffff' : color;
    ctx.lineWidth = tool === DrawingTool.ERASER ? 20 : lineWidth;

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === DrawingTool.PEN || tool === DrawingTool.ERASER) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'RECT' || tool === 'CIRCLE') {
      // Restore the snapshot to avoid trailing shapes
      if (snapshot) ctx.putImageData(snapshot, 0, 0);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (tool === 'RECT') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'CIRCLE') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-4 rounded-xl shadow-inner relative">
      <div className="absolute top-6 left-6 flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-md z-10 border border-slate-200 max-w-[90%]">
        <button onClick={() => setTool(DrawingTool.PEN)} className={`p-2 rounded ${tool === DrawingTool.PEN ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600'}`} title="Pen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
        <button onClick={() => setTool(DrawingTool.ERASER)} className={`p-2 rounded ${tool === DrawingTool.ERASER ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600'}`} title="Eraser">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1"></div>

        <button onClick={() => setTool('RECT')} className={`p-2 rounded ${tool === 'RECT' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600'}`} title="Rectangle">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3z" /></svg>
        </button>
        <button onClick={() => setTool('CIRCLE')} className={`p-2 rounded ${tool === 'CIRCLE' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600'}`} title="Circle">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => setTool('TEXT')} className={`p-2 rounded ${tool === 'TEXT' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-600'}`} title="Text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1"></div>

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-9 cursor-pointer" title="Color" />
        <select value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="bg-slate-50 border-none text-sm text-slate-600 focus:ring-0 rounded">
          <option value={2}>Thin</option>
          <option value={4}>Medium</option>
          <option value={8}>Thick</option>
        </select>

        <div className="w-px h-8 bg-slate-200 mx-1"></div>

        <button onClick={undo} disabled={historyStep <= 0} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded" title="Undo">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>
        <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded" title="Redo">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1"></div>

        <button onClick={downloadCanvas} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded" title="Download Image">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
        <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Clear All">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full touch-none"
        />
      </div>

      <div className="mt-2 text-center text-xs text-slate-400">
        STEM ElimuSmartPlan Interactive Board
      </div>
    </div>
  );
};

export default Whiteboard;