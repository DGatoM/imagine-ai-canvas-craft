
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
    "Você vai receber a transcrição de um vídeo. Sua primeira tarefa é analisar a duração total do áudio (encontrando o timestamp final na transcrição), dividir por 5 para determinar quantos segmentos de 5 segundos são necessários, arredondando o último segmento para cima se necessário. Em seguida, crie um prompt em inglês para cada segmento de 5 segundos que ilustre o que está sendo dito naquele momento específico. Leve em consideração o contexto completo, incluindo o que foi dito antes e o que será dito depois, para que as imagens sejam coerentes entre si. As imagens sempre devem ser realistas, a não ser que o tema de uma determinada imagem possa ficar melhor com uma imagem estilizada.";
  
  try {
    // Prepare a detailed user prompt with full transcription data including all timestamps
    const userPrompt = `
    Aqui está a transcrição completa de um áudio, incluindo timestamps: 
    
    Texto completo: ${params.transcription}
    
    Detalhes dos segmentos com timestamps:
    ${JSON.stringify(params.segments, null, 2)}
    
    Sua tarefa:
    1. Determine a duração total do áudio analisando os timestamps finais
    2. Divida essa duração em segmentos de 5 segundos (crie segmentos de 0:00-0:05, 0:05-0:10, etc.)
    3. Para cada segmento de 5 segundos, crie um prompt em inglês para geração de imagem que represente o que está sendo dito naquele trecho
    4. Retorne apenas um array JSON no formato abaixo (sem explicações adicionais):
    [
      {
        "id": "1",
        "timestamp": "0:00 - 0:05",
        "prompt": "Prompt em inglês para este segmento"
      },
      ...etc para cada segmento de 5 segundos até o final do áudio
    ]
    `;
    
    console.log("Enviando transcrição para OpenAI para processamento");
    
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
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Falha ao gerar prompts");
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      // This regex finds anything that looks like a JSON array
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonContent = jsonMatch[0];
        console.log("Extracted JSON content:", jsonContent);
        return JSON.parse(jsonContent);
      }
      
      // If no JSON array found, try to parse the whole content
      console.log("Trying to parse full content:", content);
      const parsed = JSON.parse(content);
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.prompts && Array.isArray(parsed.prompts)) {
        return parsed.prompts;
      } else {
        // Try to find any array property in the response
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            return parsed[key];
          }
        }
        throw new Error("Formato de resposta incorreto");
      }
    } catch (parseError) {
      console.error("Erro ao analisar resposta JSON:", parseError);
      console.log("Conteúdo recebido:", content);
      
      // Last resort: try to manually extract the data using regex
      try {
        // Match individual prompt objects
        const promptRegex = /"id"\s*:\s*"([^"]+)"\s*,\s*"timestamp"\s*:\s*"([^"]+)"\s*,\s*"prompt"\s*:\s*"([^"]+)"/g;
        const prompts: PromptSegment[] = [];
        let match;
        
        while ((match = promptRegex.exec(content)) !== null) {
          prompts.push({
            id: match[1],
            timestamp: match[2],
            prompt: match[3].replace(/\\"/g, '"')
          });
        }
        
        if (prompts.length > 0) {
          return prompts;
        }
      } catch (regexError) {
        console.error("Falha na extração por regex:", regexError);
      }
      
      throw new Error("Formato de resposta incorreto");
    }
  } catch (error) {
    console.error("Erro na geração de prompts:", error);
    toast.error(`Falha na geração de prompts: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
};
