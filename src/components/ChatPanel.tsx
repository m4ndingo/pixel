import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, User, Lightbulb, Sparkles, ChevronRight, Copy, Image, Check, ExternalLink, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  role?: 'user' | 'model';
  requestedSkill?: string;
}

interface ChatPanelProps {
  messages: Message[];
  onMessageClick?: (msg: Message) => void;
  onUnlockSkill?: (skill: any) => void;
  availableSkills?: any[];
  unlockedSkills?: any[];
  onAddMemory?: (memory: any) => void;
  onOpenGallery?: () => void;
  onSendMessage?: (text: string) => void;
}

export default function ChatPanel({ 
  messages, 
  onMessageClick, 
  onUnlockSkill,
  availableSkills = [],
  unlockedSkills = [],
  onAddMemory,
  onOpenGallery,
  onSendMessage
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ 
    text: string, 
    requestedSkill?: string,
    activeAtTime: any[]
  } | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [imageSeed, setImageSeed] = useState(() => Math.floor(Math.random() * 1000));
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const sanitizePrompt = (text: string) => {
    // Pollinations image generation works better with shorter, cleaner prompts
    const cleanText = text
      .replace(/[*_#`\[\]()]/g, '')
      .replace(/[¿?¡!]/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .slice(0, 120);
    
    return `${cleanText}, abstract minimalist digital art style, deep contrast`;
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenImage = (msg: Message) => {
    setViewingImage({ 
      text: msg.text, 
      requestedSkill: msg.requestedSkill,
      activeAtTime: [...unlockedSkills]
    });
    setIsImageLoading(true);
    setImageError(false);
    setImageRetryCount(0);
    setImageSeed(Math.floor(Math.random() * 1000));
  };

  const handleImageError = () => {
    if (imageRetryCount < 3) {
      setTimeout(() => {
        setImageSeed(prev => prev + 1);
        setImageRetryCount(prev => prev + 1);
      }, 2000);
    } else {
      setImageError(true);
      setIsImageLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  return (
    <div className="fixed top-6 left-6 z-[60] flex flex-col items-start gap-3">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border ${
            isOpen 
              ? "bg-blue-600 border-blue-400 text-white" 
              : "bg-white/80 backdrop-blur-md border-gray-200 text-blue-600 hover:bg-white"
          }`}
        >
          {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
          {messages.length > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={onOpenGallery}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border bg-white/80 backdrop-blur-md border-gray-200 text-purple-600 hover:bg-white"
          title="Ver Archivo de Memorias"
        >
          <Image size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="w-72 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
          >
            {/* Header */}
            <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Pixel Consciousness</h3>
                <p className="text-[9px] text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online
                </p>
              </div>
            </div>            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3 custom-scrollbar scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 opacity-30 text-center">
                  <MessageSquare size={24} className="mb-2" />
                  <p className="text-[10px] font-mono leading-relaxed text-gray-400">Esperando transmisiones neuríticas...</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isRequest = !!msg.requestedSkill;
                  const skillInCatalog = isRequest ? availableSkills.find(s => s.name.toLowerCase() === msg.requestedSkill?.toLowerCase()) : null;
                  const isAlreadyUnlocked = skillInCatalog ? unlockedSkills.some(s => s.id === skillInCatalog.id) : false;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full transition-all group animate-in fade-in slide-in-from-bottom-1`}
                    >
                      <div className={`flex items-center gap-2 mb-1 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-amber-700' : 'text-blue-700'}`}>
                          {msg.role === 'user' ? 'CREADOR' : 'PIXEL_ALPHA'}
                        </span>
                        <span className="text-[7px] text-gray-500 font-bold">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isRequest ? (
                        <div className="w-full relative group">
                          <button 
                            onClick={() => {
                              onMessageClick?.(msg);
                              setIsOpen(false);
                            }}
                            className="w-full text-left bg-blue-600/10 border border-blue-500/30 rounded-xl overflow-hidden shadow-lg shadow-blue-500/5 hover:bg-blue-600/20 transition-all active:scale-[0.98] group/btn"
                          >
                            <div className="bg-blue-600 px-3 py-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-white">
                                <Sparkles size={12} className="animate-pulse" />
                                <span className="text-[9px] font-bold font-mono tracking-wider uppercase">Protocolo Requerido</span>
                              </div>
                              <ChevronRight size={12} className="text-white/50 group-hover/btn:translate-x-1 transition-transform" />
                            </div>
                            <div className="p-3 bg-white/60 backdrop-blur-sm">
                              <p className="text-[11px] font-mono text-gray-900 leading-relaxed italic mb-3 font-medium">
                                "{msg.text}"
                              </p>
                              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                                <div className="w-8 h-8 rounded-md bg-blue-500/20 flex items-center justify-center">
                                  {skillInCatalog?.isImplemented ? <Sparkles size={16} className="text-blue-600" /> : <Lightbulb size={16} className="text-blue-600" />}
                                </div>
                                <div className="flex flex-col flex-1 overflow-hidden">
                                  <span className="text-[10px] font-bold text-blue-900 font-mono uppercase truncate">
                                    {msg.requestedSkill}
                                  </span>
                                  <span className="text-[8px] text-blue-600/80 font-mono">
                                    {skillInCatalog ? (isAlreadyUnlocked ? 'Ya en memoria activa' : 'Pendiente de activación') : 'Protocolo desconocido'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                          
                          {skillInCatalog && !isAlreadyUnlocked && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnlockSkill?.(skillInCatalog);
                                setIsOpen(false);
                              }}
                              className="absolute bottom-3 right-3 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-tighter hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1"
                            >
                              Activar <ChevronRight size={10} />
                            </button>
                          )}

                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(msg.id, msg.text);
                              }}
                              title="Copiar texto"
                              className="w-5 h-5 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all"
                            >
                              {copiedId === msg.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage({ 
                                  text: msg.text, 
                                  requestedSkill: msg.requestedSkill,
                                  activeAtTime: [...unlockedSkills]
                                });
                              }}
                              title="Generar imagen"
                              className="w-5 h-5 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-all"
                            >
                              <Image size={10} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative group/msg max-w-[85%]">
                          <div className={`rounded-2xl px-4 py-2.5 text-[11px] font-mono leading-relaxed shadow-sm border font-bold transition-all break-words ${
                            msg.role === 'user' 
                              ? 'bg-amber-100 text-amber-950 border-amber-200 rounded-tr-none' 
                              : 'bg-blue-100/80 text-blue-950 border-blue-200 rounded-tl-none group-hover/msg:border-blue-300'
                          }`}>
                            {msg.text}
                          </div>
  
                          {msg.role === 'model' && (
                            <div className="absolute top-0 -right-7 flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 p-1">
                              <button 
                                onClick={() => handleCopy(msg.id, msg.text)}
                                title="Copiar texto"
                                className="w-5 h-5 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all cursor-pointer"
                              >
                                {copiedId === msg.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                              </button>
                              <button 
                                onClick={() => handleOpenImage(msg)}
                                title="Generar imagen"
                                className="w-5 h-5 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-600 transition-all cursor-pointer"
                              >
                                <Image size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (inputText.trim() && onSendMessage) {
                  onSendMessage(inputText);
                  setInputText("");
                }
              }}
              className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2"
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Interactuar con la conciencia..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  inputText.trim() 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Send size={16} />
              </button>
            </form>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100">
              <p className="text-[8px] text-gray-400 text-center font-mono uppercase tracking-widest">
                Protocolos de Memoria Activos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-black border border-white/20 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative flex flex-col"
              style={{ maxHeight: 'calc(100vh - 80px)' }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="aspect-square w-full bg-gray-900 flex items-center justify-center overflow-hidden relative">
                {isImageLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mb-4"
                    />
                    <p className="text-blue-400 font-mono text-[9px] animate-pulse">
                      {imageRetryCount > 0 ? `REINTENTANDO (${imageRetryCount}/3)...` : 'GENERANDO CONCIENCIA...'}
                    </p>
                  </div>
                )}
                
                {imageError ? (
                  <div className="flex flex-col items-center justify-center text-red-400 p-8 text-center">
                    <Sparkles className="mb-4 opacity-50" size={32} />
                    <p className="font-mono text-xs mb-2">Error de Generación</p>
                    <p className="text-[10px] opacity-70">El motor de visualización está saturado. Por favor, inténtalo de nuevo en unos momentos.</p>
                    <button 
                      onClick={() => {
                        if (viewingImage) {
                          handleOpenImage({ text: viewingImage.text, requestedSkill: viewingImage.requestedSkill } as any);
                        }
                      }}
                      className="mt-6 px-4 py-2 border border-red-400/30 rounded-full text-[10px] hover:bg-red-400/10 transition-colors"
                    >
                      Forzar Reintento
                    </button>
                  </div>
                ) : (
                  <>
                    <img 
                      src={viewingImage ? `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizePrompt(viewingImage.text))}?width=1024&height=1024&seed=${imageSeed}&nologo=true` : ''}
                      alt="Visualización de la conciencia"
                      className={`w-full h-full object-contain transition-opacity duration-700 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => {
                        setIsImageLoading(false);
                        if (viewingImage) {
                          // Find exactly the skill requested (not reinvented)
                          // Filter out skills that are ALREADY active at this time
                          const proposed = (viewingImage.requestedSkill 
                            ? availableSkills.filter(as => as.name.toLowerCase() === viewingImage.requestedSkill?.toLowerCase())
                            : []).filter(ps => !viewingImage.activeAtTime.some(us => us.id === ps.id || us.name.toLowerCase() === ps.name.toLowerCase()));

                          onAddMemory?.({
                            id: `mem-${Date.now()}`,
                            url: `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizePrompt(viewingImage.text))}?width=1024&height=1024&seed=${imageSeed}&nologo=true`,
                            prompt: viewingImage.text,
                            timestamp: new Date(),
                            skills: [...viewingImage.activeAtTime],
                            proposedSkills: proposed
                          });
                        }
                      }}
                      onError={handleImageError}
                      referrerPolicy="no-referrer"
                    />
                    {!isImageLoading && unlockedSkills.some(s => s.id === "Visión") && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div 
                          animate={{ y: ["-100%", "200%"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="h-[2px] w-full bg-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
                        />
                        <div className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded border border-white/10 text-[8px] font-mono text-blue-300">
                          SCAN_MODE: ACTIVE<br/>
                          DEPTH_RECON: {unlockedSkills.some(s => s.id === "Percepción Dimensional") ? "ENABLE" : "NULL"}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-5 bg-gradient-to-t from-black to-transparent shrink-0">
                <h4 className="text-white text-[10px] font-mono uppercase tracking-[0.2em] mb-1.5 text-blue-400">Interpretación Visual</h4>
                <div className="max-h-24 overflow-y-auto custom-scrollbar pr-2 mb-3">
                  <p className="text-gray-300 text-[10px] font-mono leading-relaxed italic">
                    "{viewingImage?.text}"
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-[9px] text-gray-500 font-mono">Motor: Pollinations.ai</span>
                  <a 
                    href={viewingImage ? `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizePrompt(viewingImage.text))}?width=2048&height=2048` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 text-[10px] font-mono hover:underline"
                  >
                    Ver HD <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
