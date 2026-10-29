type Issue = {id:string;title:string};
type Page<T> = {items:T[];total:number};
function parseIssue(value:unknown):Issue{
  if(typeof value!=='object'||value===null||!('id' in value)||!('title' in value)||typeof value.id!=='string'||typeof value.title!=='string')throw new Error('Ожидались строковые id и title');
  return {id:value.id,title:value.title};
}
const external:unknown=JSON.parse('{"id":"1","title":"Письмо"}');
const page:Page<Issue>={items:[parseIssue(external)],total:1};
console.log(page.items[0].title,page.total);
try{parseIssue({id:4,title:'Кнопка'});}catch(error){console.log(error instanceof Error?error.message:'Неизвестная ошибка');}
export {};
