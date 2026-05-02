import { motion } from 'motion/react';

export const ProgressBar = ({ progress, colorClass = "bg-primary" }: { progress: number, colorClass?: string }) => (
  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={`h-full ${colorClass}`} 
    />
  </div>
);
