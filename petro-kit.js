// 石化行业页面：填报任务按核算指南参数录入、行业核算明细（计算书）、组织架构、看板行业指标。
// 加载顺序：expert-kit.js 之后、export-kit.js 之前。

const PETRO_OUTPUT = {
  crude:{label:"原油产量",value:10570,unit:"万 t",orgs:{"松原油田分公司":2950,"鄂南油气田分公司":2560,"塔河油田分公司":760,"其他油气田企业":4300}},
  gas:{label:"天然气产量",value:1428,unit:"亿 m³",orgs:{"松原油田分公司":58,"鄂南油气田分公司":520,"塔河油田分公司":330,"其他油气田企业":520}},
  refining:{label:"原油加工量",value:17650,unit:"万 t",orgs:{"滨海石化分公司":2000,"陇原石化分公司":1050,"天山石化分公司":1000,"其他炼化企业":13600}},
  ethylene:{label:"乙烯产量",value:860,unit:"万 t",orgs:{"滨海石化分公司":120,"陇原石化分公司":80,"天山石化分公司":220,"其他炼化企业":440}},
  pipeline:{label:"管输天然气",value:1980,unit:"亿 m³"}
};
let petroOrg = "滨海石化分公司";
let petroMethodFilter = "";

function petroRows(org) {
  return workflowTasks().filter(t=>t.petro&&(!org||t.org===org)).map(t=>{
    const entry=taskEntry(t);const src=petroSource(t.id);
    const ad=Number(entry.activity)||0;
    return {t,src,entry,ad,calc:petroCalc(src,entry.params,ad)};
  });
}
function petroSum(rows,approvedOnly=false){return rows.filter(r=>!approvedOnly||r.entry.status==="通过").reduce((s,r)=>s+r.calc.co2e,0);}
function petroWan(v,d=1){return fmt(v/10000,d);}

