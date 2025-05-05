
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { ImageGenerationParams, ImageSize, ImageEditParams } from "@/types/image";
import { generateImage, editImage } from "@/services/imageService";
import { toast } from "sonner";
import { Loader2, Upload, Brush, Image as ImageIcon } from "lucide-react";
import RabiscoCanvas from "./RabiscoCanvas";

interface ImageGenerationFormProps {
  onImageGenerated: (result: any) => void;
}

export const ImageGenerationForm = ({ onImageGenerated }: ImageGenerationFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "auto">("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [rabiscoOpen, setRabiscoOpen] = useState(false);
  
  // Add new field for negative prompt for Flux model
  const [negativePrompt, setNegativePrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Por favor, insira uma instrução para gerar a imagem");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let result;
      
      if (uploadedImage) {
        // Se temos uma imagem, usamos a API de edição
        const params: ImageEditParams = {
          prompt,
          size,
          image: uploadedImage,
        };
        
        result = await editImage(params);
      } else {
        // Caso contrário, geramos uma nova imagem
        const params: ImageGenerationParams = {
          prompt,
          size,
          quality,
          // Add the negative prompt if available
          ...(negativePrompt.trim() && { negativePrompt: negativePrompt })
        };
        
        result = await generateImage(params);
      }
      
      if (result) {
        toast.success("Imagem gerada com sucesso!");
        onImageGenerated(result);
        // Não limpamos o formulário para que o usuário possa fazer variações
        
        // Limpar a imagem carregada após a geração
        setUploadedImage(null);
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast.error("Falha ao gerar imagem. Por favor, tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setUploadedImage(event.target.result);
        toast.success("Imagem carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRabiscoSave = (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    toast.success("Rabisco salvo e anexado ao prompt!");
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    toast("Imagem removida");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerar Imagem com IA</CardTitle>
        <CardDescription>
          Crie imagens com Inteligência Artificial usando Flux - um modelo rápido para desenvolvimento local
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt" className="text-sm font-medium">
                Instrução
              </label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRabiscoOpen(true)}
                >
                  <Brush className="mr-2 h-4 w-4" />
                  Rabisco
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <label>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload de Imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageUpload}
                    />
                  </label>
                </Button>
              </div>
            </div>
            <Textarea
              id="prompt"
              placeholder="Descreva a imagem que deseja gerar..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-24 font-mono"
              disabled={isGenerating}
            />
          </div>
          
          {/* Add negative prompt field for Flux model */}
          <div className="space-y-2">
            <label htmlFor="negative-prompt" className="text-sm font-medium">
              Instrução Negativa (o que não incluir na imagem)
            </label>
            <Textarea
              id="negative-prompt"
              placeholder="Elementos que você não quer na imagem..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="min-h-16 font-mono"
              disabled={isGenerating}
            />
          </div>

          {uploadedImage && (
            <div className="border rounded-md p-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Imagem anexada</span>
                <Button 
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={removeUploadedImage}
                >
                  Remover
                </Button>
              </div>
              <div className="aspect-square w-24 h-24 relative">
                <img 
                  src={uploadedImage} 
                  alt="Imagem carregada" 
                  className="object-cover rounded-md w-full h-full"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="size" className="text-sm font-medium">
                Tamanho
              </label>
              <Select 
                value={size} 
                onValueChange={(value) => setSize(value as ImageSize)}
                disabled={isGenerating}
              >
                <SelectTrigger id="size">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024×1024 (Quadrado)</SelectItem>
                  <SelectItem value="1024x1536">1024×1536 (Retrato)</SelectItem>
                  <SelectItem value="1536x1024">1536×1024 (Paisagem)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="quality" className="text-sm font-medium">
                Qualidade
              </label>
              <Select 
                value={quality} 
                onValueChange={(value) => setQuality(value as "low" | "medium" | "high" | "auto")}
                disabled={isGenerating}
              >
                <SelectTrigger id="quality">
                  <SelectValue placeholder="Selecione a qualidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Padrão)</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
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
                Gerando...
              </>
            ) : (
              "Gerar Imagem"
            )}
          </Button>
        </form>
      </CardContent>

      <RabiscoCanvas 
        isOpen={rabiscoOpen}
        onClose={() => setRabiscoOpen(false)}
        onSave={handleRabiscoSave}
      />
    </Card>
  );
};

export default ImageGenerationForm;
