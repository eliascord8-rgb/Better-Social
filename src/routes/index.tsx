import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SupportWidget } from '../components/SupportWidget'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const login = useMutation(api.auth.login)
  const register = useMutation(api.auth.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (mode === 'register') {
        if (!username) throw new Error('Username is required')
        if (!email) throw new Error('Email is required')
        if (!password) throw new Error('Password is required')
        const res = await register({ username, email, password })
        if (res.success) {
          localStorage.setItem('bq_user_id', res.userId!)
          navigate({ to: '/dashboard' })
        } else {
          setError(res.message)
        }
      } else {
        if (!username || !password) throw new Error('Username and Password required')
        const res = await login({ username, password })
        if (res.success && res.user) {
          localStorage.setItem('bq_user_id', res.user._id)
          navigate({ to: '/dashboard' })
        } else {
          setError(res.message)
        }
      }
    } catch (err: any) {
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

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-4 italic">
            BETTER SOCIAL
          </h1>
          <p className="text-neutral-400 text-lg max-w-md mx-auto">
            The ultimate social media marketing panel. Premium results, real-time sync, and unparalleled control.
          </p>
        </div>

        <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex gap-4 mb-8 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
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
            By entering Better Quality, you agree to our Terms of Service and Privacy Policy.
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
      <SupportWidget userId={userId} />
    </main>
  )
}
