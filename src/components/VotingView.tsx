import { useState } from 'react'
import { HealthCheck, VoteType, Vote } from '@/lib/types'
import { VoteButton } from './VoteButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantResultsView } from './ParticipantResultsView'
import { ArrowLeftIcon, HeartIcon, PaperPlaneRightIcon, ListIcon } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AuthMenuContent } from './AuthMenuContent'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAsyncAction } from '@/hooks/useAsyncAction'

interface VotingViewProps {
  healthCheck: HealthCheck
  allHealthChecks: HealthCheck[]
  onVoteSubmit: (votes: Vote[]) => Promise<void>
  onRefresh: () => void
  onBackgroundRefresh?: () => Promise<void>
  onBackToTeam: () => void
}

export function VotingView({
  healthCheck,
  allHealthChecks,
  onVoteSubmit,
  onRefresh,
  onBackgroundRefresh,
  onBackToTeam,
}: VotingViewProps) {
  const [votes, setVotes] = useState<Record<string, VoteType>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submittedVotes, setSubmittedVotes] = useState<Record<string, VoteType>>({})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isRunning: isSubmitting, run: runSubmit } = useAsyncAction()

  const handleVote = (questionId: string, voteType: VoteType) => {
    setVotes((prev) => ({
      ...prev,
      [questionId]: voteType,
    }))
  }
  
  const handleSubmit = async () => {
    const allQuestionsAnswered = healthCheck.questions.every(
      (q) => votes[q.id] !== undefined
    )
    
    if (!allQuestionsAnswered) {
      toast.error('Please answer all questions before submitting')
      return
    }
    
    const voteArray: Vote[] = Object.entries(votes).map(([questionId, vote]) => ({
      questionId,
      vote,
      timestamp: Date.now(),
    }))
    
    setSubmittedVotes(votes)

    await runSubmit(async () => {
      try {
        await onVoteSubmit(voteArray)
        await new Promise(resolve => setTimeout(resolve, 300))
        await onRefresh()
        setSubmitted(true)

        toast.success('Thank you for your feedback!', {
          description: 'Your anonymous response has been recorded.',
        })
      } catch (error) {
        console.error('Failed to submit feedback', error)
        toast.error('Could not submit feedback. Please try again.')
      }
    })
  }
  
   if (submitted) {
     return (
       <ParticipantResultsView
         healthCheck={healthCheck}
         allHealthChecks={allHealthChecks}
         onRefresh={onRefresh}
         onBackgroundRefresh={onBackgroundRefresh}
         onBackToTeam={onBackToTeam}
         userVotes={submittedVotes}
       />
     )
   }

   const progress = (Object.keys(votes).length / healthCheck.questions.length) * 100

   return (
     <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onBackToTeam} className="cursor-pointer shrink-0">
                <ArrowLeftIcon weight="bold" className="mr-2" />
                <span className="hidden sm:inline">Back to Team Overview</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to team overview</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold truncate">{healthCheck.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Voting</p>
          </div>
          <div className="md:hidden shrink-0">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer" aria-label="Open voting menu" title="Menu">
                  <ListIcon size={18} weight="bold" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Voting Actions</SheetTitle>
                </SheetHeader>
                <div className="mt-3 space-y-2 px-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onBackToTeam()
                    }}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    <ArrowLeftIcon size={16} weight="bold" className="mr-2" />
                    Back to Team Overview
                  </Button>
                  <AuthMenuContent onAction={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <HeartIcon size={32} weight="fill" className="text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {healthCheck.name}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your feedback is anonymous and helps the team improve. Please answer honestly about how you feel regarding each aspect.
          </p>
          <Card className="max-w-2xl mx-auto bg-accent/5 border-accent/20">
            <CardContent className="py-4">
              <p className="text-sm text-foreground/80">
                🔒 <strong>Completely Anonymous:</strong> Only your vote is stored. No personal information, usernames, or identifiable data is collected. You can vote multiple times if you reload the page.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="bg-secondary rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        <div className="text-sm text-center text-muted-foreground">
          {Object.keys(votes).length} of {healthCheck.questions.length} answered
        </div>
        
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {healthCheck.questions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-3">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1">{question.text}</span>
                    </CardTitle>
                    {(question.happyExplanation || question.unhappyExplanation) && (
                      <CardDescription className="ml-11 space-y-1 text-sm">
                        {question.happyExplanation && (
                          <p className="flex items-start gap-2">
                            <span className="text-happy">😊</span>
                            <span>{question.happyExplanation}</span>
                          </p>
                        )}
                        {question.unhappyExplanation && (
                          <p className="flex items-start gap-2">
                            <span className="text-unhappy">😞</span>
                            <span>{question.unhappyExplanation}</span>
                          </p>
                        )}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <VoteButton
                        voteType="happy"
                        selected={votes[question.id] === 'happy'}
                        onClick={() => handleVote(question.id, 'happy')}
                        disabled={isSubmitting}
                      />
                      <VoteButton
                        voteType="ok"
                        selected={votes[question.id] === 'ok'}
                        onClick={() => handleVote(question.id, 'ok')}
                        disabled={isSubmitting}
                      />
                      <VoteButton
                        voteType="unhappy"
                        selected={votes[question.id] === 'unhappy'}
                        onClick={() => handleVote(question.id, 'unhappy')}
                        disabled={isSubmitting}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="sticky bottom-6 pt-6">
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full md:w-auto md:min-w-64 mx-auto flex shadow-lg text-lg h-14 cursor-pointer"
            disabled={Object.keys(votes).length !== healthCheck.questions.length || isSubmitting}
          >
            <PaperPlaneRightIcon size={20} weight="bold" className="mr-2" />
            {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  )
}
