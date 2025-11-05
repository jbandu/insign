## [EPIC-ID] Epic Name

### [US-ID] User Story Title
**As a** [role]  
**I want to** [action]  
**So that** [benefit]

**Priority:** [Critical/High/Medium/Low]  
**Story Points:** [1/2/3/5/8/13]  
**Sprint:** [Sprint number or TBD]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [outcome]
- [ ] Given [context], when [action], then [outcome]
- [ ] [Additional criteria]

**Technical Notes:**
- [Implementation considerations]
- [Dependencies]
- [API endpoints needed]

**UI/UX Requirements:**
- [Screen/component descriptions]
- [User flow diagrams]

**Test Scenarios:**
- [ ] Happy path: [description]
- [ ] Edge case: [description]
- [ ] Error handling: [description]

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed (if applicable)
```

## 🎯 Prompts for Claude Code

### **Prompt 1: Create User Stories Directory Structure**
```
I'm building an enterprise SaaS platform called "Insign" for internal organizational operations. 

Create a comprehensive user stories documentation structure:

1. Create `/docs/user-stories/` directory
2. Create the following files:
   - `README.md` - Overview and navigation
   - `00-EPIC-OVERVIEW.md` - All epics summary
   - `01-FOUNDATION-AUTH.md` - Epic 1 stories
   - `02-DOCUMENT-MANAGEMENT.md` - Epic 2 stories
   - `03-ESIGNATURE-SYSTEM.md` - Epic 3 stories
   - `04-WORKFLOW-AUTOMATION.md` - Epic 4 stories
   - `05-HR-MANAGEMENT.md` - Epic 5 stories
   - `06-COMMUNICATION.md` - Epic 6 stories
   - `07-ANALYTICS-REPORTING.md` - Epic 7 stories
   - `08-ADMINISTRATION.md` - Epic 8 stories
   - `STORY-TEMPLATE.md` - Template for new stories

3. In README.md, create:
   - Project overview
   - Story status tracking table
   - Navigation links to all epics
   - Story point estimation guide
   - How to use this documentation

Use the following story format: [paste the format from above]
```

### **Prompt 2: Generate Foundation & Auth Stories**
```
Generate comprehensive user stories for Epic 1: Foundation & Authentication for the Insign platform.

Context:
- Multi-tenant SaaS platform for internal organizational operations
- Using Supabase (PostgreSQL, Auth, Storage, Realtime)
- React + TypeScript frontend
- Target: Enterprise organizations (50-5000 employees)

Write detailed user stories in `01-FOUNDATION-AUTH.md` covering:

1. Organization Setup & Onboarding
2. User Registration & Profile Management
3. Authentication (Email/Password, SSO, MFA)
4. Role-Based Access Control (RBAC)
5. Permission Management
6. User Directory
7. Session Management
8. Audit Logging (Auth events)

For each story include:
- Clear acceptance criteria (Given/When/Then format)
- Technical implementation notes (Supabase specifics)
- Database schema requirements
- API endpoints needed
- Security considerations
- Test scenarios (happy path, edge cases, errors)

Estimate story points (Fibonacci: 1,2,3,5,8,13) based on complexity.
Mark critical path stories as "Priority: Critical"
```

### **Prompt 3: Generate Document Management Stories**
```
Generate comprehensive user stories for Epic 2: Document Management System for Insign.

Context:
- Enterprise document repository with version control
- Built on Supabase Storage with PostgreSQL metadata
- Need: upload, organize, search, share, version control
- Must support: PDF, DOCX, XLSX, images (10MB limit initially)
- Folder hierarchy with permissions inheritance

Write detailed user stories in `02-DOCUMENT-MANAGEMENT.md` covering:

1. Document Upload & Storage
2. Folder Structure & Organization  
3. Document Metadata & Tagging
4. Search & Filtering (full-text search)
5. Document Sharing & Permissions
6. Version Control & History
7. Document Preview
8. Bulk Operations
9. Storage Quota Management
10. Document Templates

Include for each story:
- Database tables needed (documents, folders, permissions, versions)
- Supabase Storage integration details
- Search implementation approach (PostgreSQL full-text search)
- Security: Row Level Security (RLS) policies
- File handling edge cases (duplicates, conflicts, large files)

Story point estimation and critical path identification.
```

### **Prompt 4: Generate E-Signature Stories**
```
Generate comprehensive user stories for Epic 3: E-Signature System for Insign.

Context:
- Internal-use digital signature system (not external/customer-facing)
- Compliance needs: Audit trail, tamper detection, certificate-based signatures
- Workflow: prepare document → assign signers → notify → sign → complete
- Support: Sequential and parallel signing, multiple signature types

Write detailed user stories in `03-ESIGNATURE-SYSTEM.md` covering:

1. Document Preparation for Signing
   - Upload PDF, mark signature fields
   - Define signer order and roles
   - Add form fields (text, date, checkbox)

2. Signature Workflow Management
   - Create signature request
   - Assign multiple signers
   - Set signing order (sequential/parallel)
   - Expiration dates

