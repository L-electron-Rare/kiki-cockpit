/**
 * Per-route SEO head builder.
 *
 * __root.tsx owns the invariant tags (charSet, viewport, theme-color, OG
 * image, og:site_name, JSON-LD). Each route calls seo() for the
 * page-specific tags only: title, description, canonical, and the
 * OG/Twitter title + description. The two sets never overlap, so
 * TanStack's head merge needs no deduplication.
 */

export const SITE_URL = 'https://www.ailiance.fr';

interface SeoInput {
  /** Page title — also used verbatim for og:title / twitter:title. */
  title: string;
  /** ~150-char summary — also used for og:description / twitter:description. */
  description: string;
  /** Absolute path from the site root, e.g. '/catalog'. Builds the canonical URL. */
  path: string;
}

export function seo({ title, description, path }: SeoInput) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}
