
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ImageGenerationParams } from "@/types/image";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateFilename(prompt: string): string {
  // Simple way to create a filename from prompt
  // In a real implementation, this would call GPT to generate a concise filename
  const cleaned = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  
  return `${cleaned}-${new Date().getTime()}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getImageFolder(): string {
  const date = new Date();
  return `images/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeString });
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function mockGenerateImage(params: ImageGenerationParams): Promise<{ url: string }> {
  // This is a placeholder for the actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return a placeholder image
      resolve({ 
        url: 'https://source.unsplash.com/random/1024x1024?ai'
      });
    }, 2000);
  });
}
