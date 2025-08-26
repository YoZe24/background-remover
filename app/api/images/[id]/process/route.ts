import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';
import { BackgroundRemovalService } from '@/features/backgroundRemover/libs/background-removal';
import type { ProcessedImage } from '@/features/backgroundRemover/types/image';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get the image record
    const { data: imageRecord, error: fetchError } = await supabase
      .from('processed_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !imageRecord) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if already processed or processing
    if (imageRecord.status === 'completed') {
      return NextResponse.json({
        id,
        status: 'completed',
        message: 'Image already processed',
        processedUrl: imageRecord.processed_url,
      });
    }

    if (imageRecord.status === 'processing') {
      return NextResponse.json({
        id,
        status: 'processing',
        message: 'Image is currently being processed',
      });
    }

    // Initialize services
    const imageProcessor = new ImageProcessor();
    const backgroundRemoval = new BackgroundRemovalService();

    // Validate background removal service
    const serviceValidation = backgroundRemoval.validateConfig();
    if (!serviceValidation.valid) {
      return NextResponse.json(
        { error: `Service configuration error: ${serviceValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('processed_images')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to update processing status: ${updateError.message}`);
    }

    // Fetch original image from storage
    const originalImageBuffer = await fetchImageFromStorage(imageRecord.original_url);
    
    // Process the image synchronously
    const result = await processImageSynchronously(
      id,
      originalImageBuffer,
      imageProcessor,
      backgroundRemoval,
      supabase
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Processing error:', error);
    
    // Update status to failed in database
    try {
      const supabase = await createClient();
      await supabase
        .from('processed_images')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', await params.then(p => p.id));
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process image'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch image buffer from storage URL
 */
async function fetchImageFromStorage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from storage: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Process image synchronously with proper error handling
 */
async function processImageSynchronously(
  imageId: string,
  originalBuffer: Buffer,
  imageProcessor: ImageProcessor,
  backgroundRemoval: BackgroundRemovalService,
  supabase: any
): Promise<{ id: string; status: string; message: string; processedUrl?: string; processingTimeMs?: number }> {
  const startTime = Date.now();
  console.log(`🔄 [ProcessRoute] Starting processing pipeline for ${imageId}`);

  try {
    // Process the image through the complete pipeline
    const { processedBuffer: finalBuffer, processingTimeMs: pipelineTime, steps } = await imageProcessor.processImageBuffer(
      originalBuffer,
      (buffer) => backgroundRemoval.removeBackground(buffer)
    );
    
    console.log(`📊 [ProcessRoute] Pipeline steps for ${imageId}:`, steps);

    // Step 5: Upload processed image to storage
    console.log(`☁️ [ProcessRoute] Step 5: Uploading processed image for ${imageId}`);
    const uploadStart = Date.now();
    const processedUrl = await uploadProcessedImageToStorage(finalBuffer, imageId, supabase);
    console.log(`☁️ [ProcessRoute] Upload completed for ${imageId} in ${Date.now() - uploadStart}ms`);

    const processingTimeMs = Date.now() - startTime;

    // Step 6: Update status to completed
    console.log(`✅ [ProcessRoute] Step 6: Updating status to 'completed' for ${imageId}`);
    const { error: updateError } = await supabase
      .from('processed_images')
      .update({
        status: 'completed',
        processed_url: processedUrl,
        processing_time_ms: processingTimeMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    if (updateError) {
      throw new Error(`Failed to update completion status: ${updateError.message}`);
    }

    console.log(`🎉 [ProcessRoute] Complete pipeline finished for ${imageId} in ${processingTimeMs}ms`);
    
    return {
      id: imageId,
      status: 'completed',
      message: 'Image processed successfully',
      processedUrl,
      processingTimeMs,
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`❌ [ProcessRoute] Pipeline failed for ${imageId} after ${processingTimeMs}ms:`, error);
    
    // Update status to failed
    await supabase
      .from('processed_images')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTimeMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    throw error;
  }
}

/**
 * Upload processed image to Supabase storage
 */
async function uploadProcessedImageToStorage(
  buffer: Buffer,
  imageId: string,
  supabase: any
): Promise<string> {
  const fileName = `processed-${imageId}-${Date.now()}.png`;
  const filePath = `${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from('processed-images')
    .upload(filePath, buffer, {
      contentType: 'image/png', // Processed images are always PNG
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('processed-images')
    .getPublicUrl(data.path);

  return publicUrl;
}
