import { readFileSync, writeFileSync } from "fs";

const file = "src/components/blocks/index.tsx";
let src = readFileSync(file, "utf8");

// Match the icon's style object: padding: 5, background: ..., closing }}
const re = /(padding:\s*5,\s*\n\s*background:\s*data\.centered_icon_bg[^,]+,)(\s*\n\s*\}\})/;

const matches = src.match(new RegExp(re, "g"));
if (!matches || matches.length !== 1) {
  console.error(`Expected 1 match, found ${matches ? matches.length : 0}. Aborting.`);
  process.exit(1);
}

src = src.replace(re, `$1
            marginBottom: Number(data.centered_icon_gap ?? 24),$2`);

writeFileSync(file, src);
console.log("✓ gap wired");
