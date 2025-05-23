
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { GeneratedImage } from "@/types/image";
import { ReplicateImageParams, ReplicateApiResult } from "./types";
import { createFallbackImage } from "./utils";

export const generateReplicateImage = async (params: ReplicateImageParams): Promise<ReplicateApiResult> => {
  try {
    // Log that we're using the Make.com webhook
    console.log(`Gerando imagem via Make.com webhook: "${params.prompt}"`);
    
    try {
      // Call the Make.com webhook with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      console.log("Enviando requisição para o webhook do Make.com...");
      
      // Format the aspect ratio correctly for the Make webhook
      const aspectRatio = params.aspect_ratio || "1:1";
      
      const makeResponse = await fetch('https://hook.us2.make.com/jaiwotw6u7hqbabu9u1cj6m3bydobapj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "prompt": params.prompt,
          "aspect-ratio": aspectRatio
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      console.log("Resposta recebida do webhook Make.com:", makeResponse.status);
      
      // Handle HTTP errors
      if (!makeResponse.ok) {
        console.error('Erro na resposta do Make.com webhook:', makeResponse.status);
        throw new Error(`Erro do webhook: ${makeResponse.status} ${makeResponse.statusText}`);
      }
      
      // Parse the response
      let responseData;
      try {
        responseData = await makeResponse.json();
        console.log("Resposta do Make.com webhook:", responseData);
      } catch (parseError) {
        console.error("Falha ao analisar resposta do Make.com:", parseError);
        throw new Error(`Erro ao analisar resposta do webhook: ${parseError instanceof Error ? parseError.message : 'JSON inválido'}`);
      }
      
      // Check if we have an image_url in the response
      if (!responseData.image_url) {
        console.error("URL da imagem não encontrada na resposta:", responseData);
        throw new Error('URL da imagem não encontrada na resposta do webhook');
      }
      
      const imageUrl = responseData.image_url;
      console.log("Imagem gerada via webhook:", imageUrl);
      
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
          size: params.aspect_ratio ? params.aspect_ratio.replace(':', 'x') : "1024x1024",
        }
      };
      
      return generatedImage;
    } catch (fetchError) {
      console.error('Erro na comunicação com Make.com webhook:', fetchError);
      
      // Check if this was an abort error (timeout)
      if (fetchError.name === 'AbortError') {
        toast.error('A requisição para o Make.com atingiu o tempo limite de 15 segundos');
        console.error('Timeout de 15 segundos atingido para a requisição do webhook');
      } else {
        // Show error toast
        toast.error(`Erro ao gerar imagem via webhook: ${fetchError instanceof Error ? fetchError.message : 'Erro de rede'}`);
      }
      
      // Create a fallback image response
      console.error('Usando imagem de fallback devido a problemas de conexão');
      return createFallbackImage(params.prompt);
    }
  } catch (error) {
    console.error('Erro ao gerar imagem via webhook:', error);
    toast.error(`Falha ao gerar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return null;
  }
};
