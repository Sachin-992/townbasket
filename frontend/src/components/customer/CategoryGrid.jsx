import { Link } from 'react-router-dom'

const categories = [
    { id: 'grocery', name: 'Grocery', icon: '🛒', bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/20' },
    { id: 'bakery', name: 'Bakery', icon: '🥐', bg: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20' },
    { id: 'restaurant', name: 'Food', icon: '🍔', bg: 'from-red-400 to-rose-500', shadow: 'shadow-red-500/20' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊', bg: 'from-blue-400 to-indigo-500', shadow: 'shadow-blue-500/20' },
    { id: 'vegetables', name: 'Vegetables', icon: '🥬', bg: 'from-green-400 to-emerald-500', shadow: 'shadow-green-500/20' },
    { id: 'dairy', name: 'Dairy', icon: '🥛', bg: 'from-sky-400 to-cyan-500', shadow: 'shadow-sky-500/20' },
    { id: 'meat', name: 'Meat', icon: '🥩', bg: 'from-rose-400 to-pink-500', shadow: 'shadow-rose-500/20' },
    { id: 'general', name: 'More', icon: '📦', bg: 'from-purple-400 to-violet-500', shadow: 'shadow-purple-500/20' },
]

export default function CategoryGrid() {
    return (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
            {categories.map((cat) => (
                <Link
                    key={cat.id}
                    to={`/customer/shops?category=${cat.id}`}
                    className="flex flex-col items-center group"
                >
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${cat.bg} flex items-center justify-center mb-1.5 sm:mb-2 transition-all duration-300 group-hover:scale-110 group-active:scale-95 shadow-lg ${cat.shadow}`}>
                        <span className="text-2xl sm:text-3xl lg:text-4xl filter drop-shadow-sm">{cat.icon}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 group-hover:text-emerald-600 transition-colors text-center">
                        {cat.name}
                    </span>
                </Link>
            ))}
        </div>
    )
}
