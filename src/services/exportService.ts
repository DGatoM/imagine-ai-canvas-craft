
export const exportImagesAsVideo = async (
  segments: Array<{ imageUrl: string; timestamp: string }>,
  aspectRatio: string = "16:9"
): Promise<Blob> => {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');
  
  const ffmpeg = new FFmpeg();
  
  // Enable logging for debugging
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg log:', message);
  });
  
  ffmpeg.on('progress', ({ progress }) => {
    console.log('FFmpeg progress:', Math.round(progress * 100) + '%');
  });
  
  try {
    // Load FFmpeg with a more reliable core URL
    console.log('Carregando FFmpeg...');
    await ffmpeg.load({
      coreURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',
      wasmURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
    });
    console.log('FFmpeg carregado com sucesso!');
    
    // Filter segments that have images and sort by timestamp
    const segmentsWithImages = segments
      .filter(segment => segment.imageUrl)
      .sort((a, b) => {
        // Extract numeric part from timestamp for sorting
        const aTime = parseFloat(a.timestamp.split(' - ')[0].replace(':', '.'));
        const bTime = parseFloat(b.timestamp.split(' - ')[0].replace(':', '.'));
        return aTime - bTime;
      });

    if (segmentsWithImages.length === 0) {
      throw new Error('Nenhuma imagem encontrada para exportar');
    }

    console.log(`Processando ${segmentsWithImages.length} imagens...`);

    // Download and write each image
    for (let i = 0; i < segmentsWithImages.length; i++) {
      const segment = segmentsWithImages[i];
      console.log(`Baixando imagem ${i + 1}/${segmentsWithImages.length}...`);
      
      try {
        const imageData = await fetchFile(segment.imageUrl);
        await ffmpeg.writeFile(`image${i}.jpg`, imageData);
        console.log(`Imagem ${i + 1} processada com sucesso`);
      } catch (error) {
        console.error(`Erro ao processar imagem ${i + 1}:`, error);
        throw new Error(`Falha ao processar imagem ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    // Create input list for concat demuxer
    const inputList = segmentsWithImages
      .map((_, i) => `file 'image${i}.jpg'\nduration 5`)
      .join('\n') + '\n' + `file 'image${segmentsWithImages.length - 1}.jpg'`;
    
    await ffmpeg.writeFile('input.txt', inputList);
    
    // Set video dimensions based on aspect ratio
    let videoFilter = '';
    switch (aspectRatio) {
      case '1:1':
        videoFilter = 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black';
        break;
      case '4:3':
        videoFilter = 'scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2:black';
        break;
      case '3:4':
        videoFilter = 'scale=1080:1440:force_original_aspect_ratio=decrease,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:black';
        break;
      case '16:9':
        videoFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black';
        break;
      case '9:16':
        videoFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black';
        break;
      default:
        videoFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black';
    }
    
    console.log('Criando vídeo...');
    
    // Create video using concat demuxer with more reliable settings
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'input.txt',
      '-vf', videoFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-r', '0.2', // 0.2 fps = 1 frame every 5 seconds
      '-y', // Overwrite output file
      'output.mp4'
    ]);
    
    console.log('Vídeo criado, lendo arquivo...');
    
    // Read the output file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Convert FileData to Uint8Array if needed
    let uint8Array: Uint8Array;
    if (typeof data === 'string') {
      // Convert string to Uint8Array (shouldn't happen for video files)
      const encoder = new TextEncoder();
      uint8Array = encoder.encode(data);
    } else {
      // data is already Uint8Array
      uint8Array = data as Uint8Array;
    }
    
    // Create blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: 'video/mp4' });
    
    console.log(`Vídeo exportado com sucesso! Tamanho: ${blob.size} bytes`);
    
    return blob;
    
  } catch (error) {
    console.error('Error creating video:', error);
    throw new Error(`Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
