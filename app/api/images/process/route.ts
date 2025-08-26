import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';
import { BackgroundRemovalService } from '@/features/backgroundRemover/libs/background-removal';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { imageId } = await request.json();
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 [Process] Starting processing for image ${imageId}`);
    
    // Get the image record and original file
    const supabase = createServiceClient();
    const { data: imageRecord, error: fetchError } = await supabase
      .from('processed_images')
      .select('*')
      .eq('id', imageId)
      .single();
    
    if (fetchError || !imageRecord) {
      console.error(`❌ [Process] Image not found: ${imageId}`, fetchError);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    if (imageRecord.status !== 'pending') {
      console.log(`⚠️ [Process] Image ${imageId} already processed (status: ${imageRecord.status})`);
      return NextResponse.json({
        id: imageId,
        status: imageRecord.status,
        message: `Image is already ${imageRecord.status}`
      });
    }
    
    // Update status to processing
    await supabase
      .from('processed_images')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId);
    
    console.log(`📝 [Process] Updated status to processing for ${imageId}`);
    
    // Download the original file from storage
    const originalPath = imageRecord.original_url.split('/').pop();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('original-images')
      .download(originalPath);
    
    if (downloadError || !fileData) {
      console.error(`❌ [Process] Failed to download original file for ${imageId}:`, downloadError);
      
      await supabase
        .from('processed_images')
        .update({ 
          status: 'failed',
          error_message: 'Failed to download original file',
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId);
      
      return NextResponse.json(
        { error: 'Failed to download original file' },
        { status: 500 }
      );
    }
    
    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`📁 [Process] Downloaded original file for ${imageId} (${buffer.length} bytes)`);
    
    // Initialize services
    const imageProcessor = new ImageProcessor();
    const backgroundRemoval = new BackgroundRemovalService();
    
    // Process the image
    const result = await imageProcessor.processImage(
      buffer,
      imageId,
      (buffer) => backgroundRemoval.removeBackground(buffer)
    );
    
    console.log(`✅ [Process] Successfully processed image ${imageId}`);
    
    return NextResponse.json({
      id: imageId,
      status: 'completed',
      processedUrl: result.processedUrl,
      processingTimeMs: result.processingTimeMs,
      message: 'Image processed successfully'
    });
    
  } catch (error) {
    console.error(`❌ [Process] Processing failed:`, error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Processing failed',
    }, { status: 500 });
  }
}
