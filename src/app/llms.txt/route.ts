import { getPublishedSlugs, getSettings } from "@/lib/cms";
import { GUIDES } from "@/lib/guides/registry";

export const dynamic = "force-dynamic";

/** llms.txt — structured site summary for AI assistants (ChatGPT, Perplexity, Gemini, etc.) */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [pages, settings] = await Promise.all([getPublishedSlugs(), getSettings()]);
  const c = (settings as any).contact ?? {};
  
  let txt = `# ${settings.site_name}\n\n`;
  txt += `> ${c.tagline || "Real estate services in Caledonia, Haldimand County, Hamilton, Niagara, Halton, and the Greater Toronto Area."}\n\n`;
  
  txt += `## About\n\n`;
  txt += `${settings.site_name} is a real estate brokerage website operated by Rohit Sharma, REALTOR®, Lombard Group Real Estate Inc., Brokerage. `;
  txt += `Primary service area: Caledonia & Haldimand County, also serving Hamilton, Niagara, Halton, and the GTA. `;
  txt += `Services: buying, selling, renting, home valuations, and investment properties.\n\n`;
  
  if (c.phone) txt += `- Phone: ${c.phone}\n`;
  if (c.email) txt += `- Email: ${c.email}\n`;
  if (c.address) txt += `- Address: ${c.address}\n`;
  txt += `\n`;
  
  txt += `## Key Pages\n\n`;
  const keyPages = pages.filter((p) => ["home", "about", "contact", "listings"].includes(p.slug));
  for (const p of keyPages) {
    const url = p.slug === "home" ? `${base}/` : `${base}/${p.slug}`;
    txt += `- [${p.slug}](${url})\n`;
  }
  txt += `\n`;
  
  txt += `## Calculators\n\n`;
  txt += `Free real estate calculators at ${base}/calculators:\n`;
  txt += `- Affordability, mortgage payment, land transfer tax (Ontario), closing costs, buy vs rent, and more.\n\n`;
  
  txt += `## Guides\n\n`;
  txt += `Real estate guides at ${base}/guides (44 guides covering buying, selling, mortgages, and local markets).\n\n`;
  
  txt += `## Listings\n\n`;
  txt += `Browse active MLS listings at ${base}/listings, or by city:\n`;
  txt += `- ${base}/caledonia-real-estate\n`;
  txt += `- ${base}/hamilton-real-estate\n`;
  txt += `- ${base}/ontario-real-estate (all cities)\n\n`;
  
  txt += `## Fee Structure\n\n`;
  txt += `- Listing side: 1% (Seller Success Program)\n`;
  txt += `- Buyer-agent co-op: 2% under $1M, 2.5% recommended over $1M\n`;
  txt += `- Total: 3% + HST under $1M, 3.5% + HST over $1M (vs traditional 5%)\n\n`;
  
  return new Response(txt, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
