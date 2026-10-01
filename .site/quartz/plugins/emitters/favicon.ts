import fs from "fs"
import { joinSegments, QUARTZ, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"

// favicon.ico рисует генератор иконок бренда (canon §19): настоящий ICO со скруглением
// и альфой. Кладём его в корень как есть, без пережатия.
export const Favicon: QuartzEmitterPlugin = () => ({
  name: "Favicon",
  async *emit({ argv }) {
    const faviconPath = joinSegments(QUARTZ, "static", "favicon.ico")

    yield write({
      ctx: { argv } as BuildCtx,
      slug: "favicon" as FullSlug,
      ext: ".ico",
      content: await fs.promises.readFile(faviconPath),
    })
  },
  async *partialEmit() {},
})
