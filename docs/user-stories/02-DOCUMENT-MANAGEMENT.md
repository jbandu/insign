# Epic 2: Document Management System

**Epic ID:** EPIC-02
**Epic Owner:** Product Lead
**Status:** 📋 Backlog
**Priority:** Critical
**Story Points:** 68
**Sprint:** 3-6

---

## Epic Overview

Document Management System provides enterprise-grade document storage, organization, search, sharing, and version control capabilities. Built on Supabase Storage with PostgreSQL metadata, it serves as the foundation for document-based workflows including e-signatures.

### Business Value
- Centralized document repository for organizations
- Secure storage with granular permissions
- Version control and audit trails
- Full-text search and tagging
- Foundation for e-signature and workflow features

### Success Criteria
- Users can upload, organize, and find documents easily
- Support for common file types (PDF, DOCX, XLSX, images)
- Sub-second search response time
- 99.99% uptime for document access
- Zero data loss with versioning
- Storage quota management per organization

---

## Technical Context

### Database Tables Required
```sql
documents (id, org_id, folder_id, name, file_path, mime_type, size, version, metadata, created_by, created_at)
folders (id, org_id, parent_id, name, path, permissions_inherited, created_by, created_at)
document_versions (id, document_id, version, file_path, size, changes_description, created_by, created_at)
document_permissions (id, document_id, user_id, role_id, permission_level, granted_by, granted_at)
document_shares (id, document_id, share_token, expires_at, password_hash, access_count, created_by)
document_tags (id, org_id, name, color)
document_tag_assignments (document_id, tag_id)
document_templates (id, org_id, name, file_path, category, variables, created_by)
storage_quotas (org_id, total_bytes, used_bytes, updated_at)
```

### Supabase Integration
- **Storage:** Supabase Storage buckets for file storage
- **Database:** PostgreSQL for metadata and search
- **RLS:** Row Level Security for multi-tenant isolation
- **Full-text Search:** PostgreSQL `tsvector` for document search
- **Functions:** Edge Functions for file processing (thumbnails, previews)

### File Handling
- **Supported Types:** PDF, DOCX, XLSX, PPTX, TXT, images (PNG, JPG, GIF)
- **Size Limit:** 10MB per file (configurable per org)
- **Virus Scanning:** Integration with ClamAV or similar
- **Thumbnails:** Auto-generate for images and PDFs

### Security Requirements
- Encryption at rest and in transit
- Signed URLs for secure file access
- Granular permissions (read, write, delete, share, admin)
- Audit all file access and modifications
- Prevent unauthorized downloads

---

## User Stories

### 1. Document Upload & Storage

#### [US-2.1] Upload Single Document
**As a** user with document write permission
**I want to** upload a document to a folder
**So that** I can store and organize my files

**Priority:** Critical
**Story Points:** 3
**Sprint:** 3

**Acceptance Criteria:**
- [ ] Given I am in a folder, when I click upload and select a file, then the file is uploaded
- [ ] Given I upload a file, when complete, then I see a success notification with file name
- [ ] Given I upload a file > 10MB, when I try, then I see an error message
- [ ] Given I upload an unsupported file type, when I try, then I see an error message
- [ ] Given I upload a file with duplicate name, when I try, then I am prompted to rename or replace

**Technical Notes:**
- API Endpoints:
  - `POST /api/documents/upload` - Upload file
  - `POST /api/documents/check-duplicate` - Check for duplicates
- Supabase Storage: Upload to `documents` bucket
- File path structure: `{org_id}/{folder_id}/{document_id}/{filename}`
- Generate thumbnail for images and PDF first page
- Extract metadata: file size, MIME type, dimensions (images)

**Database Schema:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  folder_id UUID REFERENCES folders(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  version INTEGER DEFAULT 1,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Full-text search index
ALTER TABLE documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_org_folder ON documents(org_id, folder_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);

-- Update search vector on insert/update
CREATE TRIGGER documents_search_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, metadata);

