export class NotificationSystem {
  constructor() {
    this.el = document.getElementById('notification');
    this.timer = null;
  }

  show(text, duration = 3000) {
    this.el.textContent = text;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.classList.remove('show');
    }, duration);
  }
}
