
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { toast } from "sonner";
import { GeneratedImage } from "@/types/image";

// Initialize FFmpeg
const ffmpeg = createFFmpeg({
  log: true,
  corePath: new URL('@ffmpeg/core/dist/ffmpeg-core.js', import.meta.url).href,
});

// Export images as a ZIP file
export async function exportImagesZip(images: GeneratedImage[]) {
  try {
    const zip = new JSZip();
    
    // Add each image to the ZIP file with numbered filenames
    for (let i = 0; i < images.length; i++) {
      const response = await fetch(images[i].url);
      const blob = await response.blob();
      const extension = blob.type.split('/')[1];
      zip.file(`${i + 1}.${extension}`, blob);
    }
    
    // Generate and save the ZIP file
    const zipped = await zip.generateAsync({ type: 'blob' });
    saveAs(zipped, 'imagens.zip');
    toast.success("Imagens exportadas com sucesso!");
  } catch (error) {
    console.error("Erro ao exportar imagens:", error);
    toast.error(`Falha ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Export images as a simple slideshow video
export async function exportImagesAsVideo(images: GeneratedImage[], aspectRatio: string = "16:9") {
  try {
    if (images.length === 0) {
      toast.error("Não há imagens para criar o vídeo");
      return;
    }

    // Load FFmpeg if not already loaded
    if (!ffmpeg.isLoaded()) {
      toast.info("Carregando FFmpeg...");
      await ffmpeg.load();
    }
    
    // Download and write each image to FFmpeg's file system
    toast.info("Processando imagens...");
    for (let i = 0; i < images.length; i++) {
      try {
        const response = await fetch(images[i].url);
        if (!response.ok) throw new Error(`Falha ao baixar imagem ${i + 1}`);
        
        const blob = await response.blob();
        const data = await fetchFile(blob);
        ffmpeg.FS('writeFile', `img${i}.png`, data);
      } catch (error) {
        console.error(`Erro ao processar imagem ${i + 1}:`, error);
        toast.error(`Falha ao processar imagem ${i + 1}`);
      }
    }
    
    // Create a file list for the concat demuxer (each image lasts 5 seconds)
    let list = '';
    for (let i = 0; i < images.length; i++) {
      list += `file 'img${i}.png'\nduration 5\n`;
    }
    // Add the last image again without duration to avoid the end cut off
    list += `file 'img${images.length - 1}.png'\n`;
    
    // Write the list file
    ffmpeg.FS('writeFile', 'list.txt', list);
    
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
    
    // Generate the video with simple slideshow (no transitions)
    toast.info("Criando vídeo...");
    await ffmpeg.run(
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
      'out.mp4'
    );
    
    // Read the video file
    const data = ffmpeg.FS('readFile', 'out.mp4');
    
    // Create and download the video
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slideshow_${new Date().toISOString().slice(0, 10)}.mp4`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Vídeo exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao criar vídeo:", error);
    toast.error(`Falha ao criar vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
