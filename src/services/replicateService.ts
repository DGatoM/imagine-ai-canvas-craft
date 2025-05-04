
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { GeneratedImage } from "@/types/image";

// Using a function to get the token, which can later be modified to use environment variables
// or another secure method without changing the rest of the code
const getReplicateApiToken = () => {
  // In a production environment, this should come from environment variables
  // For now, we'll store it in localStorage for frontend-only applications
  const savedToken = localStorage.getItem('REPLICATE_API_TOKEN');
  if (savedToken) {
    return savedToken;
  }
  
  // Default fallback - this is not ideal but better than hardcoding in the source
  return '';
};

const REPLICATE_MODEL = "ideogram-ai/ideogram-v2a-turbo";

export interface ReplicateImageParams {
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
  timestamp?: string;
}

export const generateReplicateImage = async (params: ReplicateImageParams): Promise<GeneratedImage | null> => {
  try {
    const token = getReplicateApiToken();
    if (!token) {
      toast.error("Replicate API token não encontrado. Por favor, configure-o nas configurações.");
      return null;
    }

    console.log(`Gerando imagem via Replicate: "${params.prompt}"`);
    
    // Step 1: Create the prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL,
        input: {
          prompt: params.prompt,
          aspect_ratio: params.aspect_ratio || "16:9",
          num_outputs: params.num_outputs || 1
        }
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.detail || 'Falha ao iniciar geração de imagem');
    }
    
    const createData = await createResponse.json();
    console.log("Prediction iniciada:", createData);
    
    if (!createData.urls || !createData.urls.get) {
      throw new Error('URL de verificação não encontrada na resposta da API');
    }
    
    // Step 2: Poll for the result
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!imageUrl && attempts < maxAttempts) {
      attempts++;
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(createData.urls.get, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!statusResponse.ok) {
        console.error("Erro ao verificar status:", await statusResponse.text());
        continue;
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
    }
    
    if (!imageUrl) {
      throw new Error('Timeout ao aguardar geração da imagem');
    }
    
    // Create the GeneratedImage object
    const filename = `replicate-${new Date().getTime()}.png`;
    
    const generatedImage: GeneratedImage = {
      id: uuidv4(),
      url: imageUrl,
      prompt: params.prompt,
      timestamp: new Date(),
      filename: filename,
      params: {
        prompt: params.prompt,
        size: "1024x1024", // Default size for compatibility
      }
    };
    
    return generatedImage;
  } catch (error) {
    console.error('Erro ao gerar imagem com Replicate:', error);
    toast.error(`Falha ao gerar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return null;
  }
};

// Add a function to save the token
export const saveReplicateApiToken = (token: string) => {
  localStorage.setItem('REPLICATE_API_TOKEN', token);
  toast.success("Token da Replicate salvo com sucesso!");
  return true;
};
