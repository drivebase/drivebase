import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import { z } from "zod";

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const blogPosts = defineCollections({
  type: "doc",
  dir: "content/blogs",
  schema: pageSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
});

export const roadmaps = defineCollections({
  type: "doc",
  dir: "content/roadmaps",
  schema: pageSchema.extend({
    title: z.string(),
    version: z.string(),
    date: z.string(),
    features: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    ),
  }),
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      theme: "github-dark",
      langs: ["dotenv"],
    },
  },
});
