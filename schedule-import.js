(function(){
'use strict';
const P=StudentMateScheduleParser,MAX_BYTES=15*1024*1024;
let generation=0,draft=null,libs={};
const dialog=document.createElement('dialog');dialog.id='schedule-import';dialog.setAttribute('aria-labelledby','schedule-import-title');document.body.append(dialog);
const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function owner(){return typeof account!=='undefined'&&account?account.user.id:'browser';}
function matchingSubject(title){const t=normal(title);return state.subjects.find(s=>normal(s.name)===t||normal(s.code)&&t.startsWith(normal(s.code)))?.id||'';}
function close(){generation++;draft=null;dialog.close();}
function status(message,error=false){const el=dialog.querySelector('#schedule-import-status');if(el){el.textContent=message;el.classList.toggle('import-error',error);}}
function makeRow(data={}){return {id:uid(),selected:true,title:'',day:'',start:'',end:'',room:'',subject:'',source:'',warning:'',...data,subject:data.subject||matchingSubject(data.title)};}
function open(){
 if(dialog.open)return;
 draft={rows:[],owner:owner(),state,raw:'',warnings:[],reading:false};
 dialog.innerHTML=`<div class="import-heading"><div><div class="eyebrow">BRING YOUR CLASSES TOGETHER</div><h2 id="schedule-import-title">Import schedule</h2></div><button type="button" class="close" id="schedule-import-close" aria-label="Close schedule import">×</button></div><div class="import-body"><label class="import-upload" for="schedule-upload"><strong>Upload your class schedule</strong><span>PDF or Word (.docx) · Up to 15 MB</span><input type="file" id="schedule-upload" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label><p id="schedule-import-status" role="status" aria-live="polite">Choose a file. Review the detected classes before importing.</p><p class="import-hint">Files are read on this device. Different table and text layouts are supported. Compare the preview with your original file for missing or misread classes. Scans and unclear layouts may need manual entry. Older .doc files: save as .docx first.</p><div class="import-preview-heading"><h3>Preview &amp; edit <span id="import-count">0</span></h3><button type="button" class="secondary" id="import-add">＋ Add row</button></div><div id="import-warnings" role="status"></div><div id="import-rows"></div><details class="import-source"><summary>View or paste schedule text</summary><p>Edit the extracted text and try again. Use one class per line, for example: Mathematics | Monday | 8:00 AM - 9:00 AM | Room 201.</p><textarea id="import-raw" maxlength="200000" aria-label="Extracted schedule text" placeholder="Paste schedule text here…"></textarea><button type="button" class="secondary" id="import-reparse">Read this text</button></details></div><form id="import-confirm-form" class="import-bottom"><label class="import-review"><input type="checkbox" id="import-reviewed" required><span>I checked the selected classes, weekdays, AM/PM and any overlaps.</span></label><p id="import-summary" aria-live="polite">No classes selected.</p><div class="import-actions"><button type="button" class="secondary" id="import-cancel">Cancel</button><button type="submit" class="primary" id="import-save" disabled>Import classes</button></div></form>`;
 dialog.querySelector('#schedule-import-close').onclick=close;dialog.querySelector('#import-cancel').onclick=close;
 dialog.querySelector('#schedule-upload').onchange=e=>readFile(e.target.files[0]);
 dialog.querySelector('#import-add').onclick=()=>{draft.rows.push(makeRow());drawRows();dialog.querySelector('#import-rows').lastElementChild?.scrollIntoView({block:'nearest'});};
 dialog.querySelector('#import-reparse').onclick=()=>{if(draft.reading)return;const raw=dialog.querySelector('#import-raw').value;if(raw.length>200000){status('This text is too long. Import a smaller section.',true);return;}loadParsed(P.parse({lines:raw.split(/\n/)}),raw);status('Text read. Check every selected class before importing.');};
 dialog.querySelector('#import-confirm-form').onsubmit=commit;
 dialog.querySelector('#import-rows').addEventListener('input',edit);dialog.querySelector('#import-rows').addEventListener('change',edit);
 dialog.querySelector('#import-rows').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(button){draft.rows=draft.rows.filter(r=>r.id!==button.dataset.remove);drawRows();}});
 drawRows();dialog.showModal();
}
function rowMarkup(row,index){return `<article class="import-row" data-id="${row.id}"><div class="import-row-top"><label><input type="checkbox" data-field="selected" ${row.selected?'checked':''}> Class ${index+1}</label><button type="button" class="text-button delete" data-remove="${row.id}" aria-label="Remove class ${index+1}">Remove</button></div><div class="import-fields"><label class="import-wide">Subject / class title<input data-field="title" value="${esc(row.title)}" maxlength="140" placeholder="e.g. Mathematics"></label><label>Weekday<select data-field="day"><option value="">Choose day</option>${days.map(d=>`<option ${row.day===d?'selected':''}>${d}</option>`).join('')}</select></label><label>Link to subject<select data-field="subject"><option value="">No linked subject</option>${state.subjects.map(s=>`<option value="${esc(s.id)}" ${row.subject===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Start time<input type="time" data-field="start" value="${esc(row.start)}"></label><label>End time<input type="time" data-field="end" value="${esc(row.end)}"></label><label class="import-wide">Room / location<input data-field="room" value="${esc(row.room)}" maxlength="140" placeholder="Optional"></label></div>${row.warning?`<p class="import-row-note">${esc(row.warning)}</p>`:''}<p class="import-row-feedback" aria-live="polite"></p>${row.source?`<details class="import-row-source"><summary>Original text</summary><p>${esc(row.source)}</p></details>`:''}</article>`;}
function edit(e){const field=e.target.dataset.field;if(!field||!draft)return;const row=draft.rows.find(r=>r.id===e.target.closest('[data-id]').dataset.id);if(!row)return;row[field]=field==='selected'?e.target.checked:e.target.value;dialog.querySelector('#import-reviewed').checked=false;updateSummary();}
function valid(row){return row.title.trim()&&row.title.trim().length<=140&&days.includes(row.day)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end)&&row.end>row.start&&row.room.length<=140&&(!row.subject||state.subjects.some(s=>s.id===row.subject));}
function titleKey(row){return normal(sub(row.subject)?.name||row.title);}
function duplicate(a,b){return a.day===b.day&&a.start===b.start&&a.end===b.end&&titleKey(a)===titleKey(b)&&normal(a.room)===normal(b.room);}
function overlap(a,b){return a.day===b.day&&a.start<b.end&&b.start<a.end;}
function plan(){
 const chosen=draft.rows.filter(r=>r.selected),accepted=[],duplicates=new Set(),conflicts=new Set(),invalid=new Set();
 for(const row of chosen){if(!valid(row)){invalid.add(row.id);continue;}if([...state.schedule,...accepted].some(s=>duplicate(row,s))){duplicates.add(row.id);continue;}accepted.push(row);}
 for(const row of accepted)if([...state.schedule,...accepted].some(s=>s!==row&&overlap(row,s)))conflicts.add(row.id);
 return {chosen,accepted,duplicates,conflicts,invalid};
}
function updateSummary(){
 if(!draft)return;const data=plan();dialog.querySelector('#import-count').textContent=draft.rows.length;
 for(const row of draft.rows){const el=dialog.querySelector(`[data-id="${row.id}"]`);if(!el)continue;const notes=[];if(data.invalid.has(row.id))notes.push('Add a title, weekday and valid times (end after start).');if(data.duplicates.has(row.id))notes.push('Already scheduled or repeated in this import. This row will be skipped.');if(data.conflicts.has(row.id))notes.push('Overlaps another class. Check the weekday and times.');el.querySelector('.import-row-feedback').textContent=notes.join(' ');el.classList.toggle('import-invalid',data.invalid.has(row.id));}
 dialog.querySelector('#import-summary').textContent=`${data.accepted.length} ${data.accepted.length===1?'class':'classes'} ready to add${data.duplicates.size?' · '+data.duplicates.size+' duplicates skipped':''}${data.invalid.size?' · '+data.invalid.size+' need correction':''}${data.conflicts.size?' · '+data.conflicts.size+' overlap':''}. Existing classes are kept.`;
 dialog.querySelector('#import-save').disabled=draft.reading||!data.accepted.length||!!data.invalid.size;
}
function drawRows(){dialog.querySelector('#import-rows').innerHTML=draft.rows.map(rowMarkup).join('')||'<div class="import-empty">Detected classes will appear here. You can also add a row manually.</div>';dialog.querySelector('#import-reviewed').checked=false;updateSummary();}
function loadParsed(result,raw){draft.rows=result.rows.map(makeRow);draft.warnings=result.warnings;draft.raw=raw;dialog.querySelector('#import-raw').value=raw.slice(0,200000);dialog.querySelector('#import-warnings').textContent=result.warnings.join(' ');drawRows();}
function busy(value){draft.reading=value;for(const id of ['schedule-upload','import-add','import-reparse'])dialog.querySelector('#'+id).disabled=value;dialog.querySelector('#import-rows').inert=value;dialog.querySelector('#import-reviewed').checked=false;updateSummary();}
async function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('The document reader could not load. Reconnect and try again.'));};document.head.append(s);});}
class PDFResources {
 async fetch({kind,filename}){
  if(!libs.resources)libs.resources=fetch('vendor/pdfjs/resources.json').then(response=>{if(!response.ok)throw Error('PDF reading resources could not load. Reconnect and try again.');return response.json();}).catch(error=>{libs.resources=null;throw error;});
  const resources=await libs.resources,encoded=resources[kind]?.[filename];if(!encoded)throw Error('This PDF uses an unsupported reading resource. Try exporting it as a text PDF.');const binary=atob(encoded);return Uint8Array.from(binary,c=>c.charCodeAt(0));
 }
}
async function pdfLib(){if(!libs.pdf)libs.pdf=import('./vendor/pdfjs/pdf.mjs').then(pdf=>{pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',location.href).href;return pdf;}).catch(e=>{libs.pdf=null;throw e;});return libs.pdf;}
async function wordLib(){if(!libs.word)libs.word=script('vendor/mammoth/mammoth.browser.js').then(()=>window.mammoth).catch(e=>{libs.word=null;throw e;});return libs.word;}
function pdfLines(items){
 const ordered=items.filter(i=>i.str?.trim()).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],width:i.width||0,height:Math.abs(i.transform[3])||10})).sort((a,b)=>b.y-a.y||a.x-b.x),lines=[];
 for(const item of ordered){let row=lines.find(r=>Math.abs(r.y-item.y)<Math.min(4,item.height*.35));if(!row){row={y:item.y,items:[]};lines.push(row);}row.items.push(item);}
 return lines.sort((a,b)=>b.y-a.y).map(row=>{row.items.sort((a,b)=>a.x-b.x);let cells=[],last=null;for(const item of row.items){if(!last||item.x-(last.x+last.width)>14)cells.push({x:item.x,text:item.text});else cells[cells.length-1].text+=' '+item.text;last=item;}return {cells,items:row.items,text:cells.map(c=>c.text).join(' | ')};});
}
function pdfTables(lines){
 const tables=[],plain=[];let active=null;
 for(const line of lines){const kinds=line.cells.filter(c=>P.headerKind(c.text)),dayCells=line.cells.filter(c=>P.readDays(c.text).length===1&&/^\s*(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*$/i.test(c.text));
  if(kinds.length>=2||dayCells.length>=2){if(active)tables.push(active.rows);active={anchors:line.cells.map(c=>c.x),rows:[line.cells.map(c=>c.text)]};continue;}
  if(active){const cells=active.anchors.map(()=>[]);for(const item of line.items){let index=0;for(let i=1;i<active.anchors.length;i++)if(item.x>=active.anchors[i]-8)index=i;cells[index].push(item.text);}const row=cells.map(c=>c.join(' '));if(row.some(c=>P.ranges(c).length)||row.some(c=>P.readDays(c).length)){active.rows.push(row);continue;}
   // Append a wrapped course description to its preceding table cell.
   if(active.rows.length>1&&row.filter(Boolean).length===1&&!/^(total|semester|school|academic|page|prepared|approved)/i.test(line.text)){const i=row.findIndex(Boolean);active.rows[active.rows.length-1][i]+=' '+row[i];continue;}
   tables.push(active.rows);active=null;
  }plain.push(line.text);
 }
 if(active)tables.push(active.rows);return {tables,lines:plain};
}
async function readPdf(buffer,token){
 const pdf=await pdfLib();const task=pdf.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,BinaryDataFactory:PDFResources,useWorkerFetch:false,cMapPacked:true});let doc;
 try{doc=await task.promise;if(doc.numPages>60)throw Error('This PDF has more than 60 pages. Upload only the schedule pages.');const tables=[],lines=[],raw=[];let scans=0;
  for(let i=1;i<=doc.numPages;i++){if(token!==generation)throw Error('cancelled');status(`Reading PDF page ${i} of ${doc.numPages}…`);const page=await doc.getPage(i),content=await page.getTextContent(),grouped=pdfLines(content.items);if(!grouped.length)scans++;const parsed=pdfTables(grouped);tables.push(...parsed.tables);lines.push(...parsed.lines);raw.push(...grouped.map(r=>r.text));page.cleanup();if(raw.join('\n').length>200000)throw Error('Too much text. Upload only the schedule pages.');}
  const result=P.parse({tables,lines});if(scans)result.warnings.unshift(`${scans} PDF ${scans===1?'page has':'pages have'} no readable text (possibly a scan). Add missing classes manually or paste their text.`);return {result,raw:raw.join('\n')};
 }finally{await task.destroy();}
}
function wordTable(table){
 const result=[],spans=new Map();for(const tr of table.querySelectorAll('tr')){if(tr.closest('table')!==table)continue;const row=[];let column=0;const carry=()=>{while(spans.has(column)){const span=spans.get(column);row[column++]=span.text;if(--span.remaining<=0)spans.delete(column-1);}};for(const cell of tr.children){if(!['TD','TH'].includes(cell.tagName))continue;carry();const text=[...cell.querySelectorAll('p')].map(p=>p.textContent).join(' ')||cell.textContent,colSpan=Math.min(Number(cell.getAttribute('colspan'))||1,7),rowSpan=Math.min(Number(cell.getAttribute('rowspan'))||1,500);for(let i=0;i<colSpan;i++){row[column]=i?'':text;if(rowSpan>1)spans.set(column,{text:i?'':text,remaining:rowSpan-1});column++;}}carry();result.push(row);}return result;
}
async function readWord(buffer){
 const mammoth=await wordLib(),result=await mammoth.convertToHtml({arrayBuffer:buffer},{convertImage:mammoth.images.imgElement(()=>Promise.resolve({src:''}))});
 const html=new DOMParser().parseFromString(result.value,'text/html');const tables=[...html.querySelectorAll('table')].filter(t=>!t.parentElement?.closest('table')).map(wordTable),lines=[...html.querySelectorAll('p')].filter(p=>!p.closest('table')).map(p=>p.textContent);const raw=[...tables.flatMap(t=>t.map(r=>r.join(' | '))),...lines].join('\n');if(raw.length>200000)throw Error('Too much text. Save only the schedule section in a smaller .docx file.');return {result:P.parse({tables,lines}),raw};
}
async function readFile(file){
 if(!file||!draft)return;if(draft.rows.length&&!confirm('Replace this unsaved import preview with the new file?')){dialog.querySelector('#schedule-upload').value='';return;}
 if(file.size>MAX_BYTES){status('Choose a file smaller than 15 MB.',true);return;}const extension=file.name.split('.').pop().toLowerCase();if(!['pdf','docx'].includes(extension)){status('Choose a PDF or .docx file. Save older Word .doc files as .docx first.',true);return;}
 const token=++generation;busy(true);status('Reading '+file.name+'…');
 try{const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);if(extension==='pdf'&&String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('This file is not a valid PDF.');if(extension==='docx'&&(bytes[0]!==80||bytes[1]!==75))throw Error('This file is not a valid .docx document.');const data=extension==='pdf'?await readPdf(buffer,token):await readWord(buffer);if(token!==generation||!draft)return;loadParsed(data.result,data.raw);status(`${file.name}: ${data.result.rows.length} entries detected. Review every selected class.`);}
 catch(e){if(token!==generation||!draft)return;const message=e.name==='PasswordException'?'This PDF is password protected. Upload an unlocked copy.':e.name==='InvalidPDFException'?'The PDF could not be read. Try another copy.':e.message||'Could not read this file. Try an unlocked PDF or .docx file.';status(message,true);}
 finally{if(token===generation&&draft){busy(false);dialog.querySelector('#schedule-upload').value='';}}
}
function commit(event){
 event.preventDefault();if(!draft||draft.reading)return;if(owner()!==draft.owner||state!==draft.state){status('Your workspace changed while this preview was open. Close it and import again in the current account.',true);return;}
 const data=plan();if(!data.accepted.length||data.invalid.size||!dialog.querySelector('#import-reviewed').checked){status('Correct selected rows and check the review box first.',true);return;}
 if(state.schedule.length+data.accepted.length>10000){status('Your schedule is too large. Remove unused entries first.',true);return;}
 const previous=state.schedule;state.schedule=[...previous,...data.accepted.map(row=>({id:uid(),title:row.title.trim(),subject:row.subject,day:row.day,start:row.start,end:row.end,room:row.room.trim()}))].sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.start.localeCompare(b.start));
 if(save()===false){state.schedule=previous;status('Could not save the import. Free some storage or export a backup, then try again.',true);return;}
 const count=data.accepted.length,skipped=data.duplicates.size;close();go('schedule');toast(`${count} ${count===1?'class':'classes'} imported${skipped?' · '+skipped+' duplicates skipped':''}.`);
}
window.openScheduleImport=open;
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
})();
