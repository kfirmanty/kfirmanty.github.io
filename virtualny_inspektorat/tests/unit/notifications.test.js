import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationSystem } from '../../js/notifications.js';

describe('NotificationSystem', () => {
  let notif;

  beforeEach(() => {
    vi.useFakeTimers();
    notif = new NotificationSystem();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('initializes with zero end time', () => {
      expect(notif._endTime).toBe(0);
    });
  });

  describe('show', () => {
    it('sets text content', () => {
      notif.show('Hello', 3000);
      expect(notif.el.textContent).toBe('Hello');
    });

    it('adds show class', () => {
      notif.show('Hello', 3000);
      expect(notif.el.classList.contains('show')).toBe(true);
    });

    it('removes show class after duration', () => {
      notif.show('Hello', 3000);
      vi.advanceTimersByTime(3000);
      expect(notif.el.classList.contains('show')).toBe(false);
    });

    it('uses default duration of 3000ms', () => {
      notif.show('Hello');
      vi.advanceTimersByTime(2999);
      expect(notif.el.classList.contains('show')).toBe(true);
      vi.advanceTimersByTime(1);
      expect(notif.el.classList.contains('show')).toBe(false);
    });

    it('replaces previous notification when new one has duration > 1000', () => {
      notif.show('First', 5000);
      notif.show('Second', 2000);
      expect(notif.el.textContent).toBe('Second');
    });
  });

  describe('interrupt prevention', () => {
    it('blocks brief hints (<=1s) while longer message is active', () => {
      notif.show('Important message', 5000);
      const text = notif.el.textContent;

      notif.show('Brief hint', 500);
      expect(notif.el.textContent).toBe(text); // unchanged
    });

    it('allows brief hints after longer message expires', () => {
      notif.show('Important message', 5000);
      vi.advanceTimersByTime(5001);

      notif.show('Brief hint', 500);
      expect(notif.el.textContent).toBe('Brief hint');
    });

    it('allows normal-duration messages to replace active ones', () => {
      notif.show('First', 5000);
      notif.show('Replacement', 2000);
      expect(notif.el.textContent).toBe('Replacement');
    });

    it('allows exactly 1000ms messages to be blocked', () => {
      notif.show('Long', 5000);
      notif.show('One second', 1000);
      expect(notif.el.textContent).toBe('Long'); // blocked
    });

    it('allows 1001ms messages through', () => {
      notif.show('Long', 5000);
      notif.show('Over one second', 1001);
      expect(notif.el.textContent).toBe('Over one second');
    });
  });

  describe('timer management', () => {
    it('clears previous timer when showing new notification', () => {
      notif.show('First', 5000);
      notif.show('Second', 2000);

      // After 2000ms, Second should hide
      vi.advanceTimersByTime(2000);
      expect(notif.el.classList.contains('show')).toBe(false);

      // The first timer (5000ms) should not re-trigger
      vi.advanceTimersByTime(3000);
      expect(notif._endTime).toBe(0);
    });
  });
});
