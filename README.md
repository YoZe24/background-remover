# Background Remover ✨

AI-powered background removal tool built with Next.js, Supabase, and modern web technologies. Upload any image and get a professionally processed result with background removed and horizontally flipped in seconds.

## 🚀 Features

- **AI-Powered Background Removal**: Uses advanced machine learning to remove backgrounds with precision
- **Horizontal Flipping**: Automatically flips processed images horizontally
- **Drag & Drop Upload**: Intuitive file upload with progress tracking
- **Real-time Processing**: Live status updates and instant results
- **Modern UI**: Beautiful, responsive design with DaisyUI and TailwindCSS
- **File Management**: Automatic cleanup after 24 hours
- **No Registration Required**: Start using immediately

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+ with App Router, TypeScript, TailwindCSS v4, DaisyUI v5
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Storage)
- **Image Processing**: Sharp, Remove.bg API
- **Deployment**: Vercel
- **Notifications**: React Hot Toast

## 📋 Requirements

- Node.js 18+
- Supabase account
- Remove.bg API key (free tier: 50 API calls/month)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/background-remover.git
cd background-remover
npm install
```

### 2. Environment Setup
Create a `.env.local` file:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Background Removal Service
REMOVE_BG_API_KEY=your_remove_bg_api_key

# Development
NODE_ENV=development
```

### 3. Database Setup
1. Create a new Supabase project
2. Run the SQL from `database/schema.sql` in your Supabase SQL editor
3. Verify storage buckets are created

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 📁 Project Structure

```
background-remover/
├── app/
│   ├── api/
│   │   └── images/
│   │       ├── upload/route.ts      # Image upload endpoint
│   │       ├── [id]/route.ts        # Get/delete image by ID
│   │       └── session/[sessionId]/ # Get images by session
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main page
├── components/
│   ├── ImageUpload.tsx              # Upload component
│   └── ImageResult.tsx              # Result display component
├── libs/
│   ├── image-processor.ts           # Image processing service
│   ├── background-removal.ts        # Background removal service
│   └── supabase/                    # Supabase client setup
├── types/
│   └── image.ts                     # TypeScript types
├── database/
│   └── schema.sql                   # Database schema
└── DEPLOYMENT.md                    # Deployment guide
```

## 🎯 How It Works

1. **Upload**: User uploads an image via drag & drop or file selection
2. **Processing**: 
   - Image is validated and stored in Supabase
   - Background removal using AI (Remove.bg API)
   - Horizontal flip using Sharp
   - Final image stored and made available
3. **Download**: User receives processed image with download link
4. **Cleanup**: Images automatically deleted after 24 hours

## 🔧 Configuration Options

### Background Removal Services
- **Remove.bg** (default): 50 free API calls per month
- **Clipdrop**: Alternative service (set `CLIPDROP_API_KEY`)
- **Development Mode**: Mock processing without API calls

### Processing Limits
- Maximum file size: 50MB
- Supported formats: JPEG, PNG, WebP, GIF
- Processing timeout: 30 seconds
- Maximum dimensions: 4096×4096 pixels

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Vercel and Supabase.

### Quick Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/background-remover)

## 🔒 Security Features

- **Row Level Security (RLS)**: Enabled on all database tables
- **File Validation**: Server-side file type and size validation
- **Automatic Cleanup**: Images deleted after 24 hours
- **Environment Variables**: Secure API key management

## 📊 Performance

- **Upload Progress**: Real-time upload progress tracking
- **Lazy Loading**: Images loaded on demand
- **Optimized Images**: WebP format support, proper sizing
- **CDN**: Global content delivery via Vercel

## 🐛 Troubleshooting

### Common Issues

1. **Upload fails**: Check file size (<50MB) and format
2. **Processing stuck**: Verify Remove.bg API key and quota
3. **Images not displaying**: Check Supabase storage permissions

### Development Mode
Set `NODE_ENV=development` to enable mock processing without API calls.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Remove.bg** for providing the background removal API
- **Supabase** for the backend infrastructure
- **Vercel** for seamless deployment
- **ShipFast** for the initial boilerplate structure

## 📞 Support

- Create an [issue](https://github.com/your-username/background-remover/issues) for bug reports
- Check the [deployment guide](./DEPLOYMENT.md) for setup help
- Review the code for implementation details

## 🔄 Roadmap

- [ ] User authentication and image history
- [ ] Batch processing for multiple images
- [ ] Additional image effects and filters
- [ ] Premium features and monetization
- [ ] Mobile app version
- [ ] API rate limiting and usage analytics

---

Made with ❤️ using Next.js, Supabase, and AI