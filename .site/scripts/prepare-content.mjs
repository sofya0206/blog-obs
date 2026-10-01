import fs from "node:fs/promises"
import path from "node:path"
const vault = path.resolve("..")
const output = path.resolve(".content")
await fs.rm(output, { recursive: true, force: true })
await fs.mkdir(output, { recursive: true })
const excluded = new Set([".site", ".obsidian", ".git", ".github", ".trash", "node_modules"])
const excludedFiles = new Set(["README.md", "AGENTS.md", "CLAUDE.md", "conflict-files-obsidian-git.md"])
async function copy(dir, relative = "") {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || excluded.has(entry.name) || excludedFiles.has(entry.name)) continue
    const rel = path.join(relative, entry.name)
    const source = path.join(dir, entry.name)
    const target = path.join(output, rel)
    if (entry.isDirectory()) await copy(source, rel)
    else if (entry.isFile() && /\.(md|png|jpe?g|gif|webp|svg|pdf|mp3|mp4|webm|ogg|wav)$/i.test(entry.name)) {
      await fs.mkdir(path.dirname(target), { recursive: true })
      if (entry.name.endsWith(".md")) {
        let content = await fs.readFile(source, "utf8")
        content = content.replace(/(href|src)="\/(?!\/|blog-obs(?:\/|"))/g, '$1="/blog-obs/')
        await fs.writeFile(target, content)
      } else await fs.copyFile(source, target)
    }
  }
}
await copy(vault)
console.log("Prepared notes from the Obsidian vault")
