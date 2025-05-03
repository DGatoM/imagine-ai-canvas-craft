
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Upload, 
  Image as ImageIcon, 
  Play, 
  Export 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PromptSegment {
  id: string;
  prompt: string;
  timestamp: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

const ScriptGen = () => {
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [step, setStep] = useState<'upload' | 'prompts' | 'images' | 'videos'>('upload');
  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedAudio(files[0]);
      // Simulate processing audio
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        // Simulate receiving segments from API
        const mockSegments: PromptSegment[] = [
          { 
            id: '1', 
            prompt: "Um gato preto com olhos verdes sentado em uma janela observando a chuva lá fora", 
            timestamp: "0:00 - 0:05", 
            imageUrl: null, 
            videoUrl: null 
          },
          { 
            id: '2', 
            prompt: "O gato preto se espreguiçando lentamente e bocejando, ainda perto da janela", 
            timestamp: "0:05 - 0:10", 
            imageUrl: null, 
            videoUrl: null 
          },
          { 
            id: '3', 
            prompt: "O gato pulando da janela para o sofá próximo com movimento gracioso", 
            timestamp: "0:10 - 0:15", 
            imageUrl: null, 
            videoUrl: null 
          },
          { 
            id: '4', 
            prompt: "O gato se aconchegando em uma almofada no sofá e começando a dormir", 
            timestamp: "0:15 - 0:20", 
            imageUrl: null, 
            videoUrl: null 
          },
        ];
        setSegments(mockSegments);
        setStep('prompts');
      }, 2000);
    }
  };

  const handlePromptChange = (id: string, value: string) => {
    setSegments(prev => 
      prev.map(segment => segment.id === id ? {...segment, prompt: value} : segment)
    );
  };

  const handleGenerateImages = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSegments(prev => 
        prev.map(segment => ({
          ...segment, 
          imageUrl: `https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&h=500&auto=format&fit=crop`
        }))
      );
      setStep('images');
    }, 2000);
  };

  const handleAnimateImages = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSegments(prev => 
        prev.map(segment => ({
          ...segment, 
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cat-playing-with-a-ball-of-wool-4358-large.mp4"
        }))
      );
      setStep('videos');
    }, 2000);
  };

  const handleExportVideo = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      // Download would happen here
      alert("Vídeo exportado com sucesso! (Simulação)");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <LayoutGrid className="h-8 w-8 mr-2 text-primary" />
              Danilo Gato Script Gen
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie vídeos a partir de áudios, gerando imagens e animações
            </p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuração do Vídeo</CardTitle>
            <CardDescription>
              Faça upload de um áudio e escolha o formato do vídeo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Arquivo de Áudio</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="flex-1"
                />
                <Button disabled={!uploadedAudio || isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Processar
                </Button>
              </div>
              {uploadedAudio && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo: {uploadedAudio.name}
                </p>
              )}
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Proporção do Vídeo</label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma proporção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Quadrado (1:1)</SelectItem>
                  <SelectItem value="4:3">Paisagem (4:3)</SelectItem>
                  <SelectItem value="3:4">Retrato (3:4)</SelectItem>
                  <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                  <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isProcessing && (
          <div className="flex justify-center items-center p-12">
            <div className="animate-pulse-gentle text-center">
              <div className="h-8 w-8 mx-auto mb-4 border-4 border-t-primary rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Processando...</p>
            </div>
          </div>
        )}

        {segments.length > 0 && !isProcessing && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Segmentos ({segments.length})
              </h2>
              <div className="flex gap-2">
                {step === 'prompts' && (
                  <Button onClick={handleGenerateImages}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Gerar Imagens
                  </Button>
                )}
                {step === 'images' && (
                  <Button onClick={handleAnimateImages}>
                    <Play className="h-4 w-4 mr-2" />
                    Animar
                  </Button>
                )}
                {step === 'videos' && (
                  <Button onClick={handleExportVideo}>
                    <Export className="h-4 w-4 mr-2" />
                    Exportar Vídeo
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {segments.map(segment => (
                <Card key={segment.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Segmento {segment.timestamp}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Prompt</label>
                        <Textarea 
                          value={segment.prompt}
                          onChange={(e) => handlePromptChange(segment.id, e.target.value)}
                          rows={3}
                          className="mb-2"
                        />
                      </div>
                      
                      <div className="w-full md:w-[300px]">
                        <label className="text-sm font-medium mb-2 block">Imagem</label>
                        <div className="bg-accent aspect-video flex items-center justify-center rounded-md overflow-hidden">
                          {segment.imageUrl ? (
                            <img 
                              src={segment.imageUrl} 
                              alt={`Imagem para ${segment.timestamp}`}
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        {segment.imageUrl && (
                          <Button variant="outline" size="sm" className="mt-2 w-full">
                            Regenerar Imagem
                          </Button>
                        )}
                      </div>
                      
                      {segment.videoUrl && (
                        <div className="w-full md:w-[300px]">
                          <label className="text-sm font-medium mb-2 block">Vídeo</label>
                          <div className="bg-accent aspect-video rounded-md overflow-hidden">
                            <video 
                              src={segment.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button variant="outline" size="sm" className="mt-2 w-full">
                            Reanimar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScriptGen;
