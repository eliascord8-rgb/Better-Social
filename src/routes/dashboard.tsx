import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SupportWidget } from '../components/SupportWidget'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  React.useEffect(() => {
    if (!userId) {
      navigate({ to: '/' })
    }
  }, [userId, navigate])

  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  const alerts = useQuery(api.chat.getMyAlerts, { userId: userId ?? ("" as any) })
  const chatMessages = useQuery(api.chat.list, { channel: "community" })
  const sendMessage = useMutation(api.chat.send)
  const placeOrder = useMutation(api.smm.placeOrder)
  const { data: services } = useSuspenseQuery(convexQuery(api.smm.getServices, {}))

  const [chatInput, setChatInput] = React.useState('')
  const [orderData, setOrderData] = React.useState({ serviceId: '', targetUrl: '', quantity: 0 })
  const [activeAlert, setActiveAlert] = React.useState<string | null>(null)

  // Handle Private Alerts (Popups/Kicks)
  React.useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latest = alerts[alerts.length - 1]
      if (latest.content) {
        setActiveAlert(latest.content)
        if (latest.content.toLowerCase().includes('kick')) {
          setTimeout(() => {
            localStorage.removeItem('bq_user_id')
            window.location.href = '/'
          }, 3000)
        }
      }
    }
  }, [alerts])

  if (!me) return null

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    
    // Client side mute check for UX
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
        channel: "community"
      })
      setChatInput('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handlePlaceOrder = async () => {
    const service = services.find((s: any) => (s.externalId || s.id) === orderData.serviceId)
    if (!service) return alert('Select a service')
    const cost = (service.rate / 1000) * orderData.quantity
    try {
      await placeOrder({
        userId: me._id,
        serviceId: orderData.serviceId,
        quantity: orderData.quantity,
        targetUrl: orderData.targetUrl,
        cost
      })
      alert('Order placed successfully! Check status in your order history.')
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
          <span className="font-black tracking-tighter text-xl uppercase">BS</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Alert Popup */}
      {activeAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-neutral-900 border border-white/10 p-6 md:p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 uppercase">System Message</h3>
            <p className="text-neutral-400 mb-6">{activeAlert}</p>
            <button 
              onClick={() => setActiveAlert(null)}
              className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-[90] w-64 border-r border-neutral-900 flex flex-col p-6 gap-8 bg-neutral-950/95 backdrop-blur-xl shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic">Better Social</span>
        </div>

        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium border border-white/10">
            <DashboardIcon /> Dashboard
          </Link>
          <Link to="/api" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
             <CodeIcon /> API Access
          </Link>
          <Link to="/order" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            <OrderIcon /> New Order
          </Link>
          <Link to="/irc" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
             <MessageIcon /> IRC Chat
          </Link>
          <Link to="/funds" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            <FundsIcon /> Add Funds
          </Link>
          {(me.role === 'admin' || me.role === 'owner' || me.role === 'moderator') && (
            <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500/50 hover:bg-red-500/5 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20">
              <AdminIcon /> Admin Panel
            </Link>
          )}
          <button 
            onClick={() => {
              setIsSidebarOpen(false);
              localStorage.removeItem('bq_user_id');
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all mt-4 border border-transparent hover:border-red-500/20"
          >
            <LogoutIcon /> Logout
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-neutral-900">
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-xl p-4">
            <div className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Your Balance</div>
            <div className="text-2xl font-black">${me.balance.toFixed(2)}</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">System Status</h1>
              <p className="text-neutral-500 text-sm md:text-base">Welcome back, {me.username}. All systems operational.</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                API Online
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-6">
              <h3 className="font-bold mb-4 uppercase tracking-wider text-sm md:text-base">Quick New Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Service</label>
                  <select 
                    value={orderData.serviceId}
                    onChange={(e) => setOrderData({...orderData, serviceId: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 appearance-none"
                  >
                    <option value="">Select Service...</option>
                    {services?.map((s: any) => (
                      <option key={s._id || s.id} value={s.externalId || s.id}>
                        [{s.category || 'Service'}] {s.name} - ${s.rate}/k
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Target URL</label>
                  <input 
                    type="text" 
                    value={orderData.targetUrl}
                    onChange={(e) => setOrderData({...orderData, targetUrl: e.target.value})}
                    placeholder="https://..." 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Quantity</label>
                    <input 
                      type="number" 
                      value={orderData.quantity || ''}
                      onChange={(e) => setOrderData({...orderData, quantity: parseInt(e.target.value) || 0})}
                      placeholder="1000" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Total Cost</label>
                    <div className="h-10 flex items-center px-4 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-400 font-mono">
                      ${((services?.find((s: any) => (s.externalId || s.id) === orderData.serviceId)?.rate || 0) / 1000 * orderData.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handlePlaceOrder}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors text-sm uppercase tracking-widest"
                >
                  Place Order
                </button>
              </div>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-6 flex flex-col h-[400px] md:h-[500px] overflow-hidden lg:sticky lg:top-8">
              <h3 className="font-bold mb-4 flex items-center justify-between uppercase tracking-wider text-sm md:text-base">
                Community Chat
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Live</span>
              </h3>
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2 custom-scrollbar flex flex-col-reverse">
                {chatMessages?.map((msg: any) => (
                  <ChatMessage 
                    key={msg._id} 
                    name={msg.username} 
                    role={msg.role} 
                    level={msg.level}
                    text={msg.content} 
                    time={msg._creationTime}
                  />
                ))}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  disabled={!!(me.muteUntil && me.muteUntil > Date.now())}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder={me.muteUntil && me.muteUntil > Date.now() ? "You are muted" : "Send a message..."} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm pr-10 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  onClick={handleSendChat}
                  className="absolute right-2 top-1.5 p-1 text-neutral-500 hover:text-white transition-colors"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {me && <SupportWidget userId={me._id} username={me.username} />}
    </div>
  )
}

function ChatMessage({ name, role, level, text, time }: { name: string; role?: string; level?: number; text: string; time: number }) {
  const roleColor = role === 'admin' || role === 'owner' ? 'text-red-500' : role === 'moderator' ? 'text-green-500' : 'text-neutral-300';
  const bgColor = role === 'admin' || role === 'owner' ? 'bg-red-500/10' : role === 'moderator' ? 'bg-green-500/10' : '';
  const timeStr = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="text-sm w-full group">
      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span className="text-[9px] text-neutral-600 font-mono shrink-0">[{timeStr}]</span>
        <span className={`font-bold ${roleColor} truncate max-w-[100px]`}>
          {name}
        </span>
        {level !== undefined && (
          <span className="text-[8px] bg-neutral-800 text-neutral-500 px-1 rounded font-bold shrink-0">L{level}</span>
        )}
        {role && role !== 'user' && (
          <span className={`text-[7px] px-1 py-0.5 rounded uppercase font-black tracking-tighter ${bgColor} ${roleColor} shrink-0 border border-current opacity-70`}>
            {role}
          </span>
        )}
      </div>
      <p className="text-neutral-400 leading-tight break-words whitespace-pre-wrap pl-2 border-l border-white/5">
        {text}
      </p>
    </div>
  )
}

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const OrderIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const FundsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const MessageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
)

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)
