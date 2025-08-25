"use client";

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Toaster } from 'react-hot-toast';
import HeaderSimple from '@/components/HeaderSimple';
import ImageUpload from '@/features/backgroundRemover/components/ImageUpload';
import ImageResult from '@/features/backgroundRemover/components/ImageResult';
import SampleImages from '@/features/backgroundRemover/components/SampleImages';
import { useImageUpload } from '@/features/backgroundRemover/hooks/useImageUpload';

interface UploadedImage {
  id: string;
  status: string;
  originalUrl: string;
}

export default function Page() {
  const [sessionId, setSessionId] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Initialize session ID on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('background-remover-session');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = uuidv4();
      localStorage.setItem('background-remover-session', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  const handleUploadSuccess = (result: UploadedImage) => {
    setUploadedImages(prev => [result, ...prev]);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleImageDelete = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Use the shared upload hook
  const { uploadFile, isUploading } = useImageUpload({
    sessionId,
    onUploadSuccess: handleUploadSuccess,
    onUploadError: handleUploadError,
  });

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'oklch(var(--b1))',
            color: 'oklch(var(--bc))',
            border: '1px solid oklch(var(--b3))',
          },
        }}
      />

      <HeaderSimple />

      <main className="min-h-screen bg-base-50">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                Remove Backgrounds
                <span className="text-primary"> Instantly</span>
              </h2>
              <p className="text-xl md:text-2xl text-base-content/70 max-w-2xl mx-auto">
                Upload any image and get a professionally processed result with background removed and horizontally flipped in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm">
              <div className="flex flex-col items-center gap-2 p-4 bg-base-100 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                </div>
                <span className="font-semibold">AI-Powered</span>
                <span className="text-base-content/60 text-center">Advanced machine learning removes backgrounds with precision</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 p-4 bg-base-100 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-semibold">Lightning Fast</span>
                <span className="text-base-content/60 text-center">Get your processed image in under 10 seconds</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 p-4 bg-base-100 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-semibold">Secure & Private</span>
                <span className="text-base-content/60 text-center">Your images are automatically deleted after 24 hours</span>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <ImageUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              sessionId={sessionId}
              disabled={isUploading}
            />
            
            <SampleImages
              onSampleSelect={uploadFile}
              disabled={isUploading}
            />
          </div>
        </section>

        {/* Results Section */}
        {uploadedImages.length > 0 && (
          <section className="py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <h3 className="text-2xl font-bold text-center">Your Images</h3>
              <div className="space-y-6">
                {uploadedImages.map((image) => (
                  <ImageResult
                    key={image.id}
                    imageId={image.id}
                    onDelete={() => handleImageDelete(image.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="py-16 px-4 bg-base-100">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  1
                </div>
                <h4 className="font-semibold">Upload Image</h4>
                <p className="text-sm text-base-content/70">Choose any image file up to 50MB</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  2
                </div>
                <h4 className="font-semibold">AI Processing</h4>
                <p className="text-sm text-base-content/70">Our AI removes the background automatically</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  3
                </div>
                <h4 className="font-semibold">Horizontal Flip</h4>
                <p className="text-sm text-base-content/70">Image is automatically flipped horizontally</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                  4
                </div>
                <h4 className="font-semibold">Download</h4>
                <p className="text-sm text-base-content/70">Get your processed image instantly</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-base-200 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <svg 
                fill="white" 
                viewBox="0 0 24 24" 
                className="w-4 h-4"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold">Background Remover</span>
          </div>
          <p className="text-sm text-base-content/70">
            Made with ❤️ using Next.js, Supabase, and AI
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <span>Free to use</span>
            <span>•</span>
            <span>No registration required</span>
            <span>•</span>
            <span>Images auto-deleted after 24h</span>
          </div>
        </div>
      </footer>
    </>
  );
}
