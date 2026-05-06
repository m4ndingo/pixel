import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, User, Lightbulb, Copy, Check, Terminal as TerminalIcon, RefreshCw, ChevronDown, ChevronRight, Folder, FolderOpen, Sparkles, Lock } from "lucide-react";
import { AVAILABLE_MODELS } from "../lib/gemini";

interface TerminalProps {
  thought: string;
  chatHistory: { id: string; text: string; timestamp: Date; role?: 'user' | 'model' | 'system'; requestedSkill?: string }[];
  logs: { msg: string; type: 'thought' | 'action' | 'skill' }[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGrantSkill: (skill: any) => void;
  onRemoveSkill: (skill: any) => void;
  onRefresh: () => void;
  availableSkills: any[];
  unlockedSkills: any[];
  isThinking?: boolean;
  activeModel?: string;
  consciousnessStatus: {
    state: 'ready' | 'thinking' | 'cooldown' | 'error';
    remainingMs: number;
    lastModel: string;
  };
  diagnosticReport: string | null;
  onRunDiagnostic: () => void;
  onPurge: () => void;
  isAutoMode: boolean;
  onToggleAutoMode: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  activeSkillId?: string | null;
  onSetActiveSkillId?: (id: string | null) => void;
}

export default function Terminal({ thought, chatHistory, logs, isOpen, onOpenChange, onGrantSkill, onRemoveSkill, onRefresh, availableSkills, unlockedSkills, isThinking, activeModel, consciousnessStatus, diagnosticReport, onRunDiagnostic, onPurge, isAutoMode, onToggleAutoMode, selectedModelId, onSelectModel, isPaused, onTogglePause, activeSkillId: controlledActiveSkillId, onSetActiveSkillId }: TerminalProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDiagnosticCopied, setIsDiagnosticCopied] = useState(false);
  const [localActiveSkillId, setLocalActiveSkillId] = useState<string | null>(null);

  const activeSkillId = controlledActiveSkillId !== undefined ? controlledActiveSkillId : localActiveSkillId;
  const setActiveSkillId = onSetActiveSkillId || setLocalActiveSkillId;

  useEffect(() => {
    if (controlledActiveSkillId) {
      setLocalActiveSkillId(controlledActiveSkillId);
    }
  }, [controlledActiveSkillId]);

  const activeSkill = useMemo(() => {
    return availableSkills.find(s => s.id === activeSkillId) || null;
  }, [activeSkillId, availableSkills]);

  const allDependencies = useMemo(() => {
    if (!activeSkill || !activeSkill.dependsOn) return [];
    // Ensure uniqueness to avoid React key collisions if dependsOn has duplicates
    const uniqueDeps = Array.from(new Set(activeSkill.dependsOn));
    return uniqueDeps.map((depId: string) => {
      const skill = availableSkills.find(as => as.id === depId);
      const isUnlocked = unlockedSkills.some(us => us.id === depId);
      const isReady = skill?.dependsOn?.every((d: string) => unlockedSkills.some(us => us.id === d)) ?? true;
      return { ...skill, isUnlocked, isReady };
    });
  }, [activeSkill, availableSkills, unlockedSkills]);

  const missingDependencies = useMemo(() => {
    return allDependencies.filter(d => !d.isUnlocked);
  }, [allDependencies]);

