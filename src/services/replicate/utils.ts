
import { toast } from "sonner";

// Function to make a fetch request with retries
export const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a small delay between retries, increasing with each attempt
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
    }
  }
  
  // If we've exhausted all retries
  throw lastError;
};

// Mock function to provide fallback images when API fails
export const getMockImageForPrompt = (prompt: string): string => {
  // Generate a consistent but "random-looking" number from the prompt string
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash to select a placeholder image from a set of stock images
  const placeholders = [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1024',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1024',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1024',
    'https://images.unsplash.com/photo-1573496130407-57329f01f769?q=80&w=1024',
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1024',
  ];
  
  const index = Math.abs(hash) % placeholders.length;
  return placeholders[index];
};

// Check if the proxy is working correctly
export const isProxyAvailable = async (): Promise<boolean> => {
  try {
    console.log("Testing proxy connection...");
    
    const response = await fetch('/api/replicateProxyStatus?predictionId=test', {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error("Proxy test failed with status:", response.status);
      try {
        // Try to parse error response
        const errorData = await response.json();
        console.error("Error details:", errorData);
      } catch (parseError) {
        // If can't parse as JSON, get as text
        const errorText = await response.text();
        console.error("Error response:", errorText.substring(0, 500)); // Limit long HTML responses
      }
      return false;
    }
    
    let data;
    try {
      data = await response.json();
      console.log("Proxy test response:", data);
    } catch (error) {
      console.error("Failed to parse proxy response:", error);
      // Get response as text to see what was returned
      const text = await response.text();
      console.error("Raw response:", text.substring(0, 500)); // Limit long HTML responses
      return false;
    }
    
    return data && data.status === 'success';
  } catch (error) {
    console.error("Failed to connect to proxy:", error);
    return false;
  }
};

// Helper to create a fallback image when API fails
export const createFallbackImage = (prompt: string): any => {
  const mockImageUrl = getMockImageForPrompt(prompt);
  const filename = `fallback-${new Date().getTime()}.jpg`;
  
  toast.warning(
    "Usando imagem de fallback devido a problemas de conexão. Verifique se o proxy está funcionando corretamente.",
    { duration: 6000 }
  );
  
  console.error("API proxy is not available. Using fallback image.");
  
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    url: mockImageUrl,
    prompt: prompt,
    timestamp: new Date(),
    filename: filename,
    params: {
      prompt: prompt,
      size: "1024x1024",
    },
    isFallback: true
  };
};
