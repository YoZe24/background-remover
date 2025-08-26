import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/libs/supabase/server';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { imageId, status, updates } = await request.json();
    
    if (!imageId || !status) {
      return NextResponse.json({
        error: 'Missing imageId or status'
      }, { status: 400 });
    }
    
    console.log(`🔍 [DB Debug] Testing update for ${imageId} to status: ${status}`);
    
    const startTime = Date.now();
    
    // Create service client
    console.log(`🔧 [DB Debug] Creating service client...`);
    const supabase = createServiceClient();
    console.log(`✅ [DB Debug] Service client created`);
    
    // Prepare update data
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...updates,
    };
    
    console.log(`📊 [DB Debug] Update data:`, updateData);
    
    // Try the update with timeout
    const updatePromise = supabase
      .from('processed_images')
      .update(updateData)
      .eq('id', imageId)
      .select('id, status, updated_at');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database update timeout after 15 seconds'));
      }, 15000);
    });
    
    console.log(`🔄 [DB Debug] Executing update...`);
    const result = await Promise.race([updatePromise, timeoutPromise]) as any;
    
    const endTime = Date.now();
    
    if (result.error) {
      console.error(`❌ [DB Debug] Update error:`, result.error);
      return NextResponse.json({
        status: 'error',
        message: 'Database update failed',
        error: result.error.message,
        duration: endTime - startTime,
      }, { status: 500 });
    }
    
    console.log(`✅ [DB Debug] Update successful:`, result.data);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database update successful',
      data: result.data,
      duration: endTime - startTime,
    });
    
  } catch (error) {
    console.error(`❌ [DB Debug] Unexpected error:`, error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error during database update',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET method to find existing records for testing
export async function GET() {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('processed_images')
      .select('id, status, original_filename, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch records',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'success',
      records: data,
      message: `Found ${data?.length || 0} recent records`
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
