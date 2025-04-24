
import React, { useRef, useState, useEffect } from 'react';
import { Brush } from '@/types/image';

interface ImageCanvasProps {
  imageUrl: string;
  brush: Brush;
  onMaskGenerated: (maskDataUrl: string) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, brush, onMaskGenerated }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        // Set canvas dimensions to match image
        setCanvasSize({ width: img.width, height: img.height });
        imageRef.current = img;
        setImageLoaded(true);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw image and existing mask on canvas when image loads
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Draw the image
    ctx.drawImage(imageRef.current, 0, 0);
  }, [canvasSize, imageLoaded]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    
    // Get current position
    const canvas = canvasRef.current;
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
    
    ctx.moveTo(x, y);
    
    // Configure drawing style
    ctx.strokeStyle = brush.color;
    ctx.fillStyle = brush.color;
    ctx.lineWidth = brush.size;
    ctx.lineCap = 'round';
    
    // Draw a starting dot
    ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Get current position
    const canvas = canvasRef.current;
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
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    
    setIsDrawing(false);
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.closePath();
    
    // Generate and pass the mask data URL
    generateMask();
  };

  const generateMask = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Create a temporary canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!maskCtx) return;
    
    // Get the image data from our canvas (which has both the image and mask)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;
    
    // Create a new image data for the mask
    const maskData = maskCtx.createImageData(canvas.width, canvas.height);
    const maskPixelData = maskData.data;
    
    // Create a reference image data from the original image
    const referenceCanvas = document.createElement('canvas');
    referenceCanvas.width = canvas.width;
    referenceCanvas.height = canvas.height;
    const referenceCtx = referenceCanvas.getContext('2d');
    
    if (!referenceCtx) return;
    
    // Draw the original image to the reference canvas
    referenceCtx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    const referenceData = referenceCtx.getImageData(0, 0, canvas.width, canvas.height);
    const referencePixelData = referenceData.data;
    
    // Compare the current canvas with the reference to identify the mask
    for (let i = 0; i < pixelData.length; i += 4) {
      // If the pixel is different from the original image, it's part of the mask
      if (
        pixelData[i] !== referencePixelData[i] ||
        pixelData[i + 1] !== referencePixelData[i + 1] ||
        pixelData[i + 2] !== referencePixelData[i + 2]
      ) {
        // Set white pixel for the mask
        maskPixelData[i] = 255;
        maskPixelData[i + 1] = 255;
        maskPixelData[i + 2] = 255;
        maskPixelData[i + 3] = 255; // Full opacity
      } else {
        // Set transparent pixel
        maskPixelData[i] = 0;
        maskPixelData[i + 1] = 0;
        maskPixelData[i + 2] = 0;
        maskPixelData[i + 3] = 0; // Fully transparent
      }
    }
    
    // Put the mask data to the mask canvas
    maskCtx.putImageData(maskData, 0, 0);
    
    // Generate data URL from the mask canvas
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    
    // Call the callback with the mask data URL
    onMaskGenerated(maskDataUrl);
  };

  const clearMask = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Redraw the original image
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Generate an empty mask
    onMaskGenerated('');
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
