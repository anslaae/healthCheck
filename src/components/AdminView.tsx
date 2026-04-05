import { useEffect, useState } from 'react'
import { Team, HealthCheck } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, UsersThree, Heart, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { generateHealthCheckId } from '@/lib/healthCheckUtils'
import { motion } from 'framer-motion'
import { TeamDetailsView } from './TeamDetailsView'
import { createTeam, deleteTeamWithChecks, fetchAppData } from '@/lib/dataService'

interface AdminViewProps {
  user: { login: string; avatarUrl: string }
  onLogout: () => void
}

export function AdminView({ user, onLogout }: AdminViewProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  
  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null)

  useEffect(() => {
    void handleRefresh()
  }, [])
  
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name')
      return
    }
    
    const newTeam: Team = {
      id: generateHealthCheckId(),
      name: newTeamName,
      createdAt: Date.now(),
    }
    
    try {
      await createTeam(newTeam)
      await handleRefresh()
      setNewTeamName('')
      setIsCreatingTeam(false)
      toast.success(`Team "${newTeam.name}" created`)
    } catch (error) {
      console.error('Failed to create team', error)
      toast.error('Could not create team')
    }
  }
  
  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeamWithChecks(teamId)
      await handleRefresh()
      toast.success('Team and associated health checks deleted')
    } catch (error) {
      console.error('Failed to delete team', error)
      toast.error('Could not delete team')
    }
  }
  
  const handleRefresh = async () => {
    try {
      const { teams: loadedTeams, healthChecks: loadedHealthChecks } = await fetchAppData()
      setTeams(loadedTeams)
      setHealthChecks(loadedHealthChecks)
    } catch (error) {
      console.error('Failed to refresh admin data', error)
      toast.error('Could not refresh data')
    }
  }
  
  const viewingTeam = viewingTeamId
    ? teams.find(t => t.id === viewingTeamId)
    : null
  
  if (viewingTeam) {
    const teamHealthChecks = (healthChecks || [])
      .filter(c => c.teamId === viewingTeam.id)
      .sort((a, b) => a.createdAt - b.createdAt)
    
    return (
      <TeamDetailsView
        team={viewingTeam}
        healthChecks={teamHealthChecks}
        onBack={() => setViewingTeamId(null)}
        onRefresh={handleRefresh}
      />
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart size={32} weight="fill" className="text-primary" />
            <h1 className="text-2xl font-bold">Team Health Check</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={user.avatarUrl} 
                alt={user.login}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium">{user.login}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="cursor-pointer">
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Teams</h2>
              <p className="text-muted-foreground">Manage your teams and health checks</p>
            </div>
            
            <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
              <DialogTrigger asChild>
                <Button className="cursor-pointer">
                  <Plus weight="bold" className="mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a team to organize your health checks
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Engineering Team"
                    />
                  </div>
                  <Button onClick={handleCreateTeam} className="w-full cursor-pointer">
                    Create Team
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {teams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UsersThree size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                <p className="text-muted-foreground mb-4">Create your first team to get started</p>
                <Button onClick={() => setIsCreatingTeam(true)} className="cursor-pointer">
                  <Plus weight="bold" className="mr-2" />
                  Create Team
                </Button>
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
                    onClick={() => setViewingTeamId(team.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UsersThree size={20} weight="fill" className="text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {healthChecks.filter(c => c.teamId === team.id).length} checks
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteTeam(team.id)
                          }}
                        >
                          <Trash size={16} />
                        </Button>
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
  )
}
