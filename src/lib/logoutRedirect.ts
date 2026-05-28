import { fetchAppData } from './dataService'

function getCurrentRouteTarget(): { teamId?: string; checkId?: string } {
  const params = new URLSearchParams(window.location.search)
  const teamId = params.get('team') ?? undefined
  const checkId = params.get('check') ?? undefined
  return { teamId, checkId }
}

export async function shouldRedirectToOverviewAfterLogout(): Promise<boolean> {
  const { teamId, checkId } = getCurrentRouteTarget()

  if (!teamId && !checkId) {
    return false
  }

  try {
    const { teams, healthChecks } = await fetchAppData()

    const currentCheck = checkId
      ? healthChecks.find((candidate) => candidate.id === checkId)
      : undefined

    const team = teamId
      ? teams.find((candidate) => candidate.id === teamId)
      : currentCheck
        ? teams.find((candidate) => candidate.id === currentCheck.teamId)
        : undefined

    return team?.visibility === 'private'
  } catch (error) {
    console.error('Failed to verify current route before logout', error)
    return true
  }
}



