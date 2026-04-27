import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SupportWidget } from '../components/SupportWidget'

export const Route = createFileRoute('/api')({
  component: APIAccessPage,
})

function APIAccessPage() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  React.useEffect(() => {
    if (!userId) {
      navigate({ to: '/' })
    }
  }, [userId, navigate])

  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  const generateApiKey = useMutation(api.users.generateApiKey)
  const [isGenerating, setIsGenerating] = React.useState(false)

  if (!me) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateApiKey({ userId: me._id })
    } finally {
      setIsGenerating(false)
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

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-[90] w-64 border-r border-neutral-900 flex flex-col p-6 gap-8 bg-neutral-950/95 backdrop-blur-xl shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 €{isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic">Better Social</span>
        </div>

        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            <DashboardIcon /> Dashboard
          </Link>
          <Link to="/order" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> New Order
          </Link>
          <Link to="/api" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium border border-white/10">
             <CodeIcon /> API Access
          </Link>
          <Link to="/irc" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
             <MessageIcon /> IRC Chat
          </Link>
          <button 
            onClick={() => {
              setIsSidebarOpen(false);
              localStorage.removeItem('bq_user_id');
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all mt-4 border border-transparent hover:border-red-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase tracking-widest">API ACCESS</h1>
            <p className="text-neutral-500 font-mono text-xs uppercase">Connect your panel to the Better Social network</p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4">Your Secret API Key</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 font-mono text-indigo-400 break-all">
                  {me.apiKey || 'No API Key generated yet'}
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {me.apiKey ? 'Regenerate' : 'Generate Key'}
                </button>
              </div>
              <p className="mt-2 text-xs text-red-500/70 font-bold uppercase tracking-tighter">Warning: Never share your API key. It allows direct balance deduction.</p>
            </div>

            <div className="pt-8 border-t border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Documentation</h3>
              
              <div className="space-y-8">
                <section>
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] rounded border border-green-500/20 uppercase">POST</span>
                    /api/v1/order
                  </h4>
                  <p className="text-neutral-400 text-sm mb-4">Place a new order or fetch services. All requests must be JSON.</p>
                  
                  <div className="bg-black rounded-xl p-4 font-mono text-xs text-neutral-300 space-y-4 border border-neutral-800">
                    <div>
                      <div className="text-neutral-500 mb-1">// Request Body (Place Order)</div>
                      <pre className="text-indigo-300">
{`{
  "key": "€{me.apiKey || 'YOUR_API_KEY'}",
  "action": "add",
  "service": "1",
  "link": "https://instagram.com/p/...",
  "quantity": 1000
}`}
                      </pre>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2 uppercase tracking-tight">Actions Supported</h4>
                  <ul className="grid grid-cols-2 gap-4">
                    <li className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl">
                      <div className="font-bold text-xs text-indigo-400 mb-1 font-mono">"services"</div>
                      <p className="text-[11px] text-neutral-500">Fetch all available services and rates.</p>
                    </li>
                    <li className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl">
                      <div className="font-bold text-xs text-indigo-400 mb-1 font-mono">"balance"</div>
                      <p className="text-[11px] text-neutral-500">Check your current account balance.</p>
                    </li>
                    <li className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl">
                      <div className="font-bold text-xs text-indigo-400 mb-1 font-mono">"add"</div>
                      <p className="text-[11px] text-neutral-500">Submit a new order to the panel.</p>
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
      {me && <SupportWidget userId={me._id} username={me.username} />}
    </div>
  )
}

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
)

const MessageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
)
