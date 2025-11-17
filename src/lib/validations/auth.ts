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

// Password validation with strength requirements
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.\/])[A-Za-z\d@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.\/]{8,}$/

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    passwordRegex,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must not exceed 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must not exceed 50 characters'),
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
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
})

// Signup validation (creates both org and user)
export const signupSchema = z.object({
  // Organization
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name must not exceed 100 characters'),
  organizationDomain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .max(63, 'Domain must not exceed 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Domain can only contain lowercase letters, numbers, and hyphens')
    .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
      message: 'Domain cannot start or end with a hyphen',
    })
    .toLowerCase(),

  // User
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must not exceed 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must not exceed 50 characters'),

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
// Password reset validation
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Email verification validation
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

// Profile update validation
export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must not exceed 50 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must not exceed 50 characters').optional(),
  avatarUrl: z.string().url('Invalid URL').optional().nullable(),
})

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
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
