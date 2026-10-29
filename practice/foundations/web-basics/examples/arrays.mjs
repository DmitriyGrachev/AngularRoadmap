const issues = [{id:'1',title:'Письмо',status:'OPEN'},{id:'2',title:'Кнопка',status:'DONE'}];
const open = issues.filter(issue => issue.status === 'OPEN');
const labels = issues.map(issue => `${issue.id}: ${issue.title}`);
const changed = issues.map(issue => issue.id === '1' ? {...issue,status:'IN_PROGRESS'} : issue);
console.log(JSON.stringify(open));
console.log(JSON.stringify(labels));
console.log(issues[0].status, changed[0].status);
console.log(issues.find(issue => issue.id === '9'));
