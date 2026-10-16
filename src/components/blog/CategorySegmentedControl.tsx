import Link from "next/link";

/** Unified segmented category control — same on /updates and /updates/[category], desktop and mobile. */
export function CategorySegmentedControl({
  categories,
  activeSlug,
}: {
  categories: { id: string; name: string; slug: string }[];
  /** "all" for the landing page, or the category slug */
  activeSlug: string;
}) {
  return (
    <div className="mb-10 overflow-x-auto">
      <div className="inline-flex min-w-full items-center gap-1 rounded-[var(--radius-btn)] border border-line bg-white p-1.5 sm:min-w-0">
        <Link
          href="/updates"
          className={`whitespace-nowrap rounded-[var(--radius-btn)] px-4 py-2 text-sm font-semibold ${
            activeSlug === "all" ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          All posts
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/updates/${c.slug}`}
            className={`whitespace-nowrap rounded-[var(--radius-btn)] px-4 py-2 text-sm ${
              activeSlug === c.slug ? "bg-ink font-semibold text-white" : "font-medium text-muted hover:text-ink"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
