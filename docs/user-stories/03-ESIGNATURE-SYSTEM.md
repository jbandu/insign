# Epic 3: E-Signature System

**Epic ID:** EPIC-03
**Epic Owner:** Product Lead
**Status:** 📋 Backlog
**Priority:** High
**Story Points:** 89
**Sprint:** 7-12

---

## Epic Overview

E-Signature System provides internal digital signature workflows with compliance-ready audit trails, tamper detection, and certificate-based signatures. Designed for internal organizational use (not external customer-facing), it enables secure signing of contracts, approvals, HR documents, and internal agreements.

### Business Value
- Eliminate paper-based signature processes
- Reduce document turnaround time from days to hours
- Ensure legal compliance with audit trails
- Support multiple signature types and workflows
- Track signature status in real-time

### Success Criteria
- Support sequential and parallel signing workflows
- Complete audit trail for all signature events
- Tamper-evident sealed documents
- Email notifications at each workflow stage
- Sub-5 minute time from send to first signature
- 99.9% uptime for signature services

---

## Technical Context

### Database Tables Required
```sql
signature_requests (id, document_id, title, status, workflow_type, expires_at, completed_at, created_by)
signature_participants (id, request_id, user_id, email, order, role, status, signed_at, ip_address)
signature_fields (id, request_id, participant_id, type, page, position, required, value)
signatures (id, participant_id, signature_data, signature_type, certificate, timestamp, ip_address)
signature_audit_logs (id, request_id, participant_id, action, metadata, timestamp)
signature_certificates (id, request_id, certificate_data, seal_hash, issued_at)
```

### Technology Stack
- **PDF Library:** pdf-lib (for PDF manipulation in JS)
- **Signing:** Digital signatures with PKI or drawn/typed signatures
- **Email:** Transactional emails via Supabase/SendGrid
- **Storage:** Supabase Storage for signed documents
- **Hashing:** SHA-256 for tamper detection

### Compliance Requirements
- Complete audit trail (who, what, when, where, how)
- Tamper-evident sealing
- Certificate of completion
- Secure access to signing links
- IP address and device tracking
- Consent capture

---

## User Stories

### 1. Document Preparation for Signing

#### [US-3.1] Upload Document for Signature
**As a** document sender
**I want to** upload a document and prepare it for signing
**So that** I can initiate a signature workflow

**Priority:** Critical
**Story Points:** 5
**Sprint:** 7

**Acceptance Criteria:**
- [ ] Given I want to send for signature, when I upload a PDF, then it's imported into the signature editor
- [ ] Given I upload a document, when it loads, then I see all pages with ability to add signature fields
- [ ] Given I am preparing a document, when I save as draft, then I can return to edit later
- [ ] Given the document is prepared, when I proceed, then I can add participants
- [ ] Given I upload a non-PDF, when I try, then I see an error (only PDF supported)

**Technical Notes:**
- Only PDF documents supported for signatures
- Convert office docs to PDF before signing (future enhancement)
- API Endpoints:
  - `POST /api/signature-requests` - Create signature request
  - `POST /api/signature-requests/{id}/document` - Upload document
  - `GET /api/signature-requests/{id}` - Get request details
- Store original document separately from signed document
- Max file size: 25MB

**Database Schema:**
```sql
CREATE TYPE signature_request_status AS ENUM (
  'draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled'
);

CREATE TYPE workflow_type AS ENUM ('sequential', 'parallel');

CREATE TABLE signature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  title TEXT NOT NULL,
  message TEXT,
  status signature_request_status DEFAULT 'draft',
  workflow_type workflow_type DEFAULT 'sequential',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  seal_hash TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_requests_org ON signature_requests(org_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
```

**UI/UX Requirements:**
- Upload area with PDF file picker
- PDF viewer showing all pages
- Toolbar: Add fields, Save draft, Next
- Progress indicator: Upload → Add Fields → Add Participants → Send

**Test Scenarios:**
- [ ] Happy path: Upload PDF and proceed to add fields
- [ ] Edge case: Upload 25MB PDF (at limit)
- [ ] Edge case: Upload Word doc (error message)
- [ ] Edge case: Upload corrupted PDF
- [ ] Error handling: Network failure during upload
- [ ] Security: Validate PDF isn't malicious

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.2] Add Signature Fields to Document
**As a** document sender
**I want to** place signature fields on the document
**So that** signers know where to sign

