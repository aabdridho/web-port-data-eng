import raw from '../data/projects.json';
import type { SiteData } from './schema';

/** Data hasil scripts/fetch-github.ts (sudah tervalidasi saat build). */
export const siteData = raw as unknown as SiteData;
export const projects = siteData.projects;
export const isSample = siteData.source === 'sample';
