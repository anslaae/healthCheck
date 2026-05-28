import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthSession } from '@/hooks/useAuthSession'
import { loginWithGithub } from '@/lib/authService'
import { GithubLogo, SignIn, SignOut, UserCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

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

export function AuthMenu() {
  const { session, isLoading, signOut } = useAuthSession()

  const returnTo = window.location.pathname + window.location.search

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out')
    } catch (error) {
      console.error('Failed to sign out', error)
      toast.error('Could not sign out. Please try again.')
    }
  }

  return (
    <div className="hidden md:block fixed top-4 right-4 z-50">
      {session.authenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/90 backdrop-blur-sm cursor-pointer"
              aria-label={`User menu for ${session.user.name}`}
            >
              <Avatar className="size-7">
                <AvatarImage src={session.user.avatarUrl} alt={session.user.name} />
                <AvatarFallback>{initialsFromName(session.user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium leading-none">{session.user.name}</div>
              <div className="text-xs text-muted-foreground">@{session.user.login}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { void handleSignOut() }} className="cursor-pointer">
              <SignOut size={16} weight="bold" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/90 backdrop-blur-sm cursor-pointer"
              aria-label={isLoading ? 'Loading authentication state' : 'Sign in'}
              disabled={isLoading}
            >
              {isLoading ? (
                <UserCircle size={20} className="animate-pulse" />
              ) : (
                <SignIn size={20} weight="bold" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sign in with</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => loginWithGithub(returnTo)}
              className="cursor-pointer"
              disabled={isLoading}
            >
              <GithubLogo size={16} weight="fill" />
              GitHub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
