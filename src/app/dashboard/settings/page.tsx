import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!currentUser) {
    return null
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, currentUser.orgId),
  })

  if (!organization) {
    return null
  }

  return (
    <SettingsClient
      user={{
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        language: currentUser.language,
      }}
      organization={{
        name: organization.name,
        domain: organization.domain,
        subscriptionTier: organization.subscriptionTier || 'trial',
        status: organization.status || 'active',
      }}
    />
  )
}
