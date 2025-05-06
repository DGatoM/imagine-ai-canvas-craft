
import { v4 as uuidv4 } from 'uuid';
import { GeneratedImage } from "@/types/image";
import { ReplicateImageParams } from "./types";

// Function to create a fallback image when the API fails
export const createFallbackImage = (prompt: string): GeneratedImage => {
  // Create a fallback image with a placeholder URL
  const fallbackImage: GeneratedImage = {
    id: uuidv4(),
    url: "https://source.unsplash.com/random/1024x1024?ai", // Unsplash random image as fallback
    prompt: prompt,
    timestamp: new Date(),
    filename: `fallback-${new Date().getTime()}.jpg`,
    params: {
      prompt: prompt,
      size: "1024x1024"
    },
    isFallback: true // Flag to indicate this is a fallback
  };
  
  console.log("Fallback image created:", fallbackImage);
  return fallbackImage;
};