**Priority:** Critical
**Story Points:** 8
**Sprint:** 7

**Acceptance Criteria:**
- [ ] Given I am in the field editor, when I drag a signature field, then it's placed on the page
- [ ] Given I place a field, when I configure it, then I can assign it to a specific participant
- [ ] Given I add fields, when I choose type, then I can add signature, initials, date, text, checkbox
- [ ] Given I place a required field, when I mark it, then the signer cannot complete without filling it
- [ ] Given I finish adding fields, when I review, then I see a summary of all fields

**Technical Notes:**
- Field types: signature, initials, date, text, checkbox, dropdown
- Store field positions as coordinates (page, x, y, width, height)
- API Endpoints:
  - `POST /api/signature-requests/{id}/fields` - Add field
  - `PUT /api/signature-requests/{id}/fields/{fieldId}` - Update field
  - `DELETE /api/signature-requests/{id}/fields/{fieldId}` - Delete field
- Each field assigned to a participant
- Validation: Required fields must be assigned

**Database Schema:**
```sql
CREATE TYPE signature_field_type AS ENUM (
  'signature', 'initials', 'date', 'text', 'checkbox', 'dropdown'
);

CREATE TABLE signature_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  type signature_field_type NOT NULL,
  page_number INTEGER NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  label TEXT,
  options JSONB, -- For dropdown
  value TEXT, -- Filled value
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_fields_request ON signature_fields(request_id);
```

**UI/UX Requirements:**
- Drag-and-drop field placement
- Field palette: Signature, Initials, Date, Text, Checkbox
- Assign participant dropdown for each field
- Required/optional toggle
- Field properties panel
- Auto-align and snap to grid

**Test Scenarios:**
- [ ] Happy path: Add signature and date fields
- [ ] Edge case: Overlapping fields
- [ ] Edge case: Field outside page boundaries
- [ ] Edge case: Add 50+ fields (performance)
- [ ] Error handling: Delete field that's being edited
- [ ] Usability: Keyboard shortcuts for field types

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 2. Signature Workflow Management

#### [US-3.3] Add Participants to Signature Request
**As a** document sender
**I want to** add multiple participants with signing roles
**So that** the document gets signed by the right people

**Priority:** Critical
**Story Points:** 5
**Sprint:** 7

**Acceptance Criteria:**
- [ ] Given I am adding participants, when I enter emails, then they are added to the list
- [ ] Given I add participants, when I set roles, then I can choose Signer, Approver, CC
- [ ] Given I use sequential signing, when I order participants, then they sign in that order
- [ ] Given I use parallel signing, when I send, then all signers can sign simultaneously
- [ ] Given I add participants, when I validate, then duplicate emails are prevented

**Technical Notes:**
- Participant roles: Signer (must sign), Approver (approve/decline), CC (notify only)
- Sequential workflow: Order matters, next participant notified when previous completes
- Parallel workflow: All signers notified at once
- API Endpoints:
  - `POST /api/signature-requests/{id}/participants` - Add participant
  - `PUT /api/signature-requests/{id}/participants/{partId}` - Update participant
  - `DELETE /api/signature-requests/{id}/participants/{partId}` - Remove participant
- Send invitation emails when request is sent

**Database Schema:**
```sql
CREATE TYPE participant_role AS ENUM ('signer', 'approver', 'cc');
CREATE TYPE participant_status AS ENUM (
  'pending', 'notified', 'viewed', 'signed', 'declined', 'expired'
);

CREATE TABLE signature_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role participant_role NOT NULL DEFAULT 'signer',
  order_index INTEGER NOT NULL DEFAULT 0,
  status participant_status DEFAULT 'pending',
  access_token TEXT UNIQUE NOT NULL,
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_participants_request ON signature_participants(request_id);
CREATE INDEX idx_signature_participants_token ON signature_participants(access_token);
```

**UI/UX Requirements:**
- Participant list with add button
- Email input with autocomplete (from org users)
- Role dropdown for each participant
- Order drag-and-drop for sequential workflow
- Workflow type toggle: Sequential / Parallel
- Validate emails before proceeding

**Test Scenarios:**
- [ ] Happy path: Add 3 signers in sequential order
- [ ] Edge case: Add same email twice (error)
- [ ] Edge case: Add 20+ participants
- [ ] Edge case: Mix of internal users and external emails
- [ ] Error handling: Invalid email format
- [ ] Security: Access tokens are cryptographically secure

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.4] Send Signature Request
**As a** document sender
**I want to** send the signature request to participants
**So that** they receive notifications and can sign

