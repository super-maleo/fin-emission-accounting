// 报告年度切换、减排目标管理和碳履约模块。依赖 role-home.js 中的全局函数，必须最后加载。
// 历史年度、目标和履约数据均为演示数据。

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
const CHP_HISTORY = {[CHP_COAL]:{2023:99800,2024:97900,2025:101600},[CHP_ELEC]:{2023:3350000,2024:3280000,2025:3210000}};
const YEAR_CLOSED = {2023:"2024-03-29",2024:"2025-03-28",2025:"2026-03-31"};
// ---------- 演示企业规模：按大型泵阀装备制造集团（含自备热电）设定 ----------
directTasks.push(
  {id:"T-S1-04",org:"嘉兴热电分公司",name:CHP_COAL,unit:"t"},
  {id:"T-S2-04",org:"嘉兴热电分公司",name:CHP_ELEC,unit:"kWh"}
);
const workflowTasksBeforeScale = workflowTasks;
workflowTasks = function () {
  return workflowTasksBeforeScale().map(task=>task.id==="T-S1-04"?{...task,owner:"周建华",factor:CHP_COAL_FACTOR,factorLabel:"烟煤 · 发电设施核算指南参数（实测低位发热量）"}:
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
let etsYear = reportYear===CURRENT_YEAR?2025:reportYear;

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
    const fixed=CHP_HISTORY[row.source_name]?.[year];
    const activity=fixed??row.activity_value*(scale[String(row.scope)]||1)*(1+Math.sin(index*1.7+year)*0.02);
    return {...row,period:String(year),activity_value:+activity.toFixed(2),emission_tco2e:activity*row.factor_value,evidence:year+" 年度归档凭证"};
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
  etsYear=reportYear===CURRENT_YEAR?2025:reportYear;
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
    '<small>该年度已于 '+YEAR_CLOSED[reportYear]+' 关账，任务和数据只读，报告按归档数据生成。</small></div>'+
    '<button class="btn" onclick="setReportYear('+CURRENT_YEAR+')">回到 '+CURRENT_YEAR+' 年度</button></div>';
}
function archiveTaskPage(supplier) {
  const tasks=supplier?workflowTasks().filter(task=>task.locked):workflowTasks().filter(task=>!task.locked);
  const visible=currentRole==="填报人"?tasks.filter(task=>task.owner===fillerIdentity):
    currentRole==="供应商"?tasks.filter(task=>task.supplierIndex===supplierIdentity):tasks;
  const scale=YEAR_SCALE[reportYear];
  return pageHead(supplier?"供应商数据（"+reportYear+" 年度归档）":"填报任务（"+reportYear+" 年度归档）",'<button class="btn" onclick="exportFirstTable()">导出</button>',
      (supplier?"供应链碳排放 / 供应商协同任务":"组织碳排放 / 数据填报")+" / "+reportYear+" 年度")+
    '<div class="taskContext"><span>共 '+visible.length+' 项</span><span>全部审核通过</span><span>关账日期 '+YEAR_CLOSED[reportYear]+'</span></div>'+
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
  const cycle=etsCycle(2025);
  const result=etsResult(cycle);
  const days=daysUntil(cycle.deadline);
  return '<div class="goalStrip">'+
    '<section class="panel"><div class="panelHead"><h3>减排目标</h3><button class="linkBtn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')">目标跟踪 ›</button></div>'+
      '<div class="goalList">'+list.map(target=>{
        const status=targetStatus(target);
        return '<button class="goalItem" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')"><span><b>'+textHtml(target.name)+'</b><small>'+targets().baseYear+' → '+target.targetYear+' 减 '+target.reduction+'% · 已减 '+status.reduced.toFixed(1)+'%</small></span>'+
          '<span class="goalTrack"><i style="width:'+status.progress+'%"></i></span><span class="status '+(status.ahead?'ok':'bad')+'">'+(status.ahead?'符合路径':'落后路径')+'</span></button>';
      }).join("")+'</div></section>'+
    '<section class="panel etsMini"><div class="panelHead"><h3>碳履约 · 2025 年度</h3><span class="demoBadge">演示数据</span></div>'+
      '<div class="etsMiniBody"><div class="countdown"><b>'+Math.max(days,0)+'</b><span>天后截止<br>'+cycle.deadline+'</span></div>'+
      '<dl class="miniFacts"><div><dt>核查排放</dt><dd>'+fmt(result.verified,0)+' t</dd></div><div><dt>'+(result.gap>=0?'配额盈余':'配额缺口')+'</dt><dd class="'+(result.gap>=0?'okText':'badText')+'">'+fmt(Math.abs(result.gap),0)+' t</dd></div></dl></div>'+
      '<button class="btn primary wide" onclick="go(\'碳履约\',\'履约总览\')">'+(cycle.status==="已履约"?'查看履约结果':result.gap>=0?'去提交清缴':'补足缺口')+'</button></section>'+
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
      '<span>营收口径 百万元（演示）</span>'+(manager?'<label>调整基准年 <select onchange="setBaseYear(this.value)">'+[2023,2024,2025].map(year=>'<option '+(year===config.baseYear?'selected':'')+'>'+year+'</option>').join("")+'</select></label>':'')+'</div>'+
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
        (status.ahead?'':'<p class="reviewNote small">落后原因提示：'+(target.scope==="3"?'售出产品使用阶段用电约占范围三的 99%，建议加快 IE4/IE5 高效电机和变频水泵替代，并为客户提供能效改造服务。':'热电机组燃煤约占范围一+二的九成，建议推进生物质掺烧、煤改气和余热回收，同时扩大绿电采购。')+'</p>')+'</section>';
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

