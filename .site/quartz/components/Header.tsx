import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// Шапка сайта: липкая полоса с вордмарком, поиском и переключателями.
// Вид — в styles/custom.scss (раздел «Шапка»).
const Header: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return children.length > 0 ? (
    <header class="site-header">
      <div class="site-header-inner">{children}</div>
    </header>
  ) : null
}

export default (() => Header) satisfies QuartzComponentConstructor
