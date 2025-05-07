
import { Bug, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioUploadSection from "@/components/script-gen/AudioUploadSection";
import DebugSection from "@/components/script-gen/DebugSection";
import SegmentList from "@/components/script-gen/SegmentList";
import { useScriptGeneration } from "@/hooks/useScriptGeneration";

const ScriptGen = () => {
  const {
    uploadedAudio,
    config,
    setConfig,
    isProcessing,
    segments,
    transcription,
    showDebug,
    setShowDebug,
    rawElevenLabsResponse,
    openaiPrompt,
    setOpenaiPrompt,
    rawOpenAIResponse,
    debugActiveTab,
    setDebugActiveTab,
    handleAudioUpload,
    handleProcessAudio,
    handleProcessWithCustomPrompt,
    handlePromptChange,
    handleGenerateAllImages,
    handleGenerateImage,
    handleExportImages,
    handleExportVideo
  } = useScriptGeneration();

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <LayoutGrid className="h-8 w-8 mr-2 text-primary" />
              Danilo Gato Script Gen
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie vídeos a partir de áudios, gerando imagens e animações
            </p>
          </div>
          <Button 
            variant={showDebug ? "destructive" : "outline"}
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center"
          >
            <Bug className="h-4 w-4 mr-2" />
            {showDebug ? "Desativar Debug" : "Ativar Debug"}
          </Button>
        </div>

        <AudioUploadSection
          uploadedAudio={uploadedAudio}
          config={config}
          setConfig={setConfig}
          onAudioUpload={handleAudioUpload}
          onProcessAudio={handleProcessAudio}
          isProcessing={isProcessing}
        />

        {showDebug && transcription && (
          <DebugSection
            transcription={transcription}
            rawElevenLabsResponse={rawElevenLabsResponse}
            openaiPrompt={openaiPrompt}
            rawOpenAIResponse={rawOpenAIResponse}
            debugActiveTab={debugActiveTab}
            setDebugActiveTab={setDebugActiveTab}
            setOpenaiPrompt={setOpenaiPrompt}
            onProcessWithCustomPrompt={handleProcessWithCustomPrompt}
            isProcessing={isProcessing}
          />
        )}

        {isProcessing && (
          <div className="flex justify-center items-center p-12">
            <div className="animate-pulse-gentle text-center">
              <div className="h-8 w-8 mx-auto mb-4 border-4 border-t-primary rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Processando...</p>
            </div>
          </div>
        )}

        {segments.length > 0 && !isProcessing && (
          <SegmentList
            segments={segments}
            onPromptChange={handlePromptChange}
            onGenerateImage={handleGenerateImage}
            onGenerateAllImages={handleGenerateAllImages}
            onExportImages={handleExportImages}
            onExportVideo={handleExportVideo}
          />
        )}
      </div>
    </div>
  );
};

export default ScriptGen;
