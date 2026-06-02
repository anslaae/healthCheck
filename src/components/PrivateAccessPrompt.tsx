import { Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginWithGithub } from '@/lib/authService'
import { GithubLogoIcon } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'

interface PrivateAccessPromptProps {
  title?: string
  description?: string
  returnUrl: string
}

export function PrivateAccessPrompt({
  title = 'Private Access Required',
  description = 'You need to sign in to view this content.',
  returnUrl
}: PrivateAccessPromptProps) {
  return (
    <>
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with GitHub to access this private team or join via invite.
            </p>
            <Button
              onClick={() => loginWithGithub(returnUrl)}
              className="w-full gap-2"
              size="lg"
            >
              <GithubLogoIcon size={18} weight="fill" />
              Sign in with GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full gap-2"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </>
  )
}



