import { readFile } from "fs/promises";
import path from "path";

// Geist TTFs from the local `geist` package, so OG images need no network.
const dir = path.join(process.cwd(), "node_modules/geist/dist/fonts");

export async function ogFonts() {
  const [regular, semibold, mono] = await Promise.all([
    readFile(path.join(dir, "geist-sans/Geist-Regular.ttf")),
    readFile(path.join(dir, "geist-sans/Geist-SemiBold.ttf")),
    readFile(path.join(dir, "geist-mono/GeistMono-Regular.ttf")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}
