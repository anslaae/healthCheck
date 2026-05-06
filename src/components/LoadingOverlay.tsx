import { createContext, useContext, useState, ReactNode } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

interface LoadingContextType {
  setLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType>({ setLoading: () => {} })

export function useLoading() {
  return useContext(LoadingContext)
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)

  return (
    <LoadingContext.Provider value={{ setLoading }}>
      {children}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <CircleNotch size={48} className="animate-spin text-primary" />
        </div>
      )}
    </LoadingContext.Provider>
  )
}
