
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AudioTranscription } from "@/services/elevenLabsService";
import { FileAudio, Code, MessageSquare } from "lucide-react";

interface DebugSectionProps {
  transcription: AudioTranscription | null;
  rawElevenLabsResponse: string;
  openaiPrompt: string;
  rawOpenAIResponse: string;
  debugActiveTab: string;
  setDebugActiveTab: (tab: string) => void;
  setOpenaiPrompt: (prompt: string) => void;
  onProcessWithCustomPrompt: () => Promise<void>;
  isProcessing: boolean;
}

const DebugSection: React.FC<DebugSectionProps> = ({
  transcription,
  rawElevenLabsResponse,
  openaiPrompt,
  rawOpenAIResponse,
  debugActiveTab,
  setDebugActiveTab,
  setOpenaiPrompt,
  onProcessWithCustomPrompt,
  isProcessing
}) => {
  if (!transcription) return null;

  return (
    <Card className="mb-8 border border-yellow-500">
      <CardHeader className="bg-yellow-500/10">
        <CardTitle className="text-yellow-500">Debug Mode</CardTitle>
        <CardDescription>
          Visualize e edite as requisições e respostas entre APIs
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs value={debugActiveTab} onValueChange={setDebugActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="elevenlabs">
              <FileAudio className="h-4 w-4 mr-2" />
              Eleven Labs
            </TabsTrigger>
            <TabsTrigger value="openai-prompt">
              <Code className="h-4 w-4 mr-2" />
              Prompt OpenAI
            </TabsTrigger>
            <TabsTrigger value="openai-response">
              <MessageSquare className="h-4 w-4 mr-2" />
              Resposta OpenAI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="elevenlabs" className="mt-0">
            <p className="text-sm font-medium mb-2">Resposta bruta do Eleven Labs:</p>
            <Textarea 
              readOnly 
              value={rawElevenLabsResponse} 
              rows={10}
              className="font-mono text-xs leading-normal"
            />
          </TabsContent>
          
          <TabsContent value="openai-prompt" className="mt-0">
            <p className="text-sm font-medium mb-2">Edite o prompt para a OpenAI:</p>
            <Textarea 
              value={openaiPrompt} 
              onChange={(e) => setOpenaiPrompt(e.target.value)}
              rows={15}
              className="font-mono text-xs leading-normal mb-2"
            />
            <Button 
              onClick={onProcessWithCustomPrompt} 
              disabled={isProcessing || !openaiPrompt}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar Prompt Personalizado
            </Button>
          </TabsContent>
          
          <TabsContent value="openai-response" className="mt-0">
            <p className="text-sm font-medium mb-2">Resposta bruta da OpenAI:</p>
            <Textarea 
              readOnly 
              value={rawOpenAIResponse} 
              rows={10}
              className="font-mono text-xs leading-normal"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DebugSection;
