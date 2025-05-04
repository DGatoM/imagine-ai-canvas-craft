
import { toast } from "sonner";

interface PromptSegment {
  id: string;
  prompt: string;
  timestamp: string;
}

export interface PromptGenerationParams {
  transcription: string;
  segments: Array<{ text: string; start: number; end: number; }>;
}

export const generatePrompts = async (
  params: PromptGenerationParams, 
  apiKey: string
): Promise<PromptSegment[]> => {
  if (!apiKey) {
    toast.error("Chave de API da OpenAI não configurada");
    throw new Error("Chave de API da OpenAI não configurada");
  }

  const systemPrompt = 
    "Você vai receber a transcrição de um vídeo. seu papel é entender o contexto do vídeo e gerar um prompt em inglês para criação de imagens em outra IA que vão mudar a cada 5 segundos e precisam ilustrar o que está sendo dito no momento, leve em consideração o todo e também o que foi dito anteriormente e o que será dito depois para que as imagens fiquem coerentes. As imagens sempre devem ser realistas, a não ser que o tema de uma determinada imagem possa ficar melhor com uma imagem estilizada";
  
  try {
    // Prepare segments in 5-second chunks
    const segments = params.segments;
    const fiveSecondChunks: Array<{ text: string; start: number; end: number; }> = [];
    
    // Group segments into 5-second chunks
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDuration = segment.end - segment.start;
      let remainingDuration = segmentDuration;
      let currentPosition = segment.start;
      
      while (remainingDuration > 0) {
        const chunkDuration = Math.min(remainingDuration, 5);
        const chunkEnd = currentPosition + chunkDuration;
        
        // Calculate what portion of the text belongs to this chunk
        const textPortion = segment.text;
        
        fiveSecondChunks.push({
          text: textPortion,
          start: currentPosition,
          end: chunkEnd
        });
        
        currentPosition = chunkEnd;
        remainingDuration -= chunkDuration;
      }
    }
    
    const userPrompt = `
    Transcrição completa: 
    ${params.transcription}
    
    Agora, para cada segmento de 5 segundos abaixo, gere um prompt em inglês para geração de imagem:
    ${fiveSecondChunks.map(chunk => `
    Segmento [${formatTime(chunk.start)} - ${formatTime(chunk.end)}]:
    ${chunk.text}`).join('\n')}
    
    Responda apenas com um JSON no formato:
    [
      {
        "id": "1",
        "timestamp": "0:00 - 0:05",
        "prompt": "Prompt em inglês para este segmento"
      },
      ...
    ]
    `;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Falha ao gerar prompts");
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const parsedContent = JSON.parse(content);
      if (Array.isArray(parsedContent)) {
        return parsedContent;
      } else if (parsedContent.prompts && Array.isArray(parsedContent.prompts)) {
        return parsedContent.prompts;
      } else {
        // Try to find any array property in the response
        for (const key in parsedContent) {
          if (Array.isArray(parsedContent[key])) {
            return parsedContent[key];
          }
        }
        throw new Error("Formato de resposta incorreto");
      }
    } catch (parseError) {
      console.error("Erro ao analisar resposta JSON:", parseError);
      console.log("Conteúdo recebido:", content);
      throw new Error("Formato de resposta incorreto");
    }
  } catch (error) {
    console.error("Erro na geração de prompts:", error);
    toast.error(`Falha na geração de prompts: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};

// Helper function to format time in mm:ss format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
