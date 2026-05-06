import { useEffect, useState } from 'react'
import { HealthCheck, Vote, Team } from './lib/types'
import { VotingView } from './components/VotingView'
import { TeamDetailsView } from './components/TeamDetailsView'
import { ParticipantResultsView } from './components/ParticipantResultsView'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Heart, UsersThree, Warning } from '@phosphor-icons/react'
import { Toaster } from './components/ui/sonner'
import { motion } from 'framer-motion'
import { createTeam, fetchAppData, submitVotes } from './lib/dataService'
import { generateHealthCheckId } from './lib/healthCheckUtils'
import { toast } from 'sonner'
import { PageStatusCard } from './components/PageStatusCard'

function App() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')

  const urlParams = new URLSearchParams(window.location.search)
  const checkId = urlParams.get('check')
  const teamId = urlParams.get('team')
  const forceResults = urlParams.get('results') === 'true'

  useEffect(() => {
    void handleRefresh()
  }, [])
  
  const handleVoteSubmit = async (votes: Vote[]) => {
    if (!checkId) {
      console.error('No checkId found for vote submission')
      return
    }

    await submitVotes(checkId, votes)
  }
  
  const handleRefresh = async () => {
    setIsLoading(true)

    try {
      const { teams: loadedTeams, healthChecks: loadedHealthChecks } = await fetchAppData()
      setTeams(loadedTeams)
      setHealthChecks(loadedHealthChecks)
    } catch (error) {
      console.error('Failed to refresh data', error)
      toast.error('Could not load mock data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    const name = newTeamName.trim()
    if (!name) {
      toast.error('Please enter a team name')
      return
    }

    const newTeam: Team = {
      id: generateHealthCheckId(),
      name,
      createdAt: Date.now(),
    }

    try {
      await createTeam(newTeam)
      setNewTeamName('')
      await handleRefresh()
      toast.success(`Team "${name}" created`)
    } catch (error) {
      console.error('Failed to create team', error)
      toast.error('Could not create team')
    }
  }
  
  if (teamId) {
    // Still loading — don't flash "not found" before data arrives
    if (isLoading) {
      return (
        <>
          <PageStatusCard
            loading
            title="Looking for team…"
            description="Fetching team data, please wait."
          />
          <Toaster />
        </>
      )
    }

    const team = teams.find((t) => t.id === teamId)
    
    if (!team) {
      return (
        <>
          <PageStatusCard
            icon={<Warning size={24} weight="bold" className="text-primary" />}
            title="Team Not Found"
            description="The team you're looking for doesn't exist or has been removed."
            action={{ label: 'Go to Home', onClick: () => { window.location.href = '/' } }}
          />
          <Toaster />
        </>
      )
    }
    
    const teamHealthChecks = healthChecks.filter(c => c.teamId === team.id)
    
    return (
      <>
        <TeamDetailsView
          team={team}
          healthChecks={teamHealthChecks}
          onBack={() => window.location.href = '/'}
          onRefresh={handleRefresh}
        />
        <Toaster />
      </>
    )
  }
  
  if (checkId) {
    const healthCheck = healthChecks.find((c) => c.id === checkId)

    if (!healthCheck && isLoading) {
      return (
        <>
          <PageStatusCard
            loading
            title="Loading health check…"
            description="Fetching health check data, please wait."
          />
          <Toaster />
        </>
      )
    }
    
    if (!healthCheck) {
      return (
        <>
          <PageStatusCard
            icon={<Warning size={24} weight="bold" className="text-primary" />}
            title="Health Check Not Found"
            description="The health check you're looking for doesn't exist or has been removed."
            action={{ label: 'Go to Home', onClick: () => { window.location.href = '/' } }}
          />
          <Toaster />
        </>
      )
    }
    
    const teamHealthChecks = healthChecks.filter(c => c.teamId === healthCheck.teamId)
    
    if (healthCheck.status === 'closed' || forceResults) {
      return (
        <>
          <ParticipantResultsView
            healthCheck={healthCheck}
            allHealthChecks={teamHealthChecks}
            onRefresh={handleRefresh}
          />
          <Toaster />
        </>
      )
    }
    
    return (
      <>
        <VotingView 
          healthCheck={healthCheck} 
          allHealthChecks={teamHealthChecks}
          onVoteSubmit={handleVoteSubmit}
          onRefresh={handleRefresh}
        />
        <Toaster />
      </>
    )
  }
  
  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
            <Heart size={32} weight="fill" className="text-primary" />
            <h1 className="text-2xl font-bold">Team Health Check</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Teams</h2>
              <p className="text-muted-foreground">Browse teams and create new ones</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    placeholder="New team name"
                  />
                  <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                    Create Team
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">Loading teams</h3>
                  <p className="text-muted-foreground">Please wait while we load local mock data.</p>
                </CardContent>
              </Card>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UsersThree size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                  <p className="text-muted-foreground">Create your first team above</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => window.location.href = `?team=${team.id}`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UsersThree size={20} weight="fill" className="text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {healthChecks.filter(c => c.teamId === team.id).length} health checks
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <Toaster />
    </>
  )
}

export default App