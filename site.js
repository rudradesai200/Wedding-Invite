const opening = document.querySelector('#opening');
const journey = document.querySelector('#journey');
const stage = document.querySelector('#stage');
const nav = document.querySelector('.journey-nav');
const scenes = [...document.querySelectorAll('.scene')];
const previous = document.querySelector('#previous');
const forward = document.querySelector('#forward');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let openingTimer;
let sceneAnimation;
let transitionTimer;
let leavingScene;
const sceneMotion = {
  welcome: ['scale(1.045)', 720],
  invitation: ['perspective(900px) rotateY(-14deg) translateX(-22px)', 720],
  celebrations: ['translateY(28px)', 640],
  wedding: ['translateY(12px) scale(.94)', 780],
  travel: ['translateX(34px)', 670],
  rsvp: ['scale(.96) translateY(17px)', 700],
};
const dots = scenes.map((scene, index) => {
  const button = document.createElement('button');
  const name = scene.querySelector('h1, h2').textContent.trim();
  button.type = 'button';
  button.setAttribute('aria-label', 'Scene ' + (index + 1) + ' of ' + scenes.length + ' — ' + name);
  button.title = name;
  button.addEventListener('click', () => navigate(index));
  nav.querySelector('.dots').append(button);
  return button;
});

function render(index, focus = true) {
  if (index < 0 || index >= scenes.length) return;
  const backward = index < current;
  const outgoing = scenes[current];
  const changed = current !== index;
  clearTimeout(transitionTimer);
  leavingScene?.remove();
  leavingScene = null;
  if (focus && changed && !reduceMotion.matches) {
    leavingScene = outgoing.cloneNode(true);
    leavingScene.removeAttribute('id');
    leavingScene.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    leavingScene.setAttribute('aria-hidden', 'true');
    leavingScene.inert = true;
    leavingScene.classList.add('scene-leaving');
    leavingScene.hidden = false;
    leavingScene.style.setProperty('--exit-direction', backward ? '1' : '-1');
    stage.append(leavingScene);
    transitionTimer = setTimeout(() => { leavingScene?.remove(); leavingScene = null; }, 900);
  }
  current = index;
  scenes.forEach((scene, i) => { scene.hidden = index !== i; });
  journey.dataset.scene = scenes[index].id;
  dots.forEach((dot, i) => {
    if (i === index) dot.setAttribute('aria-current', 'step');
    else dot.removeAttribute('aria-current');
  });
  previous.disabled = index === 0;
  forward.disabled = index === scenes.length - 1;
  document.querySelector('#scene-status').textContent = (index + 1) + ' / ' + scenes.length;
  stage.scrollTop = 0;
  sceneAnimation?.cancel();
  if (!focus) return;
  const scene = scenes[index];
  scene.querySelector('h1, h2').focus({preventScroll: true});
  const content = scene.querySelector('.scene-content');
  if (reduceMotion.matches || !content.animate) return;
  const [entrance, duration] = sceneMotion[scene.id];
  sceneAnimation = scene.animate(
    [{opacity: 0, transform: backward ? 'translateX(-12%) scale(.98)' : 'translateX(12%) scale(.98)'},
     {opacity: 1, transform: 'none'}],
    {duration: 900, easing: 'cubic-bezier(.22,.68,.25,1)'}
  );
  [...content.children].forEach((part, order) => {
    part.animate(
      [{opacity: 0, transform: entrance}, {opacity: 1, transform: 'none'}],
      {duration, delay: 150 + Math.min(order, 5) * 65, fill: 'backwards', easing: 'cubic-bezier(.2,.75,.3,1)'}
    );
  });
}

