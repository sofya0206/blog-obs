import { QuartzEmitterPlugin } from "../types"
import { TRANSLATIONS, i18n } from "../../i18n"
import { unescapeHTML } from "../../util/escape"
import {
  FilePath,
  FullSlug,
  getFileExtension,
  isAbsoluteURL,
  joinSegments,
  QUARTZ,
  slugifyFilePath,
  stripSlashes,
} from "../../util/path"
import { ImageOptions, SocialImageOptions, defaultImage, getSatoriFonts } from "../../util/og"
import sharp from "sharp"
import satori, { SatoriOptions } from "satori"
import { loadEmoji, getIconCode } from "../../util/emoji"
import { Readable } from "stream"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { QuartzPluginData } from "../vfile"
import fs from "node:fs/promises"
import { styleText } from "util"

const defaultOptions: SocialImageOptions = {
  generateFallbackImages: true,
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  imageStructure: defaultImage,
  excludeRoot: false,
}

function nonEmptyString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : undefined
  return text ? text : undefined
}

function getSocialDescription(
  fileData: QuartzPluginData,
  locale: keyof typeof TRANSLATIONS,
): string {
  return (
    nonEmptyString(fileData.frontmatter?.socialDescription) ??
    nonEmptyString(fileData.frontmatter?.description) ??
    unescapeHTML(fileData.description?.trim() ?? i18n(locale).propertyDefaults.description)
  )
}

function unwrapObsidianImagePath(rawPath: string): string {
  let imagePath = rawPath.trim()
  const wikilink = imagePath.match(/^!?\[\[([^\]]+)\]\]$/)
  if (wikilink) {
    imagePath = wikilink[1]
  }

  return imagePath.split("|", 1)[0].split("#", 1)[0].trim()
}

function resolveSocialImageUrl(
  rawPath: unknown,
  baseUrl: string,
  allSlugs: FullSlug[],
): string | undefined {
  const imagePath = nonEmptyString(rawPath)
  if (!imagePath) return undefined

  const unwrappedPath = unwrapObsidianImagePath(imagePath)
  if (isAbsoluteURL(unwrappedPath)) {
    return unwrappedPath
  }

  const imageSlug = slugifyFilePath(stripSlashes(unwrappedPath) as FilePath)
  const matchingSlug = imageSlug.includes("/")
    ? allSlugs.find((slug) => slug === imageSlug)
    : allSlugs.find((slug) => slug.split("/").at(-1) === imageSlug)

  const sitePath =
    matchingSlug ?? (imageSlug.includes("/") ? imageSlug : joinSegments("static", imageSlug))
  return new URL(sitePath, `https://${baseUrl}/`).toString()
}

function imageMimeType(imagePath: string): string {
  return `image/${getFileExtension(imagePath)?.slice(1) ?? "png"}`
}

function shouldGenerateOgImage(
  fileData: QuartzPluginData,
  fullOptions: SocialImageOptions,
): boolean {
  if (!fullOptions.generateFallbackImages) return false
  if (fullOptions.excludeRoot && fileData.slug === "index") return false
  return nonEmptyString(fileData.frontmatter?.socialImage) === undefined
}

/**
 * Generates social image (OG/twitter standard) and saves it as `.webp` inside the public folder
 * @param opts options for generating image
 */
async function generateSocialImage(
  { cfg, description, fonts, title, fileData }: ImageOptions,
  userOpts: SocialImageOptions,
): Promise<Readable> {
  const { width, height } = userOpts
  const iconPath = joinSegments(QUARTZ, "static", "icon.png")
  let iconBase64: string | undefined = undefined
  try {
    const iconData = await fs.readFile(iconPath)
    iconBase64 = `data:image/png;base64,${iconData.toString("base64")}`
  } catch (err) {
    console.warn(styleText("yellow", `Warning: Could not find icon at ${iconPath}`))
  }

  const imageComponent = userOpts.imageStructure({
    cfg,
    userOpts,
    title,
    description,
    fonts,
    fileData,
    iconBase64,
  })

  const svg = await satori(imageComponent as unknown as Parameters<typeof satori>[0], {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (languageCode: string, segment: string) => {
      if (languageCode === "emoji") {
        return await loadEmoji(getIconCode(segment))
      }

      return languageCode
    },
  })

  return sharp(Buffer.from(svg)).webp({ quality: 40 })
}

