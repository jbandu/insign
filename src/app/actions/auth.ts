'use server'

import { db } from '@/lib/db'
import { organizations, users, roles, storageQuotas } from '@/lib/db/schema'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'

export async function signup(input: SignupInput) {
  try {
    // Validate input
    const validatedData = signupSchema.parse(input)

    // Normalize email and domain
    const normalizedEmail = validatedData.email.toLowerCase().trim()
    const normalizedDomain = validatedData.organizationDomain.toLowerCase().trim()

    // Check if domain already exists
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.domain, normalizedDomain),
    })

    if (existingOrg) {
      return {
        success: false,
        error: 'This organization domain is already taken. Please choose a different domain.',
      }
    }

    // Check if email already exists in any organization
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    })

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in or use a different email.',
      }
    }

    // Get Admin role (system role)
    const adminRole = await db.query.roles.findFirst({
      where: and(
        eq(roles.name, 'Admin'),
        eq(roles.isSystem, true)
      ),
    })

    if (!adminRole) {
      return {
        success: false,
        error: 'System configuration error. Please contact support.',
      }
    }

    // Hash password with higher cost factor for security
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create organization
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: validatedData.organizationName.trim(),
        domain: normalizedDomain,
        subscriptionTier: 'trial',
        status: 'active',
      })
      .returning()

    // Create storage quota for organization
    await db.insert(storageQuotas).values({
      orgId: newOrg.id,
      totalBytes: 10737418240, // 10GB for trial
      usedBytes: 0,
    })

    // Create admin user
    const [newUser] = await db
      .insert(users)
      .values({
        orgId: newOrg.id,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: validatedData.firstName.trim(),
        lastName: validatedData.lastName.trim(),
        roleId: adminRole.id,
        emailVerified: new Date(), // Auto-verify for first user
        status: 'active',
      })
      .returning()

    return {
      success: true,
      data: {
        organizationId: newOrg.id,
        userId: newUser.id,
      },
    }
  } catch (error) {
    console.error('Signup error:', error)

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return {
          success: false,
          error: 'This email or domain is already in use.',
        }
      }
    }

    return {
      success: false,
      error: 'Unable to create your account at this time. Please try again later.',
    }
  }
}

export async function checkDomainAvailability(domain: string) {
  try {
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.domain, domain.toLowerCase()),
    })

    return {
      available: !existingOrg,
    }
  } catch (error) {
    console.error('Domain check error:', error)
    return {
      available: false,
      error: 'Failed to check domain availability',
    }
  }
}
