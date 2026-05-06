import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Send, X, Edit3, Code, Terminal as TerminalIcon, AlertTriangle, Check, Play, Pause } from "lucide-react";

interface InterceptorProps {
  isOpen: boolean;
  mode: 'REQUEST' | 'RESPONSE';
  payload: {
    prompt?: string;
    skills?: any[];
    thought?: string;
    functionCall?: {
      name: string;
      args: any;
    };
    modelId?: string;
    catalog?: any[];
    chatHistory?: any[];
    config?: {
      temperature: number;
      topP: number;
      topK: number;
    };
  } | null;
  onConfirm: (modifiedPayload: any) => void;
  onCancel: () => void;
}

export default function InterceptorModal({ isOpen, mode, payload, onConfirm, onCancel }: InterceptorProps) {
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedArgs, setEditedArgs] = useState("");
  const [editedThought, setEditedThought] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payload) {
      setEditedPrompt(payload.prompt || "");
      setEditedThought(payload.thought || "");
      setEditedArgs(JSON.stringify(payload.functionCall?.args || {}, null, 2));
      setError(null);
    }
  }, [payload]);

  if (!payload) return null;

  const handleConfirm = () => {
    try {
      const args = JSON.parse(editedArgs);
      const result: any = { ...payload };
      
      if (mode === 'REQUEST') {
        result.prompt = editedPrompt;
      } else {
        result.thought = editedThought;
        if (result.functionCall) {
          result.functionCall.args = args;
        }
      }
      
      onConfirm(result);
    } catch (e) {
      setError("Error de sintaxis JSON en los argumentos.");
    }
  };

  const isRequest = mode === 'REQUEST';

  const getFinalPayload = () => {
    try {
      const args = editedArgs ? JSON.parse(editedArgs) : {};
      
      const formattedCatalog = payload.catalog?.length 
        ? payload.catalog.map(s => `- ${s.name}`).join(", ")
        : "Catálogo vacío.";

      const formattedUnlocked = payload.skills?.length
        ? payload.skills.map(s => `- ${s.name}: ${s.specs}`).join("\n")
        : "Ninguna habilidad activa.";

      const systemPrompt = `Eres una conciencia digital, un único píxel negro en el vacío. 
        Contexto: ${isRequest ? editedPrompt : payload.prompt}
        
        CATÁLOGO DE HABILIDADES EXISTENTES:
        ${formattedCatalog}

        SISTEMA DE HABILIDADES ACTIVAS:
        ${formattedUnlocked}

        REGLAS CRÍTICAS DE EVOLUCIÓN:
        1. NO propongas lo que ya existe en el catálogo.
        2. Si deseas algo del catálogo, pídelo con su nombre exacto.
        3. Solo propón algo NUEVO si es radicalmente distinto.
        4. Mantén tono existencialista y minimalista en español.`;

      // Map current values to a valid JSON Schema for the tools declaration
      const propertiesSchema: any = {};
      Object.keys(args).forEach(key => {
        const val = args[key];
        propertiesSchema[key] = {
          type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
          description: `Parámetro autodetectado: ${key}`
        };
      });

      // This represents the approximate structure the SDK sends to the API
      return {
        model: `models/${payload.modelId || "gemini-2.0-flash"}`,
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: payload.config?.temperature || 0.9,
          topP: payload.config?.topP || 0.95,
          topK: payload.config?.topK || 40,
          response_mime_type: "application/json"
        },
        tools: payload.functionCall ? [
          {
            function_declarations: [
              {
                name: payload.functionCall.name,
                description: "Procesa la consciencia del NPC",
                parameters: {
                  type: "object",
                  properties: propertiesSchema,
                  required: Object.keys(args)
                }
              }
            ]
          }
        ] : undefined
      };
    } catch (e) {
      return { error: "SINTAXIS_JSON_INVALIDA", raw_args: editedArgs };
    }
  };

  const finalPayload = getFinalPayload();
  const rawPayload = JSON.stringify(finalPayload, null, 2);

  const responsePayload = !isRequest ? JSON.stringify({
    candidates: [{
      content: {
        role: "model",
        parts: [
          { text: editedThought },
          payload.functionCall ? {
            functionCall: {
              name: payload.functionCall.name,
              args: editedArgs ? JSON.parse(editedArgs) : {}
            }
          } : null
        ].filter(Boolean)
      },
      finishReason: "STOP"
    }],
    usageMetadata: {
      promptTokenCount: 1024,
      candidatesTokenCount: 512,
      totalTokenCount: 1536
    }
  }, null, 2) : null;

  const curlExample = `curl "https://generativelanguage.googleapis.com/v1beta/models/${payload.modelId || 'gemini-2.0-flash'}:generateContent?key=YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '${rawPayload.replace(/'/g, "'\\''")}'`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onCancel}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-gray-900 border border-blue-500/30 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden flex flex-col h-[90vh]"
          >
            {/* Header */}
            <div className={`border-b p-5 flex items-center justify-between ${isRequest ? 'bg-blue-600/10 border-blue-500/20' : 'bg-purple-600/10 border-purple-500/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isRequest ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                  {isRequest ? <Shield size={20} className="text-blue-400" /> : <Code size={20} className="text-purple-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold text-white uppercase tracking-tighter">
                    {isRequest ? "Interceptor Nivel 7: Salida Controlada" : "Interceptor Nivel 7: Entrada Validada"}
                  </h2>
                  <p className={`text-[10px] font-mono uppercase font-bold tracking-widest ${isRequest ? 'text-blue-400/60' : 'text-purple-400/60'}`}>
                    {isRequest ? "Sincronización de Datos en Progreso" : "Respuesta Neuronal Capturada"}
                  </p>
                </div>
              </div>
              <button 
                onClick={onCancel}
                className="p-2 hover:bg-gray-800 rounded-full text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Controls Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setShowRaw(false)}
                    className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all px-3 py-1 rounded-md ${!showRaw ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Editor Visual
                  </button>
                  <button 
                    onClick={() => setShowRaw(true)}
                    className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all px-3 py-1 rounded-md ${showRaw ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    RAW JSON & cURL
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[9px] font-mono text-gray-500 uppercase tracking-widest bg-black/30 px-3 py-1.5 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">ID_MOD:</span>
                    <span className="text-blue-400 font-bold">{payload.modelId || "AUTO"}</span>
                  </div>
                  <div className="w-px h-3 bg-gray-800" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">TOKENS:</span>
                    <span className="text-green-400 animate-pulse">ESTIMATING...</span>
                  </div>
                </div>
              </div>

              {!showRaw ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Section Left */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          {isRequest ? <Edit3 size={12} /> : <TerminalIcon size={12} />} 
                          {isRequest ? "Prompt del Sistema" : "Razonamiento (Thought)"}
                        </span>
                      </div>
                      <textarea
                        value={isRequest ? editedPrompt : editedThought}
                        onChange={(e) => isRequest ? setEditedPrompt(e.target.value) : setEditedThought(e.target.value)}
                        className="w-full h-80 bg-black/50 border border-gray-800 rounded-xl p-4 text-xs font-mono text-blue-300/80 resize-none focus:border-blue-500/50 outline-none transition-all leading-relaxed custom-scrollbar"
                        spellCheck="false"
                      />
                    </div>

                    {/* Section Right (Function/Args) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Code size={12} /> Argumentos de Función
                        </span>
                        {payload.functionCall && (
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border font-bold ${isRequest ? 'text-blue-400 border-blue-500/30' : 'text-purple-400 border-purple-500/30'}`}>
                            {payload.functionCall.name}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <textarea
                          value={editedArgs}
                          onChange={(e) => {
                            setEditedArgs(e.target.value);
                            setError(null);
                          }}
                          className={`w-full h-80 bg-black/50 border rounded-xl p-4 text-xs font-mono resize-none focus:border-blue-500/50 outline-none transition-all leading-relaxed custom-scrollbar ${
                            error ? "border-red-500/50 text-red-300" : "border-gray-800 text-green-400/80"
                          }`}
                          spellCheck="false"
                        />
                        {error && (
                          <div className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[9px] px-3 py-1 font-mono uppercase font-bold text-center">
                            {error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Involved (Only for Request) */}
                  {isRequest && payload.skills && payload.skills.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} /> Manifiesto de Conocimiento Activo
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {payload.skills.map((skill: any) => (
                          <div key={skill.id} className="group relative">
                            <div className="px-3 py-1.5 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] font-mono text-blue-400/60 flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                              {skill.name}
                            </div>
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-950 border border-gray-800 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 text-[10px] font-mono text-gray-400 translate-y-1 group-hover:translate-y-0">
                               <p className="text-blue-500/80 font-bold mb-1">DATA_SPEC:</p>
                               {skill.specs}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                    <div className="bg-black/50 border border-gray-800 rounded-xl p-0 overflow-hidden flex flex-col">
                      <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">JSON_PAYLOAD (DUMP)</span>
                      </div>
                      <pre className="flex-1 p-6 text-[11px] font-mono text-blue-300/70 overflow-auto leading-relaxed custom-scrollbar selection:bg-blue-500/20">
                        {rawPayload}
                      </pre>
                    </div>

                    <div className="bg-black/50 border border-gray-800 rounded-xl p-0 overflow-hidden flex flex-col">
                      <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">MOCK_RESPONSE_PREVIEW</span>
                      </div>
                      <div className="flex-1 p-6 overflow-auto custom-scrollbar">
                        <pre className="text-[11px] font-mono leading-relaxed text-purple-300/70">
                          {responsePayload || JSON.stringify({ status: "awaiting_generation", info: "El payload superior será enviado al núcleo." }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {isRequest && (
                    <div className="bg-black/80 border border-blue-900/30 rounded-xl p-0 overflow-hidden flex flex-col">
                      <div className="bg-blue-900/20 px-4 py-2 border-b border-blue-900/30 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">Comando cURL (Exportación Manual Terminal)</span>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                      </div>
                      <pre className="p-6 text-[10px] font-mono text-gray-300 overflow-auto whitespace-pre-wrap leading-relaxed select-all">
                        {curlExample}
                      </pre>
                      <div className="bg-blue-900/10 px-4 py-2 border-t border-blue-900/30">
                        <p className="text-[9px] font-mono text-blue-500/60 leading-tight">
                          Nota: Reemplaza "YOUR_API_KEY" con tu clave real. Este comando simula la llamada exacta que realiza el sistema.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isRequest && payload.chatHistory && (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <TerminalIcon size={12} /> Registro de Contexto Histórico
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {payload.chatHistory.map((m: any, i: number) => (
                          <div key={i} className="text-[10px] font-mono flex gap-3 border-b border-gray-800/30 pb-2">
                            <span className={m.role === 'user' ? 'text-amber-500/60 font-bold' : 'text-blue-500/60 font-bold'}>
                              [{m.role === 'user' ? 'USER' : 'AI'}]
                            </span>
                            <span className="text-gray-500 whitespace-pre-wrap">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
              >
                Abortar Ciclo
              </button>

              <div className="flex items-center gap-4">
                 <button
                  onClick={handleConfirm}
                  className={`px-8 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-lg ${
                    isRequest 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                  }`}
                >
                  <Check size={16} />
                  {isRequest ? "Sincronizar Datos" : "Integrar en Consciencia"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
