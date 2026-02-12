import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useAdminData'
import { adminSettingsApi } from '../api/adminApi'
import { useToast } from '../../context/ToastContext'
import { useQueryClient } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
    const { data: settings, isLoading } = useSettings()
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)
    const toast = useToast()
    const qc = useQueryClient()

    useEffect(() => {
        if (settings) setForm(settings)
    }, [settings])

    const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

    const handleSave = async () => {
        setSaving(true)
        try {
            await adminSettingsApi.update(form)
            toast.success('Settings saved')
            qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
        } catch (e) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Town configuration</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                <SettingRow label="Town Name" description="Display name for your town">
                    <input
                        type="text"
                        value={form.town_name || ''}
                        onChange={e => handleChange('town_name', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                </SettingRow>

                <SettingRow label="Delivery Charge" description="Default delivery fee (₹)">
                    <input
                        type="number"
                        value={form.delivery_charge ?? ''}
                        onChange={e => handleChange('delivery_charge', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                </SettingRow>

                <SettingRow label="Free Delivery Threshold" description="Minimum order amount for free delivery (₹)">
                    <input
                        type="number"
                        value={form.free_delivery_threshold ?? ''}
                        onChange={e => handleChange('free_delivery_threshold', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                </SettingRow>

                <SettingRow label="Platform Active" description="Enable/disable the entire platform">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_active ?? true}
                            onChange={e => handleChange('is_active', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-500 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </SettingRow>
            </div>
        </div>
    )
}

function SettingRow({ label, description, children }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
            </div>
            <div className="md:w-64">{children}</div>
        </div>
    )
}
