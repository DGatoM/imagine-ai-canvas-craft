
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Brush, Palette, Square, Image as ImageIcon, Upload, Save, Rectangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RabiscoCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"
];

const RabiscoCanvas = ({ isOpen, onClose, onSave }: RabiscoCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "3:4">("1:1");

  // Configurar o canvas quando o componente montar ou o tamanho mudar
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = color;
        context.lineWidth = brushSize;
        setCtx(context);
      }
    }
  }, [canvasSize]);

  // Atualizar a cor e tamanho do pincel quando mudarem
  useEffect(() => {
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  }, [color, brushSize, ctx]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || !ctx || !canvasRef.current) return;
      
      const img = new Image();
      img.onload = () => {
        // Ajustar o tamanho do canvas à imagem mantendo a proporção
        let newWidth = img.width;
        let newHeight = img.height;
        
        // Limitar o tamanho máximo para evitar problemas de desempenho
        const maxDimension = 1024;
        if (newWidth > maxDimension || newHeight > maxDimension) {
          const ratio = newWidth / newHeight;
          if (newWidth > newHeight) {
            newWidth = maxDimension;
            newHeight = newWidth / ratio;
          } else {
            newHeight = maxDimension;
            newWidth = newHeight * ratio;
          }
        }
        
        setCanvasSize({
          width: newWidth,
          height: newHeight
        });
        
        // A imagem será desenhada no useEffect quando o canvas for redimensionado
        setTimeout(() => {
          if (ctx && canvasRef.current) {
            // Limpar primeiro
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            // Desenhar a imagem
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
          }
        }, 0);
      };
      
      img.src = event.target.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  const setAspect = (ratio: "1:1" | "4:3" | "3:4") => {
    setAspectRatio(ratio);
    
    let width = 512;
    let height = 512;
    
    if (ratio === "4:3") {
      width = 640;
      height = 480;
    } else if (ratio === "3:4") {
      width = 480;
      height = 640;
    }
    
    setCanvasSize({ width, height });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ferramenta de Rabisco</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Brush className="h-5 w-5" />
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="brush-size-slider"
              />
              <span>{brushSize}px</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <div className="flex gap-1">
                {COLORS.map(clr => (
                  <button
                    key={clr}
                    className={`w-6 h-6 rounded-full ${color === clr ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: clr, border: clr === '#FFFFFF' ? '1px solid #ccc' : 'none' }}
                    onClick={() => setColor(clr)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAspect("1:1")}
              className={aspectRatio === "1:1" ? "bg-primary text-primary-foreground" : ""}
            >
              <Square className="h-4 w-4 mr-1" />
              Quadrado (1:1)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAspect("4:3")}
              className={aspectRatio === "4:3" ? "bg-primary text-primary-foreground" : ""}
            >
              <Rectangle className="h-4 w-4 mr-1" />
              Paisagem (4:3)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAspect("3:4")}
              className={aspectRatio === "3:4" ? "bg-primary text-primary-foreground" : ""}
            >
              <Rectangle className="h-4 w-4 mr-1 rotate-90" />
              Retrato (3:4)
            </Button>
            
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              Limpar
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="h-4 w-4 mr-1" />
                Carregar Imagem
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </label>
            </Button>
          </div>
          
          <div className="relative border rounded-lg overflow-hidden flex items-center justify-center bg-checkered">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(70vh - 200px)',
                cursor: 'crosshair'
              }}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Salvar Rabisco
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RabiscoCanvas;
