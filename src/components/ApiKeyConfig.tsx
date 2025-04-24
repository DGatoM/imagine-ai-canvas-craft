
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key } from "lucide-react";

const ApiKeyConfig = () => {
  const [apiKey, setApiKeyState] = useState<string>(
    "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"
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isKeySet, setIsKeySet] = useState(false);

  useEffect(() => {
    const savedKey = getApiKey();
    setIsKeySet(!!savedKey);
    
    if (!savedKey) {
      // Automatically save the key if not already set
      handleSaveKey();
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira uma chave de API válida");
      return;
    }

    setApiKey(apiKey);
    setIsKeySet(true);
    setIsDialogOpen(false);
    toast.success("Chave de API salva com sucesso");
  };

  const handleRemoveKey = () => {
    setApiKey("");
    setApiKeyState("");
    setIsKeySet(false);
    toast.info("Chave de API removida");
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
        {isKeySet ? "API Key ●●●●●" : "Definir Chave de API"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Chave de API</DialogTitle>
            <DialogDescription>
              Insira sua chave de API da OpenAI. A chave é armazenada apenas no navegador local e nunca enviada para nossos servidores.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                Chave de API OpenAI
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
                Sua chave de API é armazenada apenas no armazenamento local do navegador.
                Recomendamos usar uma chave com limites de uso apropriados.
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
                Remover Chave
              </Button>
            )}
            <Button 
              onClick={handleSaveKey}
              type="button"
              disabled={!apiKey.trim()}
            >
              Salvar Chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeyConfig;
