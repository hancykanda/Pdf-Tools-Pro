import { describe, expect, it } from 'vitest';
import { diffText, diffWords, toLines } from './textDiff';

describe('textDiff', () => {
  it('detects added, removed and changed lines', () => {
    const a = 'Invoice 1001\nCustomer: Acme Corp\nAmount: 100 USD\nThank you';
    const b = 'Invoice 1001\nCustomer: Acme Corporation\nAmount: 100 USD\nVAT: 20 USD\n';

    const { rows, summary } = diffText(a, b);

    expect(summary.unchanged).toBe(2);
    expect(summary.changed).toBe(1);
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);

    const changed = rows.find((r) => r.type === 'changed');
    expect(changed?.left).toBe('Customer: Acme Corp');
    expect(changed?.right).toBe('Customer: Acme Corporation');
    expect(changed?.rightSegments?.some((s) => s.changed && s.text.includes('Corporation'))).toBe(
      true,
    );

    expect(rows.find((r) => r.type === 'added')?.right).toBe('VAT: 20 USD');
    expect(rows.find((r) => r.type === 'removed')?.left).toBe('Thank you');
  });

  it('reports an empty change set for identical text', () => {
    const text = 'Line one\nLine two';
    const { rows, summary } = diffText(text, text);
    expect(summary.added + summary.removed + summary.changed).toBe(0);
    expect(rows.every((r) => r.type === 'unchanged')).toBe(true);
    expect(summary.similarity).toBe(1);
  });

  it('highlights the changed words only', () => {
    const { leftSegments, rightSegments } = diffWords('the quick brown fox', 'the slow brown fox');
    expect(leftSegments.filter((s) => s.changed).map((s) => s.text.trim())).toEqual(['quick']);
    expect(rightSegments.filter((s) => s.changed).map((s) => s.text.trim())).toEqual(['slow']);
  });

  it('normalises whitespace when splitting lines', () => {
    expect(toLines('  a  b \n\n   \n c ')).toEqual(['a b', 'c']);
  });
});
