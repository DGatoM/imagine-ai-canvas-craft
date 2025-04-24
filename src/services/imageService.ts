
import { GeneratedImage, ImageEditParams, ImageGenerationParams } from "@/types/image";
import { generateFilename, getImageFolder, dataURItoBlob } from "@/lib/utils";
import { toast } from "sonner";

let API_KEY: string | null = null;

export const setApiKey = (key: string) => {
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
      toast.error("API key is required to generate images");
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: params.prompt,
        n: params.n || 1,
        size: params.size,
        quality: params.quality || "auto",
        style: params.style || "natural",
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate image');
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
    console.error('Error generating image:', error);
    toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

export const editImage = async (params: ImageEditParams): Promise<GeneratedImage | null> => {
  try {
    if (!getApiKey()) {
      toast.error("API key is required to edit images");
      return null;
    }

    // Create form data for the request
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', params.prompt);
    
    // Add the image file
    if (typeof params.image === 'string') {
      // Convert data URL to blob
      const blob = dataURItoBlob(params.image);
      formData.append('image[]', blob);
    } else {
      formData.append('image[]', params.image);
    }

    // Add the mask if provided
    if (params.mask) {
      const maskBlob = typeof params.mask === 'string' ? dataURItoBlob(params.mask) : params.mask;
      formData.append('mask', maskBlob);
    }

    // Add other parameters
    if (params.quality) formData.append('quality', params.quality);
    if (params.size) formData.append('size', params.size);

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to edit image');
    }

    const data = await response.json();
    const imageData = data.data[0];
    
    const filename = generateFilename(`edited-${params.prompt}`);
    const folder = getImageFolder();
    
    const generatedImage: GeneratedImage = {
      id: `img_edit_${Date.now()}`,
      url: `data:image/png;base64,${imageData.b64_json}`,
      prompt: `Edit: ${params.prompt}`,
      timestamp: new Date(),
      filename: `${filename}.png`,
      params
    };
    
    return generatedImage;
  } catch (error) {
    console.error('Error editing image:', error);
    toast.error(`Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};
