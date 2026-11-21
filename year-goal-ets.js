// 报告年度切换、减排目标管理和碳履约模块。依赖 role-home.js 中的全局函数，必须最后加载。
// 历史年度按归档快照生成。

// ---------- 报告年度 ----------
const REPORT_YEARS = [2023,2024,2025,2026];
const CURRENT_YEAR = 2026;
const YEAR_SCALE = {2023:{"1":1.12,"2":1.30,"3":0.86},2024:{"1":1.07,"2":1.18,"3":0.93},2025:{"1":1.03,"2":1.08,"3":0.98}};
const YEAR_REVENUE = {2023:6200,2024:6650,2025:7020,2026:7450};
// 热电分公司：燃煤热电联产和厂用电下网，同时是组织盘查的排放源和全国碳市场履约的核算对象
const CHP_COAL = "燃煤热电联产";
const CHP_ELEC = "厂用电下网";
const CHP_PARAMS = {ncv:21.18,cc:0.02634,of:0.98};
const CHP_COAL_FACTOR = CHP_PARAMS.ncv*CHP_PARAMS.cc*CHP_PARAMS.of*44/12;
const YEAR_CLOSED = {2023:"2024-03-29",2024:"2025-03-28",2025:"2026-03-31"};
// ---------- 演示企业规模：按大型泵阀装备制造集团（含自备热电）设定 ----------
directTasks.push(
  {id:"T-S1-04",org:"嘉兴热电分公司",name:CHP_COAL,unit:"t"},
  {id:"T-S2-04",org:"嘉兴热电分公司",name:CHP_ELEC,unit:"kWh"}
);
const workflowTasksBeforeScale = workflowTasks;
workflowTasks = function () {
  return workflowTasksBeforeScale().map(task=>task.id==="T-S1-04"?{...task,owner:"周建华",factor:etsCoalFactor(),factorLabel:"烟煤 · 发电设施核算指南（月度实测加权）"}:
    task.id==="T-S2-04"?{...task,owner:"周建华",factor:0.0005703,factorLabel:"全国电网平均排放因子"}:task);
};
const SCALE_ENTRIES = {
  "T-S1-01":{activity:1186000,evidence:"GAS-JX-2026-Q3-021"},
  "T-S1-02":{activity:86000,evidence:"FUEL-HZ-2026-Q3-008"},
  "T-S1-03":{activity:85,evidence:"HVAC-2026-CHECK",note:"空调与冷水机组维保补充 R134a 85 kg"},
  "T-S1-04":{activity:99200,evidence:"MRV-RD-2026-10",status:"通过",note:"1–10 月入厂煤计量 + 11–12 月计划量"},
  "T-S2-01":{activity:21600000,evidence:"ELE-JX-2026-001"},
  "T-S2-02":{activity:58000,evidence:"STM-HZ-2026-004"},
  "T-S2-03":{activity:6500000,evidence:"GEC-2026-019"},
  "T-S2-04":{activity:3150000,evidence:"ELE-RD-2026-10",status:"通过"}
};
const SCALE_RECORDS = {1:58000,2:46000000,3:3600000,4:28500000,5:27000000000};
const SCALE_SUPPLIERS = {"SC-001":8600000,"SC-002":2100000,"SC-003":9800000,"SC-004":6400000};
function prepareScale() {
  if(demo.scaleVersion===3)return;
  Object.entries(SCALE_ENTRIES).forEach(([id,value])=>{
    demo.taskEntries[id]={status:"待填报",...demo.taskEntries[id],...value};
  });
  demo.records.forEach(row=>{
    if(!SCALE_RECORDS[row.id])return;
    row.activity_value=SCALE_RECORDS[row.id];
    if(demo.taskEntries["REC-"+row.id])demo.taskEntries["REC-"+row.id].activity=row.activity_value;
  });
  const resize=row=>{if(row&&SCALE_SUPPLIERS[row.id]){row.qty=SCALE_SUPPLIERS[row.id];row.total=+(row.qty*row.unitCarbon/1000).toFixed(3);}};
  supplyScope3Items.forEach(resize);
  Object.values(demo.approvedSuppliers||{}).forEach(resize);
  Object.values(demo.supplierVersionHistory||{}).forEach(list=>list.forEach(resize));
  demo.supplierRows=[...supplyScope3Items];
  delete demo.yearArchive;delete demo.targets;delete demo.ets;
  demo.scaleVersion=3;
  persistDemo();
}
const prepareWorkflowBeforeScale = prepareWorkflow;
prepareWorkflow = function () {
  prepareWorkflowBeforeScale();
  prepareScale();
};

let reportYear = CURRENT_YEAR;
try {
  const savedYear=Number(localStorage.getItem("carbon-demo-year"));
  if(REPORT_YEARS.includes(savedYear))reportYear=savedYear;
} catch {}

function isHistoryYear(){return reportYear!==CURRENT_YEAR;}
function yearText(year=reportYear){return year===CURRENT_YEAR?year+" 年度（盘查进行中）":year+" 年度（已关账）";}

let liveCalculationRef = null;
function approvedDetailLive() {
  return (liveCalculationRef||backendState.calculation)?.detail||[];
}
// 历史年度以完整的填报口径为基础（含当年尚未审核的任务），按年度系数和热电实际量生成
function baselineRows() {
  return workflowTasks().flatMap(task=>{
    const entry=taskEntry(task);
    const activity=Number(entry.activity);
    if(!(activity>0))return [];
    return [{scope:task.scope,category_code:task.scope==="3"?task.category:"S"+task.scope,source_name:task.name,org:task.locked?demoOrg:task.org,
      activity_value:activity,activity_unit:task.unit,factor_value:task.factor,gwp_value:1,emission_tco2e:activity*task.factor}];
  });
}
function yearArchive() {
  if(!demo.yearArchive?.length&&backendState.ready) {
    demo.yearArchive=baselineRows();
    persistDemo();
  }
  return demo.yearArchive||[];
}
function detailForYear(year) {
  if(year===CURRENT_YEAR)return approvedDetailLive();
  const scale=YEAR_SCALE[year]||{};
  return yearArchive().map((row,index)=>{
    const chp=chpAnnual(row.source_name,year);
    const activity=chp?chp.activity:row.activity_value*(scale[String(row.scope)]||1)*(1+Math.sin(index*1.7+year)*0.02);
    return {...row,period:String(year),activity_value:+activity.toFixed(2),emission_tco2e:chp?chp.emission:activity*row.factor_value,evidence:year+" 年度归档凭证"};
  });
}
approvedDetail = function () {
  return isHistoryYear()?detailForYear(reportYear):approvedDetailLive();
};
function yearTotals(year) {
  const totals={"1":0,"2":0,"3":0};
  detailForYear(year).forEach(row=>totals[String(row.scope||"3")]+=row.emission_tco2e);
  return totals;
}
function categoriesFrom(detail) {
  const total=detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  const groups={};
  detail.forEach(row=>{groups[row.category_code]=(groups[row.category_code]||0)+row.emission_tco2e;});
  return Object.entries(groups).map(([code,value])=>({category_code:code,category_name:categoryName(code),emission_tco2e:+value.toFixed(4),
    share:total?+(value/total*100).toFixed(2):0})).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
}
function withYearCalculation(fn) {
  const live=backendState.calculation;
  if(!isHistoryYear()||!live)return fn();
  yearArchive();
  const detail=detailForYear(reportYear);
  liveCalculationRef=live;
  backendState.calculation={...live,detail,categories:categoriesFrom(detail),total_emission:detail.reduce((sum,row)=>sum+row.emission_tco2e,0)};
  try {return fn();} finally {backendState.calculation=live;liveCalculationRef=null;}
}
const workflowIssuesLive = workflowIssues;
workflowIssues = function () {return isHistoryYear()?[]:workflowIssuesLive();};
if(typeof showOrgCategory==="function") {
  const showOrgCategoryLive=showOrgCategory;
  showOrgCategory=function(...args){return withYearCalculation(()=>showOrgCategoryLive(...args));};
}

function setReportYear(value) {
  reportYear=Number(value);
  etsYear=isHistoryYear()?reportYear:null;
  try {localStorage.setItem("carbon-demo-year",String(reportYear));} catch {}
  render();
  showToast(isHistoryYear()?"已切换到 "+reportYear+" 年度归档数据（只读）":"已回到 "+CURRENT_YEAR+" 年度当前盘查");
}
function historyLocked() {
  if(!isHistoryYear())return false;
  showToast(reportYear+" 年度已关账，数据只读。请切换到 "+CURRENT_YEAR+" 年度处理任务");
  return true;
}
["openUnifiedTask","editDemoSupplier","generateScope3Report","inviteSupplier","remindTask"].forEach(name=>{
  if(typeof window[name]!=="function")return;
  const live=window[name];
  window[name]=function(...args){if(historyLocked())return;return live(...args);};
});
const downloadOrgReportLive = downloadOrgReport;
downloadOrgReport = function (...args) {
  if(isHistoryYear())return downloadCurrentReport();
  return downloadOrgReportLive(...args);
};

function historyBanner() {
  return '<div class="historyBanner"><span class="todoTag">归档</span><div><b>正在查看 '+reportYear+' 年度归档数据</b>'+
    '<small>关账日期 '+YEAR_CLOSED[reportYear]+' · 只读</small></div>'+
    '<button class="btn" onclick="setReportYear('+CURRENT_YEAR+')">回到 '+CURRENT_YEAR+' 年度</button></div>';
}
function archiveTaskPage(supplier) {
  const tasks=supplier?workflowTasks().filter(task=>task.locked):workflowTasks().filter(task=>!task.locked);
  const visible=currentRole==="填报人"?tasks.filter(task=>task.owner===fillerIdentity):
    currentRole==="供应商"?tasks.filter(task=>task.supplierIndex===supplierIdentity):tasks;
  const scale=YEAR_SCALE[reportYear];
  return pageHead(supplier?"供应商数据（"+reportYear+" 年度归档）":"填报任务（"+reportYear+" 年度归档）",'<button class="btn" onclick="exportFirstTable()">导出</button>',
      (supplier?"供应链碳排放 / 供应商协同任务":"组织碳排放 / 数据填报")+" / "+reportYear+" 年度")+
    '<div class="taskTable tableWrap"><table><thead><tr><th>任务</th><th>范围</th><th>组织 / 供应商</th><th>负责人</th><th>活动量</th><th>状态</th><th>审核人</th></tr></thead><tbody>'+
    (visible.length?visible.map((task,index)=>{
      const entry=taskEntry(task);
      const base=Number(entry.activity)||Number(task.qty)||0;
      const value=base*(scale[task.scope]||1)*(1+Math.sin(index+reportYear)*0.03);
      return '<tr><td><strong>'+textHtml(task.name)+'</strong><small>'+task.id+'</small></td><td>范围'+task.scope+'</td><td>'+textHtml(task.locked?task.owner:task.org)+
        '</td><td>'+textHtml(task.locked?"供应商":task.owner)+'</td><td>'+(value?fmt(value,2)+' '+textHtml(task.unit||""):'—')+'</td><td>'+(value?'<span class="status ok">已归档</span>':'<span class="status gray">不适用</span>')+'</td><td>'+MANAGER_NAME+'</td></tr>';
    }).join(""):'<tr><td colspan="7" class="emptyCell">该年度没有你负责的任务</td></tr>')+'</tbody></table></div>';
}
function archiveWidget() {
  const totals=yearTotals(reportYear);
  const prev=REPORT_YEARS.includes(reportYear-1)?yearTotals(reportYear-1):null;
  const total=totals["1"]+totals["2"]+totals["3"];
  const prevTotal=prev?prev["1"]+prev["2"]+prev["3"]:0;
  const count=workflowTasks().length;
  return '<section class="panel taskWidget"><div class="panelHead"><h3>'+reportYear+' 年度归档</h3><button class="linkBtn" onclick="setReportYear('+CURRENT_YEAR+')">回到当前年度 ›</button></div>'+
    '<div class="taskCounts"><button class="ok"><b>'+count+'</b><span>任务已归档</span></button><button><b>'+fmt(total,0)+'</b><span>tCO₂e</span></button>'+
    '<button class="'+(prev&&total>prevTotal?'bad':'ok')+'"><b>'+(prev?(total>=prevTotal?'+':'')+((total-prevTotal)/prevTotal*100).toFixed(1)+'%':'—')+'</b><span>较上年</span></button>'+
    '<button><b>'+YEAR_CLOSED[reportYear].slice(5)+'</b><span>关账日期</span></button></div>'+
    '<div class="miniProgress"><span><i style="width:100%"></i></span><small>完成 '+count+' / '+count+' · 100%</small></div>'+
    '<ul class="miniList">'+["1","2","3"].map(scope=>'<li><span class="todoTag ok">范围'+scope+'</span><div><b>'+fmt(totals[scope],2)+' tCO₂e</b><small>'+
      (prev?'上年 '+fmt(prev[scope],2)+' tCO₂e':'基准年')+'</small></div><button class="btn" onclick="showScopeDetail(\''+scope+'\')">明细</button></li>').join("")+'</ul></section>';
}
const homeLayoutBeforeYear = homeLayout;
homeLayout = function (greet,slides,widget,links) {
  const html=homeLayoutBeforeYear(greet,slides,isHistoryYear()?archiveWidget():widget,links);
  if(currentRole!=="管理者")return html;
  return html.replace('<section class="panel marketPanel">',goalStrip()+'<section class="panel marketPanel">');
};

