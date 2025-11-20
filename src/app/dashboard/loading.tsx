import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  const statSkeletons = Array.from({ length: 4 })
  const listSkeletons = Array.from({ length: 5 })

  return (
    <div className="space-y-6" role="status" aria-busy aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted/80 animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted/70 animate-pulse" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statSkeletons.map((_, index) => (
          <Card key={`stat-${index}`} className="h-full">
            <CardHeader className="flex h-full flex-col justify-between space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted/80 animate-pulse" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {['documents', 'signatures'].map((section) => (
          <Card key={section} className="h-full">
            <CardHeader className="space-y-2">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-4 w-48 rounded bg-muted/80 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              {listSkeletons.map((_, index) => (
                <div
                  key={`${section}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted/70 animate-pulse" />
                  </div>
                  <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
