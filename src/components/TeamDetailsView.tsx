import { useState } from 'react'
import { AuthSessionResponse, Team, HealthCheck, Question } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ArrowLeft, CalendarBlank, ArrowsClockwise, ShareNetwork, Plus, Check, Trash, Eye, LockSimple, ChatCircleDots, LinkSimple, List } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ParticipationChart } from './ParticipationChart'
import { QuestionTrendsChart } from './QuestionTrendsChart'
import { AuthMenuContent } from './AuthMenuContent'
import { motion } from 'framer-motion'
import { generateHealthCheckId, generateQuestionId, DEFAULT_QUESTIONS } from '@/lib/healthCheckUtils'
import { closeHealthCheck, createHealthCheck, createPrivateTeamInvite, deleteHealthCheck, deleteTeam, updateTeamVisibility } from '@/lib/dataService'
import { useLoading } from '@/components/LoadingOverlay'

interface TeamDetailsViewProps {
  team: Team
  healthChecks: HealthCheck[]
  session: AuthSessionResponse
  onBack: () => void
  onRefresh: () => void
}

export function TeamDetailsView({ team, healthChecks, session, onBack, onRefresh }: TeamDetailsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedTeamLink, setCopiedTeamLink] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isCreatingCheck, setIsCreatingCheck] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [closingCheckId, setClosingCheckId] = useState<string | null>(null)
  const [isDeletingTeam, setIsDeletingTeam] = useState(false)
  const [isDeletingCheck, setIsDeletingCheck] = useState(false)
  const [newCheckName, setNewCheckName] = useState('')
  const [deletingCheckId, setDeletingCheckId] = useState<string | null>(null)
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [checkQuestions, setCheckQuestions] = useState<Array<{text: string, happyExplanation?: string, unhappyExplanation?: string}>>(
    DEFAULT_QUESTIONS.map(q => ({ text: q.question, happyExplanation: q.happy, unhappyExplanation: q.unhappy }))
  )
  const { setLoading } = useLoading()
  const isMember = session.authenticated && team.members.some((member) => member.userId === session.user.id)

  const sortedChecks = [...healthChecks].sort((a, b) => a.createdAt - b.createdAt)
  const isPrivateTeam = team.visibility === 'private'
  const memberCount = team.members.length
  const canSharePrivateInvite = team.visibility !== 'private' || isMember
  const shouldShowDeleteTeam = healthChecks.length === 0

  const totalQuestions = healthChecks.reduce((sum, check) => sum + check.questions.length, 0)
  const totalParticipants = healthChecks.reduce((sum, check) => {
    const uniqueVoters = check.questions.length > 0 
      ? Math.ceil(check.votes.length / check.questions.length) 
      : 0
    return sum + uniqueVoters
  }, 0)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }
  
  const handleCopyTeamLink = () => {
    const link = `${window.location.origin}?team=${team.id}`
    navigator.clipboard.writeText(link)
    setCopiedTeamLink(true)
    setTimeout(() => setCopiedTeamLink(false), 2000)
    toast.success('Team link copied to clipboard')
  }

  const handleCopyInviteLink = async () => {
    if (!session.authenticated || !isMember) {
      toast.error('Only private team members can share invite links')
      return
    }

    setIsGeneratingInvite(true)
    try {
      const { inviteUrl } = await createPrivateTeamInvite(team.id)
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedTeamLink(true)
      setTimeout(() => setCopiedTeamLink(false), 2000)
      toast.success('Invite link copied to clipboard')
    } catch (error) {
      console.error('Failed to create invite link', error)
      toast.error('Could not create invite link')
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleMakePrivate = async () => {
    if (!session.authenticated) {
      toast.error('Please sign in to make teams private')
      return
    }

    setIsUpdatingVisibility(true)
    try {
      await updateTeamVisibility(team.id, 'private')
      toast.success('Team is now private. You were added as a member.')
      await onRefresh()
    } catch (error) {
      console.error('Failed to update team visibility', error)
      toast.error('Could not make team private')
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const handleCreateHealthCheck = async () => {
    if (!newCheckName.trim()) {
      toast.error('Please enter a health check name')
      return
    }
    
    if (checkQuestions.filter(q => q.text.trim()).length === 0) {
      toast.error('Please add at least one question')
      return
    }
    
    const now = Date.now()
    const today = new Date(now).toDateString()
    
    const existingCheckToday = healthChecks.find(check => {
      const checkDate = new Date(check.createdAt).toDateString()
      return check.teamId === team.id && checkDate === today
    })
    
    if (existingCheckToday) {
      toast.error(`A health check already exists for this team today: "${existingCheckToday.name}"`)
      return
    }
    
    const questions: Question[] = checkQuestions
      .filter(q => q.text.trim())
      .map((q, index) => ({
        id: generateQuestionId(),
        text: q.text.trim(),
        order: index,
        happyExplanation: q.happyExplanation?.trim() || undefined,
        unhappyExplanation: q.unhappyExplanation?.trim() || undefined,
      }))
    
    const newCheck: HealthCheck = {
      id: generateHealthCheckId(),
      teamId: team.id,
      name: newCheckName,
      questions,
      createdAt: now,
      status: 'active',
      votes: [],
    }
    
    setIsSubmitting(true)
    setLoading(true)
    try {
      await createHealthCheck(newCheck)
      await onRefresh()

      toast.success(`Health check "${newCheck.name}" created`)
      window.location.href = `${window.location.origin}?check=${newCheck.id}`
    } catch (error) {
      console.error('Failed to create health check', error)
      toast.error('Could not create health check')
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }
  
  const handleGoToVoting = (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `${window.location.origin}?check=${checkId}`
  }
  
  const handleCloseCheck = async (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (closingCheckId) {
      return
    }

    setClosingCheckId(checkId)
    setLoading(true)
    try {
      await closeHealthCheck(checkId)
      toast.success('Health check closed')
      await handleRefresh()
    } catch (error) {
      console.error('Failed to close health check', error)
      toast.error('Could not close health check')
    } finally {
      setClosingCheckId(null)
      setLoading(false)
    }
  }

  const handleDeleteCheck = async (checkId: string) => {
    if (isDeletingCheck) {
      return
    }

    setIsDeletingCheck(true)
    setLoading(true)
    try {
      await deleteHealthCheck(checkId)
      toast.success('Health check deleted')
      setDeletingCheckId(null)
      await handleRefresh()
    } catch (error) {
      console.error('Failed to delete health check', error)
      toast.error('Could not delete health check')
    } finally {
      setIsDeletingCheck(false)
      setLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    setIsDeletingTeam(true)
    setLoading(true)
    try {
      await deleteTeam(team.id)
      toast.success('Team deleted')
      setIsDeleteTeamDialogOpen(false)
      window.location.href = `${window.location.origin}/`
    } catch (error) {
      console.error('Failed to delete team', error)
      toast.error('Could not delete team')
    } finally {
      setIsDeletingTeam(false)
      setLoading(false)
    }
  }

  const handleViewCheck = (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `${window.location.origin}?check=${checkId}&results=true`
  }
  
  return (
    <>
    <Dialog open={isCreatingCheck} onOpenChange={setIsCreatingCheck}>
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3 sm:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onBack} className="cursor-pointer shrink-0">
                <ArrowLeft weight="bold" className="mr-2" />
                <span className="hidden sm:inline">Back to Teams</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to teams list</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold truncate">{team.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Team Overview & Trends • {team.visibility === 'private' ? 'Private' : 'Public'}
            </p>
          </div>
          <div className="hidden md:flex items-center justify-end gap-2 flex-wrap">
          {team.visibility === 'public' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { void handleMakePrivate() }}
                  disabled={!session.authenticated || isUpdatingVisibility}
                  className="cursor-pointer"
                >
                  <LockSimple size={16} weight="bold" className="mr-2" />
                  {isUpdatingVisibility ? 'Updating…' : 'Make Private'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session.authenticated ? 'Only members can view private teams' : 'Sign in to make a team private'}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={team.visibility === 'private' ? () => { void handleCopyInviteLink() } : handleCopyTeamLink}
                disabled={team.visibility === 'private' && (!canSharePrivateInvite || isGeneratingInvite)}
                className="cursor-pointer"
              >
                {copiedTeamLink ? (
                  <>
                    <Check size={16} weight="bold" className="mr-2 text-happy" />
                    Copied
                  </>
                ) : (
                  <>
                    {team.visibility === 'private' ? <LinkSimple size={16} weight="bold" className="mr-2" /> : <ShareNetwork size={16} weight="bold" className="mr-2" />}
                    {team.visibility === 'private' ? 'Invite Link' : 'Share'}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {team.visibility === 'private'
                  ? isMember
                    ? 'Copy invite link for private team members (creating a new link invalidates old ones)'
                  : 'Only private team members can create invite links'
                : 'Copy public team page link'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCreatingCheck(true)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                <Plus size={16} weight="bold" className="mr-2" />
                New Check
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a new health check</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="cursor-pointer"
              >
                <ArrowsClockwise 
                  size={16} 
                  weight="bold" 
                  className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>
          {shouldShowDeleteTeam && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteTeamDialogOpen(true)}
                  disabled={isDeletingTeam}
                  className="cursor-pointer text-destructive hover:text-destructive"
                >
                  <Trash size={16} weight="bold" className="mr-2" />
                  Delete Team
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete this team</TooltipContent>
            </Tooltip>
          )}
          </div>
          <div className="md:hidden shrink-0">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer" aria-label="Open team actions menu" title="Menu">
                  <List size={18} weight="bold" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Team Actions</SheetTitle>
                </SheetHeader>
                <div className="mt-3 space-y-2 px-1">
                  {team.visibility === 'public' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        void handleMakePrivate()
                      }}
                      disabled={!session.authenticated || isUpdatingVisibility}
                      className="w-full justify-start rounded-lg cursor-pointer"
                    >
                      <LockSimple size={16} weight="bold" className="mr-2" />
                      {isUpdatingVisibility ? 'Updating…' : 'Make Private'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (team.visibility === 'private') {
                        void handleCopyInviteLink()
                        return
                      }
                      handleCopyTeamLink()
                    }}
                    disabled={team.visibility === 'private' && (!canSharePrivateInvite || isGeneratingInvite)}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    {copiedTeamLink ? (
                      <>
                        <Check size={16} weight="bold" className="mr-2 text-happy" />
                        Copied
                      </>
                    ) : (
                      <>
                        {team.visibility === 'private' ? <LinkSimple size={16} weight="bold" className="mr-2" /> : <ShareNetwork size={16} weight="bold" className="mr-2" />}
                        {team.visibility === 'private' ? 'Invite Link' : 'Share'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsCreatingCheck(true)
                    }}
                    disabled={isSubmitting}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    <Plus size={16} weight="bold" className="mr-2" />
                    New Check
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      void handleRefresh()
                    }}
                    disabled={isRefreshing}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    <ArrowsClockwise
                      size={16}
                      weight="bold"
                      className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </Button>
                  {shouldShowDeleteTeam && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        setIsDeleteTeamDialogOpen(true)
                      }}
                      disabled={isDeletingTeam}
                      className="w-full justify-start rounded-lg cursor-pointer text-destructive hover:text-destructive"
                    >
                      <Trash size={16} weight="bold" className="mr-2" />
                      Delete Team
                    </Button>
                  )}
                  <AuthMenuContent onAction={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div className={`grid gap-4 ${isPrivateTeam ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Health Checks</CardDescription>
              <CardTitle className="text-3xl">{healthChecks.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Participants</CardDescription>
              <CardTitle className="text-3xl">{totalParticipants}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Questions Asked</CardDescription>
              <CardTitle className="text-3xl">{totalQuestions}</CardTitle>
            </CardHeader>
          </Card>

          {isPrivateTeam && (
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Members</CardDescription>
                <CardTitle className="text-3xl">{memberCount}</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>

        {isPrivateTeam && (
          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="members" className="border-none">
                <CardHeader>
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <div className="text-left">
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>Members with access to this private team</CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent>
                    {team.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {team.members
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((member) => (
                            <div key={member.userId} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div>
                                <p className="text-sm font-medium leading-none">{member.name}</p>
                                <p className="text-xs text-muted-foreground">@{member.login}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        <Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="history" className="border-none">
              <CardHeader>
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="text-left">
                    <CardTitle>Health Check History</CardTitle>
                    <CardDescription>
                      All health checks for this team
                    </CardDescription>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
            {sortedChecks.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No health checks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a health check for this team to start tracking trends
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteTeamDialogOpen(true)}
                  disabled={isDeletingTeam}
                  className="cursor-pointer text-destructive hover:text-destructive"
                >
                  <Trash weight="bold" className="mr-2" />
                  Delete Team
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedChecks.map((check, index) => {
                  const uniqueVoters = check.questions.length > 0
                    ? Math.ceil(check.votes.length / check.questions.length)
                    : 0
                  
                  return (
                    <motion.div
                      key={check.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{check.name}</h4>
                            <Badge variant={check.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(check.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })} • {uniqueVoters} participants • {check.questions.length} questions
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {check.status === 'active' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => handleGoToVoting(check.id, e)}
                                  className="cursor-pointer"
                                >
                                  <ChatCircleDots size={16} weight="bold" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Go to voting</TooltipContent>
                            </Tooltip>
                          )}
                          {check.status === 'active' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => handleCloseCheck(check.id, e)}
                                  disabled={!!closingCheckId}
                                  className="cursor-pointer"
                                >
                                  {closingCheckId === check.id ? (
                                    <ArrowsClockwise size={16} weight="bold" className="animate-spin" />
                                  ) : (
                                    <LockSimple size={16} weight="bold" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {closingCheckId === check.id ? 'Closing health check…' : 'Close health check'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleViewCheck(check.id, e)}
                                className="cursor-pointer"
                              >
                                <Eye size={16} weight="bold" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View results</TooltipContent>
                          </Tooltip>
                          {check.votes.length === 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setDeletingCheckId(check.id) }}
                                  disabled={isDeletingCheck}
                                  className="cursor-pointer text-destructive hover:text-destructive"
                                >
                                  <Trash size={16} weight="bold" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete health check</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
                  <div className="flex justify-end">
                    <Button className="cursor-pointer" disabled={isSubmitting} onClick={() => setIsCreatingCheck(true)}>
                      <Plus weight="bold" className="mr-2" />
                      New Check
                    </Button>
                  </div>
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Health Check</DialogTitle>
            <DialogDescription>
              Create a new health check for {team.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="check-name">Health Check Name</Label>
              <Input
                id="check-name"
                value={newCheckName}
                onChange={(e) => setNewCheckName(e.target.value)}
                placeholder="Q1 2024 Health Check"
              />
            </div>

            <div className="space-y-2">
              <Label>Questions</Label>
              <p className="text-sm text-muted-foreground">
                Edit or add questions for team members to answer
              </p>
              {checkQuestions.map((question, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      value={question.text}
                      onChange={(e) => {
                        const newQuestions = [...checkQuestions]
                        newQuestions[index] = { ...newQuestions[index], text: e.target.value }
                        setCheckQuestions(newQuestions)
                      }}
                      placeholder={`Question ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCheckQuestions(checkQuestions.filter((_, i) => i !== index))
                      }}
                      className="cursor-pointer"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Happy (😊) explanation</Label>
                      <Textarea
                        value={question.happyExplanation || ''}
                        onChange={(e) => {
                          const newQuestions = [...checkQuestions]
                          newQuestions[index] = { ...newQuestions[index], happyExplanation: e.target.value }
                          setCheckQuestions(newQuestions)
                        }}
                        placeholder="Optional: What does 'happy' mean?"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unhappy (😞) explanation</Label>
                      <Textarea
                        value={question.unhappyExplanation || ''}
                        onChange={(e) => {
                          const newQuestions = [...checkQuestions]
                          newQuestions[index] = { ...newQuestions[index], unhappyExplanation: e.target.value }
                          setCheckQuestions(newQuestions)
                        }}
                        placeholder="Optional: What does 'unhappy' mean?"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCheckQuestions([...checkQuestions, { text: '' }])}
                className="cursor-pointer"
              >
                <Plus size={16} className="mr-2" />
                Add Question
              </Button>
            </div>

            <Button onClick={handleCreateHealthCheck} disabled={isSubmitting} className="w-full cursor-pointer">
              {isSubmitting ? 'Creating…' : 'Create Health Check'}
            </Button>
          </div>
        </DialogContent>

        {sortedChecks.length > 0 && <ParticipationChart healthChecks={sortedChecks} />}

        {sortedChecks.length > 0 && <QuestionTrendsChart healthChecks={sortedChecks} />}
      </main>
    </div>
    </Dialog>

    <AlertDialog
      open={!!deletingCheckId}
      onOpenChange={(open) => {
        if (!open && !isDeletingCheck) {
          setDeletingCheckId(null)
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete health check?</AlertDialogTitle>
          <AlertDialogDescription>
            This health check has no responses and will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingCheck}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeletingCheck}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (deletingCheckId) void handleDeleteCheck(deletingCheckId) }}
          >
            {isDeletingCheck ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={isDeleteTeamDialogOpen}
      onOpenChange={(open) => {
        if (!isDeletingTeam) {
          setIsDeleteTeamDialogOpen(open)
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete team?</AlertDialogTitle>
          <AlertDialogDescription>
            This team has no health checks and will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingTeam}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeletingTeam}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { void handleDeleteTeam() }}
          >
            {isDeletingTeam ? 'Deleting…' : 'Delete Team'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
