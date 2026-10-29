function loadIssues(fail=false){return new Promise((resolve,reject)=>{setTimeout(()=>{if(fail)reject(new Error('Нет связи'));else resolve([{id:'1',title:'Письмо'}]);},20);});}
console.log('A');
Promise.resolve().then(()=>console.log('C'));
console.log('B');
async function show(fail){let loading=true;console.log('loading',loading);try{const rows=await loadIssues(fail);console.log('rows',rows.length);}catch(error){console.log('error',error.message);}finally{loading=false;console.log('loading',loading);}}
await show(false);
await show(true);
