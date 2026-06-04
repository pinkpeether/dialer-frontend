import CallDispositionModal from './CallDispositionModal';
import { useSipStore } from '../store/sip.store';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  X,
  Delete,
  PhoneCall,
  MicOff,
  Mic,
  Hash,
  Clock,
  Search,
  User as UserIcon,
  ChevronDown,
  Signal,
  Zap,
  Volume2,
} from "lucide-react";
import { dialerAPI } from "../api/dialer.api";
import { contactsAPI } from "../api/contacts.api";
import { useAudioDevices, useMicrophoneMeter } from "../hooks/useAudioDevices";
import { softphoneAudio } from "../services/audio/SoftphoneAudio";
import { useToast } from "../hooks/useToast";
import RecentCallsModal from "./RecentCallsModal";
import AudioDeviceSelect from "./AudioDeviceSelect";

type WidgetState = "collapsed" | "dialpad" | "calling" | "active";
type ActiveTab = "controls" | "dtmf" | "history";

interface RecentCall {
  phone: string;
  name?: string;
  at: number;
  duration: number;
  direction: "outgoing" | "incoming";
  outcome: "answered" | "missed" | "failed";
}

interface Contact {
  id: number;
  name?: string;
  phone: string;
}

interface DispositionRequest {
  callId: number | string | null;
  name: string | null;
  phone: string | null;
  saveMode: "backend" | "preview";
}

interface DialerActivity {
  state: WidgetState;
  label: string;
  active: boolean;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const SUB: Record<string, string> = {
  "1": "",
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "*": "",
  "0": "+",
  "#": "",
};

const STORAGE_KEY = "ptdt_recent_calls_v5";
function loadRecent(): RecentCall[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      phone: String(item?.phone || ""),
      name: item?.name || undefined,
      at: typeof item?.at === "number" ? item.at : Date.now(),
      duration: typeof item?.duration === "number" ? item.duration : 0,
      direction: item?.direction === "incoming" ? "incoming" : "outgoing",
      outcome:
        item?.outcome === "missed" || item?.outcome === "failed"
          ? item.outcome
          : "answered",
    }));
  } catch {
    return [];
  }
}
function saveRecent(c: RecentCall[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c.slice(0, 20)));
}

function cleanRecentIdentity(value: string) {
  return value
    .replace(/^sip:/i, "")
    .replace(/;.*$/, "")
    .replace(/@.*$/, "")
    .replace(/^<|>$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function callIdValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }
  return null;
}

function extractCallRecord(result: unknown) {
  const payload = isRecord(result) ? result : {};
  const record =
    (isRecord(payload.callRecord) && payload.callRecord) ||
    (isRecord(payload.call) && payload.call) ||
    (isRecord(payload.record) && payload.record) ||
    payload;

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
      record.twilioCallSid ||
        record.twilioSid ||
        record.callSid ||
        record.sid ||
        payload.twilioCallSid ||
        payload.twilioSid ||
        payload.callSid ||
        payload.sid ||
        "",
    ),
  };
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const brand = {
  bg: "#05040b",
  panel: "rgba(10,7,18,0.92)",
  panel2: "rgba(18,13,31,0.82)",
  ink: "#f9f7ff",
  muted: "rgba(249,247,255,0.56)",
  faint: "rgba(249,247,255,0.28)",
  pink: "#fb0b8c",
  pinkSoft: "rgba(251,11,140,0.16)",
  green: "#00f5a0",
  greenSoft: "rgba(0,245,160,0.16)",
  purple: "#8b5cf6",
  purpleSoft: "rgba(139,92,246,0.16)",
  cyan: "#22d3ee",
  red: "#ff3b5f",
  gold: "#f0b90b",
};

function glassCard(active = false) {
  return {
    background: active
      ? "linear-gradient(145deg,rgba(0,245,160,0.10),rgba(251,11,140,0.045)),rgba(255,255,255,0.040)"
      : "linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))",
    border: active
      ? "1px solid rgba(0,245,160,0.32)"
      : "1px solid rgba(255,255,255,0.105)",
    boxShadow: active
      ? "inset 0 1px 0 rgba(255,255,255,0.08),0 10px 24px rgba(0,245,160,0.07)"
      : "inset 0 1px 0 rgba(255,255,255,0.075),0 8px 20px rgba(0,0,0,0.20)",
  };
}

// ── Premium Signal Waveform ───────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const bars = [
    0.35, 0.75, 0.45, 1.1, 0.55, 0.95, 0.42, 1.2, 0.72, 0.52, 1.0, 0.62, 0.32,
    0.88, 0.7,
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        height: 44,
        borderRadius: 22,
        padding: "0 18px",
        background:
          "linear-gradient(135deg,rgba(0,245,160,0.10),rgba(251,11,140,0.07),rgba(139,92,246,0.10))",
        border: "1px solid rgba(255,255,255,0.11)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 8px 18px rgba(0,0,0,0.18)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: active ? Math.max(8, h * 18) : 6,
            borderRadius: 999,
            background: active
              ? i % 3 === 0
                ? `linear-gradient(180deg,${brand.green},${brand.cyan})`
                : i % 3 === 1
                  ? `linear-gradient(180deg,${brand.pink},${brand.purple})`
                  : `linear-gradient(180deg,#fff,${brand.green})`
              : "rgba(255,255,255,0.16)",
            boxShadow: active && i % 3 === 0
              ? "0 0 8px rgba(0,245,160,0.38)"
              : active
                ? "0 0 8px rgba(251,11,140,0.28)"
                : "none",
            position: "relative",
          }}
        />
      ))}
    </div>
  );
}

// ── Premium Dial Key ──────────────────────────────────────
function DialKey({
  label,
  sub,
  onClick,
  onLongPress,
  size = "normal",
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  onLongPress?: () => void;
  size?: "normal" | "small" | "embedded";
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);
  const embedded = size === "embedded";
  const dim = size === "small" ? 48 : 64;
  const isPrimary = label === "0";
  const isEdge = label === "*" || label === "#";

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPressTimer = () => {
    if (!onLongPress) return;
    clearLongPressTimer();
    skipNextClickRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      skipNextClickRef.current = true;
      setPressed(false);
      onLongPress();
    }, 520);
  };

  useEffect(() => clearLongPressTimer, []);

  return (
    <button
      onClick={(event) => {
        if (skipNextClickRef.current) {
          event.preventDefault();
          skipNextClickRef.current = false;
          return;
        }
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
        clearLongPressTimer();
      }}
      onPointerDown={() => {
        setPressed(true);
        startLongPressTimer();
      }}
      onPointerUp={() => {
        setPressed(false);
        clearLongPressTimer();
      }}
      onPointerCancel={() => {
        setPressed(false);
        clearLongPressTimer();
      }}
      style={{
        width: embedded ? "100%" : dim,
        height: embedded ? 48 : dim,
        borderRadius: embedded ? 15 : size === "small" ? 18 : 22,
        cursor: "pointer",
        background: hovered
          ? isPrimary
            ? "linear-gradient(145deg,rgba(0,245,160,0.34),rgba(251,11,140,0.18))"
            : isEdge
              ? "linear-gradient(145deg,rgba(251,11,140,0.25),rgba(139,92,246,0.19))"
              : "linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.07))"
          : isPrimary
            ? "linear-gradient(145deg,rgba(0,245,160,0.24),rgba(0,245,160,0.075))"
            : isEdge
              ? "linear-gradient(145deg,rgba(251,11,140,0.16),rgba(139,92,246,0.10))"
              : "linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))",
        border: hovered
          ? isPrimary
            ? "1px solid rgba(0,245,160,0.54)"
            : "1px solid rgba(251,11,140,0.42)"
          : "1px solid rgba(255,255,255,0.115)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: embedded ? 1 : 2,
        transform: pressed
          ? "translateY(2px) scale(0.94)"
          : hovered
            ? "translateY(-1px) scale(1.01)"
            : "translateY(0) scale(1)",
        transition: "background 0.12s ease,border-color 0.12s ease,transform 0.08s ease",
        boxShadow: pressed
          ? "inset 0 4px 12px rgba(0,0,0,0.34)"
          : hovered
            ? isPrimary
              ? "0 10px 20px rgba(0,245,160,0.10),inset 0 1px 0 rgba(255,255,255,0.16)"
              : "0 10px 20px rgba(251,11,140,0.09),inset 0 1px 0 rgba(255,255,255,0.14)"
            : "0 7px 14px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.09)",
        justifySelf: embedded ? "stretch" : "center",
        color: brand.ink,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 18%,rgba(255,255,255,0.20),transparent 38%)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          fontSize: embedded ? 21 : size === "small" ? 17 : 23,
          fontWeight: 900,
          color: isPrimary ? brand.green : brand.ink,
          fontFamily:
            "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
          lineHeight: 1,
          textShadow: isPrimary
            ? "0 0 18px rgba(0,245,160,0.62)"
            : "0 1px 12px rgba(255,255,255,0.18)",
          position: "relative",
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          style={{
            fontSize: embedded ? 6.2 : 6.5,
            fontWeight: 900,
            color: "rgba(249,247,255,0.45)",
            letterSpacing: 1.25,
            position: "relative",
          }}
        >
          {sub}
        </span>
      )}
    </button>
  );
}