-- RLS Policy
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents they have access to"
  ON documents FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    AND (
      -- Document is in a folder user has access to
      folder_id IN (
        SELECT id FROM folders WHERE has_folder_access(id, auth.uid())
      )
      OR
      -- User has explicit permission
      id IN (
        SELECT document_id FROM document_permissions
        WHERE user_id = auth.uid() OR role_id IN (
          SELECT role_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );
```

**UI/UX Requirements:**
- Drag-and-drop upload area
- File input button as fallback
- Upload progress bar
- Preview uploaded file thumbnail
- Duplicate file handling dialog

**Test Scenarios:**
- [ ] Happy path: Upload PDF file successfully
- [ ] Edge case: Upload file with special characters in name
- [ ] Edge case: Upload file exactly at 10MB limit
- [ ] Edge case: Upload while offline (queue for later)
- [ ] Error handling: Network failure mid-upload
- [ ] Security: Attempt to upload malicious file
- [ ] Security: Upload with SQL injection in filename

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed

---

#### [US-2.2] Bulk Document Upload
**As a** user
**I want to** upload multiple documents at once
**So that** I can efficiently add many files

**Priority:** High
**Story Points:** 5
**Sprint:** 3

**Acceptance Criteria:**
- [ ] Given I select multiple files, when I upload, then all files are uploaded in parallel
- [ ] Given I upload multiple files, when in progress, then I see overall progress and individual file status
- [ ] Given a file fails during bulk upload, when others succeed, then I see which files failed
- [ ] Given I upload files, when some are duplicates, then I can choose to skip or replace each
- [ ] Given I start a bulk upload, when I navigate away, then uploads continue in background

**Technical Notes:**
- Use concurrent uploads (max 3 parallel)
- Queue remaining files
- Store upload state in browser (resume on refresh)
- Emit progress events via WebSocket
- API: Same endpoint, handle multipart/form-data with multiple files

**UI/UX Requirements:**
- Multi-select file picker
- Upload queue list showing each file
- Individual progress bars
- Pause/resume/cancel buttons
- Summary: X of Y files uploaded successfully

**Test Scenarios:**
- [ ] Happy path: Upload 10 files successfully
- [ ] Edge case: Upload 100+ files
- [ ] Edge case: Mix of valid and invalid file types
- [ ] Edge case: Browser refresh mid-upload (resume)
- [ ] Error handling: One file fails, others continue
- [ ] Performance: Large files upload without blocking UI

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Performance testing completed

---

### 2. Folder Structure & Organization

#### [US-2.3] Create and Manage Folders
**As a** user
**I want to** create folders and subfolders
**So that** I can organize documents hierarchically

**Priority:** Critical
**Story Points:** 5
**Sprint:** 3

**Acceptance Criteria:**
- [ ] Given I am in a location, when I create a folder, then it appears in the current location
- [ ] Given I have a folder, when I create a subfolder, then it appears nested under parent
- [ ] Given I have a folder, when I rename it, then the name updates everywhere
- [ ] Given I have a folder with contents, when I try to delete it, then I see a confirmation warning
- [ ] Given I delete a folder, when confirmed, then folder and contents are soft-deleted

**Technical Notes:**
- API Endpoints:
  - `POST /api/folders` - Create folder
  - `PUT /api/folders/{id}` - Update folder
  - `DELETE /api/folders/{id}` - Delete folder
  - `GET /api/folders/{id}/contents` - List folder contents
- Path stored as materialized path: `/parent/child/grandchild`
- Soft delete: Set `deleted_at` timestamp
- Max depth: 10 levels to prevent abuse

**Database Schema:**
```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  parent_id UUID REFERENCES folders(id),
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- Materialized path for efficient queries
  description TEXT,
  permissions_inherited BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(org_id, parent_id, name),
  CHECK (path ~ '^(/[^/]+)+$') -- Validate path format
);

-- Index for path-based queries
CREATE INDEX idx_folders_path ON folders USING GIST (path gist_trgm_ops);
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- Function to check folder access
CREATE OR REPLACE FUNCTION has_folder_access(folder_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has direct permission or inherited permission
  RETURN EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = folder_id
    AND f.org_id IN (SELECT org_id FROM users WHERE id = user_id)
    -- Add permission checking logic here
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders in their org"
  ON folders FOR SELECT
  USING (has_folder_access(id, auth.uid()));
```

**UI/UX Requirements:**
- Folder tree navigation (expandable/collapsible)
- Breadcrumb navigation
- Right-click context menu: New folder, Rename, Delete, Share
- Keyboard shortcuts: N for new folder, F2 for rename
- Drag-and-drop to move folders

**Test Scenarios:**
- [ ] Happy path: Create nested folder structure
- [ ] Edge case: Create folder with name that already exists
- [ ] Edge case: Delete folder with 100+ files
- [ ] Edge case: Circular reference prevention (folder moved into itself)
- [ ] Error handling: Network error during creation
- [ ] Security: Non-owner tries to delete folder

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

#### [US-2.4] Move Documents Between Folders
**As a** user
**I want to** move documents and folders to different locations
**So that** I can reorganize my files

**Priority:** High
**Story Points:** 3
**Sprint:** 3

**Acceptance Criteria:**
- [ ] Given I select documents, when I drag them to a folder, then they are moved
- [ ] Given I move documents, when complete, then they appear in the new location
- [ ] Given I move a folder, when complete, then all contents move with it
- [ ] Given I move items, when I lack permission in destination, then I see an error
- [ ] Given I move items, when successful, then I see a confirmation with undo option

**Technical Notes:**
- API Endpoints:
  - `PUT /api/documents/move` - Move documents
  - `PUT /api/folders/{id}/move` - Move folder
- Update folder_id and path for documents
- Update parent_id and recalculate paths for folders and descendants
- Check permissions before moving
- Audit log the move operation

**UI/UX Requirements:**
- Drag-and-drop between folders
- Multi-select with checkboxes
- "Move to" dialog with folder picker
- Undo button (30 seconds timeout)
- Confirmation toast notification

**Test Scenarios:**
- [ ] Happy path: Move documents between folders
- [ ] Edge case: Move folder with 1000+ descendants
- [ ] Edge case: Move to same location (no-op)
- [ ] Edge case: Undo move operation
- [ ] Error handling: Destination folder deleted mid-move
- [ ] Security: Attempt to move to restricted folder

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 3. Document Metadata & Tagging

#### [US-2.5] Add Metadata and Tags
**As a** user
**I want to** add metadata and tags to documents
**So that** I can categorize and find them easily

**Priority:** Medium
**Story Points:** 5
**Sprint:** 4

**Acceptance Criteria:**
- [ ] Given I view a document, when I click edit, then I can add title, description, and custom fields
- [ ] Given I edit metadata, when I save, then changes are recorded with version history
- [ ] Given I am editing, when I add tags, then I can create new tags or select existing
- [ ] Given I create a tag, when I save, then it's available for other documents
- [ ] Given I search by tag, when I query, then I see all documents with that tag

**Technical Notes:**
- API Endpoints:
  - `PUT /api/documents/{id}/metadata` - Update metadata
  - `POST /api/tags` - Create tag
  - `GET /api/tags` - List org tags
  - `POST /api/documents/{id}/tags` - Add tags to document
- Metadata stored in JSONB column for flexibility
- Tags are org-wide with color coding
- Full-text search includes tags

**Database Schema:**
```sql
CREATE TABLE document_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#gray',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE document_tag_assignments (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, tag_id)
);

-- Metadata JSONB structure
{
  "title": "Q4 Financial Report",
  "description": "Quarterly financial report for Q4 2024",
  "author": "John Doe",
  "department": "Finance",
  "custom": {
    "fiscal_year": "2024",
    "quarter": "Q4",
    "report_type": "Financial"
  }
}
```

**UI/UX Requirements:**
- Metadata editor with form fields
- Tag input with autocomplete
- Color picker for tag creation
- Tag chips displayed on document cards
- Filter by tag in sidebar

**Test Scenarios:**
- [ ] Happy path: Add metadata and tags
- [ ] Edge case: Tag name with special characters
- [ ] Edge case: Add 50+ tags to one document
- [ ] Edge case: Create duplicate tag name
- [ ] Error handling: Failed to save metadata
- [ ] Security: Prevent XSS in metadata fields

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 4. Search & Filtering

#### [US-2.6] Full-Text Document Search
**As a** user
**I want to** search for documents by name, content, and metadata
**So that** I can quickly find what I need

**Priority:** Critical
**Story Points:** 8
**Sprint:** 4

**Acceptance Criteria:**
- [ ] Given I enter a search query, when I search, then I see matching documents ranked by relevance
- [ ] Given I search, when results appear, then matches are highlighted
- [ ] Given I use advanced search, when I filter by type, date, tags, then results are filtered
- [ ] Given I search for content, when using PDF/DOCX, then I can search inside file content
- [ ] Given I have many results, when I paginate, then load time remains under 1 second

**Technical Notes:**
- PostgreSQL full-text search with `tsvector` and `tsquery`
- Index: `CREATE INDEX ON documents USING GIN(search_vector)`
- Search scope: filename, metadata, tags, and extracted file content
- Ranking: Use `ts_rank` for relevance scoring
- API Endpoints:
  - `GET /api/documents/search?q=query&filters=...` - Search documents
- Content extraction: Use Tika or similar for PDF/DOCX text extraction
- Store extracted text in `content_text` column

**Database Implementation:**
```sql
-- Add content text column
ALTER TABLE documents ADD COLUMN content_text TEXT;
ALTER TABLE documents ADD COLUMN content_search_vector tsvector;

-- Create index for content search
CREATE INDEX idx_documents_content_search
  ON documents USING GIN(content_search_vector);

-- Search function
CREATE OR REPLACE FUNCTION search_documents(
  org_uuid UUID,
  search_query TEXT,
  file_types TEXT[] DEFAULT NULL,
  tags TEXT[] DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM documents d
  WHERE d.org_id = org_uuid
    AND d.deleted_at IS NULL
    AND d.search_vector @@ websearch_to_tsquery('english', search_query)
    AND (file_types IS NULL OR d.mime_type = ANY(file_types))
    AND (tags IS NULL OR d.tags && tags)
    AND (date_from IS NULL OR d.created_at >= date_from)
    AND (date_to IS NULL OR d.created_at <= date_to)
  ORDER BY rank DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
```

**UI/UX Requirements:**
- Search bar with autocomplete suggestions
- Advanced search panel with filters
- Search results with snippets showing matches
- Sort by: Relevance, Date, Name
- Save search queries for quick access

**Test Scenarios:**
- [ ] Happy path: Search returns relevant results
- [ ] Edge case: Search with special characters
- [ ] Edge case: Empty search query
- [ ] Edge case: Search with 1000+ results
- [ ] Performance: Search response under 500ms
- [ ] Error handling: Search service unavailable
- [ ] Security: Prevent SQL injection in search query

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 5. Document Sharing & Permissions

#### [US-2.7] Share Document with Users
**As a** document owner
**I want to** share a document with specific users or roles
**So that** they can access it

**Priority:** High
**Story Points:** 5
**Sprint:** 4

**Acceptance Criteria:**
- [ ] Given I own a document, when I share it, then I can select users or roles
- [ ] Given I share a document, when I set permissions, then I can choose read, write, or admin
- [ ] Given I share a document, when complete, then recipients receive a notification
- [ ] Given I shared a document, when I view permissions, then I see who has access
- [ ] Given I am a recipient, when I receive a share, then the document appears in my shared folder

**Technical Notes:**
- API Endpoints:
  - `POST /api/documents/{id}/share` - Share document
  - `GET /api/documents/{id}/permissions` - List permissions
  - `DELETE /api/documents/{id}/permissions/{permissionId}` - Revoke access
- Permission levels: read, write, delete, admin
- Inheritance: Folder permissions can apply to documents
- Notifications: Email and in-app notification

**Database Schema:**
```sql
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'delete', 'admin')),
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_user ON document_permissions(user_id);

