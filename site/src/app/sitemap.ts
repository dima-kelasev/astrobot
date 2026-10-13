import type { MetadataRoute } from 'next';
import { SITE_URL } from '../config';

export const dynamic = 'force-static';

const sitemap = (): MetadataRoute.Sitemap => [
  { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/privacy/`, changeFrequency: 'yearly', priority: 0.2 }
];

export default sitemap;
