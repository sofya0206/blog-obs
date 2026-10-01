import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const isIndex = (slug: string | undefined) => slug === "index"

// Шапка сайта: вордмарк, поиск, лик, режим чтения. Одна на все страницы.
const siteHeader = [
  Component.PageTitle(),
  Component.Spacer(),
  Component.Search(),
  Component.Darkmode(),
  Component.DesktopOnly(Component.ReaderMode()),
]

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: siteHeader,
  afterBody: [
    Component.ConditionalRender({
      component: Component.RecentNotes({
        title: "Последние заметки",
        limit: 10,
        showTags: true,
        filter: (f) => f.slug !== "index" && f.slug !== "kitchen-sink",
      }),
      condition: (page) => isIndex(page.fileData.slug),
    }),
  ],
  footer: Component.Footer({
    links: {
      "Обо мне": "/blog-obs/about",
      Проекты: "/blog-obs/projects",
      RSS: "/blog-obs/index.xml",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs({ rootName: "Главная", spacerSymbol: "/" }),
      condition: (page) => !isIndex(page.fileData.slug),
    }),
    Component.ArticleTitle(),
    Component.ContentMeta({ showComma: false }),
    Component.TagList(),
  ],
  left: [Component.Explorer({ title: "Разделы", folderDefaultState: "open" })],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Graph({
      localGraph: { depth: 2, scale: 1, linkDistance: 40, fontSize: 0.55 },
      globalGraph: { scale: 0.8, linkDistance: 40, fontSize: 0.55 },
    }),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({ rootName: "Главная", spacerSymbol: "/" }),
    Component.ArticleTitle(),
    Component.ContentMeta({ showComma: false }),
  ],
  left: [Component.Explorer({ title: "Разделы", folderDefaultState: "open" })],
  // Страницы папок и тегов не входят в граф — правая колонка пустая
  right: [],
}
