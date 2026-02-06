import { useState } from 'react'
import { shopsApi } from '../../lib/api'

export default function ShopOnboarding({ user, onShopCreated }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        address: '',
        town: '',
        area: '',
        pincode: '',
        phone: '',
        whatsapp: '',
        opening_time: '09:00',
        closing_time: '21:00',
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const shopData = {
                ...formData,
                category: formData.category ? parseInt(formData.category) : null,
                owner_supabase_uid: user.id,
                owner_name: user.user_metadata?.full_name || user.email,
                owner_phone: formData.phone,
                owner_email: user.email,
            }

            console.log('Creating shop:', shopData)
            const result = await shopsApi.createShop(shopData)
            console.log('Result:', result)

            if (result.error) {
                setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
            } else if (result.id) {
                onShopCreated(result)
            } else {
                // Show validation errors from backend
                setError(JSON.stringify(result))
            }
        } catch (err) {
            console.error('Error:', err)
            setError('Network error. Please check connection.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-16 px-6 relative overflow-hidden font-display antialiased">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full -mr-64 -mt-64 blur-3xl opacity-60" />
            <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-primary/5 rounded-full -ml-32 -mb-32 blur-3xl opacity-40" />
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />

            <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-900/20 group hover:rotate-6 transition-transform duration-500">
                        <span className="material-symbols-rounded text-4xl text-white">storefront</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Launch Your Shop</h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Merchant Partner Onboarding</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-14 space-y-12">
                    {/* Store Information */}
                    <div className="space-y-10">
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <span className="material-symbols-rounded text-primary font-black">business_center</span>
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">Store Identity</h2>
                            </div>

                            <div className="grid gap-6">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Shop Name (e.g. Ramesh Grocery Store)"
                                    required
                                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm"
                                />

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-300 pointer-events-none">expand_more</span>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            required
                                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-600 outline-none appearance-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm"
                                        >
                                            <option value="">Business Category</option>
                                            <option value="1">Grocery Store</option>
                                            <option value="2">Bakery & Sweets</option>
                                            <option value="3">Restaurant / Cafe</option>
                                            <option value="4">Pharmacy</option>
                                            <option value="5">Fruits & Vegetables</option>
                                        </select>
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Business Phone Number"
                                        required
                                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm tabular-nums"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <span className="material-symbols-rounded text-primary font-black">location_on</span>
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">Store Location</h2>
                            </div>

                            <div className="grid gap-6">
                                <input
                                    type="text"
                                    name="town"
                                    value={formData.town}
                                    onChange={handleChange}
                                    placeholder="Town / Area (e.g. Indiranagar)"
                                    required
                                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm"
                                />
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Full Physical Store Address"
                                    required
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 font-extrabold text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all resize-none shadow-sm leading-relaxed"
                                />
                            </div>
                        </section>
                    </div>

                    {/* Error Box */}
                    {error && (
                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-500 font-black text-xs text-center flex items-center justify-center gap-3 animate-shake">
                            <span className="material-symbols-rounded">error</span>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 bg-slate-900 text-white rounded-2xl text-base font-black tracking-widest shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 group"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>INITIALIZE SHOP</span>
                                <span className="material-symbols-rounded group-hover:translate-x-2 transition-transform">rocket_launch</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-[10px]">
                        Trusted by 500+ Local Merchants
                    </p>
                </div>
            </div>
        </div>
    )
}
