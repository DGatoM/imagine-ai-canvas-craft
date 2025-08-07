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

  let currentStep = 'Inicialização';
  
  try {
    const { mp3_url } = await req.json();
    
    if (!mp3_url) {
      throw new Error('mp3_url é obrigatório');
    }

    // Verify OpenAI API key
    const openaiKey = Deno.env.get('OpenAI_API');
    if (!openaiKey) {
      throw new Error('OpenAI_API não configurada');
    }

    console.log('Iniciando processamento completo para:', mp3_url);

    // Step 1: Download MP3 file
    currentStep = 'Download do arquivo MP3';
    console.log('ETAPA 1: Baixando arquivo MP3...');
    const mp3Response = await fetch(mp3_url);
    if (!mp3Response.ok) {
      throw new Error(`Falha ao baixar MP3: ${mp3Response.statusText}`);
    }
    
    const mp3Buffer = await mp3Response.arrayBuffer();
    const mp3File = new File([mp3Buffer], 'audio.mp3', { type: 'audio/mpeg' });
    console.log('✅ Download do MP3 concluído');

    // Step 2: Transcribe audio
    currentStep = 'Transcrição do áudio';
    console.log('ETAPA 2: Transcrevendo áudio...');
    const formData = new FormData();
    formData.append('file', mp3File);
    formData.append('model_id', 'scribe_v1');

    const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-audio', {
      body: formData,
    });

    if (transcriptionError) {
      throw new Error(`Erro na transcrição: ${transcriptionError.message}`);
    }

    const transcription = transcriptionData.text;
    console.log('✅ Transcrição completa:', transcription?.substring(0, 100) + '...');

    // Step 3: Generate prompts
    currentStep = 'Geração de prompts';
    console.log('ETAPA 3: Gerando prompts com OpenAI...');
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

    const prompts = promptsData.prompts;
    console.log(`✅ Prompts gerados: ${prompts.length} prompts`);

    // Step 4: Generate images using webhook
    currentStep = 'Geração de imagens';
    console.log('ETAPA 4: Gerando imagens via webhook...');
    
    const imageUrls: string[] = [];
    const imageWebhookUrl = 'https://hook.us2.make.com/jaiwotw6u7hqbabu9u1cj6m3bydobapj';
    
    // Generate images sequentially to avoid overwhelming the webhook
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`Gerando imagem ${i + 1}/${prompts.length} para o prompt: "${prompt.prompt.substring(0, 50)}..."`);
      
      try {
        const webhookResponse = await fetch(imageWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt.prompt,
            aspect_ratio: '1:1',
            num_outputs: 1
          }),
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook error para imagem ${i + 1}: ${webhookResponse.statusText}`);
        }

        const webhookResult = await webhookResponse.json();
        console.log(`Resposta webhook para imagem ${i + 1}:`, webhookResult);
        
        // Assuming webhook returns { output: [url] } or { url: string }
        let imageUrl;
        if (webhookResult.output && Array.isArray(webhookResult.output)) {
          imageUrl = webhookResult.output[0];
        } else if (webhookResult.url) {
          imageUrl = webhookResult.url;
        } else if (typeof webhookResult === 'string' && webhookResult.startsWith('http')) {
          imageUrl = webhookResult;
        } else {
          throw new Error(`Formato de resposta inesperado do webhook para imagem ${i + 1}: ${JSON.stringify(webhookResult)}`);
        }
        
        imageUrls.push(imageUrl);
        console.log(`✅ Imagem ${i + 1} gerada: ${imageUrl}`);
        
        // Add small delay between requests to avoid rate limiting
        if (i < prompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Erro ao gerar imagem ${i + 1}:`, error);
        throw new Error(`Erro ao gerar imagem ${i + 1}: ${error.message}`);
      }
    }

    console.log(`✅ Todas as ${imageUrls.length} imagens foram geradas`);

    // Step 5: Send images to video webhook
    currentStep = 'Criação do vídeo';
    console.log('ETAPA 5: Enviando imagens para criação do vídeo...');
    
    // You'll need to configure this webhook URL
    const videoWebhookUrl = Deno.env.get('VIDEO_WEBHOOK_URL');
    if (!videoWebhookUrl) {
      throw new Error('VIDEO_WEBHOOK_URL não configurada');
    }

    const videoResponse = await fetch(videoWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: imageUrls,
        audio_url: mp3_url,
        transcription: transcription
      }),
    });

    if (!videoResponse.ok) {
      throw new Error(`Erro no webhook de vídeo: ${videoResponse.statusText}`);
    }

    const videoResult = await videoResponse.text();
    console.log('✅ Resposta do webhook de vídeo:', videoResult);
    
    // Step 6: Return final result
    currentStep = 'Finalização';
    console.log('ETAPA 6: Processamento completo!');

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        prompts: prompts.map((p: any) => p.prompt),
        images: imageUrls,
        video_url: videoResult,
        audio_url: mp3_url,
        prompts_count: prompts.length,
        images_count: imageUrls.length,
        completed_steps: [
          '✅ Download do arquivo MP3',
          '✅ Transcrição do áudio',
          '✅ Geração de prompts',
          '✅ Geração de imagens',
          '✅ Criação do vídeo',
          '✅ Processamento completo'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`Erro na etapa "${currentStep}":`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        failed_step: currentStep,
        error_details: `Falha na etapa: ${currentStep}. Erro: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});