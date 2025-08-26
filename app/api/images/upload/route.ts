import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient, createServiceClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';
import type { ProcessedImage } from '@/features/backgroundRemover/types/image';

// Configure maximum file size for uploads (50MB)
export const maxDuration = 30; // 30 seconds max execution time

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

    // Initialize image processor
    const imageProcessor = new ImageProcessor();

    // Validate file
    const validation = imageProcessor.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`📝 [Upload] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Get image metadata
    const metadata = await imageProcessor.getImageMetadata(buffer);
    console.log(`📊 [Upload] Image metadata:`, { 
      width: metadata.width, 
      height: metadata.height, 
      format: metadata.format, 
      size: metadata.size 
    });

    // Upload original image to storage
    const { url: originalUrl, path: originalPath } = await uploadOriginalImageToStorage(
      buffer,
      file.name
    );

    // Create database record
    const supabase = createServiceClient(); // Use service client for database INSERT
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
      // Cleanup uploaded file
      await deleteOriginalImageFromStorage(originalPath);
      
      return NextResponse.json(
        { error: 'Failed to create image record' },
        { status: 500 }
      );
    }

    // Return immediate response with tracking ID
    return NextResponse.json({
      id: data.id,
      status: 'pending',
      message: 'Image uploaded successfully. Processing will start automatically.',
      originalUrl,
      sessionId,
    });

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

/**
 * Upload original image to Supabase storage
 */
async function uploadOriginalImageToStorage(
  buffer: Buffer,
  originalFilename: string
): Promise<{ url: string; path: string }> {
  const supabase = await createClient();
  const fileExt = originalFilename.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${Date.now()}-${fileName}`;

  // Map file extensions to proper MIME types
  const getMimeType = (ext: string): string => {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/png'; // fallback
    }
  };

  const contentType = getMimeType(fileExt);
  console.log(`☁️ [Storage] Uploading: ${filePath} (ext: ${fileExt}, contentType: ${contentType})`);

  const { data, error } = await supabase.storage
    .from('original-images')
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('original-images')
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * Delete original image from storage
 */
async function deleteOriginalImageFromStorage(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from('original-images').remove([path]);

  if (error) {
    console.error(`Failed to delete file from storage: ${error.message}`);
    // Don't throw error for cleanup operations
  }
}
