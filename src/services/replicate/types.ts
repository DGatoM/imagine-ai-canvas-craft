
import { GeneratedImage } from "@/types/image";

export interface ReplicateImageParams {
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
  timestamp?: string;
  negative_prompt?: string;
  guidance_scale?: number;
  seed?: number;
}

export interface ReplicateResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
}

export type ReplicateApiResult = GeneratedImage | null;
