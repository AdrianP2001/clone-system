<<<<<<< HEAD
import { client } from '../src/api/client';

/**
 * Obtiene recomendaciones de negocio desde el backend de IA.
 * Esta función es segura y no expone la API key.
 * @param salesData - Datos de ventas para el análisis.
 * @returns Una cadena de texto con las recomendaciones.
 */
export const getBusinessInsights = async (salesData: any): Promise<string> => {
  try {
    // Llama al endpoint seguro del backend que actúa como proxy a Gemini.
    const response = await client.post<{ insights: string }>('/ai/insights', { salesData });
    return response.insights;
  } catch (error: any) {
    console.error("Error fetching AI insights:", error);
    if (error.response?.data?.error) {
      return `Error del servidor de IA: ${error.response.data.error}`;
    }
    return "No se pudo conectar con el servicio de análisis de IA.";
  }
};

// La función getSriChatResponse se elimina porque el chat ahora se maneja
// a través del componente AIAssistant y su propio endpoint de backend,
// y para evitar exponer la API Key en el frontend.
=======

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
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
