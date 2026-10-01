import { computePosition, flip, inline, offset, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const parser = new DOMParser()
let activeAnchor: HTMLAnchorElement | null = null
function hidePopover() {
  activeAnchor = null
  document.querySelectorAll<HTMLElement>(".popover").forEach((element) => {
    element.classList.remove("active-popover")
    element.setAttribute("aria-hidden", "true")
  })
}
async function showPreview(this: HTMLAnchorElement, event: MouseEvent | FocusEvent) {
  const link = this
  if (link.dataset.noPopover === "true" || matchMedia("(hover: none)").matches) return
  hidePopover()
  activeAnchor = link
  const targetUrl = new URL(link.href)
  const hash = decodeURIComponent(targetUrl.hash)
  targetUrl.hash = ""
  targetUrl.search = ""
  const id = `popover-${link.pathname}`
  let popover = document.getElementById(id)
  if (!popover) {
    const response = await fetchCanonical(targetUrl).catch(() => null)
    if (!response || !response.ok || activeAnchor !== link) return
    const type = response.headers.get("Content-Type")?.split(";")[0] ?? "text/html"
    popover = document.createElement("div")
    popover.id = id
    popover.className = "popover"
    popover.setAttribute("role", "region")
    popover.setAttribute("aria-label", "Предпросмотр заметки")
    popover.setAttribute("aria-hidden", "true")
    const inner = document.createElement("div")
    inner.className = "popover-inner"
    inner.dataset.contentType = type
    if (type.startsWith("image/")) {
      const image = document.createElement("img")
      image.src = targetUrl.toString()
      image.alt = link.textContent ?? "Изображение"
      inner.appendChild(image)
    } else if (type === "application/pdf") {
      const frame = document.createElement("iframe")
      frame.src = targetUrl.toString()
      frame.title = link.textContent ?? "Предпросмотр PDF"
      inner.appendChild(frame)
    } else if (type === "text/html") {
      const html = parser.parseFromString(await response.text(), "text/html")
      if (activeAnchor !== link) return
      normalizeRelativeURLs(html, targetUrl)
      html.querySelectorAll("[id]").forEach((element) => { element.id = `popover-internal-${element.id}` })
      const hints = [...html.getElementsByClassName("popover-hint")]
      if (!hints.length) return
      hints.forEach((hint) => inner.appendChild(hint))
    } else return
    popover.appendChild(inner)
    popover.addEventListener("mouseleave", (leave) => {
      if (leave.relatedTarget instanceof Node && activeAnchor?.contains(leave.relatedTarget)) return
      hidePopover()
    })
    popover.addEventListener("focusout", (leave) => {
      if (leave.relatedTarget instanceof Node && popover?.contains(leave.relatedTarget)) return
      hidePopover()
    })
    document.body.appendChild(popover)
  }
  if (activeAnchor !== link) return
  popover.setAttribute("aria-hidden", "false")
  popover.classList.add("active-popover")
  const bounds = link.getBoundingClientRect()
  const point = event instanceof MouseEvent
    ? { x: event.clientX, y: event.clientY }
    : { x: bounds.left + bounds.width / 2, y: bounds.bottom }
  const { x, y } = await computePosition(link, popover, {
    strategy: "fixed", middleware: [inline(point), offset(6), flip(), shift({ padding: 12 })],
  })
  popover.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  if (hash) {
    const heading = popover.querySelector<HTMLElement>(`#${CSS.escape(`popover-internal-${hash.slice(1)}`)}`)
    const inner = popover.querySelector<HTMLElement>(".popover-inner")
    if (heading && inner) inner.scrollTop = heading.offsetTop - 12
  }
}
function leaveLink(event: MouseEvent | FocusEvent) {
  if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".popover")) return
  hidePopover()
}
function escape(event: KeyboardEvent) { if (event.key === "Escape") hidePopover() }

document.addEventListener("nav", () => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a.internal")) {
    link.addEventListener("mouseenter", showPreview)
    link.addEventListener("focus", showPreview)
    link.addEventListener("mouseleave", leaveLink)
    link.addEventListener("blur", leaveLink)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", showPreview)
      link.removeEventListener("focus", showPreview)
      link.removeEventListener("mouseleave", leaveLink)
      link.removeEventListener("blur", leaveLink)
    })
  }
  document.addEventListener("keydown", escape)
  window.addCleanup(() => {
    document.removeEventListener("keydown", escape)
    hidePopover()
    document.querySelectorAll(".popover").forEach((element) => element.remove())
  })
})
