/** Black pill card CTA with the site's diagonal arrow — right-aligned inside cards. */
export function PreconCardCta({ label }: { label: string }) {
  return (
    <span className="mt-3 flex justify-end">
      <span className="inline-flex h-[42px] items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-bold text-white transition-opacity group-hover:opacity-85">
        {label}
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17L17 7M7 7h10v10" />
        </svg>
      </span>
    </span>
  );
}
