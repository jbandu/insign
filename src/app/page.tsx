import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Insign</h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex flex-1 flex-col items-center justify-center p-24">
        <div className="max-w-5xl w-full items-center justify-between text-center">
          <h1 className="text-6xl font-bold mb-4">
            Welcome to <span className="text-primary">Insign</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Enterprise Internal Operations Platform
          </p>
          <p className="text-lg mb-8">
            Build Once, Replace Multiple SaaS Tools
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <Button size="lg" asChild>
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🔐 Unified Auth</h3>
            <p className="text-sm text-muted-foreground">
              One login, MFA, SSO support
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📄 Document Management</h3>
            <p className="text-sm text-muted-foreground">
              Upload, organize, search, share
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">✍️ E-Signatures</h3>
            <p className="text-sm text-muted-foreground">
              Digital signature workflows
            </p>
          </div>
        </div>
        </div>
      </div>
    </main>
  )
}
