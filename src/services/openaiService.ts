
import { toast } from "sonner";

interface PromptSegment {
  id: string;
  prompt: string;
  timestamp: string;
}

export interface PromptGenerationParams {
  transcription: string;
  segments: Array<{ text: string; start: number; end: number; }>;
  totalDuration?: number;
}

export const generatePrompts = async (
  params: PromptGenerationParams, 
  apiKey: string
): Promise<PromptSegment[]> => {
  if (!apiKey) {
    toast.error("Chave de API da OpenAI não configurada");
    throw new Error("Chave de API da OpenAI não configurada");
  }

  if (!params.totalDuration || params.totalDuration <= 0) {
    toast.error("Duração do áudio não determinada");
    throw new Error("Duração do áudio não determinada");
  }

  const systemPrompt = 
    "Você vai receber a transcrição de um vídeo. Sua tarefa é analisar a duração total do áudio (fornecida na solicitação) e dividi-la em segmentos de 5 segundos. É CRUCIAL que você SEMPRE arredonde para cima no último segmento, garantindo que TODA a duração seja coberta. Por exemplo, para um áudio de 27 segundos, você deve criar 6 segmentos (5 completos + 1 parcial). Para cada segmento, crie um prompt em inglês que ilustre o que está sendo dito naquele momento específico. Cada prompt DEVE SEMPRE começar com 'A realistic high resolution photo of' e ser bastante detalhado, incluindo elementos como ambiente, iluminação, expressões faciais, e outros detalhes relevantes. Lembre-se que a IA de geração de imagem não terá nenhum contexto adicional além deste prompt. Considere o contexto completo, incluindo o que foi dito antes e o que será dito depois, para que as imagens sejam coerentes entre si.";
  
  try {
    // Calcular o número correto de segmentos
    const totalDuration = params.totalDuration;
    const segmentDuration = 5; // 5 segundos por segmento
    const numberOfSegments = Math.ceil(totalDuration / segmentDuration);
    
    console.log(`Duração total calculada: ${totalDuration} segundos`);
    console.log(`Número de segmentos (arredondado para cima): ${numberOfSegments}`);
    
    // Prepare a detailed user prompt with transcription data and explicit duration from metadata
    const userPrompt = `
    Aqui está a transcrição de um áudio:
    
    Texto completo: ${params.transcription}
    
    Duração total do áudio: ${params.totalDuration} segundos
    
    Sua tarefa:
    1. Use a duração total de ${params.totalDuration} segundos para dividir o áudio
    2. Divida essa duração em segmentos de EXATAMENTE 5 segundos cada (crie segmentos de 0:00-0:05, 0:05-0:10, etc.)
    3. IMPORTANTE: Se a duração não for divisível exatamente por 5, SEMPRE arredonde para cima e crie um segmento adicional para o tempo restante. Por exemplo, para um áudio de 27 segundos, você deve criar 6 segmentos (0:00-0:05, 0:05-0:10, 0:10-0:15, 0:15-0:20, 0:20-0:25, 0:25-0:27).
    4. Calculando matematicamente, para esta duração de ${params.totalDuration} segundos, você deve criar EXATAMENTE ${numberOfSegments} segmentos.
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