function navigate(index) {
  if (!opening.hidden || index < 0 || index >= scenes.length || index === current) return;
  history.pushState(null, '', '#' + scenes[index].id);
  render(index);
}
function indexFromUrl() {
  return scenes.findIndex(scene => '#' + scene.id === location.hash);
}
function finishOpening(index) {
  clearTimeout(openingTimer);
  opening.hidden = true;
  journey.inert = false;
  nav.hidden = false;
  render(index);
}
function openInvitation() {
  if (opening.classList.contains('revealed')) return;
  opening.classList.add('revealed');
  if (reduceMotion.matches) finishOpening(0);
  else openingTimer = setTimeout(() => finishOpening(0), 950);
}
function resetOpening() {
  clearTimeout(openingTimer);
  opening.classList.remove('revealed');
  opening.hidden = false;
  nav.hidden = true;
  journey.inert = true;
  render(0, false);
  document.querySelector('#reveal').focus({preventScroll: true});
}
document.querySelector('#reveal').addEventListener('click', () => openInvitation());
document.querySelector('#replay').addEventListener('click', () => {
  history.pushState(null, '', location.pathname + location.search);
  resetOpening();
});
previous.addEventListener('click', () => navigate(current - 1));
forward.addEventListener('click', () => navigate(current + 1));
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => navigate(current + 1)));
window.addEventListener('hashchange', () => {
  const index = indexFromUrl();
  if (index >= 0) finishOpening(index);
  else if (opening.hidden) render(0);
});
document.addEventListener('keydown', event => {
  if (!opening.hidden || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    navigate(current + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});

let touch;
stage.addEventListener('touchstart', event => {
  touch = event.touches.length === 1 && !event.target.closest('button, a, summary') ? event.touches[0] : null;
}, {passive: true});
stage.addEventListener('touchcancel', () => { touch = null; });
stage.addEventListener('touchend', event => {
  if (!touch) return;
  const end = event.changedTouches[0];
  const dx = end.clientX - touch.clientX;
  const dy = end.clientY - touch.clientY;
  touch = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) navigate(current + (dx < 0 ? 1 : -1));
}, {passive: true});

const dates = [...document.querySelectorAll('[data-date]')];
const days = [...document.querySelectorAll('[data-day]')];
function showDate(date) {
  dates.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.date === date)));
  days.forEach(day => { day.hidden = day.dataset.day !== date; });
}
dates.forEach(button => button.addEventListener('click', () => showDate(button.dataset.date)));
showDate('25');

const weddingTime = Date.parse('2027-01-28T19:00:00+05:30');
const units = [['days', 86400], ['hours', 3600, 24], ['minutes', 60, 60], ['seconds', 1, 60]];
function updateClock() {
  const remaining = Math.max(0, Math.ceil((weddingTime - Date.now()) / 1000));
  units.forEach(([id, size, limit]) => {
    const total = Math.floor(remaining / size);
    document.getElementById(id).textContent = limit ? String(total % limit).padStart(2, '0') : total;
  });
  document.querySelector('.clock').hidden = remaining === 0;
  return remaining;
}
if (updateClock()) {
  const timer = setInterval(() => { if (!updateClock()) clearInterval(timer); }, 1000);
}

const initial = indexFromUrl();
if (initial >= 0) finishOpening(initial);
else resetOpening();


// YouTube requires a visible embedded player; start only after a guest taps play.
// The dock sits outside the scene stage so changing pages does not stop the song.
const musicToggle = document.querySelector('#music-toggle');
const musicPanel = document.querySelector('#music-player');
const musicEmbed = document.querySelector('#music-embed');
const musicStop = document.querySelector('#music-stop');
musicToggle.addEventListener('click', () => {
  if (!musicPanel.hidden) {
    musicPanel.hidden = true;
    musicEmbed.replaceChildren();
    musicToggle.setAttribute('aria-expanded', 'false');
    musicToggle.textContent = '♫ Play wedding song';
    return;
  }
  const player = document.createElement('iframe');
  player.title = 'Wedding song on YouTube';
  player.src = 'https://www.youtube-nocookie.com/embed/-GZ-eEozdIg?autoplay=1&playsinline=1&rel=0';
  player.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  player.referrerPolicy = 'strict-origin-when-cross-origin';
  player.allowFullscreen = true;
  musicEmbed.append(player);
  musicPanel.hidden = false;
  musicToggle.setAttribute('aria-expanded', 'true');
  musicToggle.textContent = '♫ Hide / stop music';
});
musicStop.addEventListener('click', () => {
  musicPanel.hidden = true;
  musicEmbed.replaceChildren();
  musicToggle.setAttribute('aria-expanded', 'false');
  musicToggle.textContent = '♫ Play wedding song';
  musicToggle.focus();
});
