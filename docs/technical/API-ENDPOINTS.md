# API Endpoints - Insign Platform

> **Complete REST API documentation**
> Version: 1.0 | Last Updated: November 2025

---

## 🌐 Base URL

- **Production:** `https://api.insign.com/v1`
- **Staging:** `https://staging-api.insign.com/v1`
- **Development:** `http://localhost:3000/api/v1`

---

## 🔐 Authentication

All API requests require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/logout` | Logout and invalidate session |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/verify-email` | Verify email address |
| POST | `/auth/mfa/enable` | Enable MFA |
| POST | `/auth/mfa/verify` | Verify MFA setup |
| GET | `/auth/sso/{provider}/redirect` | Initiate SSO flow |
| POST | `/auth/sso/callback` | Handle SSO callback |

---

## 🏢 Organizations

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/organizations` | Create organization | - |
| GET | `/organizations/{id}` | Get organization details | org:read |
| PUT | `/organizations/{id}` | Update organization | org:admin |
| GET | `/organizations/{id}/settings` | Get settings | org:read |
| PUT | `/organizations/{id}/settings` | Update settings | org:admin |
| POST | `/organizations/{id}/sso` | Configure SSO | org:admin |

---

## 👥 Users

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users` | List users (paginated) | users:read |
| GET | `/users/{id}` | Get user details | users:read |
| GET | `/users/me` | Get current user | - |
| PUT | `/users/me` | Update own profile | - |
| POST | `/users/me/avatar` | Upload avatar | - |
| POST | `/users` | Create user (invite) | users:write |
| PUT | `/users/{id}` | Update user | users:write |
| DELETE | `/users/{id}` | Delete user | users:delete |
| GET | `/users/search?q={query}` | Search users | users:read |
| GET | `/users/me/sessions` | List active sessions | - |
| DELETE | `/users/me/sessions/{id}` | Revoke session | - |

---

## 🔑 Roles & Permissions

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/roles` | List roles | roles:read |
| POST | `/roles` | Create role | roles:admin |
| PUT | `/roles/{id}` | Update role | roles:admin |
| DELETE | `/roles/{id}` | Delete role | roles:admin |
| GET | `/permissions` | List all permissions | roles:read |

---

## 📄 Documents

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/documents` | List documents | documents:read |
| GET | `/documents/{id}` | Get document details | documents:read |
| POST | `/documents/upload` | Upload document | documents:write |
| PUT | `/documents/{id}` | Update document metadata | documents:write |
| DELETE | `/documents/{id}` | Delete document | documents:delete |
| GET | `/documents/{id}/download` | Download document | documents:read |
| GET | `/documents/{id}/preview` | Get preview URL | documents:read |
| GET | `/documents/search?q={query}` | Search documents | documents:read |
| POST | `/documents/bulk/delete` | Bulk delete | documents:delete |
| POST | `/documents/bulk/move` | Bulk move | documents:write |
| POST | `/documents/bulk/tag` | Bulk tag | documents:write |
| GET | `/documents/{id}/versions` | List versions | documents:read |
| POST | `/documents/{id}/versions` | Upload new version | documents:write |
| POST | `/documents/{id}/versions/{v}/restore` | Restore version | documents:write |
| POST | `/documents/{id}/share` | Share with users | documents:admin |
| GET | `/documents/{id}/permissions` | List permissions | documents:admin |
| DELETE | `/documents/{id}/permissions/{permId}` | Revoke access | documents:admin |
| POST | `/documents/{id}/share-link` | Generate share link | documents:admin |
| DELETE | `/documents/{id}/share-link/{linkId}` | Revoke share link | documents:admin |
| PUT | `/documents/{id}/metadata` | Update metadata | documents:write |
| POST | `/documents/{id}/tags` | Add tags | documents:write |

---

