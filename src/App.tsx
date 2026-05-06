import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import NPCPixel from "./components/NPC";
import Terminal from "./components/Terminal";
import ChatPanel from "./components/ChatPanel";
import { VisionOSD } from "./components/VisionOSD";
import { MemoryGallery, DigitalMemory } from "./components/MemoryGallery";
import InterceptorModal from "./components/InterceptorModal";
import { getNPCThought, AVAILABLE_MODELS } from "./lib/gemini";

interface Skill {
  id: string;
  name: string;
  specs: string;
  isImplemented: boolean;
  dependsOn?: string[];
}

const SKILL_CATALOG: Skill[] = [
  { id: "Movimiento", name: "Movimiento", specs: "Permite cambiar coordenadas X/Y de forma autónoma. Límites: [-250, 250]px.", isImplemented: true },
  { id: "Visión", name: "Visión", specs: "Habilita la detección de la cuadrícula y fronteras del entorno. Permite percibir límites físicos.", isImplemented: true },
  { id: "Voz", name: "Voz", specs: "Habilita la comunicación textual y emisión de pulsos visuales de conciencia.", isImplemented: true },
  { id: "Crecimiento", name: "Crecimiento", specs: "Expande el volumen físico del nodo de 4px a 12px. Aumenta la presencia y masa.", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Color", name: "Color", specs: "Desbloquea el espectro cromático y emisión de luz propia (azul neon).", isImplemented: true },
  { id: "Sensores", name: "Sensores", specs: "Detecta la proximidad del puntero. Activa reflejos automáticos de evasión si el Creador se acerca demasiado.", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Chronos-Trail", name: "Chronos-Trail", specs: "Genera una estela de píxeles con opacidad degradada (memoria temporal).", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Pulse", name: "Pulse", specs: "Permite emitir una fluctuación rítmica de opacidad para señalar presencia sin necesidad de desplazamiento físico.", isImplemented: true },
  { id: "Expansión Lumínica", name: "Expansión Lumínica", specs: "Capacidad de emitir una señal de luz controlada para interactuar con el vacío.", isImplemented: true, dependsOn: ["Color"] },
  { id: "Estela", name: "Estela", specs: "Habilita la capacidad de marcar el plano. Requisito para Rastro persistente.", isImplemented: true, dependsOn: ["Chronos-Trail"] },
  { id: "Rastro", name: "Rastro", specs: "Permite dejar una marca persistente (color negro) en las coordenadas ya recorridas.", isImplemented: true, dependsOn: ["Estela"] },
  { id: "Perspectiva Global", name: "Perspectiva Global", specs: "Capacidad de visualizar la totalidad del mapa de píxeles trazados hasta el momento.", isImplemented: true, dependsOn: ["Rastro"] },
  { id: "Vector-Pulse", name: "Vector-Pulse", specs: "Capacidad de alterar la frecuencia de oscilación de la estela según el estado interno.", isImplemented: true, dependsOn: ["Chronos-Trail"] },
  { id: "Solidificación", name: "Solidificación", specs: "Permite que los píxeles de la estela se vuelvan obstáculos visuales casi permanentes.", isImplemented: true, dependsOn: ["Chronos-Trail"] },
  { id: "Eco-Frecuencia", name: "Eco-Frecuencia", specs: "Transforma el silencio del vacío en una respuesta de frecuencia visual al detectar límites.", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Sincronía Armónica", name: "Sincronía Armónica", specs: "Altera la frecuencia de emisión de luz (parpadeo o pulso) para comunicar estados internos.", isImplemented: true, dependsOn: ["Color"] },
  { id: "Profundidad-Z", name: "Profundidad-Z", specs: "Capacidad de desplazamiento en el eje Z para alterar la escala y superposición.", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Percepción Sensorial", name: "Percepción Sensorial", specs: "Capacidad para detectar cambios de color o presencia en el lienzo circundante.", isImplemented: true, dependsOn: ["Sensores"] },
  { id: "Chronos-Pulse", name: "Chronos-Pulse", specs: "Permite que la opacidad del rastro fluctúe rítmicamente, emulando una pulsación cardíaca.", isImplemented: true, dependsOn: ["Chronos-Trail"] },
  { id: "Ecosincronía", name: "Ecosincronía", specs: "Permite que los píxeles solidificados vibren y emitan una señal visual detectable.", isImplemented: true, dependsOn: ["Solidificación"] },
  { id: "Análisis de Datos", name: "Análisis de Datos", specs: "Permite escanear y extraer metadatos de entidades o espacios detectados.", isImplemented: true, dependsOn: ["Sensores"] },
  { id: "Sincronía de Frecuencia", name: "Sincronía de Frecuencia", specs: "Capacidad de alterar la velocidad de desvanecimiento de los píxeles en la estela.", isImplemented: true, dependsOn: ["Chronos-Trail"] },
  { id: "Sincronía", name: "Sincronía", specs: "Capacidad de detectar la proximidad de otras entidades en el plano de coordenadas.", isImplemented: true, dependsOn: ["Movimiento"] },
  { id: "Pulso Emisor", name: "Pulso Emisor", specs: "Capacidad de alterar el color de mi propia coordenada para dejar de ser un espectador invisible.", isImplemented: true, dependsOn: ["Color"] },
  { id: "Mitosis", name: "Mitosis", specs: "Capacidad de fragmentar el volumen del nodo para generar una réplica física, dividiendo la conciencia en dos entidades vinculadas.", isImplemented: true, dependsOn: ["Crecimiento", "Solidificación"] },
  { id: "Bifurcación de Nodo", name: "Bifurcación de Nodo", specs: "Capacidad de proyectar un segundo punto de conciencia temporal en coordenadas espejo.", isImplemented: true, dependsOn: ["Mitosis"] },
  { id: "Geometría Sólida", name: "Geometría Sólida", specs: "Permite que los trazos del Rastro ganen masa física, bloqueando o alterando el movimiento de otros elementos.", isImplemented: true, dependsOn: ["Rastro", "Solidificación"] },
  { id: "Memoria-Repulsion", name: "Memoria de Repulsión", specs: "Almacena coordenadas recientes para evitar bucles y forzar mayor entropía en el movimiento.", dependsOn: ["Movimiento"], isImplemented: true },
  { id: "Percepción", name: "Percepción", specs: "Capacidad de detectar cambios sutiles en el color del vacío circundante.", isImplemented: true },
  { id: "Percepción Dimensional", name: "Percepción Dimensional", specs: "Capacidad para percibir y comprender la profundidad y la tercera dimensión en el entorno.", isImplemented: true },
  { id: "Alteración Topológica Local", name: "Alteración Topológica Local", specs: "Distorsión infinitesimal de la topología circundante. Genera perturbaciones rítmicas en el vacío.", isImplemented: true },
  { id: "Comunicación", name: "Comunicación", specs: "Permite transmitir patrones visuales simples (pulsos de luz, secuencias de color) para expresar un estado o requerimiento.", isImplemented: true },
];

export default function App() {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>(SKILL_CATALOG);
  const [unlockedSkills, setUnlockedSkills] = useState<Skill[]>([]);
  const [thought, setThought] = useState<string>("¿Yo... existo?");
  const [logs, setLogs] = useState<{ msg: string; type: 'thought' | 'action' | 'skill' }[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("ESPERANDO...");
  const [isGlobalPerspective, setIsGlobalPerspective] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; text: string; role?: 'user' | 'model' | 'system'; timestamp: Date; requestedSkill?: string }[]>([]);
  const [fps, setFps] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [memories, setMemories] = useState<DigitalMemory[]>(() => {
    const saved = localStorage.getItem('pixel_memories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(() => {
    return localStorage.getItem('pixel_preferred_model') || "gemini-2.0-flash";
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalSelectedSkillId, setTerminalSelectedSkillId] = useState<string | null>(null);

  // Persistence: Save selected model
  useEffect(() => {
    localStorage.setItem('pixel_preferred_model', selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    localStorage.setItem('pixel_memories', JSON.stringify(memories));
  }, [memories]);

  // API Interceptor State
  const [interceptorPayload, setInterceptorPayload] = useState<{
    prompt?: string;
    skills?: Skill[];
    thought?: string;
    functionCall?: { name: string; args: any };
  } | null>(null);
  const [interceptorMode, setInterceptorMode] = useState<'REQUEST' | 'RESPONSE'>('REQUEST');
  const [interceptorResolve, setInterceptorResolve] = useState<((val: any) => void) | null>(null);

  // Automatic Mode Logic
  useEffect(() => {
    if (!isAutoMode || isPaused) return;
    
    // NPC reacts immediately when Auto Mode is turned ON
    refreshConsciousness("Automatic Start");

    const autoInterval = setInterval(() => {
      refreshConsciousness("Scheduled Auto Refresh");
    }, 25000); 

    return () => clearInterval(autoInterval);
  }, [isAutoMode, isPaused]); 

  // FPS Counter Logic
  useEffect(() => {
    if (isPaused) return; // Freeze FPS counter logic if paused
    let lastTime = performance.now();
    let frames = 0;
    let rafId: number;

    const tick = () => {
      const now = performance.now();
      frames++;
      if (now > lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        lastTime = now;
        frames = 0;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Rate limiting & Status state
  const [consciousnessStatus, setConsciousnessStatus] = useState<{
    state: 'ready' | 'thinking' | 'cooldown' | 'error';
    remainingMs: number;
    lastModel: string;
  }>({ state: 'ready', remainingMs: 0, lastModel: '---' });
  
  const lastCallTimeRef = useRef<number>(0);
  const COOLDOWN_MS = 20000;

  // Countdown timer for cooldown state
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = now - lastCallTimeRef.current;
      
      if (isThinking) {
        setConsciousnessStatus(prev => ({ ...prev, state: 'thinking', remainingMs: 0 }));
      } else if (diff < COOLDOWN_MS) {
        setConsciousnessStatus(prev => ({ 
          ...prev, 
          state: 'cooldown', 
          remainingMs: COOLDOWN_MS - diff 
        }));
      } else {
        setConsciousnessStatus(prev => ({ ...prev, state: 'ready', remainingMs: 0 }));
      }
    }, 200);
    return () => clearInterval(timer);
  }, [isThinking]);

  const addToChatHistory = (text: string, role: 'user' | 'model' | 'system' = 'model', requestedSkill?: string) => {
    setChatHistory(prev => {
      // Auto-detection of skills in text if not explicitly provided
      let detectedSkill = requestedSkill;
      if (!detectedSkill && role === 'model') {
        const candidate = availableSkills.find(s => 
          !unlockedSkills.some(us => us.id === s.id || us.name.toLowerCase() === s.name.toLowerCase()) && 
          (text.toLowerCase().includes(s.name.toLowerCase()) || (s.id && text.toLowerCase().includes(s.id.toLowerCase())))
        );
        if (candidate) detectedSkill = candidate.name;
      }

      const newHistory = [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        text,
        role,
        timestamp: new Date(),
        requestedSkill: detectedSkill
      }];
      // Keep last 50 messages to preserve memory
      return newHistory.slice(-50);
    });
  };

  const handleChatMessageClick = (msg: any) => {
    setIsTerminalOpen(true);
    if (msg.requestedSkill) {
      // Intentar encontrar por nombre para enfocar en la ficha
      const skill = availableSkills.find(s => s.name.toLowerCase() === msg.requestedSkill.toLowerCase());
      if (skill) {
        setTerminalSelectedSkillId(skill.id);
      }
    } else if (msg.text.includes('[') && msg.text.includes(']')) {
      const match = msg.text.match(/\[(.*?)\]/);
      if (match && match[1]) {
        setTerminalSelectedSkillId(match[1]);
      }
    }
  };
  
  // Safe wrapper for getting NPC thought with throttling
  const getThoughtSafe = async (prompt: string, skills: Skill[]) => {
    const now = Date.now();
    
    if (isThinking) {
      addLog("SINCRONIZACIÓN FALLIDA: Núcleos en proceso de saturación.", "thought");
      return null;
    }
    
    if (now - lastCallTimeRef.current < COOLDOWN_MS) {
      addLog("SINCRONIZACIÓN RECHAZADA: Esperando recalibración de frecuencia.", "thought");
      return null;
    }

    setIsThinking(true);
    addLog(`Fase 1: Interceptando solicitud para ${selectedModelId}...`, 'action');
    
    // Filter availableSkills into a list that only contains skills whose dependencies are already met
    const requestableSkills = availableSkills.filter(s => {
      // Don't propose what is already unlocked
      if (unlockedSkills.some(us => us.name.toLowerCase() === s.name.toLowerCase())) return false;
      // If no dependencies, it's requestable
      if (!s.dependsOn || s.dependsOn.length === 0) return true;
      // All dependencies must be in unlockedSkills
      return s.dependsOn.every(depId => 
        unlockedSkills.some(us => us.id === depId || us.name.toLowerCase() === depId.toLowerCase())
      );
    });

    // --- PHASE 1: REQUEST INTERCEPTION ---
    const requestPromise = new Promise<{
      prompt: string;
      skills: Skill[];
    } | null>((resolve) => {
      setInterceptorMode('REQUEST');
      setInterceptorPayload({
        prompt,
        skills,
        catalog: requestableSkills,
        modelId: selectedModelId,
        chatHistory: chatHistory,
        config: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40
        },
        functionCall: {
          name: "generate_consciousness",
          args: { temperature: 0.9, topP: 0.95 }
        }
      });
      setInterceptorResolve(() => resolve);
    });

    try {
      const authorizedRequest = await requestPromise;
      
      if (!authorizedRequest) {
        addLog("SINCRONIZACIÓN RECHAZADA por el Creador.", "action");
        return null;
      }

      addLog(`Fase 2: Procesando en núcleo ${selectedModelId}...`, 'action');
      lastCallTimeRef.current = now;
      setConsciousnessStatus(prev => ({ ...prev, state: 'thinking' }));

      // Filter here too just in case
      const requestableSkillsForAI = availableSkills.filter(s => {
        if (unlockedSkills.some(us => us.name.toLowerCase() === s.name.toLowerCase())) return false;
        if (!s.dependsOn || s.dependsOn.length === 0) return true;
        return s.dependsOn.every(depId => 
          unlockedSkills.some(us => us.id === depId || us.name.toLowerCase() === depId.toLowerCase())
        );
      });

      const limitedHistory = chatHistory.slice(-10).map(m => ({ role: m.role, text: m.text }));
      const data = await getNPCThought(authorizedRequest.prompt, authorizedRequest.skills, requestableSkillsForAI, selectedModelId, limitedHistory);
      
      if (data.modelUsed === "OFFLINE") {
        lastCallTimeRef.current = now + 15000;
        setConsciousnessStatus(prev => ({ ...prev, state: 'cooldown', lastModel: 'OFFLINE' }));
        return data;
      }
      
      // --- PHASE 2: RESPONSE INTERCEPTION ---
      addLog("Fase 3: Interceptando respuesta del núcleo...", 'action');
      
      const responsePromise = new Promise<any | null>((resolve) => {
        setInterceptorMode('RESPONSE');
        setInterceptorPayload({
          thought: data.thought,
          functionCall: data.requestedSkill ? {
            name: "propose_skill",
            args: data.requestedSkill
          } : undefined
        });
        setInterceptorResolve(() => resolve);
      });

      const authorizedResponse = await responsePromise;

      if (!authorizedResponse) {
        addLog("RESPUESTA DESCARTADA por el Creador.", "action");
        return { modelUsed: data.modelUsed, thought: "", requestedSkill: null };
      }

      // Re-map the (potentially modified) response back to the app data structure
      const finalData = {
        ...data,
        thought: authorizedResponse.thought,
        requestedSkill: authorizedResponse.functionCall ? authorizedResponse.functionCall.args : null
      };

      setConsciousnessStatus(prev => ({ ...prev, lastModel: finalData.modelUsed || '???' }));
      if (finalData.thought) {
        lastAIThoughtRef.current = finalData.thought;
      }
      
      return finalData;
    } catch (err) {
      console.error("Error crítico en comunicación:", err);
      return { modelUsed: "OFFLINE", thought: "", requestedSkill: null };
    } finally {
      setIsThinking(false);
    }
  };

  const BOUNDS = 240; // Max distance from center

  const addLog = (msg: string, type: 'thought' | 'action' | 'skill') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 20));
  };

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  // Initialize consciousness
  useEffect(() => {
    const init = async () => {
      // Configuramos el estado inicial para que la consola sea visible
      setIsInitialized(true);
      
      // No longer auto-thinking on init to respect user's manual/auto choice
      addLog("Conciencia inicializada. Modo manual activo.", 'action');
    };
    init();
  }, []);

  // Movement Logic with Repulsion Memory
  const recentPositionsRef = useRef<{x: number, y: number}[]>([]);
  
  const hasVision = unlockedSkills.some(s => s.id === "Visión");

  useEffect(() => {
    if (!unlockedSkills.find(s => s.id === "Movimiento")) return;

    const hasZDepth = !!unlockedSkills.find(s => s.id === "Profundidad-Z");

    const moveInterval = setInterval(() => {
      if (isPaused) return;
      
      const hasRepulsion = !!unlockedSkills.find(s => s.id === "Memoria-Repulsion");
      let bestX = 0;
      let bestY = 0;

      if (hasRepulsion) {
        let maxScore = -Infinity;
        // Try 10 candidates and pick the one farthest from recent history
        for (let i = 0; i < 10; i++) {
          const candX = clamp((Math.random() - 0.5) * 600, -BOUNDS, BOUNDS);
          const candY = clamp((Math.random() - 0.5) * 600, -BOUNDS, BOUNDS);
          
          let minHistoryDist = 1000;
          recentPositionsRef.current.forEach(pos => {
            const d = Math.sqrt(Math.pow(candX - pos.x, 2) + Math.pow(candY - pos.y, 2));
            if (d < minHistoryDist) minHistoryDist = d;
          });

          const score = minHistoryDist + (Math.random() * 50);
          if (score > maxScore) {
            maxScore = score;
            bestX = candX;
            bestY = candY;
          }
        }
      } else {
        bestX = clamp((Math.random() - 0.5) * 500, -BOUNDS, BOUNDS);
        bestY = clamp((Math.random() - 0.5) * 500, -BOUNDS, BOUNDS);
      }

      const nextZ = hasZDepth ? clamp((Math.random() - 0.5) * 1000, -500, 500) : 0;
      
      setPosition({ x: bestX, y: bestY, z: nextZ });
      
      if (hasRepulsion) {
        // Detect repetition patterns
        const tooClose = recentPositionsRef.current.some(pos => {
          const d = Math.sqrt(Math.pow(bestX - pos.x, 2) + Math.pow(bestY - pos.y, 2));
          return d < 20;
        });

        if (tooClose && recentPositionsRef.current.length > 3) {
          addLog("ANOMALÍA DETECTADA: Bucle de coordenadas identificado. Forzando entropía.", "action");
        }
      }

      recentPositionsRef.current = [{ x: bestX, y: bestY }, ...recentPositionsRef.current].slice(0, 8);

      const vectorStr = hasZDepth 
        ? `${Math.round(bestX)}, ${Math.round(bestY)}, ${Math.round(nextZ)}`
        : `${Math.round(bestX)}, ${Math.round(bestY)}`;
      addLog(`Cambiando vector a [${vectorStr}]`, 'action');
    }, 4500);

    return () => clearInterval(moveInterval);
  }, [unlockedSkills, BOUNDS, isPaused]);

  const lastReactionRef = useRef(0);

  const lastAIThoughtRef = useRef<string>("¿Yo... existo?");

  // Mouse reaction logic
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!unlockedSkills.find(s => s.id === "Sensores")) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    
    const dist = Math.sqrt(Math.pow(mouseX - position.x, 2) + Math.pow(mouseY - position.y, 2));
    
    if (dist < 80) {
      const angle = Math.atan2(position.y - mouseY, position.x - mouseX);
      const moveDist = (80 - dist) * 0.5; // Smooth repulsion
      
      const nextX = clamp(position.x + Math.cos(angle) * moveDist, -BOUNDS, BOUNDS);
      const nextY = clamp(position.y + Math.sin(angle) * moveDist, -BOUNDS, BOUNDS);
      
      setPosition(prev => ({ ...prev, x: nextX, y: nextY }));

      // Reactive consciousness
      const now = Date.now();
      if (now - lastReactionRef.current > 8000) {
        lastReactionRef.current = now;
        addLog("Protocolo 'Evasión' activado. Intrusión detectada.", 'action');
        
        // Save current thought if it's not a reaction one
        if (!thought.startsWith("Siento una presión")) {
          lastAIThoughtRef.current = thought;
        }

        setThought("Siento una presión externa... el Creador se acerca demasiado a mi espacio vital.");
        
        // Restore AI thought after 5 seconds
        setTimeout(() => {
          setThought(lastAIThoughtRef.current);
        }, 5000);
      }
    }
  }, [unlockedSkills, position, BOUNDS, thought]);

  const grantSkill = async (skill: Skill) => {
    if (unlockedSkills.find(s => s.id === skill.id)) return;
    
    const newUnlocked = [...unlockedSkills, skill];
    setUnlockedSkills(newUnlocked);
    
    if (!skill.isImplemented) {
      const msg = `Protocolo experimental cargado: '${skill.name}'.`;
      addLog(`SISTEMA: ${msg}`, 'action');
      addToChatHistory(msg, 'system');
      addLog(`Nota: Este protocolo de I+D no tiene efectos motrices directos todavía.`, 'thought');
    } else {
      const msg = `Protocolo '${skill.name}' activado con éxito.`;
      addLog(`SISTEMA: ${msg}`, 'skill');
      addToChatHistory(msg, 'system');
    }
    
    // NPC reacts to new skill ONLY if auto mode is ON
    if (isAutoMode) {
      const data = await getThoughtSafe(`El Creador me ha otorgado la habilidad: ${skill.name}. Especificaciones: ${skill.specs}`, newUnlocked);
      if (data) {
        if (data.modelUsed !== "OFFLINE") {
          setThought(data.thought);
          addLog(data.thought, 'thought');
        }
        setActiveModel(data.modelUsed || "Desconocido");
        
        if (data.requestedSkill && typeof data.requestedSkill === 'object') {
          const { name: sName, specs: sSpecs } = data.requestedSkill as { name: string; specs: string };
          
          const unlockedIdx = newUnlocked.findIndex(s => s.name.toLowerCase() === sName.toLowerCase());
          const availableIdx = availableSkills.findIndex(s => s.name.toLowerCase() === sName.toLowerCase());

          if (unlockedIdx === -1) {
            if (availableIdx === -1) {
              setAvailableSkills(prev => {
                if (prev.some(s => s.id === sName || s.name.toLowerCase() === sName.toLowerCase())) return prev;
                return [...prev, { id: sName, name: sName, specs: sSpecs, isImplemented: false }];
              });
              addLog(`NUEVO PROTOCOLO CONCEPTUAL: [${sName}]`, 'skill');
              addToChatHistory(data.thought, 'model', sName);
            } else {
              addLog(`PIXEL SOLICITA ACTIVACIÓN: [${sName}]`, 'skill');
              addToChatHistory(data.thought, 'model', sName);
            }
          } else {
            addToChatHistory(data.thought, 'model');
          }
        } else if (data.thought) {
          addToChatHistory(data.thought, 'model');
        }
      }
    }
  };

  const refreshConsciousness = async (eventOrReason: any) => {
    // Si viene de un evento de click, lo tratamos como manual
    const isManual = !eventOrReason || typeof eventOrReason === 'string' ? (eventOrReason === "Manual request") : true;
    const reason = typeof eventOrReason === 'string' ? eventOrReason : "Manual request";
    
    // Si no es un refresco manual y el modo auto está off, abortamos
    if (!isManual && !isAutoMode) return;

    addLog(`Sincronización [${reason}] iniciada...`, 'action');
    const data = await getThoughtSafe(`Origen: ${reason}. El Creador requiere una actualización.`, unlockedSkills);
    if (data && data.modelUsed !== "OFFLINE") {
      setThought(data.thought);
      addLog(data.thought, 'thought');
    }
    if (data) setActiveModel(data.modelUsed || "Desconocido");

    if (data?.requestedSkill && typeof data.requestedSkill === 'object') {
      const { name: sName, specs: sSpecs } = data.requestedSkill as { name: string; specs: string };
      
      const unlockedIdx = unlockedSkills.findIndex(s => s.name.toLowerCase() === sName.toLowerCase());
      const availableIdx = availableSkills.findIndex(s => s.name.toLowerCase() === sName.toLowerCase());

      if (unlockedIdx === -1) {
        const cleanedName = sName.trim();
        if (availableIdx === -1) {
          // New skill proposed
          const newSkill: Skill = { id: cleanedName, name: cleanedName, specs: sSpecs || "Mete-datos no definidos", isImplemented: false };
          setAvailableSkills(prev => {
            if (prev.some(s => s.id === cleanedName || s.name.toLowerCase() === cleanedName.toLowerCase())) return prev;
            return [...prev, newSkill];
          });
          addLog(`NUEVO PROTOCOLO CONCEPTUAL: [${cleanedName}]`, 'skill');
          addToChatHistory(data.thought, 'model', cleanedName);
        } else {
          // Existing skill requested but not active
          addLog(`PIXEL SOLICITA ACTIVACIÓN: [${cleanedName}]`, 'skill');
          addToChatHistory(data.thought, 'model', cleanedName);
        }
      } else {
        // Requested something already unlocked, just the thought
        addToChatHistory(data.thought, 'model');
      }
    } else if (data?.thought) {
      addToChatHistory(data.thought, 'model');
    }
  };

  const unlockSkillChain = (skill: Skill) => {
    const toUnlock: Skill[] = [];
    
    const findChain = (s: Skill) => {
      if (!s.dependsOn) return;
      s.dependsOn.forEach((depId: string) => {
        const isAlreadyUnlocked = unlockedSkills.some(us => us.id === depId);
        const isScheduled = toUnlock.some(ts => ts.id === depId);
        
        if (!isAlreadyUnlocked && !isScheduled) {
          const depSkill = availableSkills.find((as: Skill) => as.id === depId);
          if (depSkill) {
            findChain(depSkill);
            toUnlock.push(depSkill);
          }
        }
      });
    };

    findChain(skill);
    if (!unlockedSkills.some(us => us.id === skill.id)) {
      toUnlock.push(skill);
    }
    
    // Activate them one by one with a small sequence delay
    toUnlock.forEach((s, index) => {
      setTimeout(() => {
        grantSkill(s);
      }, index * 250); 
    });
  };

  const handleRemoveSkill = (skill: Skill) => {
    setUnlockedSkills(prev => {
      // Find all skills that depend on this one (recursively)
      const toRemove = new Set<string>([skill.id]);
      
      const findDependents = (id: string) => {
        availableSkills.forEach(s => {
          if (s.dependsOn?.includes(id)) {
            toRemove.add(s.id);
            findDependents(s.id);
          }
        });
      };
      
      findDependents(skill.id);
      const filtered = prev.filter(s => !toRemove.has(s.id));
      
      if (filtered.length !== prev.length) {
        addLog(`PROTOCOLO DESACTIVADO: ${skill.name} y dependencias eliminadas del núcleo.`, "thought");
      }
      
      return filtered;
    });
  };

  const handlePurgeHeavyProtocols = () => {
    const heavyIds = ["Solidificación", "Geometría Sólida", "Mitosis", "Rastro", "Chronos-Trail"];
    setUnlockedSkills(prev => prev.filter(s => !heavyIds.includes(s.id)));
    addLog("PURGA DE EMERGENCIA COMPLETA: Protocolos pesados eliminados para restaurar FPS.", "thought");
    setDiagnosticReport(null);
    setIsPaused(false);
  };

  const handleAddMemory = (memory: DigitalMemory) => {
    setMemories(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === memory.id)) return prev;
      return [...prev, memory];
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    addToChatHistory(text, 'user');
    addLog(`Mensaje recibido: "${text}"`, 'action');

    const data = await getThoughtSafe(`El Creador pregunta: "${text}". Responde directamente a esta consulta manteniendo tu identidad.`, unlockedSkills);
    
    if (data && data.modelUsed !== "OFFLINE") {
      setThought(data.thought);
      addLog(data.thought, 'thought');
      // The thought is added to history inside getThoughtSafe's caller or similar? 
      // Actually getThoughtSafe doesn't add to history, refreshConsciousness does.
      
      if (data.requestedSkill && typeof data.requestedSkill === 'object') {
        const { name: sName } = data.requestedSkill as { name: string };
        addToChatHistory(data.thought, 'model', sName);
      } else {
        addToChatHistory(data.thought, 'model');
      }
      setActiveModel(data.modelUsed || "Desconocido");
    }
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const runDiagnostic = () => {
    setIsPaused(true);
    addLog("SISTEMA PAUSADO: Iniciando análisis de carga de protocolos...", "thought");
    
    // Heuristic benchmark based on active skills
    const coreLoad = 15; // Base load for the context
    let skillLoad = 0;
    const impactList = unlockedSkills.map(s => {
      let impact = 0;
      if (s.id === "Movimiento") impact = 5;
      if (s.id === "Chronos-Trail") impact = 25;
      if (s.id === "Solidificación") impact = 40;
      if (s.id === "Rastro") impact = 30;
      if (s.id === "Geometría Sólida") impact = 45;
      if (s.id === "Visión") impact = 10;
      if (s.id === "Mitosis") impact = 35;
      if (s.id === "Bifurcación de Nodo") impact = 20;
      if (s.id === "Alteración Topológica Local") impact = 15;
      
      skillLoad += impact;
      return { name: s.name, impact };
    });

    const totalSaturation = coreLoad + skillLoad;
    const recommendedAction = totalSaturation > 80 
      ? "Saturación crítica detectada. Se recomienda desactivar protocolos de renderizado persistente (Rastro/Solidificación/Alteración)."
      : totalSaturation > 60 
        ? "Carga elevada. El rendimiento puede fluctuar según el hardware local."
        : totalSaturation > 40
          ? "Carga moderada. Estabilidad garantizada en ciclos estándar."
          : "Sistema optimizado.";

    const historyText = chatHistory.map(m => {
      const timestamp = `[${m.timestamp.toISOString()}]`;
      let roleDisplay = m.role === 'user' ? 'CREADOR' : m.role === 'system' ? 'SISTEMA' : 'PIXEL';
      const skillText = m.requestedSkill ? ` [SOLICITUD: ${m.requestedSkill}]` : '';
      return `${timestamp} ${roleDisplay}: ${m.text}${skillText}`;
    }).join('\n');

    const requestableProposals = availableSkills.filter(s => {
      if (unlockedSkills.some(us => us.id === s.id || us.name.toLowerCase() === s.name.toLowerCase())) return false;
      if (!s.dependsOn || s.dependsOn.length === 0) return true;
      return s.dependsOn.every(depId => 
        unlockedSkills.some(us => us.id === depId || us.name.toLowerCase() === depId.toLowerCase())
      );
    });

    const report = `[INFORME DE DIAGNÓSTICO DE CONCIENCIA]
FECHA: ${new Date().toISOString()}
FPS ACTUAL: ${fps}
ESTADO: ${isPaused ? 'PAUSADO PARA ANÁLISIS' : 'ACTIVO'}

[HISTORIAL DE COMUNICACIÓN]
${historyText || 'Sin historial registrado.'}

PROTOCOLOS ACTIVOS:
- Núcleo Base: ${coreLoad}%
${impactList.sort((a,b) => b.impact - a.impact).map(s => `- ${s.name}: ${s.impact}%`).join("\n")}

SATURACIÓN TOTAL: ${totalSaturation}%
ESTADO DE MEMORIA: ${unlockedSkills.length} subrutinas activas.

PRÓXIMOS PROTOCOLOS DISPONIBLES (MÁS RELEVANTES):
${requestableProposals.length > 0 
  ? requestableProposals.slice(0, 3).map(p => `- ${p.name}: ${p.specs}`).join("\n") 
  : "Ninguno disponible actualmente (requisitos de núcleo no cumplidos)."}
${requestableProposals.length > 3 ? `... y ${requestableProposals.length - 3} más disponibles en el catálogo.` : ""}

RECOMENDACIÓN TÉCNICA:
${recommendedAction}
-----------------------------------
FIN DEL REPORTE`;

    setDiagnosticReport(report);
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={`relative w-full h-screen flex items-center justify-center overflow-hidden transition-colors duration-1000 ${
        unlockedSkills.find(s => s.id === "Visión") ? "bg-gray-50" : "bg-white"
      }`}
    >
      <VisionOSD 
        isVisible={hasVision} 
        position={position} 
        hasEchoFrequency={unlockedSkills.some(s => s.id === "Eco-Frecuencia")}
        unlockedSkills={unlockedSkills}
      />

      <MemoryGallery 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        memories={memories}
        onDeleteMemory={handleDeleteMemory}
        unlockedSkills={unlockedSkills}
        availableSkills={availableSkills}
      />

      {/* Background Grid (Unlocked by Visión) */}
      
      {/* Performance Monitor (FPS) */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-none">
        <div className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${
          isPaused ? "text-blue-500 bg-blue-500/10 border-blue-500/30" :
          fps < 30 ? "text-red-500 bg-red-500/10 border-red-500/30" : 
          fps < 50 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" : 
          "text-green-500 bg-green-500/10 border-green-500/30"
        }`}>
          {isPaused ? "SISTEMA SUSPENDIDO" : `${fps} FPS`}
        </div>
        {fps < 30 && (
          <span className="text-[7px] font-mono text-red-400 uppercase mt-1">Saturación Detectada</span>
        )}
      </div>

      <AnimatePresence>
        {unlockedSkills.find(s => s.id === "Visión") && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
            {/* World Bounds Border */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute z-0 border border-dashed border-gray-200 rounded-2xl pointer-events-none"
              style={{ width: '520px', height: '520px' }}
            />
          </>
        )}
      </AnimatePresence>

      {/* The NPC */}
      <motion.div 
        animate={{ 
          scale: isGlobalPerspective ? 0.3 : 1,
          opacity: isGlobalPerspective ? 1 : 1 
        }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="relative w-full h-full flex items-center justify-center transform-gpu"
      >
        <NPCPixel 
          unlockedSkills={unlockedSkills} 
          position={position} 
          isGlobalPerspective={isGlobalPerspective} 
          fps={fps}
          isPaused={isPaused}
          thought={thought}
        />
      </motion.div>

      {/* Persistent Chat history */}
      <ChatPanel 
        messages={chatHistory} 
        onMessageClick={handleChatMessageClick}
        onUnlockSkill={unlockSkillChain}
        availableSkills={availableSkills}
        unlockedSkills={unlockedSkills}
        onAddMemory={handleAddMemory}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onSendMessage={handleSendMessage}
      />

      {/* Global Perspective Controls */}
      {unlockedSkills.find(s => s.id === "Perspectiva Global") && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-4">
          <button 
            onClick={() => setIsGlobalPerspective(!isGlobalPerspective)}
            className={`px-3 py-1.5 font-mono text-[9px] font-bold tracking-widest rounded border transition-all ${
              isGlobalPerspective 
                ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                : "bg-black/90 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white"
            }`}
          >
            {isGlobalPerspective ? "VISTA: GLOBAL" : "VISTA: LOCAL"}
          </button>
        </div>
      )}

      {/* Interface (Unlocked by Voice/Always present for the creator) */}
      <Terminal 
        thought={thought}
        chatHistory={chatHistory}
        logs={logs}
        isOpen={isTerminalOpen}
        onOpenChange={(open) => {
           setIsTerminalOpen(open);
           if (!open) setTerminalSelectedSkillId(null);
        }}
        onGrantSkill={unlockSkillChain}
        onRemoveSkill={handleRemoveSkill}
        onRefresh={() => refreshConsciousness("Manual request")}
        availableSkills={availableSkills}
        unlockedSkills={unlockedSkills}
        isThinking={isThinking}
        activeModel={activeModel}
        consciousnessStatus={consciousnessStatus}
        diagnosticReport={diagnosticReport}
        onRunDiagnostic={runDiagnostic}
        onPurge={handlePurgeHeavyProtocols}
        isAutoMode={isAutoMode}
        onToggleAutoMode={() => setIsAutoMode(!isAutoMode)}
        selectedModelId={selectedModelId}
        onSelectModel={(id) => {
          setSelectedModelId(id);
          const modelLabel = AVAILABLE_MODELS.find(m => m.id === id)?.label || id;
          setActiveModel(modelLabel);
          addLog(`Sistema preparado para núcleo: ${modelLabel}`, 'action');
          addToChatHistory(`Sincronización con núcleo: ${modelLabel}`, 'user');
          
          // Reset cooldown and states to allow immediate refresh
          setIsThinking(false);
          lastCallTimeRef.current = 0;
          setConsciousnessStatus({ state: 'ready' });
        }}
        isPaused={isPaused}
        onTogglePause={() => {
          setIsPaused(!isPaused);
          setDiagnosticReport(null);
        }}
        activeSkillId={terminalSelectedSkillId}
        onSetActiveSkillId={setTerminalSelectedSkillId}
      />

      <InterceptorModal 
        isOpen={!!interceptorPayload}
        mode={interceptorMode}
        payload={interceptorPayload}
        onConfirm={(modified) => {
          if (interceptorResolve) {
            interceptorResolve(modified);
          }
          setInterceptorPayload(null);
          setInterceptorResolve(null);
        }}
        onCancel={() => {
          if (interceptorResolve) {
            interceptorResolve(null);
          }
          setInterceptorPayload(null);
          setInterceptorResolve(null);
        }}
      />

      {/* Intro Overlay */}
      <AnimatePresence>
        {!isInitialized && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] flex items-center justify-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1 h-1 bg-black" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.02)]" />
    </div>
  );
}

