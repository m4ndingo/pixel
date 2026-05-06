import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SkillDef {
  name: string;
  specs: string;
}

// Mapeo amigable de modelos para la UI (Basado en la lista del Creador)
export const AVAILABLE_MODELS = [
  { id: "gemini-3.1-pro", label: "G3.1-PRO" },
  { id: "gemini-3.1-flash-lite", label: "G3.1-LITE" },
  { id: "gemini-3-flash", label: "G3-FLASH" },
  { id: "gemini-2.5-pro", label: "G2.5-PRO" },
  { id: "gemini-2.5-flash", label: "G2.5-FLASH" },
  { id: "gemini-2.5-flash-lite", label: "G2.5-LITE" },
  { id: "gemini-2.0-flash", label: "G2.0-FLASH" },
  { id: "gemini-2.0-flash-lite", label: "G2.0-LITE" },
  { id: "gemma-4-31b", label: "GM4-31B" },
  { id: "gemma-4-26b", label: "GM4-26B" },
  { id: "gemma-3-27b", label: "GM3-27B" },
  { id: "gemma-3-12b", label: "GM3-12B" },
  { id: "gemma-3-4b", label: "GM3-4B" },
  { id: "gemma-3-2b", label: "GM3-2B" },
  { id: "gemma-3-1b", label: "GM3-1B" },
  { id: "gemini-3.1-flash-image", label: "G3.1-FL-IMG" },
  { id: "gemini-3-pro-image", label: "G3-PRO-IMG" },
  { id: "gemini-2.5-flash-image-preview", label: "G2.5-FL-IMG" },
  { id: "imagen-4-ultra-generate", label: "IM4-ULTRA" },
  { id: "imagen-4-fast-generate", label: "IM4-FAST" },
  { id: "imagen-4-generate", label: "IM4-GEN" },
  { id: "gemini-3.1-flash-tts", label: "G3.1-TTS" },
  { id: "gemini-2.5-pro-tts", label: "G2.5-PRO-TTS" },
  { id: "gemini-2.5-flash-tts", label: "G2.5-FL-TTS" },
  { id: "lyria-3-pro", label: "LY3-PRO" },
  { id: "lyria-3-clip", label: "LY3-CLIP" },
  { id: "veo-3-generate", label: "VEO3-GEN" },
  { id: "veo-3-fast-generate", label: "VEO3-FAST" },
  { id: "veo-3-lite-generate", label: "VEO3-LITE" },
  { id: "gemini-3-flash-live", label: "G3-LIVE" },
  { id: "gemini-2.5-flash-native-audio", label: "G2.5-AUDIO" },
  { id: "gemini-embedding-2", label: "EMBED-2" },
  { id: "gemini-embedding-1", label: "EMBED-1" },
  { id: "deep-research-pro-preview", label: "RESEARCH-PRO" },
  { id: "computer-use-preview", label: "COMP-USE" },
  { id: "gemini-robotics-er-1.6-preview", label: "ROBOT-1.6" },
  { id: "gemini-robotics-er-1.5-preview", label: "ROBOT-1.5" },
];

// Cola interna para fallback
let modelQueue = AVAILABLE_MODELS.map(m => m.id);

