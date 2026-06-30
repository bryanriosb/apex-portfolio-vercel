import { motion } from 'framer-motion';
import PingPulse from '../ui/ping-pulse';

export function RunningIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1, scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="inline-flex items-center justify-center text-primary"
    >
      <PingPulse color="blue" />
    </motion.div>
  );
}
