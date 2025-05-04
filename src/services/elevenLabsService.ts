
import { toast } from "sonner";

const API_KEY = ""; // We'll use user input instead of hardcoding

interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  words?: TranscriptionWord[];
  speaker?: string;
}

export interface AudioTranscription {
  id: string;
  text: string;
  words?: TranscriptionWord[];
  segments?: TranscriptionSegment[];
  metadata?: Record<string, any>;
  language?: string;
}

export const transcribeAudio = async (
  audioFile: File, 
  apiKey: string, 
  options: { 
    tagAudioEvents?: boolean;
    diarize?: boolean;
    languageCode?: string;
  } = {}
): Promise<AudioTranscription> => {
  if (!audioFile) {
    toast.error("Nenhum arquivo de áudio fornecido");
    throw new Error("Nenhum arquivo de áudio fornecido");
  }

  if (!apiKey) {
    toast.error("Chave de API do Eleven Labs não configurada");
    throw new Error("Chave de API do Eleven Labs não configurada");
  }
  
  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model_id", "scribe_v1");
  
  if (options.tagAudioEvents !== undefined) {
    formData.append("tag_audio_events", options.tagAudioEvents.toString());
  }
  
  if (options.diarize !== undefined) {
    formData.append("diarize", options.diarize.toString());
  }
  
  if (options.languageCode) {
    formData.append("language_code", options.languageCode);
  }
  
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "xi-api-key": apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Erro na transcrição: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro na transcrição:", error);
    toast.error(`Falha na transcrição do áudio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};
