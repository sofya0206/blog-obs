import { trackHit } from "./metrika"

// Первый nav — это загрузка страницы, её Метрика считает сама при init.
// Каждый следующий — SPA-переход, о котором счётчик иначе не узнает (canon §35.7).
let previousUrl = location.href
let isFirstNav = true

document.addEventListener("nav", () => {
  if (isFirstNav) {
    isFirstNav = false
    return
  }
  if (location.href === previousUrl) return
  trackHit(location.href, previousUrl, document.title)
  previousUrl = location.href
})
