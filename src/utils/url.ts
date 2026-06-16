/**
 * Case-insensitive absolute URL checks for frontend source files.
 * Replaces checking startsWith('http') with a case-insensitive match.
 */

export const getAbsoluteFileUrl = (url: string | null | undefined, defaultBaseUrl: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  // Make sure it starts with a leading slash if not absolute
  const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${defaultBaseUrl}${relativePath}`;
};
