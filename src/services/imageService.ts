
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

    // Create request body based on model type
    const requestBody: any = {
      model: "gpt-image-1",
      prompt: params.prompt,
      n: params.n || 1,
      size: params.size,
    };

    // Add quality parameter only if provided
    if (params.quality) {
      requestBody.quality = params.quality;
    }
    
    console.log("Generating image with params:", JSON.stringify(requestBody));
    
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
      throw new Error(error.error?.message || 'Failed to generate image');
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
    formData.append('model', params.model || 'gpt-image-1');
    formData.append('prompt', params.prompt);
    
    // Convert image data URL to blob and append to formData
    if (typeof params.image === 'string' && params.image.startsWith('data:')) {
      const imageBlob = dataURItoBlob(params.image);
      formData.append('image', imageBlob, 'image.png');
      console.log("Added image to form data");
    } else if (params.image instanceof File) {
      formData.append('image', params.image);
      console.log("Added image file to form data");
    } else {
      throw new Error('Invalid image format. Must be a data URL or File object.');
    }

    // Add the mask if provided
    if (params.mask && typeof params.mask === 'string' && params.mask.startsWith('data:')) {
      const maskBlob = dataURItoBlob(params.mask);
      formData.append('mask', maskBlob, 'mask.png');
      console.log("Added mask to form data");
    } else if (params.mask instanceof File) {
      formData.append('mask', params.mask);
      console.log("Added mask file to form data");
    }

    // Add other parameters
    if (params.size) formData.append('size', params.size);
    if (params.quality) formData.append('quality', params.quality);
    
    console.log("Sending edit request with params:", params.prompt, params.size, params.quality);
    
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error response:", errorData);
      throw new Error(errorData.error?.message || `Failed to edit image: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      console.error("Unexpected API response structure:", data);
      throw new Error("Invalid API response format");
    }
    
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
