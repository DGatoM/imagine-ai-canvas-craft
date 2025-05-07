
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { PromptSegment } from "@/types/scriptGen";

interface SegmentItemProps {
  segment: PromptSegment;
  onPromptChange: (id: string, value: string) => void;
  onGenerateImage: (id: string) => Promise<void>;
}

const SegmentItem: React.FC<SegmentItemProps> = ({ 
  segment, 
  onPromptChange, 
  onGenerateImage 
}) => {
  return (
    <Card key={segment.id}>
      <CardHeader>
        <CardTitle className="text-base">
          Segmento {segment.timestamp}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <Textarea 
              value={segment.prompt}
              onChange={(e) => onPromptChange(segment.id, e.target.value)}
              rows={3}
              className="mb-2"
            />
          </div>
          
          <div className="w-full md:w-[300px]">
            <label className="text-sm font-medium mb-2 block">Imagem</label>
            <div className="bg-accent aspect-video flex items-center justify-center rounded-md overflow-hidden">
              {segment.imageUrl ? (
                <img 
                  src={segment.imageUrl} 
                  alt={`Imagem para ${segment.timestamp}`}
                  className="w-full h-full object-cover" 
                />
              ) : segment.isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="h-8 w-8 border-4 border-t-primary rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-muted-foreground">Gerando...</p>
                </div>
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => onGenerateImage(segment.id)}
              disabled={segment.isGenerating}
            >
              {segment.imageUrl ? "Regenerar Imagem" : "Gerar Imagem"}
            </Button>
          </div>
          
          {segment.videoUrl && (
            <div className="w-full md:w-[300px]">
              <label className="text-sm font-medium mb-2 block">Vídeo</label>
              <div className="bg-accent aspect-video rounded-md overflow-hidden">
                <video 
                  src={segment.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                Reanimar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentItem;
