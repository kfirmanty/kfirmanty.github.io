export class NotificationSystem {
  constructor() {
    this.el = document.getElementById('notification');
    this.timer = null;
    this._endTime = 0;
  }

  show(text, duration = 3000) {
    // Don't let brief hover hints (<=1s) overwrite longer messages
    const now = Date.now();
    if (duration <= 1000 && this._endTime > now) return;

    this.el.textContent = text;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this._endTime = now + duration;
    this.timer = setTimeout(() => {
      this.el.classList.remove('show');
      this._endTime = 0;
    }, duration);
  }
}
