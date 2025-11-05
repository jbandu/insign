# Security Design - Insign Platform

> **Comprehensive security architecture and best practices**
> Version: 1.0 | Last Updated: November 2025

---

## 🔒 Security Overview

Insign implements **defense-in-depth** security with multiple layers:

1. **Infrastructure Security** - Supabase managed infrastructure
2. **Network Security** - TLS, firewall rules, DDoS protection
3. **Application Security** - Input validation, CSRF protection, rate limiting
4. **Data Security** - Encryption at rest and in transit
5. **Access Control** - Multi-tenant isolation, RBAC
6. **Audit & Compliance** - Complete audit trails, GDPR ready

---

## 🛡️ Threat Model

### Assets to Protect
- User credentials and sessions
- Organization data (documents, signatures)
- Personal identifiable information (PII)
- Business logic and IP

### Threat Actors
- External attackers (unauthorized access)
- Malicious insiders (data theft)
- Competitors (espionage)
- Automated bots (scraping, DDoS)

### Attack Vectors
- SQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Authentication bypass
- Privilege escalation
- Data exfiltration
- DDoS attacks

---

## 🔐 Authentication Security

### Password Policy
```
Minimum Requirements:
- Length: 12 characters
- Complexity: Uppercase, lowercase, number, special char
- History: Cannot reuse last 5 passwords
- Expiration: Optional (org policy)
- Lockout: 5 failed attempts = 15 min lockout
```

### Password Storage
- Hashing: bcrypt with cost factor 12
- Salting: Unique salt per password
- No plaintext storage

### Session Management
```typescript
// Session security measures
const session = {
  token: generateJWT(), // HS256 or RS256
  expiresIn: 8 * 60 * 60, // 8 hours
  refreshToken: generateSecureToken(64),
  refreshExpiresIn: 30 * 24 * 60 * 60, // 30 days
  device: captureDeviceInfo(),
  ipAddress: request.ip
};
```

### Multi-Factor Authentication (MFA)
- **Method:** TOTP (Time-based One-Time Password)
- **Standard:** RFC 6238
- **Backup Codes:** 10 single-use codes (hashed)
- **Enforcement:** Optional per-user, mandatory per-org

### Single Sign-On (SSO)
- **Protocols:** SAML 2.0, OAuth 2.0, OpenID Connect
- **Providers:** Google, Microsoft, Okta, Azure AD
- **Security:**
  - Validate SAML signatures
  - Verify token signatures (JWT)
  - Use HTTPS only
  - Implement CSRF tokens

---

## 🏢 Multi-Tenant Security

### Data Isolation
**Row Level Security (RLS) Policies:**

```sql
-- Example: Users can only see data from their org
CREATE POLICY "org_isolation"
  ON documents FOR ALL
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Applied to all tables:
- organizations
- users
- documents
- folders
- signature_requests
- etc.
```

### Tenant Identification
- **Method:** org_id in JWT claims
- **Validation:** Every API request
- **Enforcement:** Database RLS + application middleware

### Storage Isolation
```
Bucket structure:
├── documents/
│   ├── {org_id}/
│   │   ├── {folder_id}/
│   │   │   └── {document_id}/
│   │   │       └── {filename}

Supabase Storage Policies:
- Users can only access files in their org_id path
- Signed URLs expire after 1 hour
```

---

## 🔑 Authorization (RBAC)

### Permission Model
```
User -> Role -> Permissions -> Resources

Example:
Alice -> Manager -> documents:write -> Document X
```

### Permission Checking
**Application Level:**
```typescript
async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const user = await getUser(userId);
  const permissions = await getRolePermissions(user.roleId);
  return permissions.some(p =>
    p.resource === resource && p.action === action
  );
}

// Usage in API
app.delete('/api/documents/:id',
  requireAuth,
  requirePermission('documents', 'delete'),
  deleteDocumentHandler
);
```

