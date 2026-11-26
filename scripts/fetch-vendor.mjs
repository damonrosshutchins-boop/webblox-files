// Downloads Roblox's current WebClientApp build into vendor/<version>/ and
// points vendor/CURRENT at it. Usage: node scripts/fetch-vendor.mjs [version]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = Number(process.env.LIMIT || Infinity); // for testing
const CONCURRENCY = 16;

const version = process.argv[2] || (await (await fetch(
  "https://clientsettings.roblox.com/v2/client-version/WebClientApp")).json()).clientVersionUpload;
const base = `https://setup.rbxcdn.com/webclient/${version}-RobloxWebClient/`;
const dir = path.join(ROOT, "vendor", version);
console.log(`version ${version} -> ${dir}`);

const url = (p) => base + p.split("/").map(encodeURIComponent).join("/");

async function get(rel, size) {
  const out = path.join(dir, rel);
  if (size != null && fs.existsSync(out) && fs.statSync(out).size === size) return;
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url(rel));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
      return;
    } catch (e) {
      if (attempt >= 4) throw new Error(`${rel}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}

for (const f of ["WasmPlayer.js", "WebClient.js", "WebClient.wasm", "audio-processor-fast.js", "WebClient.fsindex.txt"]) {
  await get(f);
  console.log("got", f);
}

// fsindex: "rbxfsindex 1" then "<shared prefix len>\t<suffix>\t<size>" per line.
const files = [];
let prev = "";
for (const line of fs.readFileSync(path.join(dir, "WebClient.fsindex.txt"), "utf8").split("\n").slice(1)) {
  if (!line.trim()) continue;
  const [n, suffix, size] = line.split("\t");
  prev = prev.slice(0, Number(n)) + suffix;
  files.push([prev.replace(/^\/+/, ""), Number(size)]);
}
const todo = files.slice(0, LIMIT);
console.log(`${todo.length} content files`);

let done = 0, failed = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (todo.length) {
    const [rel, size] = todo.shift();
    try { await get(rel, size); } catch (e) { failed.push(e.message); }
    if (++done % 200 === 0) console.log(`${done}/${files.length}`);
  }
}));

if (failed.length) { console.error(`${failed.length} failed:\n` + failed.join("\n")); process.exit(1); }
fs.writeFileSync(path.join(ROOT, "vendor/CURRENT"), version + "\n");
console.log(`done. vendor/CURRENT = ${version}`);
