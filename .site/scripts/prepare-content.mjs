import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import matter from "gray-matter"
import { createHash } from "node:crypto"
import { renderCanvas } from "./render-canvas.mjs"
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const vault = path.resolve(site, "..")
const output = path.join(site, ".content")
const excluded = new Set([
  ".site",
  ".obsidian",
  ".git",
  ".github",
  ".trash",
  "node_modules",
  "Шаблоны",
  // Temporarily hidden on the website; original notes stay in the vault.
  "Дневник",
])
const excludedFiles = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "conflict-files-obsidian-git.md",
])

export function ignoredSource(file) {
  return path
    .relative(vault, file)
    .split(path.sep)
    .some((part) => part.startsWith(".") || excluded.has(part) || excludedFiles.has(part))
}

export async function prepareContent({ clean = true } = {}) {
  if (clean) await fs.rm(output, { recursive: true, force: true })
  await fs.mkdir(output, { recursive: true })
  const wanted = new Set()
  const canvases = []
  let changes = 0
  async function write(target, content) {
    wanted.add(target)
    await fs.mkdir(path.dirname(target), { recursive: true })
    const previous = await fs.readFile(target).catch((error) => {
      if (error.code !== "ENOENT") throw error
      return null
    })
    if (!previous?.equals(content)) {
      await fs.writeFile(target, content)
      changes++
    }
  }
  async function copy(dir, relative = "") {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || excluded.has(entry.name) || excludedFiles.has(entry.name))
        continue
      const rel = path.join(relative, entry.name)
      const source = path.join(dir, entry.name)
      const target = path.join(output, rel === "Главная.md" ? "index.md" : rel)
      if (entry.isDirectory()) await copy(source, rel)
      else if (
        entry.isFile() &&
        /\.(md|canvas|png|jpe?g|gif|webp|svg|pdf|mp3|mp4|webm|ogg|wav)$/i.test(entry.name)
      ) {
        wanted.add(target)
        await fs.mkdir(path.dirname(target), { recursive: true })
        let content = await fs.readFile(source)
        if (entry.name.toLowerCase().endsWith(".canvas")) canvases.push({ rel, content })
        if (entry.name.toLowerCase().endsWith(".md")) {
          const parsed = matter(content.toString("utf8"))
          // Keep labels readable without linking to temporarily unpublished diary pages.
          parsed.content = parsed.content.replace(
            /\[\[Дневник\/([^\]|]+)(?:\|([^\]]+))?\]\]/g,
            (_, name, label) => label ?? path.basename(name),
          )
          const name = path.basename(rel, path.extname(rel))
          // Obsidian keeps its readable Markdown heading; Quartz renders the title itself.
          const heading = parsed.content.match(/^# ([^\n]+)\n/m)
          if (heading && [name, parsed.data.title].includes(heading[1].trim())) {
            parsed.content = parsed.content.replace(heading[0], "")
          }
          // The public copy of the original report keeps its wording. Its links point
          // into a separate private vault, so render their labels as text on the site.
          if (rel === path.join("Проекты", "Fashion", "Анализ кейса.md")) {
            parsed.content = parsed.content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
              label ?? path.basename(target),
            )
          }
          // A rename in Obsidian is a rename on the site, even with a stale title property.
          if (rel !== "Главная.md") parsed.data.title = name
          content = Buffer.from(matter.stringify(parsed.content, parsed.data))
        }
        await write(target, content)
      }
    }
  }
  await copy(vault)
  for (const { rel, content } of canvases) {
    const name = path.basename(rel, ".canvas")
    const noteRel = rel.replace(/\.canvas$/i, ".md")
    const sourceNote = await fs.readFile(path.join(vault, noteRel), "utf8").catch((error) => {
      if (error.code !== "ENOENT") throw error
      return ""
    })
    const metadata = matter(sourceNote).data
    const id = createHash("sha256").update(rel).digest("hex").slice(0, 16)
    const viewer = `canvas-views/${id}/index.html`
    // CrawlLinks adds the configured site prefix to paths from the vault root.
    const url = `canvas-views/${id}/`
    await write(path.join(output, viewer), Buffer.from(renderCanvas(JSON.parse(content), name)))
    await write(path.join(output, noteRel), Buffer.from(matter.stringify(
      `<iframe class="obsidian-canvas" src="${url}" title="${name}" loading="lazy" sandbox="allow-scripts" allow="fullscreen" allowfullscreen></iframe>\n\n[Открыть Canvas в отдельной вкладке](${url})\n`,
      { ...metadata, title: name, enableToc: false },
    )))
  }
  async function prune(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) await prune(file)
      else if (!wanted.has(file)) {
        await fs.unlink(file)
        changes++
      }
    }
  }
  await prune(output)
  return changes
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await prepareContent()
  console.log("Prepared notes from the Obsidian vault")
}
