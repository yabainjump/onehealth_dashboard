import { canSubmitScenario } from './scenario-execution-dialog.presenter';

describe('scenario execution dialog rules', () => {
  it('allows one validated submission', () => {
    expect(canSubmitScenario(false, null)).toBeTrue();
  });

  it('blocks duplicate and invalid submissions', () => {
    expect(canSubmitScenario(true, null)).toBeFalse();
    expect(canSubmitScenario(false, 'Invalid')).toBeFalse();
  });
});
