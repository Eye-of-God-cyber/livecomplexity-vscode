import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings } from '../../src/config/settings';
import { resetMocks, setMockConfig } from '../mocks/vscode';

describe('getSettings', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should return all default values when no config is set', () => {
    const settings = getSettings();

    expect(settings.enable).toBe(true);
    expect(settings.debounceMs).toBe(300);
    expect(settings.showInlineAnnotations).toBe(true);
    expect(settings.showHover).toBe(true);
    expect(settings.maxFileSizeKB).toBe(100);
  });

  it('should return correct types for all settings', () => {
    const settings = getSettings();

    expect(typeof settings.enable).toBe('boolean');
    expect(typeof settings.debounceMs).toBe('number');
    expect(typeof settings.showInlineAnnotations).toBe('boolean');
    expect(typeof settings.showHover).toBe('boolean');
    expect(typeof settings.maxFileSizeKB).toBe('number');
  });

  it('should have exactly 5 settings properties', () => {
    const settings = getSettings();
    expect(Object.keys(settings)).toHaveLength(5);
  });

  it('should reflect mock config values when set', () => {
    setMockConfig('enable', false);
    setMockConfig('debounceMs', 500);

    const settings = getSettings();

    expect(settings.enable).toBe(false);
    expect(settings.debounceMs).toBe(500);
  });

  it('should use defaults for unset keys even when other keys are configured', () => {
    setMockConfig('enable', false);

    const settings = getSettings();

    expect(settings.enable).toBe(false);
    expect(settings.debounceMs).toBe(300); // still default
    expect(settings.showHover).toBe(true); // still default
  });
});
