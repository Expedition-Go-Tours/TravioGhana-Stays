import { it, expect } from 'vitest';
import { cn } from '@/lib/utils';
it('keeps size + colour', () => {
  expect(cn('text-caption text-ink')).toBe('text-caption text-ink');
  expect(cn('text-sm text-caption')).toBe('text-caption');
  expect(cn('rounded-xl rounded-card')).toBe('rounded-card');
  expect(cn('bg-white bg-surface')).toBe('bg-surface');
});
