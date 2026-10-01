import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (title && fileData.slug === "index") {
    const directions = fileData.frontmatter?.directions
    return (
      <header class="home-heading">
        <h1 class="home-name" aria-label={title}>
          {title.split(" ").map((part) => <span>{part}</span>)}
        </h1>
        {typeof directions === "string" && <p class="home-directions">{directions}</p>}
      </header>
    )
  }
  if (title) {
    return <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
