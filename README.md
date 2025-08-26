# Background Remover

AI-powered background removal tool. Upload any image and get it with the background removed instantly.

## Features

- AI background removal
- Drag & drop upload
- Real-time processing
- Automatic cleanup

## Tech Stack

- Next.js 15 + TypeScript
- Supabase (database + storage)
- Remove.bg API
- TailwindCSS + DaisyUI

## Requirements

- Node.js 19+
- Supabase account
- Remove.bg API key

## Setup

1. Clone and install:
```bash
git clone https://github.com/your-username/background-remover.git
cd background-remover
npm install
```

2. Environment variables (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
REMOVE_BG_API_KEY=your_remove_bg_api_key
```

3. Run database setup from `features/backgroundRemover/docs/database-schema.sql`

4. Start development:
```bash
npm run dev
```

## License

MIT