**Priority:** Critical
**Story Points:** 5
**Sprint:** 8

**Acceptance Criteria:**
- [ ] Given I have prepared the request, when I click send, then all participants receive email notifications
- [ ] Given I send a request, when sent, then status changes to 'sent'
- [ ] Given I send sequentially, when sent, then only the first signer is notified
- [ ] Given I send a request, when I add a message, then it's included in the email
- [ ] Given I set expiration, when sent, then participants see the deadline

**Technical Notes:**
- Email template with: Document title, message, sign button (secure link)
- Secure link: `https://app.insign.com/sign/{access_token}`
- Access token: 32+ character random string, unique per participant
- API Endpoints:
  - `POST /api/signature-requests/{id}/send` - Send request
  - `POST /api/signature-requests/{id}/remind` - Send reminder
  - `POST /api/signature-requests/{id}/cancel` - Cancel request
- Log all send/reminder events to audit log
- Schedule reminder emails (after 3 days, 1 day before expiry)

**UI/UX Requirements:**
- Send confirmation dialog
- Message input for custom note
- Expiration date picker (default: 30 days)
- Review summary: Document, participants, fields
- Send button with loading state

**Test Scenarios:**
- [ ] Happy path: Send request to 3 participants
- [ ] Edge case: Send with expiration date in past (error)
- [ ] Edge case: Send without any fields assigned (warning)
- [ ] Edge case: Email service unavailable (queue for retry)
- [ ] Error handling: Participant email bounces
- [ ] Security: Access tokens cannot be guessed

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Email templates designed and tested
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 3. Signer Experience

#### [US-3.5] Receive and Access Signature Request
**As a** participant
**I want to** receive an email notification with a secure link
**So that** I can review and sign the document

**Priority:** Critical
**Story Points:** 3
**Sprint:** 8

**Acceptance Criteria:**
- [ ] Given a request is sent to me, when I check email, then I receive a notification
- [ ] Given I click the link, when I visit, then I see the document to sign
- [ ] Given the link is expired, when I visit, then I see an expiration message
- [ ] Given the link is used, when others try it, then access is denied (single-use)
- [ ] Given I am not the next signer, when I try to access, then I see a waiting message

**Technical Notes:**
- Email notification with document preview image
- Access token validation on page load
- Check: Token exists, not expired, participant's turn (if sequential)
- API Endpoints:
  - `GET /api/sign/{access_token}` - Access signing page
  - `POST /api/sign/{access_token}/view` - Log document view
- Update participant status to 'viewed' on first access
- Track IP address and user agent

**UI/UX Requirements:**
- Email template: Professional, clear CTA button
- Signing page: Clean interface, document preview
- Progress indicator if part of multi-signer workflow
- Who has signed, who is pending
- Expiration date prominently displayed

**Test Scenarios:**
- [ ] Happy path: Receive email and access link
- [ ] Edge case: Access expired link
- [ ] Edge case: Access link after document completed
- [ ] Edge case: Access from mobile device
- [ ] Error handling: Invalid access token
- [ ] Security: Token cannot be reused by others

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Email templates tested across clients (Gmail, Outlook, etc.)
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.6] Review Document Before Signing
**As a** signer
**I want to** review the full document before signing
**So that** I understand what I'm agreeing to

**Priority:** High
**Story Points:** 5
**Sprint:** 8

**Acceptance Criteria:**
- [ ] Given I access the signing page, when I load it, then I see the full document
- [ ] Given I am reviewing, when I navigate, then I can view all pages
- [ ] Given there are signature fields, when I see them, then they are highlighted
- [ ] Given I want to download, when I click, then I receive a copy (watermarked as unsigned)
- [ ] Given I have concerns, when I decline, then I can provide a reason

**Technical Notes:**
- PDF rendering with pdf.js
- Highlight all fields assigned to current signer
- Show field labels and types
- Watermark: "UNSIGNED COPY" on downloaded PDF
- API Endpoints:
  - `GET /api/sign/{access_token}/document` - Get document (signed URL)
  - `POST /api/sign/{access_token}/download` - Download unsigned copy
  - `POST /api/sign/{access_token}/decline` - Decline to sign
- Log all view/download/decline actions

