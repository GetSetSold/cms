/**
 * Guide PDF builder — ported from the legacy guides page's jsPDF-based
 * `_buildGuidePDFDoc(card)`, operating on structured GuideMeta + GuideSection[]
 * instead of parsed HTML.
 *
 * Design (kept 1:1 with legacy): branded cover page (header bar, logo/icon
 * area, audience badge, title block, AUDIENCE/UPDATED/FORMAT info blocks,
 * OVERVIEW intro box, numbered "What's Inside" TOC, contact footer),
 * numbered content sections with CHECKLIST blocks, "Need Personalized Help?"
 * CTA, and a branded header/footer with "Page X of Y" on every page.
 *
 * Color note: legacy passed 0-1 float RGB values to jsPDF's setFillColor /
 * setTextColor / setDrawColor, but jsPDF expects 0-255 numbers — so every
 * audience-colored accent in the legacy PDF rendered near-black. This port
 * uses proper 0-255 RGB, so the audience colors (blue/green/purple/orange)
 * and the amber accent render as designed.
 */
/**
 * Minimal jsPDF surface used by this builder. The real jsPDF UMD build is
 * loaded from CDN at runtime (see loadJsPdf) — no npm dependency needed.
 */
interface JsPDF {
  setFillColor(r: number, g: number, b: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setFontSize(s: number): void;
  setFont(name: string, style?: string): void;
  setLineWidth(w: number): void;
  text(t: string | string[], x: number, y: number, opts?: Record<string, unknown>): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): void;
  circle(x: number, y: number, r: number, style?: string): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  splitTextToSize(t: string, w: number): string[];
  getTextWidth(t: string): number;
  addPage(): void;
  setPage(n: number): void;
  save(name: string): void;
  output(type: string): string;
  internal: { getNumberOfPages(): number };
}
interface JsPdfConstructor { new (opts: Record<string, unknown>): JsPDF; }
import type { GuideMeta, GuideSection } from "./types";

type RGB = [number, number, number]; // 0-255 per channel

const NAVY: RGB = [1, 58, 81];
const AMBER: RGB = [245, 158, 11];
const INK: RGB = [60, 60, 60];
const MUTED: RGB = [100, 100, 100];
const LIGHT_BG: RGB = [247, 248, 250];
const ALT_ROW: RGB = [249, 250, 251];
const WHITE: RGB = [255, 255, 255];
const FOOTER_TEXT: RGB = [220, 230, 240];

const PAGE_W = 210;
const LM = 14; // left margin
const RM = 14; // right margin
const CW = PAGE_W - LM - RM; // content width

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const AUDIENCE_LETTER: Record<string, string> = {
  Buyer: "B",
  Seller: "S",
  Renter: "R",
  Landlord: "L",
};
const AUDIENCE_LABEL: Record<string, string> = {
  Buyer: "BUYER",
  Seller: "SELLER",
  Renter: "RENTER",
  Landlord: "LANDLORD",
};

