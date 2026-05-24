import { describe, it, expect, beforeEach } from 'vitest';
import { createLogger } from '../../src/utils/logger';
import { mockChannels, resetMocks } from '../mocks/vscode';

describe('createLogger', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should create an output channel with the given name', () => {
    createLogger('TestChannel');

    expect(mockChannels).toHaveLength(1);
    expect(mockChannels[0].name).toBe('TestChannel');
  });

  it('should format log messages with INFO prefix and timestamp', () => {
    const logger = createLogger('Test');
    logger.log('hello world');

    expect(mockChannels[0].lines).toHaveLength(1);
    expect(mockChannels[0].lines[0]).toMatch(/^\[INFO \d{4}-\d{2}-\d{2}T.+\] hello world$/);
  });

  it('should format warn messages with WARN prefix', () => {
    const logger = createLogger('Test');
    logger.warn('something suspicious');

    expect(mockChannels[0].lines[0]).toMatch(/^\[WARN .+\] something suspicious$/);
  });

  it('should format error messages with ERROR prefix', () => {
    const logger = createLogger('Test');
    logger.error('something broke');

    expect(mockChannels[0].lines[0]).toMatch(/^\[ERROR .+\] something broke$/);
  });

  it('should include stack trace when an Error object is provided', () => {
    const logger = createLogger('Test');
    const err = new Error('test error');
    logger.error('something broke', err);

    expect(mockChannels[0].lines.length).toBeGreaterThanOrEqual(2);
    expect(mockChannels[0].lines[1]).toContain('Error: test error');
  });

  it('should not include stack trace when no Error object is provided', () => {
    const logger = createLogger('Test');
    logger.error('something broke');

    expect(mockChannels[0].lines).toHaveLength(1);
  });

  it('should show the output channel when show() is called', () => {
    const logger = createLogger('Test');
    expect(mockChannels[0].shown).toBe(false);

    logger.show();
    expect(mockChannels[0].shown).toBe(true);
  });

  it('should dispose the output channel when dispose() is called', () => {
    const logger = createLogger('Test');
    expect(mockChannels[0].disposed).toBe(false);

    logger.dispose();
    expect(mockChannels[0].disposed).toBe(true);
  });
});