-- RLS Policy for permissions
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions for documents they can access"
  ON document_permissions FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

**UI/UX Requirements:**
- Share modal with user/role picker
- Permission level dropdown
- List of current shares with revoke button
- Expiration date picker (optional)
- Notification preferences toggle

**Test Scenarios:**
- [ ] Happy path: Share document with user
- [ ] Edge case: Share with user who already has access
- [ ] Edge case: Share with entire role (100+ users)
- [ ] Edge case: Revoke access while user is viewing
- [ ] Error handling: User not found
- [ ] Security: Cannot escalate own permissions

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed

---

#### [US-2.8] Generate Public Share Link
**As a** document owner
**I want to** generate a public link to share externally
**So that** people outside my organization can view the document

**Priority:** Medium
**Story Points:** 5
**Sprint:** 5

**Acceptance Criteria:**
- [ ] Given I own a document, when I generate a share link, then I receive a unique URL
- [ ] Given I generate a link, when I set options, then I can add expiration and password
- [ ] Given someone uses the link, when they visit, then they can view (not download) the document
- [ ] Given I want to revoke access, when I delete the link, then it no longer works
- [ ] Given I view link analytics, when I check, then I see access count and last accessed date

**Technical Notes:**
- Generate cryptographically secure tokens (32+ characters)
- Signed URLs for temporary access to files
- API Endpoints:
  - `POST /api/documents/{id}/share-link` - Generate link
  - `GET /api/share/{token}` - Access shared document
  - `DELETE /api/documents/{id}/share-link/{linkId}` - Revoke link
