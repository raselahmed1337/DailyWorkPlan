const KEY="research-command-center-json-v4";
const phases=[
{id:"paper",n:1,title:"Paper Extension",sub:"Extend, refine & submit"},
{id:"apply",n:2,title:"Apply / Follow Up",sub:"Applications & tracking"},
{id:"ielts",n:3,title:"IELTS Preparation",sub:"Build target band"},
{id:"learn",n:4,title:"Learn",sub:"Agentic AI & Medical Imaging"},
{id:"project",n:5,title:"Build Project",sub:"Prototype & document"}];
const phaseDetails={
paper:{icon:"▤",deliverable:"Extended paper ready for submission",timeline:"Submit journal by 28 Aug 2026"},
apply:{icon:"✉",deliverable:"Submissions completed and follow-ups tracked",timeline:"Ongoing until acceptance"},
ielts:{icon:"▱",deliverable:"Achieve target IELTS band score",timeline:"As per planned exam date"},
learn:{icon:"✦",deliverable:"Strong foundation in Agentic AI and Medical Imaging",timeline:"Continuous learning"},
project:{icon:"⌘",deliverable:"Working prototype with documentation",timeline:"As per project scope"}
};
const seed=[
["p1","Extend existing paper with additional experiments/results","paper","High","2026-08-28",120],
["p2","Improve methodology and analysis","paper","High","2026-08-28",120],
["p3","Strengthen discussion, limitations and implications","paper","Medium","2026-08-28",90],
["p4","Check journal formatting and references","paper","Medium","2026-08-28",60],
["p5","Submit journal paper","paper","High","2026-08-28",30],
["a1","Identify suitable PhD positions / journals / conferences","apply","High","",90],
["a2","Prepare CV, research statement and supporting documents","apply","High","",120],
["a3","Submit applications","apply","High","",45],
["a4","Follow up on application status and queries","apply","Medium","",30],
["a5","Track deadlines and responses","apply","Medium","",20],
["i1","Assess current IELTS level","ielts","High","",60],
["i2","Create weekly IELTS study schedule","ielts","High","",30],
["i3","Practice Listening and Reading","ielts","Medium","",60],
["i4","Practice Writing and Speaking","ielts","Medium","",60],
["i5","Take mock tests and review weak areas","ielts","Medium","",120],
["i6","Book / sit IELTS exam","ielts","High","",30],
["l1","Study Agentic AI fundamentals","learn","High","",90],
["l2","Learn agent architectures, tools, memory and RAG","learn","High","",120],
["l3","Explore Medical Imaging fundamentals","learn","High","",90],
["l4","Read recent research papers","learn","Medium","",60],
["l5","Complete relevant courses / tutorials","learn","Medium","",90],
["l6","Build small experiments to apply what I learn","learn","Medium","",120],
["b1","Define problem statement and research question","project","High","",60],
["b2","Design system / model architecture","project","High","",90],
["b3","Collect or prepare dataset","project","High","",120],
["b4","Develop and test model / system","project","High","",180],
["b5","Evaluate results and iterate","project","Medium","",120],
["b6","Document project and publish to GitHub","project","Medium","",120]];
const outcomeDefs=[
["paper","Paper submitted"],["apply","Applications in progress"],["ielts","IELTS target achieved"],["skills","Knowledge & skills enhanced"],["project","Project built successfully"]];
let state={tasks:[],outcomes:{},focus:[],phase:"all",phaseContent:{}};
let selectedTasks=new Set();
const $=x=>document.getElementById(x), esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}):"";
const dayDiff=d=>d?Math.round((new Date(d+"T00:00:00")-new Date(new Date().setHours(0,0,0,0)))/86400000):null;
function dueInfo(d,done){let n=dayDiff(d);if(done||n===null)return null;if(n<0)return {text:`${Math.abs(n)}d overdue`,cls:"overdue"};if(n===0)return {text:"Due today",cls:"due-now"};if(n===1)return {text:"Due tomorrow",cls:"due-soon"};if(n<=7)return {text:`Due in ${n} days`,cls:"due-soon"};return {text:`Due ${fmt(d)}`,cls:""}}
const starterFocus=["Finish the most urgent paper task","Study one Agentic AI concept","Complete one IELTS practice session"];
function getPhase(id){const base=phases.find(p=>p.id===id),custom=state.phaseContent?.[id]||{};return base?{...base,...phaseDetails[id],...custom}:null}
function normalizeState(x){
  if(!x||!Array.isArray(x.tasks))throw new Error("Missing tasks");
  const used=new Set();
  const tasks=x.tasks.map(t=>{
    if(!t||typeof t.title!=="string"||!t.title.trim())throw new Error("Invalid task");
    let id=typeof t.id==="string"&&t.id&&!used.has(t.id)?t.id:crypto.randomUUID();used.add(id);
    return {id,title:t.title.trim().slice(0,180),phase:phases.some(p=>p.id===t.phase)?t.phase:"paper",priority:["High","Medium","Low"].includes(t.priority)?t.priority:"Medium",due:/^\d{4}-\d{2}-\d{2}$/.test(t.due||"")?t.due:"",minutes:Number.isFinite(Number(t.minutes))?Math.max(5,Number(t.minutes)):60,done:Boolean(t.done),notes:typeof t.notes==="string"?t.notes:""};
  });
  const phaseContent={};if(x.phaseContent&&typeof x.phaseContent==="object")phases.forEach(p=>{const v=x.phaseContent[p.id];if(v&&typeof v==="object")phaseContent[p.id]={title:typeof v.title==="string"?v.title.slice(0,60):p.title,sub:typeof v.sub==="string"?v.sub.slice(0,100):p.sub,deliverable:typeof v.deliverable==="string"?v.deliverable.slice(0,180):phaseDetails[p.id].deliverable,timeline:typeof v.timeline==="string"?v.timeline.slice(0,120):phaseDetails[p.id].timeline}});
  return {tasks,outcomes:x.outcomes&&typeof x.outcomes==="object"&&!Array.isArray(x.outcomes)?x.outcomes:{},focus:Array.isArray(x.focus)?x.focus.filter(v=>typeof v==="string").map(v=>v.trim()).filter(Boolean):[],phase:x.phase==="all"||phases.some(p=>p.id===x.phase)?x.phase:"all",phaseContent};
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$("saveState").textContent="Saved locally • "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}catch{$("saveState").textContent="Could not save"}renderJSON();}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x){state=normalizeState(x);return}}catch{}state.tasks=seed.map(([id,title,phase,priority,due,minutes])=>({id,title,phase,priority,due,minutes,done:false,notes:""}));state.outcomes={};state.focus=[...starterFocus];state.phase="all";state.phaseContent={};save();}
function phaseName(id){return getPhase(id)?.title||id}
function percent(ts){return ts.length?Math.round(ts.filter(t=>t.done).length/ts.length*100):0}
function renderRoadmap(){
  const phaseCards=phases.map((base,index)=>{let p=getPhase(base.id),ts=state.tasks.filter(t=>t.phase===p.id),pc=percent(ts),open=ts.filter(t=>!t.done).slice(0,3);return `<div class="phase phase-${p.id} ${state.phase===p.id?"selected":""}" data-p="${p.id}" tabindex="0" role="button" aria-label="Filter tasks by ${esc(p.title)}">
  <div class="phase-top"><div class="phase-num">${p.n}</div><div><h3>${esc(p.title)}</h3><small>${esc(p.sub)}</small></div><button class="section-edit" data-section-edit="${p.id}" aria-label="Edit ${esc(p.title)}">Edit</button><div class="phase-icon">${p.icon}</div></div>
  <div class="phase-key"><b>Key tasks</b><ul>${open.length?open.map(t=>`<li>${esc(t.title)}</li>`).join(""):`<li>All phase tasks completed</li>`}</ul></div>
  <div class="phase-detail"><span>✓</span><div><b>Deliverable</b><small>${esc(p.deliverable)}</small></div></div>
  <div class="phase-detail"><span>◷</span><div><b>Timeline</b><small>${esc(p.timeline)}</small></div></div>
  <div class="phase-progress"><span>${pc}% complete</span><div class="mini"><i style="width:${pc}%"></i></div></div><i class="flow-arrow" aria-hidden="true">→</i></div>`}).join("");
  const achieved=Object.values(state.outcomes).filter(Boolean).length;
  const outcomeCard=`<div class="phase phase-outcome"><div class="phase-top"><div class="phase-num">6</div><div><h3>Outcome</h3><small>PhD-ready milestones</small></div><div class="phase-icon">🏆</div></div><div class="phase-key"><b>Target results</b><ul>${outcomeDefs.map(([key,label])=>`<li class="${state.outcomes[key]?"achieved":""}">${state.outcomes[key]?"✓ ":""}${esc(label)}</li>`).join("")}</ul></div><div class="phase-detail"><span>★</span><div><b>Overall result</b><small>${achieved} of ${outcomeDefs.length} milestones achieved</small></div></div><div class="phase-progress"><span>${Math.round(achieved/outcomeDefs.length*100)}% complete</span><div class="mini"><i style="width:${achieved/outcomeDefs.length*100}%"></i></div></div></div>`;
  $("roadmap").innerHTML=phaseCards+outcomeCard;
  document.querySelectorAll("[data-p]").forEach(x=>{const choose=()=>{state.phase=state.phase===x.dataset.p?"all":x.dataset.p;render()};x.onclick=choose;x.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose()}}})
  document.querySelectorAll("[data-section-edit]").forEach(x=>x.onclick=e=>{e.stopPropagation();openSectionEdit(x.dataset.sectionEdit)})
}
function filtered(){let q=$("search").value.toLowerCase(),s=$("status").value,p=$("priority").value,rank={High:0,Medium:1,Low:2};return state.tasks.filter(t=>(state.phase==="all"||t.phase===state.phase)&&(!q||t.title.toLowerCase().includes(q)||(t.notes||"").toLowerCase().includes(q))&&(s==="all"||(s==="active"&&!t.done)||(s==="done"&&t.done))&&(p==="all"||t.priority===p)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||"9999").localeCompare(b.due||"9999")||(rank[a.priority]??3)-(rank[b.priority]??3))}
function updateBulkControls(){let shown=filtered(),shownIds=shown.map(t=>t.id),selectedShown=shownIds.filter(id=>selectedTasks.has(id)).length;$("selectedCount").textContent=`${selectedTasks.size} selected`;$("deleteSelected").disabled=selectedTasks.size===0;$("selectAllTasks").checked=shownIds.length>0&&selectedShown===shownIds.length;$("selectAllTasks").indeterminate=selectedShown>0&&selectedShown<shownIds.length}
function renderTasks(){let ts=filtered();selectedTasks=new Set([...selectedTasks].filter(id=>state.tasks.some(t=>t.id===id)));$("phaseLabel").textContent=state.phase==="all"?`${ts.length} tasks across all phases`:`${ts.length} tasks in ${phaseName(state.phase)}`;$("taskList").innerHTML=ts.length?ts.map(t=>{let due=dueInfo(t.due,t.done);return `<div class="task ${t.done?"done":""} ${due?.cls||""}"><input class="task-selector" data-select="${esc(t.id)}" type="checkbox" ${selectedTasks.has(t.id)?"checked":""} aria-label="Select ${esc(t.title)}"><input class="check" data-check="${esc(t.id)}" type="checkbox" ${t.done?"checked":""} aria-label="Mark ${esc(t.title)} complete"><div><div class="task-title">${esc(t.title)}</div><div class="meta"><span class="badge">${esc(phaseName(t.phase))}</span><span class="badge ${esc(t.priority.toLowerCase())}">${esc(t.priority)}</span>${due?`<span class="badge ${due.cls}">${esc(due.text)}</span>`:t.due?`<span class="badge">Due ${fmt(t.due)}</span>`:""}<span class="badge">${t.minutes} min</span></div></div><button class="edit" data-edit="${esc(t.id)}">Edit</button></div>`}).join(""):`<div class="empty"><b>Nothing here yet</b><br>Adjust the filters or add your next task.</div>`;document.querySelectorAll("[data-select]").forEach(x=>x.onchange=()=>{x.checked?selectedTasks.add(x.dataset.select):selectedTasks.delete(x.dataset.select);updateBulkControls()});document.querySelectorAll("[data-check]").forEach(x=>x.onchange=()=>{let t=state.tasks.find(t=>t.id===x.dataset.check);if(t)t.done=x.checked;save();render()});document.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>openEdit(x.dataset.edit));updateBulkControls()}
function renderDashboard(){let ts=state.tasks,d=ts.filter(t=>t.done).length,pc=ts.length?Math.round(d/ts.length*100):0;$("currentDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});let overdue=ts.filter(t=>!t.done&&dayDiff(t.due)<0).length;$("dayStatus").textContent=overdue?`${overdue} overdue task${overdue===1?"":"s"} need attention`:`${ts.filter(t=>!t.done).length} open tasks remaining`;$("overall").textContent=pc+"%";$("overallBar").style.width=pc+"%";$("overallText").textContent=`${d} of ${ts.length} tasks complete`;let urgent=[...ts].filter(t=>!t.done).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")||({High:0,Medium:1,Low:2}[a.priority]-({High:0,Medium:1,Low:2}[b.priority])))[0],active=urgent?getPhase(urgent.phase):null;$("activePhase").textContent=active?.title||"All complete";$("activeHint").textContent=urgent?urgent.title:"Excellent — no open work.";let n=ts.filter(t=>!t.done&&t.due).sort((a,b)=>a.due.localeCompare(b.due))[0],di=n?dueInfo(n.due,false):null;$("nextDeadline").textContent=di?.text||"—";$("nextTask").textContent=n?n.title:"No upcoming deadline";$("outcomeScore").textContent=`${Object.values(state.outcomes).filter(Boolean).length} / 5`}
function renderFocus(){$("focusList").innerHTML=state.focus.map((x,i)=>`<div class="focus"><b>${esc(x)}</b><p><button class="edit" data-focus="${i}">Remove</button></p></div>`).join("")||`<div class="empty">No focus items.</div>`;document.querySelectorAll("[data-focus]").forEach(x=>x.onclick=()=>{state.focus.splice(Number(x.dataset.focus),1);save();render()})}
function renderOutcomes(){$("outcomes").innerHTML=outcomeDefs.map(([k,label])=>`<div class="outcome ${state.outcomes[k]?"done":""}" data-out="${k}"><b>${state.outcomes[k]?"✓ ":""}${label}</b><small>Click to toggle</small></div>`).join("");document.querySelectorAll("[data-out]").forEach(x=>x.onclick=()=>{let k=x.dataset.out;state.outcomes[k]=!state.outcomes[k];save();render()})}
function renderJSON(){$("jsonPreview").textContent=JSON.stringify(state,null,2)}
function render(){renderDashboard();renderRoadmap();renderTasks();renderFocus();renderOutcomes();renderJSON()}
function populate(){ $("phase").innerHTML=phases.map(p=>`<option value="${p.id}">${p.n}. ${esc(phaseName(p.id))}</option>`).join("")}
function openSectionEdit(id){let p=getPhase(id);if(!p)return;$("sectionId").value=id;$("sectionTitle").value=p.title;$("sectionSub").value=p.sub;$("sectionDeliverable").value=p.deliverable;$("sectionTimeline").value=p.timeline;$("sectionDialog").showModal()}
function openAdd(){$("modalTitle").textContent="Add task";$("editId").value="";$("title").value="";$("phase").value=state.phase==="all"?"paper":state.phase;$("prio").value="Medium";$("due").value="";$("minutes").value=60;$("notes").value="";$("deleteTask").classList.add("hidden");$("taskDialog").showModal()}
function openEdit(id){let t=state.tasks.find(t=>t.id===id);if(!t)return;$("modalTitle").textContent="Edit task";$("editId").value=id;$("title").value=t.title;$("phase").value=t.phase;$("prio").value=t.priority;$("due").value=t.due||"";$("minutes").value=t.minutes||60;$("notes").value=t.notes||"";$("deleteTask").classList.remove("hidden");$("taskDialog").showModal()}
$("taskForm").onsubmit=e=>{e.preventDefault();let id=$("editId").value,t=state.tasks.find(x=>x.id===id),p={title:$("title").value.trim(),phase:$("phase").value,priority:$("prio").value,due:$("due").value,minutes:Number($("minutes").value)||60,notes:$("notes").value.trim()};if(!p.title)return;if(t)Object.assign(t,p);else state.tasks.push({id:crypto.randomUUID(),done:false,...p});$("taskDialog").close();save();render()};
$("deleteTask").onclick=()=>{let id=$("editId").value;state.tasks=state.tasks.filter(t=>t.id!==id);$("taskDialog").close();save();render()};$("closeTask").onclick=()=>$("taskDialog").close();$("addTask").onclick=openAdd;
["search","status","priority"].forEach(id=>$(id).oninput=render);
$("focusAll").onclick=()=>{state.phase="all";render()};
$("addFocus").onclick=()=>{let x=prompt("What is one important focus item?");if(x?.trim()){state.focus.push(x.trim());save();render()}};
$("exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="research-command-center-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)};
$("importBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let next=normalizeState(JSON.parse(r.result));state=next;save();render();alert("JSON imported successfully.")}catch{alert("Invalid tracker JSON. Your current dashboard was not changed.")}};r.readAsText(f);e.target.value=""};
$("newBtn").onclick=()=>{if(confirm("Reset the tracker to the original plan?")){localStorage.removeItem(KEY);load();render()}};
$("selectAllTasks").onchange=e=>{filtered().forEach(t=>e.target.checked?selectedTasks.add(t.id):selectedTasks.delete(t.id));renderTasks()};
$("deleteSelected").onclick=()=>{if(!selectedTasks.size)return;if(confirm(`Delete ${selectedTasks.size} selected task${selectedTasks.size===1?"":"s"}? This cannot be undone.`)){state.tasks=state.tasks.filter(t=>!selectedTasks.has(t.id));selectedTasks.clear();save();render()}};
$("deleteAll").onclick=()=>{if(!state.tasks.length)return;if(confirm(`Delete all ${state.tasks.length} tasks? This cannot be undone.`)){state.tasks=[];selectedTasks.clear();save();render()}};
$("sectionForm").onsubmit=e=>{e.preventDefault();let id=$("sectionId").value;if(!phases.some(p=>p.id===id))return;state.phaseContent[id]={title:$("sectionTitle").value.trim(),sub:$("sectionSub").value.trim(),deliverable:$("sectionDeliverable").value.trim(),timeline:$("sectionTimeline").value.trim()};$("sectionDialog").close();populate();save();render()};
$("closeSection").onclick=()=>$("sectionDialog").close();
load();populate();render();
