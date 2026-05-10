export const APP_URL_SCHEME = 'middleman';

export const PUBLIC_WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN
  || 'https://middlemanmarketplace.com';

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export const deepLink = (path = '') => `${APP_URL_SCHEME}://${path.replace(/^\//, '')}`;

export const webUrl = (path = '') => `${PUBLIC_WEB_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
