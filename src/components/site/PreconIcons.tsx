const stroke = { fill: "none", stroke: "#919191", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconHome({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
}
export function IconBuilding({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M9 7h.01M9 11h.01M15 7h.01M15 11h.01" /></svg>;
}
export function IconCheckBadge({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></svg>;
}
export function IconPin({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
}
export function IconClock({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
}
export function IconCalendar({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
}
export function IconFile({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5M9 13h6M9 17h6" /></svg>;
}
export function IconLock({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><rect x="4" y="10" width="16" height="11" rx="1.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}
export function IconCheck({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
}
export function IconStar({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="#919191" stroke="none"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.8 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" /></svg>;
}
export function IconClockAlarm({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 3h6M4.5 6.5l1.5 1.5M19.5 6.5L18 8" /></svg>;
}
export function IconCompass({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>;
}
