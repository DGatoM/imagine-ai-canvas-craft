
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setApiKey, getApiKey } from "@/services/imageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key } from "lucide-react";

const ApiKeyConfig = () => {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isKeySet, setIsKeySet] = useState(false);

  useEffect(() => {
    const savedKey = getApiKey();
    setIsKeySet(!!savedKey);
    
    // Check if key is set
    if (!savedKey) {
      // Show dialog if no API key is set
      setIsDialogOpen(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }

    setApiKey(apiKey);
    setIsKeySet(true);
    setIsDialogOpen(false);
    toast.success("API key saved successfully");
  };

  const handleRemoveKey = () => {
    setApiKey("");
    setApiKeyState("");
    setIsKeySet(false);
    toast.info("API key removed");
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-1"
      >
        <Key className="h-4 w-4 mr-1" />
        {isKeySet ? "API Key ●●●●●" : "Set API Key"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure API Key</DialogTitle>
            <DialogDescription>
              Enter your OpenAI API key to generate images. The key is stored in your local browser and never sent to our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                OpenAI API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
              />
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>
                Your API key is stored only in your browser's local storage.
                We recommend using a key with appropriate usage limits.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            {isKeySet && (
              <Button 
                variant="destructive" 
                onClick={handleRemoveKey}
                type="button"
              >
                Remove Key
              </Button>
            )}
            <Button 
              onClick={handleSaveKey}
              type="button"
              disabled={!apiKey.trim()}
            >
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeyConfig;
