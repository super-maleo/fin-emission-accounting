// v12：配置项的新增 / 编辑 / 删除。排放源、填报指标、碳排放公式、组织与人员、用户角色、审批流程、字典单位、
// 私域因子、供应链因子、供应商、产品、PCR、减排目标、履约设施。加载顺序：v12-boot 之后。

// ---------- 通用 ----------
function v12C(){const v=v12();return v.cfg ||= {};}
function v12CK(key,init){const c=v12C();return c[key] ??= (init!==undefined?init:{add:[],edit:{},del:[]});}
function v12Save(msg){v12Persist();closeModal();render();if(msg)showToast(msg);}
function v12Ops(edit,del,extra){return '<span class="v12Ops">'+(extra||"")+(edit?'<button class="linkBtn" onclick="event.stopPropagation();'+edit+'">编辑</button>':'')+(del?'<button class="linkBtn bad" onclick="event.stopPropagation();'+del+'">删除</button>':'')+'</span>';}
function v12Confirm(title,msg,action){v12Modal(title,'<p class="v12ConfirmText">'+msg+'</p>','<button class="btn" data-close-modal="1">取消</button><button class="btn dangerBtn" onclick="'+action+'">删除</button>');}
function v12FormHtml(fields,vals={}) {
  return '<div class="modalForm">'+fields.map(f=>{
    const v=vals[f.k]??f.d??"",id="cf_"+f.k;let inp;
    if(f.opts){const o=typeof f.opts==="function"?f.opts():f.opts;
      inp='<select id="'+id+'"'+(f.ro?' disabled':'')+'>'+o.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return '<option value="'+v12H(val)+'" '+(String(val)===String(v)?'selected':'')+'>'+v12H(lab)+'</option>';}).join("")+'</select>';}
    else if(f.t==="area")inp='<textarea id="'+id+'" rows="'+(f.rows||3)+'"'+(f.ph?' placeholder="'+v12H(f.ph)+'"':'')+'>'+v12H(v)+'</textarea>';
    else inp='<input id="'+id+'"'+(f.t==="num"?' type="number" step="any"':f.t==="date"?' type="date"':'')+' value="'+v12H(v)+'"'+(f.ro?' readonly class="ro"':'')+(f.ph?' placeholder="'+v12H(f.ph)+'"':'')+'>';
    return v12Field('<span class="fl">'+f.l+(f.req?'<em class="req"> *</em>':'')+'</span>',inp,f.wide?"wide":"");
  }).join("")+'</div>';
}
function v12FormRead(fields) {
  const o={};
  for(const f of fields){let v=v12Val("cf_"+f.k);if(f.req&&v===""){showToast("请填写"+f.l);return null;}if(f.t==="num"&&v!=="")v=Number(v);o[f.k]=v;}
  return o;
}
// 「基础数据 + 新增 + 编辑 + 删除」合并
function v12Merge(key,base,idf) {
  const c=v12CK(key);
  return [...base.filter(r=>!c.del.includes(r[idf])).map(r=>c.edit[r[idf]]?{...r,...c.edit[r[idf]]}:r),...c.add.filter(r=>!c.del.includes(r[idf])).map(r=>c.edit[r[idf]]?{...r,...c.edit[r[idf]]}:r)];
}
function v12CrudSet(key,id,vals,idf,isNew) {
  const c=v12CK(key);
  if(isNew)c.add.push({...vals,[idf]:id,_new:1});
  else{const a=c.add.find(r=>r[idf]===id);if(a)Object.assign(a,vals);else c.edit[id]={...(c.edit[id]||{}),...vals};}
}
function v12CrudDel(key,id,idf) {
  const c=v12CK(key);
  const i=c.add.findIndex(r=>r[idf]===id);
  if(i>=0)c.add.splice(i,1);else if(!c.del.includes(id))c.del.push(id);
}
function v12Ref(n,what){showToast("已被 "+n+" "+what+"引用，需先解除引用后再删除");}