  // Unified Details Hub Section
  const skillDetails = useMemo(() => {
    if (!activeSkill) return null;
    
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              {activeSkill.isImplemented ? <Sparkles size={20} className="text-blue-400" /> : <Lightbulb size={20} className="text-amber-400" />}
            </div>
            <div>
              <h4 className="text-base font-mono font-bold text-white uppercase tracking-wider">{activeSkill.name}</h4>
              <span className="text-[10px] font-mono text-blue-500/50 uppercase tracking-widest font-bold">Protocolo de Consciencia</span>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveSkillId(null)}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-all group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="bg-black/30 p-5 rounded-xl border border-gray-800/80 shadow-inner">
              <p className="text-[14px] font-mono text-gray-300 leading-relaxed italic">
                "{activeSkill.specs}"
              </p>
            </div>
            
            <button
              onClick={() => {
                const isUnlocked = unlockedSkills.some(s => s.id === activeSkill.id);
                if (isUnlocked) {
                  onRemoveSkill(activeSkill);
                } else {
                  onGrantSkill(activeSkill);
                }
              }}
              disabled={activeSkill.dependsOn && !activeSkill.dependsOn.every((depId: string) => unlockedSkills.some(u => u.id === depId))}
              className={`w-full py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${
                unlockedSkills.some(s => s.id === activeSkill.id)
                  ? "bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/40 shadow-red-900/10"
                  : activeSkill.dependsOn && !activeSkill.dependsOn.every((depId: string) => unlockedSkills.some(u => u.id === depId))
                    ? "bg-gray-900 border border-gray-800 text-gray-700 cursor-not-allowed opacity-50"
                    : activeSkill.isImplemented
                      ? "bg-blue-600 border border-blue-400 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-95 shadow-blue-900/20"
                      : "bg-amber-500 border border-amber-400 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-95 shadow-amber-900/20"
              }`}
            >
              {unlockedSkills.some(s => s.id === activeSkill.id) ? (
                <>
                  <Lock size={14} />
                  DESACTIVAR PROTOCOLO
                </>
              ) : (
                <>
                  {activeSkill.isImplemented ? <Sparkles size={14} /> : <Lightbulb size={14} />}
                  {activeSkill.isImplemented ? "ACTIVAR PROTOCOLO" : "CARGAR I+D EN MEMORIA"}
                </>
              )}
            </button>
          </div>
          
          {allDependencies.length > 0 && (
            <div className="lg:w-[350px] shrink-0 space-y-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800/50 pb-2 block">Cadena de Requisitos</span>
              <div className="flex flex-wrap gap-2.5">
                {allDependencies.map((dep: any) => (
                  <button
                    key={dep.id}
                    onClick={() => !dep.isUnlocked && onGrantSkill(dep)}
                    className={`text-[10px] font-mono px-3 py-2 rounded-lg border transition-all flex items-center gap-2.5 shadow-sm ${
                      dep.isUnlocked
                        ? "bg-green-500/10 border-green-500/30 text-green-400 cursor-default"
                        : dep.isReady 
                          ? "bg-blue-900/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20" 
                          : "bg-red-950/20 border-red-900/30 text-red-200/60 hover:bg-red-950/40 hover:border-red-500/50"
                    }`}
                  >
                    {dep.isUnlocked ? <Check size={12} className="text-green-400" /> : <div className="w-2 h-2 rounded-full bg-current opacity-40" />}
                    {dep.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeSkill, allDependencies, setActiveSkillId]);

  const copyReport = () => {
    const proposals = availableSkills.filter(s => 
      !s.isImplemented && 
      !unlockedSkills.some(us => us.id === s.id || us.name.toLowerCase() === s.name.toLowerCase())
    );
    const historyText = chatHistory.map(m => {
      const timestamp = `[${m.timestamp.toLocaleTimeString()}]`;
      const role = m.role === 'user' ? 'CREADOR' : m.role === 'system' ? 'SISTEMA' : 'PIXEL';
      const skillText = m.requestedSkill ? ` [SOLICITUD: ${m.requestedSkill}]` : '';
      return `${timestamp} ${role}: ${m.text}${skillText}`;
    }).join('\n');
    
    const report = `[REPORTE CONCIENCIA PÍXEL]

[HISTORIAL DE COMUNICACIÓN]
${historyText || 'Sin historial registrado.'}

[PROTOCOLOS ACTIVOS]
${unlockedSkills.map(s => `- ${s.name}: ${s.specs}`).join('\n') || 'Ninguno'}

[PROPUESTAS DE PÍXEL (POR IMPLEMENTAR)]
${proposals.map(s => `- ${s.name}: ${s.specs}`).join('\n') || 'Ninguna propuesta pendiente.'}
`;
    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyDiagnostic = () => {
    if (diagnosticReport) {
      navigator.clipboard.writeText(diagnosticReport);
      setIsDiagnosticCopied(true);
      setTimeout(() => setIsDiagnosticCopied(false), 2000);
    }
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    thought: true,
    skill: true,
    action: false
  });

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const groupedLogs = useMemo(() => {
    return {
      thought: logs.filter(l => l.type === 'thought'),
      action: logs.filter(l => l.type === 'action'),
      skill: logs.filter(l => l.type === 'skill'),
    };
  }, [logs]);
  
  // Logical Tiers Grouping
  const skillTiers = useMemo(() => {
    const tiers: Record<number, any[]> = {};
    availableSkills.forEach(skill => {
      const tier = skill.dependsOn?.length || 0;
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push(skill);
    });
    return tiers;
  }, [availableSkills]);

  const LogGroup = ({ type, title, items, color }: { type: string, title: string, items: any[], color: string }) => {
    const isExpanded = expandedGroups[type];
    if (items.length === 0) return null;

    return (
      <div className="mb-1">
        <button 
          onClick={() => toggleGroup(type)}
          className="flex items-center gap-2 w-full text-left hover:bg-white/5 py-1 px-2 rounded transition-colors group"
        >
          {isExpanded ? <ChevronDown size={10} className="text-gray-500" /> : <ChevronRight size={10} className="text-gray-500" />}
          {isExpanded ? <FolderOpen size={10} className={color} /> : <Folder size={10} className={color} />}
          <span className={`text-[10px] font-mono uppercase tracking-widest ${color}`}>{title}</span>
          <span className="text-[9px] font-mono text-gray-600 ml-auto group-hover:text-gray-400">({items.length})</span>
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pl-4 border-l border-gray-800 ml-3 mt-1 flex flex-col gap-1"
            >
              {items.map((item, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-400 leading-tight py-0.5 border-b border-gray-900 last:border-0 truncate group/item" title={item.msg}>
                  <span className="text-gray-600 mr-2">›</span>
                  <span className="group-hover/item:text-gray-200 transition-colors">{item.msg}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center z-50 pointer-events-none">
      <AnimatePresence>
        {thought && !isOpen && !unlockedSkills.some(s => s.id === "Voz") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 text-center px-4"
          >
            <p className="font-mono text-xs text-gray-500 italic bg-white/40 backdrop-blur-md py-2 px-6 rounded-full border border-gray-100 shadow-sm inline-block">
              "{thought}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="creator-console" className="w-full max-w-[95%] px-4 pointer-events-auto">
        <div className="bg-black text-white rounded-t-xl shadow-2xl overflow-hidden border-t border-l border-r border-gray-800">
          <div id="console-header" className="flex items-center justify-between px-3 py-2 bg-gray-950 border-b border-gray-800">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <TerminalIcon size={14} className={`${isThinking ? 'text-blue-400 animate-pulse' : 'text-gray-500'}`} />
                <span id="console-title" className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                  {isThinking ? 'Procesando...' : 'Consola'}
                </span>
                {activeModel && (
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded border whitespace-nowrap truncate max-w-[120px] transition-colors ${
                    activeModel.toLowerCase() === "offline" 
                      ? "text-red-400 bg-red-400/10 border-red-400/30" 
                      : "text-blue-400 bg-blue-400/5 border-blue-400/20"
                  }`} title={activeModel}>
                    {activeModel.replace("-preview", "").replace("-exp", "").toUpperCase()}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 ml-2 border-l border-gray-800 pl-3">
                <button 
                  onClick={() => setShowLogs(!showLogs)}
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                    showLogs 
                      ? 'bg-blue-500/10 border border-blue-500/50 text-blue-400' 
                      : 'border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  LOGS
                  <span className={`w-1 h-1 rounded-full ${logs.length > 0 ? 'bg-blue-400 animate-pulse' : 'bg-gray-700'}`} />
                </button>
                <button 
                  onClick={onRefresh}
                  disabled={isThinking || consciousnessStatus.state === 'cooldown'}
                  title="Sincronizar Conciencia"
                  className={`p-1 rounded transition-all ${
                    isThinking || consciousnessStatus.state === 'cooldown'
                      ? 'text-gray-800 cursor-not-allowed'
                      : 'text-gray-500 hover:text-blue-400 hover:bg-gray-800'
                  } ${isThinking ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={12} />
                </button>
                <button 
                  onClick={copyReport}
                  title="Copiar Reporte"
                  className={`p-1 text-gray-500 hover:text-green-500 hover:bg-gray-800 rounded transition-all ${isCopied ? 'text-green-500' : ''}`}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <button 
              id="console-toggle"
              onClick={() => onOpenChange(!isOpen)}
              className="flex items-center gap-1.5 px-2 py-1 ml-4 text-[9px] font-bold font-mono text-gray-500 hover:text-white bg-gray-900 border border-gray-800 rounded hover:border-gray-600 transition-all shrink-0"
            >
              {isOpen ? "MINIMIZAR" : "ACCEDER"}
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          </div>

          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="bg-gray-950 border-b border-gray-800 p-4 overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <LogGroup 
                    type="thought" 
                    title="Pensamientos" 
                    items={groupedLogs.thought} 
                    color="text-gray-400"
                  />
                  <LogGroup 
                    type="skill" 
                    title="Habilidades" 
                    items={groupedLogs.skill} 
                    color="text-yellow-500"
                  />
                  <LogGroup 
                    type="action" 
                    title="Acciones" 
                    items={groupedLogs.action} 
                    color="text-blue-500"
                  />
                  {logs.length === 0 && <span className="text-[10px] text-gray-700 font-mono italic">Sin registros...</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                id="skill-grid-container"
                initial={{ height: 0 }}
                animate={{ height: "auto", maxHeight: "75vh" }}
                exit={{ height: 0 }}
                className="overflow-y-auto custom-scrollbar"
              >
                <div className="flex flex-col h-full max-h-[75vh]">
                  {/* Global Actions Bar */}
                  <div className="p-4 border-b border-gray-800 bg-gray-950 flex flex-col gap-4">
                    {diagnosticReport && (
                      <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <TerminalIcon size={14} className="text-blue-400" />
                            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">Reporte de Diagnóstico de Sistema</span>
                          </div>
                          <button 
                            onClick={copyDiagnostic}
                            className="text-[9px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors px-2 py-1 rounded bg-blue-500/5"
                          >
                            {isDiagnosticCopied ? <Check size={10} /> : <Copy size={10} />}
                            {isDiagnosticCopied ? "COPIADO" : "COPIAR"}
                          </button>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-blue-500/10 max-h-[150px] overflow-y-auto custom-scrollbar">
                          <pre className="text-[10px] font-mono text-blue-300/80 leading-tight whitespace-pre-wrap">
                            {diagnosticReport}
                          </pre>
                        </div>
                        <button 
                          onClick={onPurge}
                          className="self-end py-1.5 px-4 bg-red-600/20 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase rounded hover:bg-red-600/40 transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={12} />
                          PURGA SISTÉMICA
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={onRefresh}
                        disabled={isThinking || consciousnessStatus.state === 'cooldown' || isPaused}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-mono transition-all duration-300 ${
                          isThinking || consciousnessStatus.state === 'cooldown' || isPaused
                            ? "bg-gray-900 text-gray-700 cursor-not-allowed border border-gray-800"
                            : "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30"
                        }`}
                      >
                        <RefreshCw size={12} className={isThinking ? "animate-spin" : ""} />
                        <span>SINCRONIZAR</span>
                      </button>

                      <button 
                        onClick={isPaused ? onTogglePause : onRunDiagnostic}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-mono transition-all duration-300 ${
                          isPaused 
                            ? "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30" 
                            : "bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                        }`}
                      >
                        {isPaused ? <Sparkles size={12} /> : <TerminalIcon size={12} />}
                        <span>{isPaused ? "REANUDAR SIMULACIÓN" : "PAUSAR Y ANALIZAR"}</span>
                      </button>

                      <button 
                        onClick={onToggleAutoMode}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-mono transition-all duration-300 ${
                          isAutoMode 
                            ? "bg-purple-600/20 text-purple-400 border border-purple-500/30" 
                            : "bg-gray-800 text-gray-500 border border-gray-700"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isAutoMode ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                        <span>MODO AUTO: {isAutoMode ? "ON" : "OFF"}</span>
                      </button>

                      <div className="ml-auto flex items-center gap-3">
                        <select 
                          value={selectedModelId}
                          onChange={(e) => onSelectModel(e.target.value)}
                          className="bg-gray-900 border border-gray-800 text-[9px] font-mono text-blue-400 px-2 py-1 rounded cursor-pointer outline-none hover:border-gray-600 transition-all focus:border-blue-500/50"
                        >
                          {AVAILABLE_MODELS.map(model => (
                            <option key={model.id} value={model.id} className="bg-gray-950">
                              {model.label} ({model.id})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? '' : 'animate-pulse'} ${
                            isPaused ? "bg-red-500" :
                            consciousnessStatus.state === 'ready' ? "bg-green-500" :
                            consciousnessStatus.state === 'thinking' ? "bg-blue-500" :
                            "bg-yellow-500"
                          }`} />
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                            isPaused ? "text-red-500" :
                            consciousnessStatus.state === 'ready' ? "text-green-500" :
                            consciousnessStatus.state === 'thinking' ? "text-blue-500" :
                            "text-yellow-500"
                          }`}>
                            {isPaused ? "SUSPENDIDO" : consciousnessStatus.state.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills Manifest Area - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900/30">
                    <p className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-tighter">Manifiesto de Habilidades:</p>
                    <div id="skill-buttons" className="flex flex-col gap-6">
                      {Object.keys(skillTiers).sort((a, b) => Number(a) - Number(b)).map(tierStr => {
                        const tierValue = Number(tierStr);
                        const skillsInTier = skillTiers[tierValue];
                        
                        const readyInTier = skillsInTier.filter(skill => {
                          if (!skill.dependsOn || skill.dependsOn.length === 0) return true;
                          return skill.dependsOn.every(depId => unlockedSkills.some(us => us.id === depId));
                        });
                        
                        const blockedInTier = skillsInTier.filter(skill => {
                          if (!skill.dependsOn || skill.dependsOn.length === 0) return false;
                          return !skill.dependsOn.every(depId => unlockedSkills.some(us => us.id === depId));
                        });

                        if (skillsInTier.length === 0) return null;

                        return (
                          <div key={`tier-${tierValue}`} className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 border-b border-gray-800/80 pb-1">
                               <span className="text-[10px] font-bold text-blue-500/80 font-mono">T{tierValue}</span>
                               <span className="text-[8px] text-gray-600 uppercase font-mono tracking-tighter">
                                 {tierValue === 0 ? "Nivel Base" : `${tierValue} Requisito${tierValue > 1 ? 's' : ''}`}
                               </span>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                               {readyInTier.map(skill => {
                                 const isUnlocked = unlockedSkills.find(s => s.id === skill.id) || false;
                                 const isActive = activeSkillId === skill.id;
                                 return (
                                   <div key={skill.id} className="w-full">
                                     <button
                                       onClick={() => setActiveSkillId(isActive ? null : skill.id)}
                                       onDoubleClick={(e) => {
                                          e.preventDefault();
                                          if (isUnlocked) onRemoveSkill(skill);
                                          else onGrantSkill(skill);
                                       }}
                                       className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all w-full relative overflow-hidden group/skill-btn h-full ${
                                         isActive
                                           ? "bg-blue-600/30 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                           : isUnlocked
                                             ? "bg-blue-600/10 border-blue-500/20 text-blue-200 hover:bg-red-900/10 hover:border-red-900/40 hover:text-red-300"
                                             : skill.isImplemented
                                               ? "bg-gray-900 border-gray-800 hover:border-blue-500/50 hover:text-blue-400"
                                               : "bg-gray-900/50 border-amber-900/20 hover:border-amber-500/40 hover:text-amber-300"
                                       }`}
                                     >
                                       {!skill.isImplemented && !isUnlocked && (
                                         <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[7px] uppercase font-bold border-l border-b border-amber-500/20 rounded-bl">
                                           I+D
                                         </div>
                                       )}
                                       <div className="shrink-0 flex items-center justify-center w-4 text-center">
                                         {isUnlocked ? <Check size={12} className="text-blue-400" /> : skill.isImplemented ? <Sparkles size={12} className="text-gray-600" /> : <Lightbulb size={12} className="text-amber-600" />}
                                       </div>
                                       <div className="flex flex-col min-w-0 pr-4">
                                         <span className="text-xs font-mono truncate">{skill.name}</span>
                                       </div>
                                       <span className={`ml-auto text-[8px] uppercase shrink-0 ${isUnlocked ? 'opacity-40' : skill.isImplemented ? 'opacity-20' : 'opacity-40 text-amber-500 font-bold'}`}>
                                         {isUnlocked ? 'Activo' : skill.isImplemented ? 'Listo' : 'Propuesta'}
                                       </span>
                                     </button>
                                   </div>
                                 );
                               })}

                               {blockedInTier.map(skill => (
                                 <div
                                   key={skill.id}
                                   className="w-full opacity-75"
                                   onClick={() => setActiveSkillId(activeSkillId === skill.id ? null : skill.id)}
                                 >
                                   <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-950 border-gray-800 text-gray-400 transition-all h-full cursor-pointer hover:bg-gray-900/80 ${activeSkillId === skill.id ? 'border-amber-500/50' : 'hover:border-gray-700'}`}>
                                     <Lock size={10} className="shrink-0 text-gray-400/50" />
                                     <div className="flex flex-col min-w-0 pr-4">
                                       <span className="text-xs font-mono truncate">{skill.name}</span>
                                       <span className="text-[7px] font-mono text-red-500/80 uppercase">Bloqueado</span>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fixed Details Hub Section */}
                  <AnimatePresence mode="wait">
                    {activeSkill && (
                      <motion.div
                        key={activeSkill.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gray-950 border-t border-blue-500/30 p-6 shadow-2xl relative"
                      >
                        {skillDetails}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

