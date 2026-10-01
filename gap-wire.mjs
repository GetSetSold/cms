import { readFileSync, writeFileSync } from "fs";

const file = "src/components/blocks/index.tsx";
let src = readFileSync(file, "utf8");

const anchor = `            padding: 5,
            background: data.centered_icon_bg || "var(--c-icon-bg, #FFFFFF)",
          }}`;

const replacement = `            padding: 5,
            background: data.centered_icon_bg || "var(--c-icon-bg, #FFFFFF)",
            marginBottom: Number(data.centered_icon_gap ?? 24),
          }}`;

if (!src.includes(anchor)) {
  console.error("ANCHOR NOT FOUND — file changed; aborting without writing.");
  process.exit(1);
}
src = src.replace(anchor, replacement);
writeFileSync(file, src);
console.log("✓ gap wired: icon marginBottom = centered_icon_gap (default 24)");
