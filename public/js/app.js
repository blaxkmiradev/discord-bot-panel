// Global utility: show toast
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast-notification bg-${type} text-white`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Sidebar create button — prevent default href nav, open modal instead
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sidebarCreateBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  }
});
