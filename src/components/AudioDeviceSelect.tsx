import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface AudioDeviceOption {
  deviceId: string
  label: string
}

interface Props {
  value: string
  devices: AudioDeviceOption[]
  disabled?: boolean
  placeholder?: string
  onChange: (deviceId: string) => void
}

function compactLabel(label: string, fallback: string) {
  const clean = (label || fallback).trim()

  // Keep labels readable but compact inside the PTDT overlay.
  return clean
    .replace(/^default\s*[-–—:]\s*/i, 'Default · ')
    .replace(/\s*\((Bluetooth|Built-in|Virtual|USB|HDMI|AirPlay)\)\s*$/i, ' · $1')
    .replace(/\s+/g, ' ')
}

export default function AudioDeviceSelect({
  value,
  devices,
  disabled = false,
  placeholder = 'Select device',
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const safeDevices = useMemo(() => {
    if (!devices.length) return []

    return devices.map((device, index) => ({
      ...device,
      deviceId: device.deviceId || `audio-device-${index}`,
      label: compactLabel(device.label, index === 0 ? 'Default System Output' : 'Audio Device'),
    }))
  }, [devices])

  const selected =
    safeDevices.find(d => d.deviceId === value) ||
    safeDevices[0] ||
    null

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        zIndex: open ? 999999 : 1,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(v => !v)
        }}
        style={{
          width: '100%',
          maxWidth: '100%',
          minHeight: 40,
          borderRadius: 14,
          border: open
            ? '1px solid rgba(0,245,160,0.28)'
            : '1px solid rgba(255,255,255,0.13)',
          background: 'rgba(4,3,10,0.78)',
          color: '#f9f7ff',
          padding: '9px 10px',
          outline: 'none',
          fontSize: 11,
          lineHeight: 1.2,
          fontWeight: 850,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
          boxSizing: 'border-box',
          boxShadow: open
            ? '0 0 0 3px rgba(0,245,160,0.055),inset 0 1px 0 rgba(255,255,255,0.08)'
            : 'inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        <span
          title={selected?.label || placeholder}
          style={{
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {selected?.label || placeholder}
        </span>

        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.16s ease',
            color: 'rgba(249,247,255,0.58)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 6px)',
            width: '100%',
            maxWidth: '100%',
            maxHeight: 142,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRadius: 14,
            background: 'linear-gradient(145deg,rgba(10,7,18,0.99),rgba(22,13,34,0.99))',
            border: '1px solid rgba(251,11,140,0.22)',
            boxShadow: '0 18px 44px rgba(0,0,0,0.72),0 0 24px rgba(251,11,140,0.14)',
            padding: 5,
            zIndex: 999999,
            boxSizing: 'border-box',
          }}
        >
          {safeDevices.length === 0 ? (
            <div
              style={{
                padding: '9px 10px',
                color: 'rgba(249,247,255,0.42)',
                fontSize: 10.5,
                fontWeight: 750,
                boxSizing: 'border-box',
              }}
            >
              No audio devices found
            </div>
          ) : (
            safeDevices.map(device => {
              const active = device.deviceId === value

              return (
                <button
                  key={device.deviceId}
                  type="button"
                  title={device.label}
                  onClick={() => {
                    onChange(device.deviceId)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 9px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: active
                      ? 'linear-gradient(135deg,rgba(0,245,160,0.18),rgba(251,11,140,0.12))'
                      : 'transparent',
                    color: active ? '#00f5a0' : 'rgba(249,247,255,0.82)',
                    fontSize: 10.25,
                    lineHeight: 1.2,
                    fontWeight: active ? 950 : 800,
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {active ? '✓ ' : ''}
                  {device.label}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