**UI/UX Requirements:**
- PDF viewer with zoom and navigation
- Fields highlighted in color (yellow)
- Download button
- Decline button with reason modal
- Next button when ready to sign

**Test Scenarios:**
- [ ] Happy path: Review and proceed to sign
- [ ] Edge case: Document with 100+ pages
- [ ] Edge case: Download PDF (check watermark)
- [ ] Edge case: Decline with reason
- [ ] Error handling: PDF fails to load
- [ ] Security: Cannot access if not participant

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

#### [US-3.7] Sign Document with Multiple Signature Types
**As a** signer
**I want to** sign using draw, type, or upload methods
**So that** I can provide my signature easily

**Priority:** Critical
**Story Points:** 8
**Sprint:** 9

**Acceptance Criteria:**
- [ ] Given I am ready to sign, when I click a signature field, then I see signature options
- [ ] Given I choose draw, when I draw my signature, then I can save it
- [ ] Given I choose type, when I enter my name, then it's rendered as a signature font
- [ ] Given I choose upload, when I select an image, then it's inserted as my signature
- [ ] Given I complete all required fields, when I confirm, then the document is signed

**Technical Notes:**
- Signature methods: Draw (canvas), Type (signature font), Upload (image)
- Store signature data: Base64 encoded image
- Apply signatures to PDF using pdf-lib
- API Endpoints:
  - `POST /api/sign/{access_token}/signature` - Submit signature
  - `GET /api/sign/{access_token}/fields` - Get fields for signer
- Generate final signed PDF with all signatures embedded
- Create certificate of completion

**Database Schema:**
```sql
CREATE TYPE signature_type AS ENUM ('drawn', 'typed', 'uploaded', 'certificate');

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES signature_participants(id),
  field_id UUID NOT NULL REFERENCES signature_fields(id),
  signature_data TEXT NOT NULL, -- Base64 image or certificate reference
  signature_type signature_type NOT NULL,
  certificate TEXT, -- Digital certificate (future)
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET NOT NULL,
  user_agent TEXT
);

CREATE INDEX idx_signatures_participant ON signatures(participant_id);
```

**UI/UX Requirements:**
- Signature modal with tabs: Draw, Type, Upload
- Canvas for drawing with clear button
- Font selector for typed signatures
- Image upload (max 1MB, PNG/JPG)
- Preview signature before applying
- Adopt signature checkbox (reuse for future)

**Test Scenarios:**
- [ ] Happy path: Draw signature and complete
- [ ] Edge case: Signature outside field bounds (auto-resize)
- [ ] Edge case: Upload 1MB signature image
- [ ] Edge case: Clear and redraw signature multiple times
- [ ] Error handling: Network failure during submission
- [ ] Security: Signature data validated on server

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Mobile responsiveness tested

---

#### [US-3.8] Complete Signing and Confirmation
**As a** signer
**I want to** receive confirmation after signing
**So that** I know my signature was captured

**Priority:** High
**Story Points:** 3
**Sprint:** 9

**Acceptance Criteria:**
- [ ] Given I submit my signature, when processed, then I see a success message
- [ ] Given I complete signing, when done, then I receive a confirmation email
- [ ] Given I finish, when I want a copy, then I can download the signed document
- [ ] Given I am not the last signer, when I complete, then the next signer is notified
- [ ] Given I am the last signer, when I complete, then all participants receive the final document

**Technical Notes:**
- Update participant status to 'signed'
- If sequential and not last: Notify next participant
- If last signer: Mark request as 'completed', generate final PDF
- Send completion emails to all participants and sender
- API Endpoints:
  - `POST /api/sign/{access_token}/complete` - Complete signing
- Attach certificate of completion to final PDF

**UI/UX Requirements:**
- Success screen with checkmark animation
- Download signed document button
- What happens next explanation
- Close button

**Test Scenarios:**
- [ ] Happy path: Complete signing and receive email
- [ ] Edge case: Last signer completes (all notified)
- [ ] Edge case: Network failure after signing (retry)
- [ ] Error handling: Email service unavailable
- [ ] Performance: Final PDF generated in < 10 seconds
- [ ] Security: Only participant can complete

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 4. Tracking & Notifications

#### [US-3.9] Track Signature Request Status
**As a** document sender
**I want to** view the status of signature requests
**So that** I know who has signed and who is pending

**Priority:** High
**Story Points:** 5
**Sprint:** 9

