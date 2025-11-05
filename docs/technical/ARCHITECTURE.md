# System Architecture - Insign Platform

> **High-level architecture and technical design decisions**
> Version: 1.0 | Last Updated: November 2025

---

## 🏗️ Architecture Overview

Insign follows a modern **Jamstack architecture** with serverless backend, deployed on Supabase infrastructure.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React App  │  │  Mobile Web  │  │  PWA (Future)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / CDN                           │
│                    (Supabase + Cloudflare)                       │
└─────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Supabase    │  │  Edge        │  │  Background  │          │
│  │  Auth        │  │  Functions   │  │  Jobs        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   Storage    │  │   Realtime   │          │
│  │  (Database)  │  │   (Files)    │  │  (WebSocket) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Design Principles

1. **Multi-Tenancy** - Complete data isolation per organization
2. **Security First** - RLS policies, encryption, audit logging
3. **Scalability** - Horizontal scaling via Supabase
4. **Performance** - Edge CDN, caching, lazy loading
5. **Developer Experience** - TypeScript, type-safe APIs
6. **Compliance** - Audit trails, data retention, GDPR ready

---

## 💻 Frontend Architecture

### Tech Stack
- **Framework:** React 18+ with TypeScript
- **Routing:** React Router v6
- **State Management:** Zustand + TanStack Query (React Query)
- **UI Components:** Radix UI (shadcn/ui)
- **Styling:** TailwindCSS
- **Forms:** React Hook Form + Zod validation
- **Build Tool:** Vite
- **Testing:** Vitest + React Testing Library + Playwright

### Project Structure
```
src/
├── app/                    # App configuration
│   ├── router.tsx         # Route definitions
│   ├── store.ts           # Global state
│   └── theme.ts           # Theme configuration
├── features/              # Feature modules
│   ├── auth/
│   │   ├── api/          # API calls
│   │   ├── components/   # Feature components
│   │   ├── hooks/        # Custom hooks
│   │   ├── stores/       # Feature state
│   │   └── types/        # TypeScript types
│   ├── documents/
│   ├── signatures/
│   └── ...
├── shared/                # Shared utilities
│   ├── components/       # Reusable components
│   ├── hooks/           # Shared hooks
│   ├── lib/             # Third-party configs
│   └── utils/           # Utility functions
├── lib/                  # Core libraries
│   ├── supabase.ts      # Supabase client
│   ├── api.ts           # API client
│   └── auth.ts          # Auth utilities
└── types/                # Global types
```

### State Management Strategy
- **Server State:** TanStack Query (caching, refetching, optimistic updates)
- **Client State:** Zustand (UI state, user preferences)
- **Form State:** React Hook Form (local form state)

---

## 🔧 Backend Architecture

### Supabase Services

#### 1. Authentication
- JWT-based authentication
- Multiple auth methods: Email/Password, SSO
- MFA support via TOTP
- Session management with refresh tokens

#### 2. Database (PostgreSQL)
- Version: PostgreSQL 15+
- Features: Row Level Security (RLS), JSONB, Full-Text Search
- Connection pooling via PgBouncer
- Automated backups (daily)

#### 3. Storage
- S3-compatible object storage
- Organized buckets:
  - `documents` - User documents
  - `avatars` - User profile pictures
  - `signatures` - Signed documents
  - `thumbnails` - Generated thumbnails
- Signed URLs for secure access
- Automatic image optimization

#### 4. Edge Functions (Deno)
- **Purpose:** Serverless compute for custom logic
- **Use Cases:**
  - PDF processing (thumbnails, text extraction)
  - Email notifications
  - Webhook handlers
  - Complex business logic
- **Deployment:** Automatically via Git push

#### 5. Realtime
- WebSocket connections for live updates
- **Use Cases:**
  - Document collaboration indicators
  - Live signature status updates
  - Notification delivery
  - Session invalidation

---

## 🔒 Security Architecture

### Multi-Tenant Isolation
- **Database:** Row Level Security (RLS) policies enforce org_id filtering
- **Storage:** Bucket policies prevent cross-org access
- **API:** Middleware validates org_id on every request

### Authentication Flow
```
1. User submits credentials
2. Supabase Auth validates and issues JWT
3. JWT contains user_id and org_id claims
4. Every request includes JWT in Authorization header
5. RLS policies filter data based on JWT claims
```

### Data Encryption
- **At Rest:** AES-256 encryption (managed by Supabase)
- **In Transit:** TLS 1.3 for all connections
- **Sensitive Fields:** Application-level encryption for secrets

