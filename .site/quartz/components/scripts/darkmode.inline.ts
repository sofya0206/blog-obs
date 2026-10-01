// Лик BOROZDOV (canon §12): система читается один раз при первом визите и сразу
// сохраняется; дальше решает только переключатель. Слушателя matchMedia change нет.
// data-theme (obsidian / titan) несёт брендовые токены, saved-theme (dark / light) —
// внутренний контракт Quartz: на нём держатся base.scss, граф, mermaid, комментарии.
import { trackGoal } from "./metrika"

type Lik = "obsidian" | "titan"

const THEME_KEY = "sofia-garden.offbrand.theme"
const LEGACY_THEME_KEY = "theme"
const THEME_COLOR: Record<Lik, string> = { obsidian: "#1d1d1d", titan: "#e5e4e0" }

const readStoredLik = (): Lik | null => {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === "obsidian" || stored === "titan") return stored
    const legacy = localStorage.getItem(LEGACY_THEME_KEY)
    if (legacy === "dark") return "obsidian"
    if (legacy === "light") return "titan"
  } catch {}
  return null
}

const storeLik = (lik: Lik) => {
  try {
    localStorage.setItem(THEME_KEY, lik)
    localStorage.removeItem(LEGACY_THEME_KEY)
  } catch {}
}

const applyLik = (lik: Lik) => {
  const root = document.documentElement
  root.setAttribute("data-theme", lik)
  root.setAttribute("saved-theme", lik === "titan" ? "light" : "dark")
  const meta = document.getElementById("meta-theme-color") as HTMLMetaElement | null
  if (meta) meta.content = THEME_COLOR[lik]
  document.querySelectorAll(".darkmode").forEach((button) => {
    button.setAttribute("aria-pressed", String(lik === "obsidian"))
    button.setAttribute("aria-label", lik === "titan" ? "Включить тёмную тему" : "Включить светлую тему")
  })
}

let initialLik = readStoredLik()
if (initialLik === null) {
  initialLik = "titan"
}
storeLik(initialLik)
applyLik(initialLik)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
  // meta theme-color живёт в <head>, а скрипт лика выполняется раньше него
  applyLik(document.documentElement.getAttribute("data-theme") === "titan" ? "titan" : "obsidian")

  const switchTheme = () => {
    const root = document.documentElement
    const next: Lik = root.getAttribute("data-theme") === "titan" ? "obsidian" : "titan"
    // Смена лика мгновенна: гасим transition на время смены (canon §12)
    root.classList.add("theme-switching")
    applyLik(next)
    storeLik(next)
    void root.offsetHeight
    root.classList.remove("theme-switching")
    emitThemeChangeEvent(next === "titan" ? "light" : "dark")
    trackGoal("theme_toggle", { theme: next })
  }

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", switchTheme)
    window.addCleanup(() => darkmodeButton.removeEventListener("click", switchTheme))
  }
})
