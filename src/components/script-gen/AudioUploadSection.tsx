
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileAudio } from "lucide-react";
import { ScriptGenConfig } from "@/types/scriptGen";

interface AudioUploadSectionProps {
  uploadedAudio: File | null;
  config: ScriptGenConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScriptGenConfig>>;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessAudio: () => Promise<void>;
  isProcessing: boolean;
}

const AudioUploadSection: React.FC<AudioUploadSectionProps> = ({
  uploadedAudio,
  config,
  setConfig,
  onAudioUpload,
  onProcessAudio,
  isProcessing
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Configuração do Vídeo</CardTitle>
        <CardDescription>
          Faça upload de um áudio e escolha o formato do vídeo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Arquivo de Áudio</label>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept="audio/*"
                onChange={onAudioUpload}
                className="flex-1"
              />
            </div>
            {uploadedAudio && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo: {uploadedAudio.name}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Proporção do Vídeo</label>
            <Select 
              value={config.aspectRatio} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, aspectRatio: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma proporção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Quadrado (1:1)</SelectItem>
                <SelectItem value="4:3">Paisagem (4:3)</SelectItem>
                <SelectItem value="3:4">Retrato (3:4)</SelectItem>
                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                <SelectItem value="9:16">Vertical (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">API Key do Eleven Labs</label>
            <Input 
              type="password" 
              placeholder="sk_..." 
              value={config.elevenLabsApiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, elevenLabsApiKey: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usada para transcrever o áudio
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">API Key da OpenAI</label>
            <Input 
              type="password" 
              placeholder="sk-..." 
              value={config.openAIApiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, openAIApiKey: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usada para gerar prompts
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={onProcessAudio} 
            disabled={!uploadedAudio || isProcessing || !config.elevenLabsApiKey || !config.openAIApiKey}
            className="flex items-center"
          >
            <FileAudio className="h-4 w-4 mr-2" />
            Processar Áudio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioUploadSection;
