import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapFullscreenControlComponent } from './map-fullscreen-control.component';

describe('MapFullscreenControlComponent', () => {
  let fixture: ComponentFixture<MapFullscreenControlComponent>;
  let target: HTMLDivElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MapFullscreenControlComponent] }).compileComponents();
    fixture = TestBed.createComponent(MapFullscreenControlComponent);
    target = document.createElement('div');
    Object.defineProperty(target, 'requestFullscreen', { value: undefined });
    fixture.componentRef.setInput('target', target);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('ohn-map-fullscreen-lock');
  });

  it('uses and clears the CSS fallback when the native API is unavailable', async () => {
    await fixture.componentInstance.toggle();
    expect(target.classList.contains('ohn-map-fullscreen-fallback')).toBeTrue();
    expect(fixture.componentInstance.active()).toBeTrue();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(target.classList.contains('ohn-map-fullscreen-fallback')).toBeFalse();
    expect(fixture.componentInstance.active()).toBeFalse();
  });
});
