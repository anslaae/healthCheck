import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SignOutIcon } from '@phosphor-icons/react'

interface LogoutOverlayProps {
  isVisible: boolean
  onComplete?: () => void
}

export function LogoutOverlay({ isVisible, onComplete }: LogoutOverlayProps) {
  useEffect(() => {
    if (isVisible) {
      // After 2 seconds, call onComplete which will handle redirect and refresh
      const timer = setTimeout(() => {
        onComplete?.()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-background border rounded-lg shadow-lg p-8 md:p-12 text-center max-w-sm mx-4 relative z-50"
        >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: 'linear' }}
              className="mx-auto mb-6 flex justify-center"
            >
              <SignOutIcon size={48} className="text-primary" weight="bold" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">Logging you out</h2>
            <p className="text-muted-foreground mb-6 text-lg">Bye bye! 👋</p>

            <motion.div
              animate={{ scaleX: [0, 1] }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="h-1 bg-primary rounded-full origin-left"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}



