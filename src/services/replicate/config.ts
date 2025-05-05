
// Store the API token in memory and localStorage
let API_TOKEN: string | null = null;

// Using a function to get the token, which can later be modified to use environment variables
// or another secure method without changing the rest of the code
export const getReplicateApiToken = (): string => {
  if (API_TOKEN) {
    return API_TOKEN;
  }
  
  // In a production environment, this should come from environment variables
  // For now, we'll store it in localStorage for frontend-only applications
  const savedToken = localStorage.getItem('REPLICATE_API_TOKEN');
  if (savedToken) {
    return savedToken;
  }
  
  // Default fallback - this is not ideal but better than hardcoding in the source
  return '';
};

// Save token function
export const saveReplicateApiToken = (token: string): boolean => {
  API_TOKEN = token;
  localStorage.setItem('REPLICATE_API_TOKEN', token);
  return true;
};

// Flux model identifier
export const FLUX_MODEL = "black-forest-labs/flux-schnell";
