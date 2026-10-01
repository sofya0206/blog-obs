import chokidar from "chokidar"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"
import path from "node:path"
import { prepareContent, ignoredSource, vault } from "./prepare-content.mjs"

const site = fileURLToPath(new URL("../", import.meta.url))
const signal = path.join(site, ".quartz-cache", "vault-rebuild")
let pending = false
let syncing = false
let ready = false
let stopping = false
let timer
let child

async function sync() {
  if (!ready || syncing || stopping) return
  syncing = true
  try {
    while (pending && !stopping) {
      pending = false
      const count = await prepareContent({ clean: false })
      if (count) {
        await fs.writeFile(signal, String(Date.now()))
        console.log(`[Obsidian] Обновлено файлов: ${count}`)
      }
    }
  } catch (error) {
    console.error("[Obsidian] Не удалось обновить предпросмотр:", error)
  } finally {
    syncing = false
  }
}

const watcher = chokidar.watch(vault, {
  ignored: ignoredSource,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
})
watcher.on("all", () => {
  pending = true
  clearTimeout(timer)
  timer = setTimeout(() => void sync(), 300)
})
watcher.on("error", (error) => console.error("[Obsidian] Ошибка наблюдения:", error))
await new Promise((resolve) => watcher.once("ready", resolve))
await prepareContent()
await fs.mkdir(path.dirname(signal), { recursive: true })
await fs.writeFile(signal, String(Date.now()))

child = spawn(
  process.execPath,
  [
    "quartz/bootstrap-cli.mjs",
    "build",
    "-d",
    ".content",
    "--serve",
    "--port",
    "8091",
    "--wsPort",
    "8092",
    "--baseDir",
    "/blog-obs",
    "--concurrency",
    "2",
  ],
  {
    cwd: site,
    env: { ...process.env, OBSIDIAN_VAULT_PREVIEW: "1" },
    stdio: ["inherit", "pipe", "inherit"],
  },
)
child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk)
  if (!ready && chunk.toString().includes("hint: exit with ctrl+c")) {
    ready = true
    console.log(`[Obsidian] Следим за хранилищем: ${vault}`)
    void sync()
  }
})
child.on("error", (error) => {
  console.error(error)
  void stop(1)
})
child.on("exit", (code) => {
  if (!stopping) void stop(code ?? 1)
})

async function stop(code = 0) {
  if (stopping) return
  stopping = true
  clearTimeout(timer)
  await watcher.close()
  if (child && child.exitCode === null) child.kill("SIGTERM")
  process.exit(code)
}
process.on("SIGINT", () => void stop())
process.on("SIGTERM", () => void stop())
