import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServiceClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';
import { BackgroundRemovalService } from '@/features/backgroundRemover/libs/background-removal';
import type { ProcessedImage } from '@/features/backgroundRemover/types/image';

// Configure maximum file size for uploads (50MB)
export const maxDuration = 60; // 60 seconds max execution time for Vercel Pro
export const runtime = 'nodejs'; // Ensure we're using Node.js runtime

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string || uuidv4();

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Initialize services
    const imageProcessor = new ImageProcessor();
    const backgroundRemoval = new BackgroundRemovalService();

    // Validate file
    const validation = imageProcessor.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate background removal service
    const serviceValidation = backgroundRemoval.validateConfig();
    if (!serviceValidation.valid) {
      return NextResponse.json(
        { error: `Service configuration error: ${serviceValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get image metadata using ImageProcessor
    const metadata = await imageProcessor.getImageMetadata(buffer);

    // Upload original image to storage (inline)
    const supabase = createServiceClient();
    const originalFileExt = file.type.split('/')[1] || 'png';
    const originalFileName = `${uuidv4()}.${originalFileExt}`;
    const originalFilePath = `${Date.now()}-${originalFileName}`;

    const { data: originalData, error: originalError } = await supabase.storage
      .from('original-images')
      .upload(originalFilePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (originalError) {
      return NextResponse.json(
        { error: `Failed to upload original image: ${originalError.message}` },
        { status: 500 }
      );
    }

    // Get public URL for original
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('original-images')
      .getPublicUrl(originalData.path);

    const originalPath = originalData.path;

    // Create database record
    const imageRecord: Omit<ProcessedImage, 'id' | 'created_at' | 'updated_at'> = {
      original_filename: file.name,
      original_url: originalUrl,
      processed_url: null,
      status: 'pending',
      error_message: null,
      file_size: file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      processing_time_ms: null,
      user_session_id: sessionId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data, error } = await supabase
      .from('processed_images')
      .insert(imageRecord)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      // Cleanup uploaded file (inline)
      try {
        await supabase.storage.from('original-images').remove([originalPath]);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Failed to create image record' },
        { status: 500 }
      );
    }

    // Process EVERYTHING synchronously before returning response
    console.log(`🚀 [Upload] Starting SYNCHRONOUS processing for ${data.id}`);
    
    try {
      // Step 1: Update status to processing
      console.log(`📝 [Upload] Updating status to 'processing' for ${data.id}`);
      const { error: statusError } = await supabase
        .from('processed_images')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      
      if (statusError) {
        throw new Error(`Failed to update status: ${statusError.message}`);
      }
      
      console.log(`✅ [Upload] Status updated to processing for ${data.id}`);
      
      // Step 2: Process image (ImageProcessor returns data, no external calls)
      console.log(`🔄 [Upload] Starting image processing for ${data.id}`);
      const processingResult = await imageProcessor.processImage(
        buffer,
        data.id,
        (buffer) => backgroundRemoval.removeBackground(buffer)
      );
      
      console.log(`✅ [Upload] Image processing completed for ${data.id}`);
      
      // Step 3: Upload processed image
      console.log(`☁️ [Upload] Uploading processed image for ${data.id}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('processed-images')
        .upload(processingResult.uploadData.filePath, processingResult.processedBuffer, {
          contentType: processingResult.uploadData.contentType,
          upsert: false,
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('processed-images')
        .getPublicUrl(uploadData.path);
      
      console.log(`✅ [Upload] Upload completed for ${data.id}: ${publicUrl}`);
      
      // Step 4: Update to completed
      console.log(`📝 [Upload] Updating status to 'completed' for ${data.id}`);
      const { error: completedError } = await supabase
        .from('processed_images')
        .update({
          status: 'completed',
          processed_url: publicUrl,
          processing_time_ms: processingResult.processingTimeMs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      
      if (completedError) {
        console.error(`❌ [Upload] Failed to update to completed: ${completedError.message}`);
        // Continue anyway, processing succeeded
      }
      
      console.log(`🎉 [Upload] Successfully processed image ${data.id} - returning completed response`);
      
      // Return response with completed processing
      return NextResponse.json({
        id: data.id,
        status: 'completed',
        message: 'Image uploaded and processed successfully.',
        originalUrl,
        processedUrl: publicUrl,
        sessionId,
        processingTimeMs: processingResult.processingTimeMs,
      });
      
    } catch (error) {
      console.error(`❌ [Upload] Synchronous processing failed for ${data.id}:`, error);
      
      // Update to failed status
      try {
        await supabase
          .from('processed_images')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);
      } catch (updateError) {
        console.error(`❌ [Upload] Failed to update failed status: ${updateError}`);
      }
      
      return NextResponse.json({
        id: data.id,
        status: 'failed',
        message: 'Image uploaded but processing failed.',
        originalUrl,
        sessionId,
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload image'
      },
      { status: 500 }
    );
  }
}

// All processing is now SYNCHRONOUS - no background processing function needed
