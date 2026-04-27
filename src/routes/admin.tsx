import * as React from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({
  component: AdminPanel,
})

function AdminPanel() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  const { data: users } = useSuspenseQuery(convexQuery(api.users.list, {}))
  const { data: pendingTxs } = useSuspenseQuery(convexQuery(api.transactions.listAllPendingTransactions, {}))

  const addBalance = useMutation(api.users.addBalance)
  const kickUser = useMutation(api.users.kickUser)
  const updateTxStatus = useMutation(api.transactions.updateTransactionStatus)
  const sendAlert = useMutation(api.users.sendUserAlert)
  const updatePassword = useMutation(api.users.updateUserPassword)
  const mailAll = useAction(api.mail.mailAll)
  const sendMessage = useMutation(api.support.sendMessage)
  const closeThread = useMutation(api.support.closeThread)

  React.useEffect(() => {
    if (!me || (me.role !== 'admin' && me.role !== 'owner' && me.role !== 'moderator')) {
      navigate({ to: '/dashboard' })
    }
  }, [me, navigate])

  const [activeTab, setActiveTab] = React.useState<'users' | 'transactions' | 'mail' | 'support' | 'smm' | 'coupons' | 'payments'>(me?.role === 'moderator' ? 'support' : 'users')
  const [mailSubject, setMailSubject] = React.useState('')
  const [mailMessage, setMailMessage] = React.useState('')
  const [isSendingMail, setIsSendingMail] = React.useState(false)

  // Payment Config State
  const paymentConfigs = useQuery(api.payments.getAdminConfigs)
  const savePaymentConfig = useMutation(api.payments.saveConfig)
  const [editingProvider, setEditingProvider] = React.useState<string | null>(null)
  const [configFields, setConfigFields] = React.useState<Record<string, string>>({})
  const [isProviderActive, setIsProviderActive] = React.useState(false)

  // Coupon Generator State
  const [couponAmount, setCouponAmount] = React.useState(10)
  const [isGeneratingCoupon, setIsGeneratingCoupon] = React.useState(false)
  const generateCoupon = useMutation(api.coupons.generateCoupon)
  const coupons = useQuery(api.coupons.listAllCoupons, me?._id ? { adminId: me._id } : "skip")

  // SMM Config State
  const smmConfig = useQuery(api.smm.getConfig)
  const setSmmConfig = useMutation(api.smm.setConfig)
  const syncSmmServices = useAction(api.smm.syncServices)
  const [smmUrl, setSmmUrl] = React.useState('')
  const [smmKey, setSmmKey] = React.useState('')
  const [markup, setMarkup] = React.useState(0)
  const [isSyncing, setIsSyncing] = React.useState(false)

  React.useEffect(() => {
    if (smmConfig) {
      setSmmUrl(smmConfig.apiUrl)
      setSmmKey(smmConfig.apiKey)
    setMarkup(smmConfig.markupPercentage || 0)
    }
  }, [smmConfig])

  // Support Chat State
  const { data: activeThreads } = useSuspenseQuery(convexQuery(api.support.listActiveThreads, {}))
  const [selectedThreadId, setSelectedThreadId] = React.useState<Id<'supportThreads'> | null>(null)
  const { data: threadMessages } = useSuspenseQuery(convexQuery(api.support.getMessages, { threadId: selectedThreadId ?? undefined }))
  const [replyText, setReplyText] = React.useState('')

  if (!me || (me.role !== 'admin' && me.role !== 'owner' && me.role !== 'moderator')) return null

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mailSubject || !mailMessage) return alert('Fill all fields')
    setIsSendingMail(true)
    try {
      const res = await mailAll({ subject: mailSubject, message: mailMessage })
      alert(`Sent to ${res.sentCount} users. ${res.error ? 'Error: ' + res.error : ''}`)
      setMailSubject('')
      setMailMessage('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSendingMail(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedThreadId) return
    await sendMessage({
      threadId: selectedThreadId,
      senderId: me._id,
      senderName: 'Admin',
      content: replyText,
      role: 'admin'
    })
    setReplyText('')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-900 bg-neutral-950 sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase">BS ADMIN</span>
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
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic">Better Social Admin</span>
        </div>

        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            Back to Site
          </Link>
          {me.role !== 'moderator' && (
            <>
              <button 
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'users' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                User Management
              </button>
              <button 
                onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'transactions' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                Transactions {pendingTxs.length > 0 && <span className="ml-auto bg-indigo-500 text-[10px] px-1.5 rounded-full">{pendingTxs.length}</span>}
              </button>
              <button 
                onClick={() => { setActiveTab('mail'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'mail' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                Mass Mail
              </button>
              <button
                onClick={() => { setActiveTab('smm'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'smm' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                SMM API Sync
              </button>
              <button
                onClick={() => { setActiveTab('coupons'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'coupons' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                Coupon Generator
              </button>
              <button
                onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'payments' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
              >
                Payment Methods
              </button>
              </>
              )}

          <button 
            onClick={() => { setActiveTab('support'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeTab === 'support' ? 'bg-white/5 text-white border border-white/10' : 'text-neutral-400 hover:text-white'}`}
          >
            Support Chat {activeThreads.length > 0 && <span className="ml-auto bg-green-500 text-[10px] px-1.5 rounded-full">{activeThreads.length}</span>}
          </button>
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

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black tracking-tighter uppercase">{activeTab}</h1>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Admin logged as</p>
                <p className="text-sm font-bold">{me.username}</p>
              </div>
            </div>
          </div>

          {activeTab === 'users' && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/50 border-b border-neutral-800">
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Balance</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Level</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-white/5 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{u.username}</span>
                          <span className="text-[10px] text-neutral-600 font-mono">{u._id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-neutral-400">{u.email || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="text-indigo-400 font-black">${u.balance.toFixed(2)}</span>
                           <button 
                            onClick={() => {
                              const amt = prompt('Amount to add (use negative to subtract):')
                              if (amt) addBalance({ userId: u._id, amount: parseFloat(amt) })
                            }}
                            className="bg-white/5 hover:bg-white/10 p-1 rounded text-[10px] font-bold"
                           >
                            Edit
                           </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">LVL {u.level}</span>
                      </td>
                      <td className="px-6 py-4">
                        {u.isKicked ? (
                          <span className="text-[10px] font-black text-red-500 uppercase">Kicked</span>
                        ) : (
                          <span className="text-[10px] font-black text-green-500 uppercase">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                const newPass = prompt('Enter new password for ' + u.username + ':')
                                if (newPass) updatePassword({ userId: u._id, newPassword: newPass })
                              }}
                              className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300"
                            >
                              Password
                            </button>
                            <button 
                              onClick={() => {
                                const msg = prompt('Send alert message:')
                                if (msg) sendAlert({ userId: u._id, message: msg })
                              }}
                              className="text-[10px] font-black uppercase text-neutral-400 hover:text-white"
                            >
                              Alert
                            </button>
                            {!u.isKicked && (
                              <button 
                                onClick={() => kickUser({ userId: u._id })}
                                className="text-[10px] font-black uppercase text-red-400 hover:text-red-600"
                              >
                                Kick
                              </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/50 border-b border-neutral-800">
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {pendingTxs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-600 font-bold uppercase tracking-widest text-xs">
                          No pending transactions
                        </td>
                      </tr>
                    ) : (
                      pendingTxs.map(tx => (
                        <tr key={tx._id} className="hover:bg-white/5 transition-all">
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${tx.type === 'deposit' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-white">{users.find(u => u._id === tx.userId)?.username}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-300">{tx.method}</span>
                              <span className="text-[10px] text-neutral-600 truncate max-w-[200px]">{tx.details || 'No details'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-white">${tx.amount.toFixed(2)}</span>
                              {tx.bonus && <span className="text-[8px] text-indigo-400 font-bold">Bonus: +${tx.bonus.toFixed(2)}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => updateTxStatus({ transactionId: tx._id, status: 'completed' })}
                                  className="px-3 py-1 bg-green-600 rounded text-[10px] font-black uppercase hover:bg-green-500"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => updateTxStatus({ transactionId: tx._id, status: 'rejected' })}
                                  className="px-3 py-1 bg-red-600 rounded text-[10px] font-black uppercase hover:bg-red-500"
                                >
                                  Reject
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'mail' && (
            <div className="max-w-2xl bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-xl font-black mb-6 uppercase">Send Bulk Message</h2>
              <form onSubmit={handleSendMail} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Subject</label>
                    <input 
                      type="text" 
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="Special Offer / System Update"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Message Content</label>
                    <textarea 
                      value={mailMessage}
                      onChange={(e) => setMailMessage(e.target.value)}
                      rows={6}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="Your message to all users..."
                    />
                 </div>
                 <button 
                  disabled={isSendingMail}
                  className="w-full bg-white text-black font-black py-3 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50"
                 >
                  {isSendingMail ? 'SENDING...' : 'SEND TO ALL USERS'}
                 </button>
                 <p className="text-[10px] text-neutral-600 italic">Powered by Resend.com API</p>
              </form>
            </div>
          )}

          {activeTab === 'smm' && (
            <div className="max-w-2xl bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-8">
              <div>
                <h2 className="text-xl font-black mb-6 uppercase">Provider Configuration</h2>
                <div className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">API URL (V2)</label>
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={smmUrl}
                          onChange={(e) => setSmmUrl(e.target.value)}
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white text-sm"
                          placeholder="https://smmcost.com/api/v2"
                        />
                        <p className="text-[9px] text-neutral-600 font-mono">Example: https://smmcost.com/api/v2</p>
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">API Key</label>
                      <input
                        type="password"
                        value={smmKey}
                        onChange={(e) => setSmmKey(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="Your API Key"
                      />
                      </div>
                      <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Price Markup (%)</label>
                      <input
                        type="number"
                        value={markup}
                        onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                        className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="50"
                      />
                      <p className="text-[9px] text-neutral-600 mt-1 uppercase font-bold tracking-widest italic">Example: 50 will increase all service rates by 50%</p>
                      </div>
                      <button
                      onClick={async () => {
                      try {
                        await setSmmConfig({ apiUrl: smmUrl, apiKey: smmKey, markupPercentage: markup })
                        alert('Config saved')
                      } catch (err: any) {
                        alert('Error saving: ' + err.message)
                      }
                      }}
                      className="w-full bg-indigo-600 py-3 rounded-lg font-black text-sm uppercase"
                      >
                      Save Configuration
                      </button>
                </div>
              </div>

              <div className="pt-8 border-t border-neutral-800">
                <h2 className="text-xl font-black mb-4 uppercase text-indigo-400">Sync Services</h2>
                <p className="text-xs text-neutral-500 mb-6 font-mono uppercase tracking-widest">Fetch the latest rates and services from SMMCOST</p>
                <button 
                  disabled={isSyncing}
                  onClick={async () => {
                    setIsSyncing(true)
                    try {
                      const res = await syncSmmServices({})
                      if (res.success) alert(`Synced ${res.count} services!`)
                      else alert('Error: ' + res.error)
                    } finally {
                      setIsSyncing(false)
                    }
                  }}
                  className="w-full border-2 border-white/10 hover:border-white/20 py-4 rounded-xl font-black text-sm uppercase transition-all bg-white/5"
                >
                  {isSyncing ? 'SYNCING DATA...' : 'RUN GLOBAL SYNC'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Generate Gift Card</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Coupon Amount ($)</label>
                    <input 
                      type="number" 
                      value={couponAmount}
                      onChange={(e) => setCouponAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-white font-black"
                      placeholder="10.00"
                    />
                  </div>
                  <button 
                    disabled={isGeneratingCoupon}
                    onClick={async () => {
                      setIsGeneratingCoupon(true)
                      try {
                        const code = await generateCoupon({ adminId: me._id, amount: couponAmount })
                        alert(`Coupon Generated: ${code}`)
                      } catch (err: any) {
                        alert(err.message)
                      } finally {
                        setIsGeneratingCoupon(false)
                      }
                    }}
                    className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    {isGeneratingCoupon ? 'GENERATING...' : 'GENERATE SECURE CODE'}
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6 flex flex-col h-[500px]">
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Recent Coupons</h2>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {coupons?.map(coupon => (
                    <div key={coupon._id} className="p-4 bg-black border border-neutral-800 rounded-xl flex justify-between items-center group">
                      <div>
                        <div className="font-mono text-indigo-400 font-bold">{coupon.code}</div>
                        <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">${coupon.amount.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        {coupon.isUsed ? (
                          <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-1 rounded uppercase font-black">Used</span>
                        ) : (
                          <span className="text-[8px] bg-green-500/10 text-green-500 px-2 py-1 rounded uppercase font-black">Active</span>
                        )}
                        <div className="text-[9px] text-neutral-600 mt-1">{new Date(coupon._creationTime).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                  {coupons?.length === 0 && <p className="text-center text-neutral-600 text-xs py-10 font-bold uppercase tracking-widest">No coupons generated yet</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="grid grid-cols-3 gap-8 h-[600px]">
               <div className="col-span-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Active Conversations</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
                    {activeThreads.map(thread => (
                      <button 
                        key={thread._id}
                        onClick={() => setSelectedThreadId(thread._id)}
                        className={`w-full p-4 text-left hover:bg-white/5 transition-all ${selectedThreadId === thread._id ? 'bg-white/5 border-l-4 border-indigo-500' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-white text-sm">{thread.username}</span>
                          <span className="text-[8px] text-neutral-600">{new Date(thread.lastMessageTime).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{thread.lastMessage}</p>
                      </button>
                    ))}
                    {activeThreads.length === 0 && <p className="p-8 text-center text-xs text-neutral-600 font-bold uppercase">No active chats</p>}
                  </div>
               </div>

               <div className="col-span-2 bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                  {selectedThreadId ? (
                    <>
                      <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                        <div>
                           <h3 className="text-sm font-bold text-white">{activeThreads.find(t => t._id === selectedThreadId)?.username}</h3>
                           <p className="text-[10px] text-green-500 font-black uppercase">Live Chat</p>
                        </div>
                        <button 
                          onClick={async () => {
                            await closeThread({ threadId: selectedThreadId })
                            setSelectedThreadId(null)
                          }}
                          className="px-3 py-1 bg-red-600/20 text-red-500 border border-red-500/30 text-[10px] font-black rounded hover:bg-red-600/30 transition-all uppercase"
                        >
                          Close Ticket
                        </button>
                      </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col bg-black/20">
                           {threadMessages.map((msg: any) => (
                             <div key={msg._id} className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'admin' ? 'bg-indigo-600/20 border border-indigo-500/30 self-end text-right' : 'bg-neutral-800 self-start'}`}>
                                <div className="flex items-center gap-2 mb-1 justify-inherit">
                                  <span className="text-[10px] font-black uppercase text-neutral-400">{msg.senderName}</span>
                                  <span className="text-[8px] text-neutral-600">{new Date(msg._creationTime).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm text-white">{msg.content}</p>
                             </div>
                           ))}
                        </div>
                      <form onSubmit={handleSendReply} className="p-4 bg-neutral-950/50 border-t border-neutral-800 flex gap-2">
                        <input 
                          type="text" 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder="Type your reply..."
                        />
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-black text-xs uppercase transition-all">Send</button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                      <svg className="w-16 h-16 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <p className="font-black uppercase tracking-widest text-sm">Select a conversation to start chatting</p>
                    </div>
                  )}
               </div>
            </div>
            )}

            {activeTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Active Gateways</h2>
                <div className="space-y-4">
                  {['paypal', 'payeer', 'coinpayments', 'stripe', 'skrill'].map((provider) => {
                    const cfg = paymentConfigs?.find(c => c.provider === provider)
                    return (
                      <div key={provider} className="flex items-center justify-between p-4 bg-black border border-neutral-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${cfg?.isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-800'}`} />
                          <span className="font-black uppercase tracking-widest text-sm italic">{provider}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingProvider(provider)
                            setConfigFields(cfg?.config || {})
                            setIsProviderActive(cfg?.isActive || false)
                          }}
                          className="bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all"
                        >
                          Configure
                        </button>
                      </div>
                    )
                  })}
                </div>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Webhook URLs</p>
                <p className="text-[9px] text-neutral-500 font-mono">PayPal: /api/payments/paypal</p>
                <p className="text-[9px] text-neutral-500 font-mono">Payeer: /api/payments/payeer</p>
                <p className="text-[9px] text-neutral-500 font-mono">Skrill: /api/payments/skrill</p>
                <p className="text-[9px] text-neutral-500 font-mono">CoinPayments: /api/payments/coinpayments</p>
              </div>
              </div>

              {editingProvider && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-indigo-400">{editingProvider} Keys</h2>
                    <button onClick={() => setEditingProvider(null)} className="text-neutral-600 hover:text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editingProvider === 'paypal' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Client ID</label>
                          <input value={configFields.clientId || ''} onChange={(e) => setConfigFields({...configFields, clientId: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Secret</label>
                          <input type="password" value={configFields.secret || ''} onChange={(e) => setConfigFields({...configFields, secret: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                      </>
                    )}
                    {editingProvider === 'payeer' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Merchant ID</label>
                          <input value={configFields.merchantId || ''} onChange={(e) => setConfigFields({...configFields, merchantId: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Secret Key</label>
                          <input type="password" value={configFields.secretKey || ''} onChange={(e) => setConfigFields({...configFields, secretKey: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                      </>
                    )}
                    {editingProvider === 'skrill' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Merchant Email</label>
                          <input value={configFields.email || ''} onChange={(e) => setConfigFields({...configFields, email: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Secret Word (IPN)</label>
                          <input type="password" value={configFields.secretWord || ''} onChange={(e) => setConfigFields({...configFields, secretWord: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                      </>
                    )}
                    {editingProvider === 'coinpayments' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Public Key</label>
                          <input value={configFields.publicKey || ''} onChange={(e) => setConfigFields({...configFields, publicKey: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">IPN Secret</label>
                          <input type="password" value={configFields.ipnSecret || ''} onChange={(e) => setConfigFields({...configFields, ipnSecret: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-neutral-500 uppercase">Merchant ID</label>
                          <input value={configFields.merchantId || ''} onChange={(e) => setConfigFields({...configFields, merchantId: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
                        </div>
                      </>
                    )}

                  <div className="flex items-center gap-3 pt-4">
                    <input type="checkbox" checked={isProviderActive} onChange={(e) => setIsProviderActive(e.target.checked)} className="w-4 h-4 rounded bg-black border-neutral-800" />
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Enable Gateway</label>
                  </div>

                    <button
                      onClick={async () => {
                        await savePaymentConfig({ provider: editingProvider as any, config: configFields, isActive: isProviderActive })
                        alert('Gateway updated successfully')
                        setEditingProvider(null)
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-black text-sm uppercase transition-all mt-4"
                    >
                      Update Gateway
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
            </div>
            </main>
    </div>
  )
}