async function processOgImage(
  ctx: BuildCtx,
  fileData: QuartzPluginData,
  fonts: SatoriOptions["fonts"],
  fullOptions: SocialImageOptions,
) {
  const cfg = ctx.cfg.configuration
  const slug = fileData.slug!
  const titleSuffix = cfg.pageTitleSuffix ?? ""
  const title =
    (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
  const description = getSocialDescription(fileData, cfg.locale)

  const stream = await generateSocialImage(
    {
      title,
      description,
      fonts,
      cfg,
      fileData,
    },
    fullOptions,
  )

  return write({
    ctx,
    content: stream,
    slug: `${slug}-og-image` as FullSlug,
    ext: ".webp",
  })
}

export const CustomOgImagesEmitterName = "CustomOgImages"
export const CustomOgImages: QuartzEmitterPlugin<Partial<SocialImageOptions>> = (userOpts) => {
  const fullOptions = { ...defaultOptions, ...userOpts }

  return {
    name: CustomOgImagesEmitterName,
    getQuartzComponents() {
      return []
    },
    async *emit(ctx, content, _resources) {
      const filesToGenerate = content
        .map(([_tree, vfile]) => vfile.data)
        .filter((fileData) => shouldGenerateOgImage(fileData, fullOptions))

      if (filesToGenerate.length === 0) return

      const cfg = ctx.cfg.configuration
      const headerFont = cfg.theme.typography.header
      const bodyFont = cfg.theme.typography.body
      const fonts = await getSatoriFonts(headerFont, bodyFont)

      for (const fileData of filesToGenerate) {
        yield processOgImage(ctx, fileData, fonts, fullOptions)
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      const filesToGenerate = changeEvents
        .filter((changeEvent) => changeEvent.type === "add" || changeEvent.type === "change")
        .map((changeEvent) => changeEvent.file?.data)
        .filter(
          (fileData): fileData is QuartzPluginData =>
            fileData !== undefined && shouldGenerateOgImage(fileData, fullOptions),
        )

      if (filesToGenerate.length === 0) return

      const cfg = ctx.cfg.configuration
      const headerFont = cfg.theme.typography.header
      const bodyFont = cfg.theme.typography.body
      const fonts = await getSatoriFonts(headerFont, bodyFont)

      // find all slugs that changed or were added
      for (const fileData of filesToGenerate) {
        yield processOgImage(ctx, fileData, fonts, fullOptions)
      }
    },
    externalResources: (ctx) => {
      if (!ctx.cfg.configuration.baseUrl) {
        return {}
      }

      const baseUrl = ctx.cfg.configuration.baseUrl
      return {
        additionalHead: [
          (pageData) => {
            const isRealFile = pageData.filePath !== undefined
            const userDefinedOgImagePath = resolveSocialImageUrl(
              pageData.frontmatter?.socialImage,
              baseUrl,
              ctx.allSlugs,
            )

            const generatedOgImagePath =
              isRealFile && shouldGenerateOgImage(pageData, fullOptions)
                ? `https://${baseUrl}/${pageData.slug!}-og-image.webp`
                : undefined
            const defaultOgImagePath = `https://${baseUrl}/static/og-image.png`
            const ogImagePath = userDefinedOgImagePath ?? generatedOgImagePath ?? defaultOgImagePath
            const ogImageMimeType = imageMimeType(ogImagePath)
            return (
              <>
                {!userDefinedOgImagePath && (
                  <>
                    <meta property="og:image:width" content={fullOptions.width.toString()} />
                    <meta property="og:image:height" content={fullOptions.height.toString()} />
                  </>
                )}

                <meta property="og:image" content={ogImagePath} />
                <meta property="og:image:url" content={ogImagePath} />
                <meta name="twitter:image" content={ogImagePath} />
                <meta property="og:image:type" content={ogImageMimeType} />
              </>
            )
          },
        ],
      }
    },
  }
}
