import { useEffect, useMemo, useState } from 'react';
import type { CelebrationEvent } from '../api/uiUxPro.api';

interface Props {
  event: CelebrationEvent | null;
  enabled: boolean;
}

export default function ConfettiCelebration({ event, enabled }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event || !enabled) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [event, enabled]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 32 }, (_, index) => ({
        id: index,
        left: `${(index * 29) % 100}%`,
        delay: `${(index % 8) * 90}ms`,
        size: 7 + (index % 5),
        rotate: `${(index * 37) % 360}deg`,
      })),
    [],
  );

  if (!event || !enabled || !visible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 120, overflow: 'hidden' }}>
      {confetti.map((piece) => (
        <span
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.left,
            top: -24,
            width: piece.size,
            height: piece.size * 1.7,
            borderRadius: 3,
            background:
              piece.id % 3 === 0
                ? '#fb0a8b'
                : piece.id % 3 === 1
                  ? '#00e5a0'
                  : '#a855f7',
            transform: `rotate(${piece.rotate})`,
            animation: `ptdtConfettiFall 2.7s ease-in ${piece.delay} forwards`,
          }}
        />
      ))}

      <style>
        {`
          @keyframes ptdtConfettiFall {
            0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
            70% { opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
        `}
      </style>

      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: 28,
          transform: 'translateX(-50%)',
          width: 'min(92vw, 560px)',
          background: 'linear-gradient(135deg, rgba(251,10,139,.96), rgba(88,28,135,.96))',
          color: '#fff',
          borderRadius: 18,
          padding: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900 }}>{event.title}</div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>{event.message}</div>
      </div>
    </div>
  );
}
