import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const PageTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <nav class={classNames(displayClass, "site-main-nav")} aria-label="Основная навигация">
      <a class="page-title" href={baseDir}>Главная</a>
      <a class="desktop-nav-link" href="/blog-obs/#мои-проекты-и-опыт">Проекты</a>
      <a class="desktop-nav-link" href="https://github.com/sofya0206" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </nav>
  )
}

PageTitle.css = `
.site-main-nav { display:flex; align-items:center; gap:28px; }
.site-main-nav a { text-decoration:none; }
.site-main-nav .desktop-nav-link { font:600 12px/1 var(--bodyFont); letter-spacing:.08em; text-transform:uppercase; color:var(--slate); }
.site-main-nav .desktop-nav-link:hover { color:var(--ink); text-decoration:underline; text-underline-offset:5px; }
@media (max-width:800px) { .site-main-nav .desktop-nav-link { display:none; } }
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