**Acceptance Criteria:**
- [ ] Given I have sent requests, when I view my dashboard, then I see a list of all requests
- [ ] Given I select a request, when I view details, then I see participant status
- [ ] Given I view status, when I check, then I see timestamps for viewed, signed, or declined
- [ ] Given a request is pending, when I need action, then I can send a reminder
- [ ] Given I need to cancel, when I cancel a request, then all participants are notified

**Technical Notes:**
- Dashboard showing all signature requests
- Filters: Status, date range, participant
- Real-time updates via WebSocket or polling
- API Endpoints:
  - `GET /api/signature-requests` - List requests (paginated)
  - `GET /api/signature-requests/{id}/status` - Get detailed status
- Show visual timeline of signature workflow

**UI/UX Requirements:**
- Requests list with status badges
- Status detail page with timeline
- Participant cards showing status icons
- Send reminder button (disabled if recently sent)
- Cancel request button with confirmation

**Test Scenarios:**
- [ ] Happy path: View request status dashboard
- [ ] Edge case: Request with 10+ participants
- [ ] Edge case: Real-time status update
- [ ] Error handling: Request not found
- [ ] Performance: Dashboard loads in < 2 seconds

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.10] Automated Reminder Emails
**As a** system
**I want to** send reminder emails to pending signers
**So that** signature requests are completed in a timely manner

**Priority:** Medium
**Story Points:** 5
**Sprint:** 10

**Acceptance Criteria:**
- [ ] Given a participant hasn't signed, when 3 days pass, then they receive a reminder
- [ ] Given expiration is approaching, when 1 day before, then participant receives urgent reminder
- [ ] Given a reminder is sent, when checked, then it's logged in audit trail
- [ ] Given a sender wants control, when configuring, then they can disable auto-reminders
- [ ] Given a participant signed, when checking, then no more reminders are sent to them

**Technical Notes:**
- Background job scheduled daily to check pending requests
- Send reminders at: 3 days, 7 days, 1 day before expiry
- Configurable per-request reminder settings
- API Endpoints:
  - `POST /api/signature-requests/{id}/remind/{participantId}` - Manual reminder
- Use cron job or Supabase Edge Function with scheduled trigger

**UI/UX Requirements:**
- Reminder settings in request configuration
- Reminder history in request details
- Manual "Send Reminder Now" button

**Test Scenarios:**
- [ ] Happy path: Auto-reminder sent after 3 days
- [ ] Edge case: Participant signs between reminder checks
- [ ] Edge case: 100+ pending requests (batch processing)
- [ ] Error handling: Email service failure (retry)
- [ ] Performance: Daily job completes in reasonable time

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 5. Audit & Compliance

#### [US-3.11] Complete Audit Trail
**As a** compliance officer
**I want to** view a complete audit trail of all signature events
**So that** I can prove document authenticity and compliance

**Priority:** Critical
**Story Points:** 8
**Sprint:** 10

**Acceptance Criteria:**
- [ ] Given any signature event occurs, when it happens, then it's logged to the audit table
- [ ] Given I view audit logs, when I check, then I see all events with timestamps, IP, and device
- [ ] Given I need a report, when I export, then I receive a detailed audit report
- [ ] Given a document is signed, when I view audit, then I see the complete chain of custody
- [ ] Given I need evidence, when I access logs, then data is tamper-evident

**Technical Notes:**
- Log events: created, sent, viewed, signed, declined, completed, expired, cancelled
- Capture: timestamp, participant, IP address, user agent, geolocation
- Store audit logs immutably (no updates/deletes)
- API Endpoints:
  - `GET /api/signature-requests/{id}/audit-log` - Get audit trail
  - `GET /api/signature-requests/{id}/audit-log/export` - Export audit PDF
- Generate audit report PDF with all events

**Database Schema:**
```sql
CREATE TABLE signature_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id),
  participant_id UUID REFERENCES signature_participants(id),
  action TEXT NOT NULL, -- created, sent, viewed, signed, etc.
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent updates and deletes
CREATE POLICY "Audit logs are append-only"
  ON signature_audit_logs
  FOR ALL
  USING (false)
  WITH CHECK (true);

CREATE INDEX idx_signature_audit_request ON signature_audit_logs(request_id, timestamp DESC);
```

**UI/UX Requirements:**
- Audit log viewer with timeline
- Event details on hover/click
- Export button for PDF report
- Filter by event type, participant
- Visual chain of custody diagram