// ---------- 填报：按指南参数录入 ----------
function petroParamForm(task,entry,readonly) {
  const src=petroSource(task.id);
  const m=PETRO_METHODS[src.method];
  const p={...src.params,...(entry.params||{})};
  if(!m.fields.length)return "";
  return '<div class="ptParams"><div class="ptParamsHead"><b>'+textHtml(m.label)+'</b><code>'+textHtml(m.formula)+'</code><span>'+textHtml(PETRO_GUIDES[src.guide])+'</span></div>'+
    '<div class="ptParamGrid">'+m.fields.map(([key,label,unit])=>'<label>'+textHtml(label)+(unit?'<small>'+textHtml(unit.replace("单位",task.unit))+'</small>':'')+
      '<input type="number" step="any" data-pt-param="'+key+'" value="'+p[key]+'" oninput="petroPreview()" '+(readonly?'readonly':'')+'></label>').join("")+'</div>'+
    (src.params.ref?'<p class="ptRef">参数来源 · '+textHtml(src.params.ref)+'</p>':'')+'<div id="ptSteps" class="ptSteps"></div></div>';
}
function petroReadParams() {
  const out={};
  document.querySelectorAll("[data-pt-param]").forEach(input=>{const v=Number(input.value);if(Number.isFinite(v))out[input.dataset.ptParam]=v;});
  return out;
}
function petroPreview() {
  const src=petroSource(openTaskId);
  if(!src)return;
  const ad=Number(document.getElementById("taskActivity")?.value);
  const box=document.getElementById("taskPreview");
  const steps=document.getElementById("ptSteps");
  if(!(ad>0)){if(box)box.innerHTML="录入活动量后自动计算排放";if(steps)steps.innerHTML="";return;}
  const c=petroCalc(src,petroReadParams(),ad);
  if(box)box.innerHTML="预计排放 <b>"+fmt(c.co2e,1)+" tCO₂e</b>"+(c.ch4?" · 其中 CH₄ "+fmt(c.ch4,1)+" t × GWP "+c.gwp:"")+" · 审核通过后计入核算";
  if(steps)steps.innerHTML=c.steps.map(s=>'<span>'+textHtml(s)+'</span>').join("")+'<span class="ptTotal">'+(c.co2?"CO₂ "+fmt(c.co2,1)+" t":"")+(c.co2&&c.ch4?" · ":"")+(c.ch4?"CH₄ "+fmt(c.ch4,1)+" t":"")+'</span>';
}
const openUnifiedTaskBeforePetro = openUnifiedTask;
openUnifiedTask = function (id,review) {
  openUnifiedTaskBeforePetro(id,review);
  try {
    const task=workflowTasks().find(t=>t.id===id);
    if(!task?.petro)return;
    const entry=taskEntry(task);
    const readonly=currentRole!=="填报人"||["通过","待审核","不适用"].includes(entry.status);
    const src=petroSource(id);
    const ctx=document.querySelector("#modalContent .taskContext");
    if(ctx)ctx.insertAdjacentHTML("beforeend",'<span>'+textHtml(src.kind)+'</span>'+(src.facility?'<span>'+textHtml(src.facility)+'</span>':''));
    const preview=document.getElementById("taskPreview");
    if(preview)preview.insertAdjacentHTML("beforebegin",petroParamForm(task,entry,readonly));
    const act=document.getElementById("taskActivity");
    if(act)act.setAttribute("oninput","petroPreview()");
    const label=act?.closest("label");
    if(label&&label.firstChild?.nodeType===3)label.firstChild.textContent=({comb:"燃料消耗量",flare:"火炬气量",flareCH4:"火炬气量",fcc:"烧焦量",regen:"待再生催化剂量",h2:"原料投入量",eth:"烧焦尾气量",eo:"乙烯原料用量",asph:"氧化沥青产量",calc:"生焦投入量",acid:"原料气处理量",vent:"放空气量",fug:"设施数量",rec:"回收气量",recCH4:"回收气量",elec:"净购入电量",heat:"净购入热量",green:"发电量",gwp:"补充量"}[src.method]||"活动数据")+"（"+task.unit+"）";
    petroPreview();
  } catch(error){console.error(error);}
};
const saveUnifiedTaskBeforePetro = saveUnifiedTask;
saveUnifiedTask = async function (submit) {
  const src=petroSource(openTaskId);
  if(src&&document.querySelector("[data-pt-param]")) {
    const params=petroReadParams();
    const bad=Object.entries(params).find(([k,v])=>v<0||(["of","pur","vin","vout","vch4","vco2","pco2","pco","cf"].includes(k)&&v>1));
    if(bad){showToast("参数超出合理范围，请检查「"+PETRO_METHODS[src.method].fields.find(f=>f[0]===bad[0])[1]+"」");return;}
    demo.taskEntries[openTaskId]={...(demo.taskEntries[openTaskId]||{activity:"",evidence:"",status:"待填报"}),params:{...src.params,...params}};
  }
  return saveUnifiedTaskBeforePetro(submit);
};

