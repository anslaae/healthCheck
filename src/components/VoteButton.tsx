import { VoteType } from '@/lib/types'
import { getVoteColor, getVoteEmoji } from '@/lib/healthCheckUtils'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface VoteButtonProps {
  voteType: VoteType
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function VoteButton({ voteType, selected, onClick, disabled }: VoteButtonProps) {
  const emoji = getVoteEmoji(voteType)
  const colorClass = getVoteColor(voteType)
  
  const labels = {
    happy: 'Happy',
    ok: 'OK',
    unhappy: 'Unhappy',
  }
  
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className="flex-1"
    >
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full h-24 flex flex-col items-center justify-center gap-2 text-lg font-medium transition-all',
          colorClass,
          selected && 'ring-4 ring-foreground ring-offset-2 scale-105',
          !selected && 'opacity-70 hover:opacity-100'
        )}
      >
        <span className="text-4xl">{emoji}</span>
        <span>{labels[voteType]}</span>
      </Button>
    </motion.div>
  )
}
