import { useEffect, useState } from 'react';

/*
 * Every outbound link in the app comes from electron/links.md, so they can be
 * changed without touching code. These defaults are what you get if the file
 * is missing or a line is blank.
 */
export const DEFAULT_LINKS = {
  privacy: 'https://zentap.app/privacy',
  why: 'https://zentap.app/why',
  contact: 'mailto:hello@zentap.app',
  troubleshooting: 'https://zentap.app/troubleshooting',
  faq: 'https://zentap.app/faq',
  refer: 'https://zentap.app',
  terms: 'https://zentap.app/terms',
  privacyPolicy: 'https://zentap.app/privacy',
  instagram: 'https://instagram.com/zentap',
  linkedin: 'https://linkedin.com/company/zentap',
  reddit: 'https://reddit.com/r/zentap',
  x: 'https://x.com/zentap',
};

/** Open a link in the user's real browser, not inside the app window. */
export function openLink(url) {
  if (!url) return;
  if (window.electron?.openExternal) window.electron.openExternal(url);
  else window.open(url, '_blank', 'noopener');
}

export function useLinks() {
  const [links, setLinks] = useState(DEFAULT_LINKS);

  useEffect(() => {
    window.electron?.getLinks?.()
      .then((fromFile) => setLinks({ ...DEFAULT_LINKS, ...(fromFile || {}) }))
      .catch(() => {});
  }, []);

  return links;
}
