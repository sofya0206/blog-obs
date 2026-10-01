function loadTelegramWidget(container: HTMLElement) {
  // Remove previous widget instance
  container.innerHTML = ""

  const discussion = container.dataset.discussion!
  const limit = container.dataset.limit ?? "5"
  const color = container.dataset.color

  const isDark = document.documentElement.getAttribute("saved-theme") === "dark"
  const themeColor = isDark ? "FFFFFF" : "000000"

  const script = document.createElement("script")
  script.async = true
  script.src = "https://telegram.org/js/telegram-widget.js?23"
  script.setAttribute("data-telegram-discussion", discussion)
  script.setAttribute("data-comments-limit", limit)
  script.setAttribute("data-colorful", "0")
  if (isDark) script.setAttribute("data-dark", "1")
  script.setAttribute("data-color", color ?? themeColor)

  container.appendChild(script)
}

document.addEventListener("nav", () => {
  const container = document.querySelector<HTMLElement>(".telegram-comments-widget")
  if (!container) return

  loadTelegramWidget(container)

  const onThemeChange = () => loadTelegramWidget(container)
  document.addEventListener("themechange", onThemeChange)
  window.addCleanup(() => document.removeEventListener("themechange", onThemeChange))
})
