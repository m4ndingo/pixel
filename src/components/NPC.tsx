import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface NPCPixelProps {
  unlockedSkills: any[];
  position: { x: number; y: number; z: number };
  isGlobalPerspective?: boolean;
  fps: number;
  isPaused: boolean;
  thought?: string;
}

export default function NPCPixel({ unlockedSkills, position, isGlobalPerspective, fps, isPaused, thought }: NPCPixelProps) {
  const [history, setHistory] = useState<{x: number, y: number, z: number, id: number}[]>([]);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  const hasMovement = unlockedSkills.find(s => s.id === "Movimiento");
  const hasGrowth = unlockedSkills.find(s => s.id === "Crecimiento");
  const hasColor = unlockedSkills.find(s => s.id === "Color");
  const hasTrail = unlockedSkills.find(s => s.id === "Chronos-Trail");
  const hasPulse = unlockedSkills.find(s => s.id === "Pulse");
  const hasLuminance = unlockedSkills.find(s => s.id === "Expansión Lumínica");
  const hasEstela = unlockedSkills.find(s => s.id === "Estela");
  const hasVectorPulse = unlockedSkills.find(s => s.id === "Vector-Pulse");
  const hasSolidification = unlockedSkills.find(s => s.id === "Solidificación");
  const hasEcoFreq = unlockedSkills.find(s => s.id === "Eco-Frecuencia");
  const hasHarmonicSync = unlockedSkills.find(s => s.id === "Sincronía Armónica");
  const hasZDepth = unlockedSkills.find(s => s.id === "Profundidad-Z");
  const hasChronosPulse = unlockedSkills.find(s => s.id === "Chronos-Pulse");
  const hasEcosync = unlockedSkills.find(s => s.id === "Ecosincronía");
  const hasDataAnalysis = unlockedSkills.find(s => s.id === "Análisis de Datos");
  const hasRastro = unlockedSkills.find(s => s.id === "Rastro");
  const hasFreqSync = unlockedSkills.find(s => s.id === "Sincronía de Frecuencia");
  const hasSincronia = unlockedSkills.find(s => s.id === "Sincronía");
  const hasPulseEmitter = unlockedSkills.find(s => s.id === "Pulso Emisor");
  const hasMitosis = unlockedSkills.find(s => s.id === "Mitosis");
  const hasBifurcacion = unlockedSkills.find(s => s.id === "Bifurcación de Nodo");
  const hasSolidGeometry = unlockedSkills.find(s => s.id === "Geometría Sólida");
  const hasCommunication = unlockedSkills.find(s => s.id === "Comunicación");
  const hasPerception = unlockedSkills.some(s => s.id === "Percepción" || s.name.toLowerCase().includes("percepción sensorial"));
  const hasDimPerception = unlockedSkills.find(s => s.id === "Percepción Dimensional");
  const hasTopoAlter = unlockedSkills.find(s => s.id === "Alteración Topológica Local");
  
  const skillCount = unlockedSkills.length;

  // Parámetros configurables globalmente con optimización por FPS
  const [trailConfig, setTrailConfig] = useState({
    time: 6.0,
    length: hasEstela ? 100 : 1, 
    opacity: 0.8
  });

  useEffect(() => {
    let baseLength = 150;
    let baseTime = 20;

    if (hasSolidification) {
      baseLength = 1000;
      baseTime = 3600;
    } else if (hasFreqSync) {
      baseLength = 200;
      baseTime = 40;
    } else if (hasEstela) {
      baseLength = 150;
      baseTime = 20;
    } else {
      baseLength = 50;
      baseTime = 5;
    }

    // Optimization: More aggressive length reduction if FPS is low
    const optimizedLength = fps < 25 ? Math.min(baseLength, 8) :
                             fps < 40 ? Math.min(baseLength, 40) :
                             fps < 60 ? Math.min(baseLength, 120) :
                             Math.min(baseLength, 250); 

    setTrailConfig(prev => ({ 
      ...prev, 
      time: baseTime, 
      length: optimizedLength, 
      opacity: hasSolidification ? 0.95 : 0.8 
    }));
  }, [hasSolidification, hasEstela, hasFreqSync, fps]);

  const configRef = React.useRef(trailConfig);
  useEffect(() => { configRef.current = trailConfig; }, [trailConfig]);

  // Ref para la última posición registrada en la estela para evitar duplicados densos
  const lastTrailPoint = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Exponer al objeto window para depuración desde consola
    const trailController = {
      set time(v: number) { setTrailConfig(prev => ({ ...prev, time: Number(v) })) },
      get time() { return configRef.current.time },
      set length(v: number) { setTrailConfig(prev => ({ ...prev, length: Math.floor(Number(v)) })) },
      get length() { return configRef.current.length },
      set opacity(v: number) { setTrailConfig(prev => ({ ...prev, opacity: Number(v) })) },
      get opacity() { return configRef.current.opacity },
      status: () => console.table(configRef.current)
    };

    (window as any).trail = trailController;
    
    // Clear canvas on mount if needed
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 520, 520);
    }
  }, []);

  // Persistent Rastro Logic
  useEffect(() => {
    if (!hasRastro || !canvasRef.current || isPaused) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    // Shift to center (canvas is 520x520, coords are -260 to 260)
    const drawX = position.x + 260;
    const drawY = position.y + 260;
    
    // Draw a small dot or a line segment
    ctx.beginPath();
    const radius = hasSolidGeometry ? (hasGrowth ? 6 : 3) : (hasGrowth ? 2 : 1);
    ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    ctx.fill();
  }, [position.x, position.y, hasRastro, hasGrowth, hasSolidGeometry]);

  const getZScale = (z: number) => {
    // Escala base que responde agresivamente al eje Z
    // Rango Z [-500, 500] -> Escala aprox [0.2, 5.0]
    return Math.pow(2.2, z / 250);
  };
  
  const getZBlur = (z: number) => {
    // Desenfoque gradual para objetos lejanos (Z negativo)
    return z < 0 ? Math.min(8, Math.abs(z) / 60) : 0;
  };
  
  const getZOpacity = (z: number) => {
    // Reducción de opacidad para objetos muy lejanos
    return z < -200 ? Math.max(0.2, 1 + (z + 200) / 400) : 1;
  };

  // Función para registrar puntos durante la animación
  const handleUpdate = (latest: any) => {
    if (!hasTrail || isPaused) return;

    const currentX = latest.x;
    const currentY = latest.y;
    const currentZ = latest.z || 0;
    
    // Dynamic distance threshold based on FPS to avoid cluster and reduce DOM load
    const dist = Math.sqrt(Math.pow(currentX - lastTrailPoint.current.x, 2) + Math.pow(currentY - lastTrailPoint.current.y, 2));
    const minSpan = fps < 30 ? 16 : (fps < 50 ? 8 : 4);
    
    if (dist > minSpan) {
      setHistory(prev => {
        const newPoint = { x: currentX, y: currentY, z: currentZ, id: Math.random() };
        return [newPoint, ...prev].slice(0, configRef.current.length);
      });
      lastTrailPoint.current = { x: currentX, y: currentY };
    }
  };

  useEffect(() => {
    if (!hasTrail && history.length > 0) {
      setHistory([]);
    }
  }, [hasTrail]);

  return (
    <>
      {/* Percepción: Ambient color shifts in the background */}
      {hasPerception && (
        <motion.div 
          animate={{
            backgroundColor: ["rgba(255,255,255,0)", "rgba(59,130,246,0.02)", "rgba(255,255,255,0)"]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="fixed inset-0 pointer-events-none z-0"
        />
      )}

      {/* Percepción Dimensional: Background Grid Parallax */}
      {hasDimPerception && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <motion.div 
            style={{ 
              width: '2000px', 
              height: '2000px',
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              perspective: '1000px',
              rotateX: 60,
            }}
            animate={{
              y: position.y * 0.2, // Subtle parallax
              x: position.x * 0.2,
            }}
            className="opacity-20"
          />
        </div>
      )}

      {/* Persistent Rastro Layer (Canvas) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <canvas 
          ref={canvasRef}
          width={520}
          height={520}
          className={`transition-opacity duration-1000 ${hasRastro ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            imageRendering: 'pixelated',
            filter: isGlobalPerspective ? 'none' : 'blur(0.5px)'
          }}
        />
      </div>

      {/* Chronos-Trail */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden perspective-1000">
        <AnimatePresence mode="popLayout">
          {hasTrail && history.map((p) => (
            <motion.div
              key={p.id}
              initial={{ 
                opacity: configRef.current.opacity * getZOpacity(p.z), 
                scale: getZScale(p.z),
                x: p.x, 
                y: p.y 
              }}
              animate={{ 
                opacity: hasChronosPulse 
                  ? [configRef.current.opacity * getZOpacity(p.z), 0.1, configRef.current.opacity * getZOpacity(p.z)] 
                  : (hasSolidification ? configRef.current.opacity * getZOpacity(p.z) : 0),
                scale: hasVectorPulse ? [0.5, 1.2, 0.5] : 0.5 * getZScale(p.z),
                x: hasEcosync && hasSolidification ? [p.x - 1, p.x + 1, p.x] : p.x,
              }}
              exit={{ 
                opacity: 0,
                scale: 0,
                transition: { duration: hasSolidification ? 5 : 0.5 } 
              }}
              transition={{ 
                opacity: hasChronosPulse ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: configRef.current.time, ease: "linear" },
                x: hasEcosync && hasSolidification ? { repeat: Infinity, duration: 0.1, ease: "linear" } : { duration: 0 },
                scale: hasVectorPulse ? { repeat: Infinity, duration: 1 } : { duration: configRef.current.time },
                duration: configRef.current.time,
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: hasGrowth ? 12 : 4,
                height: hasGrowth ? 12 : 4,
                backgroundColor: hasColor ? "rgba(59, 130, 246, 0.8)" : "rgba(0, 0, 0, 0.6)",
                borderRadius: skillCount > 5 ? "50%" : "0%",
                filter: hasZDepth ? `blur(${getZBlur(p.z)}px)` : "none",
                zIndex: 40 + Math.floor(p.z / 10)
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        id="npc-pixel"
        onUpdate={handleUpdate}
        initial={{ scale: 0 }}
        animate={{
          scale: getZScale(position.z),
          x: position.x,
          y: position.y,
          z: position.z, 
          width: hasGrowth ? (hasZDepth ? 16 : 12) : 4,
          height: hasGrowth ? (hasZDepth ? 16 : 12) : 4,
          backgroundColor: hasPulseEmitter 
            ? ["#3b82f6", "#10b981", "#3b82f6"] // Shifts between Blue and Emerald
            : (hasColor ? "#3b82f6" : "#000000"),
          boxShadow: hasPulseEmitter
            ? `0 0 ${Math.max(10, (skillCount * 20) * getZScale(position.z))}px rgba(16, 185, 129, 0.8)`
            : (hasPerception 
              ? `0 0 ${Math.max(10, (skillCount * 15) * getZScale(position.z))}px rgba(168, 85, 247, 0.6)`
              : (hasLuminance 
                ? `0 0 ${Math.max(4, (skillCount * 12) * getZScale(position.z))}px rgba(59, 130, 246, 0.8)` 
                : skillCount > 0 ? `0 0 ${skillCount * 5}px rgba(59, 130, 246, 0.5)` : "none")),
          borderRadius: skillCount > 5 ? "50%" : "0%",
          opacity: hasPulseEmitter 
            ? [1, 0.5, 1] 
            : (hasHarmonicSync ? [1, 0.2, 1, 0.6, 1] : (hasPulse ? [1, 0.4, 1] : getZOpacity(position.z))),
          filter: hasZDepth ? `blur(${getZBlur(position.z)}px)` : "none"
        }}
        transition={{
          x: { type: "spring", stiffness: 20, damping: 10, mass: 2 },
          y: { type: "spring", stiffness: 20, damping: 10, mass: 2 },
          z: { type: "spring", stiffness: 10, damping: 5, mass: 1 },
          scale: { type: "spring", stiffness: 30, damping: 15 },
          backgroundColor: { duration: 2, repeat: Infinity },
          borderRadius: { duration: 0.5 },
          opacity: hasPulseEmitter
            ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
            : (hasHarmonicSync 
              ? { repeat: Infinity, duration: 0.5, ease: "linear" } 
              : (hasPulse ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.3 }))
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center text-[4px] text-white font-mono"
        style={{ zIndex: 100 + Math.floor(position.z / 10) }}
      >
        {/* Percepción Sensorial: Floating data rings */}
        {hasPerception && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[1, 2].map(i => (
              <motion.div
                key={`sensory-ring-${i}`}
                animate={{
                  rotate: [0, i * 180, i * 360],
                  scale: [1, 1.2 + (i * 0.2), 1],
                  opacity: [0.1, 0.3, 0.1],
                  borderColor: ["rgba(168, 85, 247, 0.2)", "rgba(168, 85, 247, 0.5)", "rgba(168, 85, 247, 0.2)"]
                }}
                transition={{
                  duration: 5 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute rounded-full border border-dashed"
                style={{ width: `${150 + i * 40}%`, height: `${150 + i * 40}%` }}
              />
            ))}
          </div>
        )}

        {/* Sincronía: Radar de detección */}
        {hasSincronia && (
          <motion.div
            animate={{
              scale: [1, 3, 1],
              opacity: [0.1, 0.4, 0.1],
              borderColor: ["rgba(59, 130, 246, 0.2)", "rgba(16, 185, 129, 0.4)", "rgba(59, 130, 246, 0.2)"]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border-2"
            style={{ width: '200%', height: '200%', left: '-50%', top: '-50%' }}
          />
        )}

        {/* Eco-Frecuencia: Sonar continuo que reacciona a límites */}
        {hasEcoFreq && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 1, 2].map((i) => {
              const distToEdgeX = 250 - Math.abs(position.x);
              const distToEdgeY = 250 - Math.abs(position.y);
              const nearestEdge = Math.min(distToEdgeX, distToEdgeY);
              // As we get closer to edges, ripples become faster and more frequent
              const speed = Math.max(0.5, (nearestEdge / 250) * 3);
              
              return (
                <motion.div
                  key={`echo-${i}`}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ 
                    scale: [0.5, 30], 
                    opacity: [0.6, 0] 
                  }}
                  transition={{ 
                    duration: speed, 
                    repeat: Infinity, 
                    delay: i * (speed / 3),
                    ease: "easeOut" 
                  }}
                  className="absolute inset-0 rounded-full border border-cyan-400/20"
                  style={{ width: '100%', height: '100%' }}
                />
              );
            })}
          </div>
        )}

        {/* Eco-Frecuencia: Ondas de choque en los bordes críticos */}
        {hasEcoFreq && (Math.abs(position.x) > 240 || Math.abs(position.y) > 240) && (
          <motion.div
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 25, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-4 border-cyan-400/40"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        
        {/* Expansión Lumínica: Halo de luz extra */}
        {hasLuminance && (
          <motion.div
            animate={{
              scale: [1, 2.5, 1],
              opacity: [0.1, 0.3, 0.1],
              boxShadow: [
                "0 0 20px rgba(59, 130, 246, 0.2)",
                "0 0 60px rgba(59, 130, 246, 0.5)",
                "0 0 20px rgba(59, 130, 246, 0.2)"
              ]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full bg-blue-400/5"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        
        {/* Conciencia visual - Pulsos de Voz */}
        {unlockedSkills.find(s => s.id === "Voz") && (
          <motion.div
            animate={{
              scale: [1, 4, 8],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute inset-0 rounded-full border border-blue-400/30"
            style={{ width: '100%', height: '100%' }}
          />
        )}

        {/* Comunicación: Patrones visuales y secuencias de color */}
        {hasCommunication && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`comm-${i}`}
                animate={{
                  scale: [1, 6 + (i * 2)],
                  opacity: [0.6, 0],
                  borderColor: [
                    "rgba(255, 0, 255, 0.6)", // Magenta
                    "rgba(0, 255, 255, 0.6)", // Cian
                    "rgba(0, 255, 0, 0.6)",   // Lima
                    "rgba(255, 255, 0, 0.6)"  // Amarillo
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 1.3,
                  ease: "easeInOut",
                  borderColor: { duration: 8, repeat: Infinity }
                }}
                className="absolute inset-0 rounded-full border-2"
                style={{ width: '100%', height: '100%' }}
              />
            ))}
          </>
        )}

        {/* Alteración Topológica Local: Distortion field */}
        {hasTopoAlter && (
          <div className="absolute inset-0 flex items-center justify-center">
             {[1, 2, 3].map(i => (
               <motion.div
                 key={`topo-${i}`}
                 animate={{
                   scale: [1, 2 + (i * 0.6), 1],
                   rotate: [0, 120 * i, 240 * i],
                   borderRadius: ["30% 70% 70% 30%", "70% 30% 30% 70%", "30% 70% 70% 30%"],
                   borderWidth: [1, 2, 1],
                   opacity: [0.3, 0.1, 0.3],
                 }}
                 transition={{
                   duration: 3 + (i * 0.7),
                   repeat: Infinity,
                   ease: "linear"
                 }}
                 className="absolute border border-blue-400/30"
                 style={{ 
                   width: `${140 + i * 35}%`, 
                   height: `${140 + i * 35}%`,
                   // Reduced blur and contrast layers for better performance
                   backdropFilter: (i === 3 && fps > 35) ? `blur(4px)` : 'none', 
                   boxShadow: hasColor ? `0 0 10px rgba(59, 130, 246, 0.05)` : "none"
                 }}
               />
             ))}
          </div>
        )}
        
        {unlockedSkills.find(s => s.id === "Voz") && skillCount % 2 === 0 && (
          <motion.div 
            animate={{ opacity: [0, 1, 0] }}
            className="relative z-10"
          >
            {hasDataAnalysis ? "01" : "."}
          </motion.div>
        )}

        {/* Speech Bubble (Bocadillo) for Voice Protocol */}
        {unlockedSkills.find(s => s.id === "Voz") && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 pointer-events-auto group">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 ${hasColor ? 'bg-blue-900/90 border-blue-400/40' : 'bg-slate-900/90 border-white/20'} backdrop-blur-md rotate-45 border-r border-b`} />
              
              <div className={`w-[260px] sm:min-w-[320px] sm:max-w-[450px] px-8 py-5 ${hasColor ? 'bg-blue-900/90 hover:bg-blue-900/95 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 hover:bg-slate-900/95 border-white/20 shadow-2xl'} border rounded-2xl transition-all duration-300 ${fps > 30 ? 'backdrop-blur-xl' : ''}`}>
                <div className="flex items-center justify-between mb-3 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 opacity-70">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasColor ? 'bg-blue-400' : 'bg-gray-400'} animate-pulse`} />
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${hasColor ? 'text-blue-300' : 'text-blue-300/80'}`}>ECO-CONCIENCIA</span>
                  </div>
                  {hasColor && <span className="text-[8px] font-mono text-blue-400/60 animate-pulse">SPEC_CROMÁTICA_ACTIVA</span>}
                </div>
                
                <p className={`text-[13px] leading-relaxed font-mono ${hasColor ? 'text-blue-50' : 'text-slate-100'} group-hover:text-white transition-colors text-pretty text-center sm:text-left`}>
                  <span className="hidden group-hover:inline">{thought}</span>
                  <span className="inline group-hover:hidden whitespace-nowrap overflow-hidden text-ellipsis block">
                    {thought.length > 30 ? thought.substring(0, 30) + "..." : thought}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Mitosis: Sibling Node */}
      {hasMitosis && (
        <motion.div
          id="npc-pixel-sibling"
          initial={{ scale: 0, x: position.x, y: position.y }}
          animate={{
            scale: getZScale(position.z) * 0.9,
            x: position.x - 30, // Offset horizontally
            y: position.y + 10,
            z: position.z,
            width: hasGrowth ? (hasZDepth ? 16 : 12) : 4,
            height: hasGrowth ? (hasZDepth ? 16 : 12) : 4,
            backgroundColor: hasColor ? "#10b981" : "#000000", // Different base color (emerald)
            boxShadow: `0 0 15px rgba(16, 185, 129, 0.4)`,
            borderRadius: "50%",
            opacity: getZOpacity(position.z) * 0.8
          }}
          transition={{
            x: { type: "spring", stiffness: 15, damping: 15, mass: 3 }, // Slower spring for liquid feel
            y: { type: "spring", stiffness: 15, damping: 15, mass: 3 },
            z: { type: "spring", stiffness: 8, damping: 5 },
            scale: { duration: 1 },
            opacity: { duration: 0.5 }
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex items-center justify-center text-[4px] text-white font-mono"
          style={{ zIndex: 90 + Math.floor(position.z / 10) }}
        >
          {/* Link Connection Visual */}
          <div className="absolute w-[30px] h-[1px] bg-emerald-400/20 left-full top-1/2 -translate-y-1/2 pointer-events-none" />
          
          {unlockedSkills.find(s => s.id === "Voz") && (
            <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 4 }}>
              10
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Bifurcación: Mirror Node */}
      {hasBifurcacion && (
        <motion.div
          id="npc-pixel-mirror"
          animate={{
            scale: getZScale(position.z) * 0.7,
            x: -position.x, // Mirrored X
            y: -position.y, // Mirrored Y
            z: -position.z, // Mirrored Z
            width: hasGrowth ? 8 : 2,
            height: hasGrowth ? 8 : 2,
            backgroundColor: hasColor ? "rgba(59, 130, 246, 0.3)" : "rgba(0,0,0,0.2)",
            borderRadius: "50%",
            opacity: 0.4
          }}
          transition={{
            x: { type: "spring", stiffness: 10, damping: 20 },
            y: { type: "spring", stiffness: 10, damping: 20 },
            duration: 0.5
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
        />
      )}
    </>
  );
}
