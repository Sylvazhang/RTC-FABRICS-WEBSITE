'use strict';
const PRODUCTS=window.RTC_PRODUCTS, INTRO=window.RTC_INTRO, COLOR_CHIPS=window.RTC_COLORS;
const $=id=>document.getElementById(id), unique=a=>[...new Set(a)].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/grey/g,'gray').replace(/[^a-z0-9]+/g,' ').trim();
const initial={q:'',category:'',fabrication:'',patternType:'',width:'',putup:'',color:'',view:'products',sku:'',scroll:0};
let state={...initial},states=[{...initial}],cursor=0,searchTimer;
const fields=['category','fabrication','patternType','width','putup'];
const labels={category:'All categories',fabrication:'All fabrications',patternType:'All patterns',width:'All widths',putup:'All put ups'};
const human={q:'Search',category:'Category',fabrication:'Fabrication',patternType:'Pattern',width:'Width',putup:'Put up',color:'Color'};
const index=new Map(PRODUCTS.map(p=>[p.sku,normalize([p.sku,p.pattern,p.productName,...p.sourceNames,p.listingDescription,p.searchAliases,p.fabrication,p.category,p.patternType,p.motif,p.width,p.putup,...p.colors].join(' '))]));
function matches(p,s=state,exclude=''){
 if(exclude!=='q'&&s.q&&!normalize(s.q).split(' ').every(t=>index.get(p.sku).includes(t)))return false;
 if(!fields.every(f=>f===exclude||!s[f]||p[f]===s[f]))return false;
 return exclude==='color'||!s.color||p.colors.includes(s.color);
}
function filtered(s=state,exclude=''){return PRODUCTS.filter(p=>matches(p,s,exclude))}
function imageBlock(p){return RTC.image(p)}
function card(p){return `<article class="card"><button class="card-open" data-sku="${escapeHtml(p.sku)}" aria-label="View ${escapeHtml(p.pattern)}, SKU ${escapeHtml(p.sku)}"><div class="swatch">${imageBlock(p)}<span class="badge">${escapeHtml(p.patternType)}</span></div><div class="cardbody"><span class="sku">${escapeHtml(p.sku)}</span><h3>${escapeHtml(p.pattern)}</h3><p>${escapeHtml(p.fabrication)}</p><div class="cardmeta"><span>${escapeHtml(p.width)}</span><span>${escapeHtml(p.putup)}</span></div></div></button><button class="save-button" data-save="${escapeHtml(p.sku)}" aria-pressed="${RTC.has(p.sku)}">${RTC.has(p.sku)?'✓ Saved':'+ My Collection'}</button></article>`}
function updateOptions(){fields.forEach(f=>{const values=unique(PRODUCTS.map(p=>p[f]));const list=filtered(state,f);$(''+f).innerHTML=`<option value="">${labels[f]}</option>`+values.map(v=>{const n=list.filter(p=>p[f]===v).length;return n||state[f]===v?`<option value="${escapeHtml(v)}">${escapeHtml(v)} (${n})</option>`:''}).join('');$(f).value=state[f]})}
function renderColors(){const list=filtered(state,'color'),available=unique(list.flatMap(p=>p.colors));if(state.color&&!available.includes(state.color))available.push(state.color);$('colors').innerHTML='<span class="label">Color</span>'+['',...available].map(c=>`<button type="button" class="colorBtn" data-color="${escapeHtml(c)}" aria-pressed="${state.color===c}">${c?`<i class="dot" style="background:${COLOR_CHIPS[c]||'#ddd'}"></i>`:''}${escapeHtml(c||'All colors')}</button>`).join('')}
function renderChips(){const keys=['q',...fields,'color'];$('activeFilters').innerHTML=keys.filter(k=>state[k]).map(k=>`<button class="chip" data-clear="${k}" aria-label="Remove ${human[k]} filter">${human[k]}: ${escapeHtml(state[k])} ×</button>`).join('')}
function renderCollections(){const list=filtered();const fabs=unique(list.map(p=>p.fabrication));$('collectionCount').textContent=`${fabs.length} fabrications · ${list.length} items`;$('collectionGrid').innerHTML=fabs.map(fab=>{const ps=list.filter(p=>p.fabrication===fab);const preview=ps.filter(p=>p.imageKey).slice(0,3);return `<button class="collection" data-fab="${escapeHtml(fab)}">${preview.length?`<div class="collectionImages">${preview.map(imageBlock).join('')}</div>`:''}<div class="collectionbody"><h3>${escapeHtml(fab)}</h3>${(INTRO[fab]||[]).map(t=>`<p>${escapeHtml(t)}</p>`).join('')}<span class="available">Browse ${ps.length} available items</span></div></button>`}).join('')||'<div class="empty"><h3>No fabrications match these filters</h3><button class="plain" data-reset>Clear filters</button></div>'}
function relatedItems(p){
 const same=PRODUCTS.filter(r=>r.sku!==p.sku&&r.fabrication===p.fabrication&&r.familyKey&&r.familyKey===p.familyKey);
 const colorOverlap=r=>r.colors.some(c=>p.colors.includes(c)&&!['Unspecified','Multicolor'].includes(c));
 same.sort((a,b)=>Number(colorOverlap(b))-Number(colorOverlap(a))||Number(b.putup===p.putup)-Number(a.putup===p.putup)||Number(Boolean(b.imageKey))-Number(Boolean(a.imageKey))||a.sku.localeCompare(b.sku));
 if(same.length)return {label:p.patternType==='Solids'?'Solid colorways':'Related pattern colorways',note:'The same design family, with coordinating colors shown first.',items:same.slice(0,8)};
 const coordinating=PRODUCTS.filter(r=>r.sku!==p.sku&&r.fabrication===p.fabrication&&r.motif===p.motif&&r.patternType===p.patternType&&colorOverlap(r));
 coordinating.sort((a,b)=>Number(b.putup===p.putup)-Number(a.putup===p.putup)||Number(Boolean(b.imageKey))-Number(Boolean(a.imageKey)));
 return {label:'Coordinating patterns',note:'Similar motifs in the same color family.',items:coordinating.slice(0,4)};
}
function renderDetail(){const dlg=$('modal');if(!state.sku){if(dlg.open)dlg.close();return}const p=PRODUCTS.find(p=>p.sku===state.sku);if(!p)return;
 const specs=[['Category',p.category],['Fabrication',p.fabrication],['Pattern',p.patternType],['Motif',p.motif],['Width',p.width],['Weight',p.gsm==='Not specified'?'Not specified':p.gsm+' GSM'],['Put up',p.putup],['Color',p.color]];
 const r=relatedItems(p);
 $('detail').innerHTML=`<div class="detail"><div class="detailPic">${imageBlock(p)}</div><div class="detailBody"><div class="sku">${escapeHtml(p.sku)}</div><h2 id="detailTitle">${escapeHtml(p.pattern)}</h2><button class="button detail-save" data-save="${escapeHtml(p.sku)}">+ My Collection</button><div class="specs">${specs.map(([k,v])=>`<div class="spec"><small>${k}</small>${escapeHtml(v)}</div>`).join('')}</div></div></div><div class="related">${r.items.length?`<h3>${r.label}</h3><p>${r.note}</p><div class="relatedRow">${r.items.map(a=>`<button class="mini" data-sku="${escapeHtml(a.sku)}"><div class="miniPic">${imageBlock(a)}</div><div class="miniBody"><b>${escapeHtml(a.sku)}</b>${escapeHtml(a.pattern)}</div></button>`).join('')}</div>`:'<p class="noRelated">No other matching colorways are currently listed.</p>'}</div>`;
 if(!dlg.open)dlg.showModal();dlg.scrollTop=0;
}
function render(){const list=filtered();$('search').value=state.q;updateOptions();renderColors();renderChips();$('productsView').hidden=state.view!=='products';$('collectionsView').hidden=state.view!=='collections';document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});$('grid').innerHTML=list.length?list.map(card).join(''):'<div class="empty"><h3>No matching fabrics</h3><p>Return to your previous selection or clear the filters.</p><button class="plain" data-reset>Clear filters</button></div>';$('count').textContent=`${list.length} of ${PRODUCTS.length} items`;$('returnBtn').disabled=cursor===0;$('breadcrumb').textContent=state.view==='collections'?'Fabrications':state.fabrication||state.category||'All fabrics';if(state.view==='collections')renderCollections();renderDetail();RTC.sync()}
function navigate(patch){
 clearTimeout(searchTimer);states[cursor]={...state,scroll:window.scrollY||0};const next={...state,q:$('search').value.trim(),...patch};
 if(JSON.stringify(next)===JSON.stringify(state))return;
 const prior=state;states=states.slice(0,cursor+1);states.push(next);cursor++;state=next;
 window.history.pushState({rtcCatalogV3:true,cursor,states},'',location.pathname+(state.sku?'?sku='+encodeURIComponent(state.sku):''));render();
 if(patch.sku&&patch.sku!==prior.sku)RTC.track(prior.sku?'related_view':'product_view',{sku:patch.sku,originSku:prior.sku||'',entry:prior.sku?'colorway':'library'});
 for(const f of [...fields,'color'])if(f in patch&&patch[f]!==prior[f])RTC.track('filter_change',{filter:f,value:patch[f],resultCount:filtered().length});
 if('q' in patch&&patch.q!==prior.q)RTC.track('search',{resultCount:filtered().length});
 if(patch.fabrication&&patch.view==='products')RTC.track('fabrication_view',{fabrication:patch.fabrication});
}
function returnStep(){clearTimeout(searchTimer);if(cursor>0)history.back();else if(state.sku){state.sku='';states[0]={...state};history.replaceState({rtcCatalogV3:true,cursor:0,states},'',location.pathname);render()}}
function closeToResults(){let target=cursor-1;while(target>=0&&states[target].sku)target--;if(target>=0)history.go(target-cursor);else returnStep()}
function clearFilters(){navigate({...initial,view:state.view})}
if(history.state?.rtcCatalogV3&&Array.isArray(history.state.states)){states=history.state.states;cursor=history.state.cursor;state={...states[cursor]}}
else{const sku=new URLSearchParams(location.search).get('sku');if(PRODUCTS.some(p=>p.sku===sku)){state.sku=sku;states[0]={...state}}history.replaceState({rtcCatalogV3:true,cursor:0,states},'')}
window.addEventListener('popstate',e=>{if(e.state?.rtcCatalogV3){states=e.state.states;cursor=e.state.cursor;state={...states[cursor]};render();window.scrollTo(0,state.scroll||0)}});
$('filterForm').addEventListener('submit',e=>{e.preventDefault();navigate({q:$('search').value.trim(),sku:''})});$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>navigate({q:$('search').value.trim(),sku:''}),280)});fields.forEach(f=>$(f).addEventListener('change',()=>navigate({[f]:$(f).value,sku:''})));$('colors').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(b)navigate({color:b.dataset.color,sku:''})});$('activeFilters').addEventListener('click',e=>{const b=e.target.closest('[data-clear]');if(b)navigate({[b.dataset.clear]:'',sku:''})});$('returnBtn').addEventListener('click',returnStep);$('detailReturn').addEventListener('click',returnStep);$('closeDetail').addEventListener('click',closeToResults);$('clearBtn').addEventListener('click',clearFilters);
$('modal').addEventListener('cancel',e=>{e.preventDefault();returnStep()});$('modal').addEventListener('click',e=>{if(e.target===$('modal'))returnStep()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-sku]');if(b)navigate({sku:b.dataset.sku});if(e.target.closest('[data-reset]'))clearFilters();const view=e.target.closest('[data-view]');if(view)navigate({view:view.dataset.view,sku:''});const fab=e.target.closest('[data-fab]');if(fab)navigate({view:'products',fabrication:fab.dataset.fab,sku:''})});
render();
if(state.sku)RTC.track('product_view',{sku:state.sku,entry:'direct'});