// ---------- 减排目标 ----------
const DEFAULT_TARGETS = {baseYear:2023,items:[
  {id:"TG-01",name:"范围一+二 排放强度下降",scope:"12",type:"intensity",reduction:35,targetYear:2030,basis:"tCO₂e / 百万元营收。主要路径：热电机组掺烧生物质与煤改气、余热回收、扩大绿电采购"},
  {id:"TG-02",name:"范围三 排放强度下降",scope:"3",type:"intensity",reduction:25,targetYear:2030,basis:"tCO₂e / 百万元营收。产品使用阶段占范围三 90% 以上，依靠 IE4/IE5 高效电机和变频水泵降低用电"}
]};
function targets() {
  demo.targets ||= structuredClone(DEFAULT_TARGETS);
  return demo.targets;
}
const SCOPE_LABEL = {"12":"范围一+二","3":"范围三","123":"范围一+二+三"};
function targetUnit(target){return target.type==="intensity"?"tCO₂e/百万元":"tCO₂e";}
function targetActual(target,year) {
  const totals=yearTotals(year);
  const value=target.scope==="12"?totals["1"]+totals["2"]:target.scope==="3"?totals["3"]:totals["1"]+totals["2"]+totals["3"];
  return target.type==="intensity"?value/YEAR_REVENUE[year]:value;
}
function targetBase(target){return targetActual(target,targets().baseYear);}
function targetPath(target,year) {
  const base=targetBase(target);
  const baseYear=targets().baseYear;
  const ratio=Math.min(Math.max((year-baseYear)/(target.targetYear-baseYear),0),1);
  return base*(1-target.reduction/100*ratio);
}
function targetDigits(target){const base=targetBase(target);return base>=1000?0:base>=10?1:3;}
function targetStatus(target,year=CURRENT_YEAR) {
  const actual=targetActual(target,year),path=targetPath(target,year);
  const gap=path?(actual-path)/path*100:0;
  const reduced=(1-actual/targetBase(target))*100;
  return {actual,path,gap,reduced,ahead:actual<=path,
    progress:Math.max(0,Math.min(100,reduced/target.reduction*100))};
}
function goalStrip() {
  const list=targets().items;
  return '<div class="goalStrip">'+
    '<section class="panel"><div class="panelHead"><h3>减排目标</h3><button class="linkBtn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')">目标跟踪 ›</button></div>'+
      '<div class="goalList">'+list.map(target=>{
        const status=targetStatus(target);
        return '<button class="goalItem" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')"><span><b>'+textHtml(target.name)+'</b><small>'+targets().baseYear+' → '+target.targetYear+' 减 '+target.reduction+'% · 已减 '+status.reduced.toFixed(1)+'%</small></span>'+
          '<span class="goalTrack"><i style="width:'+status.progress+'%"></i></span><span class="status '+(status.ahead?'ok':'bad')+'">'+(status.ahead?'符合路径':'落后路径')+'</span></button>';
      }).join("")+'</div></section>'+
    etsMiniCard()+
  '</div>';
}

