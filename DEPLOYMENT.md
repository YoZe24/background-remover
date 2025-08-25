# Background Remover - Deployment Guide

## 🚀 Quick Start

This guide will help you deploy your Background Remover application to production using Vercel and Supabase.

## 📋 Prerequisites

- [Vercel account](https://vercel.com)
- [Supabase account](https://supabase.com)
- [Remove.bg API key](https://www.remove.bg/api) (free tier: 50 API calls/month)
- Git repository (GitHub, GitLab, or Bitbucket)

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for project creation (2-3 minutes)

### 2. Set up Database Schema
1. Go to the "SQL Editor" in your Supabase dashboard
2. Copy and paste the contents of `database/schema.sql`
3. Click "Run" to execute the SQL

### 3. Configure Storage
The schema script already creates the necessary storage buckets and policies. Verify in the "Storage" section that you have:
- `original-images` bucket (public)
- `processed-images` bucket (public)

### 4. Get API Keys
1. Go to "Settings" → "API"
2. Copy your:
   - Project URL
   - Anon public key
   - Service role key (keep this secret!)

## 🔑 Background Removal Service Setup

### Option 1: Remove.bg (Recommended)
1. Go to [Remove.bg API](https://www.remove.bg/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier: 50 API calls per month

### Option 2: Clipdrop (Alternative)
1. Go to [Clipdrop API](https://clipdrop.co/apis)
2. Sign up and get your API key
3. Update the service configuration in your environment

## 🌐 Deployment to Vercel

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Choose "Next.js" framework preset

### 2. Configure Environment Variables
In your Vercel project settings, add these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Background Removal Service
REMOVE_BG_API_KEY=your_remove_bg_api_key

# Production Environment
NODE_ENV=production
```

### 3. Deploy
1. Click "Deploy"
2. Wait for deployment to complete (2-3 minutes)
3. Visit your deployed application

## ⚙️ Configuration Options

### Background Removal Services
You can configure different background removal services by setting environment variables:

- **Remove.bg**: Set `REMOVE_BG_API_KEY`
- **Clipdrop**: Set `CLIPDROP_API_KEY`
- **Development Mode**: No API key needed (uses mock processing)

### Performance Tuning
For production, consider these optimizations:

1. **Image Limits**: Current limit is 50MB per image
2. **Processing Timeout**: 30 seconds max
3. **Storage Cleanup**: Images auto-deleted after 24 hours

### Custom Domain
1. In Vercel dashboard, go to "Domains"
2. Add your custom domain
3. Update `domainName` in `config.ts`

## 🔧 Local Development

### 1. Clone Repository
```bash
git clone your-repo-url
cd background-remover
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REMOVE_BG_API_KEY=your_remove_bg_api_key
NODE_ENV=development
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 📊 Monitoring & Analytics

### Error Monitoring
- Check Vercel function logs in the dashboard
- Monitor Supabase logs for database errors
- Set up error tracking (optional: Sentry integration)

### Usage Analytics
- Vercel Analytics (built-in)
- Supabase Analytics for database usage
- Monitor API usage for background removal service

## 🔒 Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use Vercel environment variables for secrets
- Rotate API keys regularly

### Rate Limiting
- Current setup has no rate limiting
- Consider implementing rate limiting for production
- Monitor API usage to prevent quota exhaustion

### CORS & CSP
- Supabase CORS is configured for your domain
- Update Supabase settings if using custom domain

## 📈 Scaling Considerations

### For Higher Traffic
1. **Background Processing**: Consider queue-based processing for high volume
2. **CDN**: Vercel provides global CDN automatically
3. **Database**: Supabase scales automatically
4. **Storage**: Monitor Supabase storage usage

### Cost Optimization
1. **Image Cleanup**: Implemented automatic cleanup after 24 hours
2. **API Usage**: Monitor background removal API costs
3. **Storage**: Optimize image formats and sizes

## 🐛 Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size (max 50MB)
   - Verify Supabase storage policies
   - Check network connectivity

2. **Processing Fails**
   - Verify background removal API key
   - Check API quota limits
   - Monitor function timeout (30s limit)

3. **Images Not Displaying**
   - Check Supabase storage bucket permissions
   - Verify public access policies
   - Check CORS configuration

### Debug Mode
Set `NODE_ENV=development` to enable:
- Detailed error logging
- Mock background removal (no API calls)
- Extended timeouts

## 📞 Support

- Check [GitHub Issues](your-github-repo/issues) for common problems
- Review Vercel deployment logs
- Check Supabase project logs
- Verify API service status

## 🚀 Production Checklist

Before going live:

- [ ] Database schema deployed to Supabase
- [ ] Storage buckets created with correct policies
- [ ] Environment variables configured in Vercel
- [ ] Background removal API key tested
- [ ] Custom domain configured (optional)
- [ ] Error monitoring set up
- [ ] Performance testing completed
- [ ] Security review done

## 📝 Next Steps

After deployment:
1. Test the full upload → process → download flow
2. Monitor API usage and costs
3. Set up alerts for quota limits
4. Consider premium features for monetization
5. Implement user authentication (if needed)

## 🔄 Updates & Maintenance

- Monitor background removal service updates
- Keep Next.js and dependencies updated
- Regular backup of Supabase data
- Review and rotate API keys quarterly