function fill(doc: JsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function text(doc: JsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function draw(doc: JsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

function drawHeader(doc: JsPDF, guide: GuideMeta) {
  fill(doc, NAVY);
  doc.rect(0, 0, PAGE_W, 12, "F");
  text(doc, WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("GetSetSold.ca", 10, 8);
  doc.setFont("helvetica", "normal");
  doc.text(`${guide.tag} Guide`, 200, 8, { align: "right" });
  fill(doc, AMBER);
  doc.rect(0, 12, PAGE_W, 1.5, "F");
}

function drawFooter(doc: JsPDF, pageNum: number, totalPages: number) {
  fill(doc, NAVY);
  doc.rect(0, 281, PAGE_W, 16, "F");
  text(doc, WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Free Canadian Real Estate Guide | GetSetSold.ca | 2026", 10, 290);
  doc.text(`Page ${pageNum} of ${totalPages}`, 200, 290, { align: "right" });
}

function newPage(doc: JsPDF, guide: GuideMeta, pageNum: number): { y: number; pages: number } {
  doc.addPage();
  drawHeader(doc, guide);
  return { y: 22, pages: pageNum + 1 };
}

/** File name shared by download + email paths. */
export function guideFileName(guide: GuideMeta): string {
  return `GetSetSold-${guide.id}-Guide-2026.pdf`;
}

const JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

function loadJsPdf(): Promise<JsPdfConstructor> {
  const w = window as unknown as { jspdf?: { jsPDF: JsPdfConstructor } };
  if (w.jspdf?.jsPDF) return Promise.resolve(w.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JSPDF_CDN;
    s.async = true;
    s.onload = () => {
      const ctor = (window as unknown as { jspdf?: { jsPDF: JsPdfConstructor } }).jspdf?.jsPDF;
      ctor ? resolve(ctor) : reject(new Error("jsPDF failed to load"));
    };
    s.onerror = () => reject(new Error("jsPDF failed to load"));
    document.head.appendChild(s);
  });
}

export async function buildGuidePdfDoc(guide: GuideMeta, sections: GuideSection[]): Promise<JsPDF> {
  const JsPdf = await loadJsPdf();
  const doc = new JsPdf({ unit: "mm", format: "a4" });
  const accent = hexToRgb(guide.color);
  const audLabel = AUDIENCE_LABEL[guide.audience] ?? guide.audience.toUpperCase();
  const audLetter = AUDIENCE_LETTER[guide.audience] ?? "G";
  let y = 20;

  // ═══ PAGE 1: COVER ═══
  drawHeader(doc, guide);

  // Logo area with icon box
  fill(doc, LIGHT_BG);
  doc.roundedRect(LM, y, CW, 40, 3, 3, "F");
  fill(doc, accent);
  doc.circle(LM + 22, y + 20, 10, "F");
  text(doc, WHITE);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(audLetter, LM + 22, y + 22, { align: "center" });
  text(doc, NAVY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GetSetSold.ca", LM + 40, y + 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  text(doc, MUTED);
  doc.text("Free Canadian Real Estate Guides  |  Updated for 2026", LM + 40, y + 24);
  // Audience badge
  fill(doc, accent);
  doc.roundedRect(LM + CW - 50, y + 10, 40, 18, 9, 9, "F");
  text(doc, WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`${audLabel} GUIDE`, LM + CW - 30, y + 21, { align: "center" });
  y += 48;

  // Guide title block
  fill(doc, accent);
  doc.roundedRect(LM, y, CW, 44, 3, 3, "F");
  fill(doc, AMBER);
  doc.rect(LM, y, CW, 2, "F");
  text(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(audLabel, LM + 12, y + 15);
  fill(doc, WHITE);
  doc.circle(LM + 12 + doc.getTextWidth(audLabel) + 6, y + 13.5, 1.2, "F");
  doc.text(`  2026 EDITION`, LM + 12 + doc.getTextWidth(audLabel) + 10, y + 15);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(guide.title, CW - 24);
  doc.text(titleLines, LM + 12, y + 27, { maxWidth: CW - 24 });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const subLines = doc.splitTextToSize(guide.subtitle, CW - 24);
  doc.text(subLines, LM + 12, y + 35 + (titleLines.length - 1) * 5.5, { maxWidth: CW - 24 });
  y += 52;

  // Details bar (3 info blocks)
  const blockW = (CW - 6) / 3;
  const infoItems = [
    { label: "AUDIENCE", value: guide.audience },
    { label: "UPDATED", value: "June 2026" },
    { label: "FORMAT", value: "Free PDF" },
  ];
  infoItems.forEach((item, idx) => {
    const bx = LM + idx * (blockW + 3);
    fill(doc, LIGHT_BG);
    doc.roundedRect(bx, y, blockW, 14, 2, 2, "F");
    text(doc, accent);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, bx + blockW / 2, y + 5.5, { align: "center" });
    text(doc, INK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, bx + blockW / 2, y + 11.5, { align: "center" });
  });
  y += 20;

  // Intro OVERVIEW box
  const introLines = doc.splitTextToSize(guide.intro, CW - 12);
  const introH = introLines.length * 4.5 + 16;
  fill(doc, WHITE);
  draw(doc, [230, 230, 230]);
  doc.roundedRect(LM, y, CW, introH, 2, 2, "FD");
  fill(doc, accent);
  doc.rect(LM, y, 3.5, introH, "F");
  text(doc, accent);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("OVERVIEW", LM + 10, y + 9);
  text(doc, INK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(introLines, LM + 10, y + 16, { maxWidth: CW - 16 });
  y += introH + 8;

  // What's Inside TOC
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  text(doc, NAVY);
  doc.text("What's Inside This Guide", LM, y);
  y += 5;
  fill(doc, AMBER);
  doc.rect(LM, y, 32, 1.2, "F");
  y += 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  text(doc, [80, 80, 80]);
  sections.forEach((s, i) => {
    if (y > 268) {
      const r = newPage(doc, guide, 1);
      y = r.y;
    }
    fill(doc, accent);
    doc.circle(LM + 6, y + 3, 3.2, "F");
    text(doc, WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), LM + 6, y + 4.2, { align: "center" });
    text(doc, INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(s.heading, LM + 13, y + 4);
    y += 9;
  });
  y += 4;

  // Contact footer on cover
  if (y < 252) {
    fill(doc, accent);
    doc.roundedRect(LM, y, CW, 20, 3, 3, "F");
    text(doc, WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Rohit Sharma  |  Licensed Real Estate Agent", LM + 8, y + 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    text(doc, FOOTER_TEXT);
    doc.text("Phone: +1-416-605-7488    Email: rohit@getsetsold.ca    Web: www.getsetsold.ca", LM + 8, y + 14);
  }
  drawFooter(doc, 1, 1);

  // ═══ CONTENT PAGES ═══
  let totalPages = 2;
  doc.addPage();
  drawHeader(doc, guide);
  y = 22;

  // Page title with decorative elements
  fill(doc, accent);
  doc.roundedRect(LM, y, 3, 12, 1, 1, "F");
  text(doc, accent);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(guide.title, LM + 8, y + 8, { maxWidth: CW - 10 });
  y += 14;
  fill(doc, AMBER);
  doc.rect(LM, y, 45, 1, "F");
  y += 8;

  sections.forEach((s, sIdx) => {
    // Estimate section height for smarter page breaks
    const secHeadH = 13;
    let paraH = 0;
    s.paragraphs.forEach((p) => {
      paraH += doc.splitTextToSize(p, CW).length * 4.2 + 3;
    });
    let checkH = 0;
    s.checklist.forEach((ch) => {
      checkH += Math.min(doc.splitTextToSize(ch, CW - 14).length, 2) * 3.8 + 4.5;
    });
    if (s.checklist.length) checkH += 10;
    const secTotalH = secHeadH + paraH + checkH + 6;
    if (y + secTotalH > 275 && secTotalH < 240) {
      const r = newPage(doc, guide, totalPages);
      y = r.y;
      totalPages = r.pages;
    }
    if (y > 250) {
      const r = newPage(doc, guide, totalPages);
      y = r.y;
      totalPages = r.pages;
    }

    // Section heading with colored bar and number badge
    fill(doc, accent);
    doc.roundedRect(LM, y, 3, 11, 1, 1, "F");
    doc.circle(LM + 12, y + 5.5, 4, "F");
    text(doc, WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(String(sIdx + 1), LM + 12, y + 6.5, { align: "center" });
    text(doc, accent);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    const headLines = doc.splitTextToSize(s.heading, CW - 24);
    doc.text(headLines, LM + 20, y + 6, { maxWidth: CW - 24 });
    y += 8 + headLines.length * 5;

    // Thin separator with accent dot
    draw(doc, [230, 230, 230]);
    doc.setLineWidth(0.15);
    doc.line(LM + 20, y, LM + CW, y);
    fill(doc, AMBER);
    doc.circle(LM + 20, y, 0.8, "F");
    y += 5;

    // Paragraphs
    if (s.paragraphs.length) {
      text(doc, INK);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      s.paragraphs.forEach((p) => {
        const lines = doc.splitTextToSize(p, CW);
        const needed = lines.length * 4.2 + 3;
        if (y + needed > 273) {
          const r = newPage(doc, guide, totalPages);
          y = r.y;
          totalPages = r.pages;
        }
        doc.text(lines, LM, y, { maxWidth: CW });
        y += needed;
      });
      y += 2;
    }

    // Checklist — compact single column
    if (s.checklist.length) {
      let totalCheckH = 10;
      s.checklist.forEach((ch) => {
        totalCheckH += Math.min(doc.splitTextToSize(ch, CW - 14).length, 2) * 3.8 + 4.5;
      });
      if (y + totalCheckH > 273 && totalCheckH < 245) {
        const r = newPage(doc, guide, totalPages);
        y = r.y;
        totalPages = r.pages;
      }

      // Checklist header
      fill(doc, accent);
      doc.roundedRect(LM, y, CW, 8, 2, 2, "F");
      text(doc, WHITE);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CHECKLIST", LM + CW / 2, y + 5.5, { align: "center" });
      y += 11;

      const checkBgStart = y - 1;
      s.checklist.forEach((ch, chIdx) => {
        const chLines = doc.splitTextToSize(ch, CW - 14);
        const chH = Math.min(chLines.length, 2) * 3.8 + 4.5;
        if (chIdx % 2 === 0) {
          fill(doc, ALT_ROW);
          doc.rect(LM, y - 1, CW, chH + 1, "F");
        }
        // Checkbox: white fill + black border
        fill(doc, WHITE);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.25);
        doc.roundedRect(LM + 2, y, 3.5, 3.5, 0.5, 0.5, "FD");
        text(doc, [50, 50, 50]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(chLines.slice(0, 2), LM + 9, y + 3, { maxWidth: CW - 14 });
        y += chH;
      });

      // Border around entire checklist
      draw(doc, accent);
      doc.setLineWidth(0.4);
      doc.roundedRect(LM, checkBgStart, CW, y - checkBgStart + 1, 2, 2, "S");
      y += 6;
    }
  });

  // "Need Personalized Help?" CTA box
  if (y < 242) {
    y += 10;
    fill(doc, accent);
    doc.roundedRect(LM, y, CW, 26, 3, 3, "F");
    fill(doc, AMBER);
    doc.rect(LM, y, CW, 2, "F");
    text(doc, WHITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Need Personalized Help?", LM + 10, y + 10);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    text(doc, FOOTER_TEXT);
    doc.text(
      "Contact Rohit Sharma for expert guidance on buying, selling, renting, or investing in Canadian real estate.",
      LM + 10,
      y + 16
    );
    doc.text("Phone: +1-416-605-7488    Email: rohit@getsetsold.ca    Web: www.getsetsold.ca", LM + 10, y + 22);
  }

  // Update page numbers on all pages
  const totalPg = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let i = 1; i <= totalPg; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPg);
  }

  return doc;
}

/** Build the PDF and return its base64 payload + file name (for the email path). */
export async function buildGuidePdfBase64(
  guide: GuideMeta,
  sections: GuideSection[]
): Promise<{ base64: string; fileName: string }> {
  const doc = await buildGuidePdfDoc(guide, sections);
  const base64 = (doc.output("datauristring").split(",")[1] ?? "") as string;
  return { base64, fileName: guideFileName(guide) };
}

/** Build the PDF and trigger a browser download. */
export async function downloadGuidePdf(guide: GuideMeta, sections: GuideSection[]): Promise<void> {
  const doc = await buildGuidePdfDoc(guide, sections);
  doc.save(guideFileName(guide));
}