**Database Level:**
```sql
-- RLS policy with permission check
CREATE POLICY "document_delete"
  ON documents FOR DELETE
  USING (
    has_permission(auth.uid(), 'documents', 'delete')
    AND org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
```

---

## 🔐 Data Encryption

### Encryption at Rest
- **Provider:** Supabase (AWS KMS)
- **Algorithm:** AES-256-GCM
- **Keys:** Automatically managed
- **Scope:** Database, storage, backups

### Encryption in Transit
- **Protocol:** TLS 1.3
- **Certificates:** Let's Encrypt (auto-renewed)
- **HSTS:** Enabled (max-age=31536000)
- **Perfect Forward Secrecy:** Yes

### Application-Level Encryption
For sensitive fields (MFA secrets, API keys):
```typescript
import { createCipheriv, createDecipheriv } from 'crypto';

function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('base64'),
    encrypted: encrypted.toString('base64'),
    authTag: authTag.toString('base64')
  });
}
```

---

## 🛡️ Input Validation & Sanitization

### API Input Validation
```typescript
import { z } from 'zod';

const documentUploadSchema = z.object({
  name: z.string().min(1).max(255),
  folderId: z.string().uuid(),
  file: z.instanceof(File)
    .refine(f => f.size <= 25 * 1024 * 1024, 'Max 25MB')
    .refine(f => ALLOWED_MIME_TYPES.includes(f.type), 'Invalid file type')
});

// Usage
const input = documentUploadSchema.parse(req.body);
```

### SQL Injection Prevention
- **Parameterized Queries:** Always use placeholders
- **ORM:** Supabase client handles escaping
- **Example:**
  ```typescript
  // ✅ Safe
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId);

  // ❌ Unsafe (never do this)
  const sql = `SELECT * FROM documents WHERE id = '${documentId}'`;
  ```

### XSS Prevention
- **React:** Auto-escapes by default
- **HTML Rendering:** Use DOMPurify for user HTML
- **Content Security Policy (CSP):**
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.insign.com;
  ```

### CSRF Prevention
- **Method:** SameSite cookies + CSRF tokens
- **Implementation:**
  ```typescript
  // Generate CSRF token on login
  const csrfToken = generateSecureToken(32);
  res.cookie('csrf-token', csrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  // Validate on state-changing requests
  if (req.body.csrfToken !== req.cookies['csrf-token']) {
    throw new ForbiddenError('Invalid CSRF token');
  }
  ```

---

## 🚦 Rate Limiting & DDoS Protection

### Rate Limits
```typescript
const rateLimits = {
  // Auth endpoints (prevent brute force)
  '/api/auth/login': '10 per 15 minutes per IP',
  '/api/auth/register': '5 per hour per IP',

  // Upload endpoints (prevent abuse)
  '/api/documents/upload': '20 per minute per user',

  // Search endpoints (prevent DoS)
  '/api/documents/search': '60 per minute per user',

  // Default
  '*': '100 per minute per user'
};
```

### DDoS Mitigation
- **CDN:** Cloudflare (edge protection)
- **WAF:** Web Application Firewall rules
- **Bot Detection:** Challenge suspicious traffic
- **Connection Limits:** Max connections per IP

---

## 📝 Audit Logging

### What to Log
```typescript
interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string; // login, document_upload, signature_request_sent, etc.
  resource: string;
  resourceId: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
}
```

### Security Events to Log
- Authentication (login, logout, failed attempts)
- Authorization (permission denied)
- Data access (view, download sensitive documents)
- Data modification (create, update, delete)
- Configuration changes (settings, roles, permissions)
- Signature events (sent, viewed, signed, declined)

### Log Retention
- **Standard Logs:** 1 year
- **Compliance Logs:** 7 years (e-signatures)
- **Security Logs:** Indefinite

### Log Protection
```sql
-- Make audit logs immutable
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_append_only"
  ON audit_logs FOR ALL
  USING (false) -- No reads/updates/deletes
  WITH CHECK (true); -- Only inserts allowed
