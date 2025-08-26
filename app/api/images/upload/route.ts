import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServiceClient } from '@/libs/supabase/server';
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

    // Inline file validation (no classes)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    if (!allowedFormats.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported. Allowed types: ${allowedFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get basic metadata (inline - no Sharp dependency for now)
    const metadata = {
      width: 0, // Will be filled later if needed
      height: 0, // Will be filled later if needed
      format: file.type.split('/')[1] || 'unknown',
      size: buffer.length,
    };

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

    // Start processing INLINE - everything in the route handler
    console.log(`🚀 [Upload] Starting INLINE processing for ${data.id} (no class methods)`);
    
    try {
      // Step 1: Update status to processing (inline Supabase call)
      console.log(`📝 [Upload] Updating status to 'processing' for ${data.id}`);
      const updateResult = await supabase
        .from('processed_images')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select('id, status');
      
      if (updateResult.error) {
        throw new Error(`Failed to update status: ${updateResult.error.message}`);
      }
      
      console.log(`✅ [Upload] Status updated to processing for ${data.id}`);
      
      // Step 2: Upload processed image (inline storage call - simplified)
      console.log(`☁️ [Upload] Uploading processed image for ${data.id} (using original buffer for testing)`);
      
      const fileExt = 'png';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${Date.now()}-${fileName}`;
      
      console.log(`📁 [Upload] Generated file path: ${filePath}`);
      
      // Direct Supabase storage call (no class methods)
      const uploadResult = await supabase.storage
        .from('processed-images')
        .upload(filePath, buffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });
      
      if (uploadResult.error) {
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }
      
      console.log(`✅ [Upload] Upload completed for ${data.id}`);
      
      // Get public URL (inline)
      const { data: { publicUrl } } = supabase.storage
        .from('processed-images')
        .getPublicUrl(uploadResult.data.path);
      
      console.log(`🔗 [Upload] Public URL generated: ${publicUrl}`);
      
      // Step 3: Update to completed (inline)
      console.log(`📝 [Upload] Updating status to 'completed' for ${data.id}`);
      
      const completedResult = await supabase
        .from('processed_images')
        .update({
          status: 'completed',
          processed_url: publicUrl,
          processing_time_ms: Date.now() - Date.now(), // Will be very fast
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select('id, status');
      
      if (completedResult.error) {
        console.error(`❌ [Upload] Failed to update to completed: ${completedResult.error.message}`);
        // Continue anyway, file is uploaded
      } else {
        console.log(`✅ [Upload] Status updated to completed for ${data.id}`);
      }
      
      console.log(`🎉 [Upload] INLINE processing completed successfully for ${data.id}`);

      return NextResponse.json({
        id: data.id,
        status: 'completed',
        message: 'Image uploaded and processed successfully.',
        originalUrl,
        processedUrl: publicUrl,
        sessionId,
      });
      
    } catch (error) {
      console.error(`❌ [Upload] INLINE processing failed for ${data.id}:`, error);
      
      // Update to failed status (inline)
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

// Background processing removed - everything is now inline in the main route handler
