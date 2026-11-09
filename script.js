const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.querySelector('span').textContent = isOpen ? '×' : '+';
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.querySelector('span').textContent = '+';
  });
});


const themeButton = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let selectedTheme;
try { selectedTheme = localStorage.getItem('theme'); } catch (_) {}
if (selectedTheme !== 'light' && selectedTheme !== 'dark') selectedTheme = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const action = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
  themeButton?.setAttribute('aria-label', action);
  themeButton?.setAttribute('title', action);
}

applyTheme(document.documentElement.dataset.theme);
themeButton?.addEventListener('click', () => {
  selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(selectedTheme);
  try { localStorage.setItem('theme', selectedTheme); } catch (_) {}
});

systemTheme.addEventListener('change', (event) => {
  if (!selectedTheme) applyTheme(event.matches ? 'dark' : 'light');
});
