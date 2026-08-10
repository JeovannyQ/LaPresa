import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isVIP?: boolean;
}

interface LiveChatProps {
  apiBase?: string;
}

const getApiBase = (customApiBase?: string) => {
  if (customApiBase && customApiBase !== 'http://localhost:3001') return customApiBase;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''; // Same origin — relative URLs on production (cPanel)
  }
  return 'http://localhost:3001';
};

export const LiveChat: React.FC<LiveChatProps> = ({ apiBase: customApiBase }) => {
  const apiBase = getApiBase(customApiBase);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('lapresa_chat_user') || '');
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(!localStorage.getItem('lapresa_chat_user'));
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${apiBase}/api/chat/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [apiBase]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('lapresa_chat_user', userName.trim());
      setIsEditingName(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userName.trim()) return;

    const text = inputMsg.trim();
    setInputMsg('');

    const tempMsg: ChatMessage = {
      id: Date.now().toString(),
      user: userName.trim(),
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(`${apiBase}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userName.trim(), text }),
      });
      fetchMessages();
    } catch {
      // keep optimistic
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col h-[460px] shadow-xl overflow-hidden text-zinc-100">
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-red-600" />
            Comentarios en Vivo
          </h4>
        </div>
        <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/50 px-2 py-0.5 rounded font-mono uppercase font-bold">
          {messages.length} mensajes
        </span>
      </div>

      <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800/60 text-xs flex items-center justify-between gap-2">
        {isEditingName ? (
          <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full">
            <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Tu apodo o nombre..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-zinc-950 text-white text-xs px-2.5 py-1 rounded border border-zinc-700 w-full focus:outline-none focus:border-red-600"
              maxLength={25}
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded shrink-0 transition-colors"
            >
              Guardar
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-[11px] text-zinc-400">Comentando como:</span>
              <span className="font-bold text-red-400 font-mono truncate">{userName}</span>
            </div>
            <button
              onClick={() => setIsEditingName(true)}
              className="text-[10px] text-zinc-400 hover:text-white underline shrink-0"
            >
              Cambiar
            </button>
          </>
        )}
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center px-4">
            <MessageSquare className="w-8 h-8 text-zinc-700 mb-2 opacity-50" />
            <p className="text-xs italic font-editorial">Sé el primero en comentar en esta pelea en vivo.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group bg-zinc-950/60 p-2.5 rounded border border-zinc-800/50 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold font-mono text-[11px] ${msg.isVIP ? 'text-amber-400 flex items-center gap-1' : 'text-zinc-200'}`}>
                    {msg.isVIP && <Sparkles className="w-3 h-3 text-amber-400" />}
                    {msg.user}
                  </span>
                  {msg.isVIP && (
                    <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded font-mono border border-amber-800/40">VIP</span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[12px] break-words">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="bg-zinc-950 p-3 border-t border-zinc-800 flex items-center gap-2">
        <input
          type="text"
          placeholder={isEditingName ? 'Ingresa tu nombre arriba primero...' : 'Escribe tu comentario en vivo...'}
          value={inputMsg}
          disabled={isEditingName}
          onChange={(e) => setInputMsg(e.target.value)}
          className="flex-1 bg-zinc-900 text-white text-xs px-3 py-2.5 rounded border border-zinc-800 focus:outline-none focus:border-red-600 placeholder:text-zinc-500 disabled:opacity-50"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={isEditingName || !inputMsg.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2.5 rounded transition-all shadow shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
