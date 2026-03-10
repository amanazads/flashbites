import React from 'react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.flashbites.in';
const DEFAULT_IMAGE = `${BASE_URL}/logo.png`;
const SITE_NAME = 'FlashBites';

/**
 * Reusable SEO component for per-page meta tags.
 * Usage: <SEO title="Home" description="..." />
 */
const SEO = ({
  title,
  description = 'FlashBites delivers hot, fresh food from the best restaurants straight to your door in minutes. Order online, track live, enjoy!',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  keywords,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Fast Food Delivery in India`;
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
