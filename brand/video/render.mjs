// Renders ad.html frame by frame into an MP4.  node render.mjs [--preview t1,t2,...]
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("file://" + path.join(dir, process.env.PAGE || "ad.html"));
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => (i.onload = i.onerror = r)))));
const prev = process.argv.indexOf("--preview");
if (prev > 0) {
  for (const t of process.argv[prev + 1].split(",").map(Number)) {
    await page.evaluate((t) => render(t), t);
    await page.screenshot({ path: path.join(process.env.OUT || dir, `frame-${t}.png`) });
  }
} else {
  const dur = await page.evaluate(() => DURATION);
  const out = process.env.OUT_FILE || path.join(dir, "veraim-ad-silent.mp4");
  const ff = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => render(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("wrote", out);
}
await browser.close();
