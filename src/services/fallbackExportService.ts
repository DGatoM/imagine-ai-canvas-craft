

// Fallback service for when FFmpeg fails
export const createSimpleImageSlideshow = async (
  segments: Array<{ imageUrl: string; timestamp: string }>,
  aspectRatio: string = "16:9"
): Promise<Blob> => {
  console.log('=== INÍCIO DO FALLBACK EXPORT ===');
  console.log('Segments recebidos:', segments.length);
  console.log('Aspect ratio:', aspectRatio);
  
  return new Promise((resolve, reject) => {
    try {
      console.log('Criando canvas...');
      // Create a canvas to combine all images
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('❌ Não foi possível criar contexto do canvas');
        throw new Error('Não foi possível criar contexto do canvas');
      }
      
      console.log('✅ Canvas criado com sucesso');
      
      // Set canvas dimensions based on aspect ratio
      let width = 1920;
      let height = 1080;
      
      switch (aspectRatio) {
        case '1:1':
          width = height = 1080;
          break;
        case '4:3':
          width = 1440;
          height = 1080;
          break;
        case '3:4':
          width = 1080;
          height = 1440;
          break;
        case '9:16':
          width = 1080;
          height = 1920;
          break;
      }
      
      console.log(`Dimensões do canvas: ${width}x${height}`);
      canvas.width = width;
      canvas.height = height;
      
      // Create a simple image compilation
      const segmentsWithImages = segments.filter(segment => segment.imageUrl);
      
      console.log('Segments com imagens:', segmentsWithImages.length);
      
      if (segmentsWithImages.length === 0) {
        console.error('❌ Nenhuma imagem encontrada para exportar');
        throw new Error('Nenhuma imagem encontrada para exportar');
      }
      
      console.log('Carregando primeira imagem:', segmentsWithImages[0].imageUrl);
      
      // For now, just create a static image with the first image
      // In a real implementation, this would create an actual video
      const firstImage = new Image();
      firstImage.crossOrigin = 'anonymous';
      
      firstImage.onload = () => {
        console.log('✅ Primeira imagem carregada com sucesso');
        console.log(`Dimensões da imagem: ${firstImage.width}x${firstImage.height}`);
        
        // Draw the image on canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        console.log('Fundo preto desenhado');
        
        // Calculate image scaling to fit canvas
        const scale = Math.min(width / firstImage.width, height / firstImage.height);
        const scaledWidth = firstImage.width * scale;
        const scaledHeight = firstImage.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        console.log(`Escala calculada: ${scale}`);
        console.log(`Posição: (${x}, ${y}), Tamanho: ${scaledWidth}x${scaledHeight}`);
        
        ctx.drawImage(firstImage, x, y, scaledWidth, scaledHeight);
        console.log('✅ Imagem desenhada no canvas');
        
        // Add text overlay
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${segmentsWithImages.length} imagens geradas`, width / 2, height - 50);
        console.log('✅ Texto adicionado');
        
        // Convert canvas to blob
        console.log('Convertendo canvas para blob...');
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`✅ Blob criado com sucesso! Tamanho: ${blob.size} bytes`);
            console.log('=== FIM DO FALLBACK EXPORT ===');
            resolve(blob);
          } else {
            console.error('❌ Falha ao criar blob do canvas');
            reject(new Error('Falha ao criar imagem'));
          }
        }, 'image/png');
      };
      
      firstImage.onerror = (error) => {
        console.error('❌ Erro ao carregar primeira imagem:', error);
        console.error('URL da imagem:', segmentsWithImages[0].imageUrl);
        reject(new Error('Falha ao carregar primeira imagem'));
      };
      
      firstImage.src = segmentsWithImages[0].imageUrl;
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO no fallback export:', error);
      console.log('=== FIM DO FALLBACK EXPORT COM ERRO ===');
      reject(error);
    }
  });
};

