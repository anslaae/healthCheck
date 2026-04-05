import { useState } from 'react'
import { Team, HealthCheck, Question } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, CalendarBlank, ArrowsClockwise, ShareNetwork, Plus, Check, Trash, Eye, LockSimple, ChatCircleDots } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ParticipationChart } from './ParticipationChart'
import { QuestionTrendsChart } from './QuestionTrendsChart'
import { motion } from 'framer-motion'
import { generateHealthCheckId, generateQuestionId, DEFAULT_QUESTIONS } from '@/lib/healthCheckUtils'
import { closeHealthCheck, createHealthCheck } from '@/lib/dataService'

interface TeamDetailsViewProps {
  team: Team
  healthChecks: HealthCheck[]
  onBack: () => void
  onRefresh: () => void
}

export function TeamDetailsView({ team, healthChecks, onBack, onRefresh }: TeamDetailsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedTeamLink, setCopiedTeamLink] = useState(false)
  const [isCreatingCheck, setIsCreatingCheck] = useState(false)
  const [newCheckName, setNewCheckName] = useState('')
  const [checkQuestions, setCheckQuestions] = useState<Array<{text: string, happyExplanation?: string, unhappyExplanation?: string}>>(
    DEFAULT_QUESTIONS.map(q => ({ text: q.question, happyExplanation: q.happy, unhappyExplanation: q.unhappy }))
  )
  
  const sortedChecks = [...healthChecks].sort((a, b) => a.createdAt - b.createdAt)
  
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
    
    try {
      await createHealthCheck(newCheck)
      await onRefresh()

      toast.success(`Health check "${newCheck.name}" created`)

      setNewCheckName('')
      setCheckQuestions(DEFAULT_QUESTIONS.map(q => ({ text: q.question, happyExplanation: q.happy, unhappyExplanation: q.unhappy })))
      setIsCreatingCheck(false)
    } catch (error) {
      console.error('Failed to create health check', error)
      toast.error('Could not create health check')
    }
  }
  
  const handleGoToVoting = (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `${window.location.origin}?check=${checkId}`
  }
  
  const handleCloseCheck = async (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await closeHealthCheck(checkId)
      toast.success('Health check closed')
      await handleRefresh()
    } catch (error) {
      console.error('Failed to close health check', error)
      toast.error('Could not close health check')
    }
  }
  
  const handleViewCheck = (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `${window.location.origin}?check=${checkId}&results=true`
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onBack} className="cursor-pointer">
                <ArrowLeft weight="bold" className="mr-2" />
                Back
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to teams list</TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{team.name}</h1>
            <p className="text-sm text-muted-foreground">Team Overview & Trends</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyTeamLink}
                className="cursor-pointer"
              >
                {copiedTeamLink ? (
                  <>
                    <Check size={16} weight="bold" className="mr-2 text-happy" />
                    Copied
                  </>
                ) : (
                  <>
                    <ShareNetwork size={16} weight="bold" className="mr-2" />
                    Share
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy public team page link</TooltipContent>
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
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
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
        </div>
        
        {sortedChecks.length > 0 && <ParticipationChart healthChecks={sortedChecks} />}
        
        {sortedChecks.length > 0 && <QuestionTrendsChart healthChecks={sortedChecks} />}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <CalendarBlank size={20} weight="bold" className="text-accent" />
                </div>
                <div>
                  <CardTitle>Health Check History</CardTitle>
                  <CardDescription>
                    All health checks for this team
                  </CardDescription>
                </div>
              </div>
              <Dialog open={isCreatingCheck} onOpenChange={setIsCreatingCheck}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button className="cursor-pointer">
                        <Plus weight="bold" className="mr-2" />
                        New Check
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Create a new health check</TooltipContent>
                </Tooltip>
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
                    
                    <Button onClick={handleCreateHealthCheck} className="w-full cursor-pointer">
                      Create Health Check
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {sortedChecks.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No health checks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a health check for this team to start tracking trends
                </p>
                <Button onClick={() => setIsCreatingCheck(true)} className="cursor-pointer">
                  <Plus weight="bold" className="mr-2" />
                  Create Health Check
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
                                  className="cursor-pointer"
                                >
                                  <LockSimple size={16} weight="bold" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Close health check</TooltipContent>
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
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
