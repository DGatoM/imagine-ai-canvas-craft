import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mp3_url } = await req.json();
    
    if (!mp3_url) {
      throw new Error('mp3_url é obrigatório');
    }

    // Verify required environment variables
    const openaiKey = Deno.env.get('OpenAI_API');
    const videoWebhookUrl = Deno.env.get('VIDEO_WEBHOOK_URL');
    
    if (!openaiKey) {
      throw new Error('ETAPA 0: OpenAI_API não configurada');
    }
    
    if (!videoWebhookUrl) {
      throw new Error('ETAPA 0: VIDEO_WEBHOOK_URL não configurada');
    }

    console.log('Iniciando processamento completo para:', mp3_url);

    // Step 1: Download MP3 file
    console.log('ETAPA 1: Baixando arquivo MP3...');
    try {
      const mp3Response = await fetch(mp3_url);
      if (!mp3Response.ok) {
        throw new Error(`Falha ao baixar MP3: ${mp3Response.statusText}`);
      }
      
      const mp3Buffer = await mp3Response.arrayBuffer();
      const mp3File = new File([mp3Buffer], 'audio.mp3', { type: 'audio/mpeg' });
      console.log('ETAPA 1: MP3 baixado com sucesso');
    } catch (error) {
      throw new Error(`ETAPA 1: ${error.message}`);
    }

    // Step 2: Transcribe audio
    console.log('ETAPA 2: Transcrevendo áudio...');
    let transcription;
    try {
      const formData = new FormData();
      formData.append('file', mp3File);
      formData.append('model_id', 'scribe_v1');

      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (transcriptionError) {
        throw new Error(`Erro na transcrição: ${transcriptionError.message}`);
      }

      transcription = transcriptionData.text;
      console.log('ETAPA 2: Transcrição completa:', transcription?.substring(0, 100) + '...');
    } catch (error) {
      throw new Error(`ETAPA 2: ${error.message}`);
    }

    // Step 3: Generate prompts
    console.log('ETAPA 3: Gerando prompts...');
    let prompts;
    try {
      const { data: promptsData, error: promptsError } = await supabase.functions.invoke('generate-prompts', {
        body: {
          transcription,
          totalDuration: 60, // Default duration
          customPrompt: undefined,
          transcriptionSegments: undefined
        },
      });

      if (promptsError) {
        throw new Error(`Erro na geração de prompts: ${promptsError.message}`);
      }

      prompts = promptsData.prompts;
      console.log(`ETAPA 3: ${prompts.length} prompts gerados com sucesso`);
    } catch (error) {
      throw new Error(`ETAPA 3: ${error.message}`);
    }

    // Step 4: Generate images for each prompt
    console.log('ETAPA 4: Gerando imagens...');
    let images;
    try {
      const imagePromises = prompts.map(async (prompt: any, index: number) => {
        try {
          console.log(`Gerando imagem ${index + 1}/${prompts.length}: ${prompt.prompt.substring(0, 50)}...`);
          
          const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: prompt.prompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard'
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na geração da imagem ${index + 1}: ${response.statusText} - ${errorText}`);
          }

          const imageData = await response.json();
          const imageUrl = imageData.data[0].url;
          
          console.log(`Imagem ${index + 1} gerada com sucesso: ${imageUrl}`);
          
          return imageUrl;
        } catch (error) {
          console.error(`Erro ao gerar imagem ${index + 1}:`, error);
          throw error;
        }
      });

      images = await Promise.all(imagePromises);
      console.log(`ETAPA 4: Todas as ${images.length} imagens foram geradas com sucesso`);
    } catch (error) {
      throw new Error(`ETAPA 4: ${error.message}`);
    }

    // Step 5: Send images to video webhook
    console.log('ETAPA 5: Enviando imagens para criação do vídeo...');
    let videoUrl;
    try {
      console.log('Enviando array de imagens para webhook:', images);
      
      const webhookResponse = await fetch(videoWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: images
        }),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Webhook retornou erro: ${webhookResponse.statusText} - ${errorText}`);
      }

      const webhookResult = await webhookResponse.text();
      videoUrl = webhookResult.trim();
      
      console.log('ETAPA 5: Vídeo criado com sucesso:', videoUrl);
    } catch (error) {
      throw new Error(`ETAPA 5: ${error.message}`);
    }

    // Step 6: Return final result
    console.log('ETAPA 6: Processamento completo!');

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        prompts: prompts.map((p: any) => p.prompt),
        images: images,
        video_url: videoUrl,
        audio_url: mp3_url,
        prompts_count: prompts.length,
        images_count: images.length,
        message: 'Processamento completo com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Falha no processamento'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});