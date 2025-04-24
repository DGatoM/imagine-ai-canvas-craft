
import { useState } from "react";
import { GeneratedImage } from "@/types/image";
import { 
  Card, 
  CardContent, 
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadImage } from "@/lib/utils";
import { toast } from "sonner";
import { Edit, Download, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageGalleryProps {
  images: GeneratedImage[];
  onEditImage: (image: GeneratedImage) => void;
}

const ImageGallery = ({ images, onEditImage }: ImageGalleryProps) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleDownload = (image: GeneratedImage) => {
    try {
      fetch(image.url)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          downloadImage(url, image.filename);
          window.URL.revokeObjectURL(url);
          toast.success(`Image saved as ${image.filename}`);
        });
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  if (images.length === 0) {
    return (
      <Card className="w-full bg-secondary/30 border border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">No images generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate your first image by entering a prompt above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image) => (
        <Card key={image.id} className="overflow-hidden flex flex-col">
          <div 
            className="relative cursor-pointer h-64 overflow-hidden bg-black"
            onClick={() => setExpandedImage(expandedImage === image.id ? null : image.id)}
          >
            <img
              src={image.url}
              alt={image.prompt}
              className={`w-full h-full object-contain transition-transform duration-300 ${
                expandedImage === image.id ? 'scale-110' : 'scale-100'
              }`}
            />
          </div>
          <CardContent className="pt-4 pb-2">
            <p className="text-sm font-medium line-clamp-2" title={image.prompt}>
              {image.prompt}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(image.timestamp).toLocaleString()}
            </p>
          </CardContent>
          <CardFooter className="pt-2 pb-4 flex justify-between gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onEditImage(image)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit this image with a mask</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(image)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download this image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default ImageGallery;
