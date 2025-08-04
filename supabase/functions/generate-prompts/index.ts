
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
    const openAIApiKey = Deno.env.get('OpenAI_API');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured in Supabase secrets');
    }

    const { transcription, totalDuration, customPrompt, transcriptionSegments } = await req.json();

    if (!transcription || !totalDuration) {
      throw new Error('Transcription and total duration are required');
    }

    const systemPrompt = 
      "Você vai receber a transcrição de um vídeo e um trecho específico dessa transcrição. Sua tarefa é criar um prompt em inglês para geração de imagem que ilustre de forma metafórica ou literal o que está sendo falado neste trecho específico. O prompt DEVE SEMPRE começar com 'A realistic high resolution photo of' e ser bastante detalhado, incluindo elementos como ambiente, iluminação, expressões faciais, e outros detalhes relevantes. Lembre-se que já há um apresentador no vídeo final, então não é necessário adicionar algum narrador nas imagens, apenas ilustrar o assunto sobre o qual ele está falando. Use metáforas visuais quando apropriado para representar conceitos abstratos.";

    // If transcriptionSegments are provided, use them instead of generating segments
    if (transcriptionSegments && Array.isArray(transcriptionSegments)) {
      const prompts = [];
      
      for (let i = 0; i < transcriptionSegments.length; i++) {
        const segment = transcriptionSegments[i];
        const startTime = i * 5;
        const endTime = Math.min((i + 1) * 5, totalDuration);
        const timestamp = `${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')} - ${Math.floor(endTime / 60)}:${(endTime % 60).toString().padStart(2, '0')}`;
        
        const segmentPrompt = `
        Contexto completo da transcrição: ${transcription}
        
        Trecho específico para esta imagem: "${segment}"
        
        Sua tarefa:
        1. Analise o trecho específico: "${segment}"
        2. Considere o contexto completo da transcrição para entender melhor o assunto
        3. Crie um prompt em inglês que ilustre de forma metafórica ou literal o que está sendo falado neste trecho
        4. O prompt DEVE SEMPRE começar com "A realistic high resolution photo of"
        5. Seja bastante detalhado, incluindo ambiente, iluminação, expressões, ações e elementos relevantes
        6. Lembre-se que já há um apresentador no vídeo, então foque apenas em ilustrar o assunto
        7. Use metáforas visuais quando apropriado para representar conceitos abstratos
        8. Retorne apenas o prompt (sem explicações adicionais). Jamais use aspas duplas no prompt, se precisar, use aspas simples.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIApiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: segmentPrompt
              }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || `Failed to generate prompt for segment ${i + 1}`);
        }

        const data = await response.json();
        const promptContent = data.choices[0].message.content.trim();

        prompts.push({
          id: (i + 1).toString(),
          timestamp: timestamp,
          prompt: promptContent
        });
      }

      return new Response(JSON.stringify({ prompts, rawResponse: `Generated ${prompts.length} prompts using individual segments` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const numberOfSegments = Math.ceil(totalDuration / 5);
    
    const userPrompt = customPrompt || `
    Aqui está a transcrição de um áudio:
    
    Texto completo: ${transcription}
    
    Duração total do áudio: ${totalDuration} segundos
    
    Sua tarefa:
    1. Use a duração total de ${totalDuration} segundos para dividir o áudio
    2. Divida essa duração em segmentos de EXATAMENTE 5 segundos cada (crie segmentos de 0:00-0:05, 0:05-0:10, etc.)
    3. IMPORTANTE: Se a duração não for divisível exatamente por 5, SEMPRE arredonde para cima e crie um segmento adicional para o tempo restante. Por exemplo, para um áudio de 27 segundos, você deve criar 6 segmentos (0:00-0:05, 0:05-0:10, 0:10-0:15, 0:15-0:20, 0:20-0:25, 0:25-0:27).
    4. Calculando matematicamente, para esta duração de ${totalDuration} segundos, você deve criar EXATAMENTE ${numberOfSegments} segmentos.
    5. Para cada segmento, crie um prompt em inglês para geração de imagem que represente o que está sendo dito naquele trecho
    6. IMPORTANTE: Cada prompt DEVE SEMPRE começar com "A realistic high resolution photo of" e deve ser bastante detalhado, descrevendo o ambiente, iluminação, expressões, ações e elementos importantes da cena.
    7. Retorne apenas um array JSON no formato abaixo (sem explicações adicionais):
    [
      {
        "id": "1",
        "timestamp": "0:00 - 0:05",
        "prompt": "A realistic high resolution photo of [descrição detalhada aqui]"
      },
      ...etc para cada segmento até o final do áudio, certificando-se de cobrir toda a duração
    ]
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to generate prompts");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse the JSON response
    try {
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonContent = jsonMatch[0];
        const prompts = JSON.parse(jsonContent);
        
        return new Response(JSON.stringify({ prompts, rawResponse: content }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error("Invalid response format");
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return new Response(JSON.stringify({ error: "Invalid response format", rawResponse: content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-prompts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
