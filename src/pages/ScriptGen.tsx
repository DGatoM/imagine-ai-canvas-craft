import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Upload, 
  Image as ImageIcon, 
  Play, 
  FileUp,
  FileAudio,
  Bug,
  Code,
  MessageSquare,
  Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { transcribeAudioWithSupabase, generatePromptsWithSupabase } from "@/services/supabaseServices";
import { 
  generateReplicateImage, 
  ReplicateImageParams, 
} from "@/services/replicate";
import { exportImagesAsVideo, downloadBlob } from "@/services/exportService";
import { createSimpleImageSlideshow } from "@/services/fallbackExportService";

interface PromptSegment {
  id: string;
  prompt: string;
  timestamp: string;
  transcriptionSegment: string; // Novo campo para o trecho da transcrição
  imageUrl: string | null;
  videoUrl: string | null;
  isGenerating?: boolean;
}

interface AudioTranscription {
  id: string;
  text: string;
  words?: Array<{ word: string; start: number; end: number; }>;
  segments?: Array<{ text: string; start: number; end: number; words?: Array<{ word: string; start: number; end: number; }>; speaker?: string; }>;
  metadata?: Record<string, any>;
  language?: string;
}

// Função para dividir a transcrição em segmentos baseado no número de imagens
const divideTranscriptionIntoSegments = (transcription: string, numberOfSegments: number): string[] => {
  if (!transcription || numberOfSegments <= 0) {
    return [];
  }

  // Dividir por palavras para uma distribuição mais equilibrada
  const words = transcription.trim().split(/\s+/);
  const wordsPerSegment = Math.ceil(words.length / numberOfSegments);
  
  const segments: string[] = [];
  
  for (let i = 0; i < numberOfSegments; i++) {
    const startIndex = i * wordsPerSegment;
    const endIndex = Math.min(startIndex + wordsPerSegment, words.length);
    const segmentWords = words.slice(startIndex, endIndex);
    segments.push(segmentWords.join(' '));
  }
  
  return segments;
};

