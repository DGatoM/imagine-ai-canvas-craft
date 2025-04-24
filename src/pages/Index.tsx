import { useState } from "react";
import { GeneratedImage } from "@/types/image";
import ImageGenerationForm from "@/components/ImageGenerationForm";
import ImageGallery from "@/components/ImageGallery";
import ImageEditor from "@/components/ImageEditor";
import ApiKeyConfig from "@/components/ApiKeyConfig";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image, Brush } from "lucide-react";

const Index = () => {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleImageGenerated = (newImage: GeneratedImage) => {
    setGeneratedImages(prev => [newImage, ...prev]);
  };

  const handleEditImage = (image: GeneratedImage) => {
    setEditingImage(image);
    setIsEditorOpen(true);
  };

  const handleEditComplete = (editedImage: GeneratedImage) => {
    setGeneratedImages(prev => [editedImage, ...prev]);
    setIsEditorOpen(false);
    setEditingImage(null);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Image className="h-8 w-8 mr-2 text-primary" />
              AI Canvas Craft
            </h1>
            <p className="text-muted-foreground mt-1">
              Create, edit, and manage AI-generated images
            </p>
          </div>
          <ApiKeyConfig />
        </div>

        <div className="grid grid-cols-1 gap-8">
          <ImageGenerationForm onImageGenerated={handleImageGenerated} />
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Generated Images</h2>
            <ImageGallery 
              images={generatedImages} 
              onEditImage={handleEditImage} 
            />
          </div>
        </div>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl w-[95%]">
          {editingImage && (
            <ImageEditor 
              image={editingImage}
              onEditComplete={handleEditComplete}
              onCancel={() => setIsEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
