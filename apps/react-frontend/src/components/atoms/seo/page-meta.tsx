const SITE_URL = 'https://aiolos.resonect.cz';

interface PageMetaProps {
  title: string;
  description: string;
  /** Route path starting with '/', used for the canonical URL */
  path: string;
  noindex?: boolean;
}

/**
 * Per-route document metadata. React 19 hoists <title>/<meta>/<link> rendered
 * anywhere in the tree into <head>, so no head-manager dependency is needed.
 * The canonical must be per-route: the SPA serves the same HTML on every
 * path, and a static canonical would mark every page as a duplicate of /.
 */
export function PageMeta({ title, description, path, noindex = false }: PageMetaProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE_URL}${path}`} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
    </>
  );
}
