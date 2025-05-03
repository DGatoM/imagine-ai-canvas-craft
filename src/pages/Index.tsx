
import { useState } from "react";
import { GeneratedImage } from "@/types/image";
import ImageGenerationForm from "@/components/ImageGenerationForm";
import ImageGallery from "@/components/ImageGallery";
import ImageEditor from "@/components/ImageEditor";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
        <div className="grid grid-cols-1 gap-8">
          <ImageGenerationForm onImageGenerated={handleImageGenerated} />
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Imagens Geradas</h2>
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
