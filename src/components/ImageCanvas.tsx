
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

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current && maskCanvasRef.current) {
        // Set canvas dimensions to match image
        setCanvasSize({ width: img.width, height: img.height });
        imageRef.current = img;
        setImageLoaded(true);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw image on canvas when image loads
  useEffect(() => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !maskCtx) return;
    
    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Set mask canvas dimensions (same as main canvas)
    maskCanvas.width = canvasSize.width;
    maskCanvas.height = canvasSize.height;
    
    // Draw the image on main canvas
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Clear the mask canvas - should be fully transparent by default
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Initialize with a transparent canvas (all transparent - nothing to edit)
    maskCtx.globalAlpha = 0;
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.globalAlpha = 1;
  }, [canvasSize, imageLoaded]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !maskCanvasRef.current) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    // Get current position
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    
    if ('touches' in e) {
      // Touch event
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      // Mouse event
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    
    // Begin paths for both canvases
    ctx.beginPath();
    maskCtx.beginPath();
    
    ctx.moveTo(x, y);
    maskCtx.moveTo(x, y);
    
    // Configure drawing style for main canvas (visual indicator)
    ctx.strokeStyle = brush.color;
    ctx.fillStyle = brush.color;
    ctx.lineWidth = brush.size;
    ctx.lineCap = 'round';
    
    // Configure drawing style for mask canvas - WHITE for areas to be edited
    maskCtx.strokeStyle = 'white';
    maskCtx.fillStyle = 'white';
    maskCtx.lineWidth = brush.size;
    maskCtx.lineCap = 'round';
    
    // Draw starting dots
    ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    maskCtx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.beginPath();
    maskCtx.moveTo(x, y);
    
    // Generate mask after each draw action
    generateMask();
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !maskCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    // Get current position
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    
    if ('touches' in e) {
      // Touch event
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      // Mouse event
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    
    // Draw lines on both canvases
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
    
    // Generate and pass the mask data URL
    generateMask();
  };

  const generateMask = () => {
    if (!maskCanvasRef.current) return;
    
    const maskCanvas = maskCanvasRef.current;
    
    // Generate data URL from the mask canvas directly
    // This will provide a PNG with transparent background and white painted areas
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    console.log("Generated mask with white areas to be edited");
    
    // Call the callback with the mask data URL
    onMaskGenerated(maskDataUrl);
  };

  const clearMask = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx || !imageRef.current) return;
    
    // Redraw the original image on main canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Clear the mask canvas
    maskCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Generate an empty mask
    onMaskGenerated('');
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative border border-border rounded-md overflow-hidden bg-canvas-background">
        {/* Main canvas where user draws and sees the image */}
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
        
        {/* Hidden mask canvas used for generating the mask */}
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
