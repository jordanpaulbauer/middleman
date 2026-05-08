import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'MIDDLEMAN';
const DEFAULT_DESCRIPTION = 'Commission marketplace where closers help sellers move high-value inventory and earn a percentage of every closed deal.';

// Per-page <head> tags. Pass `title` (without the site suffix), an optional
// `description`, and an optional `image` (absolute URL) for OG/Twitter cards.
// Use `noIndex` for private/account pages we don't want in search results.
export default function Seo({ title, description, image, noIndex }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Commission marketplace`;
  const desc = description || DEFAULT_DESCRIPTION;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
}