- Store share links with metadata
- Rate limit: 100 accesses per hour per link

**Database Schema:**
```sql
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- Bcrypt hashed password
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  max_access_count INTEGER,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_document_shares_token ON document_shares(share_token);
CREATE INDEX idx_document_shares_document ON document_shares(document_id);
```

**UI/UX Requirements:**
- Generate link button in share menu
- Link settings: Expiration, password, max uses
- Copy link button with confirmation
- Link management page showing all active links
- Analytics: Views over time chart

**Test Scenarios:**
- [ ] Happy path: Generate and access link
- [ ] Edge case: Link with password protection
- [ ] Edge case: Expired link (shows error)
- [ ] Edge case: Max access count reached
- [ ] Error handling: Invalid token
- [ ] Security: Token cannot be guessed
- [ ] Security: Prevent brute force password attempts

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 6. Version Control & History

#### [US-2.9] Document Version Control
**As a** user
**I want to** see version history and restore previous versions
**So that** I can track changes and recover from mistakes

**Priority:** High
**Story Points:** 8
**Sprint:** 5

**Acceptance Criteria:**
- [ ] Given I update a document, when I upload a new file, then a new version is created
- [ ] Given I view a document, when I check history, then I see all previous versions with dates
- [ ] Given I view version history, when I select a version, then I can preview or download it
- [ ] Given I want to restore, when I select a version, then it becomes the current version
- [ ] Given I upload a new version, when I save, then I can add a description of changes