const ScriptGen = () => {
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [webhookUrl, setWebhookUrl] = useState<string>("https://hook.us2.make.com/j08hwdj592a645rj89i0vgmtmi6cw0h2");
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [step, setStep] = useState<'upload' | 'prompts' | 'images' | 'videos'>('upload');
  const [transcription, setTranscription] = useState<AudioTranscription | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  
  // Debug states
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [rawElevenLabsResponse, setRawElevenLabsResponse] = useState<string>("");
  const [openaiPrompt, setOpenaiPrompt] = useState<string>("");
  const [rawOpenAIResponse, setRawOpenAIResponse] = useState<string>("");
  const [debugActiveTab, setDebugActiveTab] = useState<string>("elevenlabs");
  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedAudio(files[0]);
      
      // Extract audio duration from the uploaded file
      const audioElement = new Audio();
      const objectUrl = URL.createObjectURL(files[0]);
      
      audioElement.src = objectUrl;
      audioElement.addEventListener('loadedmetadata', () => {
        const duration = audioElement.duration;
        setAudioDuration(duration);
        console.log("Audio duration extracted from file:", duration, "seconds");
        
        // Clean up object URL after getting metadata
        URL.revokeObjectURL(objectUrl);
      });
      
      audioElement.addEventListener('error', (err) => {
        console.error("Error loading audio metadata:", err);
        toast.error("Não foi possível determinar a duração do arquivo de áudio.");
        URL.revokeObjectURL(objectUrl);
      });
    }
  };

  const handleProcessAudio = async () => {
    if (!uploadedAudio) {
      toast.error("Por favor, carregue um arquivo de áudio");
      return;
    }

    if (audioDuration <= 0) {
      toast.error("Não foi possível determinar a duração do áudio. Tente carregar o arquivo novamente.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Transcribe audio using Supabase function
      const transcriptionResult = await transcribeAudioWithSupabase(
        uploadedAudio,
        {
          tagAudioEvents: true,
          diarize: true,
          languageCode: "pt" // Portuguese language code for Brazilian content
        }
      );
      
      setTranscription(transcriptionResult);
      
      // Save the raw ElevenLabs response for debugging
      setRawElevenLabsResponse(JSON.stringify(transcriptionResult, null, 2));
      
      console.log("Duração total do áudio:", audioDuration, "segundos");
      
      // Generate the default OpenAI prompt
      const systemPrompt = 
        "Você vai receber a transcrição de um vídeo. Sua primeira tarefa é analisar a duração total do áudio (fornecida na solicitação), dividir por 5 para determinar quantos segmentos de 5 segundos são necessários, arredondando o último segmento para cima se necessário. Em seguida, crie um prompt em inglês para cada segmento de 5 segundos que ilustre o que está sendo dito naquele momento específico. Leve em consideração o contexto completo, incluindo o que foi dito antes e o que será dito depois, para que as imagens sejam coerentes entre si. As imagens sempre devem ser realistas, a não ser que o tema de uma determinada imagem possa ficar melhor com uma imagem estilizada.";
      
      const userPrompt = `
      Aqui está a transcrição de um áudio:
      
      Texto completo: ${transcriptionResult.text}
      
      Duração total do áudio: ${audioDuration} segundos
      
      Sua tarefa:
      1. Use a duração total de ${audioDuration} segundos para dividir o áudio
      2. Divida essa duração em segmentos de 5 segundos (crie segmentos de 0:00-0:05, 0:05-0:10, etc.)
      3. Para cada segmento de 5 segundos, crie um prompt em inglês para geração de imagem que represente o que está sendo dito naquele trecho
      4. Retorne apenas um array JSON no formato abaixo (sem explicações adicionais):
      [
        {
          "id": "1",
          "timestamp": "0:00 - 0:05",
          "prompt": "Prompt em inglês para este segmento"
        },
        ...etc para cada segmento de 5 segundos até o final do áudio
      ]
      `;
      
      setOpenaiPrompt(userPrompt);
      
      // If debug mode is active, show the prompt and wait for user to edit it
      if (showDebug) {
        toast.info("Transcrição concluída! Edite o prompt antes de continuar.");
        setIsProcessing(false);
        return;
      }
      
      // Primeiro calcular quantos segmentos precisamos
      const numberOfSegments = Math.ceil(audioDuration / 5);
      
      // Dividir a transcrição em segmentos baseado na duração
      const transcriptionSegments = divideTranscriptionIntoSegments(
        transcriptionResult.text, 
        numberOfSegments
      );

      // Step 2: Generate prompts using Supabase function with transcription segments
      const promptData = await generatePromptsWithSupabase(
        transcriptionResult.text,
        audioDuration,
        undefined, // no custom prompt
        transcriptionSegments
      );
      
      // Save the raw OpenAI response for debugging
      setRawOpenAIResponse(promptData.rawResponse || JSON.stringify(promptData.prompts, null, 2));
      
      // Step 3: Format segments for the UI incluindo os trechos da transcrição
      const formattedSegments: PromptSegment[] = promptData.prompts.map((item: any, index: number) => ({
        id: item.id,
        prompt: item.prompt,
        timestamp: item.timestamp,
        transcriptionSegment: transcriptionSegments[index] || "", // Adicionar o trecho correspondente
        imageUrl: null,
        videoUrl: null
      }));
      
      setSegments(formattedSegments);
      setStep('prompts');
      toast.success("Áudio processado com sucesso!");
    } catch (error) {
      console.error("Erro no processamento do áudio:", error);
      toast.error(`Falha no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessWithCustomPrompt = async () => {
    if (!transcription) {
      toast.error("Transcription não disponível");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Primeiro calcular quantos segmentos precisamos
      const numberOfSegments = Math.ceil(audioDuration / 5);
      
      // Dividir a transcrição em segmentos baseado na duração
      const transcriptionSegments = divideTranscriptionIntoSegments(
        transcription.text, 
        numberOfSegments
      );

      // Use the custom prompt with the Supabase function
      const promptData = await generatePromptsWithSupabase(
        transcription.text,
        audioDuration,
        openaiPrompt,
        transcriptionSegments
      );
      
      setRawOpenAIResponse(promptData.rawResponse || JSON.stringify(promptData.prompts, null, 2));
      
      // Step 3: Format segments for the UI incluindo os trechos da transcrição
      const formattedSegments: PromptSegment[] = promptData.prompts.map((item: any, index: number) => ({
        id: item.id,
        prompt: item.prompt,
        timestamp: item.timestamp,
        transcriptionSegment: transcriptionSegments[index] || "", // Adicionar o trecho correspondente
        imageUrl: null,
        videoUrl: null
      }));
      
      setSegments(formattedSegments);
      setStep('prompts');
      toast.success("Prompts gerados com sucesso!");
      
    } catch (error) {
      console.error("Erro na geração de prompts:", error);
      toast.error(`Falha na geração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptChange = (id: string, value: string) => {
    setSegments(prev => 
      prev.map(segment => segment.id === id ? {...segment, prompt: value} : segment)
    );
  };

  const handleGenerateAllImages = async () => {
    setIsProcessing(true);
    
    try {
      if (segments.length === 0) {
        toast.error("Não há segmentos para gerar imagens");
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each segment in sequence
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // Show generating status for this segment
        setSegments(prev => 
          prev.map(s => s.id === segment.id ? {...s, isGenerating: true} : s)
        );
        
        try {
          const params: ReplicateImageParams = {
            prompt: segment.prompt,
            aspect_ratio: aspectRatio,
            timestamp: segment.timestamp
          };
          
          const result = await generateReplicateImage(params);
          
          if (result) {
            setSegments(prev => 
              prev.map(s => s.id === segment.id ? 
                {...s, imageUrl: result.url, isGenerating: false} : s
              )
            );
            successCount++;
          } else {
            throw new Error("Falha ao gerar imagem");
          }
          
          // Small delay between requests to avoid overwhelming the webhook
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Erro ao gerar imagem para segmento ${segment.id}:`, error);
          
          // Reset generating status
          setSegments(prev => 
            prev.map(s => s.id === segment.id ? {...s, isGenerating: false} : s)
          );
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} imagem(ns) gerada(s) com sucesso!`);
        setStep('images'); // Move to images step
      }
      
      if (errorCount > 0) {
        toast.error(`Falha ao gerar ${errorCount} imagem(ns).`);
      }
      
    } catch (error) {
      console.error("Erro ao gerar imagens:", error);
      toast.error(`Falha ao gerar imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateImage = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    // Mark this segment as generating
    setSegments(prev => 
      prev.map(s => s.id === segmentId ? {...s, isGenerating: true} : s)
    );

    try {
      const params: ReplicateImageParams = {
        prompt: segment.prompt,
        aspect_ratio: aspectRatio,
        timestamp: segment.timestamp
      };
      
      const result = await generateReplicateImage(params);
      
      if (result) {
        // Update the segment with the image URL
        setSegments(prev => 
          prev.map(s => s.id === segmentId ? 
            {...s, imageUrl: result.url, isGenerating: false} : s
          )
        );
        toast.success(`Imagem gerada para o segmento ${segment.timestamp}`);
      } else {
        throw new Error("Falha ao gerar imagem");
      }
    } catch (error) {
      console.error(`Erro ao gerar imagem para segmento ${segmentId}:`, error);
      toast.error(`Falha na geração de imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Reset generating status
      setSegments(prev => 
        prev.map(s => s.id === segmentId ? {...s, isGenerating: false} : s)
      );
    }
  };

  const handleAnimateImages = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSegments(prev => 
        prev.map(segment => ({
          ...segment, 
          videoUrl: segment.imageUrl || "https://assets.mixkit.co/videos/preview/mixkit-cat-playing-with-a-ball-of-wool-4358-large.mp4"
        }))
      );
      setStep('videos');
      toast.success("Imagens animadas com sucesso!");
    }, 2000);
  };

  const handleExportVideo = async () => {
    const segmentsWithImages = segments.filter(segment => segment.imageUrl);
    
    if (segmentsWithImages.length === 0) {
      toast.error("Nenhuma imagem gerada para exportar");
      return;
    }

    if (!webhookUrl) {
      toast.error("Por favor, configure a URL do webhook para exportação");
      return;
    }

    setIsProcessing(true);
    
    try {
      toast.info("Enviando imagens para processamento... Isso pode levar alguns minutos.");
      
      // Prepare the payload with image URLs in order
      const payload = {
        images: segmentsWithImages
          .sort((a, b) => {
            // Sort by timestamp to maintain order
            const aTime = parseFloat(a.timestamp.split(' - ')[0].replace(':', '.'));
            const bTime = parseFloat(b.timestamp.split(' - ')[0].replace(':', '.'));
            return aTime - bTime;
          })
          .map(segment => segment.imageUrl)
      };

      console.log("Enviando payload para webhook:", payload);

      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou erro: ${response.status} ${response.statusText}`);
      }

      // Get the video URL from webhook response
      const videoUrl = await response.text();
      console.log("URL do vídeo recebida:", videoUrl);
      
      if (videoUrl && videoUrl.startsWith('http')) {
        setExportedVideoUrl(videoUrl);
        toast.success("Vídeo processado com sucesso! Clique em 'Download Video' para baixar.");
      } else {
        throw new Error("Webhook não retornou uma URL válida");
      }
      
    } catch (error) {
      console.error("Erro ao exportar vídeo:", error);
      toast.error(`Falha na exportação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!exportedVideoUrl) {
      toast.error("URL do vídeo não disponível");
      return;
    }

    try {
      toast.info("Baixando vídeo...");
      
      // Download video from URL
      const videoResponse = await fetch(exportedVideoUrl);
      if (!videoResponse.ok) {
        throw new Error("Falha ao baixar o vídeo");
      }
      
      const videoBlob = await videoResponse.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `script-video-${timestamp}.mp4`;
      
      // Create download link
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Vídeo baixado com sucesso!");
      
    } catch (error) {
      console.error("Erro ao baixar vídeo:", error);
      toast.error(`Falha no download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Check if we have images to export
  const hasGeneratedImages = segments.some(segment => segment.imageUrl);

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
          <Button 
            variant={showDebug ? "destructive" : "outline"}
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center"
          >
            <Bug className="h-4 w-4 mr-2" />
            {showDebug ? "Desativar Debug" : "Ativar Debug"}
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuração do Vídeo</CardTitle>
            <CardDescription>
              Faça upload de um áudio e escolha o formato do vídeo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Arquivo de Áudio</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="flex-1"
                  />
                </div>
                {uploadedAudio && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Arquivo: {uploadedAudio.name}
                  </p>
                )}
              </div>
              <div>
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
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleProcessAudio} 
                disabled={!uploadedAudio || isProcessing}
                className="flex items-center"
              >
                <FileAudio className="h-4 w-4 mr-2" />
                Processar Áudio
              </Button>
            </div>
          </CardContent>
        </Card>

        {showDebug && transcription && (
          <Card className="mb-8 border border-yellow-500">
            <CardHeader className="bg-yellow-500/10">
              <CardTitle className="text-yellow-500">Debug Mode</CardTitle>
              <CardDescription>
                Visualize e edite as requisições e respostas entre APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs value={debugActiveTab} onValueChange={setDebugActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="elevenlabs">
                    <FileAudio className="h-4 w-4 mr-2" />
                    Eleven Labs
                  </TabsTrigger>
                  <TabsTrigger value="openai-prompt">
                    <Code className="h-4 w-4 mr-2" />
                    Prompt OpenAI
                  </TabsTrigger>
                  <TabsTrigger value="openai-response">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Resposta OpenAI
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="elevenlabs" className="mt-0">
                  <p className="text-sm font-medium mb-2">Resposta bruta do Eleven Labs:</p>
                  <Textarea 
                    readOnly 
                    value={rawElevenLabsResponse} 
                    rows={10}
                    className="font-mono text-xs leading-normal"
                  />
                </TabsContent>
                
                <TabsContent value="openai-prompt" className="mt-0">
                  <p className="text-sm font-medium mb-2">Edite o prompt para a OpenAI:</p>
                  <Textarea 
                    value={openaiPrompt} 
                    onChange={(e) => setOpenaiPrompt(e.target.value)}
                    rows={15}
                    className="font-mono text-xs leading-normal mb-2"
                  />
                  <Button 
                    onClick={handleProcessWithCustomPrompt} 
                    disabled={isProcessing || !openaiPrompt}
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar Prompt Personalizado
                  </Button>
                </TabsContent>
                
                <TabsContent value="openai-response" className="mt-0">
                  <p className="text-sm font-medium mb-2">Resposta bruta da OpenAI:</p>
                  <Textarea 
                    readOnly 
                    value={rawOpenAIResponse} 
                    rows={10}
                    className="font-mono text-xs leading-normal"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

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
                {/* Always show "Gerar Imagens" button */}
                <Button onClick={handleGenerateAllImages}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Gerar Imagens
                </Button>
                {hasGeneratedImages && !exportedVideoUrl && (
                  <Button onClick={handleExportVideo} disabled={isProcessing}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Vídeo
                  </Button>
                )}
                {exportedVideoUrl && (
                  <Button onClick={handleDownloadVideo} className="bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                )}
                {(step === 'images' || step === 'videos') && (
                  <Button onClick={handleAnimateImages}>
                    <Play className="h-4 w-4 mr-2" />
                    Animar
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
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">Prompt</label>
                          <Textarea 
                            value={segment.prompt}
                            onChange={(e) => handlePromptChange(segment.id, e.target.value)}
                            rows={3}
                            className="mb-2"
                          />
                        </div>
                        
                        <div className="w-full">
                          <label className="text-sm font-medium mb-2 block">Imagem</label>
                          <div className="bg-accent aspect-video flex items-center justify-center rounded-md overflow-hidden">
                            {segment.imageUrl ? (
                              <img 
                                src={segment.imageUrl} 
                                alt={`Imagem para ${segment.timestamp}`}
                                className="w-full h-full object-cover" 
                              />
                            ) : segment.isGenerating ? (
                              <div className="flex flex-col items-center justify-center h-full">
                                <div className="h-8 w-8 border-4 border-t-primary rounded-full animate-spin mb-2"></div>
                                <p className="text-xs text-muted-foreground">Gerando...</p>
                              </div>
                            ) : (
                              <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 w-full"
                            onClick={() => handleGenerateImage(segment.id)}
                            disabled={segment.isGenerating}
                          >
                            {segment.imageUrl ? "Regenerar Imagem" : "Gerar Imagem"}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Nova seção para mostrar o trecho da transcrição */}
                      <div className="w-full">
                        <label className="text-sm font-medium mb-2 block">
                          Trecho da Transcrição Original
                        </label>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {segment.transcriptionSegment || "Trecho não disponível"}
                          </p>
                        </div>
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
