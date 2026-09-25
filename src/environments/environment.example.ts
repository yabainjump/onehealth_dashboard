export const environment = {
  production: true,
  apiBaseUrl: 'https://backend.example.com/api',
  allowDemoFallback: false,
  mapTiles: {
    provider: 'custom' as const,
    urlTemplate: 'https://tiles.example.com/{z}/{x}/{y}.png',
    attribution: 'Fournisseur cartographique institutionnel',
    attributionUrl: 'https://tiles.example.com/terms',
    maxZoom: 19,
  },
};
