// Shared inline-link renderer: parses [link text](url) markdown-style links
// into blue underlined anchors. Kept in its own leaf module (no server
// imports) so client components like DocumentChecklist can use it without
// pulling in blocks/index.tsx, which imports server-only Supabase code.
export const renderInlineLinks = (text: string | undefined) => {
  if (!text) return null;
  // Parse [link text](/url) markdown-style links
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return <a key={i} href={match[2]} className="text-[#0099cc] underline hover:text-[#007aa3]">{match[1]}</a>;
    }
    return <span key={i}>{part}</span>;
  });
};
