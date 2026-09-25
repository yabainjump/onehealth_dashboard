import { resolveMapTileConfiguration } from './map-tile.config';

describe('map tile configuration', () => {
  it('keeps older environment files compatible with the demonstration provider', () => {
    const result = resolveMapTileConfiguration(undefined);

    expect(result.enabled).toBeTrue();
    expect(result.urlTemplate).toContain('openstreetmap.org');
  });

  it('supports an explicit provider-disabled mode', () => {
    const result = resolveMapTileConfiguration({
      provider: 'none',
      urlTemplate: '',
      attribution: '',
      attributionUrl: '',
      maxZoom: 19,
    });

    expect(result.enabled).toBeFalse();
  });

  it('rejects insecure or incomplete custom tile templates', () => {
    const result = resolveMapTileConfiguration({
      provider: 'custom',
      urlTemplate: 'http://tiles.example.test/{z}/{x}.png',
      attribution: 'Example',
      attributionUrl: '',
      maxZoom: 19,
    });

    expect(result.enabled).toBeFalse();
    expect(result.reason).toContain('invalide');
  });

  it('escapes operator-provided attribution before Leaflet renders it', () => {
    const result = resolveMapTileConfiguration({
      provider: 'custom',
      urlTemplate: 'https://tiles.example.test/{z}/{x}/{y}.png',
      attribution: '<script>unsafe</script>',
      attributionUrl: 'https://tiles.example.test/terms',
      maxZoom: 18,
    });

    expect(result.enabled).toBeTrue();
    expect(result.attributionHtml).not.toContain('<script>');
    expect(result.attributionHtml).toContain('&lt;script&gt;');
  });
});