**Test Scenarios:**
- [ ] Happy path: View complete audit trail
- [ ] Edge case: Request with 50+ audit events
- [ ] Edge case: Export audit report to PDF
- [ ] Error handling: Cannot modify audit log
- [ ] Security: Audit logs cannot be deleted
- [ ] Compliance: All required events are logged

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Compliance review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.12] Certificate of Completion
**As a** document sender or participant
**I want to** receive a certificate of completion
**So that** I have proof of the signing event

**Priority:** High
**Story Points:** 5
**Sprint:** 11

**Acceptance Criteria:**
- [ ] Given a request is completed, when finalized, then a certificate is generated
- [ ] Given I view the certificate, when I check, then I see all participants and signatures
- [ ] Given I need proof, when I download, then I receive a PDF certificate
- [ ] Given I verify authenticity, when I check the hash, then I can validate the document hasn't changed
- [ ] Given all participants, when request completes, then each receives a copy of the certificate

**Technical Notes:**
- Certificate includes: Document details, all participants, timestamps, IP addresses
- Generate unique certificate ID
- Seal with cryptographic hash (SHA-256)
- API Endpoints:
  - `GET /api/signature-requests/{id}/certificate` - Get certificate
  - `POST /api/signature-requests/{id}/certificate/verify` - Verify certificate
- Store certificate URL in signature_requests table

**Database Schema:**
```sql
CREATE TABLE signature_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id),
  certificate_data JSONB NOT NULL,
  seal_hash TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificate data JSONB structure
{
  "document_title": "Employment Agreement",
  "completed_at": "2024-11-04T10:30:00Z",
  "participants": [
    {
      "name": "John Doe",
      "email": "john@company.com",
      "role": "signer",
      "signed_at": "2024-11-04T10:25:00Z",
      "ip_address": "192.168.1.1"
    }
  ],
  "seal": {
    "algorithm": "SHA-256",
    "hash": "abc123..."
  }
}
```

**UI/UX Requirements:**
- Certificate page with professional design
- Verification seal/badge
- Download as PDF button
- QR code for verification
- All participant signatures displayed

**Test Scenarios:**
- [ ] Happy path: Generate and download certificate
- [ ] Edge case: Certificate with 10+ participants
- [ ] Edge case: Verify certificate hash matches
- [ ] Error handling: Certificate generation fails
- [ ] Security: Hash changes if document modified
- [ ] Compliance: Certificate meets legal standards

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-3.13] Tamper Detection and Document Sealing
**As a** compliance officer
**I want to** ensure documents cannot be tampered with after signing
**So that** signatures remain legally valid

**Priority:** Critical
**Story Points:** 8
**Sprint:** 11

**Acceptance Criteria:**
- [ ] Given a document is signed, when finalized, then it's sealed with a cryptographic hash
- [ ] Given a sealed document, when someone tries to modify it, then the hash becomes invalid
- [ ] Given I verify a document, when I check the hash, then I can detect any tampering
- [ ] Given a document is complete, when I download it, then it includes the seal and certificate
- [ ] Given I need proof, when I verify, then I receive confirmation of authenticity or tampering

**Technical Notes:**
- Generate SHA-256 hash of final PDF
- Store hash in signature_certificates table
- Append certificate page to final PDF
- Add visible seal to document
- API Endpoints:
  - `POST /api/signature-requests/{id}/seal` - Seal document
  - `POST /api/documents/verify` - Verify document integrity
- Use PDF digital signatures (PKI) for enhanced security (future)

**Implementation:**
```typescript
import crypto from 'crypto';

function sealDocument(pdfBuffer: Buffer): string {
  // Generate SHA-256 hash of PDF
  const hash = crypto
    .createHash('sha256')
    .update(pdfBuffer)
    .digest('hex');
  return hash;
}

function verifyDocument(pdfBuffer: Buffer, expectedHash: string): boolean {
  const actualHash = sealDocument(pdfBuffer);
  return actualHash === expectedHash;
}
```

**UI/UX Requirements:**
- Verification page with document upload
- Result display: Valid or Tampered
- Visual seal on document (visible watermark)
- Certificate page appended to PDF
- Verification instructions for recipients

