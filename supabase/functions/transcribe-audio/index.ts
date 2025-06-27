
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioFile, options = {} } = await req.json()
    
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured')
    }

    const formData = new FormData()
    formData.append("file", audioFile)
    formData.append("model_id", "scribe_v1")
    
    if (options.tagAudioEvents !== undefined) {
      formData.append("tag_audio_events", options.tagAudioEvents.toString())
    }
    
    if (options.diarize !== undefined) {
      formData.append("diarize", options.diarize.toString())
    }
    
    if (options.languageCode) {
      formData.append("language_code", options.languageCode)
    }

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "xi-api-key": elevenLabsApiKey
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Transcription error: ${response.status}`)
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 400 
      },
    )
  }
})
