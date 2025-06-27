
import { supabase } from "@/integrations/supabase/client";

export const transcribeAudioWithSupabase = async (
  audioFile: File,
  options: { 
    tagAudioEvents?: boolean;
    diarize?: boolean;
    languageCode?: string;
  } = {}
) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model_id', 'scribe_v1');
  
  if (options.tagAudioEvents !== undefined) {
    formData.append('tag_audio_events', options.tagAudioEvents.toString());
  }
  
  if (options.diarize !== undefined) {
    formData.append('diarize', options.diarize.toString());
  }
  
  if (options.languageCode) {
    formData.append('language_code', options.languageCode);
  }

  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: formData,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const generatePromptsWithSupabase = async (
  transcription: string,
  totalDuration: number,
  customPrompt?: string
) => {
  const { data, error } = await supabase.functions.invoke('generate-prompts', {
    body: {
      transcription,
      totalDuration,
      customPrompt
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
