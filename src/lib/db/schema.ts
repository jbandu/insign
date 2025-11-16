import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  integer,
  jsonb,
  pgEnum,
  unique,
  index,
  check,
  inet,
  real,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'trial',
  'starter',
  'business',
  'enterprise',
])

export const organizationStatusEnum = pgEnum('organization_status', [
  'active',
  'suspended',
  'trial',
  'cancelled',
])

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
])

export const signatureRequestStatusEnum = pgEnum('signature_request_status', [
  'draft',
  'sent',
  'in_progress',
  'completed',
  'declined',
  'expired',
  'cancelled',
])

export const workflowTypeEnum = pgEnum('workflow_type', [
  'sequential',
  'parallel',
])

export const participantRoleEnum = pgEnum('participant_role', [
  'signer',
  'approver',
  'cc',
])

export const participantStatusEnum = pgEnum('participant_status', [
  'pending',
  'notified',
  'viewed',
  'signed',
  'declined',
  'expired',
])

export const signatureFieldTypeEnum = pgEnum('signature_field_type', [
  'signature',
  'initials',
  'date',
  'text',
  'checkbox',
  'dropdown',
])

export const signatureTypeEnum = pgEnum('signature_type', [
  'drawn',
  'typed',
  'uploaded',
  'certificate',
])

export const permissionLevelEnum = pgEnum('permission_level', [
  'read',
  'write',
  'delete',
  'admin',
])

// Core Tables

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').notNull().unique(),
  logoUrl: text('logo_url'),
  timezone: text('timezone').default('UTC'),
  settings: jsonb('settings').default({}),
  subscriptionTier: subscriptionTierEnum('subscription_tier').default('trial'),
  maxUsers: integer('max_users').default(50),
  maxStorageBytes: bigint('max_storage_bytes', { mode: 'number' }).default(10737418240),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  status: organizationStatusEnum('status').default('active'),
})

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueOrgName: unique().on(table.orgId, table.name),
  })
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    emailVerified: timestamp('email_verified'),
    password: text('password'),
    name: text('name'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    image: text('image'),
    avatarUrl: text('avatar_url'),
    roleId: uuid('role_id').references(() => roles.id),
    mfaEnabled: boolean('mfa_enabled').default(false),
    lastLogin: timestamp('last_login'),
    preferences: jsonb('preferences').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    status: userStatusEnum('status').default('active'),
  },
  (table) => ({
    uniqueOrgEmail: unique().on(table.orgId, table.email),
  })
)

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    description: text('description'),
  },
  (table) => ({
    uniqueResourceAction: unique().on(table.resource, table.action),
  })
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: { columns: [table.roleId, table.permissionId] },
  })
)

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  refreshToken: text('refresh_token').unique(),
  expiresAt: timestamp('expires_at').notNull(),
  deviceInfo: jsonb('device_info'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  lastActivity: timestamp('last_activity').defaultNow(),
})

export const mfaMethods = pgTable(
  'mfa_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').array(),
    enabled: boolean('enabled').default(false),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueUserType: unique().on(table.userId, table.type),
  })
)

export const ssoProviders = pgTable(
  'sso_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    config: jsonb('config').notNull(),
    enabled: boolean('enabled').default(true),
    attributeMapping: jsonb('attribute_mapping'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueOrgProvider: unique().on(table.orgId, table.provider),
  })
)

// Document Management Tables

export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): any => folders.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    path: text('path').notNull(),
    description: text('description'),
    permissionsInherited: boolean('permissions_inherited').default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    uniqueOrgParentName: unique().on(table.orgId, table.parentId, table.name),
  })
)

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').references(() => folders.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  version: integer('version').default(1),
  thumbnailUrl: text('thumbnail_url'),
  metadata: jsonb('metadata').default({}),
  tags: text('tags').array(),
  contentText: text('content_text'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    filePath: text('file_path').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    changesDescription: text('changes_description'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueDocVersion: unique().on(table.documentId, table.version),
  })
)

export const documentPermissions = pgTable('document_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  permissionLevel: permissionLevelEnum('permission_level').notNull(),
  grantedBy: uuid('granted_by')
    .notNull()
    .references(() => users.id),
  grantedAt: timestamp('granted_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
})

export const documentShares = pgTable('document_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').notNull().unique(),
  passwordHash: text('password_hash'),
  expiresAt: timestamp('expires_at'),
  accessCount: integer('access_count').default(0),
  maxAccessCount: integer('max_access_count'),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
})

export const documentTags = pgTable(
  'document_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').default('#gray'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueOrgName: unique().on(table.orgId, table.name),
  })
)

export const documentTagAssignments = pgTable(
  'document_tag_assignments',
  {
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => documentTags.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id),
    assignedAt: timestamp('assigned_at').defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.documentId, table.tagId] },
  })
)

// E-Signature Tables

