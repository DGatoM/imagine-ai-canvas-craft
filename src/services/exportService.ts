
export const exportImagesAsVideo = async (
  segments: Array<{ imageUrl: string; timestamp: string }>,
  aspectRatio: string = "16:9"
): Promise<Blob> => {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');
  
  const ffmpeg = new FFmpeg();
  
  // Load FFmpeg
  await ffmpeg.load();
  
  try {
    // Download and write each image
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.imageUrl) {
        const imageData = await fetchFile(segment.imageUrl);
        await ffmpeg.writeFile(`image${i}.jpg`, imageData);
      }
    }
    
    // Create input list for concat
    const inputList = segments
      .map((_, i) => `file 'image${i}.jpg'\nduration 5`)
      .join('\n') + '\n' + `file 'image${segments.length - 1}.jpg'`; // Last frame
    
    await ffmpeg.writeFile('input.txt', inputList);
    
    // Set video dimensions based on aspect ratio
    let videoFilter = '';
    switch (aspectRatio) {
      case '1:1':
        videoFilter = 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
        break;
      case '4:3':
        videoFilter = 'scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2';
        break;
      case '3:4':
        videoFilter = 'scale=1080:1440:force_original_aspect_ratio=decrease,pad=1080:1440:(ow-iw)/2:(oh-ih)/2';
        break;
      case '16:9':
        videoFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
        break;
      case '9:16':
        videoFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
        break;
      default:
        videoFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    }
    
    // Create video using concat demuxer
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'input.txt',
      '-vf', videoFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      'output.mp4'
    ]);
    
    // Read the output file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Convert FileData to Uint8Array if needed
    let uint8Array: Uint8Array;
    if (typeof data === 'string') {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      uint8Array = encoder.encode(data);
    } else {
      // data is already Uint8Array
      uint8Array = data;
    }
    
    // Create blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: 'video/mp4' });
    
    return blob;
    
  } catch (error) {
    console.error('Error creating video:', error);
    throw new Error(`Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
