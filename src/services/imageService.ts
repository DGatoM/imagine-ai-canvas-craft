
import { GeneratedImage, ImageEditParams, ImageGenerationParams } from "@/types/image";
import { generateFilename, getImageFolder, dataURItoBlob } from "@/lib/utils";
import { toast } from "sonner";

let API_KEY: string | null = null;

export const setApiKey = (key: string) => {
  // Validate key format before saving
  if (!key.startsWith('sk-proj-')) {
    throw new Error('Invalid API key format');
  }
  
  API_KEY = key;
  localStorage.setItem('gpt_image_api_key', key);
};

export const getApiKey = (): string | null => {
  if (!API_KEY) {
    API_KEY = localStorage.getItem('gpt_image_api_key');
  }
  return API_KEY;
};

export const generateImage = async (params: ImageGenerationParams): Promise<GeneratedImage | null> => {
  try {
    if (!getApiKey()) {
      toast.error("É necessário uma chave de API para gerar imagens");
      return null;
    }

    const requestBody: any = {
      model: "gpt-image-1",
      prompt: params.prompt,
      n: params.n || 1,
      size: params.size,
    };

    if (params.quality) {
      requestBody.quality = params.quality;
    }
    
    console.log("Gerando imagem com parâmetros:", JSON.stringify(requestBody));
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Falha ao gerar imagem');
    }

    const data = await response.json();
    const imageData = data.data[0];
    
    const filename = generateFilename(params.prompt);
    const folder = getImageFolder();
    
    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      url: `data:image/png;base64,${imageData.b64_json}`,
      prompt: params.prompt,
      timestamp: new Date(),
      filename: `${filename}.png`,
      params
    };

    return generatedImage;
  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    toast.error(`Falha ao gerar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return null;
  }
};

export const editImage = async (params: ImageEditParams): Promise<GeneratedImage | null> => {
  try {
    if (!getApiKey()) {
      toast.error("É necessário uma chave de API para editar imagens");
      return null;
    }

    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', params.prompt);
    // Removed response_format as it's not supported for gpt-image-1
    
    if (typeof params.image === 'string' && params.image.startsWith('data:')) {
      const imageBlob = dataURItoBlob(params.image);
      formData.append('image', imageBlob, 'image.png');
      console.log("Imagem adicionada ao form data");
    } else if (params.image instanceof File) {
      formData.append('image', params.image);
      console.log("Arquivo de imagem adicionado ao form data");
    } else {
      throw new Error('Formato de imagem inválido. Deve ser uma URL de dados ou objeto File.');
    }

    if (params.mask && typeof params.mask === 'string' && params.mask.startsWith('data:')) {
      const maskBlob = dataURItoBlob(params.mask);
      formData.append('mask', maskBlob, 'mask.png');
      console.log("Máscara adicionada ao form data");
    } else if (params.mask instanceof File) {
      formData.append('mask', params.mask);
      console.log("Arquivo de máscara adicionado ao form data");
    }

    if (params.size) formData.append('size', params.size);
    
    console.log("Enviando solicitação de edição com parâmetros:", params.prompt, params.size);
    
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na resposta da API:", errorData);
      throw new Error(errorData.error?.message || `Falha ao editar imagem: ${response.status}`);
    }

    const data = await response.json();
    console.log("Estrutura de resposta da API de edição:", JSON.stringify(data, null, 2));
    
    if (!data.data || !data.data[0]) {
      console.error("Estrutura de resposta da API inesperada:", data);
      throw new Error("Formato de resposta da API inválido");
    }
    
    const imageData = data.data[0];
    // O modelo gpt-image-1 sempre retorna imagens codificadas em base64
    const imageBase64 = imageData.b64_json;
    
    if (!imageBase64) {
      throw new Error("Nenhum dado de imagem retornado pela API");
    }
    
    const filename = generateFilename(`edited-${params.prompt}`);
    
    const generatedImage: GeneratedImage = {
      id: `img_edit_${Date.now()}`,
      url: `data:image/png;base64,${imageBase64}`,
      prompt: `Edição: ${params.prompt}`,
      timestamp: new Date(),
      filename: `${filename}.png`,
      params
    };
    
    return generatedImage;
  } catch (error) {
    console.error('Erro ao editar imagem:', error);
    toast.error(`Falha ao editar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return null;
  }
};
