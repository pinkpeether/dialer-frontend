import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import {
  Phone, PhoneOff, Mic, MicOff, Play, Square,
  Power, Sparkles, Search, ChevronUp, ChevronDown, Activity, AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { dialerAPI }    from '../api/dialer.api'
import { agentsAPI } from '../api/agents.api'
import { callsAPI }     from '../api/calls.api'
import { campaignsAPI } from '../api/campaigns.api'
import { contactsAPI }  from '../api/contacts.api'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import FloatingDialer from '../components/FloatingDialer'
import SipActiveCallOverlay from '../components/SipActiveCallOverlay'
import CallDispositionModal from '../components/CallDispositionModal'
import DynamicCallerIdDialerSelector from '../components/DynamicCallerIdDialerSelector'
import AgentCallScriptPanel from '../components/AgentCallScriptPanel'
import { useToast } from '../hooks/useToast'
import { getSocketUrl } from '../utils/socketUrl'
import { SOCKET_EVENTS } from '../constants/socketEvents'


type DispositionRequest = {
  callId?: number | string | null
  name?: string | null
  phone?: string | null
  saveMode?: 'backend' | 'preview'
}

type VoiceDeskActivity = {
  label: string
  active: boolean
}

type AgentDialerStatus = 'ONLINE' | 'READY' | 'BUSY' | 'WRAP_UP' | 'OFFLINE'

const normalizeAgentDialerStatus = (status?: unknown): AgentDialerStatus => {
  const next = String(status || '').toUpperCase()
  return (['ONLINE', 'READY', 'BUSY', 'WRAP_UP', 'OFFLINE'] as AgentDialerStatus[]).includes(next as AgentDialerStatus)
    ? (next as AgentDialerStatus)
    : 'ONLINE'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function callIdValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : trimmed
  }
  return null
}

function extractManualCallRecord(result: unknown) {
  const payload = isRecord(result) ? result : {}
  const record =
    (isRecord(payload.callRecord) && payload.callRecord) ||
    (isRecord(payload.call) && payload.call) ||
    (isRecord(payload.record) && payload.record) ||
    payload

  return {
    id: callIdValue(
      record.id ??
      record._id ??
      record.callId ??
      record.callID ??
      record.callRecordId ??
      record.recordId ??
      payload.id ??
      payload._id ??
      payload.callId ??
      payload.callRecordId,
    ),
    callSid: String(
      record.providerCallId ||
      record.callSid ||
      record.sid ||
      payload.providerCallId ||
      payload.callSid ||
      payload.sid ||
      '',
    ),
  }
}

function getItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of ['items', 'calls', 'results', 'data']) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  return []
}

function normalizePhone(value: unknown) {
  return String(value || '').replace(/[^\d+]/g, '')
}

async function recoverCallIdFromHistory(callSid: string, phone: string | null) {
  try {
    const payload = await callsAPI.getAll({ page: 1, limit: 15 }, { timeout: 10000 })
    const normalizedPhone = normalizePhone(phone)

    for (const item of getItems(payload)) {
      if (!isRecord(item)) continue

      const itemSid = String(item.providerCallId || item.callSid || item.sid || '')
      const itemPhone = normalizePhone(item.remoteNumber || item.phone || item.phoneNumber || item.to || item.from || item.destination)
      const sidMatches = Boolean(callSid && itemSid && itemSid === callSid)
      const phoneMatches = Boolean(normalizedPhone && itemPhone && itemPhone === normalizedPhone)

      if (sidMatches || phoneMatches) {
        return callIdValue(item.id ?? item._id ?? item.callId ?? item.callRecordId)
      }
    }
  } catch {
    // Call history lookup is best-effort; the live call flow should keep moving.
  }

  return null
}

function NoticeModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10040,
            background: 'rgba(3,2,8,0.56)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            style={{
              width: 'min(430px, 94vw)',
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'linear-gradient(150deg,rgba(8,5,18,0.985),rgba(16,10,30,0.97))',
              color: '#f9f7ff',
              boxShadow: '0 18px 48px rgba(0,0,0,0.46)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 15,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  color: '#ffd27a',
                  background: 'rgba(240,185,11,0.12)',
                  border: '1px solid rgba(240,185,11,0.34)',
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="display" style={{ fontSize: 16, fontWeight: 850, color: '#fff' }}>
                  {title}
                </div>
                <div style={{ marginTop: 7, fontSize: 13, color: 'rgba(249,247,255,0.68)', lineHeight: 1.55 }}>
                  {message}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                height: 40,
                marginTop: 18,
                borderRadius: 999,
                border: '1px solid rgba(251,11,140,0.54)',
                background: 'rgba(251,11,140,0.88)',
                color: '#fff',
                fontWeight: 900,
                letterSpacing: 0.8,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Okay
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Dialer() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [campaigns,    setCampaigns]    = useState<Record<string,unknown>[]>([])
  const [selectedCamp, setSelectedCamp] = useState<number | null>(null)
  const [contacts,     setContacts]     = useState<Record<string,unknown>[]>([])
  const [activeCall,   setActiveCall]   = useState<Record<string,unknown> | null>(null)
  const [isDialing,    setIsDialing]    = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [elapsed,      setElapsed]      = useState(0)
  const [agentStatus,  setAgentStatus]  = useState<AgentDialerStatus>(() => normalizeAgentDialerStatus(user?.status))
  const [loading,      setLoading]      = useState(false)
  const [message,      setMessage]      = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [search,       setSearch]       = useState('')
  const [voiceDeskOpen, setVoiceDeskOpen] = useState(true)
  const [voiceDeskActivity, setVoiceDeskActivity] = useState<VoiceDeskActivity>({
    label: 'Dialer idle',
    active: false,
  })
  const [lastCallId, setLastCallId] = useState<number | string | null>(null)
  const [dispositionOpen, setDispositionOpen] = useState(false)
  const [dispositionSaveMode, setDispositionSaveMode] = useState<'backend' | 'preview'>('backend')
  const [endingCall, setEndingCall] = useState(false)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const [dispositionContact, setDispositionContact] = useState<{
    name: string | null
    phone: string | null
  }>({ name: null, phone: null })
  const sipConfig = useSipStore(s => s.config)
  const sipStatus = useSipStore(s => s.status)
  const liveSipCall = useSipStore(s => s.activeCall)
  const sipCall = useSipStore(s => s.call)
  const sipHangup = useSipStore(s => s.hangup)
  const resetSipCallState = useSipStore(s => s.resetCallState)
  const setSipMuted = useSipStore(s => s.setMuted)
  const showSipDisposition = useSipStore(s => s.showSipDisposition)
  const pendingSipDisposition = useSipStore(s => s.pendingSipDisposition)
  const dismissSipDisposition = useSipStore(s => s.dismissSipDisposition)
  const sipModeEnabled = Boolean(sipConfig.enabled)
  const sipReady = sipModeEnabled && sipStatus === 'registered'
  const lastLiveSipCallRef = useRef<typeof liveSipCall>(null)
  const sipManualRoutingSeenRef = useRef(false)
  const wrapUpTimerRef = useRef<number | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const toast = useToast()
  void user

  const campaignOptions = campaigns
  const sourceContacts = selectedCamp ? contacts : []

  const fetchActiveCampaigns = useCallback(async () => {
    try {
      const d = await campaignsAPI.getAll({ status:'ACTIVE' })
      setCampaigns(d.campaigns || [])
      setMessage('')
    } catch {
      setCampaigns([])
      setMessage('Could not load active campaigns. Check backend connection.')
    }
  }, [])

  const fetchPendingContacts = useCallback(async (campaignId: number) => {
    try {
      const d = await contactsAPI.getAll({ campaignId, status:'PENDING', limit:100 })
      setContacts(d.contacts || [])
    } catch {
      setContacts([])
      setMessage('Could not load pending contacts for this campaign.')
    }
  }, [])

  useEffect(() => {
    void fetchActiveCampaigns()
  }, [fetchActiveCampaigns])

  useEffect(() => {
    if (!selectedCamp) return
    void fetchPendingContacts(selectedCamp)
  }, [fetchPendingContacts, selectedCamp])

  useEffect(() => {
    const token = localStorage.getItem('jd_token')
    if (!token) return

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const syncAgentDialerStatus = useCallback((next: AgentDialerStatus) => {
    if (wrapUpTimerRef.current && next !== 'WRAP_UP') {
      window.clearTimeout(wrapUpTimerRef.current)
      wrapUpTimerRef.current = null
    }
    setAgentStatus(next)
    updateUser({ status: next })
    socketRef.current?.emit(SOCKET_EVENTS.AGENT_STATUS, next)
    void agentsAPI.updateMyStatus(next)
      .then(() => socketRef.current?.emit(SOCKET_EVENTS.AGENT_STATUS, next))
      .catch(() => undefined)
  }, [updateUser])

  const startWrapUpStatus = useCallback(() => {
    syncAgentDialerStatus('WRAP_UP')
    if (wrapUpTimerRef.current) window.clearTimeout(wrapUpTimerRef.current)
    wrapUpTimerRef.current = window.setTimeout(() => {
      wrapUpTimerRef.current = null
      syncAgentDialerStatus('READY')
    }, 30_000)
  }, [syncAgentDialerStatus])

  useEffect(() => {
    return () => {
      if (wrapUpTimerRef.current) window.clearTimeout(wrapUpTimerRef.current)
    }
  }, [])

  const handleManualRefresh = useCallback(() => {
    void fetchActiveCampaigns()
    if (selectedCamp) void fetchPendingContacts(selectedCamp)
  }, [fetchActiveCampaigns, fetchPendingContacts, selectedCamp])

  useEffect(() => {
    if (!activeCall) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [activeCall])

  useEffect(() => {
    const callSid = String(activeCall?.callSid || '')
    if (!callSid.startsWith('sip:')) {
      sipManualRoutingSeenRef.current = false
      return
    }

    if (sipStatus === 'calling') {
      sipManualRoutingSeenRef.current = true
    }

    if (liveSipCall) {
      sipManualRoutingSeenRef.current = false
      return
    }

    const sipCallReturnedIdle =
      sipManualRoutingSeenRef.current &&
      callSid.startsWith('sip:') &&
      !liveSipCall &&
      !endingCall &&
      ['registered', 'configured', 'idle', 'ended'].includes(sipStatus)

    if (!sipCallReturnedIdle) return

    setActiveCall(null)
    sipManualRoutingSeenRef.current = false
    setElapsed(0)
    setMuted(false)
    setLoading(false)
    setEndingCall(false)
    setMessage('SIP call declined or ended')
    startWrapUpStatus()
    toast.info('SIP call declined or ended')
  }, [activeCall, endingCall, liveSipCall, sipStatus, startWrapUpStatus, toast])

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const hiddenDeskStatus = liveSipCall
    ? { label: 'Call connected', active: true }
    : voiceDeskActivity.active
      ? voiceDeskActivity
      : activeCall
        ? { label: 'Call connected', active: true }
        : isDialing
          ? { label: 'Campaign running', active: true }
          : { label: 'Dialer idle', active: false }

  const sipLabel = sipConfig.enabled
    ? sipStatus === 'registered'
      ? 'SIP Registered'
      : sipStatus === 'in_call'
        ? 'SIP In Call'
        : sipStatus === 'calling'
          ? 'SIP Calling'
          : 'SIP Offline'
    : 'SIP Disabled'
  const sipColor = sipStatus === 'registered' || sipStatus === 'in_call' || sipStatus === 'calling'
    ? 'var(--green-2)'
    : 'var(--text-3)'

  const handleVoiceDeskActivityChange = useCallback((activity: VoiceDeskActivity) => {
    setVoiceDeskActivity(current =>
      current.label === activity.label && current.active === activity.active
        ? current
        : { label: activity.label, active: activity.active },
    )
  }, [])

  const handleActiveCallMuteToggle = useCallback(() => {
    const next = !muted
    setMuted(next)

    if (sipModeEnabled) {
      setSipMuted(next)
    }

    toast.info(next ? 'Microphone muted' : 'Microphone unmuted')
  }, [muted, setSipMuted, sipModeEnabled, toast])

  const openDispositionFromRequest = useCallback((request: DispositionRequest = {}) => {
    const callId = request.callId ?? `preview-${Date.now()}`
    const saveMode = request.saveMode ?? (request.callId ? 'backend' : 'preview')
    setLastCallId(callId)
    setDispositionSaveMode(saveMode)
    setDispositionContact({
      name: request.name ?? null,
      phone: request.phone ?? null,
    })
    setDispositionOpen(true)
  }, [])

  useEffect(() => {
    if (!showSipDisposition || !pendingSipDisposition) return

    openDispositionFromRequest({
      callId: pendingSipDisposition.callId,
      name: pendingSipDisposition.remoteIdentity || 'SIP Call',
      phone: pendingSipDisposition.remoteIdentity || null,
      saveMode: pendingSipDisposition.saveMode,
    })
    dismissSipDisposition()
  }, [dismissSipDisposition, openDispositionFromRequest, pendingSipDisposition, showSipDisposition])

  useEffect(() => {
    if (liveSipCall) {
      lastLiveSipCallRef.current = liveSipCall
      return
    }

    const endedSipCall = lastLiveSipCallRef.current
    if (endedSipCall && !dispositionOpen && !showSipDisposition) {
      openDispositionFromRequest({
        name: endedSipCall.remoteIdentity || 'SIP Call',
        phone: endedSipCall.remoteIdentity || null,
        saveMode: 'preview',
      })
    }

    lastLiveSipCallRef.current = null
  }, [dispositionOpen, liveSipCall, openDispositionFromRequest, showSipDisposition])

  const handleCampaignChange = (value: string) => {
    const nextCampaign = value ? Number(value) : null
    if ((isDialing || activeCall) && selectedCamp && nextCampaign !== selectedCamp) {
      setNotice({
        title: 'Campaign already in progress',
        message: 'Stop the current campaign before selecting another one.',
      })
      return
    }

    setSelectedCamp(nextCampaign)
    setContacts([])
    setSearch('')
    setMessage('')
  }

  const handleStartCampaign = async () => {
    if (!selectedCamp) { setMessage('Select a campaign first'); return }
    setLoading(true)
    try {
      await dialerAPI.startCampaign(selectedCamp)
      setIsDialing(true)
      setMessage('✓ Campaign dialing started')
      toast.success('Campaign dialing started')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not start campaign'
      setIsDialing(false)
      setMessage(errorMessage)
      toast.error(errorMessage)
    }
    finally {
      setLoading(false)
    }
  }

  const handleStopCampaign = async () => {
    if (!selectedCamp) return
    try {
      await dialerAPI.stopCampaign(selectedCamp)
      setIsDialing(false)
      setActiveCall(null)
      setLastCallId(null)
      setMessage('⏹ Campaign stopped')
      toast.warning('Campaign stopped')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not stop campaign'
      setMessage(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleManualCall = async (contact: Record<string,unknown>) => {
    if (!selectedCamp) return
    setLoading(true)
    setEndingCall(false)
    setLastCallId(null)
    setDispositionOpen(false)
    setDispositionSaveMode('backend')
    setDispositionContact({
      name: typeof contact.name === 'string' ? contact.name : null,
      phone: typeof contact.phone === 'string' ? contact.phone : null,
    })
    try {
      if (sipModeEnabled) {
        if (!sipReady) throw new Error('SIP mode is enabled but not registered')
        sipManualRoutingSeenRef.current = false
        await sipCall(String(contact.phone))
        setActiveCall({ ...contact, callSid: `sip:${contact.id}` })
        setLastCallId(null)
      } else {
        const result = await dialerAPI.makeManualCall(contact.id as number, selectedCamp)
        const callRecord = extractManualCallRecord(result)
        setActiveCall({ ...contact, callSid: callRecord.callSid })
        setLastCallId(callRecord.id)
      }
      syncAgentDialerStatus('BUSY')
      setMessage(`📞 Calling ${contact.phone}…`)
      toast.info(`Calling ${String(contact.name || contact.phone)}...`)
    } catch (err) {
      setActiveCall(null)
      setLastCallId(null)
      const errorMessage = err instanceof Error ? err.message : `📞 Calling ${contact.phone}…`
      setMessage(errorMessage)
      toast.error(errorMessage)
    }
    finally { setLoading(false) }
  }

  const handleHangup = async () => {
    if (!activeCall || endingCall) return
    const completedCall = activeCall
    const callSid = String(activeCall.callSid || '')
    const dispositionCallId = lastCallId
    const dispositionSnapshot = {
      name: typeof completedCall.name === 'string' ? completedCall.name : null,
      phone: typeof completedCall.phone === 'string' ? completedCall.phone : null,
    }
    const openDisposition = (callId: number | string, saveMode: 'backend' | 'preview') => {
      setLastCallId(callId)
      setDispositionSaveMode(saveMode)
      setDispositionContact(dispositionSnapshot)
      setDispositionOpen(true)
    }

    setEndingCall(true)
    setActiveCall(null)
    setElapsed(0)
    setMuted(false)
    setMessage('📵 Call ended')
    startWrapUpStatus()
    toast.info('Call ended')

    if (dispositionCallId) {
      openDisposition(dispositionCallId, 'backend')
    } else {
      openDisposition(`preview-${Date.now()}`, 'preview')
    }

    let recoveredDispositionCallId: number | string | null = null
    try {
      if (callSid.startsWith('sip:')) await sipHangup()
      else if (callSid) {
        const hangupResult = await dialerAPI.hangupCall(callSid)
        recoveredDispositionCallId = extractManualCallRecord(hangupResult).id
      }
    } catch {
      if (!dispositionCallId && callSid) {
        recoveredDispositionCallId = await recoverCallIdFromHistory(callSid, dispositionSnapshot.phone)
      }
    } finally {
      if (!dispositionCallId && recoveredDispositionCallId) {
        openDisposition(recoveredDispositionCallId, 'backend')
      }
      setEndingCall(false)
    }
  }

  const handleResetCallState = useCallback(() => {
    resetSipCallState()
    sipManualRoutingSeenRef.current = false
    setActiveCall(null)
    setElapsed(0)
    setMuted(false)
    setEndingCall(false)
    syncAgentDialerStatus('READY')
    setMessage('Call state reset locally')
    toast.warning('Call state reset locally')
  }, [resetSipCallState, syncAgentDialerStatus, toast])

  const filtered = sourceContacts.filter(c =>
    !search ||
    (c.name as string)?.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone as string)?.includes(search)
  )

  return (
    <>

      <style>{`
        @media (max-width: 900px) {
          .ptdt-dialer-page {
            width: 100% !important;
            max-width: 100vw !important;
            padding: 64px 10px 24px !important;
            overflow-x: hidden !important;
          }

          .ptdt-dialer-header {
            margin-bottom: 16px !important;
          }

          .ptdt-dialer-header-actions {
            width: 100% !important;
            justify-content: flex-start !important;
            overflow-x: auto !important;
            padding-bottom: 4px !important;
          }

          .ptdt-dialer-shell {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
            min-height: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .ptdt-dialer-control-card {
            position: relative !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 18px !important;
          }

          .ptdt-dialer-voice-section {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          .ptdt-dialer-voice-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 12px !important;
          }

          .ptdt-dialer-voice-header-actions {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .ptdt-dialer-voice-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 10px !important;
            min-height: 0 !important;
          }

          .ptdt-dialer-embedded-dialer,
          .ptdt-dialer-overlay-slot {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 0 !important;
          }

          .ptdt-dialer-overlay-slot {
            min-height: 220px !important;
            border-radius: 22px !important;
          }

          .ptdt-dialer-contacts-card {
            padding: 14px !important;
            overflow: hidden !important;
          }

          .ptdt-dialer-search-wrap {
            width: 100% !important;
            min-width: 0 !important;
          }
        }

        @media (max-width: 560px) {
          .ptdt-dialer-page {
            padding: 58px 8px 20px !important;
          }

          .ptdt-dialer-control-card {
            padding: 14px !important;
          }

          .ptdt-dialer-voice-grid {
            padding: 8px !important;
          }

          .ptdt-dialer-contacts-card {
            padding: 12px !important;
          }
        }
      `}</style>

    <div className="ptdt-dialer-page" style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      {/* PTDT Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="ptdt-dialer-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Sparkles size={11}/> PTDT-Dialer Live Desk
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.2vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.05,
            color: 'var(--text)',
            letterSpacing: '-0.04em',
            marginBottom: 10,
          }}>
            Dialer <span className="gradient-brand-text">Control</span>
          </h1>
          <p style={{
            fontSize: 14.5, color: 'var(--text-3)', display: 'flex',
            alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: 'var(--pink)',
                display: 'inline-block',
              }}
            /> PTDT-Dialer operator console for campaign dialing and manual calls.
          </p>
        </div>

        <div className="ptdt-dialer-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: sipColor,
                display: 'inline-block',
              }}
            />
            <div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>SIP</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: sipColor }}>{sipLabel}</div>
            </div>
          </div>

          <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: socketConnected ? 'var(--green-2)' : 'var(--pink)',
                display: 'inline-block',
              }}
            />
            <div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>REALTIME</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: socketConnected ? 'var(--green-2)' : 'var(--pink)' }}>
                {socketConnected ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh dialer data"
            style={{
              height: 42,
              width: 42,
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--bg-glass)',
              color: 'var(--text-3)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      <div className="ptdt-dialer-status-strip">
        <div className="ptdt-dialer-status-pill">
          <span style={{ background: sipColor }} />
          <div>
            <div className="mono">SIP</div>
            <strong style={{ color: sipColor }}>{sipLabel}</strong>
          </div>
        </div>
        <div className="ptdt-dialer-status-pill">
          <span style={{ background: socketConnected ? 'var(--green-2)' : 'var(--pink)' }} />
          <div>
            <div className="mono">REALTIME</div>
            <strong style={{ color: socketConnected ? 'var(--green-2)' : 'var(--pink)' }}>{socketConnected ? 'Online' : 'Offline'}</strong>
          </div>
        </div>
      </div>

      <div className="ptdt-dialer-page-desk-controls">
        <div className="ptdt-dialer-idle-pill">
          <span />
          {hiddenDeskStatus.label}
        </div>
        <button type="button" className="ptdt-hide-desk-pill" onClick={() => setVoiceDeskOpen(open => !open)}>
          {voiceDeskOpen ? 'Hide Desk' : 'Open Desk'}
        </button>
      </div>

      <div className="ptdt-dialer-shell" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 340px) minmax(0, 1fr)',
        gap: 20,
        minHeight: 'calc(100vh - 210px)',
      }}>

      <div className="ptdt-dialer-left-rail">
      {/* ============== LEFT — Control Panel ============== */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass ptdt-dialer-control-card"
        style={{
          padding: 22,
          display: 'flex', flexDirection: 'column', gap: 18,
          height: 'fit-content',
          position: 'sticky', top: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 18px rgba(251,11,140,0.16)',
          }}>
            <Phone size={18} color="#fff"/>
          </div>
          <div>
            <div className="display" style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}>
              PTDT-Dialer Control
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Protocol operator console
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8,
          }}>
            Agent Status
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => syncAgentDialerStatus(agentStatus === 'READY' ? 'ONLINE' : 'READY')}
            style={{
              width: '100%', padding: '12px 14px',
              background: agentStatus === 'READY' ? 'rgba(0,167,71,0.10)' : 'var(--bg-glass)',
              border: `1px solid ${agentStatus === 'READY' ? 'var(--green-2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: agentStatus === 'READY' ? 'var(--green-2)' : 'var(--text-3)',
              fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: agentStatus === 'READY' ? '0 0 10px rgba(0,167,71,0.14)' : 'none',
              transition: 'background 0.16s ease,border-color 0.16s ease,color 0.16s ease',
              letterSpacing: 0.4,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: agentStatus === 'READY' ? 'var(--green-2)' : 'var(--muted)',
              boxShadow: agentStatus === 'READY' ? '0 0 6px rgba(0,167,71,0.22)' : 'none',
            }} />
            {agentStatus === 'READY' ? 'READY' : agentStatus === 'WRAP_UP' ? 'WRAP-UP' : agentStatus === 'BUSY' ? 'BUSY' : 'NOT READY'}
          </motion.button>
        </div>

        {/* Campaign select */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8,
          }}>
            Campaign
          </div>
          <select
            value={selectedCamp ?? ''}
            onChange={e => handleCampaignChange(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--bg-glass-hi)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              fontSize: 13, outline: 'none',
              backdropFilter: 'none',
            }}
          >
            <option value="">— Select a campaign —</option>
            {campaignOptions.map(c => (
              <option key={c.id as number} value={c.id as number}>
                {c.name as string}
              </option>
            ))}
          </select>
        </div>

        {/* Active call card */}
        <AnimatePresence>
          {activeCall && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              style={{
                position: 'relative',
                background: 'rgba(0,167,71,0.08)',
                border: '1px solid var(--green-2)',
                borderRadius: 'var(--radius-lg)',
                padding: 18,
                boxShadow: '0 8px 20px rgba(0,0,0,0.10)',
                overflow: 'hidden',
              }}
            >
              {/* Pulse ring behind avatar */}
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 140, height: 140, borderRadius: '50%',
                background: 'rgba(0,167,71,0.08)',
                pointerEvents: 'none',
              }}/>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 10, fontWeight: 700, color: 'var(--green-2)',
                letterSpacing: 1.4, marginBottom: 10,
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--green-2)',
                  boxShadow: '0 0 6px rgba(0,167,71,0.22)',
                }} />
                Live Call
              </div>

              <div style={{
                fontSize: 16, fontWeight: 700, color: 'var(--text)',
                marginBottom: 2,
              }}>
                {activeCall.name as string || 'Unknown'}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
                {activeCall.phone as string}
              </div>

              <div className="display mono" style={{
                fontSize: 28, fontWeight: 700,
                color: 'var(--green-2)',
                textAlign: 'center', marginBottom: 14,
                fontVariantNumeric: 'tabular-nums',
                textShadow: 'none',
              }}>
                {fmt(elapsed)}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleActiveCallMuteToggle} style={{
                  flex: 1, padding: '10px',
                  background: muted ? 'rgba(239,68,68,0.12)' : 'var(--bg-glass-hi)',
                  border: `1px solid ${muted ? 'var(--danger)' : 'var(--green-2)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: muted ? 'var(--danger)' : 'var(--green-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 600,
                }}>
                  {muted ? <MicOff size={14}/> : <Mic size={14}/>}
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={handleHangup}
                  disabled={endingCall}
                  style={{
                  flex: 1, padding: '10px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 700,
                  boxShadow: '0 8px 18px rgba(239,68,68,0.16)',
                  opacity: endingCall ? 0.7 : 1,
                  cursor: endingCall ? 'wait' : 'pointer',
                }}>
                  <PhoneOff size={14}/> {endingCall ? 'Ending...' : 'Hang Up'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AgentCallScriptPanel
          activeCall={activeCall || liveSipCall || null}
          campaignName={String(campaignOptions.find(c => Number(c.id) === Number(selectedCamp))?.name || '')}
        />

        {/* Start / Stop */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={isDialing ? handleStopCampaign : handleStartCampaign}
          disabled={loading || agentStatus !== 'READY'}
          style={{
            width: '100%', padding: '13px',
            background: isDialing ? '#ef4444' : 'var(--grad-brand)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || agentStatus !== 'READY') ? 0.5 : 1,
            cursor: (loading || agentStatus !== 'READY') ? 'not-allowed' : 'pointer',
            boxShadow: isDialing ? '0 8px 18px rgba(239,68,68,0.16)' : '0 8px 18px rgba(251,11,140,0.16)',
            letterSpacing: 0.3,
          }}
        >
          {isDialing
            ? <><Square size={14} fill="#fff"/> Stop Campaign</>
            : <><Play size={14} fill="#fff"/> Start Campaign</>}
        </motion.button>

        {(activeCall || liveSipCall || endingCall) && (
          <button
            type="button"
            onClick={handleResetCallState}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239,68,68,0.34)',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--danger)',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={13} />
            Reset Call State
          </button>
        )}

        {agentStatus !== 'READY' && !isDialing && (
          <div style={{
            fontSize: 11.5, color: 'var(--warning)',
            textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px',
            background: 'rgba(240,185,11,0.12)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Power size={12}/> Set status to <b>Ready</b> to begin
          </div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            key={message}
            style={{
              fontSize: 12, color: 'var(--text-2)',
              textAlign: 'center', padding: '10px 12px',
              background: 'var(--bg-glass)',
              backdropFilter: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {message}
          </motion.div>
        )}
      </motion.aside>
      <DynamicCallerIdDialerSelector />
      </div>

      {/* ============== RIGHT — Embedded Voice Desk ============== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass ptdt-dialer-voice-section"
        style={{
          padding: 0,
          overflow: 'hidden',
          alignSelf: 'start',
          minHeight: voiceDeskOpen ? 398 : 62,
        }}
      >
        <div
          className="ptdt-dialer-voice-header"
          style={{
            minHeight: 62,
            padding: '13px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            borderBottom: voiceDeskOpen ? '1px solid var(--border)' : 'none',
            background: 'rgba(255,255,255,0.035)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.3,
                textTransform: 'uppercase',
                color: 'var(--pink)',
                marginBottom: 4,
              }}
            >
              Embedded voice desk
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Manual dialer and live SIP controls stay anchored inside this workspace.
            </div>
          </div>

          <div className="ptdt-dialer-voice-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {!voiceDeskOpen && (
              <div
                style={{
                  height: 34,
                  borderRadius: 999,
                  border: hiddenDeskStatus.active
                    ? '1px solid rgba(255,59,95,0.50)'
                    : '1px solid rgba(0,245,160,0.34)',
                  background: hiddenDeskStatus.active
                    ? 'rgba(255,59,95,0.12)'
                    : 'rgba(0,245,160,0.10)',
                  color: hiddenDeskStatus.active ? '#ff9caf' : 'var(--green-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px',
                  fontSize: 10.5,
                  fontWeight: 950,
                  textTransform: 'uppercase',
                  letterSpacing: 0.65,
                  boxShadow: 'none',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: hiddenDeskStatus.active ? '#ff3b5f' : 'var(--green-2)',
                    boxShadow: hiddenDeskStatus.active
                      ? '0 0 6px rgba(255,59,95,0.30)'
                      : '0 0 6px rgba(0,245,160,0.26)',
                  }}
                />
                {hiddenDeskStatus.label}
              </div>
            )}

            <button
              type="button"
              onClick={() => setVoiceDeskOpen(open => !open)}
              style={{
                height: 34,
                borderRadius: 999,
                border: '1px solid var(--border-strong)',
                background: voiceDeskOpen ? 'rgba(251,11,140,0.10)' : 'rgba(0,245,160,0.10)',
                color: voiceDeskOpen ? 'var(--pink)' : 'var(--green-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 12px',
                fontSize: 10.5,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                cursor: 'pointer',
              }}
            >
              {voiceDeskOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {voiceDeskOpen ? 'Hide desk' : 'Open desk'}
            </button>
          </div>
        </div>

        <motion.div
          key="embedded-voice-desk"
          initial={false}
          animate={{
            height: voiceDeskOpen ? 'auto' : 0,
            opacity: voiceDeskOpen ? 1 : 0,
            y: voiceDeskOpen ? 0 : -10,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          style={{
            overflow: 'hidden',
            pointerEvents: voiceDeskOpen ? 'auto' : 'none',
          }}
        >
              <div
                className="ptdt-dialer-voice-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(360px, 1.15fr) minmax(320px, 0.85fr)',
                  gap: 12,
                  padding: 12,
                  minHeight: 336,
                }}
              >
                <div className="ptdt-dialer-embedded-dialer" style={{ minWidth: 0, minHeight: 336 }}>
                  <FloatingDialer
                    mode="embedded"
                    onDispositionRequested={openDispositionFromRequest}
                    onActivityChange={handleVoiceDeskActivityChange}
                  />
                </div>

                <div
                  className="ptdt-dialer-overlay-slot"
                  style={{
                    minWidth: 0,
                    minHeight: 336,
                    borderRadius: 26,
                    border: '1px solid rgba(0,245,160,0.18)',
                    background: liveSipCall
                      ? 'transparent'
                      : 'rgba(8,5,18,0.90)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {liveSipCall ? (
                    <SipActiveCallOverlay mode="embedded" />
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        minHeight: 336,
                        display: 'grid',
                        placeItems: 'center',
                        padding: 24,
                        color: 'var(--text-3)',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 20,
                            margin: '0 auto 14px',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(0,245,160,0.10)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: 'none',
                          }}
                        >
                          <Activity size={22} color="var(--green-2)" />
                        </div>
                        <div
                          className="display"
                          style={{
                            fontSize: 17,
                            fontWeight: 900,
                            color: '#fff',
                            marginBottom: 7,
                            letterSpacing: 0.2,
                            textShadow: 'none',
                          }}
                        >
                          Call pop-up standby
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            lineHeight: 1.55,
                            maxWidth: 300,
                            color: 'rgba(249,247,255,0.68)',
                            fontWeight: 650,
                          }}
                        >
                          When a SIP call connects, hold, transfer, mute, device routing, and hangup controls open here.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
        </motion.div>
      </motion.section>

      {/* ============== CONTACTS — Full Width Table ============== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass ptdt-dialer-contacts-card"
        style={{ padding: 24, overflow: 'hidden', gridColumn: '1 / -1' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, marginBottom: 18, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className="display" style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}>
              Pending Contacts
            </h2>
            <span className="badge" style={{
              background: 'rgba(251,11,140,0.10)',
              color: 'var(--pink)',
              border: '1px solid var(--border-strong)',
            }}>
              <Sparkles size={10}/> {filtered.length}
            </span>
          </div>

          {/* Search */}
          <div className="ptdt-dialer-search-wrap" style={{ position: 'relative', minWidth: 260 }}>
            <Search size={14} color="var(--text-3)" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px',
                background: 'var(--bg-glass-hi)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                backdropFilter: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: 'auto', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#','Contact','Phone','Status','Action'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    borderBottom: '1px solid var(--border)',
                    backdropFilter: 'none',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: 'center', padding: 50,
                    color: 'var(--text-3)', fontSize: 13,
                  }}>
                    {selectedCamp
                      ? 'No pending contacts in this campaign'
                      : 'Select a campaign to view contacts'}
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <motion.tr
                  key={c.id as number}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="table-row"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="mono" style={{
                    padding: '12px 14px', fontSize: 12, color: 'var(--text-3)',
                  }}>
                    {String(i+1).padStart(2,'0')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--grad-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff',
                        boxShadow: '0 0 12px rgba(251,11,140,0.32)',
                      }}>
                        {(c.name as string)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>
                        {c.name as string}
                      </span>
                    </div>
                  </td>
                  <td className="mono" style={{
                    padding: '12px 14px', fontSize: 13, color: 'var(--text-2)',
                  }}>
                    {c.phone as string}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge" style={{
                      color: 'var(--warning)',
                      background: 'rgba(240,185,11,0.12)',
                      border: '1px solid var(--warning)',
                    }}>
                      {c.status as string}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleManualCall(c)}
                      disabled={!!activeCall || loading || endingCall}
                      style={{
                        background: !!activeCall || loading || endingCall ? 'var(--bg-glass)' : 'rgba(251,11,140,0.10)',
                        border: `1px solid ${!!activeCall || loading || endingCall ? 'var(--border)' : 'var(--pink)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        cursor: activeCall || endingCall ? 'not-allowed' : 'pointer',
                        color: !!activeCall || loading || endingCall ? 'var(--text-3)' : 'var(--pink)',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5,
                        fontWeight: 600,
                        opacity: (!!activeCall || loading || endingCall) ? 0.5 : 1,
                      }}
                    >
                      <Phone size={11}/> Call
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
      </div>

      <CallDispositionModal
        open={dispositionOpen}
        callId={lastCallId}
        contactName={dispositionContact.name}
        contactNumber={dispositionContact.phone}
        saveMode={dispositionSaveMode}
        helperText={
          dispositionSaveMode === 'preview'
            ? 'Preview only: the backend did not return a call record ID, so this disposition screen can be viewed but will not be saved.'
            : null
        }
        onClose={() => {
          setDispositionOpen(false)
          setLastCallId(null)
          setDispositionSaveMode('backend')
          setDispositionContact({ name: null, phone: null })
        }}
        onSaved={() => {
          setDispositionOpen(false)
          setLastCallId(null)
          setDispositionSaveMode('backend')
          setDispositionContact({ name: null, phone: null })
        }}
      />

      <NoticeModal
        open={Boolean(notice)}
        title={notice?.title || ''}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
    </div>
    </>
  )
}
