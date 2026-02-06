<<<<<<< HEAD
import React, { useState, useRef, useEffect } from 'react';
import { client } from '../src/api/client';
import { BusinessInfo } from '../types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AIAssistantProps {
  businessInfo: BusinessInfo;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ businessInfo }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'ai', 
      text: '¡Hola! Soy tu asistente contable inteligente. 🤖\nPuedo ayudarte con dudas sobre el SRI, impuestos o cómo usar el sistema. ¿En qué te ayudo hoy?', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    
    // Agregar mensaje usuario
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Obtener info del negocio para contexto (si está disponible en localStorage o estado global)
      const businessContext = {
        name: businessInfo.name,
        ruc: businessInfo.ruc,
        regime: businessInfo.regime,
      };

      const response = await client.post<{ reply: string }>('/ai/chat', {
        message: userText,
        context: businessContext
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.reply, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: 'Lo siento, tuve un problema de conexión. Por favor intenta de nuevo.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="bg-slate-900 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-2xl">✨</span>
        </div>
        <div>
          <h2 className="text-white font-black text-lg tracking-tight">Asistente Virtual</h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Powered by Gemini AI</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-600 border border-slate-100 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[10px] block mt-2 opacity-50 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
=======

import React, { useState, useRef, useEffect } from 'react';
import { getSriChatResponse } from '../services/geminiService';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente de Ecuafact Pro. ¿En qué puedo ayudarte con tus obligaciones del SRI hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const response = await getSriChatResponse(userMsg);
    setMessages(prev => [...prev, { role: 'bot', text: response }]);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">🤖</div>
          <div>
            <h3 className="font-bold">Asistente Tributario IA</h3>
            <p className="text-xs text-blue-100">Potenciado por Gemini 3</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          <span className="text-xs font-bold text-blue-50">Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-100' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              {m.text}
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
<<<<<<< HEAD
            <div className="bg-white p-4 rounded-3xl rounded-bl-none border border-slate-100 shadow-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre impuestos, facturas o el sistema..."
            className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl px-6 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center"
          >
            <span className="material-icons-outlined">send</span>
          </button>
        </form>
=======
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex space-x-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <input 
            type="text" 
            placeholder="Escribe tu duda sobre el IVA, retenciones, etc..."
            className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 uppercase tracking-widest font-bold">Respuesta generada por IA • Consultar con un contador oficial</p>
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default AIAssistant;
=======
export default AIAssistant;
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