// ── Pulsing Status Badge ──────────────────────────────────
function StatusBadge({
  label,
  color,
  bg,
  pulse,
}: {
  label: string;
  color: string;
  bg: string;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: bg,
        borderRadius: 999,
        padding: "5px 11px 5px 9px",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 10px ${color}12,inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{ position: "relative", width: 8, height: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
        {pulse && (
          <div
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              border: `1px solid ${color}55`,
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: 9.5,
          fontFamily:
            "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
          color,
          fontWeight: 900,
          letterSpacing: 1.05,
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface FloatingDialerProps {
  mode?: "floating" | "embedded";
  onDispositionRequested?: (request: DispositionRequest) => void;
  onActivityChange?: (activity: DialerActivity) => void;
}

// ── Main Component ────────────────────────────────────────
export default function FloatingDialer({
  mode = "floating",
  onDispositionRequested,
  onActivityChange,
}: FloatingDialerProps) {
  const isEmbedded = mode === "embedded";
  const [state, setState] = useState<WidgetState>(isEmbedded ? "dialpad" : "collapsed");
  const [tab, setTab] = useState<ActiveTab>("controls");
  const [number, setNumber] = useState("");
  const [contactName, setName] = useState("");
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callRecordId, setCallRecordId] = useState<number | string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dtmfBuf, setDtmfBuf] = useState("");
  const [recent, setRecent] = useState<RecentCall[]>(loadRecent);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSugg] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [recentCallsOpen, setRecentCallsOpen] = useState(false);

  const sipConfig = useSipStore((s) => s.config);
  const sipStatus = useSipStore((s) => s.status);
  const sipActiveCall = useSipStore((s) => s.activeCall);
  const sipCall = useSipStore((s) => s.call);
  const sipHangup = useSipStore((s) => s.hangup);
  const sipSendDTMF = useSipStore((s) => s.sendDTMF);
  const setSipMuted = useSipStore((s) => s.setMuted);
  const sipAudioOutputDeviceId = useSipStore((s) => s.audioOutputDeviceId);
  const sipAudioOutputError = useSipStore((s) => s.audioOutputError);
  const setSipAudioOutputDevice = useSipStore((s) => s.setAudioOutputDevice);
  const testSipAudioOutputDevice = useSipStore((s) => s.testAudioOutputDevice);
  const sipAudioInputDeviceId = useSipStore((s) => s.audioInputDeviceId);
  const sipAudioInputError = useSipStore((s) => s.audioInputError);
  const setSipAudioInputDevice = useSipStore((s) => s.setAudioInputDevice);
  const showSipDisposition = useSipStore(s => s.showSipDisposition)
  const pendingSipDisposition = useSipStore(s => s.pendingSipDisposition)
  const dismissSipDisposition = useSipStore(s => s.dismissSipDisposition)
  const toast = useToast();
  const sipModeEnabled = Boolean(sipConfig.enabled);
  const sipReady = sipModeEnabled && sipStatus === "registered";

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStart = useRef<number>(0);
  const callCancelRequestedRef = useRef(false);
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const sipCallEstablishedRef = useRef(false);
  const sipOutboundRoutingSeenRef = useRef(false);
  const sipPublicNumberCallRef = useRef(false);
  const sipPublicAnswerConfirmRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingRecentRef = useRef<{
    id: string;
    remoteIdentity: string;
    startedAt: number;
  } | null>(null);

  const {
    audioOutputs,
    audioInputs,
    error: audioDevicesError,
    refresh: refreshAudioDevices,
    requestAudioPermission,
    canSelectOutput,
  } = useAudioDevices(state === "active" || state === "calling");

  const { level: microphoneLevel, error: microphoneMeterError } =
    useMicrophoneMeter(sipAudioInputDeviceId, state === "active" && !muted);

  const requestMicrophoneAccess = useCallback(() => {
    void requestAudioPermission().catch(() => undefined);
  }, [requestAudioPermission]);

  const handleMuteToggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setSipMuted(next);

    if (state === "active") {
      toast.info(next ? "Microphone muted" : "Microphone unmuted");
    }
  }, [muted, setSipMuted, state, toast]);

  const testSpeaker = useCallback(() => {
    void testSipAudioOutputDevice().catch((err) => {
      const msg =
        err instanceof Error ? err.message : "Could not play test speaker tone";
      setError(msg);
    });
  }, [testSipAudioOutputDevice]);

  const playDtmfTone = useCallback(
    (digit: string) => {
      void softphoneAudio
        .playDtmf(digit, sipAudioOutputDeviceId)
        .catch(() => undefined);
    },
    [sipAudioOutputDeviceId],
  );

  const playConnectedTone = useCallback(() => {
    void softphoneAudio
      .playConnected(sipAudioOutputDeviceId)
      .catch(() => undefined);
  }, [sipAudioOutputDeviceId]);

  const playFailedTone = useCallback(() => {
    void softphoneAudio
      .playFailed(sipAudioOutputDeviceId)
      .catch(() => undefined);
  }, [sipAudioOutputDeviceId]);

  const playHangupTone = useCallback(() => {
    void softphoneAudio
      .playHangup(sipAudioOutputDeviceId)
      .catch(() => undefined);
  }, [sipAudioOutputDeviceId]);

  const stopRingback = useCallback(() => {
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
  }, []);

  const clearSipPublicAnswerConfirm = useCallback(() => {
    if (sipPublicAnswerConfirmRef.current) {
      clearTimeout(sipPublicAnswerConfirmRef.current);
      sipPublicAnswerConfirmRef.current = null;
    }
  }, []);

  const startRingback = useCallback(() => {
    stopRingback();
    stopRingbackRef.current = softphoneAudio.startRingback(
      sipAudioOutputDeviceId,
    );
  }, [sipAudioOutputDeviceId, stopRingback]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(
    () => () => {
      stopTimer();
      stopRingback();
      clearSipPublicAnswerConfirm();
    },
    [stopTimer, stopRingback, clearSipPublicAnswerConfirm],
  );

  useEffect(() => {
    const label =
      state === "active"
        ? "Call connected"
        : state === "calling"
          ? "Call routing"
          : "Dialer idle";

    onActivityChange?.({
      state,
      label,
      active: state === "active" || state === "calling",
    });
  }, [onActivityChange, state]);

  useEffect(() => {
    const activateSipCall = (startedAtInput?: number) => {
      const startedAt = startedAtInput || Date.now();
      stopRingback();
      setError(null);
      setLoading(false);
      setState("active");
      setTab("controls");
      clearSipPublicAnswerConfirm();

      if (!timerRef.current || callStart.current !== startedAt) {
        stopTimer();
        callStart.current = startedAt;
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        timerRef.current = setInterval(() => {
          setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        }, 1000);
      } else {
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      }
    };

    if (!callSid?.startsWith("sip:")) {
      sipOutboundRoutingSeenRef.current = false;
      sipPublicNumberCallRef.current = false;
      clearSipPublicAnswerConfirm();
      return;
    }

    if (sipStatus === "calling") {
      sipOutboundRoutingSeenRef.current = true;
    }

    if (sipStatus === "in_call" && sipActiveCall) {
      const wasAlreadyActive = sipCallEstablishedRef.current;
      sipCallEstablishedRef.current = true;

      if (!wasAlreadyActive) {
        activateSipCall(sipActiveCall.startedAt || Date.now());
        playConnectedTone();
        return;
      }

      activateSipCall(sipActiveCall.startedAt || Date.now());
      return;
    }

    const sipReturnedToIdle =
      sipCallEstablishedRef.current &&
      !sipActiveCall &&
      ["registered", "configured", "idle", "ended"].includes(sipStatus);

    if (sipReturnedToIdle) {
      const dur = Math.max(0, Math.round((Date.now() - callStart.current) / 1000));
      clearSipPublicAnswerConfirm();
      stopRingback();
      stopTimer();

      if (number) {
        setRecent((current) => {
          const entry: RecentCall = {
            phone: number,
            name: contactName || undefined,
            at: Date.now(),
            duration: dur,
            direction: "outgoing",
            outcome: dur > 3 ? "answered" : "missed",
          };
          const updated = [entry, ...current];
          saveRecent(updated);
          return updated;
        });
      }

      if (!isEmbedded) {
        onDispositionRequested?.({
          callId: null,
          name: contactName || null,
          phone: number || null,
          saveMode: "preview",
        });
      }
      sipCallEstablishedRef.current = false;
      sipOutboundRoutingSeenRef.current = false;
      sipPublicNumberCallRef.current = false;
      playHangupTone();
      setCallSid(null);
      setElapsed(0);
      setMuted(false);
      setLoading(false);
      setState("dialpad");
      return;
    }

    const sipEndedBeforeAnswer =
      sipOutboundRoutingSeenRef.current &&
      !sipCallEstablishedRef.current &&
      state === "calling" &&
      !sipActiveCall &&
      ["registered", "configured", "idle", "ended"].includes(sipStatus);

    if (sipEndedBeforeAnswer) {
      clearSipPublicAnswerConfirm();
      stopRingback();
      stopTimer();
      playFailedTone();
      sipOutboundRoutingSeenRef.current = false;
      sipPublicNumberCallRef.current = false;
      setCallSid(null);
      setCallRecordId(null);
      setElapsed(0);
      setMuted(false);
      setLoading(false);
      setState("dialpad");
      setError("Call declined or ended before answer");
      return;
    }

    if (sipStatus === "error" || sipStatus === "registration_failed") {
      clearSipPublicAnswerConfirm();
      stopRingback();
      stopTimer();
      playFailedTone();
      sipCallEstablishedRef.current = false;
      sipOutboundRoutingSeenRef.current = false;
      sipPublicNumberCallRef.current = false;
      setLoading(false);
      setCallSid(null);
      setState("dialpad");
      setError("SIP call failed");
    }
  }, [
    callSid,
    sipStatus,
    sipActiveCall,
    number,
    contactName,
    stopRingback,
    stopTimer,
    playConnectedTone,
    playFailedTone,
    playHangupTone,
    onDispositionRequested,
    isEmbedded,
    state,
    clearSipPublicAnswerConfirm,
  ]);

  useEffect(() => {
    if (sipActiveCall?.direction === "incoming" && sipStatus === "in_call") {
      if (incomingRecentRef.current?.id !== sipActiveCall.id) {
        incomingRecentRef.current = {
          id: sipActiveCall.id,
          remoteIdentity: sipActiveCall.remoteIdentity,
          startedAt: sipActiveCall.startedAt || Date.now(),
        };
      }
      return;
    }

    const incomingReturnedToIdle =
      incomingRecentRef.current &&
      !sipActiveCall &&
      ["registered", "configured", "idle", "ended"].includes(sipStatus);

    if (incomingReturnedToIdle && incomingRecentRef.current) {
      const call = incomingRecentRef.current;
      incomingRecentRef.current = null;
      const dur = Math.max(0, Math.round((Date.now() - call.startedAt) / 1000));
      const phone = cleanRecentIdentity(call.remoteIdentity) || call.remoteIdentity;

      setRecent((current) => {
        const entry: RecentCall = {
          phone,
          at: Date.now(),
          duration: dur,
          direction: "incoming",
          outcome: dur > 3 ? "answered" : "missed",
        };
        const updated = [entry, ...current];
        saveRecent(updated);
        return updated;
      });
      if (!isEmbedded) {
        onDispositionRequested?.({
          callId: null,
          name: null,
          phone,
          saveMode: "preview",
        });
      }
    }

    if (sipStatus === "error" || sipStatus === "registration_failed") {
      incomingRecentRef.current = null;
    }
  }, [isEmbedded, onDispositionRequested, sipActiveCall, sipStatus]);

  useEffect(() => {
    if (state !== "collapsed") {
      (async () => {
        try {
          const d = await contactsAPI.getAll({ limit: 200 });
          const payload = d as { contacts?: Contact[] } | Contact[];
          const arr = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.contacts)
              ? payload.contacts
              : [];
          setContacts(arr);
        } catch {
          setContacts([]);
        }
      })();
    }
  }, [state]);

  useEffect(() => {
    if (isEmbedded) return

    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setState((s) =>
          s === "collapsed"
            ? "dialpad"
            : s === "active" || s === "calling"
              ? s
              : "collapsed",
        );
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isEmbedded]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return (contacts || [])
      .filter((c) => c.phone.includes(q) || c.name?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, contacts]);

  // ── Drag ──
  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      };
      isDraggingRef.current = false;
    },
    [pos],
  );

  const onHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (!isDraggingRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3))
        isDraggingRef.current = true;
      if (isDraggingRef.current)
        setPos({
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
    },
    [],
  );

  const onHeaderPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    },
    [],
  );

  // ── FAB ──
  const handleFABClick = useCallback(() => {
    if (state === "collapsed") {
      setState("dialpad");
    } else if (state === "dialpad") {
      setState("collapsed");
      setNumber("");
      setName("");
      setQuery("");
      setError(null);
      setDtmfBuf("");
      setSugg(false);
    }
  }, [state]);

  const triggerRipple = useCallback(() => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  }, []);

  const appendDialerKey = useCallback(
    (k: string) => {
      setNumber((current) => {
        if (current.length >= 16) return current;
        const next = current + k;
        setQuery(next);
        return next;
      });
      setError(null);
      triggerRipple();
    },
    [triggerRipple],
  );

  const handleKey = (k: string) => {
    playDtmfTone(k);
    appendDialerKey(k);
  };

  const handleZeroLongPress = useCallback(() => {
    playDtmfTone("0");
    appendDialerKey("+");
  }, [appendDialerKey, playDtmfTone]);

  const handleDelete = useCallback(() => {
    setNumber((current) => {
      const next = current.slice(0, -1);
      setQuery(next);
      return next;
    });
  }, []);
  const selectContact = (c: Contact) => {
    setNumber(c.phone);
    setName(c.name || "");
    setQuery(c.phone);
    setSugg(false);
  };

  const handleOpenRecentCalls = useCallback(() => {
    setRecentCallsOpen(true);
  }, []);

  const handleClearRecentCalls = useCallback(() => {
    setRecent([]);
    saveRecent([]);
  }, []);

  const handleRedialRecentCall = useCallback((call: RecentCall) => {
    setNumber(call.phone);
    setName(call.name || "");
    setQuery(call.phone);
    setError(null);
    setDtmfBuf("");
    setSugg(false);
    setRecentCallsOpen(false);
    setState("dialpad");
  }, []);

  const handleCall = useCallback(async () => {
    const cleaned = number.replace(/\s/g, "");
    const isSipExtension = sipModeEnabled && /^[0-9]{2,8}$/.test(cleaned);
    const isPublicNumber = /^\+?[0-9]{7,16}$/.test(cleaned);
    const isSipUri = /^sip:/i.test(cleaned) || cleaned.includes("@");

    if (!isSipExtension && !isPublicNumber && !isSipUri) {
      setError(
        sipModeEnabled
          ? "Enter a valid SIP extension, SIP URI, or phone number"
          : "Enter a valid phone number",
      );
      return;
    }

    setError(null);
    setLoading(true);
    setState("calling");
    setTab("controls");
    setElapsed(0);
    setCallRecordId(null);
    sipCallEstablishedRef.current = false;
    callCancelRequestedRef.current = false;
    sipPublicNumberCallRef.current = sipModeEnabled && isPublicNumber && !isSipExtension;
    clearSipPublicAnswerConfirm();
    stopTimer();
    startRingback();

    try {
      if (sipModeEnabled) {
        if (!sipReady) {
          throw new Error(
            "SIP mode is enabled but not registered. Open SIP Settings and register first.",
          );
        }

        const sipCallSid = `sip:${Date.now()}`;
        sipOutboundRoutingSeenRef.current = false;
        setCallSid(sipCallSid);
        callStart.current = Date.now();
        await sipCall(cleaned);
        if (callCancelRequestedRef.current) {
          await sipHangup().catch(() => undefined);
          return;
        }
        triggerRipple();
        return;
      }

      const res = await dialerAPI.makeAdhocCall(
        cleaned,
        contactName || undefined,
      );
      const callRecord = extractCallRecord(res);
      if (callCancelRequestedRef.current) {
        if (callRecord.callSid) {
          await dialerAPI.hangupCall(callRecord.callSid).catch(() => undefined);
        }
        return;
      }
      setCallSid(callRecord.callSid || null);
      setCallRecordId(callRecord.id);
      setState("active");
      setTab("controls");
      setElapsed(0);
      callStart.current = Date.now();
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      triggerRipple();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Call failed";
      stopRingback();
      stopTimer();
      clearSipPublicAnswerConfirm();
      playFailedTone();
      sipPublicNumberCallRef.current = false;
      setCallSid(null);
      setCallRecordId(null);
      setError(msg);
      setState("dialpad");
    } finally {
      callCancelRequestedRef.current = false;
      setLoading(false);
    }
  }, [
    number,
    contactName,
    sipModeEnabled,
    sipReady,
    sipCall,
    sipHangup,
    stopTimer,
    startRingback,
    triggerRipple,
    stopRingback,
    playFailedTone,
    clearSipPublicAnswerConfirm,
  ]);

  const handleHangup = useCallback(async () => {
    callCancelRequestedRef.current = true;
    const dur = Math.round((Date.now() - callStart.current) / 1000);
    clearSipPublicAnswerConfirm();
    stopRingback();
    stopTimer();
    if (callSid) {
      try {
        if (callSid.startsWith("sip:")) await sipHangup();
        else await dialerAPI.hangupCall(callSid);
      } catch {
        // The UI still clears local call state below.
      }
    }
    const isSipCall = Boolean(callSid?.startsWith("sip:"));
    if (number && state === "active") {
      const entry: RecentCall = {
        phone: number,
        name: contactName || undefined,
        at: Date.now(),
        duration: dur,
        direction: "outgoing",
        outcome: dur > 3 ? "answered" : "missed",
      };
      const updated = [entry, ...recent];
      setRecent(updated);
      saveRecent(updated);
      if (!isSipCall) {
        onDispositionRequested?.({
          callId: callRecordId,
          name: contactName || null,
          phone: number || null,
          saveMode: callRecordId ? "backend" : "preview",
        });
      }
    }
    sipCallEstablishedRef.current = false;
    sipOutboundRoutingSeenRef.current = false;
    sipPublicNumberCallRef.current = false;
    playHangupTone();
    setCallSid(null);
    setCallRecordId(null);
    setElapsed(0);
    setMuted(false);
    setState("dialpad");
  }, [
    callSid,
    callRecordId,
    number,
    contactName,
    recent,
    state,
    stopRingback,
    stopTimer,
    sipHangup,
    playHangupTone,
    onDispositionRequested,
    clearSipPublicAnswerConfirm,
  ]);

  const handleDTMF = useCallback(async (digit: string) => {
    playDtmfTone(digit);
    setDtmfBuf((d) => d + digit);
    if (callSid) {
      try {
        if (callSid.startsWith("sip:")) await sipSendDTMF(digit);
        else await dialerAPI.sendDTMF(callSid, digit);
      } catch {
        // DTMF failures should not interrupt the active call controls.
      }
    }
  }, [playDtmfTone, callSid, sipSendDTMF]);

  const handleClose = useCallback(() => {
    if (state === "active" || state === "calling") handleHangup();
    setState("collapsed");
    setNumber("");
    setName("");
    setQuery("");
    setError(null);
    setDtmfBuf("");
    setSugg(false);
  }, [state, handleHangup]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable
      );
    };

    const h = (e: KeyboardEvent) => {
      const key = e.key;
      const isDtmfKey = /^[0-9]$/.test(key) || key === "*" || key === "#";
      const isDialKey = isDtmfKey || key === "+";

      if (!isEmbedded && key === "Escape" && state !== "collapsed") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if ((state === "dialpad" || state === "calling") && isDialKey) {
        e.preventDefault();
        if (key !== "+") playDtmfTone(key);
        appendDialerKey(key);
        return;
      }

      if (
        (state === "dialpad" || state === "calling") &&
        (key === "Backspace" || key === "Delete")
      ) {
        e.preventDefault();
        handleDelete();
        return;
      }

      if (state === "dialpad" && key === "Enter" && !loading) {
        e.preventDefault();
        void handleCall();
        return;
      }

      if (state === "active" && tab === "dtmf" && isDtmfKey) {
        e.preventDefault();
        void handleDTMF(key);
      }
    };

    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [
    state,
    tab,
    loading,
    appendDialerKey,
    handleDelete,
    handleCall,
    handleDTMF,
    handleClose,
    playDtmfTone,
    isEmbedded,
  ]);

  const timeAgo = (ms: number) => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  const outcomeColor = (o: string) =>
    o === "answered" ? "#10b981" : o === "missed" ? "#f59e0b" : "#ef4444";

  const isOpen = isEmbedded || state !== "collapsed";

  return (
    <>
      <style>{`
        .ptdt-panel::-webkit-scrollbar { width: 4px; }
        .ptdt-panel::-webkit-scrollbar-track { background: transparent; }
        .ptdt-panel::-webkit-scrollbar-thumb {
          background: rgba(251,11,140,0.35); border-radius: 4px;
        }
        .ptdt-dialer-input::placeholder { color: rgba(249,247,255,0.28); }

        @media (max-width: 900px) {
          .ptdt-floating-dialer-root {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .ptdt-floating-dialer-panel {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            border-radius: 22px !important;
          }

          .ptdt-floating-dialer-panel .ptdt-panel {
            max-height: none !important;
            overflow: visible !important;
          }
        }

        @media (max-width: 560px) {
          .ptdt-floating-dialer-panel {
            border-radius: 20px !important;
          }
        }
      `}</style>

      <div
        className="ptdt-floating-dialer-root"
        style={{
          position: isEmbedded ? "relative" : "fixed",
          bottom: isEmbedded ? undefined : 28 - pos.y,
          right: isEmbedded ? undefined : 28 - pos.x,
          zIndex: isEmbedded ? 1 : 9999,
          width: isEmbedded ? "100%" : undefined,
          height: isEmbedded ? "100%" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: isEmbedded ? "stretch" : "flex-end",
          gap: 14,
        }}
      >
        {/* ══════════════════════════════════════════
            PANEL — PTDT Voice Console
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="panel"
              className="ptdt-floating-dialer-panel"
              initial={{ opacity: 0, scale: 0.78, y: 54, rotateX: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.78, y: 54, rotateX: -8 }}
              transition={{ type: "spring", stiffness: 430, damping: 34 }}
              style={{
                width: isEmbedded ? "100%" : 372,
                height: isEmbedded ? "100%" : undefined,
                minHeight: isEmbedded ? 376 : undefined,
                borderRadius: isEmbedded ? 26 : 34,
                background:
                  "linear-gradient(152deg,rgba(8,5,18,0.985),rgba(14,9,27,0.965) 52%,rgba(6,5,14,0.985))",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                border: "1px solid rgba(255,255,255,0.13)",
                boxShadow: ripple
                  ? "0 0 0 3px rgba(251,11,140,0.12),0 20px 48px rgba(0,0,0,0.46)"
                  : state === "active"
                    ? "0 0 0 1px rgba(0,245,160,0.24),0 20px 48px rgba(0,0,0,0.46)"
                    : "0 0 0 1px rgba(251,11,140,0.14),0 18px 44px rgba(0,0,0,0.46)",
                overflow: "hidden",
                userSelect: "none",
                transition: "box-shadow 0.18s ease",
                position: "relative",
                color: brand.ink,
                display: isEmbedded ? "flex" : undefined,
                flexDirection: isEmbedded ? "column" : undefined,
              }}
            >
              {/* Luxury grid / aurora layer */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
                `,
                  backgroundSize: "44px 44px",
                  maskImage:
                    "linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 74%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 74%)",
                  opacity: 0.34,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: -120,
                  left: -120,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(251,11,140,0.12),transparent 66%)",
                  opacity: 0.72,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -130,
                  bottom: -120,
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(0,245,160,0.10),transparent 68%)",
                  opacity: 0.72,
                  pointerEvents: "none",
                }}
              />

              {/* ════════════════════════════════════
                  HEADER
              ════════════════════════════════════ */}
              <div
                onPointerDown={isEmbedded ? undefined : onHeaderPointerDown}
                onPointerMove={isEmbedded ? undefined : onHeaderPointerMove}
                onPointerUp={isEmbedded ? undefined : onHeaderPointerUp}
                onPointerCancel={isEmbedded ? undefined : onHeaderPointerUp}
                style={{
                  padding: isEmbedded ? "13px 16px 10px" : "20px 20px 15px",
                  cursor: isEmbedded ? "default" : "grab",
                  touchAction: "none",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {/* Brand row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 15,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: -4,
                          borderRadius: "50%",
                          background:
                            state === "active"
                              ? "rgba(0,245,160,0.18)"
                              : "rgba(251,11,140,0.16)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          background: "linear-gradient(145deg,#11101a,#07060d)",
                          border: "1px solid rgba(255,255,255,0.16)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            state === "active"
                              ? "0 0 7px rgba(0,245,160,0.14),inset 0 1px 0 rgba(255,255,255,0.12)"
                              : "0 0 7px rgba(251,11,140,0.12),inset 0 1px 0 rgba(255,255,255,0.12)",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background:
                              state === "active"
                                ? `linear-gradient(145deg,${brand.green},#068a63)`
                                : `linear-gradient(145deg,${brand.pink},${brand.purple})`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                              state === "active"
                                ? "0 0 6px rgba(0,245,160,0.18)"
                                : "0 0 6px rgba(251,11,140,0.16)",
                          }}
                        >
                          <Phone size={16} color="#fff" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 950,
                          letterSpacing: 1.65,
                          lineHeight: 1,
                          background: `linear-gradient(135deg,#fff 0%,${brand.green} 30%,${brand.pink} 72%,#fff 100%)`,
                          backgroundSize: "220% 220%",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        PTDT-DIALER
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(249,247,255,0.48)",
                          fontWeight: 800,
                          letterSpacing: 0.62,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 5,
                          textTransform: "uppercase",
                        }}
                      >
                        <Signal
                          size={8}
                          color={state === "active" ? brand.green : brand.green}
                        />
                        Voice Console · Alt+D
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <StatusBadge
                      label={
                        state === "active"
                          ? "LIVE"
                          : state === "calling"
                            ? "ROUTE"
                            : "ONLINE"
                      }
                      color={
                        state === "active"
                          ? brand.green
                          : state === "calling"
                            ? brand.cyan
                            : brand.green
                      }
                      bg={
                        state === "active"
                          ? brand.greenSoft
                          : state === "calling"
                            ? "rgba(34,211,238,0.13)"
                            : brand.greenSoft
                      }
                      pulse={state === "active" || state === "calling"}
                    />
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={handleClose}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(145deg,rgba(255,255,255,0.095),rgba(255,255,255,0.035))",
                        border: "1px solid rgba(255,255,255,0.12)",
                        display: isEmbedded ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(249,247,255,0.46)",
                        cursor: isEmbedded ? "default" : "pointer",
                        transition: "all .18s ease",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(145deg,rgba(255,59,95,0.24),rgba(255,59,95,0.10))";
                        e.currentTarget.style.color = "#ff8ca0";
                        e.currentTarget.style.borderColor =
                          "rgba(255,59,95,0.38)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(145deg,rgba(255,255,255,0.095),rgba(255,255,255,0.035))";
                        e.currentTarget.style.color = "rgba(249,247,255,0.46)";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.12)";
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* ── LCD / Display ── */}
                <div
                  style={{
                    background:
                      "linear-gradient(145deg,rgba(2,2,8,0.92),rgba(14,9,25,0.80))",
                    borderRadius: 26,
                    padding: isEmbedded ? "11px 14px" : "15px 17px",
                    minHeight: isEmbedded ? 76 : 90,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border:
                      state === "active"
                        ? "1px solid rgba(0,245,160,0.30)"
                        : "1px solid rgba(251,11,140,0.20)",
                    boxShadow:
                      state === "active"
                        ? "inset 0 2px 24px rgba(0,0,0,0.76),0 0 36px rgba(0,245,160,0.10)"
                        : "inset 0 2px 24px rgba(0,0,0,0.76),0 0 36px rgba(251,11,140,0.10)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(0,245,160,0.055) 1px,transparent 1px)",
                      backgroundSize: "100% 7px",
                      opacity: 0.45,
                      pointerEvents: "none",
                    }}
                  />
                  {state === "active" ? (
                    <>
                      <div
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <StatusBadge
                          label="CONNECTED"
                          color={brand.green}
                          bg="rgba(0,245,160,0.12)"
                          pulse
                        />
                        {muted && (
                          <span
                            style={{
                              fontSize: 9,
                              background: "rgba(255,59,95,0.16)",
                              color: "#ff9caf",
                              padding: "5px 9px",
                              borderRadius: 999,
                              fontWeight: 900,
                              border: "1px solid rgba(255,59,95,0.28)",
                              letterSpacing: 0.8,
                            }}
                          >
                            MUTED
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          position: "relative",
                          fontSize: 12,
                          color: "rgba(0,245,160,0.62)",
                          marginTop: 9,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {contactName || number}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 5,
                          marginTop: 3,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 35,
                            fontWeight: 950,
                            fontFamily:
                              "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                            color: brand.green,
                            letterSpacing: 3,
                            textShadow: "0 0 28px rgba(0,245,160,0.70)",
                          }}
                        >
                          {fmt(elapsed)}
                        </span>
                      </div>
                    </>
                  ) : state === "calling" ? (
                    <>
                      <StatusBadge
                        label="ROUTING CALL"
                        color={brand.cyan}
                        bg="rgba(34,211,238,0.12)"
                        pulse
                      />
                      <div
                        style={{
                          position: "relative",
                          fontSize: 23,
                          fontFamily:
                            "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                          color: "rgba(236,253,255,0.96)",
                          letterSpacing: 2,
                          marginTop: 10,
                          fontWeight: 900,
                          textShadow: "0 0 22px rgba(34,211,238,0.45)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {number}
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          position: "relative",
                          fontSize: 9.5,
                          color: "rgba(249,247,255,0.46)",
                          fontWeight: 900,
                          letterSpacing: 1.25,
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Zap size={9} color={brand.green} /> Ready to call
                      </div>
                      <div
                        style={{
                          position: "relative",
                          fontSize: number ? 25 : 14,
                          fontFamily:
                            "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                          fontWeight: 900,
                          color: number ? "#fff7fb" : "rgba(249,247,255,0.22)",
                          letterSpacing: number ? 2.6 : 0.4,
                          textShadow: number
                            ? "0 0 24px rgba(251,11,140,0.44)"
                            : "none",
                          minHeight: 40,
                          display: "flex",
                          alignItems: "center",
                          transition: "font-size 0.12s",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {number || "Enter number…"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ════════════════════════════════════
                  BODY
              ════════════════════════════════════ */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  padding: isEmbedded ? "2px 40px 18px" : "3px 20px 24px",
                  position: "relative",
                  zIndex: 2,
                  flex: isEmbedded ? "1 1 auto" : undefined,
                  minHeight: isEmbedded ? 0 : undefined,
                  overflowY: isEmbedded ? "auto" : undefined,
                }}
                className={isEmbedded ? "ptdt-panel" : undefined}
              >
                {/* ── Search ── */}
                {(state === "dialpad" || state === "calling") && (
                    <div style={{ position: "relative", marginBottom: isEmbedded ? 12 : 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background:
                          "linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.026))",
                        border: "1px solid rgba(255,255,255,0.11)",
                        borderRadius: 24,
                        padding: isEmbedded ? "11px 20px" : "10px 13px",
                        gap: isEmbedded ? 11 : 9,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.08),0 12px 26px rgba(0,0,0,0.18)",
                      }}
                    >
                      <Search size={13} color={brand.pink} />
                      <input
                        className="ptdt-dialer-input"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setNumber(e.target.value);
                          setSugg(true);
                          setError(null);
                        }}
                        onFocus={() => setSugg(true)}
                        onBlur={() => setTimeout(() => setSugg(false), 160)}
                        placeholder="Search name or number…"
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          outline: "none",
                          fontSize: 13,
                          fontWeight: 750,
                          color: "rgba(249,247,255,0.88)",
                          caretColor: brand.green,
                          minWidth: 0,
                        }}
                      />
                      {number && (
                        <button
                          onClick={handleDelete}
                          style={{
                            width: isEmbedded ? 25 : 27,
                            height: isEmbedded ? 25 : 27,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(249,247,255,0.48)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <Delete size={12} />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {suggestions && filtered.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: 7,
                            background:
                              "linear-gradient(145deg,rgba(11,8,22,0.99),rgba(22,13,34,0.99))",
                            border: "1px solid rgba(251,11,140,0.22)",
                            borderRadius: 22,
                            overflow: "hidden",
                            zIndex: 20,
                            boxShadow:
                              "0 24px 60px rgba(0,0,0,0.74),0 0 36px rgba(251,11,140,0.12)",
                          }}
                        >
                          {filtered.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => selectContact(c)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 11,
                                padding: "11px 14px",
                                cursor: "pointer",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                                transition: "background .12s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(251,11,140,0.105)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <div
                                style={{
                                  width: 33,
                                  height: 33,
                                  borderRadius: "50%",
                                  background:
                                    "linear-gradient(145deg,rgba(251,11,140,0.22),rgba(0,245,160,0.11))",
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <UserIcon size={14} color={brand.green} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 850,
                                    color: brand.ink,
                                  }}
                                >
                                  {c.name || "Unknown"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: "rgba(249,247,255,0.42)",
                                    fontFamily:
                                      "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                                  }}
                                >
                                  {c.phone}
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        borderRadius: 18,
                        background:
                          "linear-gradient(145deg,rgba(255,59,95,0.18),rgba(255,59,95,0.08))",
                        border: "1px solid rgba(255,59,95,0.28)",
                        color: "#ff9caf",
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow: "0 12px 26px rgba(255,59,95,0.10)",
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ════════════════════════════════════
                    DIALPAD
                ════════════════════════════════════ */}
                {(state === "dialpad" || state === "calling") && (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        justifyItems: "center",
                        gap: isEmbedded ? 14 : 12,
                        marginBottom: isEmbedded ? 14 : 18,
                      }}
                    >
                      {KEYS.flat().map((k) => (
                        <DialKey
                          key={k}
                          label={k}
                          sub={SUB[k]}
                          onClick={() => handleKey(k)}
                          onLongPress={k === "0" ? handleZeroLongPress : undefined}
                          size={isEmbedded ? "embedded" : "normal"}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        marginBottom: recent.length > 0 ? 14 : 0,
                      }}
                    >
                      <motion.button
                        onClick={handleCall}
                        disabled={loading || state === "calling"}
                        whileHover={{
                          scale: loading || state === "calling" ? 1 : 1.006,
                          y: 0,
                        }}
                        whileTap={{
                          scale: loading || state === "calling" ? 1 : 0.965,
                        }}
                        style={{
                          flex: 1,
                          height: isEmbedded ? 52 : 57,
                          borderRadius: isEmbedded ? 20 : 24,
                          cursor:
                            loading || state === "calling" ? "wait" : "pointer",
                          background:
                            loading || state === "calling"
                              ? "rgba(34,211,238,0.20)"
                              : `linear-gradient(135deg,${brand.green},#09c990 40%,${brand.pink})`,
                          border: "none",
                          color: "#03100b",
                          fontWeight: 950,
                          fontSize: isEmbedded ? 14.5 : 15,
                          letterSpacing: 0.2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 9,
                          boxShadow:
                            loading || state === "calling"
                              ? "0 6px 14px rgba(34,211,238,0.08),inset 0 1px 0 rgba(255,255,255,0.14)"
                              : "0 7px 16px rgba(0,245,160,0.10),inset 0 1px 0 rgba(255,255,255,0.18)",
                          opacity: loading || state === "calling" ? 0.82 : 1,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          {loading || state === "calling" ? (
                            <Signal size={17} />
                          ) : (
                            <Phone size={17} />
                          )}
                          {loading || state === "calling"
                            ? "Routing…"
                            : "Start Call"}
                        </span>
                      </motion.button>

                      {state === "calling" && (
                        <motion.button
                          type="button"
                          onClick={handleHangup}
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          style={{
                            width: isEmbedded ? 132 : 92,
                            height: isEmbedded ? 52 : 57,
                            borderRadius: isEmbedded ? 20 : 24,
                            border: "1px solid rgba(255,59,95,0.42)",
                            background: "rgba(255,59,95,0.90)",
                            color: "#fff",
                            fontWeight: 950,
                            fontSize: isEmbedded ? 13.5 : 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            boxShadow: "0 7px 16px rgba(255,59,95,0.11),inset 0 1px 0 rgba(255,255,255,0.12)",
                          }}
                        >
                          <PhoneOff size={16} />
                          Cancel
                        </motion.button>
                      )}
                    </div>

                    {/* Recent mini list */}
                    {recent.length > 0 && (
                      <div
                        style={{
                          ...glassCard(false),
                          borderRadius: 22,
                          padding: isEmbedded ? "12px 16px" : "10px 10px 7px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: isEmbedded ? 0 : "0 2px 8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 10,
                              fontWeight: 950,
                              color: "rgba(249,247,255,0.48)",
                              textTransform: "uppercase",
                              letterSpacing: 1.2,
                            }}
                          >
                            <Clock size={10} color={brand.pink} />
                            Recent Signal
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenRecentCalls}
                            style={{
                              border: isEmbedded
                                ? "1px solid rgba(251,11,140,0.58)"
                                : "1px solid rgba(251,11,140,0.22)",
                              background: isEmbedded
                                ? "linear-gradient(135deg,rgba(251,11,140,0.30),rgba(139,92,246,0.18))"
                                : "rgba(251,11,140,0.08)",
                              color: isEmbedded ? "#fff" : "#ff8cc8",
                              borderRadius: 999,
                              padding: isEmbedded ? "6px 10px" : "5px 8px",
                              fontSize: isEmbedded ? 9 : 8.5,
                              fontWeight: 950,
                              cursor: "pointer",
                              letterSpacing: 0.55,
                              boxShadow: isEmbedded
                                ? "0 0 18px rgba(251,11,140,0.18),inset 0 1px 0 rgba(255,255,255,0.14)"
                                : undefined,
                              textShadow: isEmbedded ? "0 1px 10px rgba(255,255,255,0.22)" : undefined,
                            }}
                          >
                            VIEW ALL · {recent.length}
                          </button>
                        </div>
                        {!isEmbedded && (
                          <div style={{ maxHeight: 92, overflow: "hidden" }}>
                            {recent.slice(0, 2).map((c, i) => (
                              <div
                                key={i}
                                onClick={() => {
                                  setNumber(c.phone);
                                  setName(c.name || "");
                                  setQuery(c.phone);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "9px 9px",
                                  borderRadius: 16,
                                  cursor: "pointer",
                                  transition: "background .12s",
                                  marginBottom: 3,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(251,11,140,0.08)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                <div
                                  style={{
                                    width: 31,
                                    height: 31,
                                    borderRadius: "50%",
                                    background: `${outcomeColor(c.outcome)}18`,
                                    border: `1.5px solid ${outcomeColor(c.outcome)}50`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    boxShadow: `0 0 20px ${outcomeColor(c.outcome)}13`,
                                  }}
                                >
                                  <Phone
                                    size={11}
                                    color={outcomeColor(c.outcome)}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 12.2,
                                      fontWeight: 850,
                                      color: "rgba(249,247,255,0.84)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {c.name || c.phone}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 9.5,
                                      color: "rgba(249,247,255,0.34)",
                                      fontFamily:
                                        "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                                    }}
                                  >
                                    {fmt(c.duration)} · {timeAgo(c.at)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════════
                    ACTIVE CALL
                ════════════════════════════════════ */}
                {state === "active" && (
                  <div>
                    {/* Avatar */}
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: -7,
                            borderRadius: "50%",
                            border: "1px solid rgba(0,245,160,0.26)",
                          }}
                        />
                        <div
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(145deg,rgba(0,245,160,0.22),rgba(251,11,140,0.08))",
                            border: "2px solid rgba(0,245,160,0.38)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                              "0 0 42px rgba(0,245,160,0.26),inset 0 1px 0 rgba(255,255,255,0.12)",
                          }}
                        >
                          <UserIcon size={28} color={brand.green} />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 950,
                          color: brand.ink,
                          marginTop: 12,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {contactName || "Unknown"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(249,247,255,0.44)",
                          fontFamily:
                            "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                          marginTop: 3,
                        }}
                      >
                        {number}
                      </div>
                    </div>

                    <Waveform active={!muted} />

                    {/* Tab bar */}
                    <div
                      style={{
                        display: "flex",
                        background: "rgba(255,255,255,0.052)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 24,
                        padding: 5,
                        gap: 4,
                        margin: "14px 0 12px",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                      }}
                    >
                      {(["controls", "dtmf", "history"] as ActiveTab[]).map(
                        (t) => (
                          <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                              flex: 1,
                              padding: "8px 6px",
                              borderRadius: 20,
                              border: "none",
                              fontSize: 9.5,
                              fontWeight: 950,
                              textTransform: "uppercase",
                              letterSpacing: 0.58,
                              background:
                                tab === t
                                  ? `linear-gradient(135deg,${brand.greenSoft},${brand.pinkSoft})`
                                  : "transparent",
                              color:
                                tab === t
                                  ? brand.ink
                                  : "rgba(249,247,255,0.30)",
                              cursor: "pointer",
                              transition: "all .15s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                              boxShadow:
                                tab === t
                                  ? "0 10px 22px rgba(0,245,160,0.09),inset 0 1px 0 rgba(255,255,255,0.10)"
                                  : "none",
                            }}
                          >
                            {t === "controls" && (
                              <>
                                <ChevronDown size={9} />
                                Controls
                              </>
                            )}
                            {t === "dtmf" && (
                              <>
                                <Hash size={9} />
                                Keypad
                              </>
                            )}
                            {t === "history" && (
                              <>
                                <Clock size={9} />
                                History
                              </>
                            )}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Controls */}
                    {tab === "controls" && (
                      <div style={{ marginBottom: 12 }}>
                        <motion.button
                          onClick={handleMuteToggle}
                          whileHover={{ y: -1, scale: 1.01 }}
                          whileTap={{ scale: 0.965 }}
                          style={{
                            width: "100%",
                            height: 50,
                            borderRadius: 23,
                            background: muted
                              ? "rgba(255,59,95,0.13)"
                              : "rgba(255,255,255,0.045)",
                            border: muted
                              ? "1px solid rgba(255,59,95,0.36)"
                              : "1px solid rgba(255,255,255,0.105)",
                            color: muted ? "#ff9caf" : "rgba(249,247,255,0.62)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 9,
                            fontWeight: 850,
                            fontSize: 13,
                            cursor: "pointer",
                            marginBottom: 10,
                            transition: "background .14s ease,border-color .14s ease,color .14s ease",
                            boxShadow: muted
                              ? "0 7px 16px rgba(255,59,95,0.09),inset 0 1px 0 rgba(255,255,255,0.08)"
                              : "inset 0 1px 0 rgba(255,255,255,0.08)",
                          }}
                        >
                          {muted ? (
                            <>
                              <MicOff size={15} />
                              Unmute Microphone
                            </>
                          ) : (
                            <>
                              <Mic size={15} />
                              Mute Microphone
                            </>
                          )}
                        </motion.button>

                        <div
                          style={{
                            ...glassCard(false),
                            borderRadius: 23,
                            padding: "12px 13px",
                            display: "grid",
                            gap: 9,
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Mic
                                size={15}
                                color={muted ? brand.red : brand.cyan}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 950,
                                    color: "rgba(249,247,255,0.74)",
                                    letterSpacing: 0.4,
                                  }}
                                >
                                  Microphone Input
                                </div>
                                <div
                                  style={{
                                    fontSize: 9.5,
                                    color: "rgba(249,247,255,0.34)",
                                    marginTop: 2,
                                  }}
                                >
                                  Choose mic and watch live input level
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={requestMicrophoneAccess}
                              style={{
                                border: "1px solid rgba(34,211,238,0.24)",
                                background: "rgba(34,211,238,0.09)",
                                color: brand.cyan,
                                borderRadius: 999,
                                padding: "6px 8px",
                                fontSize: 8.5,
                                fontWeight: 900,
                                cursor: "pointer",
                                letterSpacing: 0.5,
                              }}
                            >
                              PERMIT
                            </button>
                          </div>
                          <AudioDeviceSelect
                            value={sipAudioInputDeviceId}
                            devices={audioInputs}
                            placeholder="Select microphone input"
                            onChange={(deviceId) => {
                              void setSipAudioInputDevice(deviceId).catch(
                                (err) => {
                                  const msg =
                                    err instanceof Error
                                      ? err.message
                                      : "Could not switch microphone/input device";
                                  setError(msg);
                                },
                              );
                            }}
                          />

                          <div
                            style={{
                              height: 9,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.07)",
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(microphoneLevel * 100)}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: muted
                                  ? "linear-gradient(90deg,rgba(255,59,95,0.35),rgba(255,59,95,0.50))"
                                  : "linear-gradient(90deg,#22d3ee,#00f5a0)",
                                boxShadow: muted
                                  ? "none"
                                  : "0 0 8px rgba(0,245,160,0.20)",
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 9,
                              color: "rgba(249,247,255,0.32)",
                              fontWeight: 850,
                              letterSpacing: 0.45,
                            }}
                          >
                            <span>{muted ? "Muted" : "Live mic level"}</span>
                            <span>{Math.round(microphoneLevel * 100)}%</span>
                          </div>

                          {(sipAudioInputError || microphoneMeterError) && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#ff9caf",
                                lineHeight: 1.45,
                              }}
                            >
                              {sipAudioInputError || microphoneMeterError}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            ...glassCard(false),
                            borderRadius: 23,
                            padding: "12px 13px",
                            display: "grid",
                            gap: 9,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Volume2 size={15} color={brand.green} />
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 950,
                                    color: "rgba(249,247,255,0.74)",
                                    letterSpacing: 0.4,
                                  }}
                                >
                                  Speaker Output
                                </div>
                                <div
                                  style={{
                                    fontSize: 9.5,
                                    color: "rgba(249,247,255,0.34)",
                                    marginTop: 2,
                                  }}
                                >
                                  Route call audio to speaker or headset
                                </div>
                              </div>
                            </div>
                            <div
                              style={{ display: "flex", gap: 6, flexShrink: 0 }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  void refreshAudioDevices();
                                }}
                                style={{
                                  border: "1px solid rgba(0,245,160,0.20)",
                                  background: "rgba(0,245,160,0.08)",
                                  color: brand.green,
                                  borderRadius: 999,
                                  padding: "6px 8px",
                                  fontSize: 8.5,
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  letterSpacing: 0.5,
                                }}
                              >
                                REFRESH
                              </button>
                              <button
                                type="button"
                                onClick={testSpeaker}
                                style={{
                                  border: "1px solid rgba(251,11,140,0.24)",
                                  background: "rgba(251,11,140,0.10)",
                                  color: "#ff8cc8",
                                  borderRadius: 999,
                                  padding: "6px 8px",
                                  fontSize: 8.5,
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  letterSpacing: 0.5,
                                }}
                              >
                                TEST
                              </button>
                            </div>
                          </div>
                          <AudioDeviceSelect
                            value={sipAudioOutputDeviceId}
                            devices={audioOutputs}
                            disabled={!canSelectOutput}
                            placeholder="Select speaker output"
                            onChange={(deviceId) => {
                              void setSipAudioOutputDevice(deviceId).catch(
                                (err) => {
                                  const msg =
                                    err instanceof Error
                                      ? err.message
                                      : "Could not switch speaker/audio output";
                                  setError(msg);
                                },
                              );
                            }}
                          />

                          {!canSelectOutput && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#ffd27a",
                                lineHeight: 1.45,
                              }}
                            >
                              Speaker switching is not supported in this
                              runtime. The system default output will be used.
                            </div>
                          )}

                          {(audioDevicesError || sipAudioOutputError) && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#ff9caf",
                                lineHeight: 1.45,
                              }}
                            >
                              {audioDevicesError || sipAudioOutputError}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DTMF */}
                    {tab === "dtmf" && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontFamily:
                              "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                            fontSize: 18,
                            fontWeight: 950,
                            color: brand.green,
                            letterSpacing: 4,
                            textAlign: "center",
                            padding: "9px 12px",
                            background:
                              "linear-gradient(145deg,rgba(0,245,160,0.11),rgba(251,11,140,0.06))",
                            border: "1px solid rgba(0,245,160,0.22)",
                            borderRadius: 18,
                            minHeight: 39,
                            marginBottom: 11,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                          }}
                        >
                          {dtmfBuf || (
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(249,247,255,0.25)",
                                letterSpacing: 0,
                              }}
                            >
                              Press keys…
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3,1fr)",
                            justifyItems: "center",
                            gap: 10,
                          }}
                        >
                          {KEYS.flat().map((k) => (
                            <DialKey
                              key={k}
                              label={k}
                              onClick={() => handleDTMF(k)}
                              size="small"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {tab === "history" && (
                      <div
                        style={{
                          marginBottom: 12,
                          maxHeight: 132,
                          overflowY: "auto",
                        }}
                        className="ptdt-panel"
                      >
                        {recent.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "0 7px 7px",
                              color: "rgba(249,247,255,0.36)",
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing: 0.7,
                              textTransform: "uppercase",
                            }}
                          >
                            <span>Latest 5</span>
                            <button
                              type="button"
                              onClick={handleOpenRecentCalls}
                              style={{
                                border: "1px solid rgba(251,11,140,0.22)",
                                background: "rgba(251,11,140,0.08)",
                                color: "#ff8cc8",
                                borderRadius: 999,
                                padding: "4px 7px",
                                fontSize: 8,
                                fontWeight: 900,
                                cursor: "pointer",
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                              }}
                            >
                              View all
                            </button>
                          </div>
                        )}
                        {recent.length === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: 12,
                              color: "rgba(249,247,255,0.25)",
                              padding: "18px 0",
                              borderRadius: 18,
                              border: "1px dashed rgba(255,255,255,0.10)",
                            }}
                          >
                            No recent calls
                          </div>
                        ) : (
                          recent.slice(0, 5).map((c, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 7px",
                                borderRadius: 14,
                                cursor: "pointer",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.052)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(251,11,140,0.07)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <div
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: "50%",
                                  background: outcomeColor(c.outcome),
                                  flexShrink: 0,
                                  boxShadow: `0 0 10px ${outcomeColor(c.outcome)}`,
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 12.2,
                                    fontWeight: 850,
                                    color: "rgba(249,247,255,0.80)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {c.name || c.phone}
                                </div>
                                <div
                                  style={{
                                    fontSize: 9.5,
                                    color: "rgba(249,247,255,0.34)",
                                    fontFamily:
                                      "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                                  }}
                                >
                                  {fmt(c.duration)} · {timeAgo(c.at)}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Hang Up */}
                    <motion.button
                      onClick={handleHangup}
                      whileHover={{ scale: 1.01, y: 0 }}
                      whileTap={{ scale: 0.955 }}
                      style={{
                        width: "100%",
                        height: 58,
                        borderRadius: 25,
                        cursor: "pointer",
                        background:
                          "rgba(255,59,95,0.94)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: "#fff",
                        fontWeight: 950,
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        boxShadow:
                          "0 9px 20px rgba(255,59,95,0.18),inset 0 1px 0 rgba(255,255,255,0.14)",
                        transition: "background .14s ease,transform .08s ease",
                        letterSpacing: 0.15,
                      }}
                    >
                      <PhoneOff size={18} /> End Call
                    </motion.button>
                  </div>
                )}
              </div>

              {!isEmbedded && (
                <div
                  style={{
                    height: 5,
                    background: "rgba(0,245,160,0.36)",
                    boxShadow: "none",
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isEmbedded && (
          <motion.button
            onClick={handleOpenRecentCalls}
            title="Recent Calls / Signals"
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.94 }}
            style={{
              height: 42,
              borderRadius: 999,
              padding: "0 15px",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.14)",
              color: brand.ink,
              background: "rgba(16,10,30,0.94)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 8px 18px rgba(0,0,0,0.20)",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: 0.7,
              textTransform: "uppercase",
            }}
          >
            <Clock size={14} color={brand.green} /> Recent Calls
          </motion.button>
        )}

        {/* ══════════════════════════════════════════
            FAB — PTDT Orb
        ══════════════════════════════════════════ */}
        {!isEmbedded && (
          <motion.button
            onClick={handleFABClick}
            title="PTDT-Dialer (Alt+D)"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#fff",
              background:
                state === "active"
                  ? `radial-gradient(circle at 30% 20%,#fff,${brand.green} 20%,#0ea574 58%,#063426)`
                  : `radial-gradient(circle at 30% 20%,#fff,${brand.pink} 18%,${brand.purple} 55%,#211033)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                state === "active"
                  ? "0 0 0 4px rgba(0,245,160,0.06),0 8px 20px rgba(0,245,160,0.14)"
                  : "0 0 0 4px rgba(251,11,140,0.06),0 8px 20px rgba(251,11,140,0.13)",
              transition: "background 0.18s, box-shadow 0.18s",
              flexShrink: 0,
              position: "relative",
              overflow: "visible",
            }}
          >
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background:
                state === "active"
                  ? `linear-gradient(145deg,rgba(0,245,160,0.34),rgba(34,211,238,0.14))`
                  : `linear-gradient(145deg,rgba(251,11,140,0.32),rgba(139,92,246,0.16))`,
              opacity: 0.78,
              zIndex: -1,
            }}
          />
          <AnimatePresence mode="wait">
            {state === "active" ? (
              <motion.span
                key="a"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                style={{ display: "flex", position: "relative" }}
              >
                <PhoneCall size={27} />
              </motion.span>
            ) : isOpen ? (
              <motion.span
                key="o"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                style={{ display: "flex", position: "relative" }}
              >
                <X size={25} />
              </motion.span>
            ) : (
              <motion.span
                key="c"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                style={{ display: "flex", position: "relative" }}
              >
                <Phone size={27} />
              </motion.span>
            )}
          </AnimatePresence>
          </motion.button>
        )}
      </div>

      <RecentCallsModal
        open={recentCallsOpen}
        calls={recent}
        onClose={() => setRecentCallsOpen(false)}
        onClear={handleClearRecentCalls}
        onRedial={handleRedialRecentCall}
      />
      <CallDispositionModal
        open={!isEmbedded && showSipDisposition}
        callId={pendingSipDisposition?.callId ?? null}
        contactName={pendingSipDisposition?.remoteIdentity ?? null}
        saveMode={pendingSipDisposition?.saveMode ?? 'preview'}
        helperText={
          pendingSipDisposition?.saveMode === 'preview'
            ? 'This SIP call was not logged to the backend. Disposition is for your session only.'
            : null
        }
        onClose={dismissSipDisposition}
        onSaved={dismissSipDisposition}
      />
    </>
  );
}
