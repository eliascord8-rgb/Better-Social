import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/order')({
  component: OrderPage,
})

function OrderPage() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const navigate = useNavigate()
  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }))
  
  const [selectedCategory, setSelectedCategory] = React.useState<string>('')
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>('')
  const [targetUrl, setTargetUrl] = React.useState('')
  const [quantity, setQuantity] = React.useState<string>('0')
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const { data: categories } = useSuspenseQuery(convexQuery(api.smm.getCategories, {}))
  const { data: filteredServices } = useSuspenseQuery(
    convexQuery(api.smm.getServicesByCategory, { category: selectedCategory || '___NONE___' })
  )
  
  const placeOrder = useMutation(api.smm.placeOrder)

  // Get selected service details
  const selectedService = React.useMemo(() => {
    return filteredServices.find(s => s.externalId === selectedServiceId)
  }, [selectedServiceId, filteredServices])

  const totalPrice = React.useMemo(() => {
    if (!selectedService || !quantity) return 0
    const q = parseInt(quantity) || 0
    return (q / 1000) * selectedService.rate
  }, [selectedService, quantity])

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!selectedServiceId || !targetUrl || !quantity) return alert('Fill all fields')
    
    const q = parseInt(quantity)
    if (isNaN(q) || q <= 0) return alert('Invalid quantity')
    
    if (selectedService && q < selectedService.min) return alert(`Minimum quantity is ${selectedService.min}`)
    if (selectedService && q > selectedService.max) return alert(`Maximum quantity is ${selectedService.max}`)

    try {
      await placeOrder({
        userId,
        serviceId: selectedServiceId,
        targetUrl,
        quantity: q,
      })
      alert('Order placed successfully!')
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const NavItem = ({ to, label, icon, active = false }: { to: string, label: string, icon: string, active?: boolean }) => (
    <button 
      onClick={() => {
        setIsSidebarOpen(false)
        navigate({ to })
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
    >
      <span className={`text-lg group-hover:scale-110 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-900 bg-neutral-950 sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter italic">Better Social</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-400">
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:relative top-0 left-0 h-full w-72 bg-neutral-950 border-r border-neutral-900 flex flex-col z-[200] transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden md:block">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-500">
              <div className="w-6 h-6 bg-white rounded-md rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter italic leading-none group-hover:text-indigo-400 transition-colors">Better</h1>
              <h1 className="text-lg font-black uppercase tracking-tighter italic leading-none text-indigo-500 group-hover:text-white transition-colors">Social</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4 md:mt-0">
          <NavItem to="/dashboard" label="Home Base" icon="🏠" />
          <NavItem to="/order" label="New Order" icon="🛒" active />
          <NavItem to="/funds" label="Add Balance" icon="💳" />
          <NavItem to="/api" label="API Access" icon="🔌" />
          <NavItem to="/irc" label="Chat Room" icon="💬" />
          { (me?.role === 'admin' || me?.role === 'owner' || me?.role === 'moderator') && (
            <NavItem to="/admin" label="Admin Deck" icon="⚙️" />
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-neutral-900">
          <button 
            onClick={() => {
              localStorage.removeItem('bq_user_id')
              navigate({ to: '/' })
            }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-black uppercase text-[10px] tracking-widest"
          >
            <span>🚪</span> SIGN OUT SYSTEM
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 relative">
        <div className="max-w-4xl">
          <header className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic mb-4">
              Place <span className="text-indigo-500">Order</span>
            </h1>
            <div className="flex items-center gap-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl w-fit">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">💰</div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Available Credit</p>
                <p className="text-xl font-black text-white">${me?.balance.toFixed(2)}</p>
              </div>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <form onSubmit={handlePlaceOrder} className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-3 tracking-widest">1. Select Category</label>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      setSelectedServiceId('')
                    }}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value="">Choose a category...</option>
                    {categories?.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-3 tracking-widest">2. Select Service</label>
                  <select 
                    disabled={!selectedCategory}
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 transition-colors appearance-none disabled:opacity-50"
                  >
                    <option value="">Choose a service...</option>
                    {filteredServices?.map(s => (
                      <option key={s.externalId} value={s.externalId}>
                        [{s.externalId}] {s.name} - ${s.rate.toFixed(2)}/1k
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-3 tracking-widest">3. Target Link</label>
                  <input 
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-500 uppercase mb-3 tracking-widest">4. Quantity</label>
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 transition-colors"
                  />
                  {selectedService && (
                    <p className="mt-2 text-[9px] text-neutral-500 font-mono uppercase tracking-widest">
                      Min: {selectedService.min} / Max: {selectedService.max}
                    </p>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={!selectedService || !targetUrl || !quantity}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  PLACE SECURE ORDER
                </button>
              </form>
            </div>

            <div className="md:col-span-1 space-y-6">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase mb-6 tracking-widest">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-400">Service Rate</span>
                    <span className="text-xs font-bold">${selectedService?.rate.toFixed(2) || '0.00'}/1k</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-400">Quantity</span>
                    <span className="text-xs font-bold">{quantity || '0'}</span>
                  </div>
                  <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
                    <span className="text-sm font-black uppercase text-indigo-400">Total Price</span>
                    <span className="text-2xl font-black text-white">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Instant Delivery</p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Most orders start within 1-60 minutes. High quality accounts guaranteed. Support is available 24/7 via the Chat Room.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