**Test Scenarios:**
- [ ] Happy path: Seal and verify document
- [ ] Edge case: Modify document byte and verify (tampered)
- [ ] Edge case: Very large PDF (100MB+)
- [ ] Error handling: Corrupted PDF upload
- [ ] Security: Hash algorithm is cryptographically secure
- [ ] Compliance: Meets legal e-signature standards

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Legal/compliance review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 6. Advanced Features

#### [US-3.14] Signature Templates
**As a** frequent sender
**I want to** create templates for common signature workflows
**So that** I can quickly send recurring documents

**Priority:** Low
**Story Points:** 8
**Sprint:** 12

**Acceptance Criteria:**
- [ ] Given I have a signature request, when I save as template, then it's added to my templates
- [ ] Given I use a template, when I create from it, then fields and participants are pre-populated
- [ ] Given I manage templates, when I view them, then I can edit or delete
- [ ] Given I share a template, when I grant access, then my team can use it
- [ ] Given I use a template, when creating, then I can override participants and settings

**Technical Notes:**
- Templates store: Document, fields configuration, participant roles
- Templates are org-wide or personal
- API Endpoints:
  - `POST /api/signature-templates` - Create template
  - `GET /api/signature-templates` - List templates
  - `POST /api/signature-templates/{id}/use` - Create request from template
  - `DELETE /api/signature-templates/{id}` - Delete template

**Database Schema:**
```sql
CREATE TABLE signature_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  document_template_id UUID REFERENCES document_templates(id),
  fields_config JSONB NOT NULL,
  participants_config JSONB NOT NULL,
  workflow_type workflow_type DEFAULT 'sequential',
  is_shared BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI/UX Requirements:**
- Template library with grid view
- Create from template button
- Template editor to modify before sending
- Share template toggle

**Test Scenarios:**
- [ ] Happy path: Create and use template
- [ ] Edge case: Template with complex field layout
- [ ] Error handling: Template document deleted
- [ ] Usability: Quick send from template

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

## Epic Summary

### Total Story Points: 89

### Story Breakdown:
- US-3.1: Upload Document for Signature (5 points)
- US-3.2: Add Signature Fields to Document (8 points)
- US-3.3: Add Participants to Signature Request (5 points)
- US-3.4: Send Signature Request (5 points)
- US-3.5: Receive and Access Signature Request (3 points)
- US-3.6: Review Document Before Signing (5 points)
- US-3.7: Sign Document with Multiple Signature Types (8 points)
- US-3.8: Complete Signing and Confirmation (3 points)
- US-3.9: Track Signature Request Status (5 points)
- US-3.10: Automated Reminder Emails (5 points)
- US-3.11: Complete Audit Trail (8 points)
- US-3.12: Certificate of Completion (5 points)
- US-3.13: Tamper Detection and Document Sealing (8 points)
- US-3.14: Signature Templates (8 points)

### Critical Path (47 points):
1. US-3.1: Upload Document for Signature
2. US-3.2: Add Signature Fields to Document
3. US-3.3: Add Participants to Signature Request
4. US-3.4: Send Signature Request
5. US-3.7: Sign Document with Multiple Signature Types
6. US-3.11: Complete Audit Trail
7. US-3.13: Tamper Detection and Document Sealing

### Dependencies:
- Requires Epic 1 (Foundation & Auth) completed
- Requires Epic 2 (Document Management) completed
- Dependency for Epic 4 (Workflow Automation) - workflows can trigger signature requests

### Technical Dependencies:
- PDF manipulation library (pdf-lib, pdf.js)
- Email service configured (transactional emails)
- Signature drawing canvas library
- Cryptographic hashing (SHA-256)
- Background job scheduler (reminders, certificate generation)

### Risks & Mitigation:
- **Risk:** PDF manipulation complexity → **Mitigation:** Use well-tested libraries, extensive testing
- **Risk:** Legal compliance requirements vary by jurisdiction → **Mitigation:** Consult legal experts, configurable compliance settings
- **Risk:** Email deliverability issues → **Mitigation:** Use reputable email service, monitor bounces
- **Risk:** Large PDF files performance → **Mitigation:** Optimize PDF processing, async jobs
- **Risk:** Mobile signature experience → **Mitigation:** Responsive design, touch-optimized

### Compliance Considerations:
- ESIGN Act (US) compliance
- eIDAS (EU) compliance considerations
- Complete audit trail
- Tamper-evident sealing
- Consent capture
- Certificate of completion

---

**Epic Owner Sign-off:** ________________
**Date:** ________________
