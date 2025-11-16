export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
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
    </main>
  )
}
