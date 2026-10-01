// Пост-сборка для Timeweb App Platform (Caddy, SPA fallback выключен).
//
// Quartz кладёт страницы в `slug.html`, а ссылается на них без расширения: `/slug`.
// Caddy не умеет try_files `{path}.html`, зато отдаёт каталог `slug/index.html` по
// `/slug/` (с `/slug` — редирект 308). Поэтому каждая страница переезжает в свой
// каталог. Ссылки и ассеты Quartz у нас от корня (util/path.ts → pathToRoot), так что
// лишний уровень URL им не мешает.
//
// Не трогаем: `index.html` (индексы каталогов) и `404.html` (его ищет Caddy).
import fs from "node:fs/promises"
import path from "node:path"

const root = path.resolve(process.argv[2] ?? "public")
const KEEP = new Set(["index.html", "404.html"])

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

const pages = []
for await (const file of walk(root)) {
  if (file.endsWith(".html") && !KEEP.has(path.basename(file))) pages.push(file)
}

const skipped = []
for (const file of pages) {
  const target = path.join(file.slice(0, -".html".length), "index.html")
  if (await fs.stat(target).catch(() => null)) {
    skipped.push(path.relative(root, file))
    continue
  }
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.rename(file, target)
}

console.log(`flatten-html: ${pages.length - skipped.length} pages moved to slug/index.html`)
if (skipped.length > 0) {
  console.warn(`flatten-html: kept .html, folder index already exists: ${skipped.join(", ")}`)
}
