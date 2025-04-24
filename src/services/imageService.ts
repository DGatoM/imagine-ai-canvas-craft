
import { v4 as uuidv4 } from 'uuid';
import { ImageGenerationParams, GeneratedImage, ImageEditParams } from '@/types/image';

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/images';
const API_KEY_STORAGE_KEY = 'openai_api_key';
let API_KEY: string | null = null;

export const setApiKey = (key: string) => {
  // Remover qualquer espaço em branco que possa estar presente
  const trimmedKey = key.trim();
  
  // Salvar a chave no armazenamento local
  localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
  API_KEY = trimmedKey;
  
  console.log("API key set successfully");
  return true;
};

export const getApiKey = (): string | null => {
  if (!API_KEY) {
    API_KEY = localStorage.getItem(API_KEY_STORAGE_KEY);
  }
  return API_KEY;
};

export const clearApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  API_KEY = null;
};

export const generateImage = async (params: ImageGenerationParams): Promise<GeneratedImage> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const response = await fetch(`${OPENAI_API_ENDPOINT}/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: params.prompt,
      n: 1,
      size: params.size || "1024x1024",
      quality: params.quality || "standard",
      response_format: "url"
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error generating image:', errorData);
    throw new Error(`Failed to generate image: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  // Construir resultado com ID único e parâmetros usados
  return {
    id: uuidv4(),
    url: data.data[0].url,
    prompt: params.prompt,
    timestamp: new Date().toISOString(),
    params: {
      ...params
    }
  };
};

export const editImage = async (params: ImageEditParams): Promise<GeneratedImage> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  // Preparar corpo da requisição
  const body: any = {
    model: params.model || "gpt-image-1",
    prompt: params.prompt,
    image: params.image,
    response_format: "url",
    n: 1
  };

  // Adicionar parâmetros opcionais se fornecidos
  if (params.mask) body.mask = params.mask;
  if (params.size) body.size = params.size;
  if (params.quality) body.quality = params.quality;

  const response = await fetch(`${OPENAI_API_ENDPOINT}/edits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error editing image:', errorData);
    throw new Error(`Failed to edit image: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  // Construir resultado com ID único e parâmetros usados
  return {
    id: uuidv4(),
    url: data.data[0].url,
    prompt: params.prompt,
    timestamp: new Date().toISOString(),
    params: {
      ...params
    }
  };
};
