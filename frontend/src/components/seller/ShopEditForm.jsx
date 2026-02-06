import { useState, useRef } from 'react'
import { shopsApi, storageApi } from '../../lib/api'

export default function ShopEditForm({ shop, onSave, onCancel }) {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)
    const bannerInputRef = useRef(null)

    const [formData, setFormData] = useState({
        name: shop.name || '',
        description: shop.description || '',
        town: shop.town || '',
        address: shop.address || '',
        phone: shop.phone || '',
        whatsapp: shop.whatsapp || '',
        opening_time: shop.opening_time || '09:00',
        closing_time: shop.closing_time || '21:00',
        logo_url: shop.logo_url || '',
        banner_url: shop.banner_url || '',
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        setError('')
        try {
            const result = await storageApi.uploadImage(file, 'shops', `logo-${shop.id}`)
            setFormData(prev => ({ ...prev, logo_url: result.url }))
        } catch (err) {
            console.error('Logo upload failed:', err)
            setError('Logo upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const handleBannerChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploadingBanner(true)
        setError('')
        try {
            const result = await storageApi.uploadImage(file, 'shops', `banner-${shop.id}`)
            setFormData(prev => ({ ...prev, banner_url: result.url }))
        } catch (err) {
            console.error('Banner upload failed:', err)
            setError('Banner upload failed. Please try again.')
        } finally {
            setUploadingBanner(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await shopsApi.updateShop(shop.id, formData)
            if (result.error) {
                setError(result.error)
            } else {
                onSave(result)
            }
        } catch (err) {
            setError('Failed to update shop. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 max-w-2xl mx-auto font-display antialiased">
            {/* Header */}
            <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <button
                        onClick={onCancel}
                        className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 group"
                    >
                        <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight leading-none">Edit Shop Profile</h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Update store information & identity</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Banner Upload Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SHOP BANNER</label>
                        {formData.banner_url && <span className="text-[10px] font-bold text-emerald-600">UPLOADED ✅</span>}
                    </div>
                    <div
                        onClick={() => bannerInputRef.current?.click()}
                        className={`aspect-[21/9] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group ${formData.banner_url
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50 hover:border-primary hover:bg-white'
                            }`}
                    >
                        {formData.banner_url ? (
                            <>
                                <img src={formData.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2">
                                        <span className="material-symbols-rounded text-lg">image_search</span>
                                        CHANGE BANNER
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">add_photo_alternate</span>
                                <p className="font-extrabold text-slate-700 text-sm">Add Shop Banner</p>
                                <p className="text-slate-400 font-bold text-[9px] mt-1 uppercase tracking-widest">Recommended: 1200x400 pixels</p>
                            </div>
                        )}
                        {uploadingBanner && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="font-black text-primary text-[10px] uppercase tracking-[0.2em] animate-pulse">UPLOADING...</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={bannerInputRef} onChange={handleBannerChange} className="hidden" accept="image/*" />
                </div>

                {/* Logo Section */}
                <div className="flex flex-col items-center gap-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-all group relative"
                    >
                        {formData.logo_url ? (
                            <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-rounded text-3xl text-slate-300">storefront</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-rounded text-white">edit</span>
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Shop Identity Icon</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Shop Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Area / Town</label>
                        <input
                            name="town"
                            value={formData.town}
                            onChange={handleChange}
                            required
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Address</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Phone Number</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all tabular-nums"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Business Hours</label>
                        <div className="flex gap-2">
                            <input
                                name="opening_time"
                                type="time"
                                value={formData.opening_time}
                                onChange={handleChange}
                                className="flex-1 h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-extrabold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                            <input
                                name="closing_time"
                                type="time"
                                value={formData.closing_time}
                                onChange={handleChange}
                                className="flex-1 h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-extrabold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-xs font-black text-center border border-rose-100 flex items-center justify-center gap-2">
                        <span className="material-symbols-rounded">error</span>
                        {error}
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 h-14 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 active:scale-95 transition-all"
                    >
                        DISCARD
                    </button>
                    <button
                        type="submit"
                        disabled={loading || uploading || uploadingBanner}
                        className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-widest hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-rounded">save</span>
                                SAVE CHANGES
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
