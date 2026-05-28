import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthSession } from '@/hooks/useAuthSession'
import { loginWithGithub } from '@/lib/authService'
import { shouldRedirectToOverviewAfterLogout } from '@/lib/logoutRedirect'
import { cn } from '@/lib/utils'
import { GithubLogo, SignIn, SignOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AuthMenuContentProps {
  onAction?: () => void
  className?: string
}

function initialsFromName(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'U'
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function AuthMenuContent({ onAction, className }: AuthMenuContentProps) {
  const { session, isLoading, signOut } = useAuthSession()
  const returnTo = window.location.pathname + window.location.search

  const handleSignOut = async () => {
    try {
      const shouldRedirect = await shouldRedirectToOverviewAfterLogout()
      await signOut()
      if (shouldRedirect) {
        window.location.href = '/'
        onAction?.()
        return
      }

      toast.success('Signed out')
      onAction?.()
    } catch (error) {
      console.error('Failed to sign out', error)
      toast.error('Could not sign out. Please try again.')
    }
  }

  return (
    <div className={cn('space-y-3 border-t pt-3 mt-3 px-1', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</p>
      {session.authenticated ? (
        <>
          <div className="rounded-lg border bg-muted/30 px-3 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-9 border bg-background">
                <AvatarImage src={session.user.avatarUrl} alt={session.user.name} />
                <AvatarFallback>{initialsFromName(session.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-none">{session.user.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">@{session.user.login}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => { void handleSignOut() }}
            className="w-full justify-start rounded-lg gap-2 cursor-pointer"
          >
            <SignOut size={16} weight="bold" />
            Sign out
          </Button>
        </>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-3 py-3 space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to create private teams, manage members, and share invite links.</p>
          <Button
            variant="outline"
            onClick={() => {
              loginWithGithub(returnTo)
              onAction?.()
            }}
            disabled={isLoading}
            className="w-full justify-start rounded-lg gap-2 cursor-pointer"
          >
            {isLoading ? <SignIn size={16} className="animate-pulse" /> : <GithubLogo size={16} weight="fill" />}
            {isLoading ? 'Checking session…' : 'Sign in with GitHub'}
          </Button>
        </div>
      )}
    </div>
  )
}

