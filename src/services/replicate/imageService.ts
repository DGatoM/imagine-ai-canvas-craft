
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { GeneratedImage } from "@/types/image";
import { ReplicateImageParams, ReplicateApiResult } from "./types";
import { getReplicateApiToken, FLUX_MODEL } from "./config";
import { fetchWithRetry, isProxyAvailable, createFallbackImage } from "./utils";

export const generateReplicateImage = async (params: ReplicateImageParams): Promise<ReplicateApiResult> => {
  try {
    const token = getReplicateApiToken();
    if (!token) {
      toast.error("Replicate API token não encontrado. Por favor, configure-o nas configurações.");
      return null;
    }

    console.log(`Gerando imagem via Flux: "${params.prompt}"`);
    
    // First check if the proxy is available
    const proxyAvailable = await isProxyAvailable();
    if (!proxyAvailable) {
      toast.error("O proxy da API Replicate não está funcionando. Verifique se o servidor proxy está em execução e configurado corretamente.");
      console.error("API proxy is not available. Using fallback image.");
      
      // Provide fallback image immediately
      return createFallbackImage(params.prompt);
    }
    
    try {
      // Convert aspect_ratio to width and height for Flux model
      let width = 1024;
      let height = 1024;
      
      if (params.aspect_ratio) {
        const [w, h] = params.aspect_ratio.split(':').map(Number);
        if (w > h) {
          height = Math.floor((height * h) / w);
        } else if (h > w) {
          width = Math.floor((width * w) / h);
        }
      }

      // Step 1: Use our proxy to create the prediction
      const createResponse = await fetchWithRetry('/api/replicateProxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: FLUX_MODEL,
          input: {
            prompt: params.prompt,
            width,
            height,
            negative_prompt: params.negative_prompt || "",
            guidance_scale: params.guidance_scale || 7.5,
            seed: params.seed || Math.floor(Math.random() * 1000000),
            num_outputs: params.num_outputs || 1
          }
        })
      }, 2); // Reduced retry count for initial request
      
      // Validate and parse the response
      let createData;
      try {
        createData = await createResponse.json();
      } catch (parseError) {
        console.error("Failed to parse proxy response:", parseError);
        throw new Error(`Erro ao analisar a resposta do proxy: ${parseError instanceof Error ? parseError.message : 'JSON inválido'}`);
      }
      
      console.log("Prediction iniciada:", createData);
      
      if (!createData.id) {
        throw new Error('ID de previsão não encontrada na resposta da API');
      }
      
      // Step 2: Poll for the result
      let imageUrl = null;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!imageUrl && attempts < maxAttempts) {
        attempts++;
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await fetchWithRetry(`/api/replicateProxyStatus?predictionId=${createData.id}`, {
            method: 'GET',
          }, 2);
          
          // Validate and parse the status response
          let statusData;
          try {
            statusData = await statusResponse.json();
          } catch (parseError) {
            console.error("Failed to parse status response:", parseError);
            throw new Error(`Erro ao analisar a resposta de status: ${parseError instanceof Error ? parseError.message : 'JSON inválido'}`);
          }
          
          console.log(`Verificação ${attempts}:`, statusData.status);
          
          if (statusData.status === 'succeeded') {
            if (statusData.output && statusData.output.length > 0) {
              imageUrl = statusData.output[0];
              console.log("Imagem gerada:", imageUrl);
            } else {
              throw new Error('Imagem gerada, mas URL não encontrada');
            }
          } else if (statusData.status === 'failed') {
            throw new Error(`Falha na geração: ${statusData.error || 'Erro desconhecido'}`);
          }
          
          // If still processing, continue polling
        } catch (pollingError) {
          console.error("Erro na verificação de status:", pollingError);
          // Continue to next attempt even if there's an error
          continue;
        }
      }
      
      if (!imageUrl) {
        throw new Error('Timeout ao aguardar geração da imagem');
      }
      
      // Create the GeneratedImage object
      const filename = `flux-${new Date().getTime()}.webp`;
      
      const generatedImage: GeneratedImage = {
        id: uuidv4(),
        url: imageUrl,
        prompt: params.prompt,
        timestamp: new Date(),
        filename: filename,
        params: {
          prompt: params.prompt,
          size: `${width}x${height}`,
        }
      };
      
      return generatedImage;
    } catch (fetchError) {
      console.error('Erro na comunicação com Replicate API:', fetchError);
      
      // Proxy connection error handling
      if (fetchError instanceof Error) {
        console.log("Erro ao conectar com o proxy da API Replicate, fornecendo imagem de fallback");
        
        // Create a fallback image response
        return createFallbackImage(params.prompt);
      }
      
      toast.error(`Problema de conexão com o proxy da API do Replicate: ${fetchError instanceof Error ? fetchError.message : 'Erro de rede'}`);
      return null;
    }
  } catch (error) {
    console.error('Erro ao gerar imagem com Flux:', error);
    toast.error(`Falha ao gerar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return null;
  }
};
