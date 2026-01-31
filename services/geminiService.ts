
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCLcj4vfVX1ciZimRjNdjdKdAl-kk6oh6o');

export const getBusinessInsights = async (salesData: any) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analiza los siguientes datos de ventas mensuales para un negocio en Ecuador y proporciona 3 recomendaciones estratégicas breves: ${JSON.stringify(salesData)}
    
Contexto: Eres un asesor financiero experto en el mercado ecuatoriano y normativas del SRI. Habla en español profesional.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return "⚠️ Has alcanzado el límite de uso de la API. Espera unos minutos o verifica tu cuota en Google AI Studio.";
    }
    return "No se pudo generar el análisis en este momento.";
  }
};

export const getSriChatResponse = async (query: string) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: "Eres el asistente inteligente de Ecuafact Pro. Ayudas a los usuarios con dudas sobre facturación electrónica en Ecuador (SRI), retenciones, IVA 15%, y requisitos legales. Responde de forma clara y concisa."
    });
    
    const result = await model.generateContent(query);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return "⚠️ He alcanzado mi límite de conversaciones por ahora. Intenta de nuevo en unos minutos.";
    }
    return "Disculpa, tengo problemas de conexión con mi cerebro artificial.";
  }
};
