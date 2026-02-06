import { useState, useEffect } from 'react'
import { shopsApi } from '../../lib/api' // Using shopsApi as categories are part of shops app

export default function AdminCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', icon: '' })
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        setLoading(true)
        try {
            const data = await shopsApi.getCategories()
            setCategories(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error loading categories:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingId) {
                // await shopsApi.updateCategory(editingId, formData) // Assuming API exists or we add it
                alert('Edit feature coming soon')
            } else {
                // await shopsApi.createCategory(formData)
                alert('Create feature coming soon')
            }
            setIsModalOpen(false)
            loadCategories()
            setFormData({ name: '', icon: '' })
            setEditingId(null)
        } catch (err) {
            console.error('Error saving category:', err)
        }
    }

    const openEdit = (category) => {
        setFormData({ name: category.name, icon: category.icon })
        setEditingId(category.id)
        setIsModalOpen(true)
    }

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500">Manage business types and catalog sections.</p>
                </div>
                <button
                    onClick={() => { setFormData({ name: '', icon: '' }); setEditingId(null); setIsModalOpen(true) }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                >
                    + Add Category
                </button>
            </header>

            {loading ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    Loading Categories...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                        <div key={category.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-2xl group-hover:bg-indigo-50 transition-colors">
                                    {category.icon || '🏷️'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{category.name}</h3>
                                    <p className="text-xs text-gray-500">{category.is_active ? 'Active' : 'Disabled'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => openEdit(category)}
                                className="text-gray-400 hover:text-indigo-600 p-2"
                            >
                                ✏️
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Category' : 'New Category'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                                <input
                                    type="text"
                                    className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.icon}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Save
                                </button>
                            </div>
                            <p className="text-xs text-center text-rose-500 bg-rose-50 p-2 rounded">Note: Editing disabled in demo mode</p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
