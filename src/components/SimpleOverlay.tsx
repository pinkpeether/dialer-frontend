export default function SimpleOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return <div>Working...</div>
}
