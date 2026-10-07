import type { MetadataRoute } from 'next';
import { SITE_URL } from '../config';

export const dynamic = 'force-static';

const sitemap = (): MetadataRoute.Sitemap => [{ url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 }];

export default sitemap;
