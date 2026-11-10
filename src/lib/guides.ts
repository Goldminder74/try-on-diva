import { marked, Renderer } from "marked";
import { parse as parseYaml } from "yaml";

// Every markdown file in src/content/guides is a guide. Adding a guide only
// requires adding one file with the frontmatter below.
const files = import.meta.glob("/src/content/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type GuideFaq = { q: string; a: string };
export type GuideMeta = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  datePublished: string;
  faq: GuideFaq[];
  readingMinutes: number;
};
export type Guide = GuideMeta & { html: string };

export function parseGuide(raw: string): { meta: Omit<GuideMeta, "readingMinutes">; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("Guide is missing frontmatter");
  const fm = parseYaml(m[1]) as Record<string, unknown>;
  const str = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));
  return {
    meta: {
      slug: str(fm.slug),
      title: str(fm.title),
      metaTitle: str(fm.metaTitle || fm.title),
      metaDescription: str(fm.metaDescription),
      datePublished: str(fm.datePublished),
      faq: Array.isArray(fm.faq) ? (fm.faq as GuideFaq[]).map((f) => ({ q: String(f.q), a: String(f.a) })) : [],
    },
    body: m[2],
  };
}

export function readingMinutes(body: string) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const renderer = new Renderer();
renderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  const t = title ? ` title="${title}"` : "";
  if (/^https?:\/\//i.test(href)) {
    return `<a href="${href}"${t} target="_blank" rel="noopener">${text}</a>`;
  }
  return `<a href="${href}"${t}>${text}</a>`;
};

function build(raw: string): Guide {
  const { meta, body } = parseGuide(raw);
  const html = marked.parse(body, { renderer, gfm: true, async: false }) as string;
  return { ...meta, html, readingMinutes: readingMinutes(body) };
}

const ALL: Guide[] = Object.values(files)
  .map(build)
  .sort((a, b) => b.datePublished.localeCompare(a.datePublished));

export function listGuides(): GuideMeta[] {
  return ALL.map(({ html: _html, ...meta }) => meta);
}

export function getGuide(slug: string): Guide | undefined {
  return ALL.find((g) => g.slug === slug);
}
