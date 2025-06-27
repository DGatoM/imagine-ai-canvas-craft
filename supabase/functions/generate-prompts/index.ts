
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
    const { transcription, segments = [], totalDuration } = await req.json()
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    if (!totalDuration || totalDuration <= 0) {
      throw new Error('Total duration not provided or invalid')
    }

    const numberOfSegments = Math.ceil(totalDuration / 5)
    
    const systemPrompt = 
      "Você vai receber a transcrição de um vídeo. Sua tarefa é analisar a duração total do áudio (fornecida na solicitação) e dividi-la em segmentos de 5 segundos. É CRUCIAL que você SEMPRE arredonde para cima no último segmento, garantindo que TODA a duração seja coberta. Para cada segmento, crie um prompt em inglês que ilustre o que está sendo dito naquele momento específico. Cada prompt DEVE SEMPRE começar com 'A realistic high resolution photo of' e ser bastante detalhado, incluindo elementos como ambiente, iluminação, expressões faciais, e outros detalhes relevantes."
    
    const userPrompt = `
    Aqui está a transcrição de um áudio:
    
    Texto completo: ${transcription}
    
    Duração total do áudio: ${totalDuration} segundos
    
    Sua tarefa:
    1. Use a duração total de ${totalDuration} segundos para dividir o áudio
    2. Divida essa duração em segmentos de EXATAMENTE 5 segundos cada
    3. Para esta duração de ${totalDuration} segundos, você deve criar EXATAMENTE ${numberOfSegments} segmentos.
    4. Para cada segmento, crie um prompt em inglês detalhado que comece com "A realistic high resolution photo of"
    5. Retorne apenas um array JSON no formato:
    [
      {
        "id": "1",
        "timestamp": "0:00 - 0:05",
        "prompt": "A realistic high resolution photo of [descrição detalhada]"
      }
    ]
    `

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
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
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to generate prompts")
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Try to parse the JSON response
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (jsonMatch) {
      const jsonContent = jsonMatch[0]
      const parsedPrompts = JSON.parse(jsonContent)
      
      return new Response(
        JSON.stringify(parsedPrompts),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        },
      )
    }
    
    throw new Error("Invalid response format")
    
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
