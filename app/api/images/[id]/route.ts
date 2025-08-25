import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/libs/supabase/server';

export async function GET(
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
    
    const { data, error } = await supabase
      .from('processed_images')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Return processing status and results
    return NextResponse.json({
      id: data.id,
      status: data.status,
      originalUrl: data.original_url,
      processedUrl: data.processed_url,
      error: data.error_message,
      processingTimeMs: data.processing_time_ms,
      dimensions: data.dimensions,
      fileSize: data.file_size,
      originalFilename: data.original_filename,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check image status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const supabase = createServiceClient(); // Use service client for DELETE operations
    
    // Get image record first
    const { data, error: fetchError } = await supabase
      .from('processed_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Extract file paths from URLs for deletion
    const originalPath = data.original_url.split('/').pop();
    const processedPath = data.processed_url?.split('/').pop();

    // Delete from database first
    const { error: deleteError } = await supabase
      .from('processed_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image record' },
        { status: 500 }
      );
    }

    // Delete files from storage (best effort - don't fail if this fails)
    try {
      if (originalPath) {
        await supabase.storage
          .from('original-images')
          .remove([originalPath]);
      }

      if (processedPath) {
        await supabase.storage
          .from('processed-images')
          .remove([processedPath]);
      }
    } catch (storageError) {
      console.error('Storage cleanup error:', storageError);
      // Don't fail the request for storage cleanup errors
    }

    return NextResponse.json({
      message: 'Image deleted successfully',
      id,
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
