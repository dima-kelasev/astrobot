import type { MetadataRoute } from 'next';
import { SITE_URL } from '../config';

export const dynamic = 'force-static';

const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/api/'] }],
  sitemap: `${SITE_URL}/sitemap.xml`
});

export default robots;
