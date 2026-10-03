/** Black diagonal arrow button for cards. Absolutely positioned — the parent
 *  card must be `relative` (and `group` for the hover nudge). */
export function CardArrowButton() {
  return (
    <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-soft text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </span>
  );
}
