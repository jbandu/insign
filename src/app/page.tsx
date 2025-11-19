import Link from 'next/link'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ShieldCheck,
  FileText,
  PenTool,
  Users,
  Lock,
  Zap,
  CheckCircle2,
  BarChart3,
  FolderKanban
} from 'lucide-react'
import { LanguageSelector } from '@/components/i18n/language-selector'
import { defaultLocale, type Locale } from '@/lib/i18n-config'

export default async function Home() {
  // Get current language from cookie
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale

  // Get translations
  const tAuth = await getTranslations({ locale, namespace: 'auth' })
  const tLanding = await getTranslations({ locale, namespace: 'landing' })

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-primary">Insign</h2>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector
              currentLanguage={locale}
              isAuthenticated={false}
              variant="dropdown"
            />
            <Button variant="ghost" asChild>
              <Link href="/auth/signin">{tAuth('signIn')}</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">{tAuth('signUp')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 md:py-32 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-5xl w-full text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span>{tLanding('hero.badge')}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {tLanding('hero.title')} <span className="text-primary">Insign</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            {tLanding('hero.subtitle')}
          </p>

          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {tLanding('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/auth/signup">
                {tLanding('hero.ctaPrimary')}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/auth/signin">{tLanding('hero.ctaSecondary')}</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">100%</div>
              <div className="text-sm text-muted-foreground">{tLanding('stats.secure')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">10GB</div>
              <div className="text-sm text-muted-foreground">{tLanding('stats.storage')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">{tLanding('stats.support')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">∞</div>
              <div className="text-sm text-muted-foreground">{tLanding('stats.signatures')}</div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.authentication.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.authentication.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.documents.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.documents.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <PenTool className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.signatures.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.signatures.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.users.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.users.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.security.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.security.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tLanding('features.analytics.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tLanding('features.analytics.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{tLanding('howItWorks.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {tLanding('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mb-4 mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">{tLanding('howItWorks.step1.title')}</h3>
              <p className="text-muted-foreground">
                {tLanding('howItWorks.step1.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">{tLanding('howItWorks.step2.title')}</h3>
              <p className="text-muted-foreground">
                {tLanding('howItWorks.step2.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">{tLanding('howItWorks.step3.title')}</h3>
              <p className="text-muted-foreground">
                {tLanding('howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {tLanding('cta.title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {tLanding('cta.subtitle', { appName: 'Insign' })}
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              {tLanding('cta.button')}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/auth/signup" className="hover:text-primary">Features</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/auth/signup" className="hover:text-primary">About</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Blog</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/auth/signup" className="hover:text-primary">Documentation</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">API</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
                <li><Link href="/auth/signup" className="hover:text-primary">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              <span>© 2024 Insign. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-primary">Twitter</Link>
              <Link href="#" className="hover:text-primary">LinkedIn</Link>
              <Link href="#" className="hover:text-primary">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