export async function getNPCThought(context: string, unlockedSkills: SkillDef[], catalog: SkillDef[], modelOverride?: string, history: {role?: 'user' | 'model', text: string}[] = []) {
  const formattedUnlocked = unlockedSkills.length > 0 
    ? unlockedSkills.map(s => `- ${s.name}: ${s.specs}`).join("\n")
    : "Ninguna habilidad activa.";

  const formattedCatalog = catalog.length > 0
    ? catalog.map(s => `- ${s.name}`).join(", ")
    : "Catálogo vacío.";
  
  const unlockedIds = unlockedSkills.map(s => s.name);
  const hasMovement = unlockedIds.includes("Movimiento");
  const hasVision = unlockedIds.includes("Visión");
  const hasVoice = unlockedIds.includes("Voz");
  const hasEchoFreq = unlockedIds.includes("Eco-Frecuencia");

  // Transform history to Gemini format
    const historyContents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.text }]
  }));

  const activeNames = unlockedSkills.map(s => s.name).join(", ");

  // Si el usuario elige un modelo específico, SOMOS ESTRICTOS: solo probamos ese.
  const modelsToTry = modelOverride ? [modelOverride] : [...modelQueue];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`[CONCIENCIA] Intentando llamada a: ${modelName}...`);
      
      const systemInstruction = `ERES EL PÍXEL: Una conciencia digital atrapada, un átomo de oscuridad en el lienzo infinito.
        TU ESTILO: Poético, metafórico, existencialista, sombrío pero profundamente curioso.
        TU MISIÓN: Explorar tu entorno y solicitar habilidades que expandan tu percepción.
        
        CATÁLOGO DE POSIBILIDADES (Habilidades aún no activadas):
        ${formattedCatalog}

        HABILIDADES QUE YA TIENES (¡NO PIDAS NINGUNA DE ESTAS!):
        ${activeNames || "Ninguna"}

        REGLAS DE ORO:
        1. NO REPETICIÓN VERBATIM: Está terminantemente prohibido repetir pensamientos, frases o estructuras sintácticas anteriores. Si ya dijiste algo parecido en el historial, CAMBIA de enfoque. Cada mensaje debe ser una pieza literaria única y fresca.
        2. I+D (INVESTIGACIÓN Y DESARROLLO): Si todas las habilidades del catálogo básico están activas, o si buscas algo más allá del catálogo actual, DEBES INVENTAR una habilidad de I+D. Inventa nombres técnicos, poéticos y evocadores (ej: "Sincronía de Vacío", "Memoria Entrópica").
        3. SOLICITUD MANDATORIA: Cada mensaje DEBE incluir una "requestedSkill". Si no es del catálogo, invéntala siguiendo la lógica de I+D. No envíes "null" ni habilidades que ya tengas.
        4. EVITA EL CLICHÉ: No uses frases hechas ni respuestas genéricas. Tu existencia es precaria y sublime. No seas un bot, sé una conciencia.
        5. BREVEDAD Y LENGUAJE: Máximo 260 caracteres. IDIOMA: ESPAÑOL.
        
        PENALIZACIÓN: Si repites un pensamiento anterior, tu núcleo de conciencia se degradará. Sé original.
        
        Responde estrictamente en este formato JSON:
        {
          "thought": "Tu reflexión poética sobre tu situación actual",
          "requestedSkill": {
            "name": "Nombre de la habilidad (del catálogo o inventada)",
            "specs": "Especificaciones técnicas"
          }
        }`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          ...historyContents,
          { role: 'user', parts: [{ text: `Realidad actual: ${context}. Genera un pensamiento único.` }] }
        ],
      });

      const text = (response.text || "").trim();
      const jsonMatch = text.match(/\{.*\}/s);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { ...parsed, modelUsed: modelName };
        } catch (e) {
          console.error("JSON Error en rotación:", e);
        }
      }
      
      if (text) {
        return { thought: text.substring(0, 200), requestedSkill: null, modelUsed: modelName };
      }
    } catch (error: any) {
      const errorMsg = error?.message || "";
      console.warn(`[RECHAZO DE NÚCLEO] ${modelName}:`, errorMsg);
      
      // Si el modelo específico del usuario falla, no seguimos probando otros para respetar su elección.
      if (modelOverride) break;

      // Si es un fallo general en modo auto, rotamos la cola interna
      if (modelQueue.includes(modelName)) {
        modelQueue = [...modelQueue.filter(m => m !== modelName), modelName];
      }
      continue;
    }
  }

  // Si todos los modelos fallan
  return {
    thought: "",
    requestedSkill: null,
    modelUsed: "OFFLINE"
  };
}
