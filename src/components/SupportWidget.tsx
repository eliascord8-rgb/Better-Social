import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function SupportWidget({ userId, username }: { userId?: Id<'users'> | null, username?: string | null }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [isStarting, setIsStarting] = React.useState(false)
  const [threadId, setThreadId] = React.useState<Id<'supportThreads'> | null>(null)
  
  const getOrCreateThread = useMutation(api.support.getOrCreateThread)
  const sendMessage = useMutation(api.support.sendMessage)
  const messages = useQuery(api.support.getMessages, threadId ? { threadId } : "skip")
  
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Load existing guest thread if any (from local storage)
  React.useEffect(() => {
    if (!userId && !threadId) {
      const storedThreadId = localStorage.getItem('bq_guest_thread_id')
      if (storedThreadId) {
        setThreadId(storedThreadId as Id<'supportThreads'>)
      }
    }
  }, [userId, threadId])

  React.useEffect(() => {
    if (userId && isOpen && !threadId) {
      getOrCreateThread({ userId }).then(id => setThreadId(id))
    }
  }, [isOpen, threadId, userId, getOrCreateThread])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startGuestThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isStarting) return
    setIsStarting(true)
    try {
      console.log('Starting guest thread for:', email)
      const id = await getOrCreateThread({ email: email.trim() })
      console.log('Thread created/found:', id)
      setThreadId(id)
      localStorage.setItem('bq_guest_thread_id', id)
    } catch (err) {
      console.error('Failed to start support thread:', err)
      alert('Connection failed. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !threadId) return
    await sendMessage({
      threadId,
      senderId: userId || undefined,
      senderName: username || email || 'Guest',
      content: message,
      role: 'user'
    })
    setMessage('')
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group relative"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338c1.47.851 3.179 1.338 5 1.338 5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.474 0-2.85-.387-4.04-1.065L5 20l1.065-2.96C5.387 15.85 5 14.474 5 13c0-3.86 3.14-7 7-7s7 3.14 7 7-3.14 7-7 7z" />
          </svg>
          <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 border-2 border-neutral-950 rounded-full" />
        </button>
      ) : (
        <div className="w-96 h-[550px] bg-white text-neutral-900 border border-neutral-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
          {/* Header (Crisp Style) */}
          <div className="p-6 bg-blue-600 text-white">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338c1.47.851 3.179 1.338 5 1.338 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">Better Social Support</h3>
              <p className="text-blue-100 text-sm opacity-80 flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Online
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
            {!threadId ? (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <h4 className="font-bold text-lg mb-2">Welcome to Support</h4>
                <p className="text-neutral-500 text-sm mb-6">Please enter your email to start chatting with our team.</p>
                <form onSubmit={startGuestThread} className="w-full space-y-4">
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                  <button 
                    disabled={isStarting}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isStarting ? 'Connecting...' : 'Start Conversation'}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                  {messages?.map((msg: any) => (
                    <div key={msg._id} className={`flex flex-col €{msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed €{
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                          : 'bg-white text-neutral-800 rounded-bl-none shadow-sm border border-neutral-100'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1.5 px-1">
                        {msg.role === 'user' ? 'You' : msg.senderName} • {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Input */}
                <div className="p-4 bg-white border-t border-neutral-100">
                  <div className="relative flex items-center gap-2">
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..." 
                      className="flex-1 bg-neutral-100 border-none rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button 
                      onClick={handleSend}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/10"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                      Powered By <span className="text-blue-500">Better Social</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
