
import { useState } from 'react';
import { toast } from "sonner";
import { AudioTranscription, transcribeAudio } from "@/services/elevenLabsService";
import { generatePrompts, PromptGenerationParams } from "@/services/openaiService";
import { generateReplicateImage, ReplicateImageParams } from "@/services/replicate";
import { exportImagesZip, exportImagesAsVideo } from "@/services/exportService";
import { PromptSegment, ScriptGenConfig } from "@/types/scriptGen";
import { GeneratedImage } from '@/types/image';

export const useScriptGeneration = () => {
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [config, setConfig] = useState<ScriptGenConfig>({
    aspectRatio: "16:9",
    elevenLabsApiKey: "",
    openAIApiKey: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [step, setStep] = useState<'upload' | 'prompts' | 'images' | 'videos'>('upload');
  const [transcription, setTranscription] = useState<AudioTranscription | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
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

    if (!config.elevenLabsApiKey) {
      toast.error("Por favor, forneça a chave de API do Eleven Labs");
      return;
    }

    if (!config.openAIApiKey) {
      toast.error("Por favor, forneça a chave de API da OpenAI");
      return;
    }

    if (audioDuration <= 0) {
      toast.error("Não foi possível determinar a duração do áudio. Tente carregar o arquivo novamente.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Transcribe audio
      const transcriptionResult = await transcribeAudio(
        uploadedAudio,
        config.elevenLabsApiKey,
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
      
      // Step 2: Generate prompts from the transcription
      const promptParams: PromptGenerationParams = {
        transcription: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        totalDuration: audioDuration
      };
      
      const generatedPrompts = await generatePrompts(promptParams, config.openAIApiKey);
      
      // Save the raw OpenAI response for debugging
      setRawOpenAIResponse(JSON.stringify(generatedPrompts, null, 2));
      
      // Step 3: Format segments for the UI
      const formattedSegments: PromptSegment[] = generatedPrompts.map(item => ({
        id: item.id,
        prompt: item.prompt,
        timestamp: item.timestamp,
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
    if (!transcription || !config.openAIApiKey) {
      toast.error("Transcription ou API key não disponíveis");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Use the custom prompt directly with the OpenAI service
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openAIApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Você vai receber a transcrição de um vídeo. Sua primeira tarefa é analisar a duração total do áudio (fornecida na solicitação), dividir por 5 para determinar quantos segmentos de 5 segundos são necessários, arredondando o último segmento para cima se necessário. Em seguida, crie um prompt em inglês para cada segmento de 5 segundos que ilustre o que está sendo dito naquele momento específico. Leve em consideração o contexto completo, incluindo o que foi dito antes e o que será dito depois, para que as imagens sejam coerentes entre si. As imagens sempre devem ser realistas, a não ser que o tema de uma determinada imagem possa ficar melhor com uma imagem estilizada."
            },
            {
              role: "user",
              content: openaiPrompt
            }
          ]
        })
      });
      
      if (!openaiResponse.ok) {
        const error = await openaiResponse.json();
        throw new Error(error.error?.message || "Falha ao gerar prompts");
      }
      
      const data = await openaiResponse.json();
      const content = data.choices[0].message.content;
      
      setRawOpenAIResponse(content);
      
      // Try to parse the JSON response
      try {
        // This regex finds anything that looks like a JSON array
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const jsonContent = jsonMatch[0];
          console.log("Extracted JSON content:", jsonContent);
          const generatedPrompts = JSON.parse(jsonContent);
          
          // Step 3: Format segments for the UI
          const formattedSegments: PromptSegment[] = generatedPrompts.map((item: any) => ({
            id: item.id,
            prompt: item.prompt,
            timestamp: item.timestamp,
            imageUrl: null,
            videoUrl: null
          }));
          
          setSegments(formattedSegments);
          setStep('prompts');
          toast.success("Prompts gerados com sucesso!");
        } else {
          throw new Error("Não foi possível extrair JSON da resposta");
        }
      } catch (parseError) {
        console.error("Erro ao analisar resposta JSON:", parseError);
        console.log("Conteúdo recebido:", content);
        toast.error("Erro ao processar resposta da OpenAI");
      }
      
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
            aspect_ratio: config.aspectRatio,
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
        aspect_ratio: config.aspectRatio,
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

  const handleExportImages = async () => {
    setIsProcessing(true);
    try {
      // Filter out segments without images
      const segmentsWithImages = segments.filter(segment => segment.imageUrl);
      
      if (segmentsWithImages.length === 0) {
        toast.error("Não há imagens para exportar");
        return;
      }
      
      await exportImagesZip(
        segmentsWithImages.map(segment => ({
          id: segment.id,
          url: segment.imageUrl!,
          prompt: segment.prompt,
          timestamp: new Date(),
          filename: `imagem-${segment.id}.png`,
          params: {
            prompt: segment.prompt,
            size: "1024x1024"
          }
        }))
      );
      
    } catch (error) {
      console.error("Erro ao exportar imagens:", error);
      toast.error(`Falha ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportVideo = async () => {
    setIsProcessing(true);
    try {
      // Filter out segments without images
      const segmentsWithImages = segments.filter(segment => segment.imageUrl);
      
      if (segmentsWithImages.length === 0) {
        toast.error("Não há imagens para exportar como vídeo");
        return;
      }
      
      await exportImagesAsVideo(
        segmentsWithImages.map(segment => ({
          id: segment.id,
          url: segment.imageUrl!,
          prompt: segment.prompt,
          timestamp: new Date(),
          filename: `imagem-${segment.id}.png`,
          params: {
            prompt: segment.prompt,
            size: "1024x1024"
          }
        })),
        config.aspectRatio
      );
      
    } catch (error) {
      console.error("Erro ao criar vídeo:", error);
      toast.error(`Falha ao criar vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    uploadedAudio,
    config,
    setConfig,
    isProcessing,
    segments,
    step,
    transcription,
    showDebug,
    setShowDebug,
    rawElevenLabsResponse,
    openaiPrompt,
    setOpenaiPrompt,
    rawOpenAIResponse,
    debugActiveTab,
    setDebugActiveTab,
    handleAudioUpload,
    handleProcessAudio,
    handleProcessWithCustomPrompt,
    handlePromptChange,
    handleGenerateAllImages,
    handleGenerateImage,
    handleExportImages,
    handleExportVideo
  };
};
