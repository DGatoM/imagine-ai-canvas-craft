
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ImageGenerationParams, ImageSize } from "@/types/image";
import { generateImage } from "@/services/imageService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ImageGenerationFormProps {
  onImageGenerated: (result: any) => void;
}

export const ImageGenerationForm = ({ onImageGenerated }: ImageGenerationFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [style, setStyle] = useState<"natural" | "vivid">("natural");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt to generate an image");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const params: ImageGenerationParams = {
        prompt,
        size,
        quality,
        style,
      };
      
      const result = await generateImage(params);
      
      if (result) {
        toast.success("Image generated successfully!");
        onImageGenerated(result);
        // Don't clear form so user can make variations
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate AI Image</CardTitle>
        <CardDescription>
          Create images with AI using natural language prompts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium">
              Prompt
            </label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-24 font-mono"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="size" className="text-sm font-medium">
                Size
              </label>
              <Select 
                value={size} 
                onValueChange={(value) => setSize(value as ImageSize)}
                disabled={isGenerating}
              >
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024×1024 (Square)</SelectItem>
                  <SelectItem value="1024x1792">1024×1792 (Portrait)</SelectItem>
                  <SelectItem value="1792x1024">1792×1024 (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="quality" className="text-sm font-medium">
                Quality
              </label>
              <Select 
                value={quality} 
                onValueChange={(value) => setQuality(value as "standard" | "hd")}
                disabled={isGenerating}
              >
                <SelectTrigger id="quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="style" className="text-sm font-medium">
                Style
              </label>
              <Select 
                value={style} 
                onValueChange={(value) => setStyle(value as "natural" | "vivid")}
                disabled={isGenerating}
              >
                <SelectTrigger id="style">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="vivid">Vivid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Image"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ImageGenerationForm;
