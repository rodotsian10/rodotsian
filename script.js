const form = document.querySelector('#guest-form');
const note = document.querySelector('.form-note');
const sound = document.querySelector('.sound-toggle');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.querySelector('#message');
  note.textContent = `고마워! “${message.value.slice(0, 24)}${message.value.length > 24 ? '…' : ''}” 저장 완료 ✦`;
  message.value = '';
});

sound.addEventListener('click', () => {
  sound.classList.toggle('is-on');
  sound.innerHTML = sound.classList.contains('is-on') ? 'sound <span>●</span>' : 'sound <span>○</span>';
});

document.querySelectorAll('.surprise').forEach((button) => {
  button.addEventListener('click', () => {
    button.textContent = '✦ you found a star!';
    document.body.animate([{filter:'hue-rotate(0deg)'},{filter:'hue-rotate(12deg)'},{filter:'hue-rotate(0deg)'}], {duration:700});
  });
});
