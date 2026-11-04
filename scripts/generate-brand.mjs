import { mkdirSync, writeFileSync } from "node:fs";
import { openSync } from "fontkit";
import sharp from "sharp";
mkdirSync("public/brand", { recursive: true });
mkdirSync("docs/brand", { recursive: true });
const font = openSync(".cache/space-grotesk.ttf").getVariation({ wght: 700 });
function text(value, x, y, size, color) {
  const run = font.layout(value);
  let offset = 0;
  return run.glyphs
    .map((g, i) => {
      const p = run.positions[i];
      const out = `<path fill="${color}" transform="translate(${x + ((offset + p.xOffset) * size) / font.unitsPerEm} ${y - (p.yOffset * size) / font.unitsPerEm}) scale(${size / font.unitsPerEm} ${-size / font.unitsPerEm})" d="${g.path.toSVG()}"/>`;
      offset += p.xAdvance;
      return out;
    })
    .join("");
}
const mark = (color, cutout) =>
  `<path fill="${color}" d="M5 8h26a7 7 0 0 1 7 7v16H20L9 40v-9H5V8Z"/><path fill="none" stroke="${cutout}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="m13 24 8-10 6 7 5-5 8 12"/><path fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" d="M38 9h5v27H29l-7 6v-6"/>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Peak Unemployment">${body}</svg>`;
for (const [mode, ink, accent, bg] of [
  ["light", "#181A20", "#3558E8", "#F7F7F2"],
  ["dark", "#F7F8F5", "#8BA2FF", "#101318"],
  ["mono", "#181A20", "#181A20", "#FFFFFF"],
]) {
  writeFileSync(`public/brand/icon-${mode}.svg`, svg(48, 48, mark(accent, bg)));
  writeFileSync(
    `public/brand/wordmark-${mode}.svg`,
    svg(
      370,
      92,
      `<g transform="translate(0 4) scale(1.65)">${mark(accent, bg)}</g>${text("Peak", 95, 37, 34, ink)}${text("Unemployment", 95, 72, 34, ink)}`,
    ),
  );
}
writeFileSync(
  "public/favicon.svg",
  svg(
    48,
    48,
    `<rect width="48" height="48" rx="10" fill="#F7F7F2"/>${mark("#3558E8", "#F7F7F2")}`,
  ),
);
const app = svg(
  512,
  512,
  `<rect width="512" height="512" rx="112" fill="#3558E8"/><g transform="translate(40 40) scale(9)">${mark("#FFFFFF", "#3558E8")}</g>`,
);
writeFileSync("public/brand/app-icon.svg", app);
await sharp(Buffer.from(app)).png().toFile("public/brand/app-icon.png");
const social = svg(
  1200,
  630,
  `<rect width="1200" height="630" fill="#F7F7F2"/><path d="M0 608H1200" stroke="#181A20" stroke-width="44"/><g transform="translate(62 48) scale(1.4)">${mark("#3558E8", "#F7F7F2")}</g>${text("Peak Unemployment", 142, 96, 35, "#181A20")}${text("Job hunting is weird.", 64, 282, 76, "#181A20")}${text("Talk about it.", 64, 377, 76, "#BA332B")}<path d="M66 402Q310 384 570 399" fill="none" stroke="#E85249" stroke-width="5"/>${text("Read the room. Join anonymously.", 66, 510, 31, "#626775")}<g transform="translate(885 205) scale(5)">${mark("#3558E8", "#F7F7F2")}</g>`,
);
writeFileSync("public/brand/social-share.svg", social);
await sharp(Buffer.from(social)).png().toFile("public/brand/social-share.png");
const concepts = svg(
  1000,
  300,
  `<rect width="1000" height="300" fill="#F7F7F2"/><g transform="translate(100 40) scale(3)">${mark("#3558E8", "#F7F7F2")}</g><g transform="translate(430 65)" fill="none" stroke="#181A20" stroke-width="8"><path d="M0 70V0h125v70H65L25 100V70Z"/><path d="m25 49 35-33 37 33"/></g><g transform="translate(760 65)" fill="#E85249"><path d="M0 0h95v65H55L20 90V65H0Z"/><path d="M55 30h75v65H95l-20 22V95H55Z"/></g>${text("01 / Offset peak — selected", 40, 245, 23, "#181A20")}${text("02 / Single room", 390, 245, 23, "#181A20")}${text("03 / Conversation pair", 705, 245, 23, "#181A20")}`,
);
writeFileSync("docs/brand/concepts.svg", concepts);
await sharp(Buffer.from(concepts)).png().toFile("docs/brand/concepts.png");
console.log(
  "Created original vector logos, outlined wordmarks, app icon, social asset, and concept sheet.",
);
