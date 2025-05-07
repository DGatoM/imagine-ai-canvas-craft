
import { AudioTranscription } from "@/services/elevenLabsService";

export interface PromptSegment {
  id: string;
  prompt: string;
  timestamp: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isGenerating?: boolean;
}

export interface ScriptGenConfig {
  aspectRatio: string;
  elevenLabsApiKey: string;
  openAIApiKey: string;
}
