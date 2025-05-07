
/**
 * Creates a video from the generated images
 */
export async function exportImagesAsVideo(
  images: GeneratedImage[], 
  aspectRatio: string
): Promise<void> {
  try {
    if (images.length === 0) {
      toast.error("Não há imagens para criar o vídeo");
      return;
    }

    // Create FFmpeg instance
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg
    toast.info("Carregando FFmpeg...");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${window.location.origin}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${window.location.origin}/ffmpeg-core.wasm`, 'application/wasm')
    });
    
    // Calculate video dimensions based on aspect ratio
    let width = 1280;
    let height = 720;
    
    if (aspectRatio === "1:1") {
      width = 720;
      height = 720;
    } else if (aspectRatio === "9:16" || aspectRatio === "3:4") {
      // For vertical videos, swap dimensions
      width = 720;
      height = 1280;
    }

    // Create a file list for the concat demuxer
    let fileListContent = '';
    
    // Download and write each image to FFmpeg's file system
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      toast.info(`Processando imagem ${i + 1} de ${images.length}...`);
      
      try {
        const response = await fetch(image.url);
        if (!response.ok) throw new Error(`Falha ao baixar imagem ${i + 1}`);
        
        const imageData = await response.arrayBuffer();
        const paddedNumber = String(i + 1).padStart(3, '0');
        const filename = `image${paddedNumber}.png`;
        
        // Write the image to FFmpeg's virtual file system
        ffmpeg.writeFile(filename, new Uint8Array(imageData));
        
        // Add to the file list content
        fileListContent += `file '${filename}'\nduration 5\n`;
        
        // Add the last image again without duration to avoid the end cut off
        if (i === images.length - 1) {
          fileListContent += `file '${filename}'\n`;
        }
      } catch (error) {
        console.error(`Erro ao processar imagem ${i + 1}:`, error);
        toast.error(`Falha ao processar imagem ${i + 1}`);
      }
    }
    
    // Write the complete file list
    ffmpeg.writeFile('list.txt', fileListContent);
    
    // Generate the video
    toast.info("Criando vídeo...");
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'list.txt',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-r', '30',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      'output.mp4'
    ]);
    
    // Read the video file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Create and download the video
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video_${new Date().toISOString().slice(0, 10)}.mp4`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ffmpeg.terminate();
    
    toast.success("Vídeo exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao criar vídeo:", error);
    toast.error(`Falha ao criar vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
