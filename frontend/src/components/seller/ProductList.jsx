import { useState, useEffect } from 'react'
import { productsApi } from '../../lib/api'

export default function ProductList({ shop, onAddProduct, onEditProduct }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadProducts()
    }, [shop.id])

    const loadProducts = async () => {
        setLoading(true)
        const data = await productsApi.getProducts(shop.id)
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
    }

    const handleToggleStock = async (productId) => {
        await productsApi.toggleStock(productId)
        loadProducts()
    }

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            await productsApi.deleteProduct(productId)
            loadProducts()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="text-xl">⏳ Loading products...</span>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventory</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Manage your shop items & availability</p>
                </div>
                <button
                    onClick={onAddProduct}
                    className="w-full md:w-auto h-12 bg-slate-900 text-white px-8 rounded-2xl font-extrabold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <span className="material-symbols-rounded">add</span>
                    <span>NEW PRODUCT</span>
                </button>
            </div>

            {products.length === 0 ? (
                /* Empty State consistent with Orders */
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 py-20 px-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-rounded text-5xl text-slate-300">inventory_2</span>
                    </div>
                    <p className="text-gray-900 font-extrabold text-2xl tracking-tight mb-2">No products added yet</p>
                    <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto">Start by adding your first product for customers to see in your shop</p>
                    <button
                        onClick={onAddProduct}
                        className="bg-primary text-white px-10 py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                    >
                        + ADD FIRST PRODUCT
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 transition-all group hover:border-primary/20 ${!product.in_stock ? 'opacity-80 bg-slate-50/50' : ''}`}
                        >
                            {/* Product Image */}
                            <div className="w-28 h-28 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-sm">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <span className="material-symbols-rounded text-4xl text-slate-200">image</span>
                                )}
                                {!product.in_stock && (
                                    <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-[1px] flex items-center justify-center">
                                        <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">Out of Stock</span>
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                    <h3 className="font-extrabold text-xl text-slate-900 tracking-tight truncate">{product.name}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-2">
                                        <span className="text-xl font-black text-primary tabular-nums">₹{product.price}</span>
                                        {product.discount_price && (
                                            <span className="text-slate-300 line-through text-xs font-bold tabular-nums">₹{product.price}</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-slate-400 text-xs font-semibold line-clamp-2 leading-relaxed max-w-md mx-auto md:mx-0">
                                    {product.description || 'No description provided'}
                                </p>
                            </div>

                            {/* Refined Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleToggleStock(product.id)}
                                    className={`h-11 px-5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-1 md:flex-none justify-center ${product.in_stock
                                        ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                                        : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${product.in_stock ? 'bg-primary animate-pulse' : 'bg-rose-500'}`} />
                                    {product.in_stock ? 'In Stock' : 'Out of Stock'}
                                </button>

                                <button
                                    onClick={() => onEditProduct(product)}
                                    className="w-11 h-11 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 rounded-xl flex items-center justify-center transition-all shadow-sm"
                                    title="Edit Product"
                                >
                                    <span className="material-symbols-rounded text-xl">edit</span>
                                </button>

                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="w-11 h-11 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 rounded-xl flex items-center justify-center transition-all shadow-sm"
                                    title="Delete Product"
                                >
                                    <span className="material-symbols-rounded text-xl">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