3. Signer Experience
   - Email notification with secure link
   - Review document
   - Sign (draw, type, upload image)
   - Add date and initials

4. Signature Types & Security
   - Basic e-signature (click to sign)
   - Drawn signature
   - Certificate-based signature
   - Audit trail capture

5. Tracking & Notifications
   - Real-time status updates
   - Email reminders
   - Completion notifications
   - Certificate of completion

6. Audit & Compliance
   - Complete audit log
   - Signature certificates
   - Tamper detection
   - Export audit reports

Include:
- Database schema (signature_requests, participants, audit_logs)
- PDF manipulation library recommendations
- Security: signed URLs, access tokens
- Notification templates
- Certificate generation approach
```

### **Prompt 5: Create Story Tracking System**
```
Create a comprehensive story tracking and management system:

1. Create `/docs/user-stories/STORY-TRACKER.md` with:
   - Table of all stories with columns:
     * Story ID
     * Title
     * Epic
     * Priority
     * Story Points
     * Status (📋 Backlog, 🏗️ In Progress, ✅ Done, 🧪 Testing, 🚀 Deployed)
     * Assignee
     * Sprint
     * Dependencies

2. Create `/docs/sprints/` directory with:
   - `SPRINT-PLANNING.md` - Sprint planning template
   - `sprint-01.md` through `sprint-12.md` templates

3. Create `/docs/technical/` directory with:
   - `DATABASE-SCHEMA.md` - Complete schema design
   - `API-ENDPOINTS.md` - All API routes
   - `ARCHITECTURE.md` - System architecture
   - `SECURITY.md` - Security considerations

4. Add scripts to:
   - Generate story reports
   - Calculate velocity
   - Track progress

Make it easy to update status and track progress throughout development.
```

### **Prompt 6: Generate Remaining Epics**
```
Generate user stories for the remaining epics in separate files:

Epic 4: Workflow Automation (`04-WORKFLOW-AUTOMATION.md`)
- Visual workflow builder
- Approval chains
- Conditional routing
- Escalations
- Template library

Epic 5: HR Management (`05-HR-MANAGEMENT.md`)
- Leave management
- Expense reports
- Onboarding workflows
- Employee directory
- Performance reviews

Epic 6: Communication (`06-COMMUNICATION.md`)
- Direct messaging
- Team channels
- File sharing in chat
- Notifications

Epic 7: Analytics & Reporting (`07-ANALYTICS-REPORTING.md`)
- Usage dashboards
- Custom reports
- Audit log viewing
- Export capabilities

Epic 8: Administration (`08-ADMINISTRATION.md`)
- Org settings
- User management
- System monitoring
- Backup/restore

Use the same detailed format with acceptance criteria, technical notes, and test scenarios.
```

## 🔄 Suggested Workflow After Stories

Once all stories are written:

### **Phase 1: Review & Prioritize** (Week 1)
```
Prompt: "Review all user stories in /docs/user-stories/ and:
1. Validate dependencies between stories
2. Identify critical path
3. Suggest optimal sprint groupings
4. Highlight any missing stories or gaps
5. Create a release plan for 6 months"
```

### **Phase 2: Sprint Planning** (Ongoing)
```
Prompt for each sprint: "Based on stories in sprint-01.md:
1. Create implementation tasks for each story
2. Break down into subtasks (<4 hours each)
3. Identify technical risks
4. Create testing checklist
5. Generate branch naming conventions
6. Create PR templates"
```

### **Phase 3: Implementation** (Per Story)
```
Prompt: "Implement [US-1.1: Organization Setup]:
1. Create database migration for organizations table
2. Implement Supabase RLS policies
3. Create API service layer
4. Build React components
5. Add form validation with Zod
6. Write unit tests
7. Write integration tests
8. Update documentation"
```

### **Phase 4: Testing** (Per Story)
```
Prompt: "Create comprehensive test suite for [US-1.1]:
1. Unit tests for all functions
2. Integration tests for API endpoints  
3. E2E tests for user flows
4. Security tests for RLS policies
5. Performance tests
6. Generate test coverage report"
```

### **Phase 5: Deployment** (Per Sprint)
```
Prompt: "Prepare sprint-01 for deployment:
1. Review all completed stories
2. Run full test suite
3. Generate changelog
4. Create deployment checklist
5. Plan rollback strategy
6. Update production documentation"
```

## 📊 Additional Tracking Files

Create these for better management:
```
Prompt: "Create project management files:

1. `/docs/ROADMAP.md`
   - 6-month feature roadmap
   - Milestone timeline
   - Release schedule

2. `/docs/RISKS.md`
   - Technical risks and mitigation
   - Dependencies risks
   - Resource risks

3. `/docs/DECISIONS.md`
   - Architecture decision records (ADRs)
   - Technology choices justification
   - Trade-offs made

4. `/docs/METRICS.md`
   - Velocity tracking
   - Story completion rates
   - Quality metrics (bugs, test coverage)
   - Sprint burndown charts"
