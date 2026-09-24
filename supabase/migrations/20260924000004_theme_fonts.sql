-- Two separate, runtime-configurable fonts: one for headings, one for body
-- text (Settings > Branding). Loaded via Google Fonts at request time.
--
-- Note: this also depends on a code-side fix (globals.css: `@theme inline`
-- -> `@theme`) — the `inline` modifier makes Tailwind bake the *resolved*
-- font/color values into compiled utility classes at build time, which is
-- why theme changes weren't actually reaching rendered pages before. Plain
-- `@theme` keeps a live var() reference so runtime overrides here work.
update public.site_settings
set theme = theme || '{"font_heading":"Space Grotesk","font_body":"Inter"}'::jsonb
where id = 1 and not (theme ? 'font_heading');
