import { describe, expect, it } from 'vitest';
import { humanizeStatus, STATUS_TONES, statusEntry, TONE_CLASSES } from '../statusTones';
import { OFFER_STATUS_CONFIG } from '@/features/stays/utils/offerStatus';
import { statusTone } from '@/features/stays/utils/status';

describe('status map', () => {
  it('gives every known status a tone the badge can render and a label', () => {
    for (const [domain, entries] of Object.entries(STATUS_TONES)) {
      for (const [status, entry] of Object.entries(entries)) {
        expect(TONE_CLASSES[entry.tone], `${domain}.${status}`).toBeDefined();
        expect(entry.label.trim(), `${domain}.${status}`).not.toBe('');
      }
    }
  });

  it('uses theme tokens, never hex colours', () => {
    const all = JSON.stringify(TONE_CLASSES);
    expect(all).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('keeps the domain-specific labels the pages relied on', () => {
    expect(statusEntry('earning', 'PENDING')).toEqual({ tone: 'warning', label: 'Clearing' });
    expect(statusEntry('earning', 'DISPUTED').label).toBe('On hold');
    expect(statusEntry('refund', 'RESOLVED_CUSTOMER').label).toBe('Refunded');
    expect(statusEntry('booking', 'Cancelled').tone).toBe('danger');
    expect(statusEntry('payout', 'IN_REVIEW')).toEqual({ tone: 'warning', label: 'In review' });
  });

  it('falls back to a neutral, readable label for unknown statuses', () => {
    expect(statusEntry('payout', 'ON_THE_MOON')).toEqual({ tone: 'neutral', label: 'On the moon' });
    expect(statusEntry('booking', undefined).tone).toBe('neutral');
    expect(humanizeStatus('PENDING_APPROVAL')).toBe('Pending approval');
  });
});

describe('legacy adapters read the shared map', () => {
  it('statusTone keeps the prototype colours', () => {
    expect(statusTone('Draft')).toBe('amber');
    expect(statusTone('Paused')).toBe('amber');
    expect(statusTone('Under review')).toBe('amber');
    expect(statusTone('New')).toBe('amber');
    expect(statusTone('Confirmed')).toBe('blue');
    expect(statusTone('No-show')).toBe('red');
    expect(statusTone('Live')).toBe('green');
    expect(statusTone('Completed')).toBe('green');
  });

  it('OFFER_STATUS_CONFIG exposes token classes', () => {
    expect(OFFER_STATUS_CONFIG.active).toMatchObject({ label: 'Active', tone: 'success', bg: 'bg-success-soft' });
    expect(OFFER_STATUS_CONFIG.scheduled.text).toBe('text-info');
  });
});
