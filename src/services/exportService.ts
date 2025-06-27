export const exportImagesAsVideo = async (
  segments: Array<{ imageUrl: string; timestamp: string }>,
  aspectRatio: string = "16:9"
): Promise<Blob> => {
  console.log('=== INÍCIO DA EXPORTAÇÃO DE VÍDEO ===');
  console.log('Segments recebidos:', segments.length);
  console.log('Aspect ratio:', aspectRatio);
  console.log('Detalhes dos segments:', segments);
  
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');
  
  console.log('FFmpeg e fetchFile importados com sucesso');
  
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
    console.log('Tentando carregar FFmpeg...');
    console.log('Core URL:', '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js');
    console.log('WASM URL:', '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm');
    
    await ffmpeg.load({
      coreURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',
      wasmURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
    });
    console.log('✅ FFmpeg carregado com sucesso!');
    
    // Filter segments that have images and sort by timestamp
    const segmentsWithImages = segments
      .filter(segment => segment.imageUrl)
      .sort((a, b) => {
        // Extract numeric part from timestamp for sorting
        const aTime = parseFloat(a.timestamp.split(' - ')[0].replace(':', '.'));
        const bTime = parseFloat(b.timestamp.split(' - ')[0].replace(':', '.'));
        return aTime - bTime;
      });

    console.log('Segments filtrados com imagens:', segmentsWithImages.length);
    console.log('URLs das imagens:', segmentsWithImages.map(s => s.imageUrl));

    if (segmentsWithImages.length === 0) {
      console.error('❌ Nenhuma imagem encontrada para exportar');
      throw new Error('Nenhuma imagem encontrada para exportar');
    }

    console.log(`Processando ${segmentsWithImages.length} imagens...`);

    // Download and write each image
    for (let i = 0; i < segmentsWithImages.length; i++) {
      const segment = segmentsWithImages[i];
      console.log(`[${i + 1}/${segmentsWithImages.length}] Processando imagem:`, segment.imageUrl);
      
      try {
        console.log(`Fazendo download da imagem ${i + 1}...`);
        const imageData = await fetchFile(segment.imageUrl);
        console.log(`Download concluído. Tamanho: ${imageData.byteLength} bytes`);
        
        const filename = `image${i}.jpg`;
        await ffmpeg.writeFile(filename, imageData);
        console.log(`✅ Imagem ${i + 1} salva como ${filename}`);
        
        // Verify file was written
        const files = await ffmpeg.listDir('/');
        console.log(`Arquivos no FFmpeg após salvar ${filename}:`, files);
        
      } catch (error) {
        console.error(`❌ Erro ao processar imagem ${i + 1}:`, error);
        console.error('URL da imagem que falhou:', segment.imageUrl);
        throw new Error(`Falha ao processar imagem ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    console.log('Todas as imagens foram processadas. Criando lista de input...');
    
    // Create input list for concat demuxer
    const inputList = segmentsWithImages
      .map((_, i) => `file 'image${i}.jpg'\nduration 5`)
      .join('\n') + '\n' + `file 'image${segmentsWithImages.length - 1}.jpg'`;
    
    console.log('Input list criada:');
    console.log(inputList);
    
    await ffmpeg.writeFile('input.txt', inputList);
    console.log('✅ Arquivo input.txt criado');
    
    // Verify input.txt was created
    const files = await ffmpeg.listDir('/');
    console.log('Todos os arquivos no FFmpeg:', files);
    
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
    
    console.log('Video filter configurado:', videoFilter);
    console.log('Iniciando criação do vídeo...');
    
    const ffmpegCommand = [
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
    ];
    
    console.log('Comando FFmpeg:', ffmpegCommand.join(' '));
    
    // Create video using concat demuxer with more reliable settings
    await ffmpeg.exec(ffmpegCommand);
    
    console.log('✅ Comando FFmpeg executado com sucesso!');
    
    // Verify output file was created
    const finalFiles = await ffmpeg.listDir('/');
    console.log('Arquivos finais no FFmpeg:', finalFiles);
    
    console.log('Lendo arquivo de saída...');
    
    // Read the output file
    const data = await ffmpeg.readFile('output.mp4');
    console.log('Arquivo lido. Tipo:', typeof data);
    console.log('Tamanho dos dados:', data.byteLength || data.length);
    
    // Convert FileData to Uint8Array if needed
    let uint8Array: Uint8Array;
    if (typeof data === 'string') {
      console.log('Convertendo string para Uint8Array...');
      const encoder = new TextEncoder();
      uint8Array = encoder.encode(data);
    } else {
      console.log('Dados já são Uint8Array');
      uint8Array = data as Uint8Array;
    }
    
    console.log('Criando blob...');
    // Create blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: 'video/mp4' });
    
    console.log(`✅ Vídeo exportado com sucesso! Tamanho: ${blob.size} bytes`);
    console.log('=== FIM DA EXPORTAÇÃO DE VÍDEO ===');
    
    return blob;
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO na criação do vídeo:');
    console.error('Tipo do erro:', typeof error);
    console.error('Nome do erro:', error instanceof Error ? error.name : 'Unknown');
    console.error('Mensagem do erro:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Objeto completo do erro:', error);
    console.log('=== FIM DA EXPORTAÇÃO COM ERRO ===');
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