**Technical Notes:**
- Store all versions in storage with version number in path
- API Endpoints:
  - `POST /api/documents/{id}/versions` - Upload new version
  - `GET /api/documents/{id}/versions` - List versions
  - `GET /api/documents/{id}/versions/{version}` - Get specific version
  - `POST /api/documents/{id}/versions/{version}/restore` - Restore version
- Track: version number, file size, uploaded by, upload date, changes
- Keep all versions indefinitely (or based on org policy)

**Database Schema:**
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  changes_description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id, version DESC);

-- Trigger to increment version on document update
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_path <> OLD.file_path THEN
    INSERT INTO document_versions (
      document_id, version, file_path, size_bytes, mime_type, created_by
    ) VALUES (
      OLD.id, OLD.version, OLD.file_path, OLD.size_bytes, OLD.mime_type, auth.uid()
    );
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION create_document_version();
```

**UI/UX Requirements:**
- Version history panel (sidebar or modal)
- Timeline view with version cards
- Compare versions (diff for text files)
- Preview version in-place
- Restore button with confirmation

**Test Scenarios:**
- [ ] Happy path: Upload new version and view history
- [ ] Edge case: Restore to version 5 when current is version 10
- [ ] Edge case: 100+ versions of same document
- [ ] Edge case: Delete document (versions retained)
- [ ] Error handling: Restore fails due to storage issue
- [ ] Performance: Load version list for document with many versions

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 7. Document Preview

#### [US-2.10] Preview Documents In-Browser
**As a** user
**I want to** preview documents without downloading
**So that** I can quickly view content

**Priority:** Medium
**Story Points:** 8
**Sprint:** 5

**Acceptance Criteria:**
- [ ] Given I click on a document, when it's supported, then I see a preview
- [ ] Given I preview a PDF, when rendered, then I can navigate pages and zoom
- [ ] Given I preview an image, when displayed, then I can zoom and pan
- [ ] Given I preview Office docs, when loaded, then formatting is preserved
- [ ] Given a file is too large, when I try to preview, then I see a download option instead

**Technical Notes:**
- PDF: Use PDF.js library
- Images: Native browser rendering with zoom controls
- Office docs: Convert to PDF or use Office Online API / Google Docs Viewer
- API Endpoints:
  - `GET /api/documents/{id}/preview` - Get preview URL (signed URL)
- Generate previews on upload (async job)
- Cache preview URLs (1 hour expiration)

**UI/UX Requirements:**
- Modal preview with fullscreen option
- Navigation: Next/previous document
- Zoom controls: Fit to width, fit to page, custom zoom
- Download and print buttons
- Close button and ESC key to exit

**Test Scenarios:**
- [ ] Happy path: Preview PDF with multiple pages
- [ ] Edge case: Preview very large image (20MB+)
- [ ] Edge case: Corrupted file (show error)
- [ ] Edge case: Unsupported file type (show message)
- [ ] Performance: Preview loads in under 2 seconds
- [ ] Security: Preview URL expires after use

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 8. Bulk Operations

#### [US-2.11] Bulk Document Operations
**As a** user
**I want to** perform operations on multiple documents at once
**So that** I can manage files efficiently

**Priority:** Medium
**Story Points:** 5
**Sprint:** 6

**Acceptance Criteria:**
- [ ] Given I select multiple documents, when I choose an action, then it applies to all
- [ ] Given I bulk delete, when I confirm, then all selected documents are deleted
- [ ] Given I bulk move, when I select destination, then all documents are moved
- [ ] Given I bulk tag, when I add tags, then all documents receive those tags
- [ ] Given a bulk operation, when in progress, then I see a progress indicator

**Technical Notes:**
- API Endpoints:
  - `POST /api/documents/bulk/delete` - Bulk delete
  - `POST /api/documents/bulk/move` - Bulk move
  - `POST /api/documents/bulk/tag` - Bulk tag
  - `POST /api/documents/bulk/download` - Bulk download (zip)
- Process in batches of 50 to avoid timeouts
- Use job queue for large operations
- Return job ID for progress tracking

**UI/UX Requirements:**
- Multi-select with checkboxes
- Bulk actions toolbar: Delete, Move, Tag, Download
- Progress modal for long operations
- Cancel button to abort operation
- Summary: X of Y completed successfully

**Test Scenarios:**
- [ ] Happy path: Bulk delete 10 documents
- [ ] Edge case: Bulk operation on 500+ documents
- [ ] Edge case: Partial failure (some docs succeed, some fail)
- [ ] Edge case: Cancel operation mid-progress
- [ ] Error handling: No permission for some documents
- [ ] Performance: Bulk operations complete in reasonable time

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 9. Storage Quota Management

#### [US-2.12] Storage Quota Tracking
**As an** Organization Admin
**I want to** monitor storage usage
**So that** I can manage costs and plan capacity

**Priority:** High
**Story Points:** 5
**Sprint:** 6

**Acceptance Criteria:**
- [ ] Given I am an admin, when I view storage, then I see total used vs. available
- [ ] Given storage is near limit, when checked, then I see a warning message
- [ ] Given storage reaches limit, when a user tries to upload, then they see an error
- [ ] Given I view usage, when I check details, then I see breakdown by folder/user
- [ ] Given I need more space, when I click upgrade, then I am directed to billing

**Technical Notes:**
- Calculate storage usage on file upload/delete
- Cache quota info (update every hour or on changes)
- API Endpoints:
  - `GET /api/storage/quota` - Get org quota info
  - `GET /api/storage/usage-by-folder` - Usage breakdown
  - `GET /api/storage/usage-by-user` - Usage by user
- Enforce quota on upload attempts
- Send notifications at 80%, 90%, 100% usage

**Database Schema:**
```sql
CREATE TABLE storage_quotas (
  org_id UUID PRIMARY KEY REFERENCES organizations(id),
  total_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
  used_bytes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE storage_quotas
    SET used_bytes = used_bytes + NEW.size_bytes, updated_at = NOW()
    WHERE org_id = NEW.org_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE storage_quotas
    SET used_bytes = used_bytes - OLD.size_bytes, updated_at = NOW()
    WHERE org_id = OLD.org_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE storage_quotas
    SET used_bytes = used_bytes - OLD.size_bytes + NEW.size_bytes, updated_at = NOW()
    WHERE org_id = NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_storage_usage();
```

**UI/UX Requirements:**
- Storage dashboard with progress bar
- Usage charts: Over time, by folder, by user
- Top 10 largest files list
- Warning banner when approaching limit
- Upgrade/contact sales CTA

**Test Scenarios:**
- [ ] Happy path: View storage usage
- [ ] Edge case: Upload when at 100% quota (rejected)
- [ ] Edge case: Delete files and see quota update
- [ ] Edge case: Large org with TB of data
- [ ] Performance: Quota check doesn't slow down uploads
- [ ] Accuracy: Used bytes matches actual storage

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 10. Document Templates

#### [US-2.13] Create and Use Document Templates
**As a** user
**I want to** create templates from documents
**So that** I can quickly generate new documents with standard formatting

**Priority:** Low
**Story Points:** 5
**Sprint:** 6

**Acceptance Criteria:**
- [ ] Given I have a document, when I save as template, then it's added to template library
- [ ] Given I create a template, when I define variables, then they can be filled when using template
- [ ] Given I use a template, when I create from it, then a new document is generated with variables filled
- [ ] Given I manage templates, when I view library, then I see all org templates by category
- [ ] Given I am an admin, when I manage templates, then I can delete or edit them

**Technical Notes:**
- Templates are special documents with variable placeholders
- Variables: `{{variable_name}}` syntax
- Categories: Contracts, Reports, Forms, Letters, etc.
- API Endpoints:
  - `POST /api/templates` - Create template
  - `GET /api/templates` - List templates
  - `POST /api/templates/{id}/generate` - Generate document from template
  - `DELETE /api/templates/{id}` - Delete template
- Support PDF and DOCX templates

**Database Schema:**
```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  variables JSONB DEFAULT '[]', -- [{name, type, required, default}]
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);

