import { z } from 'zod'

// Folder validation
export const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
})

export const folderUpdateSchema = folderSchema.partial()

// Document validation
export const documentUploadSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(255),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
})

export const documentUpdateSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(255).optional(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

// Document sharing
export const documentShareSchema = z.object({
  documentId: z.string().uuid(),
  password: z.string().min(4).optional(),
  expiresAt: z.date().optional(),
  maxAccessCount: z.number().positive().optional(),
})

// Document permissions
export const documentPermissionSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  permissionLevel: z.enum(['read', 'write', 'delete', 'admin']),
  expiresAt: z.date().optional(),
}).refine((data) => data.userId || data.roleId, {
  message: 'Either userId or roleId must be provided',
})

// Document tag
export const documentTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#gray'),
})

// Types
export type FolderInput = z.infer<typeof folderSchema>
export type FolderUpdateInput = z.infer<typeof folderUpdateSchema>
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>
export type DocumentShareInput = z.infer<typeof documentShareSchema>
export type DocumentPermissionInput = z.infer<typeof documentPermissionSchema>
export type DocumentTagInput = z.infer<typeof documentTagSchema>
