import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SupportWidget } from '../components/SupportWidget'

export const Route = createFileRoute('/irc')({
  component: IRCChat,
})

function IRCChat() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!userId) {
      navigate({ to: '/' })
    }
  }, [userId, navigate])

  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  const chatMessages = useQuery(api.chat.list, { channel: "irc" })
  const sendMessage = useMutation(api.chat.send)

  const [chatInput, setChatInput] = useState('')

  if (!me) return null

  const handleSendChat = async () => {
    if (!chatInput.trim()) return

    if (me.muteUntil && me.muteUntil > Date.now()) {
      alert(`You are muted until ${new Date(me.muteUntil).toLocaleString()}`)
      return
    }

    try {
      await sendMessage({
        userId: me._id,
        username: me.username,
        role: me.role,
        level: me.level,
        content: chatInput,
        channel: "irc"
      })
      setChatInput('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-900 bg-neutral-950 sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase">BQ</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-[90] w-64 border-r border-neutral-900 flex flex-col p-6 gap-8 bg-neutral-950/95 backdrop-blur-xl shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic">Better Social</span>
        </div>

        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            Dashboard
          </Link>
          <Link to="/order" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            New Order
          </Link>
          <Link to="/api" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
             API Access
          </Link>
          <Link to="/irc" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium border border-white/10">
             IRC Chat
          </Link>
          <button 
            onClick={() => {
              setIsSidebarOpen(false);
              localStorage.removeItem('bq_user_id');
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all mt-auto border border-transparent hover:border-red-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-tight uppercase tracking-widest">IRC CHANNEL</h1>
            <p className="text-neutral-500 font-mono text-xs">ENCRYPTED PEER-TO-PEER COMMUNICATION</p>
          </div>

          <div className="flex-1 bg-black border border-neutral-800 rounded-2xl p-6 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex-1 space-y-2 mb-4 overflow-y-auto pr-2 custom-scrollbar flex flex-col-reverse font-mono text-sm">
              {chatMessages?.map((msg: any) => (
                <div key={msg._id} className="flex gap-2 items-baseline">
                  <span className="text-neutral-600 shrink-0">[{new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`font-bold ${msg.role === 'owner' || msg.role === 'admin' ? 'text-red-500' : msg.role === 'moderator' ? 'text-green-500' : 'text-indigo-400'}`}>
                      &lt;{msg.username}&gt;
                    </span>
                    {msg.level !== undefined && (
                      <span className="text-[9px] bg-neutral-800 text-neutral-500 px-1 rounded border border-white/5 font-bold">L{msg.level}</span>
                    )}
                    {msg.role && msg.role !== 'user' && (
                      <span className={`text-[8px] px-1 rounded uppercase font-black tracking-tighter border ${msg.role === 'owner' || msg.role === 'admin' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-green-500 border-green-500/20 bg-green-500/5'}`}>
                        {msg.role}
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-300 break-words">{msg.content}</span>
                </div>
              ))}
              <div className="text-green-500/50 text-xs py-4 border-b border-neutral-900 mb-4">*** Connected to #better-quality-irc (v4.2-stable)</div>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-indigo-500 font-bold font-mono text-sm">$</span>
              <input 
                type="text" 
                value={chatInput}
                disabled={me.muteUntil && me.muteUntil > Date.now()}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={me.muteUntil && me.muteUntil > Date.now() ? "SYSTEM: YOU ARE MUTED" : "Type a message..."} 
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-12 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                onClick={handleSendChat}
                className="absolute right-3 top-2 p-1 text-neutral-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </main>
      {me && <SupportWidget userId={me._id} username={me.username} />}
    </div>
  )
}
