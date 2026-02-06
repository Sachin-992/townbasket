import { useState, useRef } from 'react'
import { productsApi, storageApi } from '../../lib/api'

export default function ProductForm({ shop, product, onSave, onCancel }) {
    const isEditing = !!product
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        image_url: product?.image_url || '',
        in_stock: product?.in_stock ?? true,
    })

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        setError('')
        try {
            const result = await storageApi.uploadImage(file, 'products', `shop-${shop.id}`)
            setFormData(prev => ({ ...prev, image_url: result.url }))
        } catch (err) {
            console.error('Upload failed:', err)
            setError('Photo upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const productData = {
                ...formData,
                shop: shop.id,
                price: parseFloat(formData.price),
                // Defaulting hidden legacy fields to maintain compatibility if needed
                unit: 'piece',
                unit_quantity: 1,
            }

            let result
            if (isEditing) {
                result = await productsApi.updateProduct(product.id, productData)
            } else {
                result = await productsApi.createProduct(productData)
            }

            if (result.error) {
                setError(result.error)
            } else {
                onSave(result)
            }
        } catch (err) {
            setError('Failed to save product. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 max-w-2xl mx-auto">
            {/* Header Section */}
            <div className="bg-primary px-8 py-10 text-white relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <button
                        onClick={onCancel}
                        className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all backdrop-blur-md border border-white/10 group"
                    >
                        <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight leading-none">
                            {isEditing ? 'Update Product' : 'Add New Item'}
                        </h2>
                        <p className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-2">
                            {isEditing ? 'Syncing changes to store' : 'Publishing to shop inventory'}
                        </p>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-black/5 rounded-full blur-3xl" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Media Upload */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PRODUCT MEDIA</label>
                        {formData.image_url && <span className="text-[10px] font-bold text-primary">UPLOADED ✅</span>}
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-video md:aspect-[21/9] rounded-[1.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group ${formData.image_url ? 'border-primary/20 bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-primary hover:bg-white'
                            }`}
                    >
                        {formData.image_url ? (
                            <>
                                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2">
                                        <span className="material-symbols-rounded text-lg">image_search</span>
                                        REPLACE IMAGE
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                <span className="material-symbols-rounded text-5xl text-slate-300 mb-2">add_a_photo</span>
                                <p className="font-extrabold text-slate-700 text-sm tracking-tight">Add Product Photo</p>
                                <p className="text-slate-400 font-bold text-[9px] mt-1 uppercase tracking-widest">JPG, PNG up to 5MB</p>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        {uploading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="font-black text-primary text-[10px] uppercase tracking-[0.2em] animate-pulse">OPTIMIZING...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">ITEM NAME</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g., Fresh Organic Tomatoes"
                            required
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm"
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">PRICE (₹)</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-primary">₹</span>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                                min="0"
                                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 font-black text-lg text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all shadow-sm tabular-nums"
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">DESCRIPTION (OPTIONAL)</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Detail the product quality, weight, or special notes..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all resize-none leading-relaxed shadow-sm"
                    />
                </div>

                {/* Stock Toggle */}
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${formData.in_stock ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                            <span className="material-symbols-rounded text-2xl">
                                {formData.in_stock ? 'check_circle' : 'cancel'}
                            </span>
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-sm tracking-tight leading-none mb-1.5">Availability Status</p>
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Visibility to customers</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="in_stock"
                            checked={formData.in_stock}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-16 h-8 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-8 shadow-inner" />
                    </label>
                </div>

                {/* Error Box */}
                {error && (
                    <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 font-black text-xs text-center flex items-center justify-center gap-2">
                        <span className="material-symbols-rounded">error</span>
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 h-14 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95"
                    >
                        DISCARD
                    </button>
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-widest shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-rounded text-xl group-hover:scale-110 transition-transform">auto_awesome</span>
                                {isEditing ? 'SYNC UPDATES' : 'PUBLISH ITEM'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
