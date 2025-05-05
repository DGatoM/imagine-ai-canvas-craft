
import { useState } from 'react';
import ImageCanvas from './ImageCanvas';
import { Brush } from '@/types/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GeneratedImage, ImageEditParams, ImageSize } from '@/types/image';
import { editImage } from '@/services/imageService';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ImageEditorProps {
  image: GeneratedImage;
  onEditComplete: (editedImage: GeneratedImage) => void;
  onCancel: () => void;
}

const ImageEditor = ({ image, onEditComplete, onCancel }: ImageEditorProps) => {
  const [brush, setBrush] = useState<Brush>({
    size: 20,
    color: 'rgba(255, 0, 0, 0.5)' // Semi-transparent red
  });
  
  const [maskDataUrl, setMaskDataUrl] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Fix: Cast the size parameter to ImageSize to ensure type safety
  const [size, setSize] = useState<ImageSize>(
    (image.params.size as ImageSize) || "1024x1024"
  );
  
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "auto">("auto");

  const handleBrushSizeChange = (value: number[]) => {
    setBrush({ ...brush, size: value[0] });
  };

  const handleMaskGenerated = (maskUrl: string) => {
    setMaskDataUrl(maskUrl);
    console.log("Mask generated with length:", maskUrl ? maskUrl.length : "empty");
  };

  const handleSubmitEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error("Please provide an edit prompt");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Starting edit with mask:", maskDataUrl ? "Mask provided" : "No mask");
      
      // Prepare edit parameters
      const editParams: ImageEditParams = {
        prompt: editPrompt,
        image: image.url,
        size,
        quality,
        model: "gpt-image-1", // Explicitly set the model
        ...(maskDataUrl && { mask: maskDataUrl })
      };

      // Call the edit API
      const result = await editImage(editParams);

      if (result) {
        toast.success("Image edited successfully!");
        onEditComplete(result);
      } else {
        throw new Error("Failed to edit image: No result returned");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      toast.error(`Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">Edit Image</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Draw on the image to create a mask for the areas you want to edit.
          </p>
          
          <ImageCanvas 
            imageUrl={image.url} 
            brush={brush} 
            onMaskGenerated={handleMaskGenerated}
          />
        </div>
        
        <div className="w-full sm:w-72 flex flex-col gap-4">
          <div>
            <label htmlFor="brush-size" className="block text-sm font-medium mb-1">
              Brush Size: {brush.size}px
            </label>
            <Slider
              id="brush-size"
              defaultValue={[brush.size]}
              min={1}
              max={100}
              step={1}
              onValueChange={handleBrushSizeChange}
              className="brush-size-slider"
            />
          </div>
          
          <div className="mt-4">
            <label htmlFor="edit-prompt" className="block text-sm font-medium mb-1">
              Edit Prompt
            </label>
            <Textarea
              id="edit-prompt"
              placeholder="Describe what you want to change..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="h-24 font-mono"
            />
          </div>
          
          <div className="mt-4">
            <label htmlFor="size" className="block text-sm font-medium mb-1">
              Output Size
            </label>
            <Select 
              value={size} 
              onValueChange={(value) => setSize(value as ImageSize)}
            >
              <SelectTrigger id="size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024x1024">1024×1024 (Square)</SelectItem>
                <SelectItem value="1024x1536">1024×1536 (Portrait)</SelectItem>
                <SelectItem value="1536x1024">1536×1024 (Landscape)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <label htmlFor="quality" className="block text-sm font-medium mb-1">
              Quality
            </label>
            <Select 
              value={quality} 
              onValueChange={(value) => setQuality(value as "low" | "medium" | "high" | "auto")}
            >
              <SelectTrigger id="quality">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Default)</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEdit} 
              className="flex-1"
              disabled={isProcessing || !editPrompt.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
