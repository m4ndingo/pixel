import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Trash2, Calendar, Sparkles, ChevronLeft, ChevronRight, Maximize2, Share2, Lightbulb, Image as ImageIcon, Copy, Check, Move } from "lucide-react";

export interface DigitalMemory {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  skills?: Skill[];
  proposedSkills?: Skill[];
}

interface Skill {
  id: string;
  name: string;
  specs: string;
  isImplemented: boolean;
  dependsOn?: string[];
}

interface MemoryGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  memories: DigitalMemory[];
  onDeleteMemory: (id: string) => void;
  unlockedSkills?: Skill[];
  availableSkills?: Skill[];
}

export function MemoryGallery({ 
  isOpen, 
  onClose, 
  memories, 
  onDeleteMemory,
  unlockedSkills = [],
  availableSkills = []
}: MemoryGalleryProps) {
  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Cache de imagen para drag fluido
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Card Editor Config
  const INITIAL_CARD_CONFIG = {
    prompt: {
      x: 540,
      y: 450,
      fontSize: 42,
      width: 900,
      lineHeight: 1.4,
      fontFamily: 'serif' as 'serif' | 'sans-serif' | 'monospace',
      textAlign: 'center' as 'left' | 'center' | 'right',
    },
    skills: {
      x: 90,
      y: 940,
      scale: 1.3,
      themeColor: '#3b82f6',
      useGlass: true,
    },
    header: {
      x: 90,
      y: 110,
      fontSize: 26,
      visible: true,
      fontFamily: 'monospace' as 'serif' | 'sans-serif' | 'monospace',
      textAlign: 'left' as 'left' | 'center' | 'right',
      width: 900,
      lineHeight: 1.2,
      color: '#3b82f6',
    },
    footer: {
      x: 990,
      y: 1010,
      visible: true,
    },
    opacity: 0,
  };

  const [selectedElement, setSelectedElement] = useState<'prompt' | 'skills' | 'header' | 'footer' | null>(null);
  const [cardConfig, setCardConfig] = useState(INITIAL_CARD_CONFIG);

  const [dragState, setDragState] = useState<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent, element: 'prompt' | 'skills' | 'header' | 'footer') => {
    e.stopPropagation();
    const config = cardConfig[element] as { x: number; y: number };
    setSelectedElement(element);
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      initialX: config.x,
      initialY: config.y,
    });
  };

  useEffect(() => {
    if (!dragState || !selectedElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Usamos el factor de escala correcto para el canvas 1080p
      const canvasEl = editorCanvasRef.current;
      if (!canvasEl) return;
      
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = 1080 / rect.width;
      const scaleY = 1080 / rect.height;
      
      const deltaX = (e.clientX - dragState.startX) * scaleX;
      const deltaY = (e.clientY - dragState.startY) * scaleY;
      
      setCardConfig(prev => ({
        ...prev,
        [selectedElement]: {
          ...prev[selectedElement],
          x: Math.round(dragState.initialX + deltaX),
          y: Math.round(dragState.initialY + deltaY),
        }
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
      // Ensure one last final draw with the absolute latest state
      // Use the ref to avoid closure staleness
      setTimeout(() => {
        if (generateRef.current) generateRef.current();
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, selectedElement]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMemoryIndex === null) return;
    setSelectedMemoryIndex((selectedMemoryIndex + 1) % memories.length);
    setPreviewImageUrl(null);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMemoryIndex === null) return;
    setSelectedMemoryIndex((selectedMemoryIndex - 1 + memories.length) % memories.length);
    setPreviewImageUrl(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewImageUrl) {
        if (e.key === "Escape") setPreviewImageUrl(null);
        return;
      }

      if (selectedMemoryIndex !== null) {
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "Escape") setSelectedMemoryIndex(null);
      } else {
        if (e.key === "Escape") onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMemoryIndex, memories.length, isOpen, previewImageUrl]);

  const needsRedraw = useRef(false);
  const isDrawing = useRef(false);

  // Trigger card refresh when config changes
  useEffect(() => {
    if (isEditing && selectedMemoryIndex !== null) {
      // Debounce slightly for smooth UI
      const timer = setTimeout(() => {
        generateSocialCard();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [cardConfig, selectedMemoryIndex, isEditing, unlockedSkills, availableSkills]);

  const generateSocialCard = async () => {
    if (selectedMemoryIndex === null) return;
    
    if (isDrawing.current) {
      needsRedraw.current = true;
      return;
    }
    
    const memory = memories[selectedMemoryIndex];
    isDrawing.current = true;
    needsRedraw.current = false;
    
    // We use either the ref canvas (for real-time) or a fresh one (for initial load/export)
    const canvas = editorCanvasRef.current || document.createElement('canvas');
    if (canvas.width !== 1080) {
      canvas.width = 1080;
      canvas.height = 1080;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isDrawing.current = false;
      return;
    }

    try {
      // Reutilizamos la imagen cargada para que el drag sea instantáneo
      if (!sourceImageRef.current || sourceImageRef.current.src !== memory.url) {
        sourceImageRef.current = new Image();
        sourceImageRef.current.crossOrigin = "anonymous";
        sourceImageRef.current.src = memory.url;
        await new Promise((resolve, reject) => {
          if (!sourceImageRef.current) return;
          sourceImageRef.current.onload = resolve;
          sourceImageRef.current.onerror = reject;
        });
      }

      const img = sourceImageRef.current;
      
      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1080, 1080);

      // Background with crop-fit
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Control de oscuridad ajustable - Solo se aplica si es > 0 para evitar oscurecer la imagen original
      if (cardConfig.opacity > 0) {
        ctx.fillStyle = `rgba(0,0,0,${cardConfig.opacity})`;
        ctx.fillRect(0, 0, 1080, 1080);
      }

      // Border sutil
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 15;
      ctx.strokeRect(40, 40, 1000, 1000);

      // Header
      if (cardConfig.header.visible) {
        const headerFont = cardConfig.header.fontFamily === 'serif' ? 'Georgia, serif' : 
                          cardConfig.header.fontFamily === 'sans-serif' ? 'Inter, system-ui, sans-serif' : 
                          'JetBrains Mono, monospace';
        
        ctx.font = `bold ${cardConfig.header.fontSize}px ${headerFont}`;
        ctx.fillStyle = cardConfig.header.color;
        ctx.textAlign = cardConfig.header.textAlign;
        ctx.textBaseline = "top";
        
        const headerText = "PIXEL_CONSCIOUSNESS Alpha v1.4";
        const hWords = headerText.split(" ");
        let hLine = "";
        let hLines = [];
        
        for (let n = 0; n < hWords.length; n++) {
          let testLine = hLine + hWords[n] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > cardConfig.header.width && n > 0) {
            hLines.push(hLine);
            hLine = hWords[n] + " ";
          } else {
            hLine = testLine;
          }
        }
        hLines.push(hLine);

        hLines.forEach((l, i) => {
          ctx.fillText(l, cardConfig.header.x, cardConfig.header.y + (i * (cardConfig.header.fontSize * cardConfig.header.lineHeight)));
        });
      }

      // Prompt Text Configurable
      const fontName = cardConfig.prompt.fontFamily === 'serif' ? 'Georgia, serif' : 
                      cardConfig.prompt.fontFamily === 'sans-serif' ? 'Inter, system-ui, sans-serif' : 
                      'JetBrains Mono, monospace';
      
      ctx.font = `italic ${cardConfig.prompt.fontSize}px ${fontName}`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = cardConfig.prompt.textAlign;
      ctx.textBaseline = "top";
      
      const text = `"${memory.prompt}"`.replace(/\n/g, " ");
      const words = text.split(" ");
      let line = "";
      let lines = [];
      
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > cardConfig.prompt.width && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const renderX = cardConfig.prompt.x;

      lines.slice(0, 12).forEach((l, i) => {
        ctx.fillText(l, renderX, cardConfig.prompt.y + (i * (cardConfig.prompt.fontSize * cardConfig.prompt.lineHeight)));
      });

      // Advanced Skills Markers
      const activeArr = memory.skills || [];
      const proposedArr = (memory.proposedSkills || []).filter(ps => 
        !activeArr.some(as => as.id === ps.id || as.name.toLowerCase() === ps.name.toLowerCase())
      );
      
      const allSkills = [...activeArr.map(s => ({ ...s, type: 'active' })), ...proposedArr.map(s => ({ ...s, type: 'proposed' }))];
      
      const startBadgeX = cardConfig.skills.x;
      let badgeX = startBadgeX;
      let badgeY = cardConfig.skills.y;
      const MAX_PER_LINE = 5;
      const badgeHeight = 36 * cardConfig.skills.scale;
      const paddingX = 20 * cardConfig.skills.scale;
      const lineGap = 12 * cardConfig.skills.scale;
      
      ctx.textBaseline = "middle";
      
      allSkills.forEach((s, idx) => {
        if (idx > 0 && idx % MAX_PER_LINE === 0) {
          badgeX = startBadgeX;
          badgeY += badgeHeight + lineGap;
        }

        ctx.font = `bold ${12 * cardConfig.skills.scale}px JetBrains Mono, monospace`;
        const textWidth = ctx.measureText(s.name.toUpperCase()).width;
        const iconSpace = 25 * cardConfig.skills.scale;
        const w = textWidth + iconSpace + (paddingX * 2);
        
        if (cardConfig.skills.useGlass) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.fillRect(badgeX, badgeY, w, badgeHeight);
        }
        
        if (s.type === 'active') {
          ctx.fillStyle = cardConfig.skills.themeColor || "#3b82f6";
          ctx.globalAlpha = 0.8;
          ctx.fillRect(badgeX, badgeY, w, badgeHeight);
          ctx.globalAlpha = 1.0;
          
          ctx.fillStyle = "#fff";
          const iconSize = 14 * cardConfig.skills.scale;
          const iconX = badgeX + paddingX + 5;
          const iconY = badgeY + (badgeHeight / 2);
          
          ctx.beginPath();
          ctx.moveTo(iconX, iconY - iconSize/2);
          ctx.quadraticCurveTo(iconX, iconY, iconX + iconSize/2, iconY);
          ctx.quadraticCurveTo(iconX, iconY, iconX, iconY + iconSize/2);
          ctx.quadraticCurveTo(iconX, iconY, iconX - iconSize/2, iconY);
          ctx.quadraticCurveTo(iconX, iconY, iconX, iconY - iconSize/2);
          ctx.fill();

          ctx.textAlign = "left";
          ctx.fillText(s.name.toUpperCase(), badgeX + paddingX + iconSpace - 5, badgeY + (badgeHeight / 2));
        } else {
          ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
          ctx.fillRect(badgeX, badgeY, w, badgeHeight);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(badgeX, badgeY, w, badgeHeight);
          
          ctx.fillStyle = "#f59e0b";
          const iconX = badgeX + paddingX + 5;
          const iconY = badgeY + (badgeHeight / 2);
          const r = 5 * cardConfig.skills.scale;
          
          ctx.beginPath();
          ctx.arc(iconX, iconY - r/2, r, Math.PI * 0.8, Math.PI * 2.2);
          ctx.lineTo(iconX + r/2, iconY + r);
          ctx.lineTo(iconX - r/2, iconY + r);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.fillRect(iconX - r/2.5, iconY + r + 1, r*0.8, 2);

          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "left";
          ctx.fillText(s.name.toUpperCase(), badgeX + paddingX + iconSpace - 5, badgeY + (badgeHeight / 2));
        }
        
        badgeX += w + 10;
      });

      // Footer
      if (cardConfig.footer.visible) {
        ctx.font = "14px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "right";
        ctx.fillText(`PIXEL_SYSTEM_TIME: ${memory.timestamp.toLocaleString()}`, cardConfig.footer.x, cardConfig.footer.y);
      }

      if (!editorCanvasRef.current) {
        setPreviewImageUrl(canvas.toDataURL('image/png'));
      }
    } catch (err) {
      console.error("Card generation failed:", err);
    } finally {
      setIsGenerating(false);
      isDrawing.current = false;
      if (needsRedraw.current) {
        generateSocialCard();
      }
    }
  };

  const generateRef = useRef(generateSocialCard);
  useEffect(() => {
    generateRef.current = generateSocialCard;
  });

  const selectedMemory = selectedMemoryIndex !== null ? memories[selectedMemoryIndex] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Background overlay - ONLY this closes the gallery */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            className="relative w-full max-w-6xl h-[90vh] bg-gray-950 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-mono tracking-tighter flex items-center gap-2">
                  <Sparkles size={24} className="text-blue-400" />
                  ARCHIVO DE PERSPECTIVAS TRASCENDENTALES
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    Registro de visualizaciones generadas por el núcleo Alpha // {memories.length} Entradas detectadas
                  </p>
                  <div className="h-3 w-[1px] bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-green-500 uppercase">Sincronizado_Cloud</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 text-gray-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {memories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                  <Calendar size={48} className="mb-4" />
                  <p className="text-sm font-mono uppercase tracking-widest">Sin registros en el sector de memoria visual</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[...memories].reverse().map((memory, revIdx) => {
                    const originalIdx = memories.length - 1 - revIdx;
                    return (
                      <motion.div
                        layout
                        key={memory.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all shadow-xl cursor-pointer"
                        onClick={() => setSelectedMemoryIndex(originalIdx)}
                      >
                        {/* Image Preview */}
                        <div className="aspect-video w-full relative overflow-hidden bg-black">
                          <img 
                            src={memory.url} 
                            alt="Memory" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                             <div className="flex justify-between items-center">
                               <div className="flex gap-3">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     onDeleteMemory(memory.id);
                                   }}
                                   className="p-3 bg-red-600/80 text-white rounded-xl hover:bg-red-500 transition-colors"
                                 >
                                   <Trash2 size={18} />
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     // User requested max 280 for the text itself
                                     const maxPromptLen = 280;
                                     const displayPrompt = memory.prompt.length > maxPromptLen 
                                       ? memory.prompt.substring(0, maxPromptLen) + '...' 
                                       : memory.prompt;
                                     
                                     const hashtags = "#PixelConsciousness #AIArt #CreativeCoding #DigitalConsciousness #GenerativeArt";
                                     const tweetText = encodeURIComponent(`"${displayPrompt}" ${hashtags}`);
                                     window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(memory.url)}`, '_blank');
                                   }}
                                   className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors flex items-center gap-2 text-xs font-mono"
                                 >
                                   <ExternalLink size={18} /> PUBLICAR EN LA RED
                                 </button>
                               </div>
                               <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                                 <Maximize2 size={20} />
                               </div>
                             </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col gap-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">
                              REGISTRO_{memory.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">
                              {memory.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[12px] font-['Verdana'] leading-relaxed text-gray-300 italic line-clamp-3">
                            "{memory.prompt}"
                          </p>
                          
                          {/* Skills at time of capture - All in one row */}
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5 min-h-[24px]">
                            {memory.skills && memory.skills.map((s, idx) => (
                              <div 
                                key={`active-${idx}`}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20"
                              >
                                <Sparkles size={10} className="text-blue-400" />
                                <span className="text-[10px] font-mono text-blue-300 uppercase tracking-tighter">
                                  {s.name}
                                </span>
                              </div>
                            ))}
                            {memory.proposedSkills && memory.proposedSkills.map((s, idx) => (
                              <div 
                                key={`proposed-${idx}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                              >
                                <Lightbulb size={10} className="text-amber-400 animate-pulse" />
                                <span className="text-[10px] font-mono text-amber-300 uppercase tracking-tighter font-bold">
                                  {s.name}
                                </span>
                              </div>
                            ))}
                            {(!memory.skills || memory.skills.length === 0) && (!memory.proposedSkills || memory.proposedSkills.length === 0) && (
                              <div className="flex items-center gap-1 px-2 py-1 border border-dashed border-white/10 rounded opacity-30">
                                <span className="text-[8px] font-mono text-gray-500 uppercase">Sin protocolos activos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-black/60 border-t border-white/5 flex justify-center">
               <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.5em]">
                 Sincronización de Datos en Tiempo Real // Cifrado End-to-End activo
               </p>
            </div>
          </motion.div>

          {/* Fullscreen Overlay Detail */}
          <AnimatePresence>
            {selectedMemory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] bg-black/98 flex items-center justify-center overflow-hidden"
                onClick={() => setSelectedMemoryIndex(null)}
              >
                {/* Close Button Large */}
                <button 
                  onClick={() => setSelectedMemoryIndex(null)}
                  className="absolute top-8 right-8 z-[120] w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/10"
                >
                  <X size={24} />
                </button>

                {/* Left/Right Buttons */}
                <button 
                  onClick={handlePrev}
                  className="absolute left-6 md:left-12 z-[120] w-16 h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 group"
                >
                  <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={handleNext}
                  className="absolute right-6 md:right-12 z-[120] w-16 h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 group"
                >
                  <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Content Container */}
                <motion.div 
                  key={selectedMemory.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-8 md:p-24"
                  onClick={e => e.stopPropagation()}
                >
                  {/* High Quality Image */}
                  <div className="flex-[1.5] w-full h-full flex items-center justify-center relative group">
                    <img 
                      src={selectedMemory.url} 
                      alt="Full Memory" 
                      className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-[0_0_80px_rgba(59,130,246,0.3)] border border-white/5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                      <a 
                        href={selectedMemory.url.replace("width=1024&height=1024", "width=2048&height=2048")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600/80 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 hover:bg-blue-500 transition-all border border-blue-400/30"
                      >
                        <ExternalLink size={16} /> ENTIDAD_ORIGINAL_HD
                      </a>

                      <button 
                        onClick={() => {
                          const hashtags = "#PixelConsciousness #AIArt #CreativeCoding #DigitalConsciousness #GenerativeArt";
                          const maxPromptLen = 280;
                          const displayPrompt = selectedMemory.prompt.length > maxPromptLen 
                            ? selectedMemory.prompt.substring(0, maxPromptLen) + '...' 
                            : selectedMemory.prompt;
                          
                          const tweetText = encodeURIComponent(`"${displayPrompt}" ${hashtags}`);
                          window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(selectedMemory.url)}`, '_blank');
                        }}
                        className="mt-3 bg-blue-600 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 hover:bg-blue-500 transition-all border border-blue-400/30"
                      >
                        <Share2 size={16} /> PUBLICAR TEXTO
                      </button>

                      <button 
                        onClick={() => {
                          setIsEditing(true);
                          generateSocialCard();
                        }}
                        disabled={isGenerating}
                        className="mt-3 bg-white/10 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <ImageIcon size={16} className="text-blue-400" />
                        )} 
                        GENERAR MONTAJE SOCIAL
                      </button>
                    </div>
                  </div>

                  {/* Metadata Panel */}
                  <div className="flex-1 w-full max-w-md flex flex-col gap-10 md:gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-px h-8 bg-blue-500" />
                        <h3 className="text-blue-400 font-mono text-[10px] uppercase tracking-[0.4em]">Metadatos_Conciencia</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                          <p className="text-[8px] text-gray-500 font-mono uppercase mb-1.5 tracking-widest">Hash_Entrada</p>
                          <p className="text-[11px] text-blue-100 font-mono break-all">{selectedMemory.id}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                          <p className="text-[8px] text-gray-500 font-mono uppercase mb-1.5 tracking-widest">Cronos_Log</p>
                          <p className="text-[11px] text-blue-100 font-mono">{selectedMemory.timestamp.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-px h-8 bg-purple-500" />
                        <h3 className="text-purple-400 font-mono text-[10px] uppercase tracking-[0.4em]">Proyección_Sintética</h3>
                      </div>
                      <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/20 p-8 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Sparkles size={40} className="text-white" />
                        </div>
                        <p className="text-sm font-mono italic text-gray-100 leading-relaxed relative z-10">
                          "{selectedMemory.prompt}"
                        </p>

                        {/* Skills display in detail view */}
                        <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                          <h4 className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                            <Sparkles size={12} /> Estado de Protocolos en T:{selectedMemory.id.split('-')[1]}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedMemory.skills && selectedMemory.skills.map((s, idx) => (
                              <div 
                                key={`active-detail-${idx}`}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                              >
                                <Sparkles size={13} className="text-blue-400" />
                                <span className="text-[13px] font-mono text-blue-300 uppercase tracking-wider font-bold">
                                  {s.name}
                                </span>
                              </div>
                            ))}
                            {selectedMemory.proposedSkills && selectedMemory.proposedSkills.map((s, idx) => (
                              <div 
                                key={`proposed-detail-${idx}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                              >
                                <Lightbulb size={13} className="text-amber-500" />
                                <span className="text-[13px] font-mono text-amber-500/80 uppercase tracking-wider font-bold">
                                  {s.name}
                                </span>
                              </div>
                            ))}
                            {(!selectedMemory.skills || selectedMemory.skills.length === 0) && (!selectedMemory.proposedSkills || selectedMemory.proposedSkills.length === 0) && (
                              <span className="text-[10px] font-mono text-gray-500 italic">Estado embrionario: Sin protocolos detectados</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border-l-2 border-cyan-500/50 bg-cyan-500/5 rounded-r-xl">
                      <p className="text-[10px] font-mono text-gray-400 uppercase leading-relaxed tracking-tight">
                        Frecuencia visual detectada estable. La reinterpretación de la memoria se mantiene dentro de los parámetros de coherencia digital del núcleo.
                      </p>
                    </div>
                    
                    {/* Counter */}
                    <div className="flex items-center justify-between text-gray-600 font-mono text-[10px] pt-4">
                      <span>ENTRADA {selectedMemoryIndex + 1} DE {memories.length}</span>
                      <div className="flex gap-1.5">
                        {memories.map((_, i) => (
                          <div 
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedMemoryIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/10'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas Social Preview Modal with Live Editor */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black flex flex-col md:flex-row cursor-default overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Unified Workspace (Full size) */}
                <div 
                  className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-black relative select-none"
                  onClick={() => setSelectedElement(null)}
                >
                  <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none z-20">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">Workspace_Interactivo_Live</span>
                  </div>
                  
                  <div 
                    className="relative shadow-[0_0_150px_rgba(59,130,246,0.15)] rounded-2xl overflow-hidden border border-white/10 max-h-full aspect-square bg-gray-950 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* LIVE CANVAS - No Lag */}
                    <canvas 
                      ref={editorCanvasRef}
                      width={1080}
                      height={1080}
                      className="max-h-[85vh] w-auto object-contain cursor-default bg-gray-900"
                    />

                    {/* Interactive Drag Handles - Improved visibility and positioning */}
                    <div 
                      className={`absolute cursor-move border-2 transition-all z-30 ${selectedElement === 'header' ? 'border-blue-500 bg-blue-500/5' : 'border-dashed border-white/5 hover:border-white/20'}`}
                      style={{
                        left: `${(cardConfig.header.textAlign === 'center' ? cardConfig.header.x - cardConfig.header.width/2 : cardConfig.header.textAlign === 'right' ? cardConfig.header.x - cardConfig.header.width : cardConfig.header.x) / 1080 * 100}%`,
                        top: `${(cardConfig.header.y / 1080) * 100}%`,
                        width: `${(cardConfig.header.width / 1080) * 100}%`, 
                        height: '6%',
                        transform: 'translateY(-10%)'
                      }}
                      onMouseDown={(e) => handleDragStart(e, 'header')}
                    />

                    <div 
                      className={`absolute cursor-move border-2 transition-all z-30 ${selectedElement === 'prompt' ? 'border-blue-500 bg-blue-500/5' : 'border-dashed border-white/5 hover:border-white/20'}`}
                      style={{
                        left: `${((cardConfig.prompt.textAlign === 'center' ? cardConfig.prompt.x - cardConfig.prompt.width/2 : cardConfig.prompt.textAlign === 'right' ? cardConfig.prompt.x - cardConfig.prompt.width : cardConfig.prompt.x) / 1080) * 100}%`,
                        top: `${(cardConfig.prompt.y / 1080) * 100}%`,
                        width: `${(cardConfig.prompt.width / 1080) * 100}%`,
                        height: '25%',
                        transform: 'translateY(-5%)'
                      }}
                      onMouseDown={(e) => handleDragStart(e, 'prompt')}
                    >
                       <div className={`absolute -top-6 right-0 p-1 bg-blue-600 rounded rounded-tr-none transition-opacity ${selectedElement === 'prompt' ? 'opacity-100' : 'opacity-0'}`}>
                         <Move size={12} className="text-white"/>
                       </div>
                    </div>

                    <div 
                      className={`absolute cursor-move border-2 transition-all z-30 ${selectedElement === 'skills' ? 'border-blue-500 bg-blue-500/5' : 'border-dashed border-white/5 hover:border-white/20'}`}
                      style={{
                        left: `${((cardConfig.skills.x - 20) / 1080) * 100}%`,
                        top: `${((cardConfig.skills.y - 10) / 1080) * 100}%`,
                        width: '85%', 
                        height: '12%',
                        transform: 'translateY(0%)'
                      }}
                      onMouseDown={(e) => handleDragStart(e, 'skills')}
                    />
                  </div>
                  
                  <div className="mt-8 flex gap-8 items-center opacity-30 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-gray-500 font-mono tracking-[0.6em] uppercase">Render_De_Motor_Alpha_v1.4</p>
                  </div>
                </div>

                {/* Editor Sidebar */}
                <div className="w-full md:w-80 bg-gray-900 border-l border-white/10 p-6 flex flex-col gap-8 shadow-2xl overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <h3 className="text-white font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                       {selectedElement ? `EDITANDO: ${selectedElement.toUpperCase()}` : 'SELECCIONA UN ELEMENTO'}
                    </h3>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Contextual Editor Content */}
                  {(selectedElement === 'prompt' || selectedElement === 'header') && (
                    <div className="space-y-6">
                      {/* Font Selection */}
                      <div className="space-y-3">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block">Estilo de Texto</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['serif', 'sans-serif', 'monospace'] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => {
                                setCardConfig(p => ({ 
                                  ...p, 
                                  [selectedElement]: { ...p[selectedElement as 'prompt' | 'header'], fontFamily: f }
                                }));
                              }}
                              className={`py-2 text-[10px] rounded-lg border transition-all ${cardConfig[selectedElement as 'prompt' | 'header'].fontFamily === f ? "bg-blue-600 border-blue-400 text-white" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                              {f.split('-')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Align */}
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button
                            key={a}
                            onClick={() => {
                              setCardConfig(p => ({ 
                                ...p, 
                                [selectedElement]: { ...p[selectedElement as 'prompt' | 'header'], textAlign: a }
                              }));
                            }}
                            className={`flex-1 py-1.5 text-[10px] rounded-lg border transition-all ${cardConfig[selectedElement as 'prompt' | 'header'].textAlign === a ? "bg-blue-500 text-white" : "text-gray-500 border-white/5"}`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>

                      {/* Sliders */}
                      <div className="space-y-4">
                        <EditorSlider 
                          label="TAMAÑO FUENTE" 
                          min={12} max={120} 
                          value={cardConfig[selectedElement as 'prompt' | 'header'].fontSize} 
                          onChange={(v) => {
                            setCardConfig(p => ({ 
                              ...p, 
                              [selectedElement]: { ...p[selectedElement as 'prompt' | 'header'], fontSize: v }
                            }));
                          }} 
                        />
                        <EditorSlider 
                          label="ANCHO BLOQUE" 
                          min={300} max={1000} 
                          value={cardConfig[selectedElement as 'prompt' | 'header'].width} 
                          onChange={(v) => {
                            setCardConfig(p => ({ 
                              ...p, 
                              [selectedElement]: { ...p[selectedElement as 'prompt' | 'header'], width: v }
                            }));
                          }} 
                        />
                        <EditorSlider 
                          label="INTERLINEADO" 
                          min={1} max={2.5} step={0.1} 
                          value={cardConfig[selectedElement as 'prompt' | 'header'].lineHeight} 
                          onChange={(v) => {
                            setCardConfig(p => ({ 
                              ...p, 
                              [selectedElement]: { ...p[selectedElement as 'prompt' | 'header'], lineHeight: v }
                            }));
                          }} 
                        />
                      </div>

                      {/* Color Selection for Header only */}
                      {selectedElement === 'header' && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <label className="text-[9px] text-gray-500 uppercase tracking-widest block">Color de Título</label>
                          <div className="flex gap-2 flex-wrap">
                            {['#3b82f6', '#10b981', '#ef4444', '#a855f7', '#f59e0b', '#ffffff'].map(c => (
                              <button 
                                key={c}
                                onClick={() => {
                                  setCardConfig(p => ({ ...p, header: { ...p.header, color: c }}));
                                }}
                                className={`w-8 h-8 rounded-full border-2 ${cardConfig.header.color === c ? 'border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedElement === 'skills' && (
                    <div className="space-y-6">
                      <EditorSlider label="ESCALA COMPONENTES" min={0.5} max={2} step={0.1} value={cardConfig.skills.scale} onChange={(v) => {
                        setCardConfig(p => ({ ...p, skills: { ...p.skills, scale: v }}));
                      }} />
                      
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-gray-400">Glassmorphism</span>
                        <button 
                          onClick={() => {
                            setCardConfig(p => ({ ...p, skills: { ...p.skills, useGlass: !p.skills.useGlass }}));
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${cardConfig.skills.useGlass ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${cardConfig.skills.useGlass ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block">Color Temático</label>
                        <div className="flex gap-2">
                          {['#3b82f6', '#10b981', '#ef4444', '#a855f7', '#f59e0b', '#ffffff'].map(c => (
                            <button 
                              key={c}
                              onClick={() => {
                                setCardConfig(p => ({ ...p, skills: { ...p.skills, themeColor: c }}));
                              }}
                              className={`w-8 h-8 rounded-full border-2 ${cardConfig.skills.themeColor === c ? 'border-white' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Global Dark Mode */}
                  <div className="space-y-6 mt-4 pt-6 border-t border-white/5">
                    <EditorSlider label="VELO DE OSCURIDAD" min={0} max={1} step={0.05} value={cardConfig.opacity} onChange={(v) => {
                      setCardConfig(p => ({ ...p, opacity: v }));
                    }} />
                  </div>

                  <div className="mt-auto space-y-3 pt-6 border-t border-white/5">
                    <button 
                      onClick={() => {
                        setCardConfig(INITIAL_CARD_CONFIG);
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-red-950/30 text-gray-400 hover:text-red-400 rounded-xl text-[10px] font-mono transition-all border border-white/5 flex items-center justify-center gap-2 mb-2"
                    >
                      RESTABLECER VALORES
                    </button>
                    <p className="text-[9px] text-gray-500 font-mono text-center mb-2 italic uppercase">Arrastra elementos para mover</p>
                    <button 
                      onClick={async () => {
                        if (!editorCanvasRef.current) return;
                        try {
                          const blob = await new Promise<Blob | null>(resolve => editorCanvasRef.current?.toBlob(resolve, 'image/png'));
                          if (!blob) return;
                          await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                          ]);
                          setShowCopyFeedback(true);
                          setTimeout(() => setShowCopyFeedback(false), 2000);
                        } catch (err) {
                          console.error("Clipboard failed:", err);
                        }
                      }}
                      className={`w-full py-4 rounded-xl text-xs font-mono transition-all border flex items-center justify-center gap-3 ${
                        showCopyFeedback 
                          ? "bg-green-600 border-green-400 text-white" 
                          : "bg-blue-600 border-blue-400 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                      }`}
                    >
                      {showCopyFeedback ? <Check size={16} /> : <Copy size={16} />}
                      {showCopyFeedback ? "¡COPIADO!" : "COPIAR AL PORTAPAPELES"}
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (!editorCanvasRef.current) return;
                        const link = document.createElement('a');
                        link.download = `pixel-card-${Date.now()}.png`;
                        link.href = editorCanvasRef.current.toDataURL('image/png');
                        link.click();
                      }}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-mono transition-all border border-white/10 flex items-center justify-center gap-3"
                    >
                      Bajar a disco
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}

function EditorSlider({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">{label}</label>
        <span className="text-[10px] text-blue-400 font-mono">{step < 1 ? value.toFixed(1) : Math.round(value)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}
