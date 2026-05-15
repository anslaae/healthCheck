import { useCallback, useEffect, useState } from 'react'
import { fetchAuthSession, logout } from '@/lib/authService'
import { AuthSessionResponse } from '@/lib/types'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSessionResponse>({ authenticated: false })
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const next = await fetchAuthSession()
      setSession(next)
    } catch (error) {
      console.error('Failed to load auth session', error)
      setSession({ authenticated: false })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const signOut = useCallback(async () => {
    try {
      await logout()
      setSession({ authenticated: false })
    } catch (error) {
      // Preserve local auth state if server logout failed.
      throw error
    }
  }, [])

  return {
    session,
    isLoading,
    refreshSession,
    signOut,
  }
}