// ---------- 碳履约（全国碳市场，演示数据） ----------
const ETS_DEFAULT = {
  entity:"江南流体装备 嘉兴热电分公司",
  unit:"1# 2×25MW 燃煤热电联产机组",
  verifier:"（演示）浙江某第三方核查机构",
  cycles:{
    2023:{year:2023,deadline:"2024-12-31",status:"已履约",settledAt:"2024-11-26",verifiedAt:"2024-05-20",
      power:181500,powerBench:0.8218,heat:398000,heatBench:0.1111,correction:1,ncv:21.18,cc:0.02634,of:0.98,elecFactor:0.5703,carryIn:0,ccerUsed:1850},
    2024:{year:2024,deadline:"2025-12-31",status:"已履约",settledAt:"2025-12-09",verifiedAt:"2025-05-16",
      power:189500,powerBench:0.8218,heat:405000,heatBench:0.1111,correction:1,ncv:21.18,cc:0.02634,of:0.98,elecFactor:0.5703,carryIn:0,ccerUsed:0},
    2025:{year:2025,deadline:"2026-12-31",status:"待清缴",verifiedAt:"2026-05-22",
      power:186400,powerBench:0.8180,heat:412000,heatBench:0.1105,correction:1,ncv:21.18,cc:0.02634,of:0.98,elecFactor:0.5703,carryIn:600,ccerUsed:3200},
    2026:{year:2026,deadline:"2027-12-31",status:"监测中",estimate:true,
      power:187000,powerBench:0.8180,heat:415000,heatBench:0.1105,correction:1,ncv:21.18,cc:0.02634,of:0.98,elecFactor:0.5703,carryIn:0,ccerUsed:0}
  },
  trades:[
    {id:"TR-2401",date:"2024-10-15",cycle:2023,side:"买入",product:"CEA",qty:6800,price:88.4,channel:"挂牌协议"},
    {id:"TR-2501",date:"2025-11-06",cycle:2024,side:"卖出",product:"CEA",qty:1950,price:91.2,channel:"大宗协议"},
    {id:"TR-2601",date:"2026-09-18",cycle:2025,side:"买入",product:"CEA",qty:1500,price:94.6,channel:"挂牌协议"}
  ],
  ccer:[
    {id:"CCER-01",project:"（演示）浙江某海上风电项目",type:"风电",vintage:2024,qty:2000},
    {id:"CCER-02",project:"（演示）江苏某林业碳汇项目",type:"林业碳汇",vintage:2023,qty:1200},
    {id:"CCER-03",project:"（演示）福建某红树林修复项目",type:"红树林营造",vintage:2025,qty:600}
  ],
  log:[]
};
function ets() {
  demo.ets ||= structuredClone(ETS_DEFAULT);
  Object.values(demo.ets.cycles).forEach(cycle=>{
    const rows=detailForYear(Math.min(cycle.year,CURRENT_YEAR));
    const coal=rows.find(row=>row.source_name===CHP_COAL);
    const elec=rows.find(row=>row.source_name===CHP_ELEC);
    cycle.coal=coal?Number(coal.activity_value):0;
    cycle.elec=elec?Number(elec.activity_value)/1000:0;
    cycle.coalApproved=!!coal;
  });
  return demo.ets;
}
function etsCycle(year){return ets().cycles[year];}
function etsVerified(cycle){return cycle.coal*cycle.ncv*cycle.cc*cycle.of*44/12+cycle.elec*cycle.elecFactor;}
function etsAllocation(cycle){return (cycle.power*cycle.powerBench+cycle.heat*cycle.heatBench)*cycle.correction;}
function etsNetTrades(year){
  return ets().trades.filter(row=>row.cycle===year&&row.product==="CEA").reduce((sum,row)=>sum+(row.side==="买入"?row.qty:-row.qty),0);
}
function etsResult(cycle) {
  const verified=etsVerified(cycle);
  const allocation=etsAllocation(cycle);
  const net=etsNetTrades(cycle.year);
  const cap=verified*0.05;
  const position=allocation+cycle.carryIn+net+cycle.ccerUsed;
  return {verified,allocation,net,cap,position,gap:position-verified,
    cost:ets().trades.filter(row=>row.cycle===cycle.year).reduce((sum,row)=>sum+(row.side==="买入"?1:-1)*row.qty*row.price,0)};
}
function ccerAvailable(exceptYear) {
  const used=Object.values(ets().cycles).filter(cycle=>cycle.year!==exceptYear).reduce((sum,cycle)=>sum+cycle.ccerUsed,0);
  return ets().ccer.reduce((sum,row)=>sum+row.qty,0)+1850-used;
}
function daysUntil(date) {
  const today=new Date();today.setHours(0,0,0,0);
  return Math.round((new Date(date+"T00:00:00")-today)/86400000);
}
function etsStatus(cycle,result) {
  if(cycle.status==="已履约")return {label:"已履约",tone:"ok"};
  if(cycle.estimate)return {label:"监测中",tone:""};
  return result.gap>=0?{label:"可清缴",tone:"ok"}:{label:"存在缺口",tone:"bad"};
}
function setEtsYear(year){etsYear=Number(year);render();}
function etsTabs() {
  return '<div class="segTabs">'+Object.values(ets().cycles).map(cycle=>{
    const status=etsStatus(cycle,etsResult(cycle));
    return '<button class="'+(cycle.year===etsYear?'active':'')+'" onclick="setEtsYear('+cycle.year+')">'+cycle.year+' 年度 <em>'+status.label+'</em></button>';
  }).join("")+'</div>';
}
function etsHead(title,actions,crumb) {
  return pageHead(title,'<span class="demoBadge">演示数据</span>'+actions,"碳履约 / "+crumb)+
    '<div class="taskContext"><span>'+textHtml(ets().entity)+'</span><span>'+textHtml(ets().unit)+'</span><span>全国碳排放权交易市场 · 发电行业</span></div>'+etsTabs();
}
function etsSteps(cycle,result) {
  const steps=["月度监测与报告","第三方核查","配额核定","交易与抵销","配额清缴"];
  const reached=cycle.status==="已履约"?5:cycle.estimate?1:result.gap>=0?4:3;
  return '<ol class="flowSteps etsSteps">'+steps.map((step,index)=>'<li class="'+(index<reached?'done':index===reached?'now':'')+'">'+step+'</li>').join("")+'</ol>';
}
function etsOverview() {
  const cycle=etsCycle(etsYear);
  const result=etsResult(cycle);
  const status=etsStatus(cycle,result);
  const days=daysUntil(cycle.deadline);
  const ccerRoom=Math.max(0,Math.min(result.cap-cycle.ccerUsed,ccerAvailable(cycle.year)-cycle.ccerUsed));
  const shortfall=Math.max(0,-result.gap);
  const fromCcer=Math.min(shortfall,ccerRoom);
  const org=yearTotals(Math.min(cycle.year,CURRENT_YEAR));
  const price=marketSeries().at(-1);
  return etsHead("履约总览",(cycle.status!=="已履约"&&!cycle.estimate?'<button class="btn primary" onclick="surrenderEts('+cycle.year+')" '+(result.gap<0?'disabled title="配额不足，需先补足缺口"':'')+'>提交清缴</button>':''),"履约总览")+
    '<div class="statRow">'+statTile("核查排放量",fmt(result.verified,0),"tCO₂ · "+(cycle.estimate?"1–10 月监测年化预估":"核查于 "+cycle.verifiedAt))+
      statTile("可用于清缴",fmt(result.position,0),"配额 "+fmt(result.allocation,0)+" + 结转 "+fmt(cycle.carryIn,0)+" + 交易 "+fmt(result.net,0)+" + CCER "+fmt(cycle.ccerUsed,0))+
      statTile(result.gap>=0?"配额盈余":"配额缺口",'<i class="'+(result.gap>=0?'okText':'badText')+'" style="font-style:normal">'+fmt(Math.abs(result.gap),0)+'</i>',"tCO₂ · 状态 "+status.label)+
      statTile(cycle.status==="已履约"?"清缴完成":"距履约截止",cycle.status==="已履约"?cycle.settledAt:(days>=0?days+" 天":"已逾期"),"截止日期 "+cycle.deadline)+'</div>'+
    '<section class="panel"><div class="panelHead"><h3>履约进度</h3><span class="status '+status.tone+'">'+status.label+'</span></div>'+etsSteps(cycle,result)+
      '<div class="coverBar"><span style="width:'+Math.min(100,result.position/result.verified*100)+'%"></span></div>'+
      '<p class="muted small">清缴覆盖率 '+(result.position/result.verified*100).toFixed(1)+'%，CCER 抵销上限为核查排放量的 5%（'+fmt(result.cap,0)+' tCO₂），本年度已使用 '+fmt(cycle.ccerUsed,0)+'。</p></section>'+
    '<div class="homeGrid even"><div>'+
      card(cycle.status==="已履约"?"履约结果":result.gap>=0?"清缴准备":"缺口补足建议",
        cycle.status==="已履约"?'<p class="muted">已于 '+cycle.settledAt+' 完成清缴，'+(result.gap>=0?'盈余 '+fmt(result.gap,0)+' tCO₂ 可出售或结转至下一年度。':'')+'</p>':
        cycle.estimate?'<p class="muted">本年度仍在监测中。按当前预估，'+(result.gap>=0?'预计盈余 '+fmt(result.gap,0)+' tCO₂。':'预计缺口 '+fmt(-result.gap,0)+' tCO₂，建议提前锁定 CCER 或分批买入配额。')+'</p>':
        result.gap>=0?'<p class="muted">配额与抵销已足以覆盖核查排放，可提交清缴。清缴后剩余 '+fmt(result.gap,0)+' tCO₂ 可出售或结转。</p>':
        '<ul class="planList"><li><b>使用 CCER 抵销 '+fmt(fromCcer,0)+' tCO₂</b><small>上限内剩余额度 '+fmt(Math.max(0,result.cap-cycle.ccerUsed),0)+'，持仓可用 '+fmt(ccerAvailable(cycle.year)-cycle.ccerUsed,0)+'</small><button class="btn" onclick="go(\'碳履约\',\'CCER 抵销\')">调整抵销</button></li>'+
          '<li><b>买入 CEA '+fmt(shortfall-fromCcer,0)+' tCO₂</b><small>按参考价 '+price.toFixed(2)+' 元/吨，约 '+fmt((shortfall-fromCcer)*price/10000,1)+' 万元</small><button class="btn primary" onclick="openTradeModal()">登记交易</button></li></ul>')+
    '</div><div>'+
      card("数据来自组织盘查",'<dl class="miniFacts cols2"><div><dt>组织盘查 '+Math.min(cycle.year,CURRENT_YEAR)+' 范围一+二</dt><dd>'+fmt(org["1"]+org["2"],0)+' tCO₂e</dd></div>'+
        '<div><dt>其中热电分公司（履约边界）</dt><dd>'+fmt(result.verified,0)+' tCO₂ · 占 '+pct(result.verified,org["1"]+org["2"])+'%</dd></div>'+
        '<div><dt>燃煤热电联产（范围一）</dt><dd>'+fmt(cycle.coal,0)+' t 原煤</dd></div><div><dt>厂用电下网（范围二）</dt><dd>'+fmt(cycle.elec,0)+' MWh</dd></div></dl>'+
        '<p class="muted small">核查排放量直接取自组织盘查中嘉兴热电分公司的两项已审核数据，燃煤排放因子按发电设施核算指南参数计算（'+CHP_COAL_FACTOR.toFixed(4)+' tCO₂/t），与组织盘查使用同一因子，两套口径一致。'+
          (cycle.coalApproved?'':'<b class="badText">当前年度燃煤数据尚未审核通过，核查排放暂不完整。</b>')+'本年度交易净额 '+(result.cost>=0?'支出 ':'收入 ')+fmt(Math.abs(result.cost)/10000,1)+' 万元。</p>'+
        '<div class="actions"><button class="btn" onclick="go(\'组织碳排放\',\'核算分析\',\'排放清单\')">组织排放清单</button><button class="btn" onclick="go(\'碳履约\',\'排放核查\')">核查明细</button></div>')+
    '</div></div>'+
    card("履约记录",(ets().log.length?'<ul class="feed">'+ets().log.slice(-6).reverse().map(row=>'<li><time>'+textHtml(row.at)+'</time><span>'+textHtml(row.actor)+'</span>'+textHtml(row.text)+'</li>').join("")+'</ul>':'')+
      '<ul class="feed">'+[cycle.settledAt&&[cycle.settledAt,"完成配额清缴"],cycle.verifiedAt&&[cycle.verifiedAt,"核查报告出具 · "+ets().verifier],
        [cycle.year+1+"-03-31","提交上年度排放报告"]].filter(Boolean).map(([at,text])=>'<li><time>'+at+'</time><span>系统</span>'+text+'</li>').join("")+'</ul>');
}
function surrenderEts(year) {
  const cycle=etsCycle(year);
  const result=etsResult(cycle);
  if(result.gap<0){showToast("配额不足，还差 "+fmt(-result.gap,0)+" tCO₂");return;}
  cycle.status="已履约";
  cycle.settledAt=new Date().toISOString().slice(0,10);
  ets().log.push({at:new Date().toLocaleString("zh-CN",{hour12:false}),actor:MANAGER_NAME,text:"提交 "+year+" 年度配额清缴 "+fmt(result.verified,0)+" tCO₂"});
  persistDemo();render();showToast(year+" 年度已完成清缴");
}
function etsAllocationPage() {
  const cycles=Object.values(ets().cycles);
  const cycle=etsCycle(etsYear);
  const result=etsResult(cycle);
  return etsHead("配额管理",'<button class="btn" onclick="exportFirstTable()">导出</button>',"配额管理")+
    '<div class="statRow">'+statTile(etsYear+" 核定配额",fmt(result.allocation,0),"tCO₂ · "+(cycle.estimate?"预分配口径":"最终核定"))+
      statTile("预分配（70%）",fmt(result.allocation*0.7,0),"年初发放")+statTile("上年结转",fmt(cycle.carryIn,0),"tCO₂")+
      statTile("交易净额",(result.net>=0?"+":"")+fmt(result.net,0),"tCO₂ · 买入为正")+'</div>'+
    card(etsYear+" 年度配额计算（基准线法）",'<div class="tableWrap"><table><thead><tr><th>项目</th><th>活动水平</th><th>基准值</th><th>修正系数</th><th>配额(tCO₂)</th></tr></thead><tbody>'+
      '<tr><td>供电量</td><td>'+fmt(cycle.power,0)+' MWh</td><td>'+cycle.powerBench+' tCO₂/MWh</td><td>'+cycle.correction+'</td><td>'+fmt(cycle.power*cycle.powerBench*cycle.correction,0)+'</td></tr>'+
      '<tr><td>供热量</td><td>'+fmt(cycle.heat,0)+' GJ</td><td>'+cycle.heatBench+' tCO₂/GJ</td><td>'+cycle.correction+'</td><td>'+fmt(cycle.heat*cycle.heatBench*cycle.correction,0)+'</td></tr>'+
      '<tr><td colspan="4"><strong>合计</strong></td><td><strong>'+fmt(result.allocation,0)+'</strong></td></tr></tbody></table></div><p class="muted small">基准值为演示值，实际以主管部门发布的年度配额分配方案为准。</p>')+
    card("历年配额与排放",'<div class="tableWrap"><table><thead><tr><th>年度</th><th>核定配额</th><th>核查排放</th><th>盈缺</th><th>CCER 抵销</th><th>状态</th><th>截止</th></tr></thead><tbody>'+
      cycles.map(row=>{const r=etsResult(row),s=etsStatus(row,r);
        return '<tr><td>'+row.year+'</td><td>'+fmt(r.allocation,0)+'</td><td>'+fmt(r.verified,0)+'</td><td class="'+(r.allocation-r.verified>=0?'okText':'badText')+'">'+fmt(r.allocation-r.verified,0)+
          '</td><td>'+fmt(row.ccerUsed,0)+'</td><td><span class="status '+s.tone+'">'+s.label+'</span></td><td>'+row.deadline+'</td></tr>';}).join("")+'</tbody></table></div>');
}
function etsVerificationPage() {
  const cycle=etsCycle(etsYear);
  const result=etsResult(cycle);
  const coalEmission=cycle.coal*cycle.ncv*cycle.cc*cycle.of*44/12;
  const editable=cycle.estimate&&currentRole==="管理者";
  return etsHead("排放核查",editable?'<button class="btn primary" onclick="openMrvModal()">更新监测数据</button>':'',"排放核查")+
    '<div class="statRow">'+statTile("核查排放量",fmt(result.verified,0),"tCO₂")+statTile("化石燃料燃烧",fmt(coalEmission,0),"占 "+(coalEmission/result.verified*100).toFixed(1)+"%")+
      statTile("购入电力",fmt(cycle.elec*cycle.elecFactor,0),"tCO₂")+statTile("核查状态",cycle.estimate?"监测中":"已核查",cycle.estimate?"每月 MRV 月报":"核查于 "+cycle.verifiedAt)+'</div>'+
    card("排放量计算",'<div class="tableWrap"><table><thead><tr><th>排放源</th><th>活动数据</th><th>低位发热量</th><th>单位热值含碳量</th><th>碳氧化率</th><th>排放因子</th><th>排放(tCO₂)</th></tr></thead><tbody>'+
      '<tr><td>燃煤（烟煤）<small>组织盘查 · 范围一 · '+CHP_COAL+'</small></td><td>'+fmt(cycle.coal,0)+' t</td><td>'+cycle.ncv+' GJ/t</td><td>'+cycle.cc+' tC/GJ</td><td>'+(cycle.of*100).toFixed(0)+'%</td><td>—</td><td>'+fmt(coalEmission,0)+'</td></tr>'+
      '<tr><td>购入电力<small>组织盘查 · 范围二 · '+CHP_ELEC+'</small></td><td>'+fmt(cycle.elec,0)+' MWh</td><td>—</td><td>—</td><td>—</td><td>'+cycle.elecFactor+' tCO₂/MWh</td><td>'+fmt(cycle.elec*cycle.elecFactor,0)+'</td></tr>'+
      '<tr><td colspan="6"><strong>合计</strong></td><td><strong>'+fmt(result.verified,0)+'</strong></td></tr></tbody></table></div>'+
      '<p class="muted small">燃料燃烧排放 = 消耗量 × 低位发热量 × 单位热值含碳量 × 碳氧化率 × 44/12；购入电力排放 = 电量 × 电网排放因子。参数为演示值。</p>')+
    card("核查信息",'<dl class="miniFacts cols2"><div><dt>核查机构</dt><dd>'+textHtml(ets().verifier)+'</dd></div><div><dt>核查报告</dt><dd>'+(cycle.verifiedAt||"待核查")+'</dd></div>'+
      '<div><dt>数据来源</dt><dd>组织盘查已审核数据（入厂煤计量、煤质化验、关口电表）</dd></div><div><dt>核查结论</dt><dd>'+(cycle.estimate?"—":"排放报告数据经核查确认，无重大偏差")+'</dd></div></dl>');
}
function openMrvModal() {
  const cycle=etsCycle(etsYear);
  openModal('<h2>更新 '+etsYear+' 年度监测数据</h2><p class="desc">1–10 月实际加 11–12 月计划量。燃煤和厂用电会同步更新组织盘查中热电分公司的对应任务。</p><div class="modalForm">'+
    '<label>燃煤消耗量（t）<input id="mrvCoal" type="number" value="'+cycle.coal+'"></label>'+
    '<label>厂用电下网（MWh）<input id="mrvElec" type="number" value="'+cycle.elec+'"></label><label>供电量（MWh）<input id="mrvPower" type="number" value="'+cycle.power+'"></label>'+
    '<label>供热量（GJ）<input id="mrvHeat" type="number" value="'+cycle.heat+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveMrv()">保存</button></div>');
}
async function saveMrv() {
  const cycle=etsCycle(etsYear);
  const read=id=>Number(document.getElementById(id).value);
  const values={coal:read("mrvCoal"),elec:read("mrvElec"),power:read("mrvPower"),heat:read("mrvHeat")};
  if(Object.values(values).some(value=>!(value>0))){showToast("请填写大于 0 的数值");return;}
  cycle.power=values.power;cycle.heat=values.heat;
  demo.taskEntries["T-S1-04"]={...demo.taskEntries["T-S1-04"],activity:values.coal};
  demo.taskEntries["T-S2-04"]={...demo.taskEntries["T-S2-04"],activity:values.elec*1000};
  persistDemo();
  await loadBackendData();
  ets().log.push({at:new Date().toLocaleString("zh-CN",{hour12:false}),actor:MANAGER_NAME,text:"更新 "+etsYear+" 年度监测数据"});
  persistDemo();closeModal();render();showToast("监测数据已更新");
}
function etsCcerPage() {
  const cycle=etsCycle(etsYear);
  const result=etsResult(cycle);
  const available=ccerAvailable(cycle.year);
  const editable=cycle.status!=="已履约"&&currentRole==="管理者";
  return etsHead("CCER 抵销",'',"CCER 抵销")+
    '<div class="statRow">'+statTile("抵销上限（5%）",fmt(result.cap,0),"tCO₂e · 核查排放 × 5%")+statTile("本年度已使用",fmt(cycle.ccerUsed,0),"占上限 "+pct(cycle.ccerUsed,result.cap)+"%")+
      statTile("持仓可用",fmt(available-cycle.ccerUsed,0),"tCO₂e · 未被其他年度使用")+statTile("CCER 参考价","78.60","元/吨 · 演示")+'</div>'+
    card("本年度抵销计划",editable?'<div class="lcaMeta"><label>计划使用量 <input id="ccerUse" type="number" min="0" step="10" value="'+cycle.ccerUsed+'"></label>'+
        '<button class="btn primary" onclick="saveCcerUse()">保存</button><span class="muted">最多 '+fmt(Math.min(result.cap,available),0)+' tCO₂e（上限与持仓取小）</span></div>':
      '<p class="muted">'+(cycle.status==="已履约"?"该年度已完成清缴，抵销量已锁定。":"仅管理者可调整抵销计划。")+'</p>')+
    card("CCER 持仓",'<div class="tableWrap"><table><thead><tr><th>编号</th><th>项目</th><th>类型</th><th>减排量产生年份</th><th>数量(tCO₂e)</th></tr></thead><tbody>'+
      ets().ccer.map(row=>'<tr><td>'+row.id+'</td><td>'+textHtml(row.project)+'</td><td>'+row.type+'</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td></tr>').join("")+
      '</tbody></table></div><p class="muted small">项目名称与数量为演示数据。抵销比例上限按全国碳市场规则取应清缴配额的 5%。</p>');
}
function saveCcerUse() {
  const cycle=etsCycle(etsYear);
  const result=etsResult(cycle);
  const value=Number(document.getElementById("ccerUse").value);
  const max=Math.min(result.cap,ccerAvailable(cycle.year));
  if(!(value>=0)){showToast("请输入有效数量");return;}
  if(value>max){showToast("超过可用上限 "+fmt(max,0)+" tCO₂e");return;}
  cycle.ccerUsed=Math.round(value);
  ets().log.push({at:new Date().toLocaleString("zh-CN",{hour12:false}),actor:MANAGER_NAME,text:etsYear+" 年度 CCER 抵销计划调整为 "+fmt(value,0)});
  persistDemo();render();showToast("抵销计划已保存");
}
function etsTradePage() {
  const rows=ets().trades.filter(row=>row.cycle===etsYear);
  const result=etsResult(etsCycle(etsYear));
  const bought=rows.filter(row=>row.side==="买入").reduce((sum,row)=>sum+row.qty,0);
  const sold=rows.filter(row=>row.side==="卖出").reduce((sum,row)=>sum+row.qty,0);
  return etsHead("配额交易",currentRole==="管理者"?'<button class="btn primary" onclick="openTradeModal()">登记交易</button>':'',"配额交易")+
    '<div class="statRow">'+statTile("买入",fmt(bought,0),"tCO₂")+statTile("卖出",fmt(sold,0),"tCO₂")+statTile("交易净额",(result.cost>=0?"支出 ":"收入 ")+fmt(Math.abs(result.cost)/10000,2),"万元")+
      statTile(result.gap>=0?"清缴后盈余":"仍需补足",fmt(Math.abs(result.gap),0),"tCO₂")+'</div>'+
    '<div class="homeGrid even"><div>'+card("交易记录",'<div class="tableWrap"><table><thead><tr><th>编号</th><th>日期</th><th>方向</th><th>品种</th><th>数量(t)</th><th>价格(元/t)</th><th>金额(万元)</th><th>方式</th></tr></thead><tbody>'+
      (rows.length?rows.map(row=>'<tr><td>'+row.id+'</td><td>'+row.date+'</td><td><span class="status '+(row.side==="买入"?'warn':'ok')+'">'+row.side+'</span></td><td>'+row.product+'</td><td>'+fmt(row.qty,0)+'</td><td>'+row.price.toFixed(2)+
        '</td><td>'+fmt(row.qty*row.price/10000,2)+'</td><td>'+row.channel+'</td></tr>').join(""):'<tr><td colspan="8" class="emptyCell">本年度暂无交易</td></tr>')+'</tbody></table></div>')+'</div>'+
    '<div>'+card("CEA 价格走势",sparkline(marketSeries())+'<p class="muted small">近 30 个交易日收盘价，演示数据，非实时行情。</p>','<span class="demoBadge">演示数据</span>')+'</div></div>';
}
function openTradeModal() {
  if(currentRole!=="管理者")return;
  const result=etsResult(etsCycle(etsYear));
  openModal('<h2>登记配额交易 · '+etsYear+' 年度</h2><div class="modalForm">'+
    '<label>方向<select id="trSide"><option>买入</option><option>卖出</option></select></label><label>品种<select id="trProduct"><option>CEA</option></select></label>'+
    '<label>数量（t）<input id="trQty" type="number" min="1" value="'+Math.max(100,Math.ceil(Math.max(0,-result.gap)/10)*10)+'"></label>'+
    '<label>成交价（元/t）<input id="trPrice" type="number" step="0.01" value="'+marketSeries().at(-1).toFixed(2)+'"></label>'+
    '<label>成交日期<input id="trDate" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label>'+
    '<label>交易方式<select id="trChannel"><option>挂牌协议</option><option>大宗协议</option><option>单向竞价</option></select></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveTrade()">保存交易</button></div>');
}
function saveTrade() {
  const qty=Number(document.getElementById("trQty").value),price=Number(document.getElementById("trPrice").value);
  if(!(qty>0&&price>0)){showToast("请填写数量和成交价");return;}
  const row={id:"TR-"+String(etsYear).slice(2)+String(Date.now()).slice(-3),date:document.getElementById("trDate").value,cycle:etsYear,
    side:document.getElementById("trSide").value,product:document.getElementById("trProduct").value,qty,price,channel:document.getElementById("trChannel").value};
  ets().trades.push(row);
  ets().log.push({at:new Date().toLocaleString("zh-CN",{hour12:false}),actor:MANAGER_NAME,text:row.side+" "+row.product+" "+fmt(qty,0)+" t @ "+price.toFixed(2)});
  persistDemo();closeModal();render();showToast("交易已登记，配额盈缺已更新");
}

// ---------- 菜单与外壳 ----------
TOPS.splice(TOPS.indexOf("基础配置"),0,"碳履约");
MENUS["碳履约"] = {"履约总览":[],"配额管理":[],"排放核查":[],"CCER 抵销":[],"配额交易":[]};
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
  if(state.top==="碳履约")page=({"履约总览":etsOverview,"配额管理":etsAllocationPage,"排放核查":etsVerificationPage,"CCER 抵销":etsCcerPage,"配额交易":etsTradePage})[state.group]||etsOverview;
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
