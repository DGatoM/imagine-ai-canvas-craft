
// Fallback service for when FFmpeg fails
export const createSimpleImageSlideshow = async (
  segments: Array<{ imageUrl: string; timestamp: string }>,
  aspectRatio: string = "16:9"
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas to combine all images
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }
      
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
      
      canvas.width = width;
      canvas.height = height;
      
      // Create a simple image compilation
      const segmentsWithImages = segments.filter(segment => segment.imageUrl);
      
      if (segmentsWithImages.length === 0) {
        throw new Error('Nenhuma imagem encontrada para exportar');
      }
      
      // For now, just create a static image with the first image
      // In a real implementation, this would create an actual video
      const firstImage = new Image();
      firstImage.crossOrigin = 'anonymous';
      
      firstImage.onload = () => {
        // Draw the image on canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate image scaling to fit canvas
        const scale = Math.min(width / firstImage.width, height / firstImage.height);
        const scaledWidth = firstImage.width * scale;
        const scaledHeight = firstImage.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        ctx.drawImage(firstImage, x, y, scaledWidth, scaledHeight);
        
        // Add text overlay
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${segmentsWithImages.length} imagens geradas`, width / 2, height - 50);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao criar imagem'));
          }
        }, 'image/png');
      };
      
      firstImage.onerror = () => {
        reject(new Error('Falha ao carregar primeira imagem'));
      };
      
      firstImage.src = segmentsWithImages[0].imageUrl;
      
    } catch (error) {
      reject(error);
    }
  });
};
