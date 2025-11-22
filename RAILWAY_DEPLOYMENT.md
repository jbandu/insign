# Railway Deployment Guide for InSign

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI installed (optional, for CLI deployment)
3. GitHub repository connected

## Deployment Options

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Create a New Project**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your `insign` repository
   - Railway will auto-detect Next.js

2. **Configure Environment Variables**

   Go to your project → Variables tab and add:

   **Database (Required)**
   ```
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```

   **Authentication (Required)**
   ```
   AUTH_SECRET=<generate with: openssl rand -base64 32>
   NEXTAUTH_SECRET=<same as AUTH_SECRET>
   NEXTAUTH_URL=https://your-app.railway.app
   NEXT_PUBLIC_APP_URL=https://your-app.railway.app
   ```

   **Blob Storage (Required for file uploads)**

   Option A - Keep using Vercel Blob:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
   ```

   Option B - Use Railway Volume (requires code changes):
   - Mount a volume at `/app/uploads`
   - Update file upload logic to use local file system

   **Email (Required for signature notifications)**
   ```
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=Insign <onboarding@resend.dev>
   ```

   **App Configuration**
   ```
   NEXT_PUBLIC_APP_NAME=Insign
   NODE_ENV=production
   ```

3. **Deploy**
   - Click "Deploy"
   - Railway will build and deploy automatically
   - You'll get a URL like: `https://your-app.railway.app`

4. **Set up Custom Domain (Optional)**
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Link to GitHub (if not done)**
   ```bash
   railway link
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set AUTH_SECRET=<your-secret>
   railway variables set DATABASE_URL=<your-database-url>
   # ... set all other variables
   ```

6. **Deploy**
   ```bash
   railway up
   ```

## Database Migration

After deployment, you'll need to run database migrations:

### Option 1: Using Railway CLI
```bash
railway run npm run db:migrate
```

### Option 2: Using Railway Dashboard
1. Go to your project
2. Click on the service
3. Go to "Settings" → "Deploy Triggers"
4. Add a deploy command: `npm run db:migrate`

Or manually trigger via the "Deployments" tab using the "Run Command" feature.

## Important Notes

### 1. **Database Considerations**

If migrating from Vercel Postgres to Railway:
- Railway offers PostgreSQL databases
- Create a new PostgreSQL database in Railway
- Export data from Vercel Postgres
- Import to Railway PostgreSQL
- Update `DATABASE_URL` environment variable

### 2. **Blob Storage Migration**

Your app currently uses Vercel Blob Storage. You have options:

**Option A: Keep Vercel Blob** (easiest)
- Continue using `BLOB_READ_WRITE_TOKEN` from Vercel
- No code changes needed
- Works fine cross-platform

**Option B: Switch to Railway Volumes**
- Requires code changes to use file system instead of Vercel Blob
- Mount a persistent volume in Railway
- Update upload/download logic

**Option C: Use S3-compatible storage**
- Use AWS S3, Cloudflare R2, or Railway's upcoming object storage
- Requires code changes

### 3. **Build Configuration**

The `nixpacks.toml` file configures:
- Node.js 20
- npm for package management
- Production build optimization
- Proper start command

### 4. **Monitoring**

Railway provides:
- Real-time logs
- Metrics dashboard
- Deployment history
- Resource usage monitoring

## Post-Deployment Checklist

- [ ] Database is accessible and migrations ran successfully
- [ ] All environment variables are set correctly
- [ ] Authentication works (test login/signup)
- [ ] File uploads work (document upload)
- [ ] Email sending works (signature requests)
- [ ] Custom domain is configured (if applicable)
- [ ] SSL certificate is active
- [ ] Test all three languages (English, Spanish, Telugu)

## Troubleshooting

### Build Fails
- Check Railway build logs
- Verify all dependencies in package.json
- Ensure `nixpacks.toml` is committed

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is running in Railway
- Ensure SSL mode is set correctly

### File Upload Fails
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check Vercel Blob storage quotas
- Review upload logs

### Email Not Sending
- Verify `RESEND_API_KEY` is valid
- Check Resend dashboard for delivery status
- Ensure `EMAIL_FROM` matches verified domain

## Cost Considerations

Railway pricing:
- **Hobby Plan**: $5/month + usage-based pricing
- **Pro Plan**: $20/month + usage-based pricing
- Resources are billed based on actual usage (CPU, RAM, Network)

Compare with your Vercel costs to ensure savings.

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Create an issue in your repository
