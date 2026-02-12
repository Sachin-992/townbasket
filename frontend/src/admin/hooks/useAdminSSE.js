import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Admin real-time SSE hook.
 * Connects to /api/admin/sse/ and surfaces live events.
 *
 * @returns {{ events: Array, lastOrder: Object|null, todayRevenue: number, todayOrders: number, anomaly: Object|null, connected: boolean }}
 */
export function useAdminSSE() {
    const [events, setEvents] = useState([])
    const [lastOrder, setLastOrder] = useState(null)
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayOrders, setTodayOrders] = useState(0)
    const [anomaly, setAnomaly] = useState(null)
    const [connected, setConnected] = useState(false)
    const esRef = useRef(null)
    const reconnectTimer = useRef(null)

    const connect = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            if (!token) return

            // EventSource doesn't support custom headers natively,
            // so we pass the token as a query parameter.
            const url = `${API_BASE_URL}/admin/sse/?token=${encodeURIComponent(token)}`
            const es = new EventSource(url)
            esRef.current = es

            es.onopen = () => setConnected(true)

            es.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data)

                    setEvents(prev => [data, ...prev].slice(0, 100))

                    switch (data.type) {
                        case 'connected':
                            setConnected(true)
                            break
                        case 'new_order':
                            setLastOrder(data.order)
                            break
                        case 'revenue_tick':
                            setTodayRevenue(data.today_revenue)
                            setTodayOrders(data.today_orders)
                            break
                        case 'system_alert':
                            setAnomaly(data)
                            break
                        case 'timeout':
                            es.close()
                            setConnected(false)
                            // Auto-reconnect after 2s
                            reconnectTimer.current = setTimeout(connect, 2000)
                            break
                        default:
                            break
                    }
                } catch (parseErr) {
                    console.warn('SSE parse error:', parseErr)
                }
            }

            es.onerror = () => {
                es.close()
                setConnected(false)
                // Reconnect with backoff
                reconnectTimer.current = setTimeout(connect, 5000)
            }
        } catch (err) {
            console.error('SSE connection error:', err)
        }
    }, [])

    useEffect(() => {
        connect()
        return () => {
            if (esRef.current) esRef.current.close()
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
        }
    }, [connect])

    const dismiss = useCallback(() => setAnomaly(null), [])

    return {
        events,
        lastOrder,
        todayRevenue,
        todayOrders,
        anomaly,
        connected,
        dismissAnomaly: dismiss,
    }
}