function trackChart(target) {
  const baseYear=targets().baseYear;
  const years=[];for(let year=baseYear;year<=target.targetYear;year++)years.push(year);
  const actualYears=REPORT_YEARS.filter(year=>year>=baseYear);
  const values=[...years.map(year=>targetPath(target,year)),...actualYears.map(year=>targetActual(target,year))];
  const max=Math.max(...values)*1.12||1;
  const width=900,height=230,left=60,right=20,top=18,bottom=30;
  const x=year=>left+(year-baseYear)/(target.targetYear-baseYear||1)*(width-left-right);
  const y=value=>top+(1-value/max)*(height-top-bottom);
  const path=years.map((year,index)=>(index?"L":"M")+x(year).toFixed(1)+" "+y(targetPath(target,year)).toFixed(1)).join(" ");
  const actual=actualYears.map((year,index)=>(index?"L":"M")+x(year).toFixed(1)+" "+y(targetActual(target,year)).toFixed(1)).join(" ");
  const ticks=[0,.25,.5,.75,1].map(t=>max*t);
  return '<svg class="trackChart" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+textHtml(target.name)+' 目标路径与实际排放">'+
    ticks.map(value=>'<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y(value)+'" y2="'+y(value)+'" stroke="#EEF1F4"/><text x="'+(left-8)+'" y="'+(y(value)+4)+'" text-anchor="end" font-size="12" fill="#667085">'+fmt(value,targetDigits(target)>1?2:0)+'</text>').join("")+
    years.map(year=>'<text x="'+x(year)+'" y="'+(height-10)+'" text-anchor="middle" font-size="11" fill="'+(year===CURRENT_YEAR?'#26890D':'#667085')+'">'+year+'</text>').join("")+
    '<path d="'+path+'" fill="none" stroke="#98A2B3" stroke-width="2" stroke-dasharray="6 5"/>'+
    '<path d="'+actual+'" fill="none" stroke="#26890D" stroke-width="2.5"/>'+
    actualYears.map(year=>{const value=targetActual(target,year),ok=value<=targetPath(target,year);
      return '<circle cx="'+x(year)+'" cy="'+y(value)+'" r="'+(year===CURRENT_YEAR?5:4)+'" fill="'+(ok?'#26890D':'#D92D20')+'" stroke="#fff" stroke-width="2"><title>'+year+' 实际 '+fmt(value,targetDigits(target))+' '+targetUnit(target)+'</title></circle>';}).join("")+
    '<circle cx="'+x(target.targetYear)+'" cy="'+y(targetPath(target,target.targetYear))+'" r="5" fill="#fff" stroke="#4D7F17" stroke-width="2"/>'+
    '<text x="'+(x(target.targetYear)-6)+'" y="'+(y(targetPath(target,target.targetYear))-10)+'" text-anchor="end" font-size="11" fill="#4D7F17">目标 '+fmt(targetPath(target,target.targetYear),targetDigits(target))+'</text>'+
  '</svg><div class="chartLegend"><span><i class="dash"></i>目标路径</span><span><i></i>实际（'+CURRENT_YEAR+' 为当前盘查数据）</span></div>';
}
function targetSetupPage() {
  const config=targets();
  const manager=currentRole==="管理者";
  return pageHead("目标设定",helpButton("目标设定","设置基准年、覆盖范围、减排类型（绝对量或强度）和目标年。系统按线性路径拆分到每一年，并用各年度已审核排放跟踪进度。")+
      (manager?'<button class="btn primary" onclick="openTargetModal()">新增目标</button>':''),"组织碳排放 / 碳目标管理 / 目标设定")+
    '<div class="lcaMeta"><span>基准年 <b>'+config.baseYear+'</b></span><span>基准年排放（范围一+二+三） <b>'+fmt(Object.values(yearTotals(config.baseYear)).reduce((a,b)=>a+b,0),1)+' tCO₂e</b></span>'+
      '<span>强度口径 tCO₂e / 百万元营收</span>'+(manager?'<label>调整基准年 <select onchange="setBaseYear(this.value)">'+[2023,2024,2025].map(year=>'<option '+(year===config.baseYear?'selected':'')+'>'+year+'</option>').join("")+'</select></label>':'')+'</div>'+
    config.items.map(target=>{
      const years=[];for(let year=config.baseYear;year<=target.targetYear;year++)years.push(year);
      return '<section class="panel targetCard"><div class="panelHead"><h3>'+textHtml(target.name)+'</h3><div class="actions">'+
        (manager?'<button class="btn" onclick="openTargetModal(\''+target.id+'\')">编辑</button><button class="btn" onclick="removeTarget(\''+target.id+'\')">删除</button>':'')+'</div></div>'+
        '<dl class="targetFacts"><div><dt>覆盖范围</dt><dd>'+SCOPE_LABEL[target.scope]+'</dd></div><div><dt>目标类型</dt><dd>'+(target.type==="intensity"?"强度目标":"绝对量目标")+'</dd></div>'+
          '<div><dt>基准值（'+config.baseYear+'）</dt><dd>'+fmt(targetBase(target),targetDigits(target))+' '+targetUnit(target)+'</dd></div>'+
          '<div><dt>目标</dt><dd>'+target.targetYear+' 年下降 '+target.reduction+'% → '+fmt(targetPath(target,target.targetYear),targetDigits(target))+'</dd></div>'+
          '<div class="wide"><dt>依据</dt><dd>'+textHtml(target.basis||"—")+'</dd></div></dl>'+
        '<div class="tableWrap"><table class="pathTable"><thead><tr><th>年度</th>'+years.map(year=>'<th>'+year+'</th>').join("")+'</tr></thead><tbody>'+
          '<tr><td>路径值</td>'+years.map(year=>'<td>'+fmt(targetPath(target,year),targetDigits(target))+'</td>').join("")+'</tr>'+
          '<tr><td>较基准</td>'+years.map(year=>{const cut=target.reduction*Math.min(Math.max((year-config.baseYear)/(target.targetYear-config.baseYear),0),1);return '<td>'+(cut?'-'+cut.toFixed(1)+'%':'基准')+'</td>';}).join("")+'</tr>'+
          '<tr><td>实际</td>'+years.map(year=>REPORT_YEARS.includes(year)?'<td class="'+(targetActual(target,year)<=targetPath(target,year)?'okText':'badText')+'">'+fmt(targetActual(target,year),targetDigits(target))+'</td>':'<td class="muted">—</td>').join("")+'</tr>'+
        '</tbody></table></div></section>';
    }).join("")+
    (config.items.length?'':'<div class="todoEmpty">尚未设置减排目标。</div>');
}
function targetTrackPage() {
  const config=targets();
  return pageHead("目标跟踪",helpButton("目标跟踪","实际值来自各年度已审核排放；"+CURRENT_YEAR+" 年度为当前盘查数据，会随审核进度变化。差距为实际值相对当年路径值的偏离。")+
      '<button class="btn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标设定\')">调整目标</button>',"组织碳排放 / 碳目标管理 / 目标跟踪")+
    config.items.map(target=>{
      const status=targetStatus(target);
      return '<section class="panel targetCard"><div class="panelHead"><h3>'+textHtml(target.name)+'</h3><span class="status '+(status.ahead?'ok':'bad')+'">'+(status.ahead?'符合目标路径':'落后目标路径')+'</span></div>'+
        '<div class="statRow">'+statTile("基准值 · "+config.baseYear,fmt(targetBase(target),targetDigits(target)),targetUnit(target))+
          statTile(CURRENT_YEAR+" 实际",fmt(status.actual,targetDigits(target)),"已较基准下降 "+status.reduced.toFixed(1)+"%")+
          statTile(CURRENT_YEAR+" 路径值",fmt(status.path,targetDigits(target)),"目标 "+target.targetYear+" 年下降 "+target.reduction+"%")+
          statTile("与路径差距",(status.gap>0?"+":"")+status.gap.toFixed(1)+"%",status.ahead?"优于路径":"需额外减排 "+fmt((status.actual-status.path)*(target.type==="intensity"?YEAR_REVENUE[CURRENT_YEAR]:1),1)+" tCO₂e")+'</div>'+
        trackChart(target)+
        '</section>';
    }).join("");
}
function setBaseYear(value){targets().baseYear=Number(value);persistDemo();render();showToast("基准年已调整为 "+value);}
function openTargetModal(id) {
  const target=targets().items.find(item=>item.id===id)||{name:"",scope:"12",type:"absolute",reduction:30,targetYear:2030,basis:""};
  openModal('<h2>'+(id?'编辑':'新增')+'减排目标</h2><div class="modalForm">'+
    '<label>目标名称<input id="tgName" value="'+textHtml(target.name)+'" placeholder="如：范围一+二 绝对量减排"></label>'+
    '<label>覆盖范围<select id="tgScope">'+Object.entries(SCOPE_LABEL).map(([key,label])=>'<option value="'+key+'" '+(key===target.scope?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
    '<label>目标类型<select id="tgType"><option value="absolute" '+(target.type==="absolute"?'selected':'')+'>绝对量（tCO₂e）</option><option value="intensity" '+(target.type==="intensity"?'selected':'')+'>强度（tCO₂e/百万元营收）</option></select></label>'+
    '<label>较基准年下降（%）<input id="tgReduction" type="number" min="1" max="100" step="0.5" value="'+target.reduction+'"></label>'+
    '<label>目标年<select id="tgYear">'+[2027,2028,2030,2032,2035,2040].map(year=>'<option '+(year===target.targetYear?'selected':'')+'>'+year+'</option>').join("")+'</select></label>'+
    '<label>依据 / 说明<input id="tgBasis" value="'+textHtml(target.basis||"")+'" placeholder="如：对齐 SBTi 1.5°C"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveTarget(\''+(id||"")+'\')">保存目标</button></div>');
}
function saveTarget(id) {
  const name=document.getElementById("tgName").value.trim();
  const reduction=Number(document.getElementById("tgReduction").value);
  if(!name){showToast("请填写目标名称");return;}
  if(!(reduction>0&&reduction<=100)){showToast("下降比例需在 0–100% 之间");return;}
  const value={name,scope:document.getElementById("tgScope").value,type:document.getElementById("tgType").value,reduction,
    targetYear:Number(document.getElementById("tgYear").value),basis:document.getElementById("tgBasis").value.trim()};
  const list=targets().items;
  const existing=list.find(item=>item.id===id);
  if(existing)Object.assign(existing,value);else list.push({id:"TG-"+String(list.length+1).padStart(2,"0")+Date.now().toString().slice(-3),...value});
  persistDemo();closeModal();render();showToast("目标已保存，路径已重新拆分");
}
function removeTarget(id) {
  targets().items=targets().items.filter(item=>item.id!==id);
  persistDemo();render();showToast("目标已删除");
}

// ---------- 碳履约（全国碳市场） ----------
const ETS_ENTITY = {name:"江南流体装备集团嘉兴热电分公司",account:"CEA-330400-01873",unit:"2×25 MW 燃煤热电联产机组",industry:"发电（热电联产）",region:"浙江省嘉兴市"};
const ETS_YEARS = [2023,2024,2025,2026];
const ETS_GRID_FACTOR = 0.5703;
const ETS_CCER_CAP = 0.05;
const ETS_MONTH_WEIGHT = [1.12,1.05,0.98,0.9,0.86,0.92,1.0,1.02,0.94,0.96,1.07,1.18];
const ETS_PROFILE = {
  2023:{coal:99800,elec:3350,supply:197800,heat:330500,be:0.7960,bh:0.1260},
  2024:{coal:97900,elec:3280,supply:194600,heat:325100,be:0.7930,bh:0.1258},
  2025:{coal:101600,elec:3210,supply:199300,heat:341200,be:0.7856,bh:0.1252},
  2026:{coal:99200,elec:3150,supply:196900,heat:336000,be:0.7800,bh:0.1250}
};
const ETS_VERIFIER = "浙江省环科碳核查技术服务中心";
const ETS_AUTHORITY = "浙江省生态环境厅";
const CCER_PRICE = 78.6;
const CCER_LISTINGS = [
  {project:"福建平潭海上风电项目",type:"并网海上风力发电",vintage:2024,price:79.2},
  {project:"甘肃玉门光热发电项目",type:"并网光热发电",vintage:2024,price:77.8},
  {project:"广西北海红树林营造项目",type:"红树林营造",vintage:2024,price:86.5},
  {project:"浙江安吉造林碳汇项目",type:"造林碳汇",vintage:2024,price:82.0}
];
const MONTH_NAMES = ["1 月","2 月","3 月","4 月","5 月","6 月","7 月","8 月","9 月","10 月","11 月","12 月"];
let etsYear = null;

function todayText() {
  const now=new Date();
  return now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
}
function nowText(){return new Date().toLocaleString("zh-CN",{hour12:false}).replace(/\//g,"-");}
function daysUntil(date){return Math.ceil((new Date(date+"T23:59:59")-new Date())/86400000);}
function etsPrice(){return marketSeries().at(-1);}
function etsSplit(total,digits=0) {
  const sum=ETS_MONTH_WEIGHT.reduce((a,b)=>a+b,0);
  let acc=0;
  return ETS_MONTH_WEIGHT.map((weight,index)=>{
    if(index===11)return +(total-acc).toFixed(digits);
    const value=+(total*weight/sum).toFixed(digits);acc+=value;return value;
  });
}
function etsMonthsBuild(year) {
  const p=ETS_PROFILE[year];
  const coal=etsSplit(p.coal),elec=etsSplit(p.elec,1),supply=etsSplit(p.supply),heat=etsSplit(p.heat);
  return coal.map((value,index)=>{
    const month=index+1;
    let status="已存证";
    let at=(month===12?(year+1)+"-01":year+"-"+String(month+1).padStart(2,"0"))+"-08";
    if(year===CURRENT_YEAR&&month===10){status="待存证";at="";}
    if(year===CURRENT_YEAR&&month>10){status="未到期";at="";}
    return {month,coal:value,ncv:+(21.18+0.21*Math.sin(month*1.3+year)).toFixed(2),cc:+(0.02634+0.00006*Math.cos(month*0.8+year)).toFixed(5),
      supply:supply[index],heat:heat[index],elec:elec[index],status,at,evidence:status==="未到期"?"":"MRV-RD-"+year+String(month).padStart(2,"0")};
  });
}
function etsMonthEmission(row) {
  const coal=row.coal*row.ncv*row.cc*CHP_PARAMS.of*44/12;
  return {coal,elec:row.elec*ETS_GRID_FACTOR,total:coal+row.elec*ETS_GRID_FACTOR};
}
function etsSums(months) {
  const sum={coal:0,elec:0,supply:0,heat:0,coalEmission:0,elecEmission:0,emission:0};
  months.forEach(row=>{const e=etsMonthEmission(row);sum.coal+=row.coal;sum.elec+=row.elec;sum.supply+=row.supply;sum.heat+=row.heat;
    sum.coalEmission+=e.coal;sum.elecEmission+=e.elec;sum.emission+=e.total;});
  return sum;
}
function etsAllocFormula(year,months) {
  const p=ETS_PROFILE[year],sum=etsSums(months);
  return {power:Math.round(sum.supply*p.be),heat:Math.round(sum.heat*p.bh),qty:Math.round(sum.supply*p.be)+Math.round(sum.heat*p.bh)};
}
function etsBuild() {
  const data={v:2,monthly:{},cycles:{},ledger:[],orders:[],ccer:[],log:[],seq:0};
  ETS_YEARS.forEach(year=>data.monthly[year]=etsMonthsBuild(year));
  const add=(date,type,vintage,qty,ref,year)=>data.ledger.push({id:"LG"+String(++data.seq).padStart(5,"0"),date,type,vintage,qty,ref,year});
  const balance=year=>data.ledger.filter(row=>row.vintage<=year).reduce((sum,row)=>sum+row.qty,0);
  const surrender=(year,qty,date,ref)=>{
    let left=qty;
    [...new Set(data.ledger.map(row=>row.vintage))].sort().forEach(vintage=>{
      if(vintage>year||left<=0)return;
      const have=data.ledger.filter(row=>row.vintage===vintage).reduce((sum,row)=>sum+row.qty,0);
      const take=Math.min(have,left);
      if(take>0){add(date,"清缴注销",vintage,-take,ref,year);left-=take;}
    });
  };
  const order=(at,side,product,vintage,qty,price,year,extra={})=>{
    const id="WT"+at.replace(/-/g,"")+String(data.orders.length+31).padStart(4,"0");
    data.orders.push({id,at:at+" 10:"+String(12+data.orders.length*7).padStart(2,"0"),side,product,vintage,qty,price,filledPrice:price,status:"已成交",filledAt:at,channel:"挂牌协议",year,...extra});
    return id;
  };
  [2023,2024].forEach(year=>{
    const months=data.monthly[year],verified=Math.round(etsSums(months).emission),alloc=etsAllocFormula(year,months);
    const pre=Math.round(alloc.qty*0.7);
    const ccer=year===2023?1850:0;
    data.cycles[year]={year,deadline:(year+1)+"-12-31",
      report:{status:"已核查",no:"ER-"+year+"-330400-0187",submittedAt:(year+1)+"-03-27",verifiedAt:(year+1)+"-06-2"+(year-2022),verifier:ETS_VERIFIER,verifiedQty:verified,verifyNo:"HC-"+(year+1)+"-ZJ-0"+(412+year-2023)},
      alloc:{pre:{qty:pre,at:(year+1)+"-03-15"},final:{qty:alloc.qty,power:alloc.power,heat:alloc.heat,at:(year+1)+"-09-27",status:"已确认",confirmedAt:(year+1)+"-10-0"+(year-2021)}},
      surrender:{status:"未清缴"}};
    add((year+1)+"-03-15","预分配",year,pre,ETS_AUTHORITY+" 预分配",year);
    add((year+1)+"-10-0"+(year-2021),"核定补发",year,alloc.qty-pre,ETS_AUTHORITY+" 核定",year);
    if(ccer)data.ccer.push({id:"CCER-"+year+"-0412",project:"浙江安吉竹林经营碳汇项目",type:"存量 CCER · 林业碳汇",vintage:2016,qty:ccer,acquiredAt:(year+1)+"-08-14",price:62.5,status:"已注销",usedFor:year});
    const short=verified-ccer-balance(year);
    if(short>0){const qty=Math.ceil(short/100)*100,price=year===2023?78.4:96.2,id=order((year+1)+"-11-1"+(year-2020),"买入","CEA",year,qty,price,year);add((year+1)+"-11-1"+(year-2020),"买入",year,qty,id,year);}
    else if(-short>1500){const qty=Math.floor((-short-600)/50)*50,price=97.8,id=order((year+1)+"-11-20","卖出","CEA",year,qty,price,year);add((year+1)+"-11-20","卖出",year,-qty,id,year);}
    const date=(year+1)+"-12-1"+(year-2015);
    const cert="QJ-"+year+"-330400-0187";
    surrender(year,verified-ccer,date,cert);
    Object.assign(data.cycles[year].surrender,{status:"已清缴",at:date,cea:verified-ccer,ccer,cert});
  });
  {
    const year=2025,months=data.monthly[year],verified=Math.round(etsSums(months).emission),alloc=etsAllocFormula(year,months);
    const pre=Math.round(alloc.qty*0.7);
    data.cycles[year]={year,deadline:"2026-12-31",
      report:{status:"已核查",no:"ER-2025-330400-0187",submittedAt:"2026-03-26",verifiedAt:"2026-06-26",verifier:ETS_VERIFIER,verifiedQty:verified,verifyNo:"HC-2026-ZJ-0438"},
      alloc:{pre:{qty:pre,at:"2026-03-16"},final:{qty:alloc.qty,power:alloc.power,heat:alloc.heat,at:"2026-11-12",status:"待确认",confirmBy:"2026-11-26"}},
      surrender:{status:"未清缴"}};
    add("2026-03-16","预分配",year,pre,ETS_AUTHORITY+" 预分配",year);
    const id=order("2026-09-18","买入","CEA",2025,1500,93.4,year);
    add("2026-09-18","买入",2025,1500,id,year);
    const c1=order("2026-08-21","买入","CCER",2024,1200,79.6,year,{project:"福建平潭海上风电项目"});
    const c2=order("2026-10-15","买入","CCER",2024,800,85.9,year,{project:"广西北海红树林营造项目"});
    data.ccer.push({id:"CCER-2026-1036",project:"福建平潭海上风电项目",type:"并网海上风力发电",vintage:2024,qty:1200,acquiredAt:"2026-08-21",price:79.6,status:"可用",ref:c1});
    data.ccer.push({id:"CCER-2026-1187",project:"广西北海红树林营造项目",type:"红树林营造",vintage:2024,qty:800,acquiredAt:"2026-10-15",price:85.9,status:"可用",ref:c2});
  }
  data.cycles[2026]={year:2026,deadline:"2027-12-31",report:{status:"监测中"},alloc:{},surrender:{status:"未清缴"}};
  data.ledger.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  data.orders.sort((a,b)=>b.at.localeCompare(a.at));
  data.log=[
    {at:"2026-11-12 16:20",actor:"系统",text:"收到 "+ETS_AUTHORITY+" 2025 年度配额核定结果"},
    {at:"2026-11-08 09:42",actor:"周建华",text:"2026 年 9 月监测数据存证"},
    {at:"2026-10-15 14:05",actor:MANAGER_NAME,text:"买入 CCER 800 tCO₂e · 广西北海红树林营造项目"},
    {at:"2026-09-18 10:26",actor:MANAGER_NAME,text:"买入 CEA 2025 1,500 t"},
    {at:"2026-06-26 11:30",actor:ETS_VERIFIER,text:"出具 2025 年度核查报告"}
  ];
  return data;
}
function ets() {
  if(demo.ets?.v!==2){demo.ets=etsBuild();persistDemo();}
  return demo.ets;
}
function etsSel(){return etsYear??etsFocusYear();}
function etsFocusYear() {
  const data=ets();
  return ETS_YEARS.find(year=>data.cycles[year].surrender.status!=="已清缴"&&data.cycles[year].report.status==="已核查")||CURRENT_YEAR;
}
function etsCycle(year){return ets().cycles[year];}
function etsHoldings() {
  const map={};
  ets().ledger.forEach(row=>{map[row.vintage]=(map[row.vintage]||0)+row.qty;});
  return map;
}
function etsAvailable(year){return Object.entries(etsHoldings()).filter(([vintage])=>Number(vintage)<=year).reduce((sum,[,qty])=>sum+qty,0);}
function etsCcerFor(year){return ets().ccer.filter(row=>row.usedFor===year&&row.status!=="可用").reduce((sum,row)=>sum+row.qty,0);}
function etsCalc(year) {
  const cycle=etsCycle(year),months=ets().monthly[year],sums=etsSums(months);
  const verifiedDone=cycle.report.status==="已核查";
  const verified=verifiedDone?cycle.report.verifiedQty:Math.round(sums.emission);
  const settled=cycle.surrender.status==="已清缴";
  const final=cycle.alloc.final;
  const estimateAlloc=final?final.qty:etsAllocFormula(year,months).qty;
  const pending=final&&final.status!=="已确认"?final.qty-(cycle.alloc.pre?.qty||0):0;
  const available=settled?0:etsAvailable(year);
  const ccer=settled?cycle.surrender.ccer:etsCcerFor(year);
  const need=settled?0:verified-ccer;
  const gap=settled?0:final?available+pending-need:estimateAlloc-verified;
  return {cycle,sums,verified,verifiedDone,settled,alloc:estimateAlloc,allocFinal:!!final,pending,available,ccer,need,gap,
    cap:Math.floor(verified*ETS_CCER_CAP),attested:months.filter(row=>row.status==="已存证").length};
}
function etsResult(cycle){return etsCalc(cycle.year);}
function etsStatus(year) {
  const calc=etsCalc(year),cycle=calc.cycle;
  if(calc.settled)return {label:"已履约",tone:"ok"};
  if(cycle.report.status==="已核查")return calc.gap>=0?{label:"待清缴",tone:"warn"}:{label:"待补足",tone:"bad"};
  if(cycle.report.status==="已提交")return {label:"核查中",tone:"warn"};
  if(cycle.report.status==="待提交")return {label:"待报告",tone:"warn"};
  return {label:"监测中",tone:"gray"};
}
function etsCoalFactor(year=CURRENT_YEAR) {
  if(demo.ets?.v!==2)return CHP_COAL_FACTOR;
  const sums=etsSums(demo.ets.monthly[year]);
  return sums.coal?sums.coalEmission/sums.coal:CHP_COAL_FACTOR;
}
function chpAnnual(name,year) {
  if(name!==CHP_COAL&&name!==CHP_ELEC)return null;
  const sums=etsSums(ets().monthly[year]);
  return name===CHP_COAL?{activity:sums.coal,emission:sums.coalEmission}:{activity:sums.elec*1000,emission:sums.elecEmission};
}
function etsEditable(){return currentRole==="管理者";}
function etsLog(text,actor=MANAGER_NAME){ets().log.unshift({at:nowText().slice(0,16),actor,text});}
function etsTodos() {
  const list=[];
  ETS_YEARS.forEach(year=>{
    const calc=etsCalc(year),cycle=calc.cycle;
    if(calc.settled)return;
    const months=ets().monthly[year];
    months.filter(row=>row.status==="待存证").forEach(row=>list.push({year,tag:"监测",title:year+" 年 "+MONTH_NAMES[row.month-1]+"监测数据待存证",meta:"截止 "+year+"-"+String(row.month+1).padStart(2,"0")+"-10",button:"去存证",action:"openEtsMonth("+year+","+row.month+")"}));
    if(cycle.report.status==="待提交")list.push({year,tag:"报告",title:year+" 年度排放报告待提交",meta:"截止 "+(year+1)+"-03-31",button:"提交",action:"openEtsReport("+year+")",primary:true});
    if(cycle.report.status==="已提交")list.push({year,tag:"核查",title:year+" 年度排放报告核查中",meta:"提交于 "+cycle.report.submittedAt,button:"登记结论",action:"openEtsVerify("+year+")"});
    const final=cycle.alloc.final;
    if(final?.status==="待确认")list.push({year,tag:"配额",title:year+" 年度配额核定结果待确认",meta:"核定 "+fmt(final.qty,0)+" t · 确认截止 "+final.confirmBy,button:"确认",action:"go('碳履约','配额管理')",primary:true});
    if(final?.status==="异议处理中")list.push({year,tag:"配额",title:year+" 年度配额核定异议处理中",meta:"提交于 "+final.objection.at,button:"查看",action:"go('碳履约','配额管理')"});
    if(cycle.report.status==="已核查"&&final&&calc.gap<0) {
      const room=Math.max(0,Math.min(calc.cap-calc.ccer,etsCcerFree()));
      if(room>0)list.push({year,tag:"CCER",title:"可用 CCER "+fmt(room,0)+" tCO₂e 未申请抵销",meta:year+" 年度上限 "+fmt(calc.cap,0)+" · 已用 "+fmt(calc.ccer,0),button:"申请抵销",action:"openCcerApply("+year+")"});
      const buy=Math.max(0,-calc.gap-room);
      if(buy>0)list.push({year,tag:"交易",title:year+" 年度配额缺口 "+fmt(-calc.gap,0)+" t",meta:"需买入 CEA "+fmt(buy,0)+" t · 参考价 "+etsPrice().toFixed(2)+" 元/t",button:"买入",action:"openEtsOrder('买入','CEA',"+buy+")",primary:true});
    }
    if(cycle.report.status==="已核查"&&final?.status==="已确认"&&calc.gap>=0)list.push({year,tag:"清缴",title:year+" 年度配额可清缴",meta:"应清缴 "+fmt(calc.verified,0)+" t · 截止 "+cycle.deadline,button:"去清缴",action:"go('碳履约','配额清缴')",primary:true});
  });
  return list;
}
function etsCcerFree(){return ets().ccer.filter(row=>row.status==="可用").reduce((sum,row)=>sum+row.qty,0);}

function setEtsYear(year){etsYear=Number(year);render();}
function etsTabs() {
  const sel=etsSel();
  return '<div class="segTabs">'+ETS_YEARS.map(year=>{const status=etsStatus(year);
    return '<button class="'+(year===sel?'active':'')+'" onclick="setEtsYear('+year+')">'+year+' 年度 <em>'+status.label+'</em></button>';}).join("")+'</div>';
}
function etsHead(title,actions="",tabs=true) {
  return pageHead(title,actions,"碳履约 / "+title)+(tabs?etsTabs():'');
}
function etsFlow(year) {
  const calc=etsCalc(year),cycle=calc.cycle,final=cycle.alloc.final;
  const steps=[
    ["月度监测",calc.attested===12?"done":"now",calc.attested+" / 12 已存证"],
    ["排放报告",["已提交","已核查"].includes(cycle.report.status)?"done":cycle.report.status==="待提交"?"now":"",cycle.report.submittedAt?"提交 "+cycle.report.submittedAt:"截止 "+(year+1)+"-03-31"],
    ["第三方核查",cycle.report.status==="已核查"?"done":cycle.report.status==="已提交"?"now":"",cycle.report.verifiedAt?fmt(cycle.report.verifiedQty,0)+" t · "+cycle.report.verifiedAt:"—"],
    ["配额核定",final?.status==="已确认"?"done":final?"now":"",final?(final.status==="已确认"?fmt(final.qty,0)+" t · "+final.confirmedAt:final.status):cycle.alloc.pre?"预分配 "+fmt(cycle.alloc.pre.qty,0):"未下发"],
    ["交易与抵销",calc.settled||(final&&calc.gap>=0)?"done":final?"now":"",calc.settled?"CCER "+fmt(cycle.surrender.ccer,0):final?(calc.gap>=0?"盈余 "+fmt(calc.gap,0):"缺口 "+fmt(-calc.gap,0)):"—"],
    ["配额清缴",calc.settled?"done":final?.status==="已确认"&&calc.gap>=0?"now":"",calc.settled?cycle.surrender.at:"截止 "+cycle.deadline]
  ];
  return '<ol class="etsFlow">'+steps.map(([name,tone,note],index)=>'<li class="'+tone+'"><i>'+(tone==="done"?"✓":index+1)+'</i><b>'+name+'</b><small>'+note+'</small></li>').join("")+'</ol>';
}
function etsTile(label,value,note,tone){return statTile(label,tone?'<i class="'+tone+'" style="font-style:normal">'+value+'</i>':value,note);}
function etsWorkbench() {
  const year=etsSel(),calc=etsCalc(year),cycle=calc.cycle,status=etsStatus(year);
  const days=daysUntil(cycle.deadline);
  const todos=etsTodos();
  return etsHead("履约工作台")+
    '<div class="statRow five">'+etsTile(calc.verifiedDone?"应清缴（核查量）":"预计排放",fmt(calc.verified,0),"tCO₂"+(calc.verifiedDone?" · "+cycle.report.verifyNo:" · 1–12 月监测"+(year===CURRENT_YEAR?"含计划":"")))+
      (calc.settled?etsTile("已清缴 CEA",fmt(cycle.surrender.cea,0),"t · "+cycle.surrender.at):etsTile(calc.allocFinal?"可用配额":"预计配额",fmt(calc.allocFinal?calc.available:calc.alloc,0),calc.pending?"另有待确认补发 "+fmt(calc.pending,0)+" t":calc.allocFinal?"含结转与交易":"按 "+year+" 年基准值测算"))+
      etsTile("CCER 抵销",fmt(calc.ccer,0),"上限 "+fmt(calc.cap,0)+" tCO₂e")+
      (calc.settled?etsTile("履约状态","已履约","凭证 "+cycle.surrender.cert,"okText"):etsTile(calc.gap>=0?(calc.allocFinal?"配额盈余":"预计盈余"):(calc.allocFinal?"配额缺口":"预计缺口"),fmt(Math.abs(calc.gap),0),"t",calc.gap>=0?"okText":"badText"))+
      etsTile(calc.settled?"清缴日期":"距清缴截止",calc.settled?cycle.surrender.at:days+" 天","截止 "+cycle.deadline)+'</div>'+
    '<section class="panel"><div class="panelHead"><h3>'+year+' 年度履约进度</h3><span class="status '+status.tone+'">'+status.label+'</span></div>'+etsFlow(year)+'</section>'+
    '<div class="homeGrid even"><div>'+
      card("待办事项",todos.length?'<ul class="todoList etsTodo">'+todos.map(item=>'<li><span class="todoTag'+(item.primary?' warn':'')+'">'+item.tag+'</span><div><b>'+item.title+'</b><small>'+item.meta+'</small></div>'+
        (etsEditable()?'<button class="btn'+(item.primary?' primary':'')+'" onclick="'+item.action+'">'+item.button+'</button>':'')+'</li>').join("")+'</ul>':'<div class="todoEmpty">暂无待办</div>')+
    '</div><div>'+
      card("操作记录",'<ul class="feed">'+ets().log.slice(0,8).map(row=>'<li><time>'+textHtml(row.at)+'</time><span>'+textHtml(row.actor)+'</span>'+textHtml(row.text)+'</li>').join("")+'</ul>')+
    '</div></div>'+
    card("历年履约",'<div class="tableWrap"><table><thead><tr><th>年度</th><th>核查排放 (t)</th><th>核定配额 (t)</th><th>CCER 抵销</th><th>清缴 CEA</th><th>核定−核查</th><th>清缴日期</th><th>状态</th><th>凭证</th></tr></thead><tbody>'+
      ETS_YEARS.map(y=>{const c=etsCalc(y),cy=c.cycle,s=etsStatus(y);
        const result=c.settled?cy.alloc.final.qty-c.verified:c.gap;
        return '<tr><td><button class="linkBtn" onclick="setEtsYear('+y+')">'+y+'</button></td><td>'+(c.verifiedDone?fmt(c.verified,0):'<span class="muted">'+fmt(c.verified,0)+'（预计）</span>')+'</td><td>'+(cy.alloc.final?fmt(cy.alloc.final.qty,0):'—')+'</td><td>'+fmt(c.ccer,0)+'</td><td>'+(c.settled?fmt(cy.surrender.cea,0):'—')+
          '</td><td class="'+(result>=0?'okText':'badText')+'">'+(cy.alloc.final?(result>=0?'+':'')+fmt(result,0):'—')+'</td><td>'+(cy.surrender.at||'—')+'</td><td><span class="status '+s.tone+'">'+s.label+'</span></td><td>'+(c.settled?'<button class="linkBtn" onclick="showEtsCert('+y+')">'+cy.surrender.cert+'</button>':'—')+'</td></tr>';}).join("")+
      '</tbody></table></div>');
}

// 排放监测
function etsMonitorPage() {
  const year=etsSel(),calc=etsCalc(year),cycle=calc.cycle,months=ets().monthly[year],sums=calc.sums;
  const report=cycle.report;
  const canSubmit=etsEditable()&&calc.attested===12&&["监测中","待提交"].includes(report.status);
  return etsHead("排放监测",'<button class="btn" onclick="exportFirstTable()">导出</button>'+(canSubmit?'<button class="btn primary" onclick="openEtsReport('+year+')">提交年度报告</button>':''))+
    '<div class="statRow five">'+statTile("入炉煤量",fmt(sums.coal,0),"t")+statTile("燃煤排放",fmt(sums.coalEmission,0),"tCO₂")+statTile("下网电量",fmt(sums.elec,1),"MWh · "+fmt(sums.elecEmission,0)+" tCO₂")+
      statTile("供电量",fmt(sums.supply,0),"MWh · 供热 "+fmt(sums.heat,0)+" GJ")+statTile("已存证",calc.attested+" / 12","月")+'</div>'+
    '<section class="panel"><div class="panelHead"><h3>月度数据</h3><span class="muted small">氧化率 '+CHP_PARAMS.of+' · 电网因子 '+ETS_GRID_FACTOR+' tCO₂/MWh</span></div>'+
    '<div class="tableWrap"><table class="monthTable"><thead><tr><th>月份</th><th>入炉煤量 (t)</th><th>低位发热量 (GJ/t)</th><th>单位热值含碳量 (tC/GJ)</th><th>供电量 (MWh)</th><th>供热量 (GJ)</th><th>下网电量 (MWh)</th><th>排放量 (tCO₂)</th><th>凭证</th><th>状态</th><th></th></tr></thead><tbody>'+
      months.map(row=>{const e=etsMonthEmission(row);const tone={"已存证":"ok","待存证":"warn","未到期":"gray"}[row.status];
        return '<tr><td>'+MONTH_NAMES[row.month-1]+'</td><td>'+fmt(row.coal,0)+'</td><td>'+row.ncv.toFixed(2)+'</td><td>'+row.cc.toFixed(5)+'</td><td>'+fmt(row.supply,0)+'</td><td>'+fmt(row.heat,0)+'</td><td>'+fmt(row.elec,1)+'</td><td>'+fmt(e.total,0)+'</td><td>'+(row.evidence||'—')+'</td>'+
          '<td><span class="status '+tone+'">'+(row.status==="未到期"?"计划值":row.status)+'</span>'+(row.at?'<small>'+row.at+'</small>':'')+'</td><td>'+
          (row.status==="待存证"&&etsEditable()?'<button class="btn primary" onclick="openEtsMonth('+year+','+row.month+')">填报</button>':
           row.status==="已存证"?'<button class="linkBtn" onclick="openEtsMonth('+year+','+row.month+')">查看</button>':'')+'</td></tr>';}).join("")+
      '<tr class="sumRow"><td>合计</td><td>'+fmt(sums.coal,0)+'</td><td>'+(sums.coal?(months.reduce((s,r)=>s+r.coal*r.ncv,0)/sums.coal).toFixed(2):'—')+'</td><td>—</td><td>'+fmt(sums.supply,0)+'</td><td>'+fmt(sums.heat,0)+'</td><td>'+fmt(sums.elec,1)+'</td><td>'+fmt(sums.emission,0)+'</td><td></td><td></td><td></td></tr>'+
    '</tbody></table></div></section>'+
    '<div class="homeGrid even"><div>'+card("年度排放报告",'<dl class="miniFacts cols2"><div><dt>报告编号</dt><dd>'+(report.no||'—')+'</dd></div><div><dt>状态</dt><dd><span class="status '+({"已核查":"ok","已提交":"warn"}[report.status]||"gray")+'">'+report.status+'</span></dd></div>'+
        '<div><dt>提交日期</dt><dd>'+(report.submittedAt||'截止 '+(year+1)+'-03-31')+'</dd></div><div><dt>报告排放量</dt><dd>'+(report.reportedQty?fmt(report.reportedQty,0):report.status==="已核查"?fmt(report.verifiedQty,0):'—')+' tCO₂</dd></div></dl>')+
    '</div><div>'+card("核查结论",report.status==="已核查"?'<dl class="miniFacts cols2"><div><dt>核查机构</dt><dd>'+textHtml(report.verifier)+'</dd></div><div><dt>核查报告</dt><dd>'+report.verifyNo+'</dd></div>'+
        '<div><dt>核查日期</dt><dd>'+report.verifiedAt+'</dd></div><div><dt>核查排放量</dt><dd>'+fmt(report.verifiedQty,0)+' tCO₂</dd></div></dl>':
        report.status==="已提交"?'<div class="todoEmpty">核查中</div>'+(etsEditable()?'<div class="actions"><button class="btn primary" onclick="openEtsVerify('+year+')">登记核查结论</button></div>':''):'<div class="todoEmpty">未开始</div>')+'</div></div>';
}
function openEtsMonth(year,month) {
  const row=ets().monthly[year][month-1];
  const edit=row.status==="待存证"&&etsEditable();
  const field=(id,label,value,step)=>'<label>'+label+'<input id="'+id+'" type="number" min="0" step="'+step+'" value="'+value+'" '+(edit?'':'disabled')+'></label>';
  openModal('<h2>'+year+' 年 '+MONTH_NAMES[row.month-1]+'监测数据</h2><div class="modalForm">'+
    field("mCoal","入炉煤量 (t)",row.coal,1)+field("mNcv","低位发热量 (GJ/t)",row.ncv,0.01)+field("mCc","单位热值含碳量 (tC/GJ)",row.cc,0.00001)+
    field("mSupply","供电量 (MWh)",row.supply,1)+field("mHeat","供热量 (GJ)",row.heat,1)+field("mElec","下网电量 (MWh)",row.elec,0.1)+
    '<label>凭证编号<input id="mEvidence" value="'+textHtml(row.evidence||"")+'" '+(edit?'':'disabled')+'></label>'+
    '<label>状态<input value="'+row.status+(row.at?" · "+row.at:"")+'" disabled></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">'+(edit?'取消':'关闭')+'</button>'+
    (edit?'<button class="btn" onclick="saveEtsMonth('+year+','+month+',false)">保存</button><button class="btn primary" onclick="saveEtsMonth('+year+','+month+',true)">保存并存证</button>':'')+'</div>');
}
async function saveEtsMonth(year,month,attest) {
  etsYear=year;
  const row=ets().monthly[year][month-1];
  const read=id=>Number(document.getElementById(id).value);
  const values={coal:read("mCoal"),ncv:read("mNcv"),cc:read("mCc"),supply:read("mSupply"),heat:read("mHeat"),elec:read("mElec")};
  if(Object.values(values).some(value=>!(value>0))){showToast("请填写大于 0 的数值");return;}
  if(values.ncv<15||values.ncv>30){showToast("低位发热量超出合理范围（15–30 GJ/t）");return;}
  const evidence=document.getElementById("mEvidence").value.trim();
  if(attest&&!evidence){showToast("存证前请填写凭证编号");return;}
  Object.assign(row,values,{evidence});
  if(attest){row.status="已存证";row.at=todayText();}
  etsLog(year+" 年 "+MONTH_NAMES[month-1]+"监测数据"+(attest?"存证":"保存"));
  const cycle=etsCycle(year);
  if(cycle.report.status==="监测中"&&ets().monthly[year].every(item=>item.status==="已存证"))cycle.report.status="待提交";
  if(year===CURRENT_YEAR) {
    const sums=etsSums(ets().monthly[year]);
    demo.taskEntries["T-S1-04"]={...demo.taskEntries["T-S1-04"],activity:Math.round(sums.coal),evidence:"MRV-RD-"+year+String(month).padStart(2,"0")};
    demo.taskEntries["T-S2-04"]={...demo.taskEntries["T-S2-04"],activity:Math.round(sums.elec*1000),evidence:"MRV-RD-"+year+String(month).padStart(2,"0")};
    persistDemo();
    await loadBackendData();
  }
  persistDemo();closeModal();render();showToast(attest?"已存证，组织盘查热电数据已同步":"已保存");
}
function openEtsReport(year) {
  const sums=etsSums(ets().monthly[year]);
  openModal('<h2>提交 '+year+' 年度排放报告</h2><dl class="miniFacts cols2"><div><dt>重点排放单位</dt><dd>'+ETS_ENTITY.name+'</dd></div><div><dt>报告年度</dt><dd>'+year+'</dd></div>'+
    '<div><dt>燃煤排放</dt><dd>'+fmt(sums.coalEmission,0)+' tCO₂</dd></div><div><dt>购入电力排放</dt><dd>'+fmt(sums.elecEmission,0)+' tCO₂</dd></div>'+
    '<div><dt>排放总量</dt><dd><b>'+fmt(sums.emission,0)+' tCO₂</b></dd></div><div><dt>供电量 / 供热量</dt><dd>'+fmt(sums.supply,0)+' MWh / '+fmt(sums.heat,0)+' GJ</dd></div></dl>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="submitEtsReport('+year+')">确认提交</button></div>');
}
function submitEtsReport(year) {
  etsYear=year;
  const cycle=etsCycle(year),sums=etsSums(ets().monthly[year]);
  Object.assign(cycle.report,{status:"已提交",no:"ER-"+year+"-330400-0187",submittedAt:todayText(),reportedQty:Math.round(sums.emission)});
  etsLog("提交 "+year+" 年度排放报告 "+fmt(sums.emission,0)+" tCO₂");
  persistDemo();closeModal();render();showToast("排放报告已提交");
}
function openEtsVerify(year) {
  const cycle=etsCycle(year);
  openModal('<h2>登记 '+year+' 年度核查结论</h2><div class="modalForm">'+
    '<label>核查机构<input id="vOrg" value="'+ETS_VERIFIER+'"></label><label>核查报告编号<input id="vNo" value="HC-'+(year+1)+'-ZJ-"></label>'+
    '<label>核查日期<input id="vDate" type="date" value="'+todayText()+'"></label><label>核查排放量 (tCO₂)<input id="vQty" type="number" min="0" value="'+(cycle.report.reportedQty||0)+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveEtsVerify('+year+')">保存</button></div>');
}
function saveEtsVerify(year) {
  etsYear=year;
  const qty=Number(document.getElementById("vQty").value),no=document.getElementById("vNo").value.trim();
  if(!(qty>0)||no.length<12){showToast("请填写核查报告编号和核查排放量");return;}
  Object.assign(etsCycle(year).report,{status:"已核查",verifier:document.getElementById("vOrg").value.trim(),verifyNo:no,verifiedAt:document.getElementById("vDate").value,verifiedQty:Math.round(qty)});
  etsLog("登记 "+year+" 年度核查结论 "+fmt(qty,0)+" tCO₂");
  persistDemo();closeModal();render();showToast("核查结论已登记");
}

// 配额管理
function etsLedgerRows(filterYear) {
  let balance=0;
  const rows=ets().ledger.map(row=>{balance+=row.qty;return {...row,balance};});
  return rows.filter(row=>!filterYear||row.year===filterYear).reverse();
}
function etsAllocPage() {
  const year=etsSel(),cycle=etsCycle(year),final=cycle.alloc.final,p=ETS_PROFILE[year];
  const holdings=etsHoldings();
  const est=etsAllocFormula(year,ets().monthly[year]);
  const sums=etsSums(ets().monthly[year]);
  const formula=final||est;
  const editable=etsEditable()&&final&&final.status==="待确认";
  return etsHead("配额管理",'<button class="btn" onclick="exportFirstTable()">导出流水</button>')+
    '<div class="statRow">'+Object.keys(holdings).sort().filter(vintage=>holdings[vintage]>0).map(vintage=>statTile(vintage+" 年度配额",fmt(holdings[vintage],0),"t")).join("")+statTile("账户合计",fmt(Object.values(holdings).reduce((a,b)=>a+b,0),0),"t · "+ETS_ENTITY.account)+'</div>'+
    '<section class="panel"><div class="panelHead"><h3>'+year+' 年度配额核定</h3>'+(final?'<span class="status '+({"已确认":"ok","待确认":"warn"}[final.status]||"bad")+'">'+final.status+'</span>':'<span class="status gray">'+(cycle.alloc.pre?'已预分配':'未下发')+'</span>')+'</div>'+
      '<div class="tableWrap"><table><thead><tr><th>项目</th><th>产出量</th><th>基准值</th><th>修正系数</th><th>配额 (t)</th></tr></thead><tbody>'+
        '<tr><td>供电</td><td>'+fmt(sums.supply,0)+' MWh</td><td>'+p.be+' tCO₂/MWh</td><td>1.000</td><td>'+fmt(formula.power,0)+'</td></tr>'+
        '<tr><td>供热</td><td>'+fmt(sums.heat,0)+' GJ</td><td>'+p.bh+' tCO₂/GJ</td><td>1.000</td><td>'+fmt(formula.heat,0)+'</td></tr>'+
        '<tr class="sumRow"><td>'+(final?'核定配额':'预计配额')+'</td><td></td><td></td><td></td><td>'+fmt(formula.qty,0)+'</td></tr>'+
        (cycle.alloc.pre?'<tr><td>预分配（'+cycle.alloc.pre.at+'）</td><td></td><td></td><td></td><td>'+fmt(cycle.alloc.pre.qty,0)+'</td></tr>':'')+
        (final?'<tr><td>核定补发'+(final.status==="已确认"?'（'+final.confirmedAt+' 到账）':'（待确认）')+'</td><td></td><td></td><td></td><td>'+fmt(final.qty-cycle.alloc.pre.qty,0)+'</td></tr>':'')+
      '</tbody></table></div>'+
      (final?'<dl class="miniFacts cols2"><div><dt>核定机关</dt><dd>'+ETS_AUTHORITY+'</dd></div><div><dt>下发日期</dt><dd>'+final.at+'</dd></div>'+
        (final.status==="待确认"?'<div><dt>确认截止</dt><dd>'+final.confirmBy+'（剩余 '+Math.max(0,daysUntil(final.confirmBy))+' 天）</dd></div>':'')+
        (final.objection?'<div><dt>异议</dt><dd>'+textHtml(final.objection.reason)+' · '+final.objection.at+'</dd></div>':'')+'</dl>':'')+
      (editable?'<div class="actions"><button class="btn" onclick="openAllocObjection('+year+')">提出异议</button><button class="btn primary" onclick="confirmAlloc('+year+')">确认核定结果</button></div>':
       etsEditable()&&final?.status==="异议处理中"?'<div class="actions"><button class="btn" onclick="withdrawObjection('+year+')">撤回异议</button></div>':'')+
    '</section>'+
    card("配额账户流水",'<div class="tableWrap"><table><thead><tr><th>流水号</th><th>日期</th><th>业务类型</th><th>配额年度</th><th>变动 (t)</th><th>余额 (t)</th><th>关联单据</th></tr></thead><tbody>'+
      etsLedgerRows().map(row=>'<tr><td>'+row.id+'</td><td>'+row.date+'</td><td>'+row.type+'</td><td>'+row.vintage+'</td><td class="'+(row.qty>=0?'okText':'badText')+'">'+(row.qty>=0?'+':'')+fmt(row.qty,0)+'</td><td>'+fmt(row.balance,0)+'</td><td>'+textHtml(row.ref)+'</td></tr>').join("")+
    '</tbody></table></div>');
}
function confirmAlloc(year) {
  etsYear=year;
  const cycle=etsCycle(year),final=cycle.alloc.final;
  if(final.status!=="待确认")return;
  final.status="已确认";final.confirmedAt=todayText();
  const data=ets();
  data.ledger.push({id:"LG"+String(++data.seq).padStart(5,"0"),date:todayText(),type:"核定补发",vintage:year,qty:final.qty-cycle.alloc.pre.qty,ref:ETS_AUTHORITY+" 核定",year});
  etsLog("确认 "+year+" 年度配额核定结果 "+fmt(final.qty,0)+" t，补发 "+fmt(final.qty-cycle.alloc.pre.qty,0)+" t 到账");
  persistDemo();render();showToast("核定结果已确认，补发配额已到账");
}
function openAllocObjection(year) {
  openModal('<h2>'+year+' 年度配额核定异议</h2><div class="modalForm"><label>异议事项<select id="objType"><option>供电量与核查报告不一致</option><option>供热量与核查报告不一致</option><option>修正系数适用有误</option><option>其他</option></select></label>'+
    '<label>说明<input id="objReason" placeholder="具体数据与依据"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveAllocObjection('+year+')">提交异议</button></div>');
}
function saveAllocObjection(year) {
  etsYear=year;
  const reason=document.getElementById("objType").value+(document.getElementById("objReason").value.trim()?"：":"")+document.getElementById("objReason").value.trim();
  const final=etsCycle(year).alloc.final;
  final.status="异议处理中";final.objection={at:todayText(),reason};
  etsLog("对 "+year+" 年度配额核定提出异议");
  persistDemo();closeModal();render();showToast("异议已提交至 "+ETS_AUTHORITY);
}
function withdrawObjection(year) {
  etsYear=year;
  const final=etsCycle(year).alloc.final;
  final.status="待确认";delete final.objection;
  etsLog("撤回 "+year+" 年度配额核定异议");
  persistDemo();render();showToast("异议已撤回");
}

// 交易委托
function etsTradePage() {
  const price=etsPrice(),series=marketSeries();
  const orders=ets().orders;
  const filled=orders.filter(row=>row.status==="已成交");
  const spend=filled.filter(row=>row.at.startsWith(String(CURRENT_YEAR))).reduce((sum,row)=>sum+(row.side==="买入"?1:-1)*row.qty*row.filledPrice,0);
  const holdings=etsHoldings();
  return etsHead("交易委托",etsEditable()?'<button class="btn" onclick="openEtsOrder(\'卖出\',\'CEA\')">卖出</button><button class="btn primary" onclick="openEtsOrder(\'买入\',\'CEA\')">买入</button>':'',false)+
    '<div class="statRow five">'+statTile("CEA 收盘价",price.toFixed(2),"元/t · "+((price-series.at(-2))>=0?"+":"")+(price-series.at(-2)).toFixed(2))+statTile("CCER 参考价",CCER_PRICE.toFixed(2),"元/tCO₂e")+
      statTile("CEA 持仓",fmt(Object.values(holdings).reduce((a,b)=>a+b,0),0),"t · 市值 "+fmt(Object.values(holdings).reduce((a,b)=>a+b,0)*price/10000,1)+" 万元")+
      statTile("CCER 可用",fmt(etsCcerFree(),0),"tCO₂e")+statTile(CURRENT_YEAR+" 年交易净支出",fmt(spend/10000,1),"万元")+'</div>'+
    card("委托记录",'<div class="tableWrap"><table><thead><tr><th>委托号</th><th>委托时间</th><th>方向</th><th>品种</th><th>年度</th><th>数量</th><th>委托价</th><th>成交价</th><th>金额 (元)</th><th>方式</th><th>状态</th><th></th></tr></thead><tbody>'+
      orders.map(row=>'<tr><td>'+row.id+'</td><td>'+row.at+'</td><td class="'+(row.side==="买入"?'badText':'okText')+'">'+row.side+'</td><td>'+row.product+(row.project?'<small>'+textHtml(row.project)+'</small>':'')+'</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td><td>'+row.price.toFixed(2)+'</td><td>'+(row.status==="已成交"?row.filledPrice.toFixed(2):'—')+'</td><td>'+
        (row.status==="已成交"?fmt(row.qty*row.filledPrice,0):'—')+'</td><td>'+row.channel+'</td><td><span class="status '+({"已成交":"ok","已报":"warn"}[row.status]||"gray")+'">'+row.status+'</span></td><td>'+
        (row.status==="已报"&&etsEditable()?'<button class="linkBtn" onclick="cancelEtsOrder(\''+row.id+'\')">撤单</button>':'')+'</td></tr>').join("")+
    '</tbody></table></div>');
}
function openEtsOrder(side,product="CEA",qty) {
  const year=etsFocusYear(),calc=etsCalc(year);
  const price=product==="CEA"?etsPrice():CCER_LISTINGS[0].price;
  const holdings=etsHoldings();
  const vintages=side==="买入"?[CURRENT_YEAR-1,CURRENT_YEAR-2]:Object.keys(holdings).filter(v=>holdings[v]>0).map(Number);
  const defaultQty=qty||(side==="买入"&&calc.gap<0?Math.max(0,-calc.gap-Math.min(Math.max(0,calc.cap-calc.ccer),etsCcerFree())):1000)||1000;
  openModal('<h2>'+side+'委托</h2><div class="modalForm">'+
    '<label>品种<select id="oProduct" onchange="openEtsOrder(\''+side+'\',this.value)" '+(side==="卖出"?'disabled':'')+'><option '+(product==="CEA"?'selected':'')+'>CEA</option><option '+(product==="CCER"?'selected':'')+'>CCER</option></select></label>'+
    (product==="CCER"?'<label>项目<select id="oProject" onchange="document.getElementById(\'oPrice\').value=this.selectedOptions[0].dataset.price">'+CCER_LISTINGS.map(row=>'<option value="'+textHtml(row.project)+'" data-price="'+row.price+'">'+row.project+' · '+row.type+' · '+row.price.toFixed(2)+'</option>').join("")+'</select></label>':
      '<label>配额年度<select id="oVintage">'+vintages.map(v=>'<option value="'+v+'">'+v+(side==="卖出"?' · 持有 '+fmt(holdings[v],0):'')+'</option>').join("")+'</select></label>')+
    '<label>数量 ('+(product==="CEA"?"t":"tCO₂e")+')<input id="oQty" type="number" min="100" step="100" value="'+Math.ceil(defaultQty/100)*100+'"></label>'+
    '<label>委托价 (元)<input id="oPrice" type="number" min="1" step="0.01" value="'+price.toFixed(2)+'"></label>'+
    '<label>交易方式<select id="oChannel"><option>挂牌协议</option><option>大宗协议</option></select></label>'+
    '<label>资金账户<input value="浙商银行嘉兴分行 · 碳交易结算户" disabled></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveEtsOrder(\''+side+'\',\''+product+'\')">提交委托</button></div>');
}
function saveEtsOrder(side,product) {
  const qty=Number(document.getElementById("oQty").value),price=Number(document.getElementById("oPrice").value);
  if(!(qty>=100)||qty%100){showToast("数量需为 100 的整数倍");return;}
  if(!(price>0)){showToast("请填写委托价");return;}
  const data=ets();
  const vintage=product==="CEA"?Number(document.getElementById("oVintage").value):2024;
  const project=product==="CCER"?document.getElementById("oProject").value:"";
  const market=product==="CEA"?etsPrice():CCER_LISTINGS.find(row=>row.project===project).price;
  if(side==="卖出"&&(etsHoldings()[vintage]||0)<qty){showToast(vintage+" 年度配额余额不足");return;}
  if(price>market*1.1||price<market*0.9){showToast("委托价超出 ±10% 涨跌幅限制（"+(market*0.9).toFixed(2)+"–"+(market*1.1).toFixed(2)+"）");return;}
  const fill=side==="买入"?price>=market:price<=market;
  const at=nowText();
  const id="WT"+todayText().replace(/-/g,"")+String(data.orders.length+31).padStart(4,"0");
  const order={id,at:at.slice(0,16),side,product,vintage,qty,price,filledPrice:fill?+market.toFixed(2):null,status:fill?"已成交":"已报",filledAt:fill?todayText():"",channel:document.getElementById("oChannel").value,year:etsFocusYear(),project};
  data.orders.unshift(order);
  if(fill)etsSettleOrder(order);
  etsLog((fill?"成交 ":"委托 ")+side+" "+product+" "+fmt(qty,0)+" t @ "+price.toFixed(2)+(project?" · "+project:""));
  persistDemo();closeModal();render();
  showToast(fill?side+"成交 "+fmt(qty,0)+" t，成交价 "+market.toFixed(2)+" 元":"委托已报，等待成交");
}
function etsSettleOrder(order) {
  const data=ets();
  if(order.product==="CEA")data.ledger.push({id:"LG"+String(++data.seq).padStart(5,"0"),date:todayText(),type:order.side,vintage:order.vintage,qty:order.side==="买入"?order.qty:-order.qty,ref:order.id,year:order.year});
  else data.ccer.push({id:"CCER-"+CURRENT_YEAR+"-"+String(1200+data.ccer.length*37).padStart(4,"0"),project:order.project,type:CCER_LISTINGS.find(row=>row.project===order.project).type,vintage:2024,qty:order.qty,acquiredAt:todayText(),price:order.filledPrice,status:"可用",ref:order.id});
}
function cancelEtsOrder(id) {
  const order=ets().orders.find(row=>row.id===id);
  if(!order||order.status!=="已报")return;
  order.status="已撤单";
  etsLog("撤单 "+id);
  persistDemo();render();showToast("已撤单");
}

// CCER 抵销
function etsCcerPage() {
  const year=etsSel(),calc=etsCalc(year);
  const canApply=etsEditable()&&!calc.settled&&calc.verifiedDone&&calc.cap>calc.ccer&&etsCcerFree()>0;
  return etsHead("CCER 抵销",etsEditable()?'<button class="btn" onclick="openEtsOrder(\'买入\',\'CCER\')">购买 CCER</button>'+(canApply?'<button class="btn primary" onclick="openCcerApply('+year+')">申请抵销</button>':''):'')+
    '<div class="statRow">'+statTile("抵销上限",fmt(calc.cap,0),"tCO₂e · 应清缴量 × 5%")+statTile(year+" 年度已申请",fmt(calc.ccer,0),"tCO₂e · 占上限 "+pct(calc.ccer,calc.cap)+"%")+
      statTile("可用持仓",fmt(etsCcerFree(),0),"tCO₂e")+statTile("剩余额度",fmt(Math.max(0,calc.cap-calc.ccer),0),"tCO₂e")+'</div>'+
    card("CCER 持仓",'<div class="tableWrap"><table><thead><tr><th>登记编号</th><th>项目</th><th>方法学类型</th><th>减排量年份</th><th>数量 (tCO₂e)</th><th>取得日期</th><th>成本 (元/t)</th><th>状态</th><th>用于</th><th></th></tr></thead><tbody>'+
      ets().ccer.map(row=>'<tr><td>'+row.id+'</td><td>'+textHtml(row.project)+'</td><td>'+row.type+'</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td><td>'+row.acquiredAt+'</td><td>'+row.price.toFixed(2)+'</td><td><span class="status '+({"可用":"ok","已锁定":"warn"}[row.status]||"gray")+'">'+row.status+'</span></td><td>'+(row.usedFor?row.usedFor+' 年度':'—')+'</td><td>'+
        (row.status==="已锁定"&&etsEditable()&&!etsCalc(row.usedFor).settled?'<button class="linkBtn" onclick="releaseCcer(\''+row.id+'\')">撤回</button>':'')+'</td></tr>').join("")+
    '</tbody></table></div>');
}
function openCcerApply(year) {
  const calc=etsCalc(year),room=calc.cap-calc.ccer;
  const rows=ets().ccer.filter(row=>row.status==="可用");
  openModal('<h2>'+year+' 年度 CCER 抵销申请</h2><dl class="miniFacts cols2"><div><dt>抵销上限</dt><dd>'+fmt(calc.cap,0)+' tCO₂e</dd></div><div><dt>剩余额度</dt><dd>'+fmt(room,0)+' tCO₂e</dd></div></dl>'+
    '<div class="tableWrap"><table class="compact"><thead><tr><th></th><th>登记编号</th><th>项目</th><th>数量</th></tr></thead><tbody>'+
    rows.map(row=>'<tr><td><input type="checkbox" class="ccerPick" value="'+row.id+'" data-qty="'+row.qty+'" checked onchange="ccerPickSum('+room+')"></td><td>'+row.id+'</td><td>'+textHtml(row.project)+'</td><td>'+fmt(row.qty,0)+'</td></tr>').join("")+
    '</tbody></table></div><p id="ccerPickTotal" class="small"></p>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveCcerApply('+year+')">提交申请</button></div>');
  ccerPickSum(room);
}
function ccerPickSum(room) {
  const total=[...document.querySelectorAll(".ccerPick:checked")].reduce((sum,box)=>sum+Number(box.dataset.qty),0);
  const node=document.getElementById("ccerPickTotal");
  if(node)node.innerHTML='已选 <b>'+fmt(total,0)+'</b> tCO₂e'+(total>room?' <span class="badText">超出剩余额度 '+fmt(total-room,0)+'</span>':'');
  return total;
}
function saveCcerApply(year) {
  etsYear=year;
  const calc=etsCalc(year),room=calc.cap-calc.ccer;
  const ids=[...document.querySelectorAll(".ccerPick:checked")].map(box=>box.value);
  const total=ccerPickSum(room);
  if(!ids.length){showToast("请选择要抵销的 CCER");return;}
  if(total>room){showToast("超出 5% 抵销上限");return;}
  ets().ccer.forEach(row=>{if(ids.includes(row.id)){row.status="已锁定";row.usedFor=year;}});
  etsLog("申请 "+year+" 年度 CCER 抵销 "+fmt(total,0)+" tCO₂e");
  persistDemo();closeModal();render();showToast("抵销申请已提交，CCER 已锁定");
}
function releaseCcer(id) {
  const row=ets().ccer.find(item=>item.id===id);
  if(!row||row.status!=="已锁定")return;
  etsLog("撤回 CCER 抵销 "+id);
  row.status="可用";delete row.usedFor;
  persistDemo();render();showToast("已撤回，CCER 恢复可用");
}

// 配额清缴
function etsSurrenderPlan(year) {
  const calc=etsCalc(year),holdings=etsHoldings();
  let left=calc.need;const plan=[];
  Object.keys(holdings).map(Number).sort().forEach(vintage=>{
    if(vintage>year||left<=0||holdings[vintage]<=0)return;
    const take=Math.min(holdings[vintage],left);plan.push({vintage,take});left-=take;
  });
  return {plan,short:left};
}
function etsSurrenderPage() {
  const year=etsSel(),calc=etsCalc(year),cycle=calc.cycle;
  if(calc.settled) {
    return etsHead("配额清缴",'<button class="btn" onclick="showEtsCert('+year+')">清缴凭证</button>')+
      '<div class="statRow">'+statTile("核查排放",fmt(calc.verified,0),"tCO₂")+statTile("清缴 CEA",fmt(cycle.surrender.cea,0),"t")+statTile("CCER 抵销",fmt(cycle.surrender.ccer,0),"tCO₂e")+
        statTile("清缴日期",cycle.surrender.at,cycle.surrender.cert)+'</div>'+etsSurrenderLedger(year);
  }
  const {plan,short}=etsSurrenderPlan(year);
  const checks=[
    ["排放报告核查完成",calc.verifiedDone,calc.verifiedDone?cycle.report.verifyNo:"未核查"],
    ["配额核定结果已确认",cycle.alloc.final?.status==="已确认",cycle.alloc.final?cycle.alloc.final.status:"未下发"],
    ["CEA 余额满足清缴",short<=0,short>0?"缺 "+fmt(short,0)+" t":"满足"],
    ["CCER 抵销不超过 5%",calc.ccer<=calc.cap,fmt(calc.ccer,0)+" / "+fmt(calc.cap,0)]
  ];
  const ready=checks.every(item=>item[1]);
  return etsHead("配额清缴",etsEditable()?'<button class="btn primary" '+(ready?'':'disabled')+' onclick="openEtsSurrender('+year+')">提交清缴</button>':'')+
    '<div class="statRow five">'+statTile("应清缴",fmt(calc.verified,0),"tCO₂ · "+(calc.verifiedDone?"核查量":"预计"))+statTile("CCER 抵销",fmt(calc.ccer,0),"tCO₂e")+
      statTile("需注销 CEA",fmt(calc.need,0),"t")+statTile("可用 CEA",fmt(calc.available,0),"t · 年度 ≤ "+year)+statTile("截止",cycle.deadline,daysUntil(cycle.deadline)+" 天")+'</div>'+
    '<div class="homeGrid even"><div>'+card("清缴条件",'<ul class="checkList">'+checks.map(([label,ok,note])=>'<li class="'+(ok?'ok':'bad')+'"><i>'+(ok?'✓':'!')+'</i><b>'+label+'</b><small>'+note+'</small></li>').join("")+'</ul>')+'</div><div>'+
      card("注销明细",'<div class="tableWrap"><table class="compact"><thead><tr><th>品种</th><th>年度</th><th>注销数量</th></tr></thead><tbody>'+
        plan.map(row=>'<tr><td>CEA</td><td>'+row.vintage+'</td><td>'+fmt(row.take,0)+'</td></tr>').join("")+
        ets().ccer.filter(row=>row.usedFor===year&&row.status==="已锁定").map(row=>'<tr><td>CCER</td><td>'+row.vintage+' · '+textHtml(row.project)+'</td><td>'+fmt(row.qty,0)+'</td></tr>').join("")+
        '<tr class="sumRow"><td>合计</td><td></td><td>'+fmt(calc.need-Math.max(0,short)+calc.ccer,0)+'</td></tr></tbody></table></div>')+'</div></div>';
}
function etsSurrenderLedger(year) {
  return card("注销记录",'<div class="tableWrap"><table><thead><tr><th>流水号</th><th>日期</th><th>品种</th><th>年度</th><th>数量</th><th>凭证</th></tr></thead><tbody>'+
    ets().ledger.filter(row=>row.type==="清缴注销"&&row.year===year).map(row=>'<tr><td>'+row.id+'</td><td>'+row.date+'</td><td>CEA</td><td>'+row.vintage+'</td><td>'+fmt(-row.qty,0)+'</td><td>'+textHtml(row.ref)+'</td></tr>').join("")+
    ets().ccer.filter(row=>row.usedFor===year).map(row=>'<tr><td>'+row.id+'</td><td>'+etsCycle(year).surrender.at+'</td><td>CCER</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td><td>'+etsCycle(year).surrender.cert+'</td></tr>').join("")+
  '</tbody></table></div>');
}
function openEtsSurrender(year) {
  const calc=etsCalc(year);
  openModal('<h2>确认提交 '+year+' 年度配额清缴</h2><dl class="miniFacts cols2"><div><dt>重点排放单位</dt><dd>'+ETS_ENTITY.name+'</dd></div><div><dt>登记账户</dt><dd>'+ETS_ENTITY.account+'</dd></div>'+
    '<div><dt>应清缴</dt><dd>'+fmt(calc.verified,0)+' tCO₂</dd></div><div><dt>注销 CEA</dt><dd>'+fmt(calc.need,0)+' t</dd></div><div><dt>注销 CCER</dt><dd>'+fmt(calc.ccer,0)+' tCO₂e</dd></div>'+
    '<div><dt>清缴后结余</dt><dd>'+fmt(calc.available-calc.need,0)+' t</dd></div></dl>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="submitEtsSurrender('+year+')">确认清缴</button></div>');
}
function submitEtsSurrender(year) {
  etsYear=year;
  const calc=etsCalc(year),cycle=calc.cycle,data=ets();
  const {plan,short}=etsSurrenderPlan(year);
  if(short>0||!calc.verifiedDone||cycle.alloc.final?.status!=="已确认"){showToast("清缴条件未满足");return;}
  const cert="QJ-"+year+"-330400-0187";
  plan.forEach(row=>data.ledger.push({id:"LG"+String(++data.seq).padStart(5,"0"),date:todayText(),type:"清缴注销",vintage:row.vintage,qty:-row.take,ref:cert,year}));
  data.ccer.forEach(row=>{if(row.usedFor===year&&row.status==="已锁定")row.status="已注销";});
  Object.assign(cycle.surrender,{status:"已清缴",at:todayText(),cea:calc.need,ccer:calc.ccer,cert});
  etsLog("完成 "+year+" 年度配额清缴：CEA "+fmt(calc.need,0)+" t，CCER "+fmt(calc.ccer,0)+" tCO₂e");
  persistDemo();closeModal();render();showEtsCert(year);showToast(year+" 年度清缴完成");
}
function showEtsCert(year) {
  const cycle=etsCycle(year),s=cycle.surrender;
  openModal('<div class="certDoc"><div class="certTitle">全国碳排放权注册登记系统<br><b>配额清缴确认单</b></div>'+
    '<dl class="miniFacts cols2"><div><dt>确认单编号</dt><dd>'+s.cert+'</dd></div><div><dt>履约年度</dt><dd>'+year+'</dd></div>'+
    '<div><dt>重点排放单位</dt><dd>'+ETS_ENTITY.name+'</dd></div><div><dt>登记账户</dt><dd>'+ETS_ENTITY.account+'</dd></div>'+
    '<div><dt>核查排放量</dt><dd>'+fmt(cycle.report.verifiedQty,0)+' tCO₂</dd></div><div><dt>清缴日期</dt><dd>'+s.at+'</dd></div>'+
    '<div><dt>注销 CEA</dt><dd>'+fmt(s.cea,0)+' t</dd></div><div><dt>注销 CCER</dt><dd>'+fmt(s.ccer,0)+' tCO₂e</dd></div></dl>'+
    '<div class="certStamp">已完成清缴</div></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">关闭</button><button class="btn primary" onclick="window.print()">打印</button></div>');
}

function etsPage() {
  return ({"排放监测":etsMonitorPage,"配额管理":etsAllocPage,"交易委托":etsTradePage,"CCER 抵销":etsCcerPage,"配额清缴":etsSurrenderPage}[state.group]||etsWorkbench)();
}
function etsMiniCard() {
  const year=etsFocusYear(),calc=etsCalc(year),cycle=calc.cycle,status=etsStatus(year);
  const days=daysUntil(cycle.deadline);
  return '<section class="panel etsMini"><div class="panelHead"><h3>碳履约 · '+year+' 年度</h3><button class="linkBtn" onclick="go(\'碳履约\',\'履约工作台\')">履约工作台 ›</button></div>'+
    '<div class="etsMiniBody"><div class="countdown"><b>'+(calc.settled?'✓':days)+'</b><span>'+(calc.settled?'已履约<br>'+cycle.surrender.at:'天<br>截止 '+cycle.deadline)+'</span></div>'+
    '<dl class="miniFacts cols2"><div><dt>应清缴</dt><dd>'+fmt(calc.verified,0)+' t</dd></div><div><dt>'+(calc.gap>=0?'盈余':'缺口')+'</dt><dd class="'+(calc.gap>=0?'okText':'badText')+'">'+fmt(Math.abs(calc.gap),0)+' t</dd></div>'+
    '<div><dt>CCER 抵销</dt><dd>'+fmt(calc.ccer,0)+' / '+fmt(calc.cap,0)+'</dd></div><div><dt>状态</dt><dd><span class="status '+status.tone+'">'+status.label+'</span></dd></div></dl></div></section>';
}
function etsSlide() {
  const year=etsFocusYear(),calc=etsCalc(year),cycle=calc.cycle;
  const todos=etsTodos();
  return {kicker:"碳履约",title:calc.settled?year+" 年度已完成清缴":year+" 年度履约 · 距截止 "+daysUntil(cycle.deadline)+" 天",
    text:"应清缴 "+fmt(calc.verified,0)+" t · "+(calc.gap>=0?"盈余 ":"缺口 ")+fmt(Math.abs(calc.gap),0)+" t<br>待办 "+todos.length+" 项",button:"履约工作台",action:"go('碳履约','履约工作台')",art:"wind"};
}

// ---------- 菜单与外壳 ----------
TOPS.splice(TOPS.indexOf("基础配置"),0,"碳履约");
MENUS["碳履约"] = {"履约工作台":[],"排放监测":[],"配额管理":[],"交易委托":[],"CCER 抵销":[],"配额清缴":[]};
MENUS["组织碳排放"] = Object.fromEntries(Object.entries(MENUS["组织碳排放"]).flatMap(entry=>
  entry[0]==="组织碳看板"?[entry,["碳目标管理",["目标设定","目标跟踪"]]]:[entry]));

const orgWorkbenchBeforeYear = orgWorkbench;
orgWorkbench = function () {
  const html=orgWorkbenchBeforeYear();
  if(!backendState.ready)return html;
  const totals=yearTotals(reportYear);
  const prev=REPORT_YEARS.includes(reportYear-1)?yearTotals(reportYear-1):null;
  const yoy=scope=>{const now=scope==="all"?totals["1"]+totals["2"]+totals["3"]:totals[scope];const before=prev?(scope==="all"?prev["1"]+prev["2"]+prev["3"]:prev[scope]):0;
    return before?(now-before)/before*100:null;};
  const trend='<section class="panel"><div class="panelHead"><h3>年度对比与目标</h3><button class="linkBtn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')">目标跟踪 ›</button></div>'+
    '<div class="yearCompare">'+[["all","总量"],["1","范围一"],["2","范围二"],["3","范围三"]].map(([scope,label])=>{const value=yoy(scope);
      return '<div><span>'+label+' 较上年'+(reportYear===CURRENT_YEAR?'（已审核口径）':'')+'</span><b class="'+(value===null?'':value<=0?'okText':'badText')+'">'+(value===null?'基准年':(value>0?'+':'')+value.toFixed(1)+'%')+'</b></div>';}).join("")+
    '</div><div class="yearBars">'+REPORT_YEARS.map(year=>{const t=yearTotals(year);const sum=t["1"]+t["2"]+t["3"];
      const max=Math.max(...REPORT_YEARS.map(y=>{const v=yearTotals(y);return v["1"]+v["2"]+v["3"];}));
      return '<button class="'+(year===reportYear?'active':'')+'" onclick="setReportYear('+year+')"><span class="yearBar"><i style="height:'+(sum/max*100)+'%"></i></span><b>'+fmt(sum,0)+'</b><small>'+year+'</small></button>';}).join("")+'</div>'+
    '<div class="goalList">'+targets().items.map(target=>{const status=targetStatus(target,Math.max(reportYear,targets().baseYear));
      return '<div class="goalItem static"><span><b>'+textHtml(target.name)+'</b><small>已减 '+status.reduced.toFixed(1)+'% / 目标 '+target.reduction+'%（'+target.targetYear+'）</small></span><span class="goalTrack"><i style="width:'+status.progress+'%"></i></span>'+
        '<span class="status '+(status.ahead?'ok':'bad')+'">'+(status.ahead?'符合路径':'落后路径')+'</span></div>';}).join("")+'</div></section>';
  return html.replace('<div class="homeGrid even">',trend+'<div class="homeGrid even">');
};

const renderBeforeYear = render;
render = function () {
  if(backendState.ready)yearArchive();
  withYearCalculation(renderBeforeYear);
  const content=document.getElementById("content");
  let page=null;
  if(state.top==="碳履约")page=etsPage;
  else if(state.top==="组织碳排放"&&state.group==="碳目标管理")page=state.page==="目标跟踪"?targetTrackPage:targetSetupPage;
  else if(isHistoryYear()&&state.top==="组织碳排放"&&state.group==="数据填报")page=()=>archiveTaskPage(false);
  else if(isHistoryYear()&&state.top==="供应链碳排放"&&state.group==="供应商协同任务")page=()=>archiveTaskPage(true);
  if(page&&backendState.ready)content.innerHTML=withYearCalculation(page);
  const yearScoped=["首页","组织碳排放","供应链碳排放"].includes(state.top);
  if(isHistoryYear()&&yearScoped&&backendState.ready) {
    content.innerHTML=historyBanner()+content.innerHTML
      .replace(/2026 年 7 月/g,reportYear+" 年度").replace(/2026-07/g,reportYear+" 年度");
  } else if(yearScoped) {
    content.innerHTML=content.innerHTML.replace(/2026-07/g,"2026 年度");
  }
  if(!document.getElementById("yearSelect")) {
    document.getElementById("roleSelect").insertAdjacentHTML("afterend",
      '<select id="yearSelect" aria-label="报告年度" onchange="setReportYear(this.value)">'+
      REPORT_YEARS.map(year=>'<option value="'+year+'">'+year+' 年度</option>').join("")+'</select>');
  }
  document.getElementById("yearSelect").value=String(reportYear);
  document.body.classList.toggle("historyMode",isHistoryYear());
};
