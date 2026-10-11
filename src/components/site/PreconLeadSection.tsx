import { LeadForm } from "@/components/blocks/LeadForm";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { IconClock, IconCalendar, IconFile, IconLock } from "@/components/site/PreconIcons";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

const TRUST_ITEMS = [
  [IconClock, "Fast Response", "We respond to all inquiries within 24 hours."],
  [IconCalendar, "Private Showings", "Book a private tour at a time that works for you."],
  [IconFile, "Full Brochure", "Get pricing, floor plans, and availability packages."],
  [IconLock, "No Obligation", "Your information stays private. No pressure, ever."],
] as const;

/** Shared "Get In Touch" lead section for all pre-con pages. */
export function PreconLeadSection({
  heading,
  defaultMessage,
  siteName,
}: {
  heading: string;
  defaultMessage: string;
  siteName: string;
}) {
  return (
    <section id="lead" className="mt-[50px] border-t border-line">
      <div className={`${wrap} py-[50px]`}>
        <PreconSectionHeader eyebrow="Get In Touch" heading={heading} />
        <div className="grid gap-10 pt-10 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-5">
            <h3 className="font-display text-xl font-bold md:text-2xl">Let&apos;s Find Your Perfect Pre-Construction Home</h3>
            <p className="text-sm leading-relaxed text-muted md:text-base">
              Our team is ready to connect you with the right project, floor plan, and payment plan to match your
              lifestyle and budget. Register now for VIP access.
            </p>
            <div className="flex flex-col gap-4 pt-2">
              {TRUST_ITEMS.map(([Icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-soft">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-bold">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`${card} h-fit p-6 md:p-8`}>
            <LeadForm
              data={{
                form_key: "precon",
                heading: "Register Your Interest",
                submit_label: "Let's Connect",
                split_name: true,
                full_width_fields: true,
                default_message: defaultMessage,
              }}
              siteName={siteName}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
