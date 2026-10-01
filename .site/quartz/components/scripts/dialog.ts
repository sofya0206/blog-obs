/** Modal behaviour shared by search and graph; no hidden, keyboard-focusable background. */
export function createDialog(container: HTMLElement, onDismiss: () => void) {
  let opener: HTMLElement | null = null
  const previousInert = new Map<HTMLElement, boolean>()
  const host = container.closest<HTMLElement>(".site-header, .sidebar")
  let previousZIndex = ""

  function open(initialFocus: HTMLElement) {
    if (container.classList.contains("active")) return
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    container.classList.add("active")
    container.setAttribute("aria-hidden", "false")
    document.documentElement.classList.add("modal-open")
    // Only siblings outside the modal's ancestor chain become inert.
    let current: HTMLElement = container
    while (current.parentElement) {
      for (const sibling of current.parentElement.children) {
        if (sibling === current || !(sibling instanceof HTMLElement)) continue
        previousInert.set(sibling, sibling.inert)
        sibling.inert = true
      }
      current = current.parentElement
      if (current === document.body) break
    }
    if (host) {
      previousZIndex = host.style.zIndex
      host.style.zIndex = "10000"
    }
    initialFocus.focus()
  }

  function close() {
    if (!container.classList.contains("active")) return
    container.classList.remove("active")
    container.setAttribute("aria-hidden", "true")
    previousInert.forEach((inert, element) => { element.inert = inert })
    previousInert.clear()
    document.documentElement.classList.remove("modal-open")
    if (host) host.style.zIndex = previousZIndex
    if (opener?.isConnected) opener.focus()
    opener = null
  }

  function keydown(event: KeyboardEvent) {
    if (!container.classList.contains("active")) return
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopImmediatePropagation()
      onDismiss()
    } else if (event.key === "Tab") {
      const focusable = [...container.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]',
      )].filter((el) => el.checkVisibility() && !el.closest("[inert]"))
      if (focusable.length === 0) return
      const index = focusable.indexOf(document.activeElement as HTMLElement)
      const next = (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
      event.preventDefault()
      event.stopImmediatePropagation()
      focusable[next].focus()
    }
  }

  function backdrop(event: MouseEvent) {
    if (event.target === container) onDismiss()
  }
  document.addEventListener("keydown", keydown, true)
  container.addEventListener("click", backdrop)
  window.addCleanup(() => {
    close()
    document.removeEventListener("keydown", keydown, true)
    container.removeEventListener("click", backdrop)
  })
  return { open, close }
}
