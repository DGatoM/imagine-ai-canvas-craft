
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export interface ImageGenerationParams {
  prompt: string;
  size: ImageSize;
  n?: number; // Default is 1
  quality?: "standard" | "hd"; // Default is standard
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
  params: ImageGenerationParams;
}

export interface Brush {
  size: number;
  color: string;
}
