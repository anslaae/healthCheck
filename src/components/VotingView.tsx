import { useState } from 'react'
import { HealthCheck, VoteType, Vote } from '@/lib/types'
import { VoteButton } from './VoteButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantResultsView } from './ParticipantResultsView'
import { Heart, PaperPlaneRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface VotingViewProps {
  healthCheck: HealthCheck
  allHealthChecks: HealthCheck[]
  onVoteSubmit: (votes: Vote[]) => void
  onRefresh: () => void
}

export function VotingView({ healthCheck, allHealthChecks, onVoteSubmit, onRefresh }: VotingViewProps) {
  const [votes, setVotes] = useState<Record<string, VoteType>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submittedVotes, setSubmittedVotes] = useState<Record<string, VoteType>>({})
  
  const handleVote = (questionId: string, voteType: VoteType) => {
    setVotes((prev) => ({
      ...prev,
      [questionId]: voteType,
    }))
  }
  
  const handleSubmit = async () => {
    console.log('=== VOTE SUBMISSION STARTED ===')
    console.log('Current votes state:', votes)
    console.log('Health check ID:', healthCheck.id)
    console.log('Health check questions:', healthCheck.questions.length)
    
    const allQuestionsAnswered = healthCheck.questions.every(
      (q) => votes[q.id] !== undefined
    )
    
    console.log('All questions answered?', allQuestionsAnswered)
    
    if (!allQuestionsAnswered) {
      toast.error('Please answer all questions before submitting')
      return
    }
    
    const voteArray: Vote[] = Object.entries(votes).map(([questionId, vote]) => ({
      questionId,
      vote,
      timestamp: Date.now(),
    }))
    
    console.log('Vote array to submit:', voteArray)
    
    setSubmittedVotes(votes)
    
    console.log('Calling onVoteSubmit...')
    await onVoteSubmit(voteArray)
    console.log('onVoteSubmit completed')
    
    console.log('Waiting 300ms...')
    await new Promise(resolve => setTimeout(resolve, 300))
    
    console.log('Calling onRefresh...')
    await onRefresh()
    console.log('onRefresh completed')
    
    console.log('Setting submitted to true')
    setSubmitted(true)
    
    toast.success('Thank you for your feedback!', {
      description: 'Your anonymous response has been recorded.',
    })
    
    console.log('=== VOTE SUBMISSION COMPLETED ===')
  }
  
  if (submitted) {
    return (
      <ParticipantResultsView 
        healthCheck={healthCheck}
        allHealthChecks={allHealthChecks}
        onRefresh={onRefresh}
        userVotes={submittedVotes}
      />
    )
  }
  
  const progress = (Object.keys(votes).length / healthCheck.questions.length) * 100
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Heart size={32} weight="fill" className="text-primary" />
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
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
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
                      />
                      <VoteButton
                        voteType="ok"
                        selected={votes[question.id] === 'ok'}
                        onClick={() => handleVote(question.id, 'ok')}
                      />
                      <VoteButton
                        voteType="unhappy"
                        selected={votes[question.id] === 'unhappy'}
                        onClick={() => handleVote(question.id, 'unhappy')}
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
            disabled={Object.keys(votes).length !== healthCheck.questions.length}
          >
            <PaperPlaneRight size={20} weight="bold" className="mr-2" />
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  )
}
