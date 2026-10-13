/* Layout-tolerant schedule parsing. Every result must be reviewed before saving. */
(function(root){
'use strict';
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const dayPattern=/\b(Monday|Mon|Tuesday|Tues|Tue|Wednesday|Wed|Thursday|Thurs|Thur|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)\b/gi;
const clean=v=>String(v??'').replace(/[\u00a0\u2007\u202f]/g,' ').replace(/[–—−]/g,'-').replace(/[\u0000-\u0008]/g,'').trim();
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
function dayIndex(v){return DAYS.findIndex(d=>d.toLowerCase().startsWith(v.slice(0,3).toLowerCase()));}
function readDays(text){
 text=clean(text).replace(/\b[ap]\s*\.?\s*m\.?/gi,'');let found=[],m;dayPattern.lastIndex=0;
 while((m=dayPattern.exec(text)))found.push({day:dayIndex(m[0]),start:m.index,end:dayPattern.lastIndex});
 const result=new Set(found.map(x=>x.day));
 for(let i=1;i<found.length;i++){const a=found[i-1],b=found[i],join=text.slice(a.end,b.start).trim();if(/^(?:-|to|through)$/i.test(join)&&b.day>=a.day)for(let d=a.day;d<=b.day;d++)result.add(d);}
 // Campus shorthand: MWF, TTh, MTWThF, M/W/F. Require a complete token.
 const compact=/\b(?:M|T|W|TH|F|S|SU|U)(?:[ /,]*?(?:TH|SU|M|T|W|F|S|U))*\b/gi;
 for(const token of text.matchAll(compact)){
  const raw=token[0].replace(/[ /,]/g,'').toUpperCase();
  if(raw.length===1&&!/^[MTWF]$/.test(raw))continue;
  const parts=raw.match(/TH|SU|M|T|W|F|S|U/g)||[];
  if(parts.join('')!==raw)continue;
  for(const p of parts)result.add({M:0,T:1,W:2,TH:3,F:4,S:5,SU:6,U:6}[p]);
 }
 return [...result].sort((a,b)=>a-b).map(i=>DAYS[i]);
}
function removeDays(text){text=text.replace(/\b[ap]\s*\.?\s*m\.?/gi,'');dayPattern.lastIndex=0;return text.replace(dayPattern,' ').replace(/\b(?:M|T|W|TH|F|S|SU|U)(?:[ /,]*?(?:TH|SU|M|T|W|F|S|U))*\b/gi,' ');}
const clock='(?:[01]?\\d|2[0-3])(?:[:.]\\d{2})?\\s*(?:[ap]\\.?m\\.?)?|(?:[01]\\d|2[0-3])\\d{2}';
const rangePattern=new RegExp('(?<![\\w:])('+clock+')\\s*(?:-|to|until)\\s*('+clock+')(?![\\w:])','gi');
function clockParts(value){
 const s=clean(value).replace(/\s/g,'').replace(/\./g,':').replace(/([ap]):m:?$/i,'$1m');
 const m=s.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)?$/i)||s.match(/^(\d{2})(\d{2})$/);
 if(!m)return null;const h=Number(m[1]),minute=Number(m[2]||0),period=(m[3]||'').toLowerCase();
 if(minute>59||h>23||(period&&(h<1||h>12)))return null;
 return {h,minute,period,explicit24:h===0||h>12};
}
function pairTimes(a,b){
 const left=clockParts(a),right=clockParts(b);if(!left||!right)return {start:'',end:'',warning:'Check this time range.'};
 const warnings=[];let lp=left.period,rp=right.period;
 if(!lp&&!rp&&!left.explicit24&&!right.explicit24)warnings.push('AM/PM was not specified. Confirm the times.');
 if(!lp&&rp&&!left.explicit24){lp=rp;if(rp==='pm'&&left.h>right.h)lp='am';warnings.push('The first AM/PM was inferred. Confirm it.');}
 if(lp&&!rp&&!right.explicit24){rp=lp;if(lp==='am'&&right.h<left.h)rp='pm';warnings.push('The second AM/PM was inferred. Confirm it.');}
 const format=(p,period)=>String(period?(p.h%12)+(period==='pm'?12:0):p.h).padStart(2,'0')+':'+String(p.minute).padStart(2,'0');
 const start=format(left,lp),end=format(right,rp);
 if(end<=start)warnings.push('End must be later than start. Split overnight classes into separate entries.');
 return {start,end,warning:warnings.join(' ')};
}
function ranges(text){rangePattern.lastIndex=0;return [...clean(text).matchAll(rangePattern)].map(m=>({...pairTimes(m[1],m[2]),index:m.index,endIndex:m.index+m[0].length,raw:m[0]}));}
function roomFrom(text){const m=clean(text).match(/\b(?:room|rm\.?|venue|location|laboratory|lab)\s*(?:[:#-]\s*)?([a-z0-9][a-z0-9 .#/-]{0,45})/i);return m?m[0].split(/\s*[|;]\s*/)[0].trim():'';}
function titleFrom(text){
 let title=removeDays(clean(text));rangePattern.lastIndex=0;title=title.replace(rangePattern,' ');
 title=title.replace(/\b(?:day|days|time|schedule|subject|course|class)\s*:/gi,' ').replace(/\b(?:room|rm\.?|venue|location|laboratory|lab)\s*[:#-]?\s*[^|;\n]*/gi,' ').replace(/[|;]+/g,' ').replace(/^\s*\d+(?:\.\d+)?\s*$/,'').replace(/\s+/g,' ').replace(/^[-:,\s]+|[-:,\s]+$/g,'');
 return title.slice(0,140);
}
function headerKind(value){const s=norm(value);if(/^(day|days|weekday|meetingday|meetingdays)$/.test(s))return 'day';if(/^(time|classtime|schedule|meetingschedule|meetingtime)$/.test(s))return 'time';if(/^(start|starttime|from|begin)$/.test(s))return 'start';if(/^(end|endtime|to|finish)$/.test(s))return 'end';if(/^(room|roomno|roomnumber|venue|location|building|classroom)$/.test(s))return 'room';if(/^(subject|subjectname|subjecttitle|course|coursename|coursetitle|description|descriptivetitle|class|title)$/.test(s))return 'title';if(/^(code|subjectcode|coursecode|courseno|subjectno)$/.test(s))return 'code';return '';}
function parse(input){
 const output=[],warnings=[],unparsed=[];
 function add(title,dayList,time,room,source){
  const notes=[time?.warning||''];if(!title)notes.push('Enter the subject or class title.');if(!dayList.length)notes.push('Choose a weekday.');if(!time)notes.push('Enter the start and end times.');
  for(const day of dayList.length?dayList:[''])output.push({title:title||'',day,start:time?.start||'',end:time?.end||'',room:room||'',source:clean(source).slice(0,1000),warning:notes.filter(Boolean).join(' ')});
 }
 function parseTable(table){
  const rows=table.map(row=>row.map(clean));if(!rows.length)return;
  let header=-1,map={},dayColumns=[];
  for(let i=0;i<Math.min(rows.length,8);i++){
   const entries=rows[i].map((v,j)=>[headerKind(v),j]).filter(x=>x[0]);
   const dc=rows[i].map((v,j)=>[readDays(v),j,v]).filter(x=>x[0].length===1&&norm(x[2])===norm(x[0][0]).slice(0,norm(x[2]).length)&&norm(x[2]).length>=3);
   if(dc.length>=2){header=i;dayColumns=dc;map=Object.fromEntries(entries);break;}
   const candidate=Object.fromEntries(entries);if((candidate.title!==undefined||candidate.code!==undefined)&&(candidate.day!==undefined||candidate.time!==undefined||(candidate.start!==undefined&&candidate.end!==undefined))){header=i;map=candidate;break;}
  }
  if(dayColumns.length){
   for(const row of rows.slice(header+1)){
    const slot=ranges(row[map.time??0]||'')[0];
    for(const [dayList,j] of dayColumns){const cell=row[j]||'';if(!cell||/^(break|lunch|free|vacant|no class|-)+$/i.test(cell))continue;const time=ranges(cell)[0]||slot;add(titleFrom(cell),dayList,time,roomFrom(cell),row.join(' | '));}
   }return;
  }
  if(header>=0){
   for(const row of rows.slice(header+1)){
    if(row.every(v=>!v)||row.filter(v=>headerKind(v)).length>=3)continue;
    const source=row.join(' | '),dayList=readDays(row[map.day]||row[map.time]||source),timeCell=row[map.time]||'',found=ranges(timeCell);
    let title=row[map.title]||row[map.code]||'';if(row[map.code]&&row[map.title]&&norm(row[map.code])!==norm(row[map.title]))title=row[map.code]+' · '+row[map.title];
    const time=map.start!==undefined&&map.end!==undefined?pairTimes(row[map.start],row[map.end]):found[0]||ranges(source)[0];
    if(!title&&!dayList.length&&!time)continue;
    if(found.length>1){const segments=timeCell.split(/;|\n/);if(segments.length>1){for(const segment of segments)for(const slot of ranges(segment))add(title,readDays(segment).length?readDays(segment):dayList,slot,row[map.room]||roomFrom(source),source);}else{for(const slot of found)add(title,dayList,{...slot,warning:[slot.warning,'Multiple meetings in one cell: confirm which days apply to this time.'].filter(Boolean).join(' ')},row[map.room]||roomFrom(source),source);}}else add(title.slice(0,140),dayList,time,row[map.room]||roomFrom(source),source);
   }return;
  }
  parseLines(rows.map(r=>r.join(' | ')));
 }
 function parseLines(lines){
  let contextDays=[],pending=[];
  for(let i=0;i<lines.length;i++){
   const line=clean(lines[i]);if(!line)continue;
   const dayList=readDays(line),slots=ranges(line);
   if(dayList.length&&!slots.length&&titleFrom(line)===''){contextDays=dayList;continue;}
   if(!slots.length){pending.push(line);if(pending.length>4)pending.shift();continue;}
   for(let j=0;j<slots.length;j++){
    const slot=slots[j],chunk=line.slice(j?slot.index:0,slots[j+1]?.index??line.length);
    let effectiveDays=readDays(chunk);if(!effectiveDays.length)effectiveDays=dayList.length?dayList:contextDays;
    let title=titleFrom(chunk),source=line;
    if(!title&&pending.length){const candidate=pending.filter(v=>!headerKind(v)&&!/^\d+$/.test(v)).join(' | ');title=titleFrom(candidate);if(!effectiveDays.length)effectiveDays=readDays(candidate);source=candidate+' | '+line;}
    if(!title&&i+1<lines.length&&!ranges(lines[i+1]).length&&!readDays(lines[i+1]).length&&!headerKind(lines[i+1])){title=titleFrom(lines[++i]);source+=' | '+lines[i];}
    let room=roomFrom(source);if(!room&&i+1<lines.length&&/^\s*(?:room|rm\.?|venue|location)\s*[:#-]?/i.test(lines[i+1])&&!ranges(lines[i+1]).length){room=roomFrom(lines[++i]);source+=' | '+lines[i];}
    add(title,effectiveDays,slot,room,source);
   }pending=[];
  }
  if(!output.length)unparsed.push(...lines.filter(v=>clean(v)).slice(0,100));
 }
 for(const table of input.tables||[])parseTable(table);
 parseLines(input.lines||[]);
 // Preserve separate events; remove exact repetitions from extraction only.
 const seen=new Set(),rows=[];
 for(const row of output){const key=[norm(row.title),row.day,row.start,row.end,norm(row.room)].join('|');if(seen.has(key))continue;seen.add(key);rows.push(row);}
 rows.sort((a,b)=>(DAYS.indexOf(a.day)-DAYS.indexOf(b.day))||a.start.localeCompare(b.start));
 if(rows.length>500){warnings.push('Only the first 500 detected entries are shown. Import the rest in a separate file.');rows.length=500;}
 if(!rows.length)warnings.push('No complete schedule was detected. Add rows manually or paste the schedule text below.');
 return {rows,warnings,unparsed};
}
const api={parse,readDays,ranges,pairTimes,headerKind,clean,DAYS};if(typeof module==='object'&&module.exports)module.exports=api;else root.StudentMateScheduleParser=api;
})(typeof globalThis==='object'?globalThis:this);
