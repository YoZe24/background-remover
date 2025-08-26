import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/libs/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Debug] Starting Supabase connection test...');
    
    // Test service client connection
    const supabase = createServiceClient();
    
    // Test basic connection with a simple query
    const { data, error } = await supabase
      .from('processed_images')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ [Debug] Supabase connection error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
        details: {
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          timestamp: new Date().toISOString(),
        }
      }, { status: 500 });
    }
    
    console.log('✅ [Debug] Supabase connection successful');
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      details: {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      }
    });
    
  } catch (error) {
    console.error('❌ [Debug] Unexpected error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error during connection test',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}
