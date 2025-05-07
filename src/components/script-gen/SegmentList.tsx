
import React from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, FileArchive, Video } from "lucide-react";
import SegmentItem from "./SegmentItem";
import { PromptSegment } from "@/types/scriptGen";

interface SegmentListProps {
  segments: PromptSegment[];
  onPromptChange: (id: string, value: string) => void;
  onGenerateImage: (id: string) => Promise<void>;
  onGenerateAllImages: () => Promise<void>;
  onExportImages: () => Promise<void>;
  onExportVideo: () => Promise<void>;
}

const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  onPromptChange,
  onGenerateImage,
  onGenerateAllImages,
  onExportImages,
  onExportVideo
}) => {
  if (segments.length === 0) return null;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Segmentos ({segments.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {/* Generate Images button */}
          <Button onClick={onGenerateAllImages}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Gerar Imagens
          </Button>
          
          {/* Only show export buttons after images are generated */}
          {segments.some(seg => seg.imageUrl) && (
            <>
              <Button onClick={onExportImages} variant="outline">
                <FileArchive className="h-4 w-4 mr-2" />
                Exportar Imagens
              </Button>
              <Button onClick={onExportVideo} variant="secondary">
                <Video className="h-4 w-4 mr-2" />
                Exportar Vídeo
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {segments.map(segment => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            onPromptChange={onPromptChange}
            onGenerateImage={onGenerateImage}
          />
        ))}
      </div>
    </>
  );
};

export default SegmentList;
