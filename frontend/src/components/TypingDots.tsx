import { motion } from 'framer-motion'

export function TypingDots({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/40"
          animate={reduceMotion ? {} : { y: [0, -4, 0] }}
          transition={reduceMotion ? {} : {
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