```

---

## 🔍 Security Monitoring

### Real-Time Alerts
Trigger alerts on:
- Multiple failed login attempts (> 5 in 15 min)
- Unusual data access patterns
- Permission escalation attempts
- Bulk data exports
- API abuse (rate limit exceeded)
- Security policy violations

### Security Metrics
- Failed login rate
- Average session duration
- API error rate (4xx, 5xx)
- Audit log anomalies
- Vulnerability scan results

---

## 🧪 Security Testing

### Regular Security Audits
- **Frequency:** Quarterly
- **Scope:** Code review, penetration testing, vulnerability scanning
- **Tools:** OWASP ZAP, Burp Suite, SonarQube

### Automated Security Checks
```yaml
# GitHub Actions security workflow
- name: Security Scan
  run: |
    npm audit
    npm run lint:security
    docker scan $IMAGE
```

### Vulnerability Management
1. **Detection:** Automated scans (Dependabot, Snyk)
2. **Assessment:** Severity rating (Critical, High, Medium, Low)
3. **Remediation:** Patch within SLA (Critical: 24h, High: 7 days)
4. **Verification:** Re-scan after fix

---

## 📋 Compliance

### GDPR Compliance
- **Right to Access:** Export user data API
- **Right to Erasure:** Anonymize/delete user data
- **Right to Portability:** Data export in JSON format
- **Privacy by Design:** Default-deny permissions
- **Data Minimization:** Collect only necessary data
- **Consent Management:** Explicit opt-in for tracking

### E-Signature Compliance
- **ESIGN Act (US):** Complete audit trail, consent capture
- **eIDAS (EU):** Advanced electronic signature ready
- **Audit Requirements:**
  - Who signed (identity)
  - What was signed (document hash)
  - When signed (timestamp)
  - How signed (signature type)
  - Where signed (IP address)

### Data Retention
```typescript
const retentionPolicies = {
  documents: 'User-defined (default: indefinite)',
  signatures: '7 years (compliance)',
  auditLogs: '7 years (compliance)',
  sessions: '30 days after expiry',
  backups: '90 days'
};
```

---

## 🚨 Incident Response

### Incident Response Plan

**Phase 1: Detection & Analysis**
1. Alert triggered or incident reported
2. Validate incident (false positive check)
3. Assess severity and impact
4. Assign incident commander

**Phase 2: Containment**
1. Isolate affected systems
2. Revoke compromised credentials
3. Block malicious IPs
4. Enable additional logging

**Phase 3: Eradication**
1. Remove malware/backdoors
2. Patch vulnerabilities
3. Reset compromised passwords
4. Review access logs

**Phase 4: Recovery**
1. Restore from clean backups
2. Verify system integrity
3. Monitor for re-infection
4. Gradually restore services

**Phase 5: Post-Incident**
1. Root cause analysis
2. Update security controls
3. Document lessons learned
4. Notify affected users (if required)

### Contact Information
- **Security Team:** security@insign.com
- **Escalation:** On-call engineer (PagerDuty)
- **Legal:** legal@insign.com

---

## ✅ Security Checklist

### Pre-Deployment
- [ ] All dependencies up to date
- [ ] No secrets in code/config
- [ ] Environment variables set
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] RLS policies tested
- [ ] Security scan passed

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring alerts configured
- [ ] Backup job running
- [ ] SSL certificate valid
- [ ] DNS properly configured
- [ ] Security headers verified

---

## 📚 Security Resources

### Internal
- [Security Policy](../SECURITY_POLICY.md)
- [Incident Response Runbook](../INCIDENT_RESPONSE.md)
- [Vulnerability Disclosure](../SECURITY.md)

### External
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Security Version:** 1.0
**Last Security Audit:** TBD
**Next Audit:** TBD
