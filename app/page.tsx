"use client";

import HeaderSimple from '@/components/HeaderSimple';
import { BackgroundRemover } from '@/features/backgroundRemover';

export default function Page() {
  return (
    <>
      <HeaderSimple />

      <main className="min-h-screen bg-base-50">
        {/* Hero Section */}
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Remove Backgrounds
                <span className="text-primary"> Instantly</span>
              </h2>
              <p className="text-base md:text-lg text-base-content/70 max-w-2xl mx-auto">
                Upload any image for instant AI background removal and horizontal flip processing.
              </p>
            </div>
          </div>
        </section>

        {/* Background Remover Section */}
        <section className="px-4 pb-8">
          <BackgroundRemover />
        </section>

        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h3 className="text-3xl font-bold text-center mb-12">Why Choose Us</h3>
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