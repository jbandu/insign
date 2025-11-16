import { getFolders } from '@/app/actions/folders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderPlus } from 'lucide-react'
import { FoldersList } from '@/components/dashboard/folders-list'
import Link from 'next/link'

export default async function FoldersPage() {
  const result = await getFolders()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Folders</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const foldersList = result.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Folders</h2>
          <p className="text-muted-foreground">
            Organize your documents with folders
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/folders/new">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Folders</CardTitle>
          <CardDescription>
            {foldersList.length} {foldersList.length === 1 ? 'folder' : 'folders'} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FoldersList folders={foldersList} />
        </CardContent>
      </Card>
    </div>
  )
}
