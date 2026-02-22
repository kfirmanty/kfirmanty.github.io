import { describe, it, expect } from 'vitest';
import { round3, escHtml } from '../../js/editor-utils.js';

describe('round3', () => {
  it('rounds to 3 decimal places', () => {
    expect(round3(1.23456789)).toBe(1.235);
  });

  it('returns 0 for 0', () => {
    expect(round3(0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(round3(-3.14159)).toBe(-3.142);
  });

  it('rounds at boundary correctly', () => {
    expect(round3(1.0005)).toBe(1.001);
  });

  it('preserves large values', () => {
    expect(round3(1000000.123)).toBe(1000000.123);
  });

  it('truncates very small values', () => {
    expect(round3(0.00001)).toBe(0);
  });

  it('handles integers unchanged', () => {
    expect(round3(42)).toBe(42);
  });

  it('returns NaN for NaN', () => {
    expect(round3(NaN)).toBeNaN();
  });
});

describe('escHtml', () => {
  it('escapes ampersands', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('returns empty string unchanged', () => {
    expect(escHtml('')).toBe('');
  });

  it('passes through plain text', () => {
    expect(escHtml('no special chars')).toBe('no special chars');
  });

  it('double-encodes existing entities', () => {
    expect(escHtml('&amp;')).toBe('&amp;amp;');
  });

  it('escapes all special chars together', () => {
    expect(escHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
