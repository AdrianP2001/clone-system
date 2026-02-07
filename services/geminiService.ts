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
