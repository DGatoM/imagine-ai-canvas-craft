
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export interface ImageGenerationParams {
  prompt: string;
  size: ImageSize;
  n?: number; // Default is 1
  quality?: "low" | "medium" | "high" | "auto"; // Correct values for gpt-image-1
  model?: string; // Added model parameter
  negativePrompt?: string; // Add support for negative prompts
}

export interface ImageEditParams extends ImageGenerationParams {
  image: File | string;
  mask?: File | string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  filename: string;
  params: {
    prompt: string;
    size: string;
    [key: string]: any;
  };
  isFallback?: boolean; // Flag to indicate if this is a fallback image
}

export interface Brush {
  size: number;
  color: string;
}
