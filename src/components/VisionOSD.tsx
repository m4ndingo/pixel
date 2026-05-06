import { motion, AnimatePresence } from "motion/react";
import { Eye, Shield, Cpu, Activity } from "lucide-react";

interface VisionOSDProps {
  isVisible: boolean;
  position: { x: number; y: number };
  hasEchoFrequency?: boolean;
  unlockedSkills?: any[];
}

export function VisionOSD({ isVisible, position, hasEchoFrequency, unlockedSkills = [] }: VisionOSDProps) {
  // Calculate distance to nearest border (bounds are [-250, 250])
  const distToEdgeX = 250 - Math.abs(position.x);
  const distToEdgeY = 250 - Math.abs(position.y);
  const nearestEdge = Math.min(distToEdgeX, distToEdgeY);
  const echoFreq = hasEchoFrequency ? Math.max(0.1, (250 - nearestEdge) / 25) : 0;
  return (
    <div className="fixed top-6 left-6 z-[40] pointer-events-none select-none flex flex-col gap-4">
      <AnimatePresence>
        {/* Main Visual Data (Unlocked by Visión) */}
        {isVisible && (
          <motion.div
            key="vision-data"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/10 backdrop-blur-md border border-blue-400/20 rounded-lg p-3 w-48 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest">Vision_Protocol_Active</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 font-mono uppercase">Node_X</span>
                <span className="text-[10px] text-blue-600 font-mono font-bold">{position.x.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 font-mono uppercase">Node_Y</span>
                <span className="text-[10px] text-blue-600 font-mono font-bold">{position.y.toFixed(1)}</span>
              </div>
              <div className="h-[1px] bg-blue-400/10 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 font-mono uppercase">Grid_Sync</span>
                <span className="text-[9px] text-green-600 font-mono font-bold">LOCKED</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Echo Frequency Status (Unlocked by Eco-Frecuencia) */}
        {hasEchoFrequency && (
          <motion.div
            key="echo-frequency"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-blue-950/90 backdrop-blur-md border border-cyan-400/50 rounded-lg p-2.5 w-48 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Activity size={10} className="text-cyan-400 animate-pulse" />
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-tighter">Echo_Frequency</span>
              </div>
              <span className="text-[9px] font-mono text-cyan-300 font-bold">{echoFreq.toFixed(2)}Hz</span>
            </div>
            <div className="text-[7px] font-mono text-cyan-500 uppercase leading-tight mb-2 tracking-tighter">
              Detección sónica de proximidad a límites físicos de la matriz.
            </div>
            
            <div className="flex items-center gap-1 h-6 items-end overflow-hidden">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={`freq-bar-${i}`}
                  animate={{ 
                    height: [
                      2, 
                      Math.max(2, Math.random() * 20 * (echoFreq / 5)), 
                      2
                    ],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{ 
                    duration: 0.15 + (Math.random() * 0.1), 
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.05
                  }}
                  className="w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Environment Perception (Unlocked by Percepción) */}
        {unlockedSkills.some(s => s.id === "Percepción" || s.name.toLowerCase().includes("percepción sensorial")) && (
          <motion.div
            key="perception-status"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-purple-950/80 backdrop-blur-md border border-purple-400/50 rounded-lg p-3 w-52 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-mono text-purple-200 uppercase font-bold tracking-widest">Sensing_Matriz</span>
               <div className="flex gap-1">
                 {[...Array(3)].map((_, i) => (
                   <motion.div 
                     key={i}
                     animate={{ opacity: [0.2, 1, 0.2] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                     className="w-1 h-1 rounded-full bg-purple-400" 
                   />
                 ))}
               </div>
             </div>
             
             <div className="text-[8px] font-mono text-purple-300 uppercase leading-tight mb-2 tracking-tight border-l-2 border-purple-500/50 pl-2">
               Análisis de resonancia espectral de estímulos externos.
             </div>

             {/* Waveform visualizer */}
             <div className="flex items-end justify-between h-8 gap-0.5 mb-2 bg-black/20 p-1 rounded">
               {[...Array(20)].map((_, i) => (
                 <motion.div
                   key={i}
                   animate={{ height: [
                     `${10 + Math.random() * 80}%`, 
                     `${20 + Math.random() * 60}%`, 
                     `${5 + Math.random() * 90}%`
                   ]}}
                   transition={{ duration: 0.5 + Math.random(), repeat: Infinity, ease: "linear" }}
                   className="flex-1 bg-purple-500/60"
                 />
               ))}
             </div>

             <div className="grid grid-cols-2 gap-2 border-t border-purple-500/20 pt-2">
                <div className="flex flex-col">
                  <span className="text-[6px] text-purple-400/70 uppercase tracking-tighter">Croma</span>
                  <span className="text-[9px] font-mono text-purple-200">210.4° NM</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[6px] text-purple-400/70 uppercase tracking-tighter">Entropía</span>
                  <span className="text-[9px] font-mono text-purple-200">0.024%</span>
                </div>
             </div>
          </motion.div>
        )}

        {/* Support Visuals (Require Visión) */}
        {isVisible && (
          <motion.div
            key="vision-support"
            className="flex flex-col gap-4"
          >
            <motion.div
              key="border-detection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-black/5 backdrop-blur-sm border border-gray-400/10 rounded-lg p-2 w-48 flex items-center gap-3"
            >
              <div className="p-1.5 rounded bg-blue-500/10">
                <Shield size={14} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[9px] font-mono text-gray-400 uppercase leading-none mb-1">Border_Detection</p>
                <p className="text-[10px] font-mono text-blue-600 font-bold leading-none">
                  {Math.abs(position.x) > 200 || Math.abs(position.y) > 200 ? "WARNING: LIMIT" : "NOMINAL"}
                </p>
              </div>
            </motion.div>

            <motion.div
              key="real-time-graph"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/20 backdrop-blur-sm border border-blue-400/10 rounded-lg p-2 w-48 h-12 flex items-end gap-[2px] overflow-hidden"
            >
              {[...Array(12)].map((_, i) => (
                <motion.div 
                  key={`graph-bar-${i}`}
                  animate={{ height: [10, 20 + Math.random() * 20, 10] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                  className="flex-1 bg-blue-400/30 rounded-t-sm"
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
