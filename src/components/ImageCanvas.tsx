import React, { useRef, useState, useEffect } from 'react';
import { Brush } from '@/types/image';

interface ImageCanvasProps {
  imageUrl: string;
  brush: Brush;
  onMaskGenerated: (maskDataUrl: string) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, brush, onMaskGenerated }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current && maskCanvasRef.current) {
        setCanvasSize({ width: img.width, height: img.height });
        imageRef.current = img;
        setImageLoaded(true);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !maskCtx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    maskCanvas.width = canvasSize.width;
    maskCanvas.height = canvasSize.height;
    
    ctx.drawImage(imageRef.current, 0, 0);
    
    maskCtx.globalAlpha = 1;
    maskCtx.fillStyle = "white";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  }, [canvasSize, imageLoaded]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !maskCanvasRef.current) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    
    ctx.beginPath();
    maskCtx.beginPath();
    
    ctx.moveTo(x, y);
    maskCtx.moveTo(x, y);
    
    ctx.strokeStyle = brush.color;
    ctx.fillStyle = brush.color;
    ctx.lineWidth = brush.size;
    ctx.lineCap = 'round';
    
    maskCtx.globalCompositeOperation = "destination-out";
    maskCtx.strokeStyle = "rgba(0,0,0,1)";
    maskCtx.fillStyle = "rgba(0,0,0,1)";
    maskCtx.lineWidth = brush.size;
    maskCtx.lineCap = 'round';
    
    ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    maskCtx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.beginPath();
    maskCtx.moveTo(x, y);
    
    generateMask();
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !maskCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    maskCtx.lineTo(x, y);
    maskCtx.stroke();
  };
  
  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current || !maskCanvasRef.current) return;
    
    setIsDrawing(false);
    
    const ctx = canvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    ctx.closePath();
    maskCtx.closePath();
    
    generateMask();
  };

  const generateMask = () => {
    if (!maskCanvasRef.current) return;
    
    const maskCanvas = maskCanvasRef.current;
    
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    console.log("Generated mask with transparent areas to be edited");
    
    onMaskGenerated(maskDataUrl);
  };

  const clearMask = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx || !imageRef.current) return;
    
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(imageRef.current, 0, 0);
    
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.globalAlpha = 1;
    maskCtx.fillStyle = "white";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    generateMask();
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative border border-border rounded-md overflow-hidden bg-canvas-background">
        <canvas
          ref={canvasRef}
          className="max-w-full touch-none"
          style={{ 
            maxHeight: '70vh',
            width: canvasSize.width > 0 ? '100%' : '600px',
            height: canvasSize.height > 0 ? 'auto' : '400px',
            background: '#222'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <canvas
          ref={maskCanvasRef}
          className="hidden"
          width={canvasSize.width}
          height={canvasSize.height}
        />
      </div>
      <button 
        className="mt-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm"
        onClick={clearMask}
      >
        Clear Mask
      </button>
    </div>
  );
};

export default ImageCanvas;
