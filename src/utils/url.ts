export const getAbsoluteFileUrl = (url: string | null | undefined, defaultBaseUrl: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Rewrite media.elemecs.com URLs to go through the CORS-enabled API proxy endpoint
  const mediaSubdomainMatch = trimmed.match(/https?:\/\/media\.elemecs\.com\/(.+)$/i);
  if (mediaSubdomainMatch) {
    const relativePath = mediaSubdomainMatch[1];
    // Remove duplicate slashes if any
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const apiBase = defaultBaseUrl.endsWith('/') ? defaultBaseUrl.slice(0, -1) : defaultBaseUrl;
    return `${apiBase}/api/media?path=${cleanPath}`;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  // Make sure it starts with a leading slash if not absolute
  const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${defaultBaseUrl}${relativePath}`;
};