## 📁 Folders

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/folders` | List folders | documents:read |
| GET | `/folders/{id}` | Get folder details | documents:read |
| POST | `/folders` | Create folder | documents:write |
| PUT | `/folders/{id}` | Update folder | documents:write |
| DELETE | `/folders/{id}` | Delete folder | documents:delete |
| GET | `/folders/{id}/contents` | List folder contents | documents:read |
| PUT | `/folders/{id}/move` | Move folder | documents:write |

---

## ✍️ E-Signatures

### Signature Requests

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/signature-requests` | List requests | signatures:read |
| GET | `/signature-requests/{id}` | Get request details | signatures:read |
| POST | `/signature-requests` | Create request | signatures:write |
| PUT | `/signature-requests/{id}` | Update request (draft) | signatures:write |
| DELETE | `/signature-requests/{id}` | Cancel request | signatures:write |
| POST | `/signature-requests/{id}/send` | Send request | signatures:write |
| POST | `/signature-requests/{id}/remind` | Send reminder | signatures:write |
| GET | `/signature-requests/{id}/status` | Get detailed status | signatures:read |
| GET | `/signature-requests/{id}/audit-log` | Get audit trail | signatures:read |
| GET | `/signature-requests/{id}/audit-log/export` | Export audit PDF | signatures:read |
| GET | `/signature-requests/{id}/certificate` | Get certificate | signatures:read |
| POST | `/signature-requests/{id}/certificate/verify` | Verify certificate | - |
| POST | `/signature-requests/{id}/seal` | Seal document | signatures:write |

### Fields & Participants

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signature-requests/{id}/fields` | Add signature field |
| PUT | `/signature-requests/{id}/fields/{fieldId}` | Update field |
| DELETE | `/signature-requests/{id}/fields/{fieldId}` | Delete field |
| POST | `/signature-requests/{id}/participants` | Add participant |
| PUT | `/signature-requests/{id}/participants/{partId}` | Update participant |
| DELETE | `/signature-requests/{id}/participants/{partId}` | Remove participant |

### Signing (Public Access)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sign/{access_token}` | Access signing page |
| GET | `/sign/{access_token}/document` | Get document |
| POST | `/sign/{access_token}/view` | Log document view |
| POST | `/sign/{access_token}/download` | Download unsigned copy |
| POST | `/sign/{access_token}/decline` | Decline to sign |
| GET | `/sign/{access_token}/fields` | Get fields for signer |
| POST | `/sign/{access_token}/signature` | Submit signature |
| POST | `/sign/{access_token}/complete` | Complete signing |
| GET | `/share/{token}` | Access shared document |

---

## 🏷️ Tags

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/tags` | List org tags | documents:read |
| POST | `/tags` | Create tag | documents:write |
| PUT | `/tags/{id}` | Update tag | documents:write |
| DELETE | `/tags/{id}` | Delete tag | documents:delete |

---

## 💾 Storage

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/storage/quota` | Get quota info | org:read |
| GET | `/storage/usage-by-folder` | Usage breakdown by folder | org:admin |
| GET | `/storage/usage-by-user` | Usage by user | org:admin |

---

## 📊 Templates

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/templates` | List templates | documents:read |
| POST | `/templates` | Create template | documents:write |
| GET | `/templates/{id}` | Get template | documents:read |
| PUT | `/templates/{id}` | Update template | documents:write |
| DELETE | `/templates/{id}` | Delete template | documents:delete |
| POST | `/templates/{id}/generate` | Generate from template | documents:write |

---

## 📈 Audit Logs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/audit-logs` | List audit logs | org:admin |
| GET | `/audit-logs/{id}` | Get log details | org:admin |
| GET | `/audit-logs/export` | Export logs to CSV | org:admin |

---

## 📝 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid or expired token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT` - Rate limit exceeded
- `SERVER_ERROR` - Internal server error

---

## 🚦 Rate Limiting

- **Default:** 100 requests per minute per user
- **Auth endpoints:** 10 requests per minute per IP
- **Upload endpoints:** 20 requests per minute per user
- **Search endpoints:** 60 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

---

## 📄 Pagination

List endpoints support pagination:

```
GET /api/documents?page=2&per_page=50&sort=created_at&order=desc
```

Parameters:
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 50, max: 100)
- `sort` - Sort field
- `order` - Sort order (`asc` or `desc`)

---

## 🔍 Filtering & Search

Most list endpoints support filtering:

```
GET /api/documents?folder_id={uuid}&tags=contract,finance&created_after=2024-01-01
```

Search endpoints:
```
GET /api/documents/search?q=quarterly+report&mime_type=application/pdf
```

---

**API Version:** 1.0
**Last Updated:** November 2025
