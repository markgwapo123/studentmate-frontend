const navigationIcons={"home": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/></g>", "tasks": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m3 17l2 2l4-4M3 7l2 2l4-4m4 1h8m-8 6h8m-8 6h8\"/>", "subjects": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z\"/>", "notes": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5z\"/><path d=\"M15 3v6h6\"/></g>", "schedule": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><path d=\"M16 2v4M8 2v4m-5 4h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01\"/></g>", "focus": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M10 2h4m-2 12l3-3\"/><circle cx=\"12\" cy=\"14\" r=\"8\"/></g>", "settings": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></g>"};
function navIcon(id){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${navigationIcons[id]}</svg>`}
const $=id=>document.getElementById(id),KEY='studentmate.v1',days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let state={name:'Master',subjects:[],tasks:[],notes:[],schedule:[],sessions:0,focus:25,break:5};try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.subjects)&&Array.isArray(saved.tasks)&&Array.isArray(saved.notes)&&Array.isArray(saved.schedule))state={...state,...saved}}catch{}
let page='home',filter='all',taskSort='earliest',timerMode='focus',seconds=state.focus*60,endTime=0,interval=null;
const selectedTaskIds=new Set();
const pages={home:['◫','Overview'],tasks:['☑','Assignments'],subjects:['▤','Subjects'],notes:['▧','Notes'],schedule:['▦','Schedule'],focus:['◷','Focus'],settings:['⚙','Settings']};
const customizablePages=['tasks','subjects','schedule','notes','focus'];
const defaultNavigation=['tasks','subjects','schedule'];
function validNavigation(items){return Array.isArray(items)&&items.length===3&&new Set(items).size===3&&items.every(id=>customizablePages.includes(id))}
function navigationItems(){return ['home',...(validNavigation(state.navItems)?state.navItems:defaultNavigation),'settings']}
function navigationSettings(){const selected=navigationItems().slice(1,4);return `<section class="card nav-customization"><h2>Customize navigation</h2><p class="subtitle">Choose your three shortcuts. Overview and Settings stay fixed.</p><div class="nav-fixed-preview"><span>${navIcon('home')} Overview <small>Fixed</small></span><span>${navIcon('settings')} Settings <small>Fixed</small></span></div><form onsubmit="saveNavigation(event)">${selected.map((value,index)=>`<label for="nav-slot-${index}">Shortcut ${index+1}</label><select id="nav-slot-${index}" name="slot${index}">${customizablePages.map(id=>`<option value="${id}" ${id===value?'selected':''}>${pages[id][1]}</option>`).join('')}</select>`).join('')}<p id="nav-custom-error" role="alert"></p><div class="card-actions"><button class="primary" type="submit">Save navigation</button><button class="secondary" type="button" onclick="resetNavigation()">Reset default</button></div></form></section>`}
function saveNavigation(event){event.preventDefault();const data=new FormData(event.target),items=[0,1,2].map(i=>data.get('slot'+i));if(!validNavigation(items)){$('nav-custom-error').textContent='Choose a different feature for each shortcut.';return}state.navItems=items;save();render();toast('Navigation updated')}
function resetNavigation(){state.navItems=[...defaultNavigation];save();render();toast('Default navigation restored')}
function settingsTools(){return `<section class="card settings-tools"><h2>Study tools</h2><p class="subtitle">Open any feature, including shortcuts not on your navigation bar.</p><div class="settings-tool-list">${customizablePages.map(id=>`<button type="button" onclick="go('${id}')"><span>${navIcon(id)}</span><strong>${pages[id][1]}</strong><i aria-hidden="true">›</i></button>`).join('')}</div></section>`}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID(),date=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},sub=id=>state.subjects.find(s=>s.id===id),pretty=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'No deadline';
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),selectedCalendarDate=date();
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function scheduleDay(d){return days[(d.getDay()+6)%7]}
function selectScheduleDate(value){selectedCalendarDate=value;const selected=new Date(value+'T12:00:00');if(selected.getMonth()!==calendarMonth.getMonth()||selected.getFullYear()!==calendarMonth.getFullYear())calendarMonth=new Date(selected.getFullYear(),selected.getMonth(),1);render()}
function changeCalendarMonth(amount){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+amount,1);selectedCalendarDate=dateKey(calendarMonth);render()}
function goToCalendarToday(){calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);selectedCalendarDate=date();render()}
function calendarMarkup(){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),monthName=calendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'}),offset=(new Date(y,m,1).getDay()+6)%7,start=new Date(y,m,1-offset),cells=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d),day=scheduleDay(d),classes=state.schedule.filter(c=>c.day===day).sort((a,b)=>a.start.localeCompare(b.start));return `<button type="button" class="calendar-day ${d.getMonth()!==m?'outside-month':''} ${key===selectedCalendarDate?'selected':''} ${key===date()?'is-today':''}" onclick="selectScheduleDate('${key}')"><span class="calendar-day-number">${d.getDate()}</span>${classes.length?`<span class="calendar-count">${classes.length} ${classes.length===1?'class':'classes'}</span><span class="calendar-events">${classes.slice(0,2).map(c=>`<span>${c.start} · ${esc(sub(c.subject)?.name||c.title)}</span>`).join('')}${classes.length>2?`<span>+${classes.length-2} more</span>`:''}</span>`:''}</button>`}).join('');return `<section class="card calendar-card"><div class="calendar-toolbar"><div><div class="eyebrow">WEEKLY CLASSES</div><h2>${monthName}</h2></div><div class="calendar-controls"><button class="secondary" type="button" onclick="goToCalendarToday()">Today</button><button class="secondary calendar-arrow" type="button" aria-label="Previous month" onclick="changeCalendarMonth(-1)">‹</button><button class="secondary calendar-arrow" type="button" aria-label="Next month" onclick="changeCalendarMonth(1)">›</button></div></div><div class="calendar-grid calendar-weekdays">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid calendar-dates">${cells}</div><p class="calendar-note">Classes repeat every week on the selected weekday.</p></section>`}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{toast('Storage is full or unavailable. Export a backup.');return false}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(window.toastTimeout);window.toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),3000)}
function go(p){page=p;location.hash=p;render()}
function openSummary(kind){if(kind==='subjects'){go('subjects');return}filter={pending:'open',today:'today',completed:'done'}[kind]||'all';go('tasks')}
function heading(eyebrow,title,desc,button=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${desc}</p></div>${button}</div>`}
function empty(icon,title,desc){return `<div class="empty"><div class="empty-symbol">${icon}</div><strong>${title}</strong><br>${desc}</div>`}
function taskDeadlineKey(t){return t.due?t.due+'T'+(t.dueTime||'23:59'):''}
function compareTaskDeadlines(a,b,direction='earliest'){const ak=taskDeadlineKey(a),bk=taskDeadlineKey(b);if(!ak&&!bk)return 0;if(!ak)return 1;if(!bk)return -1;const result=ak.localeCompare(bk);return direction==='latest'?-result:result}
function taskTimeLabel(value){if(!value)return '';const [h,m]=value.split(':').map(Number);return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM')}
function assignmentList(){return state.tasks.filter(t=>filter==='done'?t.done:!t.done&&(filter!=='today'||t.due===date())).sort((a,b)=>compareTaskDeadlines(a,b,taskSort))}
function taskRow(t){const s=sub(t.subject),over=!!t.due&&!t.done&&new Date(taskDeadlineKey(t))<new Date(),label=t.done?'Completed':over?'Overdue':t.due===date()?'Due today':t.due?pretty(t.due):t.priority;return `<div class="task ${t.done?'done':''}"><input type="checkbox" ${selectedTaskIds.has(t.id)?'checked':''} data-task-id="${esc(t.id)}" aria-label="Select ${esc(t.title)}" onchange="toggleTaskSelection('${t.id}')"><span class="task-subject-icon" style="background:${s?.color||'#e7eddc'}">${navIcon('subjects')}</span><div class="task-info"><button class="task-title task-open" onclick="taskForm('${t.id}')">${esc(t.title)}</button><div class="meta">${esc(s?.name||'Personal')}${t.priority==='High'?' · High priority':''}</div><div class="task-deadline">${pretty(t.due)}${t.dueTime?' · '+taskTimeLabel(t.dueTime):''}</div>${t.detail?`<div class="task-detail">${esc(t.detail)}</div>`:''}</div><div class="task-end"><span class="badge ${over?'overdue':''}">${label}</span><button class="task-edit" aria-label="Edit ${esc(t.title)}" onclick="taskForm('${t.id}')">›</button></div></div>`}
function filterNoteCards(query){let count=0;document.querySelectorAll('#content .note').forEach(card=>{const show=card.textContent.toLowerCase().includes(query.trim().toLowerCase());card.hidden=!show;if(show)count++});const hint=$('notes-no-results');if(hint)hint.hidden=count>0}

function render(){if(!pages[page])page='home';$('content').dataset.page=page;const navScroll=$('nav').scrollLeft;$('page-label').textContent=pages[page][1];$('nav').innerHTML=navigationItems().map(id=>{const [icon,label]=pages[id];const active=page===id||(id==='settings'&&!navigationItems().includes(page));return `<button class="${active?'active':''}" ${active?'aria-current="page"':''} onclick="go('${id}')"><span class="nav-icon" aria-hidden="true">${navIcon(id)}</span><span class="nav-label">${label}</span></button>`}).join('');$('nav').scrollLeft=navScroll;document.querySelector('.avatar').textContent=state.name.slice(0,1).toUpperCase();$('today').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});const open=state.tasks.filter(t=>!t.done),due=open.filter(t=>t.due===date()),done=state.tasks.filter(t=>t.done);let html='';
if(page==='home'){const now=new Date(),day=days[(now.getDay()+6)%7],classes=state.schedule.filter(s=>s.day===day).sort((a,b)=>a.start.localeCompare(b.start));html=heading('A fresh start, every day',`Hello, ${esc(state.name)}<span>.</span>`,'Let’s make it a productive day!',`<button class="primary" onclick="taskForm()">＋ Add assignment</button>`)+`<div class="stats">${[['Assignments left',open.length,'One step at a time','tasks','pending'],['Due today',due.length,'Keep your day on track','schedule','today'],['My subjects',state.subjects.length,'A world of things to learn','subjects','subjects'],['Completed',done.length,'Every win counts','home','completed']].map(([l,n,d,i,target])=>`<button type="button" class="stat" onclick="openSummary('${target}')" aria-label="View ${l.toLowerCase()}: ${n}"><span class="stat-label">${l}</span><span class="stat-icon" aria-hidden="true">${navIcon(i)}</span><strong>${n}</strong><small>${d}</small></button>`).join('')}</div><div class="grid"><div><div class="card"><div class="card-header"><h2>Up next</h2><button class="text-button" onclick="go('tasks')">All assignments ↗</button></div>${open.length?open.slice().sort(compareTaskDeadlines).slice(0,5).map(taskRow).join(''):empty('☑','A clear space to begin','Add your first assignment to plan ahead.')}<button class="text-button" onclick="taskForm()">＋ Add an assignment</button></div><div class="card"><div class="card-header"><h2>Your subjects</h2><button class="text-button" onclick="go('subjects')">Manage ↗</button></div>${state.subjects.length?state.subjects.slice(0,4).map(s=>`<div class="task"><span class="subject-dot" style="background:${s.color};margin:0">▤</span><div class="task-info"><div class="task-title">${esc(s.name)}</div><div class="meta">${open.filter(t=>t.subject===s.id).length} pending assignments</div></div></div>`).join(''):empty('▤','Make it your own','Add the subjects you’re taking this semester.')}</div></div><div><div class="banner"><div class="eyebrow">YOUR MOMENT OF FOCUS</div><h2>One thing at a time.<br>You can do this.</h2><p>Set aside ${state.focus} minutes, find your rhythm, and make something happen.</p><button class="primary" onclick="go('focus')">Start a focus session ↗</button><span class="art" aria-hidden="true">✧</span></div><div class="card"><div class="card-header"><h2>Today’s classes</h2><button class="text-button" onclick="go('schedule')">View calendar ↗</button></div><div class="eyebrow">${day}</div>${classes.length?classes.map(c=>`<div class="task"><div class="task-info"><div class="task-title">${esc(sub(c.subject)?.name||c.title)}</div><div class="meta">${c.start}–${c.end} · ${esc(c.room||'No room set')}</div></div></div>`).join(''):empty('☀','A little breathing room','No classes scheduled for today.')}</div></div></div>`}
if(page==='tasks'){const list=assignmentList();html=heading('ONE TASK AT A TIME','Assignments','Everything you need to do, in one calm place.',`<button class="primary" onclick="taskForm()">＋ Add assignment</button>`)+`<div class="filter">${[['all','All'],['open','Pending'],['today','Due today'],['done','Completed']].map(([k,l])=>`<button class="${filter===k?'selected':''}" onclick="filter='${k}';render()">${l}</button>`).join('')}</div><div class="assignment-sort"><label for="assignment-sort">Sort by deadline</label><select id="assignment-sort" onchange="taskSort=this.value;render()"><option value="earliest" ${taskSort==='earliest'?'selected':''}>Earliest first</option><option value="latest" ${taskSort==='latest'?'selected':''}>Latest first</option></select></div><div class="card">${list.length?list.map(taskRow).join(''):empty('☑','Nothing here yet','Add an assignment or choose another filter.')}</div>`}
if(page==='subjects')html=heading('YOUR SEMESTER','My subjects','A home for everything you’re learning.',`<button class="primary" onclick="subjectForm()">＋ Add subject</button>`)+`<div class="subject-grid">${state.subjects.map(s=>`<div class="subject-card" style="--subject-color:${s.color}"><div class="subject-dot" style="background:${s.color}">${navIcon('subjects')}</div><div class="subject-copy"><h2>${esc(s.name)}</h2><p>${esc(s.code||'No subject code')} · ${esc(s.teacher||'No instructor set')}</p><div class="meta">${open.filter(t=>t.subject===s.id).length} pending assignments</div><div class="card-actions"><button class="text-button" onclick="subjectForm('${s.id}')">Edit subject</button><button class="text-button delete" onclick="remove('subjects','${s.id}')">Delete</button></div></div></div>`).join('')}</div>`+(!state.subjects.length?`<div class="card">${empty('▤','Your semester starts here','Add your first subject using the button above.')}</div>`:'');
if(page==='notes')html=heading('MAKE ROOM FOR IDEAS','Notes','Save a thought, a lesson, or something worth remembering.',`<button class="primary" onclick="noteForm()">＋ New note</button>`)+`<div class="notes-toolbar"><label class="note-search" for="note-search">${navIcon('notes')}<input id="note-search" type="search" placeholder="Search notes…" oninput="filterNoteCards(this.value)"></label></div><p id="notes-no-results" class="subtitle" hidden>No matching notes.</p><div class="notes-grid">${state.notes.map((n,i)=>`<article class="note"><div class="note-heading"><span class="note-symbol" style="background:${['#e7eddc','#f4e7df','#e4edf3'][i%3]}">${navIcon('notes')}</span><div><h2>${esc(n.title)}</h2><div class="meta">${esc(sub(n.subject)?.name||'Personal')} · ${pretty(n.date)}</div></div></div><p>${esc(n.body)}</p><small>${pretty(n.date)}</small><div class="card-actions"><button class="text-button" onclick="noteForm('${n.id}')">Edit note</button><button class="text-button delete" onclick="remove('notes','${n.id}')">Delete</button></div></article>`).join('')}</div>`+(!state.notes.length?`<div class="card">${empty('✎','A blank page, full of possibilities','Create a note to keep your ideas together.')}</div>`:'');
if(page==='schedule'){const selected=new Date(selectedCalendarDate+'T12:00:00'),selectedDay=scheduleDay(selected),classes=state.schedule.filter(c=>c.day===selectedDay).sort((a,b)=>a.start.localeCompare(b.start));html=heading('PLAN YOUR WEEK','Schedule','View your weekly classes on a calendar and add a schedule.',`<div class="schedule-heading-actions"><button type="button" class="secondary" onclick="openScheduleImport()">↥ Import schedule</button><button class="primary" onclick="scheduleForm('', '${selectedDay}')">＋ Add schedule</button></div>`)+calendarMarkup()+`<section class="card calendar-agenda"><div class="card-header"><div><div class="eyebrow">${selectedDay.toUpperCase()}</div><h2>${selected.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</h2></div><button class="secondary" onclick="scheduleForm('', '${selectedDay}')">＋ Add schedule</button></div>${classes.length?classes.map(c=>`<article class="calendar-agenda-item"><time>${c.start}<span>${c.end}</span></time><div class="calendar-agenda-info"><strong>${esc(c.title)}</strong><span>${esc(sub(c.subject)?.name||'Personal')} · ${esc(c.room||'No room set')}</span></div><div class="calendar-agenda-actions"><button class="text-button" onclick="scheduleForm('${c.id}')">Edit</button><button class="text-button delete" onclick="remove('schedule','${c.id}')">Delete</button></div></article>`).join(''):empty('▦','No classes on this day','Add a schedule to this weekday to see it here every week.')}</section>`}
if(page==='focus')html=heading('QUIET THE NOISE','Focus','A little dedicated time can make a big difference.')+`<div class="focus-layout"><div class="card timer"><div class="filter timer-modes"><button class="${timerMode==='focus'?'selected':''}" onclick="setMode('focus')">Focus · ${state.focus} min</button><button class="${timerMode==='break'?'selected':''}" onclick="setMode('break')">Break · ${state.break} min</button></div><div class="focus-garden" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="timer-ring"><span class="timer-leaf" aria-hidden="true">${navIcon('subjects')}</span><div class="timer-display" id="clock">${clock()}</div><span class="ring-label">${timerMode==='focus'?'One task at a time':'Take a little break'}</span></div><div class="timer-caption" id="timer-caption">${interval?'Your session is in progress.':'Take a breath. Start when you’re ready.'}</div><div class="timer-actions"><button id="timer-button" class="primary" onclick="toggleTimer()">${interval?'Pause':'Start focus'}</button><button class="secondary" onclick="resetTimer()">Reset</button></div><div class="meta" style="justify-content:center;margin-top:35px">${state.sessions} focus sessions completed</div></div><p class="subtitle" style="text-align:center">Put your phone aside. Choose one task. Give it your attention.</p></div>`;
if(page==='settings')html=heading('JUST THE WAY YOU LIKE IT','Settings','Personalize your study space and keep a copy of your work.')+`<div class="settings-profile"><span class="profile-initial">${esc(state.name.slice(0,2).toUpperCase())}</span><div><h2>${esc(state.name)}</h2><p>Your student workspace</p></div><button class="text-button" aria-label="Edit profile" onclick="document.getElementById('username').focus()">›</button></div>${settingsTools()}<div class="settings-grid">${navigationSettings()}<div class="card"><h2>Profile & focus</h2><form onsubmit="settingsSave(event)"><label for="username">Your name</label><input id="username" name="name" value="${esc(state.name)}" required maxlength="40"><div class="row"><div><label for="focus-min">Focus minutes</label><input id="focus-min" name="focus" type="number" min="1" max="180" value="${state.focus}" required></div><div><label for="break-min">Break minutes</label><input id="break-min" name="break" type="number" min="1" max="60" value="${state.break}" required></div></div><button class="primary" style="margin-top:22px">Save preferences</button></form></div><div class="card"><h2>Your data</h2><p class="subtitle">Sign in for cloud saving, or use this browser without an account. Check the cloud status before closing. Export a backup anytime.</p><div class="card-actions"><button class="secondary" onclick="exportData()">Export backup</button><button class="secondary" onclick="$('import-file').click()">Import backup</button></div><input type="file" id="import-file" accept="application/json,.json" hidden onchange="importData(this)"><div class="tutorial-replay"><h2>Need a quick walkthrough?</h2><p class="subtitle">Explore each feature again, at your own pace.</p><button type="button" class="secondary" onclick="startTutorial()">↗ Replay tutorial</button></div><p class="subtitle" style="font-size:12px;margin-top:24px">StudentMate · Your everyday study companion.</p></div></div>`;
$('content').innerHTML=html+'<section id="task-selection-bar" aria-label="Selected assignments" hidden></section>';refreshTaskSelection()}
function opts(value=''){return `<option value="">Personal / no subject</option>`+state.subjects.map(s=>`<option value="${s.id}" ${value===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
function input(name,label,value='',type='text',required=false){return `<label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='text'?'maxlength="140"':''}>`}
function subjectSelect(v){return `<label for="f-subject">Subject</label><select id="f-subject" name="subject">${opts(v)}</select>`}
function modal(title,fields,fn){$('modal-title').textContent=title;$('fields').innerHTML=fields;$('form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(fn(data)===false)return;$('modal').close();save();render();toast('Saved to your workspace')};$('modal').showModal()}
function taskForm(id){const t=state.tasks.find(t=>t.id===id)||{};modal(id?'Edit assignment':'Add assignment',input('title','Assignment title',t.title,'text',true)+subjectSelect(t.subject)+`<div class="row"><div>${input('due','Due date',t.due,'date')}</div><div>${input('dueTime','Due time (optional)',t.dueTime,'time')}</div></div>`+`<label for="f-priority">Priority</label><select id="f-priority" name="priority">${['Normal','High','Low'].map(p=>`<option ${p===t.priority?'selected':''}>${p}</option>`).join('')}</select>`+`<label for="f-detail">Details</label><textarea id="f-detail" name="detail" maxlength="10000">${esc(t.detail)}</textarea>`+(id?`<button type="button" class="text-button delete" onclick="remove('tasks','${id}')">Delete assignment</button>`:''),d=>{if(!d.title.trim())return false;if(d.dueTime&&!d.due){toast('Choose a due date before adding a time.');return false}const val={...t,...d,title:d.title.trim(),id:id||uid(),done:t.done||false};if(id)Object.assign(t,val);else state.tasks.push(val)})}
function subjectForm(id){const s=sub(id)||{};modal(id?'Edit subject':'Add subject',input('name','Subject name',s.name,'text',true)+input('code','Subject code',s.code)+input('teacher','Instructor',s.teacher)+`<label for="f-color">Card color</label><select id="f-color" name="color">${[['#e7eddc','Sage'],['#eee8f1','Lavender'],['#f4e7df','Peach'],['#e4edf3','Sky']].map(([v,l])=>`<option value="${v}" ${s.color===v?'selected':''}>${l}</option>`).join('')}</select>`,d=>{if(!d.name.trim())return false;d.name=d.name.trim();if(id)Object.assign(s,d);else state.subjects.push({...d,id:uid()})})}
function noteForm(id){const n=state.notes.find(n=>n.id===id)||{};modal(id?'Edit note':'New note',input('title','Note title',n.title,'text',true)+subjectSelect(n.subject)+`<label for="f-body">Your note</label><textarea id="f-body" name="body" required maxlength="50000">${esc(n.body)}</textarea>`,d=>{if(!d.title.trim()||!d.body.trim())return false;const val={...d,id:id||uid(),date:date()};if(id)Object.assign(n,val);else state.notes.unshift(val)})}
function scheduleForm(id,dayPreset=''){const c=state.schedule.find(c=>c.id===id)||{},chosenDay=c.day||dayPreset||scheduleDay(new Date());modal(id?'Edit class':'Add schedule',input('title','Schedule title',c.title,'text',true)+subjectSelect(c.subject)+`<label for="f-day">Day</label><select id="f-day" name="day">${days.map(d=>`<option ${d===chosenDay?'selected':''}>${d}</option>`).join('')}</select><div class="row"><div>${input('start','Start time',c.start||'08:00','time',true)}</div><div>${input('end','End time',c.end||'09:00','time',true)}</div></div>`+input('room','Room / location',c.room),d=>{if(d.end<=d.start){toast('End time must be after start time');return false}if(!d.title.trim())return false;if(id)Object.assign(c,d);else state.schedule.push({...d,id:uid()})})}
function toggleTaskSelection(id){if(!state.tasks.some(t=>t.id===id))return;if(selectedTaskIds.has(id))selectedTaskIds.delete(id);else selectedTaskIds.add(id);refreshTaskSelection()}
function refreshTaskSelection(){
 const tasks=state.tasks.filter(t=>selectedTaskIds.has(t.id));for(const id of selectedTaskIds)if(!tasks.some(t=>t.id===id))selectedTaskIds.delete(id);
 const bar=$('task-selection-bar');if(!bar)return;bar.hidden=!tasks.length;
 const pending=tasks.filter(t=>!t.done).length,completed=tasks.length-pending;
 bar.innerHTML=tasks.length?`<div class="task-selection-copy"><strong aria-live="polite">${tasks.length} selected</strong><span>Choose an action when you’re ready.</span></div><div class="task-selection-actions">${pending?`<button class="primary" type="button" onclick="applyTaskSelection(true)">Add to Completed (${pending})</button>`:''}${completed?`<button class="secondary" type="button" onclick="applyTaskSelection(false)">Move to Pending (${completed})</button>`:''}<button class="text-button" type="button" onclick="clearTaskSelection()">Cancel selection</button></div>`:'';
 document.querySelectorAll('#content input[data-task-id]').forEach(input=>{input.checked=selectedTaskIds.has(input.dataset.taskId)});
}
function clearTaskSelection(){selectedTaskIds.clear();refreshTaskSelection()}
function applyTaskSelection(done){const tasks=state.tasks.filter(t=>selectedTaskIds.has(t.id)&&t.done!==done);if(!tasks.length)return;tasks.forEach(t=>t.done=done);if(save()===false){tasks.forEach(t=>t.done=!done);return}tasks.forEach(t=>selectedTaskIds.delete(t.id));render();toast(`${tasks.length} ${tasks.length===1?'assignment':'assignments'} moved to ${done?'Completed':'Pending'}`)}

function remove(kind,id){if(!confirm('Delete this '+({subjects:'subject (linked records will become Personal)',tasks:'assignment',notes:'note',schedule:'class'}[kind])+'?'))return;state[kind]=state[kind].filter(x=>x.id!==id);if(kind==='subjects'){for(const k of ['tasks','notes','schedule'])state[k].forEach(x=>{if(x.subject===id)x.subject=''})}save();$('modal').close();render();toast('Deleted')}
function clock(){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function refreshClock(){if($('clock'))$('clock').textContent=clock()}
function setMode(mode){timerMode=mode;resetTimer()}
function resetTimer(){clearInterval(interval);interval=null;seconds=state[timerMode==='focus'?'focus':'break']*60;render()}
function toggleTimer(){if(interval){seconds=Math.max(0,Math.ceil((endTime-Date.now())/1000));clearInterval(interval);interval=null;render();return}endTime=Date.now()+seconds*1000;interval=setInterval(()=>{seconds=Math.max(0,Math.ceil((endTime-Date.now())/1000));refreshClock();if(!seconds){clearInterval(interval);interval=null;if(timerMode==='focus'){state.sessions++;save()}toast(timerMode==='focus'?'Focus session complete. Take a break!':'Break complete. Ready for another session?');seconds=state[timerMode==='focus'?'focus':'break']*60;render()}},250);render()}
function profile(){go('settings')}
function settingsSave(e){e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!d.name.trim())return;state.name=d.name.trim();state.focus=Number(d.focus);state.break=Number(d.break);save();resetTimer();toast('Preferences saved')}
function exportData(){const blob=new Blob([JSON.stringify({format:'studentmate',version:1,data:state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='studentmate-backup-'+date()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported')}
function validData(d){const str=x=>typeof x==='string';return d&&(d.navItems===undefined||validNavigation(d.navItems))&&str(d.name)&&d.name.length<=40&&Number.isInteger(d.focus)&&d.focus>=1&&d.focus<=180&&Number.isInteger(d.break)&&d.break>=1&&d.break<=60&&Number.isInteger(d.sessions)&&d.sessions>=0&&['subjects','tasks','notes','schedule'].every(k=>Array.isArray(d[k])&&d[k].length<=10000&&d[k].every(x=>x&&str(x.id)))&&d.subjects.every(x=>str(x.name)&&/^#[a-fA-F0-9]{6}$/.test(x.color))&&d.tasks.every(x=>str(x.title)&&str(x.subject)&&str(x.due)&&(!x.due||/^\d{4}-\d{2}-\d{2}$/.test(x.due))&&(x.dueTime===undefined||str(x.dueTime)&&(!x.dueTime||!!x.due&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.dueTime)))&&typeof x.done==='boolean'&&['Normal','High','Low'].includes(x.priority))&&d.notes.every(x=>str(x.title)&&str(x.body)&&str(x.date)&&str(x.subject))&&d.schedule.every(x=>str(x.title)&&str(x.subject)&&days.includes(x.day)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.end)&&x.start<x.end)}
async function importData(input){try{const file=input.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error();const x=JSON.parse(await file.text());if(x.format!=='studentmate'||x.version!==1||!validData(x.data))throw Error();if(!confirm('Replace your current workspace with this backup?'))return;state=x.data;save();resetTimer();toast('Backup restored')}catch{toast('Please choose a valid StudentMate backup')}finally{input.value=''}}
window.addEventListener('hashchange',()=>{page=location.hash.slice(1)||'home';render()});page=location.hash.slice(1)||'home';render();setTimeout(()=>{$('splash').classList.add('hide')},2750);setTimeout(()=>{$('splash').remove();document.dispatchEvent(new Event('studentmate:splash-ready'))},3000);

const TUTORIAL_KEY='studentmate.tutorial.v2';let tutorialStep=0;
const tutorialSteps=[
  {
    "id": "welcome",
    "group": "Getting started",
    "icon": "✦",
    "label": "WELCOME TO STUDENTMATE",
    "title": "Your school day, made simpler.",
    "description": "Learn what each feature does and the buttons to use. This guide includes document uploads, gallery photos and live schedule capture.",
    "tips": [
      "Use Next and Back to read in order, or choose Guide topics to jump to a feature.",
      "Skip tutorial opens your dashboard. You can return using Settings → Replay tutorial.",
      "The guide uses examples only. Reading it does not create assignments, subjects or classes."
    ],
    "preview": "Choose a topic · Learn the steps · Start when you’re ready"
  },
  {
    "id": "account",
    "group": "Getting started",
    "icon": "☁",
    "label": "ACCOUNT & SIGN-IN",
    "title": "Start with your account.",
    "description": "Sign in to open your student workspace. Your account keeps your saved school records separate from other accounts.",
    "path": "Sign-in screen → Create account or Sign in",
    "tips": [
      "Choose Create account, enter your name and email, then create an 8–128 character password with an uppercase letter, a number and a special character.",
      "Already registered? Choose Sign in and enter your email and password. Wait for your workspace to load.",
      "You may need to sign in again in a new browser session. Password recovery is not available yet, so keep your password safely.",
      "The updated tutorial appears after sign-in when you have not finished or skipped this version of the guide."
    ],
    "preview": "Create account → Sign in → Your workspace"
  },
  {
    "id": "navigation",
    "group": "Getting started",
    "icon": "☰",
    "label": "NAVIGATION & SHORTCUTS",
    "title": "Find every study tool.",
    "description": "Overview and Settings stay on your navigation bar. You can choose three shortcuts for the other features.",
    "path": "Settings → Study tools / Customize navigation",
    "tips": [
      "Tap Overview to return to your dashboard. Tap Settings or your profile icon to open preferences and account tools.",
      "Under Study tools, open Assignments, Subjects, Schedule, Notes or Focus—even when that tool is missing from the navigation bar.",
      "Under Customize navigation, choose three different features, then tap Save navigation. Reset default restores Assignments, Subjects and Schedule.",
      "On a narrow screen, swipe the navigation bar horizontally if its buttons do not all fit."
    ],
    "preview": "Overview · Three shortcuts · Settings"
  },
  {
    "id": "overview",
    "group": "Your workspace",
    "icon": "◫",
    "label": "OVERVIEW",
    "title": "See what needs your attention.",
    "description": "Your dashboard brings assignments, subjects, focus and today’s classes together.",
    "path": "Overview",
    "tips": [
      "Assignments left counts pending work; Due today counts assignments due today. Tap either card to open its assignment list.",
      "My subjects opens your subjects; Completed opens finished assignments.",
      "Up next lists pending assignments by deadline. Tap a title to edit, or Add assignment to create a task.",
      "Your subjects → Manage opens Subjects. Today’s classes → View calendar opens Schedule. Start a focus session opens Focus."
    ],
    "preview": "Assignments left · Due today · My subjects · Completed"
  },
  {
    "id": "subjects",
    "group": "Your workspace",
    "icon": "▤",
    "label": "SUBJECTS",
    "title": "Organize your semester.",
    "description": "Create subjects so you can link assignments, notes and classes to the course they belong to.",
    "path": "Subjects → Add subject",
    "tips": [
      "Enter the subject name. Add an optional subject code and instructor, choose a card color, then tap Save.",
      "A subject card shows its pending assignment count. Edit subject lets you change its details.",
      "Delete asks you to confirm. Linked assignments, notes and classes stay in your workspace, with their subject link removed.",
      "Choose the subject in assignment, note and schedule forms. In an import preview, use Link to subject to connect a detected class."
    ],
    "preview": "Mathematics · MATH 101 · Your instructor"
  },
  {
    "id": "assignments",
    "group": "Your workspace",
    "icon": "☑",
    "label": "ASSIGNMENTS",
    "title": "Record your work and deadlines.",
    "description": "Keep homework, projects and other tasks in one list, with dates, times and priorities.",
    "path": "Assignments → Add assignment",
    "tips": [
      "Enter a title, choose an optional subject, set priority and add details. You can leave the deadline empty.",
      "Choose a due date before adding an optional due time. Tap Save when finished.",
      "Use Pending, Due today and Completed to change the list. All shows work that is not completed; finished tasks are under Completed.",
      "Sort by deadline switches between Earliest first and Latest first. Tap a title or edit arrow to change or delete an assignment. Overdue means its deadline has passed."
    ],
    "preview": "Finish exercises · Tomorrow, 4:00 PM · High priority"
  },
  {
    "id": "completion",
    "group": "Your workspace",
    "icon": "✓",
    "label": "COMPLETE MULTIPLE ASSIGNMENTS",
    "title": "Select first, then choose an action.",
    "description": "Checkboxes select assignments. Checking a box alone does not mark the assignment completed.",
    "path": "Assignments or Overview → Assignment checkboxes",
    "tips": [
      "Select one or more assignments. The selection bar shows how many you selected.",
      "Tap Add to Completed to finish selected pending assignments.",
      "Open Completed, select finished assignments, then tap Move to Pending to reopen them.",
      "Cancel selection clears the checkboxes without changing the assignments. For deletion, open an assignment and use Delete assignment."
    ],
    "preview": "Select tasks → Add to Completed → Completed list"
  },
  {
    "id": "notes",
    "group": "Your workspace",
    "icon": "▧",
    "label": "NOTES & SEARCH",
    "title": "Keep lessons and ideas together.",
    "description": "Write class notes, reminders or personal thoughts, and find them again with search.",
    "path": "Notes, or Settings → Study tools → Notes",
    "tips": [
      "Tap New note, enter a title and note text, and choose an optional subject. Tap Save.",
      "Search notes filters visible cards as you type. Clear the search to see all notes again.",
      "Use Edit note to change a note. Its saved date updates when you save your edits.",
      "Delete asks for confirmation. Longer note text can scroll within its card."
    ],
    "preview": "Biology review → Search notes → Edit note"
  },
  {
    "id": "calendar",
    "group": "Schedule & imports",
    "icon": "▦",
    "label": "CALENDAR & MANUAL SCHEDULE",
    "title": "Build your weekly timetable.",
    "description": "The monthly calendar displays classes that repeat on the same weekday every week.",
    "path": "Schedule → Calendar / Add schedule",
    "tips": [
      "Choose a calendar date to see that weekday’s classes. Use the month arrows to browse and Today to return to the current date.",
      "Tap Add schedule. Enter a title, optional subject, weekday, start/end times and room, then Save. End time must be later than start time.",
      "The form starts with the selected weekday. Saved classes appear on each matching weekday and in Today’s classes on your dashboard.",
      "Use Edit or Delete beside a class to change or remove it. For a schedule you already have in a file or photo, choose Import schedule."
    ],
    "preview": "Monday · 08:00–09:00 · Mathematics · Room 201"
  },
  {
    "id": "import-start",
    "group": "Schedule & imports",
    "icon": "↥",
    "label": "UPLOAD SCHEDULE: WHERE TO START",
    "title": "Bring an existing schedule into the app.",
    "description": "Import schedule reads a document or image, then gives you an editable preview before adding classes.",
    "path": "Schedule → Import schedule",
    "tips": [
      "If Schedule is missing from your navigation bar, open Settings → Study tools → Schedule.",
      "Tap Import schedule beside Add schedule at the top of the page.",
      "Choose Import file for PDF/Word, Choose from gallery for an image, or Take photo for live camera capture.",
      "Reading a file does not save it as classes yet. Review the detected entries, check the review box and tap Import classes."
    ],
    "preview": "Import file / Choose from gallery / Take photo → Preview → Import classes"
  },
  {
    "id": "import-documents",
    "group": "Schedule & imports",
    "icon": "▤",
    "label": "UPLOAD SCHEDULE: PDF & WORD",
    "title": "Import a PDF or Word schedule.",
    "description": "Use a text-based PDF or Word .docx file containing your class names, weekdays and times.",
    "path": "Schedule → Import schedule → Import file",
    "tips": [
      "Choose your .pdf or .docx file, up to 15 MB. PDFs may have up to 60 pages. Save older Word .doc files as .docx first. Unlock password-protected PDFs before uploading.",
      "Wait for reading to finish. The app supports common row tables, weekday timetables and text layouts, but unusual layouts may need edits.",
      "The preview shows detected subjects/classes, days, start/end times and rooms. MWF expands to Monday, Wednesday and Friday; TTh expands to Tuesday and Thursday.",
      "Compare the preview with the original file. A scanned PDF may have no readable text: use a JPG/PNG screenshot through Choose from gallery, paste schedule text, or add rows manually."
    ],
    "preview": "Upload .pdf / .docx → Read document → Review detected classes"
  },
  {
    "id": "import-gallery",
    "group": "Schedule & imports",
    "icon": "▧",
    "label": "UPLOAD SCHEDULE: GALLERY IMAGE",
    "title": "Read a saved photo or screenshot.",
    "description": "Choose a clear image of your printed schedule so the app can read its text on your device.",
    "path": "Schedule → Import schedule → Choose from gallery",
    "tips": [
      "Select a JPG/JPEG, PNG or WebP image, up to 15 MB. Convert HEIC to JPG/PNG or take a screenshot first.",
      "Check the image preview. Use Rotate until the text is upright. Remove photo clears the image; choosing another gallery image replaces it.",
      "Tap Read schedule and wait for progress to finish. Connect to the internet for the first scan while the photo reader loads.",
      "Review the detected entries against the image. Blurry text, small letters, handwriting and unusual layouts may need corrections or a clearer photo."
    ],
    "preview": "Choose from gallery → Rotate if needed → Read schedule → Preview"
  },
  {
    "id": "import-camera",
    "group": "Schedule & imports",
    "icon": "◎",
    "label": "UPLOAD SCHEDULE: LIVE CAPTURE",
    "title": "Take a photo of your schedule.",
    "description": "Live capture opens your camera so you can photograph the schedule without selecting a saved image.",
    "path": "Schedule → Import schedule → Take photo",
    "tips": [
      "Tap Take photo and allow camera access when prompted. The app requests video only; it does not need microphone access.",
      "Keep the full schedule in view, use good light and hold the camera straight. Wait for the live preview, then tap Capture photo.",
      "Check the photo. Retake opens the camera again; Rotate turns the image; Close camera ends a live preview. Tap Read schedule when the photo is clear.",
      "Live capture in Android requires the updated APK with camera support. If access fails, allow camera permission in app/browser settings, install the updated APK, or use Choose from gallery. Camera access stops when you close the preview or leave the visible app."
    ],
    "preview": "Take photo → Allow camera → Capture photo → Read schedule"
  },
  {
    "id": "import-review",
    "group": "Schedule & imports",
    "icon": "✎",
    "label": "UPLOAD SCHEDULE: REVIEW & EDIT",
    "title": "Check each class before saving.",
    "description": "The preview is editable. Correct the detected schedule before it reaches your calendar.",
    "path": "Import schedule → Preview & edit",
    "tips": [
      "For each selected row, check Subject / class title, Weekday, Start time, End time and Room / location. Pay close attention to AM/PM.",
      "Use Link to subject to connect a class to an existing subject, or leave No linked subject. Importing a title does not create a new subject card.",
      "Uncheck a row to leave it out. Remove deletes it from the preview; Add row lets you enter a class that was not detected.",
      "Original text shows where a row came from. Read the summary of classes ready to add before ticking I checked the selected classes, weekdays, AM/PM and any overlaps."
    ],
    "preview": "Check title + day + time → Choose rows → Check review box"
  },
  {
    "id": "import-checks",
    "group": "Schedule & imports",
    "icon": "✓",
    "label": "UPLOAD SCHEDULE: IMPORT & FIX ISSUES",
    "title": "Finish the import with confidence.",
    "description": "Import checks help you avoid duplicate classes and spot incorrect times.",
    "path": "Import schedule → Summary / Import classes",
    "tips": [
      "A selected row needs a title, weekday and valid start/end times. End must be later than start; correct invalid rows or uncheck them before importing.",
      "Exact duplicate entries are skipped. Overlaps are highlighted: compare the classes and correct the day or time if needed. You may keep a real overlap after reviewing it.",
      "View or paste schedule text lets you edit extracted text or paste a class per line, then choose Read this text. Re-reading replaces the unsaved preview, so preserve any edits you need first.",
      "Check the review box and tap Import classes. Existing classes remain; added classes appear by weekday and time. If signed in, check Saved to cloud. Cancel or × closes an unsaved import."
    ],
    "preview": "Fix missing fields → Review overlaps → Import classes → Calendar"
  },
  {
    "id": "focus",
    "group": "Preferences & study tools",
    "icon": "◷",
    "label": "FOCUS TIMER",
    "title": "Study one task at a time.",
    "description": "Use a Focus countdown for studying and a Break countdown for resting.",
    "path": "Focus, or Settings → Study tools → Focus",
    "tips": [
      "Choose Focus or Break, then tap Start focus. The button becomes Pause while the countdown runs.",
      "Pause keeps the remaining time so you can resume. Reset restores the full duration for the selected mode.",
      "Switching Focus/Break resets the countdown. Finishing a Focus session increases your completed-session count; a Break does not.",
      "Change the durations in Settings → Profile & focus. Keep the app open for the timer; background notifications are not provided."
    ],
    "preview": "Choose mode → Start focus → Pause / Reset"
  },
  {
    "id": "preferences",
    "group": "Preferences & study tools",
    "icon": "⚙",
    "label": "PROFILE & PREFERENCES",
    "title": "Set up your study space.",
    "description": "Personalize your name, study durations and navigation shortcuts from Settings.",
    "path": "Settings → Profile & focus",
    "tips": [
      "Tap Settings or your profile icon. Enter Your name and choose Focus minutes and Break minutes.",
      "Focus can be 1–180 minutes; Break can be 1–60 minutes. Tap Save preferences. Saving resets the timer.",
      "Use Study tools to open every student feature. Use Customize navigation to change your three shortcuts.",
      "Replay tutorial opens this guide again. Guide topics lets you go straight to schedule uploads or another feature."
    ],
    "preview": "Your name → Timer lengths → Save preferences"
  },
  {
    "id": "cloud",
    "group": "Account & backups",
    "icon": "☁",
    "label": "CLOUD SAVE & ACCOUNT TOOLS",
    "title": "Keep track of your saved changes.",
    "description": "Account changes are saved to the cloud. Watch the save status before closing or switching devices.",
    "path": "Header save status / Settings → Your account",
    "tips": [
      "Changes waiting to save and Saving to cloud mean work is still pending. Saved to cloud confirms the save finished.",
      "Retry save retries pending work. If a confirmation appears, choose Save to cloud. Reconnect if the app cannot reach the server.",
      "Load cloud copy replaces the current account workspace with its latest saved cloud copy, discarding unsaved changes. Export a backup first if you need to keep them.",
      "Copy browser records transfers older browser records into your account after confirmation and replaces that account workspace. When another device has changed records, keep a backup of your unsaved work before loading the cloud copy."
    ],
    "preview": "Make changes → Saving to cloud → Saved to cloud"
  },
  {
    "id": "backups",
    "group": "Account & backups",
    "icon": "⇩",
    "label": "EXPORT & RESTORE BACKUPS",
    "title": "Keep a copy of your workspace.",
    "description": "A StudentMate backup is a JSON file containing your subjects, assignments, notes, schedule and preferences.",
    "path": "Settings → Your data",
    "tips": [
      "Tap Export backup to download a JSON copy. In the Android app, choose where to save it when prompted.",
      "Tap Import backup and choose a valid StudentMate JSON backup. Confirm only if you want it to replace the current workspace.",
      "Schedule PDFs, Word documents and images belong in Schedule → Import schedule; they are not workspace backup files.",
      "After restoring a backup in a signed-in account, check the cloud save status. Keep important backup copies somewhere you can access later."
    ],
    "preview": "Export backup → Keep JSON copy → Import backup when needed"
  },
  {
    "id": "installation",
    "group": "Account & backups",
    "icon": "⇣",
    "label": "INSTALLATION & UPDATES",
    "title": "Keep StudentMate within reach.",
    "description": "Open StudentMate in the browser, install the Android APK, or use a home-screen web app where supported.",
    "path": "Download page / Settings → StudentMate app",
    "tips": [
      "The main website link shows the download page. Open web app opens your workspace; Download APK (Free) downloads the Android testing app. Open StudentMate.apk from your downloads, choose Install and follow your phone’s prompts.",
      "In Settings, Install StudentMate starts browser installation when available. How to install StudentMate explains Chrome or Safari home-screen steps. Installed on this device means you already opened an installed app.",
      "When a new web version is ready, tap Update now. Save or close forms, finish pending saves and pause the focus timer first.",
      "Web updates refresh app features. Native changes such as Android camera permission need a newly downloaded APK. The iPhone & iPad native app is Coming Soon; the web app is available."
    ],
    "preview": "Open web app / Download APK → Install → Update now"
  },
  {
    "id": "sign-out",
    "group": "Account & backups",
    "icon": "↗",
    "label": "SIGN OUT",
    "title": "Leave your account safely.",
    "description": "Sign out ends the current session and returns you to the sign-in screen.",
    "path": "Settings → Your account → Sign out",
    "tips": [
      "Wait for Saved to cloud before signing out. Export a backup if you have unsaved work you need to keep.",
      "Tap Sign out to open the confirmation. Stay signed in closes it without ending the session.",
      "If unsaved work remains, the confirmation says Sign out and discard. Confirming discards that account’s pending local draft.",
      "After signing out, sign in again to access your saved account workspace. Other accounts do not receive your records."
    ],
    "preview": "Check save status → Sign out → Confirm → Sign-in screen"
  },
  {
    "id": "ready",
    "group": "Finish",
    "icon": "✧",
    "label": "YOU’RE READY",
    "title": "Make your first little step.",
    "description": "Add subjects, record assignments and build your schedule in the way that works for you.",
    "tips": [
      "Have your schedule ready? Use Schedule → Import schedule, then choose a document, gallery image or live photo.",
      "Review imported classes carefully before saving. Your calendar repeats them on their selected weekdays.",
      "Use Settings → Replay tutorial whenever you need help. Go to dashboard closes this guide."
    ],
    "preview": "Your subjects · Your deadlines · Your weekly schedule"
  }
];
const adminTutorialSteps=[
 {id:'admin-overview',group:'Administrator',icon:'◫',label:'ADMIN DASHBOARD',title:'Monitor account activity.',description:'Your administrator dashboard shows summary counts rather than private student work.',path:'Admin dashboard',tips:['Students counts registered student accounts. Assignments, Subjects and Notes count records across accounts.','Active sessions counts currently valid sessions.','Student accounts shows the latest 50 accounts, their email, creation date and record counts. It does not display private notes or assignment text.'],preview:'Students · Assignments · Subjects · Notes · Active sessions'},
 {id:'admin-refresh',group:'Administrator',icon:'↻',label:'REFRESH & REVIEW',title:'Load the latest summaries.',description:'Refresh updates the dashboard metrics and account list.',path:'Admin dashboard → Refresh',tips:['Tap Refresh and wait for the account summaries to load.','If an error appears, check your connection and retry. An account without administrator permission cannot load these summaries.','Replay tutorial opens this administrator guide again. Student schedule uploads are in the student workspace.'],preview:'Refresh → Account summaries'},
 {id:'admin-sign-out',group:'Administrator',icon:'↗',label:'ADMIN SIGN OUT',title:'Finish your admin session.',description:'Sign out returns you to the StudentMate sign-in screen.',path:'Admin dashboard → Sign out',tips:['Tap Sign out to open the confirmation.','Choose Stay signed in to cancel, or Sign out to end the session.','Go to dashboard closes this guide and returns to the administrator dashboard.'],preview:'Sign out → Confirm → Sign-in screen'}
];
let activeTutorialSteps=tutorialSteps;
function tutorialIsAdmin(){return typeof account!=='undefined'&&account?.user?.role==='admin'}
function tutorialStorageKey(){return TUTORIAL_KEY+(tutorialIsAdmin()?'.admin':'')}
function tutorialSeen(){try{return localStorage.getItem(tutorialStorageKey())==='seen'}catch{return false}}
function offerTutorial(){if(!tutorialSeen()&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('auth-required'))startTutorial()}
function startTutorial(){activeTutorialSteps=tutorialIsAdmin()?adminTutorialSteps:tutorialSteps;tutorialStep=0;drawTutorial();if(!$('tutorial').open)$('tutorial').showModal()}
function tutorialTopicOptions(){const groups=[...new Set(activeTutorialSteps.map(s=>s.group))];return groups.map(group=>`<optgroup label="${esc(group)}">${activeTutorialSteps.map((step,i)=>step.group===group?`<option value="${i}" ${i===tutorialStep?'selected':''}>${i+1}. ${esc(step.label)}</option>`:'').join('')}</optgroup>`).join('')}
function drawTutorial(){const step=activeTutorialSteps[tutorialStep],last=tutorialStep===activeTutorialSteps.length-1;$('tutorial').innerHTML=`<div class="tour-top"><span class="eyebrow">STUDENTMATE GUIDE</span><button type="button" class="text-button" onclick="finishTutorial()">Skip tutorial ↗</button></div><div class="tour-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax="${activeTutorialSteps.length}" aria-valuenow="${tutorialStep+1}">${activeTutorialSteps.map((_,i)=>`<span class="${i<=tutorialStep?'filled':''}"></span>`).join('')}</div><div class="tour-topics"><label for="tour-topic">Guide topics</label><select id="tour-topic" onchange="tutorialJump(this.value)">${tutorialTopicOptions()}</select></div><div class="tour-body"><div class="tour-icon" aria-hidden="true">${step.icon}</div><div class="eyebrow">${esc(step.label)}</div><h2 id="tutorial-title">${esc(step.title)}</h2><p id="tutorial-desc">${esc(step.description)}</p>${step.path?`<div class="tour-location"><strong>Where to find it</strong><span>${esc(step.path)}</span></div>`:''}<div class="tour-example"><span aria-hidden="true">✧</span>${esc(step.preview)}</div><ol class="tour-tips">${step.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div><div class="tour-bottom"><button type="button" class="secondary" onclick="tutorialMove(-1)" ${tutorialStep===0?'disabled':''}>← Back</button><span>${tutorialStep+1} / ${activeTutorialSteps.length}</span><button type="button" class="primary" onclick="${last?'finishTutorial()':'tutorialMove(1)'}">${last?'Go to dashboard ↗':'Next →'}</button></div>`}
function tutorialJump(value){const next=Number(value);if(!Number.isInteger(next)||next<0||next>=activeTutorialSteps.length)return;const direction=next>=tutorialStep?1:-1;tutorialStep=next;drawTutorial();const body=$('tutorial').querySelector('.tour-body');if(body){body.scrollTop=0;body.classList.add(direction>0?'tour-forward':'tour-backward')}$('tour-topic')?.focus({preventScroll:true})}
function tutorialMove(direction){tutorialJump(Math.max(0,Math.min(activeTutorialSteps.length-1,tutorialStep+direction)));$('tutorial').querySelector('.tour-bottom .primary')?.focus({preventScroll:true})}
function finishTutorial(){try{localStorage.setItem(tutorialStorageKey(),'seen')}catch{}$('tutorial').close();go('home')}
$('tutorial').addEventListener('cancel',e=>{e.preventDefault();finishTutorial()});
