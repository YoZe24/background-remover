import Link from 'next/link';

export default function HeaderSimple() {
  return (
    <header className="border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg 
                fill="white" 
                viewBox="0 0 24 24" 
                className="w-5 h-5"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Background Remover</h1>
          </Link>
          <div className="text-sm text-base-content/70">
            Free • AI-Powered • Instant
          </div>
        </div>
      </div>
    </header>
  );
}
