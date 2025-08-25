import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/libs/supabase/server';
import HeaderSimple from '@/components/HeaderSimple';
import type { ProcessedImageResponse } from '@/features/backgroundRemover/types/image';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPublicImage(id: string): Promise<ProcessedImageResponse | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('processed_images')
      .select('*')
      .eq('id', id)
      .eq('status', 'completed') // Only show completed images
      .single();

    if (error || !data) {
      return null;
    }

    return {
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
      userSessionId: data.user_session_id,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('Error fetching public image:', error);
    return null;
  }
}

function DownloadButton({ imageData }: { imageData: ProcessedImageResponse }) {
  return (
    <a
      href={imageData.processedUrl!}
      download={`processed-${imageData.originalFilename || 'image'}.png`}
      className="btn btn-primary btn-lg gap-3 shadow-lg hover:shadow-xl transition-all duration-200"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-4-4m4 4l4-4M6 20h12" />
      </svg>
      Download
    </a>
  );
}

function ImageDisplay({ imageData }: { imageData: ProcessedImageResponse }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative w-full max-h-[70vh] bg-gradient-to-br from-base-200 to-base-300 rounded-2xl overflow-hidden shadow-xl">
        <Image
          src={imageData.processedUrl!}
          alt="Background removed image"
          width={imageData.dimensions?.width || 800}
          height={imageData.dimensions?.height || 800}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
    </div>
  );
}

export default async function HostImagePage({ params }: PageProps) {
  const { id } = await params;
  const imageData = await getPublicImage(id);

  if (!imageData || !imageData.processedUrl) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-base-100">
      <HeaderSimple />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Background Removed Image</h1>
          <p className="text-base-content/70">
            Shared on {new Date(imageData.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Image Display */}
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        }>
          <ImageDisplay imageData={imageData} />
        </Suspense>

        {/* Download Section */}
        <div className="text-center mt-8">
          <DownloadButton imageData={imageData} />
          <p className="text-sm text-base-content/60 mt-4">
            {imageData.originalFilename} • {Math.round(imageData.fileSize / 1024)} KB
            {imageData.dimensions && (
              <> • {imageData.dimensions.width} × {imageData.dimensions.height}</>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-base-300">
          <p className="text-base-content/50 text-sm">
            Powered by Background Remover
          </p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const imageData = await getPublicImage(id);

  if (!imageData) {
    return {
      title: 'Image Not Found',
      description: 'The requested image could not be found.',
    };
  }

  return {
    title: imageData.originalFilename,
    description: 'Background removed image - transparent PNG ready for download.',
    openGraph: {
      title: imageData.originalFilename,
      description: 'Background removed image - transparent PNG ready for download.',
      images: [
        {
          url: imageData.processedUrl!,
          width: imageData.dimensions?.width || 800,
          height: imageData.dimensions?.height || 800,
          alt: 'Background removed image',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: imageData.originalFilename,
      description: 'Background removed image - transparent PNG ready for download.',
      images: [imageData.processedUrl!],
    },
  };
}
