import { environment } from '../../../environments/environment';

const BACKEND_ORIGIN = environment.apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

export function resolveMediaUrl(rawUrl?: string | null): string {
  const value = `${rawUrl ?? ''}`.trim();
  if (!value) return '';
  if (/^(data:|blob:|assets\/|\/assets\/)/i.test(value)) return value;

  const uploadsIndex = value.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return `${BACKEND_ORIGIN}${value.substring(uploadsIndex)}`;
  }

  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === 'firebasestorage.googleapis.com') {
      url.searchParams.set('ngsw-bypass', 'true');
      return url.toString();
    }
  } catch {
    return value;
  }
  return value;
}
