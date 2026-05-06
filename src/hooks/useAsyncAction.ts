import { useCallback, useRef, useState } from 'react'

/**
 * Tiny helper to run one async action at a time.
 * If called while in flight, subsequent calls are ignored.
 */
export function useAsyncAction() {
  const inFlightRef = useRef(false)
  const [isRunning, setIsRunning] = useState(false)

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current) {
      return undefined
    }

    inFlightRef.current = true
    setIsRunning(true)

    try {
      return await action()
    } finally {
      inFlightRef.current = false
      setIsRunning(false)
    }
  }, [])

  return { isRunning, run }
}

