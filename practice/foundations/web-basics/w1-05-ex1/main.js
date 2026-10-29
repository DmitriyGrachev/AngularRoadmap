const issues = [{title:'Письмо',status:'OPEN'},{title:'Кнопка',status:'DONE'}];
const form = document.querySelector('#filter'); // Намеренный дефект: проверьте id в HTML.
const result = document.querySelector('#result');
form.addEventListener('submit', event => {
  event.preventDefault();
  // TODO: прочитайте выбранный статус, покажите названия или сообщение о пустом списке.
});
