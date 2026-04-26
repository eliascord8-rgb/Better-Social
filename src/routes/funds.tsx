import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SupportWidget } from '../components/SupportWidget'

export const Route = createFileRoute('/funds')({
  component: AddFundsPage,
})

function AddFundsPage() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  React.useEffect(() => {
    if (!userId) {
      navigate({ to: '/' })
    }
  }, [userId, navigate])

  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  const { data: transactions } = useSuspenseQuery(convexQuery(api.transactions.listMyTransactions, { userId: userId! }))
  
  const [amount, setAmount] = React.useState(10)
  const [withdrawAmount, setWithdrawAmount] = React.useState(0)
  const [withdrawAddress, setWithdrawAddress] = React.useState('')
  const [withdrawMethod, setWithdrawMethod] = React.useState('LTC')

  const depositMutation = useMutation(api.transactions.deposit)
  const withdrawMutation = useMutation(api.transactions.requestWithdrawal)
  const redeemCoupon = useMutation(api.coupons.redeemCoupon)
  const [couponCode, setCouponCode] = React.useState('')
  const [isRedeeming, setIsRedeeming] = React.useState(false)

  if (!me) return null

  const paymentMethods = [
    { id: 'GIFT_CARD', name: 'Gift Card', icon: '🎁', desc: 'Redeem a prepaid coupon code.' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', desc: 'Secure payment via PayPal account.' },
    { id: 'payeer', name: 'Payeer', icon: '🅿️', desc: 'Instant deposit via Payeer wallet.' },
    { id: 'cryptomus', name: 'Cryptomus', icon: '₿', desc: 'Pay with BTC, ETH, USDT & more.' },
    { id: 'revolut', name: 'Revolut Pay', icon: '💳', desc: 'Instant credit card or app payment.' },
    { id: 'skrill', name: 'Skrill', icon: '💰', desc: 'Elite digital wallet transfer.' },
  ]

  const handlePayment = async (method: string) => {
    if (method === 'GIFT_CARD') {
      if (!couponCode) return alert('Enter a coupon code first')
      setIsRedeeming(true)
      try {
        const res = await redeemCoupon({ userId: userId!, code: couponCode })
        alert(`Redeemed ${res.amount.toFixed(2)} successfully!`)
        setCouponCode('')
      } catch (err: any) {
        alert(err.message)
      } finally {
        setIsRedeeming(false)
      }
      return
    }
    
    // Create a pending transaction and show user where to pay
    try {
      await depositMutation({ userId: userId!, amount, method: method.toUpperCase() })
      if (method === 'paypal') {
        alert(`PayPal order created for ${amount}. Redirecting to secure checkout... (Simulation)`)
        // In real app: window.location.href = `https://paypal.com/checkout?amount=${amount}&custom=${userId}`
      } else if (method === 'payeer') {
        alert(`Payeer order created for ${amount}. Please complete payment in the next screen. (Simulation)`)
      } else {
        alert(`Request for ${amount} via ${method.toUpperCase()} submitted. Please wait for manual verification or IPN update.`)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (withdrawAmount <= 0) return alert('Enter valid amount')
    if (!withdrawAddress) return alert('Enter wallet address')
    
    const res = await withdrawMutation({
      userId: userId!,
      amount: withdrawAmount,
      method: withdrawMethod,
      address: withdrawAddress
    })

    if (res.success) {
      alert(res.message)
      setWithdrawAmount(0)
      setWithdrawAddress('')
    } else {
      alert(res.message)
    }
  }

  const bonusMessage = amount >= 100 ? `+ ${(amount * 0.4).toFixed(2)} Bonus (40%)` : 'Deposits over $100 get 40% EXTRA!'

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
      <nav className={`fixed inset-y-0 left-0 z-[90] w-64 border-r border-neutral-900 flex flex-col p-6 gap-8 bg-neutral-950/95 backdrop-blur-xl shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="font-black tracking-tighter text-xl text-white uppercase italic">Better Social</span>
        </div>

        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            Dashboard
          </Link>
          <Link to="/order" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            New Order
          </Link>
          <Link to="/funds" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white font-medium border border-white/10">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             Add Funds
          </Link>
          {(me.role === 'admin' || me.role === 'owner') && (
            <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all font-bold">
               Admin Panel
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-neutral-900">
          <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Available Balance</p>
            <p className="text-2xl font-black text-white">${me.balance?.toFixed(2)}</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase tracking-widest">FINANCE CENTER</h1>
              <p className="text-neutral-500 font-mono text-[10px] md:text-xs uppercase">Manage your deposits and withdrawals</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <button onClick={() => document.getElementById('deposit-sec')?.scrollIntoView({ behavior: 'smooth'})} className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:border-neutral-600 transition-all">Add Funds</button>
               <button onClick={() => document.getElementById('withdraw-sec')?.scrollIntoView({ behavior: 'smooth'})} className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-indigo-600/30 transition-all">Withdraw</button>
            </div>
          </div>

          <div id="deposit-sec" className="space-y-6">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-500 rounded-full" />
              ADD FUNDS
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Enter Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-indigo-500 font-bold text-lg">$</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-neutral-800 rounded-xl pl-8 pr-4 py-3 text-xl font-black focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <p className={`text-[9px] font-bold mt-3 uppercase tracking-wider ${amount >= 100 ? 'text-green-500' : 'text-neutral-600'}`}>
                    {bonusMessage}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[10, 25, 50, 100, 250, 500].map(val => (
                      <button 
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${amount === val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-6 space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Redeem Gift Card / Coupon</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all uppercase"
                      placeholder="BS-XXXX-XXXX-XXXX"
                    />
                    <button 
                      onClick={() => handlePayment('GIFT_CARD')}
                      disabled={isRedeeming || !couponCode}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all"
                    >
                      {isRedeeming ? '...' : 'REDEEM'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => handlePayment(method.id)}
                    className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-6 text-left hover:bg-white/5 hover:border-neutral-600 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4 mb-3 text-white">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-neutral-800 rounded-xl flex items-center justify-center text-xl md:text-2xl group-hover:scale-110 transition-transform">
                        {method.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white uppercase tracking-tight text-sm md:text-base">{method.name}</h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">
                          {method.id === 'GIFT_CARD' ? 'Instant' : 'IPN / Pending'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">{method.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div id="withdraw-sec" className="space-y-6">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full" />
              WITHDRAW FUNDS
            </h2>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 md:p-8">
              <form onSubmit={handleWithdraw} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Select Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['LTC', 'BTC', 'ETH', 'SKRILL'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWithdrawMethod(m)}
                          className={`py-3 rounded-xl border font-black text-[10px] transition-all ${withdrawMethod === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black border-neutral-800 text-neutral-500'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Withdrawal Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-red-500 font-bold text-lg">$</span>
                      <input 
                        type="number" 
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-black border border-neutral-800 rounded-xl pl-8 pr-4 py-3 text-xl font-black focus:outline-none focus:border-red-500/50 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-2 font-bold uppercase">Balance after withdrawal: ${(me.balance - withdrawAmount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Destination Address / Email</label>
                    <input 
                      type="text" 
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder={`Enter your ${withdrawMethod} address...`}
                    />
                    <p className="text-[10px] text-neutral-600 mt-2 italic">Make sure the address is correct. Withdrawals are irreversible once completed.</p>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-neutral-200 transition-all shadow-xl shadow-white/5 active:scale-[0.98] text-sm uppercase tracking-widest"
                  >
                    SUBMIT WITHDRAWAL REQUEST
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
              <span className="w-2 h-6 bg-green-500 rounded-full" />
              TRANSACTION HISTORY
            </h2>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-neutral-950/50 border-b border-neutral-800">
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Type</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Method</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Amount</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Bonus</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Status</th>
                    <th className="px-4 md:px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-neutral-600 font-bold uppercase tracking-widest text-xs">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions?.map(tx => (
                      <tr key={tx._id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${tx.type === 'deposit' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-neutral-300">{tx.method}</td>
                        <td className="px-6 py-4 text-xs font-black text-white">${tx.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-indigo-400">{tx.bonus ? `+${tx.bonus.toFixed(2)}` : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            tx.status === 'completed' ? 'text-green-500 bg-green-500/10' : 
                            tx.status === 'pending' ? 'text-yellow-500 bg-yellow-500/10' : 
                            'text-red-500 bg-red-500/10'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono text-neutral-600">
                          {new Date(tx._creationTime).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      {me && <SupportWidget userId={me._id} username={me.username} />}
    </div>
  )
}
