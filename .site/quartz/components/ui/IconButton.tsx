import { ComponentChildren } from "preact"

interface IconButtonProps {
  label: string
  title?: string
  className?: string
  pressed?: boolean
  children: ComponentChildren
}

/** Shared geometry and accessible naming for theme, reader, graph and close controls. */
export function IconButton({ label, title, className = "", pressed, children }: IconButtonProps) {
  return (
    <button
      type="button"
      class={`ui-icon-button ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
    >
      {children}
    </button>
  )
}
