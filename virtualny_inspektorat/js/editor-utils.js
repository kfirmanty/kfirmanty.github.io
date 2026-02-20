export function round3(v) {
  return Math.round(v * 1000) / 1000;
}

export function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
