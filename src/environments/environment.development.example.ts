export const environment = {
  production: false,
  apiBaseUrl: '/api',
  allowDemoFallback: true,
  mapTiles: {
    provider: 'openstreetmap' as const,
    urlTemplate: '',
    attribution: '',
    attributionUrl: '',
    maxZoom: 19,
  },
};