// ================= 排放源（填报任务的来源） =================
const v12WfBeforeCrud = workflowTasks;
workflowTasks = function () {
  const c=v12C(),del=c.srcDel||[],ed=c.srcEdit||{};
  return v12WfBeforeCrud().filter(t=>!del.includes(t.id)).map(t=>ed[t.id]?{...t,...ed[t.id]}:t);
};
const V12_SRC_MODES = ["任务填报","DCS / 实时数据库采集","ERP 结算导入","计量系统导入","能源转供台账"];
function v12SrcFields(isNew,t) {
  return [
    {k:"org",l:"所属组织",req:1,opts:()=>PETRO_ENTITIES.map(e=>e.org),d:v12State.orgSel&&v12State.orgSel!=="集团总部"?v12State.orgSel:"滨海石化分公司"},
    {k:"name",l:"排放源名称",req:1,ph:"如：3 号常压炉燃料气"},
    {k:"scope",l:"范围",opts:[["1","范围一"],["2","范围二"]],d:"1"},
    {k:"kind",l:"排放类别",opts:V12_KIND_RANK,d:"固定燃烧"},
    {k:"unit",l:"活动数据单位",req:1,d:"t"},
    {k:"method",l:"计算公式",opts:()=>Object.entries(PETRO_METHODS).map(([k,m])=>[k,m.label+" · "+m.formula.slice(0,26)]),d:"comb"},
    {k:"factor",l:"默认排放因子",t:"num",d:""},
    {k:"factorLabel",l:"因子说明",ph:"因子来源 / 参数"},
    {k:"mode",l:"数据采集方式",opts:V12_SRC_MODES,d:"任务填报"}
  ];
}
function v12SrcForm(id) {
  const t=id?workflowTasks().find(x=>x.id===id):null;
  const vals=t?{...t,kind:t.kind||XK_TASKS[t.id]?.kind||PETRO_SOURCES.find(s=>s.id===t.id)?.kind||"固定燃烧",mode:t.mode||XK_TASKS[t.id]?.mode||PETRO_SOURCES.find(s=>s.id===t.id)?.mode||"任务填报"}:{};
  v12Modal(t?"编辑排放源":"新增排放源",v12FormHtml(v12SrcFields(!t,t),vals)+(t?'':'<p class="v12Hint">保存后为所属组织生成本期填报任务。</p>'),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SrcSave(\''+(id||"")+'\')">保存</button>');
}
function v12SrcSave(id) {
  const v=v12FormRead(v12SrcFields(!id));if(!v)return;
  v.scope=String(v.scope);
  const created=(xk().created ||= {});
  if(!id){
    let n=Object.keys(created).length+1,nid;
    do{nid="T-S"+v.scope+"-N"+String(n++).padStart(2,"0");}while(created[nid]||workflowTasks().some(t=>t.id===nid));
    created[nid]={id:nid,...v,factor:v.factor||0,factorLabel:v.factorLabel||v.name};
    demo.taskEntries[nid]={activity:"",evidence:"",status:"待填报"};
    XK_TASKS[nid]={kind:v.kind,mode:v.mode};
    v12Save("排放源已新增，已生成填报任务 "+nid);return;
  }
  if(created[id]){Object.assign(created[id],v);}
  else{const c=v12C();(c.srcEdit ||= {})[id]={...(c.srcEdit[id]||{}),...v};}
  if(XK_TASKS[id])Object.assign(XK_TASKS[id],{kind:v.kind,mode:v.mode});
  v12Save("排放源已更新");
}
function v12SrcDel(id) {
  const t=workflowTasks().find(x=>x.id===id);if(!t)return;
  const e=taskEntry(t);
  v12Confirm("删除排放源","删除「"+v12H(t.name)+"」（"+v12H(t.org)+"）后，对应填报任务一并移除"+(e.activity?"，已填报的活动数据不再计入碳台账":"")+"。",'v12SrcDelDo(\''+id+'\')');
}
function v12SrcDelDo(id) {
  const created=xk().created||{};
  if(created[id])delete created[id];else{const c=v12C();(c.srcDel ||= []).includes(id)||c.srcDel.push(id);}
  v12Save("排放源已删除");
}
xkSourceLedger = function () {
  const tasks=workflowTasks().filter(t=>t.scope!=="3"&&!t.locked);
  const kinds={},modes={};
  PETRO_SOURCES.forEach(s=>{kinds[s.id]=s.kind;modes[s.id]=s.mode;});
  const org=v12State.srcOrg||"";
  const list=tasks.filter(t=>!org||t.org===org);
  const rows=list.map(t=>{const entry=taskEntry(t);const x=XK_TASKS[t.id];
    return ['<strong>'+textHtml(t.name)+'</strong><small>'+t.id+'</small>','范围'+["","一","二"][t.scope],t.kind||(x?x.kind:kinds[t.id])||"—",textHtml(t.org),'<span class="srcCell">'+textHtml(t.factorLabel||"")+'</span>',t.mode||(x?x.mode:modes[t.id])||"任务填报",entryStatus(entry.status),
      v12Admin()?v12Ops("v12SrcForm('"+t.id+"')","v12SrcDel('"+t.id+"')"):''];});
  const tool='<div class="taskToolbar"><label>组织<select onchange="v12Set(\'srcOrg\',this.value)"><option value="">全部组织</option>'+PETRO_ENTITIES.map(e=>'<option '+(e.org===org?'selected':'')+'>'+v12H(e.org)+'</option>').join("")+'</select></label><span>'+rows.length+' 个排放源</span></div>';
  return xkPanel("排放源台账",tool+xkTable(["排放源","范围","类别","组织","默认因子","采集方式","本期状态",""],rows),
    '<span class="v12BtnRow">'+(v12Admin()?'<button class="btn primary" onclick="v12SrcForm()">新增排放源</button>':'')+'<button class="btn" onclick="go(\'组织碳排放\',\'盘查准备\',\'能源转供\')">能源转供</button></span>');
};

// ================= 填报指标 =================
v12Indicators = function () {
  const map=new Map();
  workflowTasks().filter(t=>!String(t.id).startsWith("SUP-")).forEach(t=>{
    const k=t.scope+"|"+t.name;
    if(!map.has(k))map.set(k,{key:k,scope:t.scope,name:t.name,unit:t.unit,kind:t.scope==="3"?v12CatLabel(t.category):(t.kind||XK_TASKS[t.id]?.kind||PETRO_SOURCES.find(s=>s.id===t.id)?.kind||"固定燃烧"),category:t.category,method:t.method,factorLabel:t.factorLabel,orgs:[],ids:[]});
    const m=map.get(k);m.orgs.push(t.org);m.ids.push(t.id);
  });
  (v12C().indAdd||[]).forEach(x=>{const k=x.scope+"|"+x.name;if(!map.has(k))map.set(k,{...x,key:k,orgs:[],ids:[]});});
  return [...map.values()].sort((a,b)=>a.scope.localeCompare(b.scope)||(a.scope==="3"?String(a.category).localeCompare(String(b.category)):V12_KIND_RANK.indexOf(a.kind)-V12_KIND_RANK.indexOf(b.kind))||a.name.localeCompare(b.name,"zh"));
};
function v12IndFields() {
  return [{k:"name",l:"指标名称",req:1},{k:"scope",l:"范围",opts:[["1","范围一"],["2","范围二"],["3","范围三"]],d:v12State.indScope||"1"},
    {k:"kind",l:"排放类别",opts:()=>[...V12_KIND_RANK,...Object.keys(V12_S3_NAMES).map(c=>v12CatLabel(c))],d:"固定燃烧"},
    {k:"unit",l:"活动单位",req:1,d:"t"},{k:"method",l:"计算公式",opts:()=>[["","按范围三方法（E = AD × EF）"],...Object.entries(PETRO_METHODS).map(([k,m])=>[k,m.label])],d:"comb"},
    {k:"factorLabel",l:"默认因子 / 参数",ph:"如：实测 · 月度化验"}];
}
function v12IndForm(key) {
  const x=key?v12Indicators().find(i=>i.key===key):null;
  const fields=v12IndFields();
  if(!x)fields.push({k:"org",l:"下发组织",opts:()=>[["","暂不下发（在填报模板中勾选）"],...PETRO_ENTITIES.map(e=>e.org)],d:""});
  v12Modal(x?"编辑指标":"新增指标",v12FormHtml(fields,x||{})+(x&&x.ids.length?'<p class="v12Hint">修改将同步到引用该指标的 '+x.ids.length+' 个填报任务。</p>':''),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12IndSave(\''+v12Q(key||"")+'\')">保存</button>');
}
v12NewIndicator = function(){v12IndForm();};
function v12IndSave(key) {
  const x=key?v12Indicators().find(i=>i.key===key):null;
  const fields=v12IndFields();if(!x)fields.push({k:"org",l:"下发组织"});
  const v=v12FormRead(fields);if(!v)return;
  const s3=v.scope==="3",cat=s3?(Object.keys(V12_S3_NAMES).find(c=>v12CatLabel(c)===v.kind)||"C01"):"";
  const patch={name:v.name,unit:v.unit,method:v.method||undefined,factorLabel:v.factorLabel,...(s3?{category:cat}:{kind:v.kind})};
  if(x){
    const c=v12C(),created=xk().created||{};
    x.ids.forEach(id=>{if(created[id])Object.assign(created[id],patch);else (c.srcEdit ||= {})[id]={...(c.srcEdit?.[id]||{}),...patch};});
    const a=(c.indAdd||[]).find(i=>i.scope+"|"+i.name===key);if(a)Object.assign(a,patch,{scope:v.scope});
    v12Save("指标已更新");return;
  }
  if(v12Indicators().some(i=>i.scope===v.scope&&i.name===v.name)){showToast("同范围下已有同名指标");return;}
  if(v.org){
    const created=(xk().created ||= {});let n=Object.keys(created).length+1,nid;
    do{nid="T-S"+v.scope+"-N"+String(n++).padStart(2,"0");}while(created[nid]);
    created[nid]={id:nid,org:v.org,scope:v.scope,unit:v.unit,factor:0,...patch};demo.taskEntries[nid]={activity:"",evidence:"",status:"待填报"};
  } else (v12C().indAdd ||= []).push({scope:v.scope,...patch});
  v12State.indScope=v.scope;v12Save("指标已新增"+(v.org?"，已下发至 "+v.org:""));
}
function v12IndDel(key) {
  const x=v12Indicators().find(i=>i.key===key);if(!x)return;
  v12Confirm("删除指标","删除「"+v12H(x.name)+"」"+(x.ids.length?"，同时移除 "+new Set(x.orgs).size+" 个组织的 "+x.ids.length+" 个填报任务":"")+"。",'v12IndDelDo(\''+v12Q(key)+'\')');
}
function v12IndDelDo(key) {
  const x=v12Indicators().find(i=>i.key===key),c=v12C(),created=xk().created||{};
  x.ids.forEach(id=>{if(created[id])delete created[id];else (c.srcDel ||= []).push(id);});
  c.indAdd=(c.indAdd||[]).filter(i=>i.scope+"|"+i.name!==key);
  v12Save("指标已删除");
}
v12IndicatorPage = function () {
  const all=v12Indicators(),s=v12State.indScope||"1";
  const list=all.filter(x=>x.scope===s);
  let last="",n=0;const rows=[];
  list.forEach(x=>{if(x.kind!==last){last=x.kind;rows.push({cls:"v12GroupRow",cells:['<b>'+v12H(x.kind)+'</b>',"","","","","",""]});}
    rows.push([String(++n).padStart(2,"0"),'<strong>'+v12H(x.name)+'</strong>',v12H(x.unit),x.method&&PETRO_METHODS[x.method]?'<span class="v12Code">'+v12H(PETRO_METHODS[x.method].formula)+'</span>':x.scope==="3"?'<span class="v12Code">E = AD × EF</span>':'—','<small>'+v12H(String(x.factorLabel||"").replace(/^[^·]*·\s*/,"").slice(0,30))+'</small>',
      x.orgs.length?new Set(x.orgs).size+' 家<small>'+v12H([...new Set(x.orgs)].slice(0,3).join("、"))+'</small>':'<span class="muted">未下发</span>',v12Ops("v12IndForm('"+v12Q(x.key)+"')","v12IndDel('"+v12Q(x.key)+"')")]);});
  return v12Head("填报指标",'<button class="btn primary" onclick="v12IndForm()">新增指标</button>')+
    '<div class="statRow">'+[["1","范围一"],["2","范围二"],["3","范围三"]].map(([k,l])=>v12Kpi(l,String(all.filter(x=>x.scope===k).length),"项指标","v12Set('indScope','"+k+"')")).join("")+v12Kpi("合计",String(all.length),"项")+'</div>'+
    v12Tabs([["1","范围一 直接排放",all.filter(x=>x.scope==="1").length],["2","范围二 能源间接",all.filter(x=>x.scope==="2").length],["3","范围三 价值链",all.filter(x=>x.scope==="3").length]],s,"v12IndScope")+
    v12Panel("指标清单",v12Table(["序号","指标","活动单位","计算公式","默认因子 / 参数","适用组织",""],rows,{nopage:true}));
};

// ================= 碳排放公式 =================
const V12_FM_S1 = ["comb","flare","flareCH4","fcc","regen","h2","eth","eo","asph","calc","acid","vent","fug","gwp","rec","recCH4"],V12_FM_S2=["elec","heat","green"];
const V12_FM_CONST = [["K01","C → CO₂","44/12","碳与二氧化碳分子量比"],["K02","CO₂ 密度","19.7 tCO₂/万Nm³","标准状况"],["K03","CH₄ 密度","7.17 tCH₄/万Nm³","标准状况"],["K04","GWP CH₄","21 / 28 / 27.9","国内指南 / ISO 14064 / GHG Protocol AR6"],["K05","电网排放因子","0.5703 tCO₂/MWh","全国电网平均"]];
function v12FmBase() {
  return [...[...V12_FM_S1,...V12_FM_S2].filter(k=>PETRO_METHODS[k]).map(k=>{const m=PETRO_METHODS[k];return {id:k,scope:V12_FM_S2.includes(k)?"2":"1",name:m.label,formula:m.formula,params:m.fields.map(f=>f[1]+(f[2]?"（"+f[2]+"）":"")).join("；")};}),
    ...V12_S3_METHODS.map(r=>({id:r[0],scope:"3",name:r[1].replace(/^类别\d+ /,""),method:r[2],formula:r[3]})),
    ...V12_FM_CONST.map(r=>({id:r[0],scope:"K",name:r[1],formula:r[2],params:r[3]}))];
}
function v12Formulas(){return v12Merge("formula",v12FmBase(),"id");}
function v12FmRefs(f){const ts=workflowTasks();return f.scope==="3"?ts.filter(t=>t.scope==="3"&&t.category===f.id).length:f.scope==="K"?0:ts.filter(t=>t.method===f.id).length;}
function v12FmFields(scope){return [{k:"scope",l:"分类",opts:[["1","范围一 直接排放"],["2","范围二 能源间接排放"],["3","范围三 价值链排放"],["K","通用常数"]],d:scope||"1"},{k:"name",l:scope==="K"?"常数名称":"名称",req:1},
  ...(scope==="3"?[{k:"method",l:"核算方法",d:"平均数据法"}]:[]),{k:"formula",l:scope==="K"?"数值":"计算公式",req:1,wide:1,ph:"如：E = AD × EF × 44/12"},{k:"params",l:scope==="K"?"说明":"参数",t:"area",rows:2,wide:1,ph:"多个参数用；分隔"}];}
function v12FmForm(id,scope) {
  const f=id?v12Formulas().find(x=>x.id===id):null;scope=f?.scope||scope||"1";
  v12Modal(f?"编辑公式":"新增公式",v12FormHtml(v12FmFields(scope),f||{scope})+(f&&v12FmRefs(f)?'<p class="v12Hint">已被 '+v12FmRefs(f)+' 个填报指标引用，保存后下一次计算生效。</p>':''),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12FmSave(\''+(id||"")+'\',\''+scope+'\')">保存</button>');
  document.getElementById("cf_scope").onchange=e=>{if(!id)v12FmForm("",e.target.value);};
}
function v12FmSave(id,scope) {
  const v=v12FormRead(v12FmFields(scope));if(!v)return;
  if(id){v12CrudSet("formula",id,v,"id");if(PETRO_METHODS[id]){PETRO_METHODS[id].label=v.name;PETRO_METHODS[id].formula=v.formula;}v12Save("公式已更新");return;}
  const nid=(v.scope==="K"?"K":"F")+"-U"+Date.now().toString().slice(-5);
  v12CrudSet("formula",nid,v,"id",true);v12Save("公式已新增");
}
function v12FmDel(id) {
  const f=v12Formulas().find(x=>x.id===id),n=v12FmRefs(f);
  if(n){v12Ref(n,"个填报指标");return;}
  v12Confirm("删除公式","删除「"+v12H(f.name)+"」。",'v12CrudDel(\'formula\',\''+id+'\',\'id\');v12Save(\'公式已删除\')');
}
function v12ApplyFormulas(){Object.entries(v12CK("formula").edit).forEach(([k,v])=>{if(PETRO_METHODS[k]){if(v.name)PETRO_METHODS[k].label=v.name;if(v.formula)PETRO_METHODS[k].formula=v.formula;}});}
v12FormulaPage = function () {
  const all=v12Formulas();
  const sec=(scope,title,heads,cells)=>v12Panel(title,v12Table([...heads,"引用",""],all.filter(f=>f.scope===scope).map((f,i)=>[...cells(f,i),scope==="K"?"—":v12FmRefs(f)+" 项",v12Ops("v12FmForm('"+f.id+"')","v12FmDel('"+f.id+"')")]),{nopage:true,empty:"暂无"}),
    '<button class="btn" onclick="v12FmForm(\'\',\''+scope+'\')">新增</button>');
  const code=(f,i)=>f.scope==="3"&&/^C\d+$/.test(f.id)?"类别 "+Number(f.id.slice(1)):String(i+1).padStart(2,"0");
  return v12Head("碳排放公式",'<button class="btn primary" onclick="v12FmForm()">新增公式</button>')+
    sec("1","范围一 直接排放",["编号","排放类型","计算公式","参数"],(f,i)=>[code(f,i),'<strong>'+v12H(f.name)+'</strong>','<span class="v12Code">'+v12H(f.formula)+'</span>','<small>'+v12H(f.params||"—").replace(/；/g,"<br>")+'</small>'])+
    sec("2","范围二 能源间接排放",["编号","排放类型","计算公式","参数"],(f,i)=>[code(f,i),'<strong>'+v12H(f.name)+'</strong>','<span class="v12Code">'+v12H(f.formula)+'</span>','<small>'+v12H(f.params||"—").replace(/；/g,"<br>")+'</small>'])+
    sec("3","范围三 价值链排放",["类别","名称","核算方法","计算公式"],(f,i)=>[code(f,i),'<strong>'+v12H(f.name)+'</strong>',v12H(f.method||"—"),'<span class="v12Code">'+v12H(f.formula)+'</span>'])+
    sec("K","通用常数",["编号","常数","数值","说明"],(f,i)=>[code(f,i),'<strong>'+v12H(f.name)+'</strong>',v12H(f.formula),v12H(f.params||"")]);
};

// ================= 组织与人员 =================
let v12OrgApplied=false;
function v12ApplyOrgs() {
  const c=v12C();
  (c.orgAdd||[]).forEach(o=>{if(!PETRO_ENTITIES.some(e=>e.org===o.org))PETRO_ENTITIES.push(o);});
  Object.entries(c.orgEdit||{}).forEach(([org,v])=>{const e=PETRO_ENTITIES.find(x=>x.org===org);if(e)Object.assign(e,v);});
  (c.orgDel||[]).forEach(org=>{const i=PETRO_ENTITIES.findIndex(e=>e.org===org);if(i>=0)PETRO_ENTITIES.splice(i,1);});
  PETRO_ENTITIES.forEach(e=>{if(e.units)e.units=e.units.map(u=>u.replace(/^(\d) 号机组$/,"$1 号发电机组"));});
}
function v12OrgFields(e,isNew) {
  const hasData=e&&!isNew&&(workflowTasks().some(t=>t.org===e.org)||v12Detail(CURRENT_YEAR).some(r=>r.org===e.org));
  return [{k:"org",l:"组织名称",req:1,ro:hasData},{k:"code",l:"组织编码",req:1},
    {k:"seg",l:"所属板块",opts:()=>PETRO_SEGMENTS.map(s=>[s.id,s.name])},
    {k:"parent",l:"上级组织",opts:()=>[["","（板块直属）"],...PETRO_ENTITIES.filter(x=>!x.parent&&x.seg!=="HQ"&&x.org!==e?.org).map(x=>x.org)]},
    {k:"region",l:"所在地"},{k:"owner",l:"填报人"},{k:"control",l:"控制关系",opts:["全资（运营控制）","控股","合营","联营"],d:"全资（运营控制）"},
    {k:"capacity",l:"生产规模",wide:1},{k:"unitsText",l:"主要装置",wide:1,ph:"多个装置用、分隔"}];
}
function v12OrgForm(org,parent,seg) {
  const e=org?petroEntity(org):null;
  const p=parent?petroEntity(parent):null;
  const segD=seg||(p&&p.seg!=="HQ"?p.seg:"RF");
  const vals=e?{...e,unitsText:(e.units||[]).join("、"),control:e.control||"全资（运营控制）"}:{seg:segD,parent:p&&p.seg!=="HQ"?(p.parent||p.org):"",code:segD+"-"};
  v12Modal(e?"编辑组织":"新增组织",v12FormHtml(v12OrgFields(e,!e),vals)+(e&&v12OrgFields(e)[0].ro?'<p class="v12Hint">已有填报数据的组织不能改名，如需更名请走组织变更（新增新组织并迁移排放源）。</p>':''),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12OrgSave(\''+v12Q(org||"")+'\')">保存</button>');
}
function v12OrgSave(org) {
  const e=org?petroEntity(org):null;
  const v=v12FormRead(v12OrgFields(e,!e));if(!v)return;
  const ent={org:v.org,code:v.code,seg:v.seg,region:v.region,owner:v.owner,control:v.control,capacity:v.capacity,units:v.unitsText?v.unitsText.split(/[、,，]/).map(s=>s.trim()).filter(Boolean):[],...(v.parent?{parent:v.parent}:{})};
  const c=v12C();
  if(!e){
    if(petroEntity(v.org)){showToast("组织名称已存在");return;}
    (c.orgAdd ||= []).push({...ent,ets:false,added:true});v12ApplyOrgs();v12State.orgSel=v.org;v12Save("组织已新增");return;
  }
  const add=(c.orgAdd||[]).find(o=>o.org===org);
  if(!v.parent)delete e.parent;
  if(add){if(!v.parent)delete add.parent;Object.assign(add,ent);Object.assign(e,ent);if(org!==v.org)v12State.orgSel=v.org;}
  else{const patch={...ent};delete patch.org;(c.orgEdit ||= {})[org]={...(c.orgEdit[org]||{}),...patch,...(v.parent?{}:{parent:undefined})};Object.assign(e,patch);}
  v12Save("组织已更新");
}
function v12OrgDel(org) {
  const kids=PETRO_ENTITIES.filter(x=>x.parent===org).length,tasks=workflowTasks().filter(t=>t.org===org).length,rows=v12Detail(CURRENT_YEAR).filter(r=>r.org===org).length;
  if(kids){showToast("请先删除或迁移 "+kids+" 个下级组织");return;}
  if(tasks||rows){showToast("该组织有 "+(tasks||rows)+" 项填报任务 / 排放数据，需先删除其排放源后再删除组织");return;}
  v12Confirm("删除组织","删除「"+v12H(org)+"」及其人员权限配置。",'v12OrgDelDo(\''+v12Q(org)+'\')');
}
function v12OrgDelDo(org) {
  const c=v12C();
  if((c.orgAdd||[]).some(o=>o.org===org))c.orgAdd=c.orgAdd.filter(o=>o.org!==org);else (c.orgDel ||= []).push(org);
  const i=PETRO_ENTITIES.findIndex(e=>e.org===org);if(i>=0)PETRO_ENTITIES.splice(i,1);
  v12State.orgSel="集团总部";v12Save("组织已删除");
}
const v12OrgPeopleBase = v12OrgPeople;
v12OrgPeople = function (org) {
  const c=v12CK("people");
  const base=v12OrgPeopleBase(org).map(p=>({id:org+"|"+p[0],name:p[0],role:p[1],perm:p[2],scope:p[3]}));
  return v12Merge("people",base,"id").filter(p=>p.id.startsWith(org+"|")||p.org===org);
};
function v12PeopleFields(){return [{k:"name",l:"姓名",req:1},{k:"role",l:"角色",opts:()=>v12AllRoles().map(r=>r.name),d:"企业员工"},{k:"perm",l:"权限",ph:"如：填报、上传凭证"},{k:"scope",l:"数据范围",d:"本单位全部指标"}];}
function v12PeopleForm(id) {
  const org=v12State.orgSel||"集团总部",p=id?v12OrgPeople(org).find(x=>x.id===id):null;
  v12Modal(p?"编辑人员":"添加人员 · "+v12H(org),v12FormHtml(v12PeopleFields(),p||{}),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12PeopleSave(\''+v12Q(id||"")+'\')">保存</button>');
}
function v12PeopleSave(id) {
  const v=v12FormRead(v12PeopleFields());if(!v)return;const org=v12State.orgSel||"集团总部";
  if(id)v12CrudSet("people",id,v,"id");else v12CrudSet("people",org+"|"+v.name+"|"+Date.now().toString().slice(-4),{...v,org},"id",true);
  v12Save(id?"人员权限已更新":"人员已添加，账号开通邀请已发送");
}
function v12PeopleDel(id){const p=v12OrgPeople(v12State.orgSel||"集团总部").find(x=>x.id===id);v12Confirm("移除人员","移除「"+v12H(p.name)+"」在该组织的权限。",'v12CrudDel(\'people\',\''+v12Q(id)+'\',\'id\');v12Save(\'已移除\')');}
v12AddPerson = function(){v12PeopleForm();};
v12AddOrg = function(){v12OrgForm("",v12State.orgSel||"集团总部");};
v12OrgPage = function () {
  const sel=petroEntity(v12State.orgSel)?v12State.orgSel:"集团总部";
  const act=(org,canEdit,canDel,seg)=>'<span class="v12TOps"><button title="新增下级" onclick="event.stopPropagation();v12OrgForm(\'\',\''+v12Q(org||"")+'\',\''+(seg||"")+'\')">＋</button>'+
    (canEdit?'<button title="编辑" onclick="event.stopPropagation();v12OrgForm(\''+v12Q(org)+'\')">✎</button>':'')+(canDel?'<button title="删除" class="bad" onclick="event.stopPropagation();v12OrgDel(\''+v12Q(org)+'\')">✕</button>':'')+'</span>';
  const node=(x,cls)=>'<div class="v12TN'+(cls||"")+(x.org===sel?' active':'')+'" onclick="v12Set(\'orgSel\',\''+v12Q(x.org)+'\')"><span class="nm">'+v12H(x.org)+(x.merged?'<small>'+x.merged+' 家</small>':'')+'</span>'+act(x.org,true,true)+'</div>';
  const tree='<div class="v12Tree"><div class="root v12TN'+(sel==="集团总部"?' active':'')+'" onclick="v12Set(\'orgSel\',\'集团总部\')"><span class="nm">北辰石油天然气集团有限公司</span>'+act("集团总部",true,false)+'</div>'+
    PETRO_SEGMENTS.filter(s=>s.id!=="HQ").map(s=>'<div class="seg"><div class="segH"><span><i style="background:'+s.color+'"></i>'+v12H(s.name)+'</span><span class="v12TOps"><button title="新增组织" onclick="event.stopPropagation();v12OrgForm(\'\',\'\',\''+s.id+'\')">＋</button></span></div>'+
      PETRO_ENTITIES.filter(x=>x.seg===s.id&&!x.parent).map(x=>node(x)+PETRO_ENTITIES.filter(c=>c.parent===x.org).map(c=>node(c," child")).join("")).join("")+'</div>').join("")+'</div>';
  const tasks=workflowTasks().filter(t=>t.org===sel);
  const people=v12OrgPeople(sel);
  const right=v12Panel("人员与权限 <small>"+v12H(sel==="集团总部"?"北辰石油天然气集团有限公司":sel)+"</small>",v12Table(["姓名","角色","权限","数据范围",""],people.map(p=>['<strong>'+v12H(p.name)+'</strong>',v12Tag(p.role,p.role==="企业员工"?"blue":p.role==="外部供应商"?"gray":"ok"),v12H(p.perm||"—"),v12H(p.scope||"—"),v12Ops("v12PeopleForm('"+v12Q(p.id)+"')","v12PeopleDel('"+v12Q(p.id)+"')")]),{nopage:true,empty:"暂无人员"}),'<button class="btn" onclick="v12PeopleForm()">添加人员</button>')+
    v12Panel("填报配置",'<div class="v12Counts">'+[["范围一",tasks.filter(t=>t.scope==="1").length],["范围二",tasks.filter(t=>t.scope==="2").length],["范围三",tasks.filter(t=>t.scope==="3").length],["凭证",tasks.length?"必传":"—"]].map(([l,v])=>'<div><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>'+
      '<dl class="v12KV"><div><dt>填报频次</dt><dd>月度 · 次月 10 日前</dd></div><div><dt>审批流</dt><dd>填报 → 单位审核 → 集团复核 → 计入碳台账</dd></div></dl>',
      '<button class="btn" onclick="v12State.srcOrg=\''+v12Q(sel)+'\';go(\'组织碳排放\',\'盘查准备\',\'排放源\')">排放源</button>'+(tasks.length?'<button class="btn" onclick="go(\'基础配置\',\'指标模板配置\',\'填报模板\');setTimeout(()=>v12OpenTpl(\''+v12Q(sel)+'\'),50)">编辑模板</button>':''));
  return v12Head("组织与权限",'<button class="btn primary" onclick="v12OrgForm(\'\',\''+v12Q(sel)+'\')">新增组织</button>')+'<div class="v12OrgLayout">'+v12Panel("组织架构",tree)+'<div>'+right+'</div></div>';
};

// ================= 用户与角色 =================
const V12_USERS0 = [["高文博","ESG管理员","集团 ESG 管理部","启用"],["赵海峰","企业员工","滨海石化分公司","启用"],["刘建平","企业员工","松原油田分公司","启用"],["孙卫东","企业员工","西部管道分公司 / 集团总部","启用"],
  ["陈思远","ESG管理员","集团物资采购中心","启用"],["林雪","ESG管理员","石油化工研究院","启用"],["王建国","ESG管理员","滨海石化热电厂","启用"],["渤海钢管制造有限公司","外部供应商","外部","启用"],["华东催化剂有限公司","外部供应商","外部","启用"],["何立新","企业员工","陇原石化分公司","待激活"]];
function v12Users(){return v12Merge("users",V12_USERS0.map(u=>({id:u[0],name:u[0],role:u[1],org:u[2],status:u[3]})),"id");}
function v12AllRoles(){const c=v12C();return [...V12_ROLES.map(r=>({id:r.id,name:r.name,builtIn:true})),...(c.roles||[])];}
function v12Perm(id){const c=v12C();return (c.perm||{})[id]||V12_PERM[id]||V12_PERM_MODS.map(()=>"—");}
function v12UserFields(){return [{k:"name",l:"姓名 / 单位",req:1},{k:"mail",l:"账号（邮箱）"},{k:"role",l:"角色",opts:()=>v12AllRoles().map(r=>r.name)},{k:"org",l:"所属组织",opts:()=>[...PETRO_ENTITIES.map(e=>e.org),"集团 ESG 管理部","集团物资采购中心","外部"]},{k:"status",l:"状态",opts:["启用","待激活","停用"],d:"待激活"}];}
function v12UserForm(id){const u=id?v12Users().find(x=>x.id===id):null;v12Modal(u?"编辑用户":"新增用户",v12FormHtml(v12UserFields(),u||{}),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12UserSave(\''+v12Q(id||"")+'\')">保存</button>');}
function v12UserSave(id){const v=v12FormRead(v12UserFields());if(!v)return;if(id)v12CrudSet("users",id,v,"id");else{if(v12Users().some(u=>u.name===v.name)){showToast("用户已存在");return;}v12CrudSet("users",v.name+"#"+Date.now().toString().slice(-4),v,"id",true);}v12Save(id?"用户已更新":"用户已新增，激活邮件已发送");}
function v12UserDel(id){const u=v12Users().find(x=>x.id===id);v12Confirm("删除用户","删除账号「"+v12H(u.name)+"」，其历史操作记录保留。",'v12CrudDel(\'users\',\''+v12Q(id)+'\',\'id\');v12Save(\'用户已删除\')');}
function v12RoleForm(id) {
  const r=id?v12AllRoles().find(x=>x.id===id):null,perm=id?v12Perm(id):V12_PERM_MODS.map(()=>"—");
  const opts=["—","查看","查看本单位","填报","初审","审核","管理"];
  v12Modal(r?"编辑角色 · "+v12H(r.name):"新增角色",'<div class="modalForm">'+v12Field("角色名称",'<input id="rlName" value="'+v12H(r?.name||"")+'"'+(r?.builtIn?' readonly class="ro"':'')+'>')+
    V12_PERM_MODS.map((m,i)=>v12Field(m,'<select data-perm="'+i+'">'+opts.map(o=>'<option '+(o===perm[i]?'selected':'')+'>'+o+'</option>').join("")+'</select>')).join("")+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12RoleSave(\''+(id||"")+'\')">保存</button>');
}
function v12RoleSave(id) {
  const name=v12Val("rlName");if(!name){showToast("请填写角色名称");return;}
  const perm=[...document.querySelectorAll("[data-perm]")].map(s=>s.value),c=v12C();
  if(!id){id="R"+Date.now().toString().slice(-5);(c.roles ||= []).push({id,name});}
  else{const cr=(c.roles||[]).find(x=>x.id===id);if(cr)cr.name=name;}
  (c.perm ||= {})[id]=perm;v12Save("角色权限已保存");
}
function v12RoleDel(id){const r=v12AllRoles().find(x=>x.id===id),n=v12Users().filter(u=>u.role===r.name).length;if(n){v12Ref(n,"个用户");return;}
  v12Confirm("删除角色","删除角色「"+v12H(r.name)+"」。",'v12RoleDelDo(\''+id+'\')');}
function v12RoleDelDo(id){const c=v12C();c.roles=(c.roles||[]).filter(r=>r.id!==id);delete (c.perm||{})[id];v12Save("角色已删除");}
v12RolePage = function () {
  const users=v12Users();
  return v12Head("用户角色",'<button class="btn" onclick="v12RoleForm()">新增角色</button><button class="btn primary" onclick="v12UserForm()">新增用户</button>')+
    v12Panel("角色权限矩阵",v12Table(["角色",...V12_PERM_MODS,""],v12AllRoles().map(r=>['<strong>'+v12H(r.name)+'</strong>',...v12Perm(r.id).map(p=>p==="—"?'<span class="muted">—</span>':v12Tag(p,/管理|审核|初审/.test(p)?"ok":/填报/.test(p)?"blue":"gray")),v12Ops("v12RoleForm('"+r.id+"')",r.builtIn?"":"v12RoleDel('"+r.id+"')")]),{nopage:true}))+
    v12Panel("用户账号",v12Table(["姓名 / 单位","角色","所属组织","状态",""],users.map(u=>['<strong>'+v12H(u.name)+'</strong>',v12H(u.role),v12H(u.org),v12Tag(u.status,u.status==="启用"?"ok":u.status==="停用"?"gray":"warn"),
      v12Ops("v12UserForm('"+v12Q(u.id)+"')","v12UserDel('"+v12Q(u.id)+"')",'<button class="linkBtn" onclick="showToast(\'已重置密码并发送邮件\')">重置密码</button>')])));
};

// ================= 审批流程 =================
const V12_FLOW_META = {"组织碳填报":["退回后重新进入单位审核","超时 3 日自动提醒上级"],"供应商碳数据":["退回后由供应商修改再提交","截止前 7 日、1 日提醒"],"LCA 模型发布":["发布后修改生成新版本","—"],"碳盘查报告":["核查意见需逐条关闭","按年度计划"],"配额清缴":["资金审批不通过退回方案","截止前 30 日启动"]};
function v12Flows(){return v12Merge("flows",V12_FLOWS.map(([name,steps,sla])=>({id:name,name,steps,sla,back:V12_FLOW_META[name]?.[0]||"",remind:V12_FLOW_META[name]?.[1]||""})),"id");}
function v12FlowForm(id) {
  const f=id?v12Flows().find(x=>x.id===id):{steps:[["提交",""],["审核",""],["归档","自动"]]};
  v12Modal(id?"流程配置 · "+v12H(f.name):"新增审批流程",v12FormHtml([{k:"name",l:"流程名称",req:1},{k:"sla",l:"办理时限",ph:"如：5 个工作日 / 节点"},{k:"back",l:"退回规则"},{k:"remind",l:"催办规则"}],f)+
    '<h4 class="v12H4">审批节点</h4><div class="v12FlowEdit" id="flowNodes">'+f.steps.map(s=>v12FlowNode(s)).join("")+'</div><button class="btn" onclick="document.getElementById(\'flowNodes\').insertAdjacentHTML(\'beforeend\',v12FlowNode([\'\',\'\']))">添加节点</button>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12FlowSave(\''+v12Q(id||"")+'\')">保存</button>');
}
function v12FlowNode(s){return '<div class="v12FN"><input placeholder="节点名称" value="'+v12H(s[0])+'"><input placeholder="处理人 / 岗位" value="'+v12H(s[1])+'"><button class="linkBtn bad" onclick="this.parentNode.remove()">删除</button></div>';}
function v12FlowSave(id) {
  const v=v12FormRead([{k:"name",l:"流程名称",req:1},{k:"sla"},{k:"back"},{k:"remind"}]);if(!v)return;
  const steps=[...document.querySelectorAll("#flowNodes .v12FN")].map(d=>[...d.querySelectorAll("input")].map(i=>i.value.trim())).filter(s=>s[0]);
  if(steps.length<2){showToast("至少需要 2 个节点");return;}
  if(id)v12CrudSet("flows",id,{...v,steps},"id");else v12CrudSet("flows","FL-"+Date.now().toString().slice(-5),{...v,steps},"id",true);
  v12Save("审批流程已保存");
}
function v12FlowDel(id){const f=v12Flows().find(x=>x.id===id);v12Confirm("删除审批流程","删除「"+v12H(f.name)+"」，进行中的单据按原流程办结。",'v12CrudDel(\'flows\',\''+v12Q(id)+'\',\'id\');v12Save(\'流程已删除\')');}
v12FlowPage = function () {
  const cnt={"组织碳填报":workflowTasks().length+" 项任务","供应商碳数据":v12SupTasksAll().length+" 项任务","LCA 模型发布":demo.lcaModels.length+" 个模型","碳盘查报告":"1 份年度报告","配额清缴":"1 个履约周期"};
  return v12Head("审批流程",'<button class="btn primary" onclick="v12FlowForm()">新增流程</button>')+'<div class="v12FlowGrid">'+v12Flows().map(f=>v12Panel(v12H(f.name)+' <small>'+v12H(f.sla||"")+'</small>',
    '<div class="v12FlowDef">'+v12Steps(f.steps,-1)+'</div><dl class="v12FlowMeta"><div><dt>本年度</dt><dd>'+(cnt[f.id]||"—")+'</dd></div><div><dt>退回规则</dt><dd>'+v12H(f.back||"—")+'</dd></div><div><dt>催办</dt><dd>'+v12H(f.remind||"—")+'</dd></div></dl>',
    '<button class="btn" onclick="v12FlowForm(\''+v12Q(f.id)+'\')">配置</button><button class="btn" onclick="v12FlowDel(\''+v12Q(f.id)+'\')">删除</button>')).join("")+'</div>';
};

// ================= 字典单位 =================
function v12UnitCat(u){return /kWh|MWh|GWh/.test(u)?"电量":/GJ|TJ|MJ|kcal/.test(u)?"热量":/Nm³|m³|L|升/.test(u)?"体积":/km|公里/.test(u)?"距离":/元|万元/.test(u)?"货币":/^t$|^kg$|吨|^g$|^t\b/.test(u)?"质量":/人|间夜/.test(u)?"人次":"其他";}
function v12Units() {
  const refs={};
  workflowTasks().forEach(t=>{if(t.unit)(refs[t.unit] ||= new Set()).add(t.name);});
  (backendState.data?.factors||[]).forEach(f=>{if(f.unit)(refs[f.unit] ||= new Set()).add(f.name);});
  const conv={"t":["kg","1000"],"kg":["t","0.001"],"MWh":["kWh","1000"],"万kWh":["kWh","10000"],"万Nm³":["Nm³","10000"],"GJ":["MJ","1000"],"TJ":["GJ","1000"]};
  const base=Object.keys(refs).sort((a,b)=>refs[b].size-refs[a].size).map(u=>({id:u,unit:u,cat:v12UnitCat(u),base:conv[u]?.[0]||u,k:conv[u]?.[1]||"1",note:""}));
  return v12Merge("units",base,"id").map(u=>({...u,refs:refs[u.unit]||new Set()}));
}
function v12UnitFields(){return [{k:"unit",l:"单位符号",req:1,ph:"如 万Nm³"},{k:"cat",l:"量纲",opts:["质量","体积","热量","电量","距离","货币","人次","其他"]},{k:"base",l:"基准单位",req:1},{k:"k",l:"换算系数（1 单位 = ? 基准单位）",req:1,d:"1"},{k:"note",l:"说明",wide:1}];}
function v12UnitForm(id){const u=id?v12Units().find(x=>x.id===id):null;v12Modal(u?"编辑单位":"新增单位",v12FormHtml(v12UnitFields(),u||{}),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12UnitSave(\''+v12Q(id||"")+'\')">保存</button>');}
function v12UnitSave(id){const v=v12FormRead(v12UnitFields());if(!v)return;if(!id&&v12Units().some(u=>u.unit===v.unit)){showToast("单位已存在");return;}if(id)v12CrudSet("units",id,v,"id");else v12CrudSet("units",v.unit,v,"id",true);v12Save("单位已保存");}
function v12UnitDel(id){const u=v12Units().find(x=>x.id===id);if(u.refs.size){v12Ref(u.refs.size,"个指标 / 因子");return;}v12Confirm("删除单位","删除单位「"+v12H(u.unit)+"」。",'v12CrudDel(\'units\',\''+v12Q(id)+'\',\'id\');v12Save(\'单位已删除\')');}
function v12UnitPage() {
  const list=v12Units(),cat=v12State.unitCat||"";
  const cats=[...new Set(list.map(u=>u.cat))];
  return v12Head("字典单位",'<button class="btn" onclick="exportFirstTable()">导出</button><button class="btn primary" onclick="v12UnitForm()">新增单位</button>')+
    v12Seg([["","全部"],...cats.map(c=>[c,c])],cat,"v12UnitCatSet")+
    v12Panel("计量单位",v12Table(["单位","量纲","基准单位","换算系数","引用","引用示例","说明",""],list.filter(u=>!cat||u.cat===cat).map(u=>['<strong>'+v12H(u.unit)+'</strong>',u.cat,v12H(u.base),v12H(u.k),u.refs.size,'<small>'+v12H([...u.refs].slice(0,3).join("、"))+'</small>',v12H(u.note||""),v12Ops("v12UnitForm('"+v12Q(u.id)+"')","v12UnitDel('"+v12Q(u.id)+"')")])));
}
function v12UnitCatSet(c){v12Set("unitCat",c);}

// ================= 企业私域因子 / 供应链因子 =================
const v12PrivFactorsBase = v12PrivFactors;
v12PrivFactors = function(){return v12Merge("pf",v12PrivFactorsBase(),"id");};
function v12PfFields(){return [{k:"name",l:"因子名称",req:1},{k:"cat",l:"类别",opts:["固定燃烧","热电联产","工业过程","火炬燃烧","逸散","电力","供应链","产品碳足迹"]},{k:"value",l:"因子值",t:"num",req:1},{k:"unit",l:"单位",req:1},
  {k:"site",l:"适用单位",opts:()=>PETRO_ENTITIES.map(e=>e.org)},{k:"valid",l:"有效期"},{k:"status",l:"状态",opts:["启用","已核查","已存证","待审核","停用"]},{k:"basis",l:"计算依据",t:"area",rows:2,wide:1}];}
function v12PfForm(id){const f=v12PrivFactors().find(x=>x.id===id);v12Modal("编辑私域因子",v12FormHtml(v12PfFields(),f),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12PfSave(\''+v12Q(id)+'\')">保存</button>');}
function v12PfSave(id){const v=v12FormRead(v12PfFields());if(!v)return;const u=(v12().privFactors||[]).find(x=>x.id===id);if(u)Object.assign(u,v);else v12CrudSet("pf",id,v,"id");v12Save("因子已更新");}
function v12PfDel(id){const f=v12PrivFactors().find(x=>x.id===id);v12Confirm("删除私域因子","删除「"+v12H(f.name)+"」，已引用该因子的填报任务改用公共因子库缺省值。",'v12PfDelDo(\''+v12Q(id)+'\')');}
function v12PfDelDo(id){const v=v12();if((v.privFactors||[]).some(x=>x.id===id))v.privFactors=v.privFactors.filter(x=>x.id!==id);else v12CrudDel("pf",id,"id");v12Save("因子已删除");}
v12PrivatePage = function () {
  const list=v12PrivFactors(),f=v12State.pfCat||"";
  const cats=[...new Set(list.map(r=>r.cat))];
  const rows=list.filter(r=>!f||r.cat===f).map(r=>['<span class="v12Code0">'+r.id+'</span>',v12H(r.cat),'<strong>'+v12H(r.name)+'</strong>','<b>'+r.value+'</b> '+v12H(r.unit),v12H(r.site),'<small title="'+v12H(r.basis)+'">'+v12H(String(r.basis).length>26?String(r.basis).slice(0,26)+"…":r.basis)+'</small>',v12H(r.valid),v12Tag(r.status,["已核查","已存证","启用"].includes(r.status)?"ok":r.status==="停用"?"gray":"warn"),v12Ops("v12PfForm('"+v12Q(r.id)+"')","v12PfDel('"+v12Q(r.id)+"')")]);
  return v12Head("企业私域因子库",'<button class="btn primary" onclick="v12FactorBuilder()">因子建模</button>')+
    '<div class="statRow">'+v12Kpi("私域因子",String(list.length),"条")+v12Kpi("实测燃料因子",String(list.filter(r=>r.cat==="固定燃烧").length),"条")+v12Kpi("热电联产分摊",String(list.filter(r=>r.cat==="热电联产").length),"条")+v12Kpi("自建模型",String((v12().privFactors||[]).length),"条")+'</div>'+
    v12Seg([["","全部"],...cats.map(c=>[c,c])],f,"v12PfCat")+v12Panel("因子清单",v12Table(["编号","类别","因子名称","因子值","适用单位","计算依据","有效期","状态",""],rows));
};
const v12SupplyFactorPageBase = v12SupplyFactorPage;
function v12SfRows() {
  const rows=[];
  supplyScope3Items.forEach(r=>{const a=demo.approvedSuppliers?.[r.id];if(a)rows.push({sup:r.supplier,item:r.part,value:a.unitCarbon,unit:"kgCO₂e/"+a.unit,src:"供应商一手数据 · V"+(a.version||1),valid:xk().validity?.[r.id]?xk().validity[r.id].from+" 至 "+xk().validity[r.id].to:"—",status:"有效"});});
  v12SupTasksRaw().filter(t=>t.status==="通过").forEach(t=>rows.push({sup:t.supplier,item:t.item,value:t.unitCarbon,unit:"kgCO₂e/"+t.unit,src:(t.method||"")+" · "+(t.evidence||""),valid:CURRENT_YEAR+"-01 至 "+CURRENT_YEAR+"-12",status:"有效"}));
  v12SupTasksRaw().filter(t=>t.status==="待审核").forEach(t=>rows.push({sup:t.supplier,item:t.item,value:t.unitCarbon,unit:"kgCO₂e/"+t.unit,src:(t.method||"")+" · 审核中",valid:"—",status:"审核中"}));
  return v12Merge("sf",rows.map(r=>({...r,id:r.sup+"|"+r.item})),"id");
}
function v12SfFields(){return [{k:"sup",l:"供应商",req:1,opts:()=>v12Suppliers().map(s=>s.name)},{k:"item",l:"物资",req:1},{k:"value",l:"因子值",t:"num",req:1},{k:"unit",l:"单位",d:"kgCO₂e/t"},{k:"src",l:"来源",wide:1},{k:"valid",l:"有效期",d:CURRENT_YEAR+"-01 至 "+CURRENT_YEAR+"-12"},{k:"status",l:"状态",opts:["有效","审核中","停用"]}];}
function v12SfForm(id){const r=id?v12SfRows().find(x=>x.id===id):null;v12Modal(r?"编辑供应链因子":"新增供应链因子",v12FormHtml(v12SfFields(),r||{}),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SfSave(\''+v12Q(id||"")+'\')">保存</button>');}
function v12SfSave(id){const v=v12FormRead(v12SfFields());if(!v)return;if(id)v12CrudSet("sf",id,v,"id");else v12CrudSet("sf",v.sup+"|"+v.item+"|"+Date.now().toString().slice(-4),{...v,src:v.src||"手工录入"},"id",true);v12Save("供应链因子已保存");}
function v12SfDel(id){const r=v12SfRows().find(x=>x.id===id);v12Confirm("删除供应链因子","删除「"+v12H(r.sup)+" · "+v12H(r.item)+"」，下一核算周期该物资改按行业平均因子 / 支出法计算。",'v12CrudDel(\'sf\',\''+v12Q(id)+'\',\'id\');v12Save(\'已删除\')');}
v12SupplyFactorPage = function () {
  const rows=v12SfRows();
  return v12Head("供应链因子",'<button class="btn" onclick="go(\'供应链碳排放\',\'数据收集与审核\')">数据收集</button><button class="btn primary" onclick="v12SfForm()">新增因子</button>')+
    '<div class="statRow">'+v12Kpi("供应链因子",String(rows.filter(r=>r.status==="有效").length),"条有效")+v12Kpi("审核中",String(rows.filter(r=>r.status==="审核中").length),"条")+v12Kpi("覆盖供应商",String(new Set(rows.map(r=>r.sup)).size),"家")+'</div>'+
    v12Panel("供应商特定因子",v12Table(["供应商","物资","因子值","来源","有效期","状态",""],rows.map(r=>['<strong>'+v12H(r.sup)+'</strong>',v12H(r.item),'<b>'+r.value+'</b> '+v12H(r.unit),'<small>'+v12H(r.src)+'</small>',v12H(r.valid),v12Tag(r.status,r.status==="有效"?"ok":r.status==="停用"?"gray":"blue"),v12Ops("v12SfForm('"+v12Q(r.id)+"')","v12SfDel('"+v12Q(r.id)+"')")])));
};

// ================= 供应商 / 产品 / PCR / 目标 / 设施 =================
const v12SuppliersBase = v12Suppliers;
v12Suppliers = function () {
  const all=v12SuppliersBase(),c=v12C(),del=c.supDel||[],ed=c.supEdit||{};
  return all.filter(s=>!del.includes(s.name)).map(s=>ed[s.name]?Object.assign(s,ed[s.name]):s);
};
function v12SupEditFields(){return [{k:"name",l:"供应商名称",ro:1},{k:"cat",l:"物资类别",opts:()=>V12_SUP_CATS},{k:"region",l:"地区"},{k:"tier",l:"分级",opts:["战略","重要","一般"]},{k:"spend",l:"年采购额（万元）",t:"num"},
  {k:"category",l:"范围三类别",opts:()=>["C01","C02","C04","C09"].map(c=>[c,v12CatLabel(c)])},{k:"contactName",l:"碳数据联系人"},{k:"mail",l:"联系邮箱"}];}
function v12SupForm(code){const s=v12Sup(code);v12Modal("编辑供应商",v12FormHtml(v12SupEditFields(),{...s,contactName:s.contactName||s.contact}),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SupSave(\''+v12Q(s.name)+'\')">保存</button>');}
function v12SupSave(name){const v=v12FormRead(v12SupEditFields());if(!v)return;delete v.name;const c=v12C();(c.supEdit ||= {})[name]={...(c.supEdit[name]||{}),...v};v12SupRefresh();v12Save("供应商信息已更新");}
function v12SupDel(code){const s=v12Sup(code),n=v12SupTasksAll().filter(t=>t.supplier===s.name&&t.status!=="通过").length;
  if(n){v12Ref(n,"个进行中的收集任务");return;}
  v12Confirm("删除供应商","删除「"+v12H(s.name)+"」，已入库的供应链因子保留至有效期结束。",'v12SupDelDo(\''+v12Q(s.name)+'\')');}
function v12SupDelDo(name){const v=v12(),c=v12C();if((v.suppliers||[]).some(s=>s.name===name))v.suppliers=v.suppliers.filter(s=>s.name!==name);else (c.supDel ||= []).push(name);v12SupRefresh();v12Save("供应商已删除");}
const v12ProductsBase = v12Products;
v12Products = function(){const c=v12C(),del=c.prodDel||[],ed=c.prodEdit||{};return v12ProductsBase().filter(p=>!del.includes(p.code)).map(p=>ed[p.code]?{...p,...ed[p.code]}:p);};
function v12ProdFields(){return [{k:"code",l:"产品编码",ro:1},{k:"name",l:"产品名称",req:1},{k:"line",l:"产品线",opts:()=>[...new Set(PRODUCT_CATALOG.map(p=>p[2]))]},{k:"fu",l:"功能单位"},{k:"sales",l:"年销量 (t)",t:"num"},{k:"org",l:"生产单位",opts:()=>PETRO_ENTITIES.filter(e=>e.seg!=="HQ").map(e=>e.org)}];}
function v12ProdForm(code){const p=v12Products().find(x=>x.code===code);v12Modal("编辑产品",v12FormHtml(v12ProdFields(),p),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12ProdSave(\''+v12Q(code)+'\')">保存</button>');}
function v12ProdSave(code){const v=v12FormRead(v12ProdFields());if(!v)return;delete v.code;const m=(v12().products||[]).find(p=>p.code===code);if(m)Object.assign(m,v);else{const c=v12C();(c.prodEdit ||= {})[code]={...(c.prodEdit[code]||{}),...v};}v12Save("产品已更新");}
function v12ProdDel(code){const p=v12Products().find(x=>x.code===code);if(p.model){showToast("该产品已有 LCA 模型「"+p.model.name+"」，需先删除模型");return;}
  v12Confirm("删除产品","删除产品「"+v12H(p.name)+"」。",'v12ProdDelDo(\''+v12Q(code)+'\')');}
function v12ProdDelDo(code){const v=v12();if((v.products||[]).some(p=>p.code===code))v.products=v.products.filter(p=>p.code!==code);else{const c=v12C();(c.prodDel ||= []).push(code);}v12Save("产品已删除");}
const v12PcrsBase = xkPcrs;
xkPcrs = function(){const c=v12C(),del=c.pcrDel||[],ed=c.pcrEdit||{};return v12PcrsBase().filter(p=>!del.includes(p.id)).map(p=>ed[p.id]?{...p,...ed[p.id]}:p);};
function v12PcrFields(){return [{k:"code",l:"编号",req:1},{k:"name",l:"名称",req:1,wide:1},{k:"org",l:"发布机构"},{k:"scope",l:"适用产品"},{k:"unit",l:"功能 / 声明单位"},{k:"boundary",l:"系统边界",opts:()=>XK_BOUNDARIES},{k:"valid",l:"有效期"},{k:"status",l:"状态",opts:["有效","编制中","已废止"]}];}
function v12PcrForm(id){const p=xkPcrs().find(x=>x.id===id);v12Modal("编辑 PCR",v12FormHtml(v12PcrFields(),p),'<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12PcrSave(\''+v12Q(id)+'\')">保存</button>');}
function v12PcrSave(id){const v=v12FormRead(v12PcrFields());if(!v)return;const u=(xk().pcrs||[]).find(p=>p.id===id);if(u)Object.assign(u,v);else{const c=v12C();(c.pcrEdit ||= {})[id]={...(c.pcrEdit[id]||{}),...v};}v12Save("PCR 已更新");}
function v12PcrDel(id){const p=xkPcrs().find(x=>x.id===id),n=demo.lcaModels.filter(m=>xkModelMeta(m).pcr===id).length;if(n){v12Ref(n,"个 LCA 模型");return;}
  v12Confirm("删除 PCR","删除「"+v12H(p.name)+"」。",'v12PcrDelDo(\''+v12Q(id)+'\')');}
function v12PcrDelDo(id){const x=xk();if((x.pcrs||[]).some(p=>p.id===id))x.pcrs=x.pcrs.filter(p=>p.id!==id);else{const c=v12C();(c.pcrDel ||= []).push(id);}v12Save("PCR 已删除");}
v12PcrRulePage = function () {
  const list=xkPcrs(),models=demo.lcaModels;
  return v12Head("PCR 规则库",'<button class="btn primary" onclick="xkOpenPcrNew()">新增 PCR</button>','基础配置 / 指标模板配置 / PCR 规则库')+
    '<div class="statRow">'+v12Kpi("PCR",String(list.length),"项 · 有效 "+list.filter(p=>p.status==="有效").length)+v12Kpi("已关联模型",String(models.filter(m=>xkPcrOf(m)).length)+" / "+models.length,"个模型")+v12Kpi("编制中",String(list.filter(p=>p.status==="编制中").length),"项")+'</div>'+
    v12Panel("产品类别规则",v12Table(["编号","名称","发布机构","适用产品","功能 / 声明单位","系统边界","有效期","状态","关联模型",""],list.map(p=>{
      const used=models.filter(m=>xkModelMeta(m).pcr===p.id);
      return [v12H(p.code),'<strong>'+v12H(p.name)+'</strong>',v12H(p.org),v12H(p.scope),v12H(p.unit),v12H(p.boundary),v12H(p.valid),v12Tag(p.status,p.status==="有效"?"ok":p.status==="已废止"?"gray":"warn"),used.length?used.map(m=>v12H(m.name)).join("、"):'—',
        v12Ops("v12PcrForm('"+v12Q(p.id)+"')","v12PcrDel('"+v12Q(p.id)+"')",'<button class="linkBtn" onclick="xkOpenPcr(\''+p.id+'\')">要求</button>')];}),{nopage:true}));
};
function v12DelTarget(id){const t=v12Targets().items.find(x=>x.id===id);v12Confirm("删除目标","删除减排目标「"+v12H(t.name)+"」及其年度分解。",'v12DelTargetDo(\''+id+'\')');}
function v12DelTargetDo(id){const cfg=v12Targets();cfg.items=cfg.items.filter(x=>x.id!==id);if(v12State.targetSel===id)v12State.targetSel="";v12Save("目标已删除");}
// 履约设施：编辑
const v12NewFacilityBase = v12NewFacility;
function v12EditFacility(id) {
  const f=v12FacCustom().find(x=>x.id===id);if(!f)return;
  v12NewFacilityBase();
  document.querySelector("#modalContent h2").textContent="编辑履约设施";
  [["nfName","name"],["nfType","type"],["nfOrg","org"],["nfMarket","market"],["nfStatus","status"],["nfSince","since"],["nfSpec","spec"],["nfMethod","method"]].forEach(([el,k])=>{const n=document.getElementById(el);if(n&&f[k]&&f[k]!=="—")n.value=f[k];});
  const b=document.querySelector("#modalContent .modalActions .btn.primary");if(b)b.setAttribute("onclick","v12SaveFacilityEdit('"+id+"')");
}
function v12SaveFacilityEdit(id){const f=v12FacCustom().find(x=>x.id===id),name=v12Val("nfName");if(!name){showToast("请填写设施名称");return;}
  Object.assign(f,{name,type:v12Val("nfType"),org:v12Val("nfOrg"),market:v12Val("nfMarket"),status:v12Val("nfStatus"),since:v12Val("nfSince")||"—",spec:v12Val("nfSpec"),method:v12Val("nfMethod")});v12Save("设施已更新");}

Object.assign(V12_PAGES,{"基础配置|系统设置|字典单位":()=>v12UnitPage()});
delete V12_LEGACY["基础配置|系统设置|字典单位"];

// 首次渲染时套用组织 / 公式的配置变更
const v12RenderBeforeCrud = render;
render = function () {
  if(backendState.ready&&!v12OrgApplied){v12OrgApplied=true;try{v12ApplyOrgs();v12ApplyFormulas();}catch(e){console.error(e);}}
  return v12RenderBeforeCrud.apply(this,arguments);
};
(function(){
  const css=`
.v12BtnRow{display:inline-flex;gap:8px}.v12Ops{display:inline-flex;gap:10px;white-space:nowrap}.linkBtn.bad{color:#D92D20}.btn.dangerBtn{background:#D92D20;border-color:#D92D20;color:#fff}.v12ConfirmText{margin:4px 0 8px;line-height:1.7}
.modalForm input.ro{background:#F2F4F7;color:#667085}.modalForm em.req{color:#D92D20;font-style:normal}
.v12Tree .v12TN{display:flex;align-items:center;justify-content:space-between;gap:6px}.v12Tree .v12TN .nm{flex:1;min-width:0;display:flex;justify-content:space-between;gap:6px}
.v12Tree .segH{display:flex;align-items:center;justify-content:space-between}.v12TOps{display:inline-flex;gap:2px;opacity:0;transition:opacity .15s}
.v12Tree .v12TN:hover .v12TOps,.v12Tree .segH:hover .v12TOps,.v12Tree .v12TN.active .v12TOps{opacity:1}
.v12TOps button{border:0;background:transparent;width:22px;height:22px;border-radius:4px;color:#667085;cursor:pointer;font-size:12px;line-height:22px;padding:0}.v12TOps button:hover{background:#E8F2DA;color:#26890D}.v12TOps button.bad:hover{background:#FEE4E2;color:#D92D20}
.v12FlowEdit{display:grid;gap:8px;margin-bottom:10px}.v12FN{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center}.v12FN input{height:34px;border:1px solid var(--line);border-radius:6px;padding:0 10px}
`;
  document.head.insertAdjacentHTML("beforeend","<style id=\"v12crud\">"+css+"</style>");
})();
const v12DelFacilityDo = v12DelFacility;
v12DelFacility = function(id){const f=v12FacCustom().find(x=>x.id===id);v12Confirm("删除履约设施","删除「"+v12H(f?.name||"")+"」及其监测数据。",'v12DelFacilityDo(\''+id+'\')');};
