import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/comments.inline"
// @ts-ignore
import telegramScript from "./scripts/telegram-comments.inline"

type TelegramOptions = {
  provider: "telegram"
  options?: {
    commentsLimit?: number
    height?: number | "auto"
    color?: string
  }
}

type GiscusOptions = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
    themeUrl?: string
    lightTheme?: string
    darkTheme?: string
    mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname"
    strict?: boolean
    reactionsEnabled?: boolean
    inputPosition?: "top" | "bottom"
    lang?: string
  }
}

type Options = GiscusOptions | TelegramOptions

function boolToStringBool(b: boolean): string {
  return b ? "1" : "0"
}

// Extract "channel/postid" from https://t.me/channel/postid
function parseTelegramUrl(url: string): string | null {
  const match = url.match(/t\.me\/(.+)/)
  return match ? match[1] : null
}

export default ((opts: Options) => {
  const Comments: QuartzComponent = ({ displayClass, fileData, cfg }: QuartzComponentProps) => {
    const disableComment: boolean =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (!fileData.frontmatter?.comments || fileData.frontmatter?.comments === "false")
    if (disableComment) return <></>

    if (opts.provider === "telegram") {
      const discussion = fileData.frontmatter?.telegram_discussion as string | undefined
      if (!discussion) return <></>

      const discussionId = discussion.startsWith("https://")
        ? parseTelegramUrl(discussion)
        : discussion
      if (!discussionId) return <></>

      const limit = opts.options?.commentsLimit ?? 5
      const color = opts.options?.color

      return (
        <div
          class={classNames(displayClass, "telegram-comments-widget")}
          data-discussion={discussionId}
          data-limit={String(limit)}
          {...(color ? { "data-color": color } : {})}
        ></div>
      )
    }

    return (
      <div
        class={classNames(displayClass, "giscus")}
        data-repo={opts.options.repo}
        data-repo-id={opts.options.repoId}
        data-category={opts.options.category}
        data-category-id={opts.options.categoryId}
        data-mapping={opts.options.mapping ?? "url"}
        data-strict={boolToStringBool(opts.options.strict ?? true)}
        data-reactions-enabled={boolToStringBool(opts.options.reactionsEnabled ?? true)}
        data-input-position={opts.options.inputPosition ?? "bottom"}
        data-light-theme={opts.options.lightTheme ?? "light"}
        data-dark-theme={opts.options.darkTheme ?? "dark"}
        data-theme-url={
          opts.options.themeUrl ?? `https://${cfg.baseUrl ?? "example.com"}/static/giscus`
        }
        data-lang={opts.options.lang ?? "en"}
      ></div>
    )
  }

  if (opts.provider === "giscus") {
    Comments.afterDOMLoaded = script
  } else if (opts.provider === "telegram") {
    Comments.afterDOMLoaded = telegramScript
  }

  return Comments
}) satisfies QuartzComponentConstructor<Options>
