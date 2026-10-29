import { issues } from './model.mjs';
function printTitle(issue){console.log(issue.title);}
// TODO: объясните и исправьте немедленный вызов функции вместо передачи callback.
issues.forEach(printTitle(issues[0]));
// TODO: вынесите выбор OPEN в transforms.mjs и добавьте независимый счётчик вызовов через замыкание.