### Permission Model
```
User -> Role -> Permissions -> Resources
```
- Fine-grained permissions (read, write, delete, admin)
- Permissions checked at:
  1. Application level (UI/API)
  2. Database level (RLS policies)

---

## 📊 Data Flow Examples

### Document Upload Flow
```
1. User selects file in browser
2. Client generates unique file ID
3. Client requests signed upload URL from API
4. Client uploads directly to Supabase Storage
5. Client calls API to create document record
6. API validates, creates DB entry with metadata
7. Background job extracts text for search indexing
8. Background job generates thumbnail
9. Client receives document ID and shows success
```

### E-Signature Flow
```
1. Sender prepares document (upload, add fields)
2. Sender adds participants and sends
3. API creates signature request, generates access tokens
4. Email service sends notifications with secure links
5. Signer clicks link (validates token)
6. Signer reviews and signs document
7. API captures signature, updates status
8. If sequential: Notify next signer
9. If last signer: Generate final PDF + certificate
10. All participants receive completion email
```

---

## 🚀 Deployment Architecture

### Environments
1. **Development** - Local (localhost:3000)
2. **Staging** - staging.insign.com
3. **Production** - app.insign.com

### CI/CD Pipeline (GitHub Actions)
```
On Push to main:
  1. Run linters (ESLint, Prettier)
  2. Run type checking (TypeScript)
  3. Run unit tests (Vitest)
  4. Run integration tests
  5. Build production bundle
  6. Deploy to Vercel/Netlify
  7. Run smoke tests
  8. Notify team on Slack
```

### Database Migrations
- **Tool:** Supabase CLI
- **Process:**
  1. Write migration SQL file
  2. Test locally
  3. Apply to staging
  4. Verify
  5. Apply to production
- **Rollback:** Keep reverse migration ready

---

## 📈 Scalability Strategy

### Horizontal Scaling
- **Frontend:** CDN edge locations (Cloudflare)
- **Database:** Read replicas (future)
- **Storage:** Distributed across regions
- **Functions:** Auto-scaling serverless

### Performance Optimizations
1. **Caching:**
   - Browser cache (static assets)
   - TanStack Query cache (API responses)
   - CDN cache (edge locations)

2. **Database:**
   - Proper indexing on frequently queried columns
   - Connection pooling
   - Query optimization

3. **Frontend:**
   - Code splitting (lazy loading)
   - Image optimization (WebP, lazy load)
   - Virtual scrolling for large lists

4. **API:**
   - Pagination (default 50 items)
   - Rate limiting (prevent abuse)
   - Response compression (gzip)

---

## 🔧 Monitoring & Observability

### Metrics
- **Frontend:** Vercel Analytics, Sentry (errors)
- **Backend:** Supabase Dashboard (queries, functions)
- **Storage:** Bucket usage, bandwidth
- **Performance:** Core Web Vitals, API response times

### Logging
- **Application Logs:** Console (dev), Supabase Logs (prod)
- **Audit Logs:** Database table (all user actions)
- **Error Tracking:** Sentry (unhandled exceptions)

### Alerts
- API error rate > 1%
- Database CPU > 80%
- Storage quota > 90%
- Slow queries > 1s
- Failed function executions

---

## 🧪 Testing Strategy

### Testing Pyramid
```
        /\
       /  \          E2E Tests (Playwright)
      /────\           - Critical user flows
     /      \          - 10-20 tests
    /────────\       
   /          \      Integration Tests (Vitest)
  /────────────\       - API endpoints
 /              \      - Database operations
/────────────────\     - 100+ tests
                     
                      Unit Tests (Vitest)
                        - Business logic
                        - Utilities
                        - 500+ tests
```

### Test Coverage Targets
- Unit tests: >80%
- Integration tests: Critical paths
- E2E tests: User journeys

---

## 🔮 Future Enhancements

### Phase 2 (Months 6-12)
- [ ] Mobile native apps (React Native)
- [ ] Offline support (PWA)
- [ ] Advanced search (Elasticsearch)
- [ ] Real-time collaboration (CRDT)

### Phase 3 (Year 2)
- [ ] Multi-region deployment
- [ ] Advanced analytics (data warehouse)
- [ ] AI-powered features (document classification)
- [ ] Third-party integrations (Zapier, etc.)

---

**Architecture Version:** 1.0
**Last Reviewed:** November 2025
**Next Review:** February 2026
