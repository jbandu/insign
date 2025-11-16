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

    // Check if domain already exists
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.domain, validatedData.organizationDomain),
    })

    if (existingOrg) {
      return {
        success: false,
        error: 'Organization domain already exists',
      }
    }

    // Check if email already exists in any organization
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Email already registered',
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
        error: 'System roles not initialized. Please run database seeds.',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create organization
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: validatedData.organizationName,
        domain: validatedData.organizationDomain,
        subscriptionTier: 'trial',
        status: 'active',
      })
      .returning()

    // Create storage quota for organization
    await db.insert(storageQuotas).values({
      orgId: newOrg.id,
      totalBytes: 10737418240, // 10GB
      usedBytes: 0,
    })

    // Create admin user
    const [newUser] = await db
      .insert(users)
      .values({
        orgId: newOrg.id,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
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
    return {
      success: false,
      error: 'Failed to create account. Please try again.',
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
