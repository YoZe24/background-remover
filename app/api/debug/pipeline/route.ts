import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Pipeline Debug] Starting pipeline test...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        error: 'No file provided for testing'
      }, { status: 400 });
    }
    
    const startTime = Date.now();
    const imageProcessor = new ImageProcessor();
    
    // Test 1: File validation
    console.log('🔍 [Pipeline Debug] Test 1: File validation');
    const validation = imageProcessor.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({
        error: 'File validation failed',
        details: validation.error
      }, { status: 400 });
    }
    console.log('✅ [Pipeline Debug] File validation passed');
    
    // Test 2: Buffer conversion
    console.log('🔍 [Pipeline Debug] Test 2: Buffer conversion');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`✅ [Pipeline Debug] Buffer created: ${buffer.length} bytes`);
    
    // Test 3: Metadata extraction
    console.log('🔍 [Pipeline Debug] Test 3: Metadata extraction');
    const metadata = await imageProcessor.getImageMetadata(buffer);
    console.log(`✅ [Pipeline Debug] Metadata extracted:`, metadata);
    
    // Test 4: Storage upload (inline since ImageProcessor no longer does uploads)
    console.log('🔍 [Pipeline Debug] Test 4: Storage upload');
    const supabase = createServiceClient();
    const uploadData = imageProcessor.prepareUploadData('debug-test', 'processed-images');
    
    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('processed-images')
      .upload(uploadData.filePath, buffer, {
        contentType: uploadData.contentType,
        upsert: false,
      });
    
    if (uploadError) {
      return NextResponse.json({
        error: 'Storage upload failed',
        details: uploadError.message
      }, { status: 500 });
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('processed-images')
      .getPublicUrl(uploadResult.path);
    
    const finalUploadResult = { url: publicUrl, path: uploadResult.path };
    console.log(`✅ [Pipeline Debug] Upload successful:`, finalUploadResult);
    
    // Test 5: Database operations
    console.log('🔍 [Pipeline Debug] Test 5: Database operations');
    const testRecord = {
      original_filename: file.name,
      original_url: finalUploadResult.url,
      processed_url: '',
      status: 'pending' as const,
      error_message: '',
      file_size: file.size,
      dimensions: metadata,
      processing_time_ms: 0,
      user_session_id: 'debug-test',
      expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute expiry
    };
    
    const { data: insertedRecord, error: insertError } = await supabase
      .from('processed_images')
      .insert(testRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ [Pipeline Debug] Database insert failed:', insertError);
      return NextResponse.json({
        error: 'Database insert failed',
        details: insertError.message
      }, { status: 500 });
    }
    
    console.log(`✅ [Pipeline Debug] Database insert successful:`, insertedRecord.id);
    
    // Test 6: Database update
    console.log('🔍 [Pipeline Debug] Test 6: Database update');
          const { error: updateError } = await supabase
        .from('processed_images')
        .update({
          status: 'completed',
          processed_url: finalUploadResult.url,
        processing_time_ms: Date.now() - startTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', insertedRecord.id);
    
    if (updateError) {
      console.error('❌ [Pipeline Debug] Database update failed:', updateError);
      return NextResponse.json({
        error: 'Database update failed',
        details: updateError.message
      }, { status: 500 });
    }
    
    console.log(`✅ [Pipeline Debug] Database update successful`);
    
    // Test 7: Cleanup
    console.log('🔍 [Pipeline Debug] Test 7: Cleanup');
    await supabase.storage.from('processed-images').remove([finalUploadResult.path]);
    await supabase
      .from('processed_images')
      .delete()
      .eq('id', insertedRecord.id);
    
    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Pipeline Debug] All tests passed in ${totalTime}ms`);
    
    return NextResponse.json({
      status: 'success',
      message: 'All pipeline tests passed',
      details: {
        fileSize: file.size,
        metadata,
        uploadUrl: finalUploadResult.url,
        recordId: insertedRecord.id,
        totalTimeMs: totalTime,
        timestamp: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error('❌ [Pipeline Debug] Unexpected error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Pipeline test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    }, { status: 500 });
  }
}
