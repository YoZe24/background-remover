import Link from 'next/link';
import HeaderSimple from '@/components/HeaderSimple';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-100">
      <HeaderSimple />

      <div className="flex-1 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-20 h-20 mx-auto mb-6 text-base-content/20">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.5" 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-3 text-base-content/80">Image Not Found</h1>
        <p className="text-base-content/60 mb-8 max-w-sm mx-auto">
          This image doesn&apos;t exist or has been removed.
        </p>
        
        <Link href="/" className="btn btn-primary shadow-lg hover:shadow-xl transition-all duration-200">
          Back to Home
        </Link>
      </div>
      </div>
    </div>
  );
}
