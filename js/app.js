import { all, put, remove, replaceAll, storeNames } from "./db.js";
import { problemTypes, statusLabels } from "./taxonomy.js";
import { recommendationsFor, analyzeProblems } from "./recommendations.js";

const $ = (s) => document.querySelector(s);
const uid = () => crypto.randomUUID();
let deferredInstall = null;
let cache = { projects:[], problems:[], solutions:[], tasks:[] };

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}
function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function dateNow(){ return new Date().toISOString(); }
async function refresh() {
  for (const store of storeNames) cache[store] = await all(store);
  render();
}
function render() {
  $("#metricProjects").textContent = cache.projects.length;
  $("#metricProblems").textContent = cache.problems.filter(p => p.status !== "resolved").length;
  $("#metricTasks").textContent = cache.tasks.filter(t => t.status === "doing").length;
  renderProjects(); renderProblems(); renderInsights(); populateFilters();
}
function renderProjects() {
  const host = $("#projectsList");
  host.innerHTML = cache.projects.map(p => {
    const problems = cache.problems.filter(x => x.projectId === p.id);
    const open = problems.filter(x => x.status !== "resolved").length;
    return `<article class="project-card"><div class="card-top"><div><h3>${esc(p.name)}</h3><p>${esc(p.description || "Nessuna descrizione")}</p></div><span class="tag">${open} aperti</span></div><div class="card-meta"><span class="tag">Owner: ${esc(p.owner || "Non assegnato")}</span><span class="tag">${problems.length} problemi totali</span></div><div class="card-actions"><button class="small-button" data-project-problems="${p.id}">Vedi problemi</button><button class="small-button" data-delete-project="${p.id}">Elimina</button></div></article>`;
  }).join("");
  $("#emptyProjects").classList.toggle("hidden", cache.projects.length > 0);
}
function renderProblems() {
  const projectFilter = $("#projectFilter").value;
  const typeFilter = $("#typeFilter").value;
  const rows = cache.problems.filter(p => (!projectFilter || p.projectId === projectFilter) && (!typeFilter || p.typeId === typeFilter));
  $("#problemsList").innerHTML = rows.map(p => {
    const project = cache.projects.find(x => x.id === p.projectId);
    const type = problemTypes.find(x => x.id === p.typeId);
    const linkedSolutions = cache.solutions.filter(s => s.problemId === p.id);
    const taskCount = linkedSolutions.flatMap(s => cache.tasks.filter(t => t.solutionId === s.id)).length;
    return `<article class="problem-card"><div class="card-top"><div><h3>${esc(p.title)}</h3><p>${esc(p.description || "Nessuna descrizione")}</p></div><span class="priority" data-value="${esc(p.priority)}">${esc(p.priority)}</span></div><div class="card-meta"><span class="tag">${esc(project?.name || "Progetto eliminato")}</span><span class="tag">${esc(type?.label || "Altro")}</span><span class="tag">${esc(statusLabels[p.status] || p.status)}</span></div><p>Stakeholder: ${esc(p.stakeholder || "Non indicato")}</p><div class="card-actions"><button class="small-button" data-detail="${p.id}">Dettaglio · ${linkedSolutions.length} soluzioni · ${taskCount} task</button><button class="small-button" data-delete-problem="${p.id}">Elimina</button></div></article>`;
  }).join("");
  $("#emptyProblems").classList.toggle("hidden", rows.length > 0);
}
function renderInsights() {
  const counts = analyzeProblems(cache.problems);
  const host = $("#insightsList");
  if (!counts.length) { host.innerHTML = '<div class="empty-state">Registra alcuni problemi per ottenere analisi per tipologia.</div>'; return; }
  host.innerHTML = counts.map(([typeId,count]) => {
    const rec = recommendationsFor(typeId);
    const examples = cache.problems.filter(p => p.typeId === typeId);
    const resolved = examples.filter(p => p.status === "resolved").length;
    return `<article class="insight-card"><div class="card-top"><div><h3>${esc(rec.title)}</h3><p>${count} problemi · ${resolved} risolti</p></div><span class="tag">${Math.round(resolved/count*100)}% risolti</span></div><div class="card-meta">${rec.methods.map(m=>`<span class="tag">${esc(m)}</span>`).join("")}</div><strong>Azioni suggerite</strong>${rec.actions.map((a,i)=>`<div class="suggestion"><strong>${i+1}. ${esc(a)}</strong></div>`).join("")}<p class="muted">${esc(rec.caveat)}</p></article>`;
  }).join("");
}
function populateFilters() {
  const projectOptions = '<option value="">Tutti i progetti</option>' + cache.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const typeOptions = '<option value="">Tutte le tipologie</option>' + problemTypes.map(t=>`<option value="${t.id}">${esc(t.label)}</option>`).join("");
  const pf = $("#projectFilter"), tf = $("#typeFilter");
  const oldP = pf.value, oldT = tf.value;
  pf.innerHTML = projectOptions; tf.innerHTML = typeOptions;
  pf.value = oldP; tf.value = oldT;
  $("#problemProject").innerHTML = cache.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  $("#problemType").innerHTML = problemTypes.map(t=>`<option value="${t.id}">${esc(t.label)}</option>`).join("");
  $("#addProblemBtn").disabled = !cache.projects.length;
}
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $("#view-" + name).classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
}
function openDetail(problemId) {
  const p = cache.problems.find(x=>x.id===problemId); if (!p) return;
  const rec = recommendationsFor(p.typeId);
  const solutions = cache.solutions.filter(s=>s.problemId===p.id);
  const project = cache.projects.find(x=>x.id===p.projectId);
  $("#detailContent").innerHTML = `<div class="modal-heading"><div><p class="eyebrow">SCHEDA PROBLEMA</p><h2>${esc(p.title)}</h2></div><button class="icon-button" id="closeDetail">×</button></div><p>${esc(p.description || "")}</p><div class="card-meta"><span class="tag">${esc(project?.name || "")}</span><span class="tag">${esc(rec?.title || "")}</span><span class="tag">${esc(p.stakeholder || "Stakeholder non indicato")}</span></div><h3>Soluzioni</h3><div id="solutionsList">${solutions.map(s=>`<div class="panel"><strong>${esc(s.title)}</strong><p>${esc(s.description || "")}</p><div id="tasks-${s.id}">${cache.tasks.filter(t=>t.solutionId===s.id).map(t=>`<div class="task-row"><span>${esc(t.title)}</span><select data-task-status="${t.id}" aria-label="Stato task"><option value="todo" ${t.status==="todo"?"selected":""}>Da iniziare</option><option value="doing" ${t.status==="doing"?"selected":""}>In corso</option><option value="done" ${t.status==="done"?"selected":""}>Concluso</option></select></div>`).join("")}</div><form class="inline-form" data-task-form="${s.id}"><input name="title" required placeholder="Nuovo task risolutivo"><button class="small-button">Aggiungi task</button></form></div>`).join("") || '<p class="muted">Ancora nessuna soluzione.</p>'}</div><h3>Aggiungi soluzione</h3><form id="solutionForm"><label>Titolo<input name="title" required placeholder="Es. Rivedere il piano delle dipendenze"></label><label>Descrizione<textarea name="description" rows="2"></textarea></label><button class="button button-primary">Salva soluzione</button></form><div class="notice"><strong>Spunti dalla knowledge base locale</strong><br>${rec?.actions.map(a=>`• ${esc(a)}`).join("<br>") || ""}</div>`;
  $("#detailDialog").showModal();
  $("#closeDetail").addEventListener("click",()=>$("#detailDialog").close());
  $("#solutionForm").addEventListener("submit", async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    await put("solutions",{id:uid(),problemId:p.id,title:fd.get("title"),description:fd.get("description"),createdAt:dateNow()});
    await refresh(); openDetail(p.id); toast("Soluzione aggiunta");
  });
  document.querySelectorAll("[data-task-form]").forEach(form => form.addEventListener("submit", async e => {
    e.preventDefault(); const fd=new FormData(form);
    await put("tasks",{id:uid(),solutionId:form.dataset.taskForm,title:fd.get("title"),status:"todo",createdAt:dateNow()});
    await refresh(); openDetail(p.id); toast("Task aggiunto");
  }));
  document.querySelectorAll("[data-task-status]").forEach(sel=>sel.addEventListener("change",async e=>{
    const task=cache.tasks.find(t=>t.id===e.target.dataset.taskStatus); if(!task)return;
    await put("tasks",{...task,status:e.target.value,updatedAt:dateNow()}); await refresh(); openDetail(p.id); toast("Stato task aggiornato");
  }));
}
$("#addProjectBtn").addEventListener("click",()=>$("#projectDialog").showModal());
$("#projectForm").addEventListener("submit",async e=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget);
  await put("projects",{id:uid(),name:fd.get("name").trim(),description:fd.get("description").trim(),owner:fd.get("owner").trim(),createdAt:dateNow()});
  e.currentTarget.reset(); $("#projectDialog").close(); await refresh(); toast("Progetto creato");
});
$("#addProblemBtn").addEventListener("click",()=>{
  if(!cache.projects.length){toast("Crea prima un progetto");return;}
  $("#problemDialog").showModal();
});
$("#problemForm").addEventListener("submit",async e=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget);
  await put("problems",{id:uid(),projectId:fd.get("projectId"),title:fd.get("title").trim(),description:fd.get("description").trim(),stakeholder:fd.get("stakeholder").trim(),typeId:fd.get("typeId"),priority:fd.get("priority"),status:fd.get("status"),createdAt:dateNow()});
  e.currentTarget.reset(); $("#problemDialog").close(); await refresh(); showView("problems"); toast("Problema registrato");
});
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>showView(t.dataset.view)));
$("#projectFilter").addEventListener("change",renderProblems);
$("#typeFilter").addEventListener("change",renderProblems);
$("#projectsList").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-project-problems],[data-delete-project]"); if(!btn)return;
  if(btn.dataset.projectProblems){showView("problems");$("#projectFilter").value=btn.dataset.projectProblems;renderProblems();}
  if(btn.dataset.deleteProject){
    const id=btn.dataset.deleteProject;
    if(!confirm("Eliminare il progetto e i problemi, soluzioni e task collegati?"))return;
    const ps=cache.problems.filter(p=>p.projectId===id);
    for(const p of ps){for(const s of cache.solutions.filter(x=>x.problemId===p.id)){for(const t of cache.tasks.filter(x=>x.solutionId===s.id))await remove("tasks",t.id);await remove("solutions",s.id);}await remove("problems",p.id);}
    await remove("projects",id); await refresh(); toast("Progetto eliminato");
  }
});
$("#problemsList").addEventListener("click",async e=>{
  const detail=e.target.closest("[data-detail]"), del=e.target.closest("[data-delete-problem]");
  if(detail)openDetail(detail.dataset.detail);
  if(del){
    const id=del.dataset.deleteProblem;if(!confirm("Eliminare il problema e i suoi collegamenti?"))return;
    for(const s of cache.solutions.filter(x=>x.problemId===id)){for(const t of cache.tasks.filter(x=>x.solutionId===s.id))await remove("tasks",t.id);await remove("solutions",s.id);}
    await remove("problems",id);await refresh();toast("Problema eliminato");
  }
});
$("#exportBtn").addEventListener("click",async()=>{
  const data={schemaVersion:1,exportedAt:dateNow()};
  for(const s of storeNames)data[s]=cache[s];
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`project-compass-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast("Backup esportato");
});
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data || !storeNames.every(s=>Array.isArray(data[s])))throw new Error("Formato backup non valido");
    if(!confirm("Il ripristino sostituirà tutti i dati attuali. Hai già esportato un backup?"))return;
    await replaceAll(data);await refresh();toast("Backup ripristinato");
  }catch(err){toast("Importazione non riuscita: "+err.message);}finally{e.target.value="";}
});
function updateConnection(){
  $("#connectionStatus").textContent=navigator.onLine?"Connesso (l'app usa comunque dati locali)":"Offline: puoi continuare a lavorare";
  $("#storageStatus").textContent=`Dati locali: ${cache.projects.length} progetti, ${cache.problems.length} problemi.`;
}
window.addEventListener("online",updateConnection);window.addEventListener("offline",updateConnection);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden");});
$("#installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden");});
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(err=>console.error("SW:",err)));}
await refresh();updateConnection();
