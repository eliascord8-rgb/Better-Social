import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation as useConvexMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import * as React from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()

  if (!userId) {
    navigate({ to: '/' })
    return null
  }

  const { data: user } = useSuspenseQuery(convexQuery(api.users.getMe, { userId }))
  const updateProfile = useConvexMutation((api.users as any).updateProfile)
  
  const [profilePicture, setProfilePicture] = React.useState((user as any)?.profilePicture || '')
  const [password, setPassword] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [message, setMessage] = React.useState({ type: '', text: '' })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      await updateProfile({
        userId,
        profilePicture,
        password: password || undefined
      })
      setMessage({ type: 'success', text: 'Settings updated successfully!' })
      setPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tight">ACCOUNT SETTINGS</h1>
            <p className="text-neutral-500 text-sm mt-1">Manage your identity and security</p>
          </div>
          <button 
            onClick={() => navigate({ to: '/dashboard' })}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            BACK TO DASHBOARD
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8 bg-neutral-900/50 border border-neutral-800 p-8 rounded-3xl backdrop-blur-xl">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-8">
            <img 
              src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((user as any)?.username || 'User')}&background=random&size=128`} 
              className="w-32 h-32 rounded-3xl object-cover border-4 border-neutral-800 shadow-2xl"
              alt="Avatar Preview"
            />
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Profile Picture URL</label>
                <input 
                  type="text"
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-neutral-800">
            <div>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Username</label>
              <input 
                type="text"
                disabled
                value={(user as any)?.username || ''}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">New Password (Optional)</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            disabled={isSaving}
            className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-neutral-200 transition-all shadow-xl shadow-white/5 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
