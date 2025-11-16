import { z } from 'zod'

// Organization validation
export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  domain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Domain can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),
  timezone: z.string().optional().default('UTC'),
})

export const organizationUpdateSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  logoUrl: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
})

export const userCreateSchema = userSchema.extend({
  roleId: z.string().uuid().optional(),
})

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  avatarUrl: z.string().url().optional().nullable(),
  roleId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Signup validation (creates both org and user)
export const signupSchema = z.object({
  // Organization
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationDomain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Domain can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),

  // User
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),

  // Terms
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Role validation
export const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
})

export const roleUpdateSchema = roleSchema.partial()

// Types
export type OrganizationInput = z.infer<typeof organizationSchema>
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>
export type UserInput = z.infer<typeof userSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RoleInput = z.infer<typeof roleSchema>
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>
