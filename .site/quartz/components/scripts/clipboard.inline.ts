// Штриховые иконки (canon §7): копировать / скопировано. Цвет — currentColor.
const svgCopy =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><rect x="9" y="9" width="11" height="11"/><path d="M15 9V5H4v11h5"/></svg>'
const svgCheck =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M5 12l5 5L20 7"/></svg>'

document.addEventListener("nav", () => {
  const els = document.getElementsByTagName("pre")
  for (let i = 0; i < els.length; i++) {
    const codeBlock = els[i].getElementsByTagName("code")[0]
    if (codeBlock) {
      const source = (
        codeBlock.dataset.clipboard ? JSON.parse(codeBlock.dataset.clipboard) : codeBlock.innerText
      ).replace(/\n\n/g, "\n")
      const button = document.createElement("button")
      button.className = "clipboard-button"
      button.type = "button"
      button.innerHTML = svgCopy
      button.ariaLabel = "Скопировать код"
      button.title = "Скопировать"
      function onClick() {
        navigator.clipboard.writeText(source).then(
          () => {
            button.blur()
            button.innerHTML = svgCheck
            button.classList.add("copied")
            setTimeout(() => {
              button.innerHTML = svgCopy
              button.classList.remove("copied")
            }, 2000)
          },
          (error) => console.error(error),
        )
      }
      button.addEventListener("click", onClick)
      window.addCleanup(() => button.removeEventListener("click", onClick))
      els[i].prepend(button)
    }
  }
})
