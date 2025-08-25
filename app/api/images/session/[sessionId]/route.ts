import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      );
    }

    // Transform data for client
    const images = data.map(image => ({
      id: image.id,
      status: image.status,
      originalFilename: image.original_filename,
      originalUrl: image.original_url,
      processedUrl: image.processed_url,
      error: image.error_message,
      processingTimeMs: image.processing_time_ms,
      dimensions: image.dimensions,
      fileSize: image.file_size,
      createdAt: image.created_at,
      updatedAt: image.updated_at,
    }));

    return NextResponse.json({
      sessionId,
      images,
      total: images.length,
    });

  } catch (error) {
    console.error('Session images fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session images' },
      { status: 500 }
    );
  }
}
