function loadIssues(fail){return new Promise((resolve,reject)=>setTimeout(()=>fail?reject(new Error('Учебный сбой')):resolve([{id:'1',title:'Письмо'}]),100));}
async function run(fail){
  // TODO: покажите loading=true, дождитесь данных, обработайте сбой, всегда снимайте loading.
  throw new Error('Реализуйте run');
}
await run(false);
await run(true);