// ---------- 行业核算明细（计算书） ----------
function petroCalcPage() {
  const orgs=PETRO_ENTITIES.filter(e=>workflowTasks().some(t=>t.org===e.org&&t.petro));
  if(!orgs.some(e=>e.org===petroOrg))petroOrg=orgs[0].org;
  const ent=petroEntity(petroOrg);
  const seg=PETRO_SEGMENTS.find(s=>s.id===ent.seg);
  const all=petroRows(petroOrg);
  const rows=all.filter(r=>!petroMethodFilter||r.src.kind===petroMethodFilter);
  const kinds=[...new Set(all.map(r=>r.src.kind))];
  const byKind=k=>all.filter(r=>r.src.kind===k).reduce((s,r)=>s+r.calc.co2e,0);
  const total=petroSum(all),approved=petroSum(all,true);
  const ch4=all.reduce((s,r)=>s+r.calc.ch4,0);
  const rec=all.filter(r=>r.src.method==="rec"||r.src.method==="recCH4").reduce((s,r)=>s+r.calc.co2e,0);
  const guide=PETRO_GUIDES[ent.ets?"发电":seg.guide];
  const max=Math.max(...kinds.map(k=>Math.abs(byKind(k))),1);
  return pageHead("行业核算明细",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 核算分析 / 行业核算明细")+
    '<div class="ptOrgBar">'+PETRO_SEGMENTS.filter(s=>orgs.some(e=>e.seg===s.id)).map(s=>'<div class="ptOrgGroup"><span style="border-color:'+s.color+'">'+s.name+'</span>'+
      orgs.filter(e=>e.seg===s.id).map(e=>'<button class="'+(e.org===petroOrg?'active':'')+'" onclick="petroOrg=\''+e.org+'\';petroMethodFilter=\'\';render()">'+textHtml(e.org.replace("分公司",""))+'</button>').join("")+'</div>').join("")+'</div>'+
    '<div class="xkBar"><span>核算主体 <b>'+textHtml(ent.org)+'</b></span><span>'+textHtml(ent.capacity)+'</span><span>适用指南 <b>'+textHtml(guide)+'</b></span><span>CH₄ GWP <b>'+petroGwpCH4()+'</b>（随核算口径）</span></div>'+
    '<div class="statRow">'+statTile("排放合计",petroWan(total)+" 万","tCO₂e · 范围一 + 范围二")+statTile("已审核",petroWan(approved)+" 万","tCO₂e · "+all.filter(r=>r.entry.status==="通过").length+" / "+all.length+" 项")+
      statTile("甲烷排放",fmt(ch4,0)+" t","CH₄ · 折 "+petroWan(ch4*petroGwpCH4())+" 万 tCO₂e")+statTile("回收扣减",rec?petroWan(rec)+" 万":"—","tCO₂e · CO₂ / CH₄ 回收利用")+'</div>'+
    '<div class="homeGrid"><section class="panel"><div class="panelHead"><h3>按排放类别</h3>'+(petroMethodFilter?'<button class="linkBtn" onclick="petroMethodFilter=\'\';render()">全部 ›</button>':'')+'</div>'+
      '<div class="meterList">'+kinds.map(k=>{const v=byKind(k);return '<button class="meterRow'+(petroMethodFilter===k?' active':'')+'" onclick="petroMethodFilter=\''+k+'\';render()"><span class="meterLabel">'+k+'<small>'+all.filter(r=>r.src.kind===k).length+' 项排放源</small></span><span class="meterTrack"><i style="width:'+Math.max(Math.abs(v)/max*100,1.5)+'%;background:'+(v<0?'#2C6AA0':seg.color)+'"></i></span><span class="meterValue">'+petroWan(v)+' <small>万 tCO₂e</small></span></button>';}).join("")+'</div></section>'+
    '<section class="panel"><div class="panelHead"><h3>核算公式</h3></div><div class="ptFormulaList">'+[...new Set(all.map(r=>r.src.method))].map(m=>'<div><b>'+PETRO_METHODS[m].label+'</b><code>'+textHtml(PETRO_METHODS[m].formula)+'</code></div>').join("")+'</div></section></div>'+
    rows.map(r=>{
      const m=PETRO_METHODS[r.src.method];
      const p={...r.src.params,...(r.entry.params||{})};
      return '<section class="panel ptCalc"><div class="panelHead"><h3>'+textHtml(r.t.name)+' <small>'+r.t.id+' · '+textHtml(r.src.kind)+'</small></h3>'+entryStatus(r.entry.status)+'</div>'+
        '<div class="ptCalcBody"><dl>'+
          '<div><dt>活动数据</dt><dd>'+(r.ad?fmt(r.ad,2)+' '+textHtml(r.t.unit):'<span class="badText">未填报</span>')+'</dd></div>'+
          m.fields.map(([k,label,unit])=>'<div><dt>'+textHtml(label)+'</dt><dd>'+p[k]+(unit?' <small>'+textHtml(unit.replace("单位",r.t.unit))+'</small>':'')+'</dd></div>').join("")+
          '<div><dt>数据来源</dt><dd>'+textHtml(r.src.mode||"—")+'</dd></div><div><dt>凭证</dt><dd>'+textHtml(r.entry.evidence||"—")+'</dd></div></dl>'+
          '<div class="ptWork"><code>'+textHtml(m.formula)+'</code>'+r.calc.steps.map(s=>'<span>'+textHtml(s)+'</span>').join("")+
          '<b>= '+(r.calc.co2?fmt(r.calc.co2,1)+' tCO₂':'')+(r.calc.co2&&r.calc.ch4?' + ':'')+(r.calc.ch4?fmt(r.calc.ch4,1)+' tCH₄ × '+r.calc.gwp:'')+' = '+fmt(r.calc.co2e,1)+' tCO₂e</b></div></div>'+
        '<div class="ptCalcFoot"><span>'+textHtml(r.src.facility||ent.capacity)+'</span><button class="btn" onclick="openUnifiedTask(\''+r.t.id+'\')">'+(currentRole==="管理者"&&r.entry.status==="待审核"?"审核":"查看任务")+'</button></div></section>';
    }).join("");
}

// ---------- 组织架构 ----------
function petroOrgPage() {
  const rows=petroRows();
  const sumOrg=org=>rows.filter(r=>r.t.org===org).reduce((s,r)=>s+r.calc.co2e,0);
  const total=rows.reduce((s,r)=>s+r.calc.co2e,0);
  const done=org=>{const list=rows.filter(r=>r.t.org===org);return list.filter(r=>r.entry.status==="通过").length+" / "+list.length;};
  return pageHead("组织架构",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 盘查准备 / 组织架构")+
    '<div class="xkBar"><span>报告主体 <b>'+PETRO_GROUP+'</b></span><span>合并方法 <b>运营控制权法</b></span><span>纳入企业 <b>'+(PETRO_ENTITIES.reduce((s,e)=>s+(e.merged||1),0))+'</b> 家</span><span>二级单位 <b>'+PETRO_ENTITIES.length+'</b> 个</span></div>'+
    '<div class="ptTree">'+PETRO_SEGMENTS.map(seg=>{
      const ents=PETRO_ENTITIES.filter(e=>e.seg===seg.id);
      const segSum=ents.reduce((s,e)=>s+sumOrg(e.org),0);
      return '<section class="ptSeg" style="--seg:'+seg.color+'"><header><b>'+seg.name+'</b><span>'+textHtml(PETRO_GUIDES[seg.guide])+'</span><em>'+petroWan(segSum)+' 万 tCO₂e · '+(total?(segSum/total*100).toFixed(1):0)+'%</em></header>'+
        '<div class="ptEnts">'+ents.map(e=>'<article class="'+(e.parent?'child':'')+'"><div class="ptEntHead"><strong>'+textHtml(e.org)+'</strong>'+(e.ets?xkStatus("全国碳市场","ok"):'')+(e.merged?xkStatus(e.merged+" 家合并报送","gray"):'')+'</div>'+
          '<p>'+textHtml(e.capacity)+'</p><div class="ptUnits">'+e.units.map(u=>'<span>'+textHtml(u)+'</span>').join("")+'</div>'+
          '<footer><span>'+textHtml(e.region)+' · 填报人 '+textHtml(e.owner)+'</span><span>'+petroWan(sumOrg(e.org))+' 万 t · 已审核 '+done(e.org)+'</span>'+
          '<button class="linkBtn" onclick="petroOrg=\''+e.org+'\';petroMethodFilter=\'\';go(\'组织碳排放\',\'核算分析\',\'行业核算明细\')">核算明细 ›</button></footer></article>').join("")+'</div></section>';
    }).join("")+'</div>';
}

// ---------- 看板：板块结构与行业强度指标 ----------
function petroIndicators() {
  const rows=petroRows();
  const segSum=id=>rows.filter(r=>r.src.seg===id).reduce((s,r)=>s+r.calc.co2e,0);
  const ch4=rows.filter(r=>["UP","PL"].includes(r.src.seg)).reduce((s,r)=>s+r.calc.ch4,0);
  const ch4All=rows.reduce((s,r)=>s+r.calc.ch4,0);
  const ccus=-rows.filter(r=>r.src.method==="rec").reduce((s,r)=>s+r.calc.co2e,0);
  const upstreamToe=PETRO_OUTPUT.crude.value+PETRO_OUTPUT.gas.value*10000/1255;
  const methaneIntensity=ch4*1000/0.717/(PETRO_OUTPUT.gas.value*1e8)*100;
  const total=rows.reduce((s,r)=>s+r.calc.co2e,0);
  return '<section class="panel"><div class="panelHead"><h3>板块排放与行业指标</h3><button class="linkBtn" onclick="go(\'组织碳排放\',\'盘查准备\',\'组织架构\')">组织架构 ›</button></div>'+
    '<div class="ptSegBar">'+PETRO_SEGMENTS.map(s=>{const v=segSum(s.id);return v>0?'<i style="flex:'+v+';background:'+s.color+'" title="'+s.name+'"></i>':'';}).join("")+'</div>'+
    '<div class="ptSegLegend">'+PETRO_SEGMENTS.map(s=>{const v=segSum(s.id);return '<span><i style="background:'+s.color+'"></i>'+s.name+' <b>'+petroWan(v,0)+'</b> 万 t · '+(total?(v/total*100).toFixed(1):0)+'%</span>';}).join("")+'</div>'+
    '<div class="statRow ptKpi">'+statTile("甲烷排放强度",methaneIntensity.toFixed(2)+"%","油气田及管道 CH₄ / 天然气产量 · OGCI 目标 0.20%","petroOrg='松原油田分公司';go('组织碳排放','核算分析','行业核算明细')")+
      statTile("甲烷排放量",fmt(ch4All,0)+" t","CH₄ · 放空、逃逸、火炬未完全燃烧")+
      statTile("CCUS 及 CO₂ 回收",petroWan(ccus)+" 万 t","CO₂ · 驱油埋存与回收利用")+
      statTile("吨油气当量排放",(segSum("UP")/(upstreamToe*10000)).toFixed(3),"tCO₂e/t · 油气和新能源板块")+
      statTile("吨原油加工排放",(segSum("RF")/(PETRO_OUTPUT.refining.value*10000)).toFixed(3),"tCO₂e/t · 炼化和新材料板块（含化工）")+'</div></section>';
}

MENUS["组织碳排放"]["盘查准备"]=["组织架构","核算边界","排放源","能源转供"];
MENUS["组织碳排放"]["核算分析"]=["行业核算明细","排放清单","重复计算剔除","数据交叉核对","异常数据"];
const orgPreparationBeforePetro = orgPreparation;
orgPreparation = function () {return state.page==="组织架构"?"":orgPreparationBeforePetro();};
const orgCalculationBeforePetro = orgCalculation;
orgCalculation = function () {return state.page==="行业核算明细"?"":orgCalculationBeforePetro();};
const renderBeforePetro = render;
render = function () {
  renderBeforePetro();
  if(!backendState.ready)return;
  const {top,group,page}=state;
  const content=document.getElementById("content");
  try {
    if(top==="组织碳排放"&&page==="组织架构")content.innerHTML=petroOrgPage();
    else if(top==="组织碳排放"&&page==="行业核算明细")content.innerHTML=petroCalcPage();
    else if(top==="组织碳排放"&&group==="组织碳看板"&&!isHistoryYear()) {
      const first=content.querySelector(".statRow");
      if(first)first.insertAdjacentHTML("afterend",petroIndicators());
    }
  } catch(error){console.error(error);}
};

(function petroStyle(){
  const css='.ptParams{border:1px solid #DCE8CF;background:#FAFCF7;border-radius:8px;padding:12px 14px;margin:10px 0}.ptParamsHead{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-bottom:10px;font-size:13px}'+
    '.ptParamsHead span{color:#667085;font-size:12px;flex-basis:100%}.ptParamsHead code,.ptFormulaList code,.ptWork code{background:#fff;border:1px solid #E5E7EB;color:#344054}'+
    '.ptParamGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.ptParamGrid label{display:grid;gap:4px;font-size:12px;color:#475467}.ptParamGrid label small{color:#98A2B3}'+
    '.ptParamGrid input{height:34px;border:1px solid #D0D5DD;border-radius:6px;padding:0 8px;font:inherit;font-size:13px}.ptRef{margin:8px 0 0;font-size:12px;color:#667085}'+
    '.ptSteps,.ptWork{display:flex;flex-direction:column;gap:4px;margin-top:8px;font-size:12px;color:#344054;font-family:ui-monospace,Menlo,monospace}.ptSteps:empty{display:none}.ptTotal{font-weight:700;color:#405124}'+
    '.ptOrgBar{display:flex;flex-wrap:wrap;gap:10px 18px;margin-bottom:12px}.ptOrgGroup{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.ptOrgGroup>span{font-size:12px;color:#667085;border-left:3px solid;padding-left:6px;margin-right:2px}'+
    '.ptOrgGroup button{border:1px solid #D0D5DD;background:#fff;border-radius:16px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer}.ptOrgGroup button.active{background:#405124;border-color:#405124;color:#fff}'+
    '.ptFormulaList{display:flex;flex-direction:column;gap:8px;font-size:13px}.ptFormulaList div{display:flex;flex-direction:column;gap:3px}.ptFormulaList code{white-space:normal}'+
    '.ptCalc .panelHead h3 small{font-weight:400;color:#667085;font-size:12px;margin-left:6px}.ptCalcBody{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px}'+
    '.ptCalcBody dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px 16px;margin:0}.ptCalcBody dt{font-size:12px;color:#667085}.ptCalcBody dd{margin:2px 0 0;font-weight:600;font-size:14px}.ptCalcBody dd small{font-weight:400;color:#98A2B3}'+
    '.ptWork{margin:0;background:#F8FAF5;border-radius:8px;padding:12px}.ptWork b{color:#405124;font-size:13px;margin-top:4px}.ptCalcFoot{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #EEF2F6;margin-top:12px;padding-top:10px;font-size:12px;color:#667085}'+
    '.meterRow.active{background:#F6FAEF}.ptTree{display:flex;flex-direction:column;gap:14px}.ptSeg{background:#fff;border:1px solid #E5E7EB;border-top:4px solid var(--seg);border-radius:8px;padding:14px 16px}'+
    '.ptSeg header{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-bottom:12px}.ptSeg header b{font-size:16px}.ptSeg header span{font-size:12px;color:#667085}.ptSeg header em{margin-left:auto;font-style:normal;font-weight:700;color:var(--seg)}'+
    '.ptEnts{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.ptEnts article{border:1px solid #EAECF0;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}.ptEnts article.child{border-style:dashed;background:#FCFCFD}'+
    '.ptEntHead{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ptEnts p{margin:0;font-size:12px;color:#475467;line-height:1.6}.ptUnits{display:flex;flex-wrap:wrap;gap:4px}.ptUnits span{font-size:11px;background:#F2F4F7;border-radius:10px;padding:2px 8px;color:#475467}'+
    '.ptEnts footer{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;justify-content:space-between;font-size:12px;color:#667085;margin-top:auto;border-top:1px solid #F2F4F7;padding-top:8px}'+
    '.ptSegBar{display:flex;height:14px;border-radius:7px;overflow:hidden;gap:2px;margin:4px 0 10px}.ptSegLegend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;color:#475467;margin-bottom:12px}.ptSegLegend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}'+
    '.ptKpi{margin-bottom:0}@media(max-width:900px){.ptCalcBody{grid-template-columns:1fr}}';
  document.head.insertAdjacentHTML("beforeend","<style>"+css+"</style>");
})();

// 行业方法（火炬、工业过程、逸散、回收）及实测参数不参与通用因子替换
const matchFactorsBeforePetro = matchFactors;
matchFactors = function (task,limit) {
  if(task&&task.petro){
    const src=petroSource(task.id),entry=demo.taskEntries?.[task.id];
    const params=entry?.params||src?.params||{};
    if(src&&(!["comb","elec","heat"].includes(src.method)||/实测/.test(String(params.ref||""))))return [];
  }
  return matchFactorsBeforePetro(task,limit);
};
