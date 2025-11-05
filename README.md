# Insign - Enterprise Internal Operations Platform

> **Build Once, Replace Multiple SaaS Tools**

[![Status](https://img.shields.io/badge/status-in_development-yellow)](https://github.com/jbandu/insign)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## 🎯 Vision

**Insign** is an enterprise-grade internal operations platform designed to replace multiple SaaS subscriptions with a single, unified, secure solution for organizations. Built for companies from 50 to 5000+ employees, Insign provides document management, e-signatures, workflow automation, HR management, communication tools, and comprehensive analytics—all under one roof.

### Why Insign?

**Problem**: Organizations pay for DocuSign, Slack, HR systems, approval tools, and more—each with different logins, security policies, and compliance requirements.

**Solution**: Insign consolidates these tools into a single platform with:
- ✅ **Unified Authentication** - One login, MFA, SSO support
- ✅ **Enterprise Security** - Role-based access, audit logs, compliance-ready
- ✅ **Cost Effective** - Replace 5-10 SaaS subscriptions  
- ✅ **Customizable** - Tailored workflows for your organization
- ✅ **Internal-First** - Built for your team, not external customers

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18+ with TypeScript
- TailwindCSS + Radix UI (shadcn/ui)
- TanStack Query (React Query)
- Zustand for state management
- React Hook Form + Zod validation

**Backend & Infrastructure:**
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Row Level Security (RLS) policies
- Edge Functions for serverless compute
- RESTful API design

**DevOps:**
- Git-based deployment
- Automated testing (Jest, Playwright)
- CI/CD pipeline
- Monitoring & logging

### Core Modules

1. **Foundation & Authentication** 🔐
   - Multi-tenant organization structure
   - Email/Password + SSO authentication
   - Multi-Factor Authentication (MFA)
   - Role-Based Access Control (RBAC)

2. **Document Management** 📄
   - Upload, organize, search, share documents
   - Version control
   - Granular permissions
   - Full-text search

3. **E-Signature System** ✍️
   - Digital signature workflows
   - Multi-signer support
   - Audit trails
   - Certificate-based signatures

4. **Workflow Automation** 🔄
   - Visual workflow builder
   - Approval chains
   - Conditional routing
   - Deadline management

5. **HR Management** 👥
   - Leave management
   - Expense reports
   - Employee onboarding
   - Performance reviews

6. **Communication & Collaboration** 💬
   - Direct messaging
   - Team channels
   - File sharing
   - Notifications

7. **Analytics & Reporting** 📊
   - Usage dashboards
   - Custom reports
   - Audit logs viewer
   - Data export

8. **Administration** 🛠️
   - Organization settings
   - User management
   - System monitoring
   - Integration management

---

## 📚 Documentation

### For Developers

- **[User Stories](./docs/user-stories/README.md)** - Complete product requirements
- **[Architecture](./docs/architecture/)** - System design and decisions
- **[API Documentation](./docs/api/)** - API endpoints and schemas
- **[Database Schema](./docs/technical/DATABASE-SCHEMA.md)** - Data model
- **[Setup Guide](./docs/SETUP.md)** - Development environment setup

### For Product & Project Management

- **[Epic Overview](./docs/user-stories/00-EPIC-OVERVIEW.md)** - All epics and dependencies
- **[Sprint Planning](./docs/sprints/)** - Sprint organization
- **[Roadmap](./docs/ROADMAP.md)** - Feature timeline
- **[Story Tracker](./docs/user-stories/STORY-TRACKER.md)** - Progress tracking

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works for development)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/jbandu/insign.git
cd insign

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### First Time Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env`
3. Run migrations to set up the database
4. Seed initial data (optional): `npm run seed`
5. Create your first organization account
6. Start building!

---

## 🎯 Current Status

**Phase:** Sprint Planning  
**Version:** 0.1.0 (Pre-Alpha)  
**Last Updated:** November 2025

### Completed
- ✅ User stories documentation (111 stories across 8 epics)
- ✅ Architecture design
- ✅ Tech stack selection
- ✅ Database schema design

### In Progress
- 🏗️ Setting up development environment
- 🏗️ Sprint 1 planning (Foundation & Auth)

### Upcoming
- 📋 Sprint 1: Foundation & Authentication (Weeks 1-2)
- 📋 Sprint 2: Auth completion + Document Management start (Weeks 3-4)
- 📋 Sprint 3-4: Document Management (Weeks 5-8)

[View Complete Roadmap](./docs/ROADMAP.md)

---

## 🤝 Contributing

We welcome contributions! However, as this is an early-stage project, please:

1. Review the [User Stories](./docs/user-stories/) to understand requirements
2. Check the [Story Tracker](./docs/user-stories/STORY-TRACKER.md) for available stories
3. Create an issue before starting major work
4. Follow our coding standards (ESLint + Prettier)
5. Write tests for new features
6. Update documentation

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/US-1.1-org-setup

# Make changes and commit
git add .
git commit -m "feat(auth): implement organization setup (US-1.1)"

# Push and create PR
git push origin feature/US-1.1-org-setup
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📋 Project Structure

```
insign/
├── docs/                      # All documentation
│   ├── user-stories/          # Product requirements
│   ├── architecture/          # System design
│   ├── api/                   # API documentation
│   ├── technical/             # Technical specs
│   └── sprints/               # Sprint plans
├── src/                       # Source code
│   ├── app/                   # App configuration
│   ├── features/              # Feature modules
│   ├── shared/                # Shared components
│   └── lib/                   # Third-party configs
├── supabase/                  # Supabase configuration
│   ├── migrations/            # Database migrations
│   └── functions/             # Edge functions
└── tests/                     # Test files
```

---

## 🎓 Learning Resources

### For New Team Members

- [Onboarding Guide](./docs/ONBOARDING.md) - Start here!
- [Development Setup](./docs/SETUP.md) - Environment setup
- [Code Standards](./docs/CODING_STANDARDS.md) - How we write code
- [Testing Guide](./docs/TESTING.md) - Writing tests

### External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📊 Project Metrics

| Metric | Target | Current |
|--------|--------|---------|
| User Stories | 111 | 111 ✅ |
| Story Points | 510 | 0 |
| Test Coverage | >80% | 0% |
| API Endpoints | ~150 | 0 |
| Sprints Planned | 18 | 0 |

---

## 🔒 Security

Security is a top priority for Insign. We implement:

- 🔐 **Encryption**: All data encrypted at rest and in transit (TLS 1.3)
- 🛡️ **Authentication**: MFA, SSO, session management
- 🔍 **Authorization**: Row Level Security (RLS), RBAC
- 📝 **Audit Logs**: Complete activity tracking
- 🔒 **Compliance**: GDPR-ready, data retention policies

Found a security vulnerability? Please email security@insign.dev (DO NOT create a public issue).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👥 Team

**Project Lead**: [Your Name]  
**Development Team**: TBD  
**Product Owner**: TBD

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/jbandu/insign/issues)
- **Discussions**: [Join the conversation](https://github.com/jbandu/insign/discussions)
- **Email**: support@insign.dev

---

## 🙏 Acknowledgments

This project is inspired by the need to consolidate enterprise tools and provide organizations with a unified, secure platform for internal operations.

Special thanks to:
- The Supabase team for an amazing backend platform
- The React and TypeScript communities
- All contributors and early adopters

---

**⭐ Star this repo if you find it useful!**

---

*Last updated: November 2025*
