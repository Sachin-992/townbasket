import { useState, useEffect } from 'react'
import { settingsApi } from '../../lib/api'

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        is_open_for_delivery: true,
        night_orders_enabled: false,
        cod_enabled: true,
        default_delivery_charge: 20
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await settingsApi.getSettings()
            if (data) setSettings(data)
        } catch (err) {
            console.error('Error loading settings:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (key) => {
        const newValue = !settings[key]

        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }))

        try {
            await settingsApi.updateSettings({ [key]: newValue })
        } catch (err) {
            console.error('Error updating settings:', err)
            // Revert on error
            setSettings(prev => ({ ...prev, [key]: !newValue }))
            alert('Failed to update setting')
        }
    }

    const handleNumberChange = async (e) => {
        const value = e.target.value
        setSettings(prev => ({ ...prev, default_delivery_charge: value }))
    }

    const saveDeliveryCharge = async () => {
        setSaving(true)
        try {
            await settingsApi.updateSettings({ default_delivery_charge: settings.default_delivery_charge })
            alert('Delivery charge updated')
        } catch (err) {
            console.error('Error saving delivery charge:', err)
            alert('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const ToggleCard = ({ label, description, checked, onChange, icon }) => (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{label}</h3>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
        </div>
    )

    if (loading) return (
        <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            Loading Settings...
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Town Settings</h1>
                <p className="text-gray-500">Manage global configurations for {settings.town_name || 'TownBasket'}.</p>
            </header>

            <div className="space-y-6">
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Operations</h2>
                    <div className="grid gap-4">
                        <ToggleCard
                            icon="🚚"
                            label="Town Delivery Active"
                            description="Master switch to enable/disable all new delivery orders."
                            checked={settings.is_open_for_delivery}
                            onChange={() => handleToggle('is_open_for_delivery')}
                        />
                        <ToggleCard
                            icon="🌙"
                            label="Night Orders"
                            description="Allow orders to be placed after 10:00 PM."
                            checked={settings.night_orders_enabled}
                            onChange={() => handleToggle('night_orders_enabled')}
                        />
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Payment & Finance</h2>
                    <div className="grid gap-4">
                        <ToggleCard
                            icon="💵"
                            label="Cash on Delivery (COD)"
                            description="Allow customers to pay with cash upon delivery."
                            checked={settings.cod_enabled}
                            onChange={() => handleToggle('cod_enabled')}
                        />

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
                                    💰
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Base Delivery Charge</h3>
                                    <p className="text-xs text-gray-500">Default fee applied to all orders.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                                    <input
                                        type="number"
                                        value={settings.default_delivery_charge}
                                        onChange={handleNumberChange}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={saveDeliveryCharge}
                                    disabled={saving}
                                    className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
