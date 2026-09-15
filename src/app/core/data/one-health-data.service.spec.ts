import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { HubDatasetLimitError } from './hub-api.service';

import { OneHealthDataService } from './one-health-data.service';
import { HubApiService } from './hub-api.service';

describe('OneHealthDataService', () => {
  let service: OneHealthDataService;
  const hubApi = jasmine.createSpyObj<HubApiService>('HubApiService', ['getAllObservations']);

  beforeEach(() => {
    hubApi.getAllObservations.calls.reset();
    TestBed.configureTestingModule({
      providers: [{ provide: HubApiService, useValue: hubApi }],
    });
    service = TestBed.inject(OneHealthDataService);
  });

  it('should expose 55 normalized records for each source sector', () => {
    expect(service.summary.total).toBe(165);
    expect(service.summary.bySector.human).toBe(55);
    expect(service.summary.bySector.animal).toBe(55);
    expect(service.summary.bySector.environment).toBe(55);
    expect(service.summary.completeness).toBe(100);
  });

  it('should cover the eleven CEEAC countries without duplicate identifiers', () => {
    const identifiers = service.observations.map((observation) => observation.id);

    expect(service.summary.countries).toBe(11);
    expect(new Set(identifiers).size).toBe(165);
  });

  it('should keep observations, signals and verified alerts separate', () => {
    expect(service.summary.byStage.observation).toBe(150);
    expect(service.summary.byStage.signal).toBe(12);
    expect(service.summary.byStage['verified-alert']).toBe(3);
  });

  it('should filter the normalized data by period and sector', () => {
    const result = service.filter({
      period: '30d',
      sectors: new Set(['human']),
    });

    expect(result.length).toBe(11);
    expect(result.every((observation) => observation.sector === 'human')).toBeTrue();
  });

  it('should retrieve a record and related cross-sector observations', () => {
    const observation = service.findById('OBS-DHIS2-CM-01');
    const related = service.relatedTo('OBS-DHIS2-CM-01', 4);

    expect(observation?.countryCode).toBe('CM');
    expect(related.length).toBe(4);
    expect(related.every((item) => item.countryCode === 'CM')).toBeTrue();
    expect(related.some((item) => item.sector !== 'human')).toBeTrue();
  });

  it('should replace local demo data after an authenticated Hub load', async () => {
    const remoteObservation = service.observations[0];
    hubApi.getAllObservations.and.resolveTo([remoteObservation]);

    await service.loadFromHub('user-1|CM');

    expect(service.dataMode()).toBe('api');
    expect(service.observations).toEqual([remoteObservation]);
    expect(service.summary.total).toBe(1);
  });

  it('shares only same-scope in-flight loads and rejects late replies from an older scope', async () => {
    const first = service.observations[0];
    const second = service.observations[1];
    let resolveOld!: (items: typeof service.observations) => void;
    hubApi.getAllObservations.and.returnValue(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    const old = service.loadFromHub('user-A|CM');
    const rejected = expectAsync(old).toBeRejected();
    expect(service.loadFromHub('user-A|CM')).toBe(old);
    const signal = hubApi.getAllObservations.calls.mostRecent().args[0]!;
    hubApi.getAllObservations.and.resolveTo([second]);
    await service.loadFromHub('user-B|TD');
    expect(signal.aborted).toBeTrue();
    resolveOld([first]);
    await rejected;
    expect(service.observations).toEqual([second]);
  });

  it('accepts an empty authorized dataset without substituting a demo', async () => {
    hubApi.getAllObservations.and.resolveTo([]);
    await service.loadFromHub('limited-user');
    expect(service.summary.total).toBe(0);
    expect(service.summary.completeness).toBe(0);
    expect(service.dataMode()).toBe('api');
  });

  it('purges data on reset and cannot repopulate from a pending refresh', async () => {
    const observation = service.observations[0];
    hubApi.getAllObservations.and.resolveTo([observation]);
    await service.loadFromHub('user');
    let resolve!: (items: typeof service.observations) => void;
    hubApi.getAllObservations.and.returnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const refresh = service.refreshFromHub();
    const rejected = expectAsync(refresh).toBeRejected();
    service.reset();
    resolve([observation]);
    await rejected;
    expect(service.observations).toEqual([]);
  });

  for (const error of [
    new HttpErrorResponse({ status: 401 }),
    new HttpErrorResponse({ status: 403 }),
    new HubDatasetLimitError(),
  ]) {
    it(`never replaces ${error.constructor.name}/${'status' in error ? error.status : 'limit'} with demo data`, async () => {
      hubApi.getAllObservations.and.rejectWith(error);
      await expectAsync(service.loadFromHub('user')).toBeRejected();
      expect(service.observations).toEqual([]);
      expect(service.dataMode()).toBe('initial');
    });
  }
});
