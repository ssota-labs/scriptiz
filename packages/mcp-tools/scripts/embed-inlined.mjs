/**
 * Single self-contained HTML for MCP Apps `resources/read`
 * (inline CSS/JS; rewrite font `url(/assets/...)` to data URLs so blob iframe loads work).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../web");
const dist = path.join(webDir, "dist-embed");
const htmlPath = path.join(dist, "embed.html");
const assetsDir = path.join(dist, "assets");

if (!fs.existsSync(htmlPath)) {
  console.error("Missing", htmlPath, "— run vite build (embed) first.");
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, "utf8");

function readAsset(href) {
  const clean = href.replace(/^\.\//, "").replace(/^\//, "");
  const file = path.join(dist, clean);
  return fs.readFileSync(file, "utf8");
}

function inlineFontUrlsInCss(css) {
  return css.replace(/url\((\/assets\/[^)]+)\)/g, (_m, urlPath) => {
    const rel = urlPath.replace(/^\/assets\//, "");
    const fp = path.join(assetsDir, rel);
    if (!fs.existsSync(fp)) {
      console.warn("Missing font asset", fp);
      return `url(${urlPath})`;
    }
    const buf = fs.readFileSync(fp);
    const b64 = buf.toString("base64");
    return `url(data:font/woff2;base64,${b64})`;
  });
}

html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/g,
  (_m, href) => {
    const css = inlineFontUrlsInCss(readAsset(href));
    return `<style>\n${css}\n</style>`;
  },
);

html = html.replace(
  /<script([^>]*?)type="module"([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,
  (_m, a, b, src, c) => {
    let js = readAsset(src);
    js = js.replace(/from\s*"(\/assets\/[^"]+)"/g, (_m2, ref) => {
      console.warn("Unresolved import in bundle", ref);
      return `from "${ref}"`;
    });
    return `<script${a}type="module"${b}${c}>\n${js}\n</script>`;
  },
);

const out = path.join(dist, "embed-inlined.html");
fs.writeFileSync(out, html);
console.log("Wrote", out);
