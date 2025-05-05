
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { GeneratedImage } from "@/types/image";

// Store the API token in memory and localStorage
let API_TOKEN: string | null = null;

// Using a function to get the token, which can later be modified to use environment variables
// or another secure method without changing the rest of the code
const getReplicateApiToken = () => {
  if (API_TOKEN) {
    return API_TOKEN;
  }
  
  // In a production environment, this should come from environment variables
  // For now, we'll store it in localStorage for frontend-only applications
  const savedToken = localStorage.getItem('REPLICATE_API_TOKEN');
  if (savedToken) {
    return savedToken;
  }
  
  // Default fallback - this is not ideal but better than hardcoding in the source
  return '';
};

// Flux model identifier
const FLUX_MODEL = "black-forest-labs/flux-schnell";

export interface ReplicateImageParams {
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
  timestamp?: string;
  negative_prompt?: string;
  guidance_scale?: number;
  seed?: number;
}

// Function to make a fetch request with retries
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a small delay between retries, increasing with each attempt
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
    }
  }
  
  // If we've exhausted all retries
  throw lastError;
};

// Mock function to provide fallback images when API fails
const getMockImageForPrompt = (prompt: string): string => {
  // Generate a consistent but "random-looking" number from the prompt string
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash to select a placeholder image from a set of stock images
  const placeholders = [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1024',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1024',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1024',
    'https://images.unsplash.com/photo-1573496130407-57329f01f769?q=80&w=1024',
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1024',
  ];
  
  const index = Math.abs(hash) % placeholders.length;
  return placeholders[index];
};

export const generateReplicateImage = async (params: ReplicateImageParams): Promise<GeneratedImage | null> => {
  try {
    const token = getReplicateApiToken();
    if (!token) {
      toast.error("Replicate API token não encontrado. Por favor, configure-o nas configurações.");
      return null;
    }

    console.log(`Gerando imagem via Flux: "${params.prompt}"`);
    
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
      const createResponse = await fetch('/api/replicateProxy', {
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
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`API error: ${errorData.error || createResponse.statusText}`);
      }

      const createData = await createResponse.json();
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
          const statusResponse = await fetch(`/api/replicateProxyStatus?predictionId=${createData.id}`);
          
          if (!statusResponse.ok) {
            throw new Error(`Error fetching status: ${statusResponse.statusText}`);
          }
          
          const statusData = await statusResponse.json();
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
        const mockImageUrl = getMockImageForPrompt(params.prompt);
        const filename = `fallback-${new Date().getTime()}.jpg`;
        
        toast.warning(
          "Usando imagem de fallback devido a problemas de conexão. Verifique se o proxy está funcionando corretamente.",
          { duration: 6000 }
        );
        
        // Return a mock image as fallback
        const fallbackImage: GeneratedImage = {
          id: uuidv4(),
          url: mockImageUrl,
          prompt: params.prompt,
          timestamp: new Date(),
          filename: filename,
          params: {
            prompt: params.prompt,
            size: "1024x1024",
          },
          isFallback: true // Mark this as a fallback image
        };
        
        return fallbackImage;
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

// Add a function to save the token
export const saveReplicateApiToken = (token: string) => {
  API_TOKEN = token;
  localStorage.setItem('REPLICATE_API_TOKEN', token);
  toast.success("Token da Replicate salvo com sucesso!");
  return true;
};

// Add a function to check if the proxy is working
export const checkReplicateApiConnection = async (): Promise<boolean> => {
  try {
    // Test request to check if the proxy is working
    const response = await fetch('/api/replicateProxyStatus?predictionId=test', {
      method: 'GET',
    });
    
    // Even if we get a 400 error for invalid ID, that means the proxy is working
    return response.status !== 500;
  } catch (error) {
    console.error("API proxy connection test failed:", error);
    return false;
  }
};
