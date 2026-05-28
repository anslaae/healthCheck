import { useEffect, useState } from 'react'
import { HealthCheck, Vote, Team } from './lib/types'
import { VotingView } from './components/VotingView'
import { TeamDetailsView } from './components/TeamDetailsView'
import { ParticipantResultsView } from './components/ParticipantResultsView'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Heart, Lock, Users, AlertTriangle } from 'lucide-react'
import { Toaster } from './components/ui/sonner'
import { motion } from 'framer-motion'
import { createTeam, fetchAppData, joinPrivateTeamByInvite, submitVotes } from './lib/dataService'
import { generateHealthCheckId } from './lib/healthCheckUtils'
import { toast } from 'sonner'
import { PageStatusCard } from './components/PageStatusCard'
import { useAsyncAction } from './hooks/useAsyncAction'
import { useAuthSession } from './hooks/useAuthSession'
import { Checkbox } from './components/ui/checkbox'
import { Label } from './components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion'

const PUBLIC_TEAMS_EXPANDED_STORAGE_KEY = 'healthcheck:publicTeamsExpanded'

function App() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamPrivate, setNewTeamPrivate] = useState(false)
  const [inviteHandled, setInviteHandled] = useState(false)
  const [isPublicTeamsExpanded, setIsPublicTeamsExpanded] = useState(true)
  const { session, isLoading: isAuthLoading } = useAuthSession()
  const { isRunning: isCreatingTeam, run: runCreateTeam } = useAsyncAction()

  const urlParams = new URLSearchParams(window.location.search)
  const checkId = urlParams.get('check')
  const teamId = urlParams.get('team')
  const inviteCode = urlParams.get('invite')
  const forceResults = urlParams.get('results') === 'true'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('authError')

    if (authError) {
      toast.error('Could not complete sign-in. Please try again.')
      params.delete('authError')
      const cleaned = params.toString()
      const nextUrl = cleaned ? `${window.location.pathname}?${cleaned}` : window.location.pathname
      window.history.replaceState({}, '', nextUrl)
    }

    void handleRefresh()
  }, [])

  useEffect(() => {
    if (inviteHandled || !inviteCode || isAuthLoading) {
      return
    }

    setInviteHandled(true)

    const handleInviteJoin = async () => {
      if (!session.authenticated) {
        toast.error('Please sign in before joining a private team invite')
        return
      }

      try {
        const result = await joinPrivateTeamByInvite(inviteCode)
        toast.success(`Joined ${result.teamName}`)
        window.location.href = `${window.location.origin}?team=${result.teamId}`
      } catch (error) {
        console.error('Failed to join team by invite', error)
        toast.error('Invite link is invalid, expired, or unavailable')
      }
    }

    void handleInviteJoin()
  }, [inviteCode, inviteHandled, isAuthLoading, session])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!session.authenticated) {
      setIsPublicTeamsExpanded(true)
      return
    }

    const savedState = window.localStorage.getItem(PUBLIC_TEAMS_EXPANDED_STORAGE_KEY)
    if (savedState === null) {
      // First signed-in visit defaults to collapsed public teams.
      setIsPublicTeamsExpanded(false)
      return
    }

    setIsPublicTeamsExpanded(savedState === 'true')
  }, [session.authenticated, isAuthLoading])

  const handleVoteSubmit = async (votes: Vote[]) => {
    if (!checkId) {
      console.error('No checkId found for vote submission')
      return
    }

    await submitVotes(checkId, votes)
  }

  const handleBackToTeamFromCheck = (teamIdToOpen: string) => {
    window.location.href = `${window.location.origin}?team=${teamIdToOpen}`
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

  const handleBackgroundRefresh = async () => {
    try {
      const { teams: loadedTeams, healthChecks: loadedHealthChecks } = await fetchAppData()
      setTeams(loadedTeams)
      setHealthChecks(loadedHealthChecks)
    } catch (error) {
      console.error('Failed to refresh data in background', error)
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
      visibility: newTeamPrivate ? 'private' : 'public',
      members: [],
    }

    await runCreateTeam(async () => {
      try {
        await createTeam(newTeam)
        setNewTeamName('')
        setNewTeamPrivate(false)
        await handleRefresh()
        toast.success(`Team "${name}" created`)
      } catch (error) {
        console.error('Failed to create team', error)
        toast.error('Could not create team')
      }
    })
  }

  const handlePublicTeamsExpandedChange = (expanded: boolean) => {
    setIsPublicTeamsExpanded(expanded)

    if (session.authenticated) {
      window.localStorage.setItem(PUBLIC_TEAMS_EXPANDED_STORAGE_KEY, String(expanded))
    }
  }

  const myTeams = session.authenticated
    ? teams.filter((team) => team.members.some((member) => member.userId === session.user.id))
    : []
  const publicTeams = teams.filter((team) => team.visibility === 'public')

  const renderTeamsGrid = (list: Team[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((team, index) => (
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
                  <Users size={20} className="text-primary fill-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {team.visibility === 'private' ? 'Private' : 'Public'} •{' '}
                    {healthChecks.filter(c => c.teamId === team.id).length} health checks
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      ))}
    </div>
  )
  
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
             icon={<AlertTriangle size={24} className="text-primary" />}
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
          session={session}
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
             icon={<AlertTriangle size={24} className="text-primary" />}
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
             onBackgroundRefresh={handleBackgroundRefresh}
             onBackToTeam={() => handleBackToTeamFromCheck(healthCheck.teamId)}
             onGoToVoting={() => window.location.href = `${window.location.origin}?check=${healthCheck.id}`}
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
          onBackgroundRefresh={handleBackgroundRefresh}
          onBackToTeam={() => handleBackToTeamFromCheck(healthCheck.teamId)}
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
             <Heart size={32} className="text-primary fill-primary" />
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
                    disabled={isCreatingTeam}
                  />
                  <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || isCreatingTeam || !session.authenticated}>
                    {isCreatingTeam ? 'Creating…' : 'Create Team'}
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="new-team-private"
                    checked={newTeamPrivate}
                    disabled={!session.authenticated || isCreatingTeam}
                    onCheckedChange={(checked) => setNewTeamPrivate(Boolean(checked))}
                  />
                   <Label htmlFor="new-team-private" className="flex items-center gap-2 text-sm">
                     <Lock size={14} />
                     Private team (members only)
                   </Label>
                </div>
                {!session.authenticated && !isAuthLoading && (
                  <p className="mt-3 text-sm text-muted-foreground">Sign in to create teams or make teams private.</p>
                )}
              </CardContent>
            </Card>
            
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">Loading teams</h3>
                  <p className="text-muted-foreground">Please wait while we load local mock data.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {session.authenticated && !isAuthLoading && (
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold">My Teams ({myTeams.length})</h3>
                      <p className="text-sm text-muted-foreground">Private teams where you are a member.</p>
                    </div>
                    {myTeams.length === 0 ? (
                      <Card>
                        <CardContent className="py-10 text-center">
                          <h4 className="text-base font-semibold mb-1">You are not in any private teams yet</h4>
                          <p className="text-sm text-muted-foreground">Use an invite link to join or create a new private team above.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      renderTeamsGrid(myTeams)
                    )}
                  </section>
                )}

                {session.authenticated && !isAuthLoading ? (
                  <Card>
                    <Accordion
                      type="single"
                      collapsible
                      value={isPublicTeamsExpanded ? 'public-teams' : ''}
                      onValueChange={(value) => handlePublicTeamsExpandedChange(value === 'public-teams')}
                    >
                      <AccordionItem value="public-teams" className="border-none">
                        <CardHeader>
                          <AccordionTrigger className="py-0 hover:no-underline">
                            <div className="text-left">
                              <CardTitle>Public Teams ({publicTeams.length})</CardTitle>
                              <CardDescription>Teams anyone can view and join via links.</CardDescription>
                            </div>
                          </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                          <CardContent>
                            {publicTeams.length === 0 ? (
                              <div className="py-10 text-center">
                                <h4 className="text-base font-semibold mb-1">No public teams yet</h4>
                                <p className="text-sm text-muted-foreground">Create a public team above to get started.</p>
                              </div>
                            ) : (
                              renderTeamsGrid(publicTeams)
                            )}
                          </CardContent>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                ) : teams.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                      <p className="text-muted-foreground">Create your first team above</p>
                    </CardContent>
                  </Card>
                ) : (
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold">Public Teams ({publicTeams.length})</h3>
                      <p className="text-sm text-muted-foreground">Teams anyone can view and join via links.</p>
                    </div>
                    {renderTeamsGrid(publicTeams)}
                  </section>
                )}
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