export const signatureRequests = pgTable('signature_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  title: text('title').notNull(),
  message: text('message'),
  status: signatureRequestStatusEnum('status').default('draft'),
  workflowType: workflowTypeEnum('workflow_type').default('sequential'),
  expiresAt: timestamp('expires_at'),
  completedAt: timestamp('completed_at'),
  certificateUrl: text('certificate_url'),
  sealHash: text('seal_hash'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const signatureParticipants = pgTable('signature_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => signatureRequests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: participantRoleEnum('role').notNull().default('signer'),
  orderIndex: integer('order_index').notNull().default(0),
  status: participantStatusEnum('status').default('pending'),
  accessToken: text('access_token').notNull().unique(),
  notifiedAt: timestamp('notified_at'),
  viewedAt: timestamp('viewed_at'),
  signedAt: timestamp('signed_at'),
  declinedAt: timestamp('declined_at'),
  declineReason: text('decline_reason'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const signatureFields = pgTable('signature_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => signatureRequests.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').notNull(),
  type: signatureFieldTypeEnum('type').notNull(),
  pageNumber: integer('page_number').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  required: boolean('required').default(true),
  label: text('label'),
  options: jsonb('options'),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const signatures = pgTable('signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => signatureParticipants.id, { onDelete: 'cascade' }),
  fieldId: uuid('field_id')
    .notNull()
    .references(() => signatureFields.id),
  signatureData: text('signature_data').notNull(),
  signatureType: signatureTypeEnum('signature_type').notNull(),
  certificate: text('certificate'),
  timestamp: timestamp('timestamp').defaultNow(),
  ipAddress: inet('ip_address').notNull(),
  userAgent: text('user_agent'),
})

export const signatureAuditLogs = pgTable('signature_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => signatureRequests.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').references(
    () => signatureParticipants.id
  ),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
})

export const signatureCertificates = pgTable('signature_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => signatureRequests.id),
  certificateData: jsonb('certificate_data').notNull(),
  sealHash: text('seal_hash').notNull(),
  pdfUrl: text('pdf_url').notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
})

// Storage & Quotas

export const storageQuotas = pgTable('storage_quotas', {
  orgId: uuid('org_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  totalBytes: bigint('total_bytes', { mode: 'number' })
    .notNull()
    .default(10737418240),
  usedBytes: bigint('used_bytes', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Audit Logs

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource'),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').default(true),
  timestamp: timestamp('timestamp').defaultNow(),
})

// NextAuth Tables (for NextAuth.js v5)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  id_token: text('id_token'),
  scope: text('scope'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  (table) => ({
    pk: { columns: [table.identifier, table.token] },
  })
)

// Webhooks Table
export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().notNull(),
  description: text('description'),
  secret: text('secret').notNull(),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Relations
export const signatureRequestsRelations = relations(signatureRequests, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [signatureRequests.orgId],
    references: [organizations.id],
  }),
  document: one(documents, {
    fields: [signatureRequests.documentId],
    references: [documents.id],
  }),
  participants: many(signatureParticipants),
  fields: many(signatureFields),
  auditLogs: many(signatureAuditLogs),
}))

export const signatureParticipantsRelations = relations(signatureParticipants, ({ one, many }) => ({
  request: one(signatureRequests, {
    fields: [signatureParticipants.requestId],
    references: [signatureRequests.id],
  }),
  user: one(users, {
    fields: [signatureParticipants.userId],
    references: [users.id],
  }),
  signatures: many(signatures),
}))

export const signatureFieldsRelations = relations(signatureFields, ({ one }) => ({
  request: one(signatureRequests, {
    fields: [signatureFields.requestId],
    references: [signatureRequests.id],
  }),
  participant: one(signatureParticipants, {
    fields: [signatureFields.participantId],
    references: [signatureParticipants.id],
  }),
}))

export const signaturesRelations = relations(signatures, ({ one }) => ({
  participant: one(signatureParticipants, {
    fields: [signatures.participantId],
    references: [signatureParticipants.id],
  }),
  field: one(signatureFields, {
    fields: [signatures.fieldId],
    references: [signatureFields.id],
  }),
}))

export const signatureAuditLogsRelations = relations(signatureAuditLogs, ({ one }) => ({
  request: one(signatureRequests, {
    fields: [signatureAuditLogs.requestId],
    references: [signatureRequests.id],
  }),
  participant: one(signatureParticipants, {
    fields: [signatureAuditLogs.participantId],
    references: [signatureParticipants.id],
  }),
}))

// Documents Relations
export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.orgId],
    references: [organizations.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [documents.updatedBy],
    references: [users.id],
  }),
}))

// Folders Relations
export const foldersRelations = relations(folders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [folders.orgId],
    references: [organizations.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
  }),
  documents: many(documents),
}))

// Users Relations
export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}))

// Organizations Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  documents: many(documents),
  folders: many(folders),
}))

// Roles Relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.orgId],
    references: [organizations.id],
  }),
  users: many(users),
  permissions: many(rolePermissions),
}))

// Role Permissions Relations
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))

// Permissions Relations
export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}))
