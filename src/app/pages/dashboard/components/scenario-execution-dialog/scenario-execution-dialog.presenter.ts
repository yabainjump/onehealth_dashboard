export function canSubmitScenario(busy: boolean, configurationError: string | null): boolean {
  return !busy && !configurationError;
}
