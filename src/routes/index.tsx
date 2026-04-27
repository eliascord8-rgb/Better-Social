import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SupportWidget } from '../components/SupportWidget'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [username, setUsername] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const login = useMutation(api.auth.login)
  const register = useMutation(api.auth.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit clicked', { mode, username, email })
    setError('')
    setIsLoading(true)

    try {
      if (mode === 'register') {
        if (!username) throw new Error('Username is required')
        if (!email) throw new Error('Email is required')
        if (!password) throw new Error('Password is required')
        console.log('Calling register mutation...')
        const res = await register({ username, email, password })
        console.log('Register response:', res)
        if (res.success) {
          localStorage.setItem('bq_user_id', res.userId!)
          navigate({ to: '/dashboard' })
        } else {
          setError(res.message)
        }
      } else {
        if (!username || !password) throw new Error('Username and Password required')
        console.log('Calling login mutation...')
        const res = await login({ username, password })
        console.log('Login response:', res)
        if (res.success && res.user) {
          localStorage.setItem('bq_user_id', res.user._id)
          navigate({ to: '/dashboard' })
        } else {
          setError(res.message)
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center justify-between min-h-screen gap-12">
        <div className="text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          System Status: Operational
        </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent mb-6 italic leading-[0.9]">
            BETTER<br/>SOCIAL
          </h1>
          <p className="text-neutral-400 text-lg max-w-md mb-8 leading-relaxed font-medium">
            The elite social media marketing platform. Premium high-retention services with a real-time synchronized backend.
          </p>
        <div className="flex gap-4 items-center mb-12">
          <div className="flex -space-x-3">
            {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-neutral-950 bg-neutral-800 flex items-center justify-center text-xs font-bold">{i}</div>)}
          </div>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Joined by 2,500+ Elite Marketers</p>
        </div>
        </div>

        <div className="w-full max-w-md bg-neutral-900/40 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="flex gap-4 mb-8 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Register
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-2 px-3 rounded-lg text-center font-bold">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
              />
            </div>

            <button 
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Access Dashboard' : 'Create Account')}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-neutral-600">
            By entering Better Social, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-3xl">
          <div className="text-center">
            <div className="text-2xl font-bold">99.9%</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Uptime</div>
          </div>
          <div className="text-center border-x border-neutral-800">
            <div className="text-2xl font-bold">Real-time</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">API Sync</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Elite</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Support</div>
          </div>
        </div>
      </div>
      <SupportWidget userId={userId || undefined} />
    </main>
  )
}