-- Variables JSONB structure
[
  {"name": "company_name", "type": "text", "required": true},
  {"name": "date", "type": "date", "required": true, "default": "today"},
  {"name": "amount", "type": "number", "required": false}
]
```

**UI/UX Requirements:**
- Template library with grid view
- Create from template wizard
- Variable input form
- Template preview before creation
- Category filter and search

**Test Scenarios:**
- [ ] Happy path: Create document from template
- [ ] Edge case: Template with 20+ variables
- [ ] Edge case: Missing required variable
- [ ] Edge case: Variable with invalid value
- [ ] Error handling: Template file corrupted
- [ ] Security: Prevent code injection in variables

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

## Epic Summary

### Total Story Points: 68

### Story Breakdown:
- US-2.1: Upload Single Document (3 points)
- US-2.2: Bulk Document Upload (5 points)
- US-2.3: Create and Manage Folders (5 points)
- US-2.4: Move Documents Between Folders (3 points)
- US-2.5: Add Metadata and Tags (5 points)
- US-2.6: Full-Text Document Search (8 points)
- US-2.7: Share Document with Users (5 points)
- US-2.8: Generate Public Share Link (5 points)
- US-2.9: Document Version Control (8 points)
- US-2.10: Preview Documents In-Browser (8 points)
- US-2.11: Bulk Document Operations (5 points)
- US-2.12: Storage Quota Tracking (5 points)
- US-2.13: Create and Use Document Templates (5 points)

### Critical Path (24 points):
1. US-2.1: Upload Single Document
2. US-2.3: Create and Manage Folders
3. US-2.6: Full-Text Document Search
4. US-2.7: Share Document with Users
5. US-2.9: Document Version Control

### Dependencies:
- Requires Epic 1 (Foundation & Auth) to be completed
- US-2.1 must be completed before US-2.2, US-2.4, US-2.9
- US-2.3 must be completed before US-2.4, US-2.7
- Document system is a dependency for Epic 3 (E-Signature)

### Technical Dependencies:
- Supabase Storage bucket configuration
- PostgreSQL full-text search setup
- PDF processing library (PDF.js, pdf-lib)
- Image processing for thumbnails
- File virus scanning service

### Risks & Mitigation:
- **Risk:** File upload performance for large files → **Mitigation:** Chunked uploads, progress indicators
- **Risk:** Storage costs grow quickly → **Mitigation:** Quota management, compression, deduplication
- **Risk:** Search performance degrades → **Mitigation:** Proper indexing, caching, pagination
- **Risk:** Preview fails for some file types → **Mitigation:** Graceful fallback to download

---

**Epic Owner Sign-off:** ________________
**Date:** ________________
