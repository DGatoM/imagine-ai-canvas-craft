
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenLabsApiKey = Deno.env.get('Eleven_Labs_API');
    
    if (!elevenLabsApiKey) {
      throw new Error('Eleven Labs API key not configured in Supabase secrets');
    }

    const formData = await req.formData();
    const audioFile = formData.get('file') as File;
    const modelId = formData.get('model_id') as string || 'scribe_v1';
    const tagAudioEvents = formData.get('tag_audio_events') as string;
    const diarize = formData.get('diarize') as string;
    const languageCode = formData.get('language_code') as string;

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    const transcriptionFormData = new FormData();
    transcriptionFormData.append('file', audioFile);
    transcriptionFormData.append('model_id', modelId);
    
    if (tagAudioEvents) {
      transcriptionFormData.append('tag_audio_events', tagAudioEvents);
    }
    
    if (diarize) {
      transcriptionFormData.append('diarize', diarize);
    }
    
    if (languageCode) {
      transcriptionFormData.append('language_code', languageCode);
    }

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "xi-api-key": elevenLabsApiKey
      },
      body: transcriptionFormData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Transcription error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
