
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

    const { transcription, totalDuration, customPrompt } = await req.json();

    if (!transcription || !totalDuration) {
      throw new Error('Transcription and total duration are required');
    }

    const systemPrompt = 
      "Você vai receber a transcrição de um vídeo. Sua tarefa é analisar a duração total do áudio (fornecida na solicitação) e dividi-la em segmentos de 5 segundos. É CRUCIAL que você SEMPRE arredonde para cima no último segmento, garantindo que TODA a duração seja coberta. Por exemplo, para um áudio de 27 segundos, você deve criar 6 segmentos (5 completos + 1 parcial). Para cada segmento, crie um prompt em inglês que ilustre o que está sendo dito naquele momento específico. Cada prompt DEVE SEMPRE começar com 'A realistic high resolution photo of' e ser bastante detalhado, incluindo elementos como ambiente, iluminação, expressões faciais, e outros detalhes relevantes. Lembre-se que a IA de geração de imagem não terá nenhum contexto adicional além deste prompt. Considere o contexto completo, incluindo o que foi dito antes e o que será dito depois, para que as imagens sejam coerentes entre si.";

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
