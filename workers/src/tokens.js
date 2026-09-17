// Design tokens — single source of truth for the black/white/blue brand.
// Updated to match the approved mockup canvas: Fraunces (display) + Manrope
// (body) instead of Inter, and the exact hex values used across all 5 mocked
// pages. Change values here and every block on every page picks it up.

export const tokens = {
  color: {
    ink: "#0B0B0D",
    ink70: "#4B4B52",
    ink45: "#84848C",
    paper: "#FFFFFF",
    surface: "#F5F5F7",
    line: "#E4E4E8",
    blue: "#2451E0",
    blueDim: "#EDF1FD",
    success: "#1B7F5C",
    successDim: "#EAF6EF",
    warning: "#d97706",
  },
  font: {
    display: "'Fraunces', serif",
    body: "'Manrope', sans-serif",
    googleFontsHref: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap",
    scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.25rem", xl: "1.75rem", xxl: "2.5rem" },
  },
  space: { xs: "0.5rem", sm: "1rem", md: "1.5rem", lg: "2.5rem", xl: "4rem" },
  radius: { sm: "4px", md: "8px", lg: "16px" },
};

export function tokensAsCSS() {
  return `
    :root {
      --color-ink: ${tokens.color.ink};
      --color-ink-70: ${tokens.color.ink70};
      --color-ink-45: ${tokens.color.ink45};
      --color-paper: ${tokens.color.paper};
      --color-surface: ${tokens.color.surface};
      --color-line: ${tokens.color.line};
      --color-blue: ${tokens.color.blue};
      --color-blue-dim: ${tokens.color.blueDim};
      --color-success: ${tokens.color.success};
      --color-success-dim: ${tokens.color.successDim};
      /* kept for any old block still referencing the pre-rebrand names */
      --color-black: ${tokens.color.ink};
      --color-white: ${tokens.color.paper};
      --color-accent: ${tokens.color.blue};
      --color-accent-dark: ${tokens.color.blue};
      --color-neutral-100: ${tokens.color.surface};
      --color-neutral-300: ${tokens.color.line};
      --color-neutral-600: ${tokens.color.ink70};
      --font-display: ${tokens.font.display};
      --font-body: ${tokens.font.body};
      --font-family: ${tokens.font.body};
      --space-xs: ${tokens.space.xs};
      --space-sm: ${tokens.space.sm};
      --space-md: ${tokens.space.md};
      --space-lg: ${tokens.space.lg};
      --space-xl: ${tokens.space.xl};
      --radius-sm: ${tokens.radius.sm};
      --radius-md: ${tokens.radius.md};
      --radius-lg: ${tokens.radius.lg};
    }
    *{ box-sizing:border-box; }
    body { font-family: var(--font-body); color: var(--color-ink); background: var(--color-paper); margin:0; }
    h1,h2,h3 { font-family: var(--font-display); margin:0; font-weight:500; letter-spacing:-0.01em; }
    .btn { display:inline-block; padding: 0.75rem 1.5rem; border-radius: 999px; text-decoration:none; font-weight:600; font-size:0.85rem; border:none; cursor:pointer; }
    .btn-accent { background: var(--color-blue); color: var(--color-paper); }
    .btn-accent:hover { background: var(--color-ink); }
    .btn-outline { border: 1px solid var(--color-line); color: var(--color-ink); background:transparent; }
    .site-header { display:flex; align-items:center; justify-content:space-between; padding: var(--space-sm) var(--space-lg); border-bottom: 1px solid var(--color-line); }
    .site-header .logo { font-family: var(--font-display); font-size:22px; font-weight:600; text-decoration:none; color:var(--color-ink); }
    .main-nav { display:flex; gap:28px; }
    .nav-link { font-size:14px; color: var(--color-ink-70); text-decoration:none; }
    .header-actions { display:flex; align-items:center; gap:14px; }
    .nav-toggle { display:none; flex-direction:column; justify-content:center; gap:5px; width:36px; height:36px; border:1px solid var(--color-line); border-radius:8px; background:transparent; cursor:pointer; padding:0; }
    .nav-toggle span { display:block; height:2px; width:18px; margin:0 auto; background:var(--color-ink); transition:transform .2s, opacity .2s; }
    .nav-toggle.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
    .nav-toggle.open span:nth-child(2) { opacity:0; }
    .nav-toggle.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
    .hero { background-size:cover; background-position:center; padding: var(--space-xl) var(--space-lg); color: var(--color-paper); }
    .stats-row { display:flex; gap: var(--space-lg); flex-wrap:wrap; }
    .stat strong { display:block; font-size: 1.5rem; font-family:var(--font-display); }
    .lead-form { display:flex; flex-direction:column; gap: var(--space-xs); max-width: 480px; }
    .lead-form input, .lead-form textarea { padding: 0.75rem; border:1px solid var(--color-line); border-radius: var(--radius-sm); font-family:inherit; }
    .site-footer { padding: var(--space-lg); background: var(--color-ink); color: var(--color-paper); text-align:center; }

    /* ═══ Responsive — shell/header/footer ═══ */
    @media (max-width: 900px) {
      .site-header { padding: var(--space-xs) var(--space-sm); flex-wrap:wrap; }
      .nav-toggle { display:flex; }
      .main-nav {
        display:none; position:absolute; top:100%; left:0; right:0;
        flex-direction:column; gap:0; background:var(--color-paper);
        border-bottom:1px solid var(--color-line); padding: var(--space-xs) var(--space-sm);
        box-shadow:0 8px 20px rgba(11,11,13,0.08); z-index:40;
      }
      .main-nav.open { display:flex; }
      .main-nav .nav-link { padding:12px 4px; border-bottom:1px solid var(--color-line); }
      .main-nav .nav-link:last-child { border-bottom:none; }
      .site-header { position:relative; }
    }
    @media (max-width: 600px) {
      .site-header .logo { font-size:18px; }
      .hero { padding: var(--space-lg) var(--space-sm); }
      .header-actions .btn-accent { padding:8px 14px; font-size:12px; }
    }
  `;
}
