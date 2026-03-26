'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  message_type: string;
  created_at: string;
}

interface DealMessagesProps {
  dealId: string;
  currentUserId: string;
  counterpartyName: string;
}

export function DealMessages({ dealId, currentUserId, counterpartyName }: DealMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [dealId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    const res = await fetch(`/api/deals/${dealId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
    setLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const res = await fetch(`/api/deals/${dealId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newMessage }),
    });

    if (res.ok) {
      setNewMessage('');
      await fetchMessages();
    }
    setSending(false);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffMs < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-xs text-gray-500 text-center py-8">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">No messages yet. Start the conversation.</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId;
          const isSystem = msg.message_type === 'system';
          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{msg.message}</span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMe ? 'bg-amber-500/10 border-amber-500/20' : 'bg-gray-800 border-gray-700'} border rounded-xl px-3 py-2`}>
                <p className="text-[10px] text-gray-500 mb-0.5">{isMe ? 'You' : counterpartyName}</p>
                <p className="text-sm text-white whitespace-pre-wrap">{msg.message}</p>
                <p className="text-[10px] text-gray-600 mt-1 text-right">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-800 p-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
