
import { toast } from "sonner";
import { isProxyAvailable } from "./utils";
import { saveReplicateApiToken } from "./config";

// Add a function to check if the proxy is working
export const checkReplicateApiConnection = async (): Promise<boolean> => {
  return isProxyAvailable();
};

// Re-export the save token function with toast notification
export const saveReplicateApiTokenWithNotification = (token: string): boolean => {
  const result = saveReplicateApiToken(token);
  if (result) {
    toast.success("Token da Replicate salvo com sucesso!");
  }
  return result;
};
