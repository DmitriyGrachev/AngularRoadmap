type Status = 'OPEN' | 'IN_PROGRESS' | 'DONE';
interface Issue {id:string;title:string;status:Status;assignee?:string;}
type LoadState = {kind:'loading'} | {kind:'ready';items:Issue[]} | {kind:'error';message:string};
function describe(state:LoadState):string{if(state.kind==='ready')return `Заявок: ${state.items.length}`;if(state.kind==='error')return state.message;return 'Загрузка';}
const issue:Issue={id:'1',title:'Письмо',status:'OPEN'};
console.log(describe({kind:'ready',items:[issue]}));
console.log([issue].find(item=>item.id==='9')?.title ?? 'Не найдено');
export {};
