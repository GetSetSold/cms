export function CardArrowButton() {
  return (
    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 backdrop-blur transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </span>
  );
}
