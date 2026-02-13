import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Backoff config ──────────────────────────────
const BACKOFF_BASE = 2000     // 2s initial
const BACKOFF_MAX = 30000     // 30s cap
const BACKOFF_FACTOR = 2

/**
 * Admin real-time SSE hook — production-grade.
 *
 * Features:
 *   - Exponential backoff (2s → 4s → 8s → 16s → 30s max)
 *   - Visibility-based pausing (closes when tab hidden, reconnects on visible)
 *   - System health state from SSE health_status events
 *   - Unified alert center (fraud + anomaly + complaint spikes)
 *   - Last event ID dedup on reconnect
 *   - BroadcastChannel for multi-tab dedup
 *   - Clean disconnection on page unload
 *
 * @returns {Object} SSE state and controls
 */
export function useAdminSSE() {
    const [events, setEvents] = useState([])
    const [lastOrder, setLastOrder] = useState(null)
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayOrders, setTodayOrders] = useState(0)
    const [anomaly, setAnomaly] = useState(null)
    const [fraudAlerts, setFraudAlerts] = useState([])
    const [connected, setConnected] = useState(false)
    const [systemHealth, setSystemHealth] = useState(null)
    const [alerts, setAlerts] = useState([]) // unified alert center
    const [connectionCount, setConnectionCount] = useState(0)

    const esRef = useRef(null)
    const reconnectTimer = useRef(null)
    const retryCount = useRef(0)
    const lastEventId = useRef(null)
    const isLeader = useRef(false)
    const broadcastRef = useRef(null)
    const intentionalClose = useRef(false)

    // ── Push alert to unified center ────────────
    const pushAlert = useCallback((alert) => {
        setAlerts(prev => {
            // Dedup by id or message
            const key = alert.id || alert.message
            if (prev.some(a => (a.id || a.message) === key)) return prev
            return [{ ...alert, read: false, timestamp: Date.now() }, ...prev].slice(0, 50)
        })
    }, [])

    // ── Process SSE event ───────────────────────
    const processEvent = useCallback((data) => {
        setEvents(prev => [data, ...prev].slice(0, 100))

        switch (data.type) {
            case 'connected':
                setConnected(true)
                retryCount.current = 0
                break

            case 'new_order':
                setLastOrder(data.order)
                break

            case 'revenue_update':
                setTodayRevenue(data.today_revenue)
                setTodayOrders(data.today_orders)
                break

            case 'system_alert':
                setAnomaly(data)
                pushAlert({
                    id: `anomaly-${Date.now()}`,
                    type: 'anomaly',
                    severity: data.severity || 'warning',
                    title: 'Order Spike Detected',
                    message: data.message,
                })
                break

            case 'fraud_alert':
                setFraudAlerts(prev => [data.alert, ...prev].slice(0, 20))
                pushAlert({
                    id: `fraud-${data.alert.id}`,
                    type: 'fraud',
                    severity: data.alert.severity || 'warning',
                    title: data.alert.title || 'Fraud Alert',
                    message: data.alert.description || '',
                })
                break

            case 'complaint_spike':
                pushAlert({
                    id: `complaint-${Date.now()}`,
                    type: 'complaint',
                    severity: 'warning',
                    title: 'Complaint Spike',
                    message: data.message,
                })
                break

            case 'health_status':
                setSystemHealth({
                    status: data.status,
                    db: data.db,
                    cache: data.cache_status,
                })
                break

            case 'heartbeat':
                setConnectionCount(data.connections || 0)
                break

            case 'timeout':
                // Will auto-reconnect (retry: header or manual)
                break

            default:
                break
        }
    }, [pushAlert])

    // ── Connect to SSE ──────────────────────────
    const connect = useCallback(async () => {
        if (esRef.current && esRef.current.readyState !== EventSource.CLOSED) return

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            if (!token) return

            intentionalClose.current = false
            let url = `${API_BASE_URL}/admin/sse/?token=${encodeURIComponent(token)}`
            if (lastEventId.current) {
                url += `&lastEventId=${lastEventId.current}`
            }

            const es = new EventSource(url)
            esRef.current = es

            es.onopen = () => {
                setConnected(true)
                retryCount.current = 0
                isLeader.current = true

                // Announce leadership to other tabs
                if (broadcastRef.current) {
                    broadcastRef.current.postMessage({ type: 'leader', tabId: Date.now() })
                }
            }

            es.onmessage = (e) => {
                try {
                    // Track last event ID for reconnect dedup
                    if (e.lastEventId) lastEventId.current = e.lastEventId

                    const data = JSON.parse(e.data)
                    processEvent(data)

                    // Broadcast to other tabs
                    if (broadcastRef.current) {
                        broadcastRef.current.postMessage({ type: 'sse_event', data })
                    }
                } catch {
                    // Parse error — silently ignored
                }
            }

            es.onerror = () => {
                es.close()
                esRef.current = null
                setConnected(false)

                if (intentionalClose.current) return

                // Exponential backoff
                const delay = Math.min(
                    BACKOFF_BASE * Math.pow(BACKOFF_FACTOR, retryCount.current),
                    BACKOFF_MAX
                )
                retryCount.current++
                reconnectTimer.current = setTimeout(connect, delay)
            }
        } catch (err) {
            console.error('SSE connection error:', err)
        }
    }, [processEvent])

    // ── Disconnect cleanly ──────────────────────
    const disconnect = useCallback(() => {
        intentionalClose.current = true
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current)
            reconnectTimer.current = null
        }
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }
        setConnected(false)
    }, [])

    // ── Lifecycle ───────────────────────────────
    useEffect(() => {
        // Set up BroadcastChannel for multi-tab dedup
        try {
            const bc = new BroadcastChannel('admin-sse')
            broadcastRef.current = bc

            bc.onmessage = (e) => {
                const msg = e.data
                if (msg.type === 'sse_event' && !isLeader.current) {
                    // Follower tab receives events from leader
                    processEvent(msg.data)
                    setConnected(true)
                }
                if (msg.type === 'leader' && isLeader.current) {
                    // Another tab became leader — close our connection
                    disconnect()
                    isLeader.current = false
                }
            }
        } catch {
            // BroadcastChannel not supported — single-tab mode
        }

        // ── Visibility-based pausing ────────────
        const handleVisibility = () => {
            if (document.hidden) {
                disconnect()
            } else {
                connect()
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)

        // ── Clean disconnection on unload ───────
        const handleUnload = () => disconnect()
        window.addEventListener('beforeunload', handleUnload)

        // ── Initial connect ─────────────────────
        if (!document.hidden) connect()

        return () => {
            disconnect()
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('beforeunload', handleUnload)
            if (broadcastRef.current) {
                broadcastRef.current.close()
                broadcastRef.current = null
            }
        }
    }, [connect, disconnect, processEvent])

    // ── Alert center controls ───────────────────
    const dismissAnomaly = useCallback(() => setAnomaly(null), [])
    const clearFraudAlert = useCallback((id) =>
        setFraudAlerts(prev => prev.filter(a => a.id !== id)),
        [])
    const markAlertRead = useCallback((id) =>
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)),
        [])
    const dismissAlert = useCallback((id) =>
        setAlerts(prev => prev.filter(a => a.id !== id)),
        [])
    const clearAllAlerts = useCallback(() => setAlerts([]), [])

    const unreadCount = alerts.filter(a => !a.read).length

    return {
        // Event stream
        events,
        connected,

        // Live data
        lastOrder,
        todayRevenue,
        todayOrders,

        // System health
        systemHealth,
        connectionCount,

        // Anomaly
        anomaly,
        dismissAnomaly,

        // Fraud
        fraudAlerts,
        clearFraudAlert,

        // Alert center
        alerts,
        unreadCount,
        markAlertRead,
        dismissAlert,
        clearAllAlerts,
    }
}
