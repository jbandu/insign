# Insign - Development Setup Guide

This guide will help you set up the Insign platform with **Neon** (serverless PostgreSQL) and **Vercel** deployment.

## 📋 Prerequisites

- Node.js 18+ and npm
- Git
- A Neon account (free tier available)
- A Vercel account (free tier available)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/jbandu/insign.git
cd insign
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Neon Database

#### Create a Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click "New Project"
3. Name your project: `insign-dev`
4. Select region (choose closest to you)
5. Click "Create Project"

#### Get Database Connection String

1. In your Neon project dashboard, click "Connection Details"
2. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/insign?sslmode=require
   ```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and update:

```env
# Replace with your Neon connection string
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/insign?sslmode=require"

# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"

# For local development
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Generate and Run Database Migrations

Generate the SQL migration files:

```bash
npm run db:generate
```

Push the schema to your Neon database:

```bash
npm run db:migrate
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Management

### View Database in Drizzle Studio

Drizzle Studio provides a GUI for viewing and editing your database:

```bash
npm run db:studio
```

This opens a browser at `https://local.drizzle.studio`

### Neon Console

You can also manage your database directly in the [Neon Console](https://console.neon.tech):

- Run SQL queries
- View table data
- Monitor database metrics
- Create backups

## 📦 Vercel Deployment

### Initial Setup

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project:
   ```bash
   vercel link
   ```

### Configure Environment Variables in Vercel

Add the following environment variables in your Vercel project settings:

```env
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/insign?sslmode=require
NEXTAUTH_SECRET=your-production-secret-here
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Automatic Deployments

Connect your GitHub repository to Vercel for automatic deployments:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure environment variables
5. Deploy

Every push to `main` will automatically deploy to production!

## 🔧 Vercel Blob Storage Setup

For file uploads (documents, avatars, signatures):

1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Create a new Blob store
4. Copy the `BLOB_READ_WRITE_TOKEN`
5. Add to `.env.local` and Vercel environment variables:
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   ```

## 🛠️ Development Workflow

### Project Structure

```
insign/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   └── dashboard/    # Dashboard pages
│   ├── components/       # Shared components
│   ├── features/         # Feature modules
│   │   ├── auth/
│   │   ├── documents/
│   │   └── signatures/
│   └── lib/
│       ├── db/           # Database config & schema
│       └── auth/         # NextAuth config
├── drizzle/              # Generated migrations
├── docs/                 # Documentation
└── public/               # Static assets
```

### Adding New Features

1. Create feature module in `src/features/[feature-name]/`
2. Add database tables to `src/lib/db/schema.ts`
3. Generate migration: `npm run db:generate`
4. Apply migration: `npm run db:migrate`
5. Create API routes in `src/app/api/[feature-name]/`
6. Build UI components

### Database Schema Changes

1. Edit `src/lib/db/schema.ts`
2. Generate migration:
   ```bash
   npm run db:generate
   ```
3. Review the generated SQL in `drizzle/` folder
4. Apply to database:
   ```bash
   npm run db:migrate
   ```

## 🔐 Authentication

The app uses **NextAuth.js v5** with:

- Email/Password authentication (Credentials provider)
- JWT sessions
- Protected routes via middleware
- Role-based access control (RBAC)

### Creating the First Admin User

After setup, you'll need to create an admin user. We'll add a seed script for this.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e
```

## 📊 Monitoring & Debugging

### Neon Dashboard
- Monitor query performance
- View connection pooling stats
- Check database size and usage

### Vercel Analytics
- Real-time performance metrics
- Error tracking
- Web Vitals monitoring

### Logs
```bash
# View Vercel logs
vercel logs

# View development logs
npm run dev
```

## 🔄 Database Backup & Restore

### Neon Automatic Backups

Neon provides automatic backups:
- Point-in-time restore
- Branch from any point in history

### Manual Backup

```bash
# Backup database to SQL file
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## 🌍 Multi-Environment Setup

### Development
```env
DATABASE_URL=postgresql://...neon.tech/insign-dev
NEXTAUTH_URL=http://localhost:3000
```

### Staging
```env
DATABASE_URL=postgresql://...neon.tech/insign-staging
NEXTAUTH_URL=https://staging.insign.app
```

### Production
```env
DATABASE_URL=postgresql://...neon.tech/insign-prod
NEXTAUTH_URL=https://app.insign.com
```

## ❓ Troubleshooting

### Database Connection Issues

**Error:** `getaddrinfo ENOTFOUND`

- Check your `DATABASE_URL` is correct
- Ensure your Neon project is active
- Check firewall/network settings

**Error:** `too many connections`

- Neon has connection limits on free tier
- Use connection pooling (already configured)
- Upgrade Neon plan if needed

### Build Errors

**Error:** `Type error: Cannot find module '@/...'`

- Run `npm install` again
- Check `tsconfig.json` paths are correct
- Restart TypeScript server in your editor

### Vercel Deployment Fails

- Check environment variables are set
- Review build logs in Vercel dashboard
- Ensure `DATABASE_URL` is accessible from Vercel

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://authjs.dev)

## 🤝 Need Help?

- Create an issue on GitHub
- Check existing documentation in `docs/`
- Review user stories in `docs/user-stories/`

---

**Happy Coding!** 🚀
