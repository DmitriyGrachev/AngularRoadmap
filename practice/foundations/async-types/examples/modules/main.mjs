import { issues } from './model.mjs';
function makeCounter(){let count=0;return ()=>{count+=1;return count;};}
const count=makeCounter();
const {title}=issues[0];
console.log(title,count(),count());
console.log(issues.map(({title})=>title).join(', '));
