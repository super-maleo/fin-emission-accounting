// 目标管理（基准年、目标分解）与报告中心（组织温室气体报告、范围三报告、ISO 14067 碳足迹报告）。最后加载。

// ---------- 组织单元与责任部门 ----------
const ORG_UNITS = [
  {unit:"嘉兴热电分公司",type:"分公司",site:"浙江省嘉兴市",business:"2×25 MW 燃煤热电联产，对外供热供电",scopes:"范围一、二",owner:"周建华"},
  {unit:"嘉兴装配工厂",type:"生产基地",site:"浙江省嘉兴市",business:"水泵、电机总装与试验",scopes:"范围一、二",owner:"陈晓宁"},
  {unit:"湖州机加工基地",type:"生产基地",site:"浙江省湖州市",business:"泵体、泵轴机加工",scopes:"范围一、二",owner:"许文涛"},
  {unit:"杭州总部",type:"总部",site:"浙江省杭州市",business:"研发、销售与管理",scopes:"范围一、二、三",owner:"沈嘉禾"}
];
const UNIT_REVENUE_SHARE = {"嘉兴热电分公司":0.09,"嘉兴装配工厂":0.52,"湖州机加工基地":0.18,"杭州总部":0.21};
const UNIT_ALIAS = {"总部办公区":"杭州总部","公司层面（价值链）":"杭州总部"};
const S3_DEPTS = {
  "产品研发中心":{codes:["C10","C11","C12"],owner:"刘振宇"},
  "采购中心":{codes:["C01","C02"],owner:"王立群"},
  "物流部":{codes:["C04","C09"],owner:"赵敏"},
  "行政人事部":{codes:["C06","C07","C08"],owner:"孙佳"},
  "财务与战略部":{codes:["C03","C05","C13","C14","C15"],owner:"何晴"}
};
function deptOf(code){return Object.keys(S3_DEPTS).find(name=>S3_DEPTS[name].codes.includes(code))||"财务与战略部";}
function unitOfRow(row,target) {
  if(target&&target.scope==="3")return deptOf(row.category_code);
  if(String(row.scope)==="3")return "杭州总部";
  const name=orgUnitName(row.org);
  return UNIT_ALIAS[name]||name;
}
function allocUnits(target){return target.scope==="3"?Object.keys(S3_DEPTS):ORG_UNITS.map(item=>item.unit);}
function unitOwner(target,unit){return target.scope==="3"?S3_DEPTS[unit].owner:(ORG_UNITS.find(item=>item.unit===unit)||{}).owner||"—";}
function inTarget(target,row){const scope=String(row.scope);return target.scope==="12"?scope!=="3":target.scope==="3"?scope==="3":true;}
function unitValue(target,unit,year) {
  const value=detailForYear(year).filter(row=>inTarget(target,row)&&unitOfRow(row,target)===unit).reduce((sum,row)=>sum+row.emission_tco2e,0);
  return target.type==="intensity"?value/(YEAR_REVENUE[year]*(target.scope==="3"?1:UNIT_REVENUE_SHARE[unit]||1)):value;
}
function unitBaseEmission(target,unit){return detailForYear(targets().baseYear).filter(row=>inTarget(target,row)&&unitOfRow(row,target)===unit).reduce((sum,row)=>sum+row.emission_tco2e,0);}
function unitPendingTasks(target,unit) {
  return workflowTasks().filter(task=>{
    if(target.scope==="12"&&task.scope==="3")return false;
    if(target.scope==="3"&&task.scope!=="3")return false;
    const owner=task.scope==="3"?(target.scope==="3"?deptOf(task.category||((task.id.match(/C\d\d/)||[])[0])||"C01"):"杭州总部"):(UNIT_ALIAS[task.org]||task.org);
    return owner===unit&&!["通过","不适用"].includes(taskEntry(task).status);
  });
}

// ---------- 目标数据 ----------
const TARGET_VERSION = 2;
function targetsV2() {
  const config=targets();
  if(config.v!==TARGET_VERSION) {
    config.v=TARGET_VERSION;
    config.threshold??=5;
    config.items.forEach(item=>{
      if(item.id==="TG-01"){item.interim??={year:2027,reduction:20};item.framework??="科学碳目标（SBTi）1.5°C 路径";item.issued??="2025-12-18";}
      if(item.id==="TG-02"){item.interim??={year:2027,reduction:12};item.framework??="科学碳目标（SBTi）范围三 2/3 覆盖要求";item.issued??="2025-12-18";}
    });
    config.recalcLog??=[
      {date:"2024-06-30",type:"结构变化",desc:"2024-01 收购湖州机加工基地，按全年追溯纳入 2023 基准年",impact:3.8,decision:"已重算",by:MANAGER_NAME},
      {date:"2025-04-18",type:"排放因子变更",desc:"全国电网平均排放因子更新为 0.5703 tCO₂/MWh，2023 年范围二重新计算",impact:-0.1,decision:"未达阈值，不重算",by:MANAGER_NAME},
      {date:"2026-03-12",type:"数据错误更正",desc:"2023 年嘉兴装配工厂天然气抄表重复 1 个月，更正 −96,400 Nm³",impact:-0.1,decision:"未达阈值，不重算",by:MANAGER_NAME}
    ];
    config.alloc??={
      "TG-01":{method:"custom",units:{"嘉兴热电分公司":38,"嘉兴装配工厂":30,"湖州机加工基地":25,"杭州总部":20},issued:"2026-01-15",version:1},
      "TG-02":{method:"custom",units:{"产品研发中心":26,"采购中心":24,"物流部":30,"行政人事部":15,"财务与战略部":10},issued:"2026-01-15",version:1}
    };
    persistDemo();
  }
  return config;
}
targetPath = function (target,year) {
  const base=targetBase(target);
  return base*(1-pathCut(target,year,target.reduction)/100);
};
function pathCut(target,year,reduction) {
  const baseYear=targets().baseYear,end=target.targetYear;
  const interim=target.interim&&target.interim.year>baseYear&&target.interim.year<end?target.interim:null;
  const scale=reduction/target.reduction;
  const points=[[baseYear,0],...(interim?[[interim.year,interim.reduction*scale]]:[]),[end,reduction]];
  if(year<=baseYear)return 0;
  if(year>=end)return reduction;
  for(let i=1;i<points.length;i++)if(year<=points[i][0]){
    const [x0,y0]=points[i-1],[x1,y1]=points[i];
    return y0+(y1-y0)*(year-x0)/(x1-x0);
  }
  return reduction;
}
function allocOf(target) {
  const config=targetsV2();
  config.alloc[target.id]||={method:"equal",units:{},issued:"",version:0};
  const alloc=config.alloc[target.id];
  const units=allocUnits(target);
  const bases=units.map(unit=>unitValue(target,unit,config.baseYear));
  const emissions=units.map(unit=>unitBaseEmission(target,unit));
  const total=emissions.reduce((a,b)=>a+b,0)||1;
  const shares=emissions.map(value=>value/total);
  let cuts;
  if(alloc.method==="equal")cuts=units.map(()=>target.reduction);
  else if(alloc.method==="weighted") {
    const denom=shares.reduce((sum,share)=>sum+share*Math.sqrt(share),0)||1;
    cuts=shares.map(share=>Math.min(95,target.reduction*Math.sqrt(share)/denom));
  } else cuts=units.map(unit=>Number(alloc.units[unit]??target.reduction));
  const rows=units.map((unit,index)=>({unit,owner:unitOwner(target,unit),base:bases[index],share:shares[index],cut:cuts[index]}));
  const weighted=rows.reduce((sum,row)=>sum+row.share*row.cut,0);
  return {alloc,rows,weighted,covered:weighted>=target.reduction-0.05};
}
function unitStatus(target,row,year=CURRENT_YEAR) {
  const actual=unitValue(target,row.unit,year);
  const path=row.base*(1-pathCut(target,year,row.cut)/100);
  const pending=year===CURRENT_YEAR?unitPendingTasks(target,row.unit).length:0;
  return {actual,path,pending,ahead:actual<=path,reduced:row.base?(1-actual/row.base)*100:0};
}
const TARGET_DIGITS = target=>target.type==="intensity"?2:0;

// ---------- 目标设定 ----------
targetSetupPage = function () {
  const config=targetsV2();
  const manager=currentRole==="管理者";
  const years=REPORT_YEARS;
  const yt=Object.fromEntries(years.map(year=>[year,yearTotals(year)]));
  const sum=t=>t["1"]+t["2"]+t["3"];
  const baseRows=ORG_UNITS.map(item=>{
    const rows=detailForYear(config.baseYear).filter(row=>unitOfRow(row)===item.unit);
    const s=scope=>rows.filter(row=>String(row.scope)===scope).reduce((a,row)=>a+row.emission_tco2e,0);
    return [item.unit,s("1"),s("2"),s("3")];
  });
  const cell=(value,year)=>'<td class="'+(year===config.baseYear?'baseCol':'')+'">'+value+'</td>';
  return pageHead("目标设定",manager?'<button class="btn" onclick="openRecalcModal()">登记重算事项</button><button class="btn primary" onclick="openTargetModal()">新增目标</button>':'',"组织碳排放 / 碳目标管理 / 目标设定")+
    '<section class="panel baseYearPanel"><div class="panelHead"><h3>基准年</h3>'+
      (manager?'<label class="inlineField">基准年 <select onchange="confirmBaseYear(this.value)">'+[2023,2024,2025].map(year=>'<option '+(year===config.baseYear?'selected':'')+'>'+year+'</option>').join("")+'</select></label>':'<b>'+config.baseYear+'</b>')+'</div>'+
      '<div class="statRow">'+statTile("基准年",String(config.baseYear),"固定基准年")+
        statTile("基准年排放",fmt(sum(yt[config.baseYear]),0),"tCO₂e · 范围一+二+三")+
        statTile("范围一+二",fmt(yt[config.baseYear]["1"]+yt[config.baseYear]["2"],0),"tCO₂e")+
        statTile("重算阈值",config.threshold+"%",manager?'<button class="linkBtn" onclick="editThreshold()">调整</button>':"基准年排放变化")+'</div>'+
      '<div class="tableWrap"><table class="compact baseTable"><thead><tr><th>指标</th>'+years.map(year=>'<th class="'+(year===config.baseYear?'baseCol':'')+'">'+year+(year===config.baseYear?' · 基准':'')+(year===CURRENT_YEAR?' · 本期':'')+'</th>').join("")+'</tr></thead><tbody>'+
        [["范围一","1"],["范围二","2"],["范围三","3"]].map(([label,scope])=>'<tr><td>'+label+'（tCO₂e）</td>'+years.map(year=>cell(fmt(yt[year][scope],0),year)).join("")+'</tr>').join("")+
        '<tr class="totalRow"><td>合计（tCO₂e）</td>'+years.map(year=>cell(fmt(sum(yt[year]),0),year)).join("")+'</tr>'+
        '<tr><td>营业收入（百万元）</td>'+years.map(year=>cell(fmt(YEAR_REVENUE[year],0),year)).join("")+'</tr>'+
        '<tr><td>范围一+二强度（tCO₂e/百万元）</td>'+years.map(year=>cell(fmt((yt[year]["1"]+yt[year]["2"])/YEAR_REVENUE[year],2),year)).join("")+'</tr>'+
      '</tbody></table></div>'+
      '<div class="homeGrid even"><div>'+card(config.baseYear+" 年基准排放 · 按单位",'<div class="tableWrap"><table class="compact"><thead><tr><th>单位</th><th>范围一</th><th>范围二</th><th>范围三</th></tr></thead><tbody>'+
        baseRows.map(row=>'<tr><td>'+row[0]+'</td><td>'+fmt(row[1],0)+'</td><td>'+fmt(row[2],0)+'</td><td>'+(row[3]?fmt(row[3],0):'—')+'</td></tr>').join("")+'</tbody></table></div>')+'</div>'+
      '<div>'+card("重算政策",'<dl class="policyList"><div><dt>结构变化</dt><dd>并购、剥离、外包或内包：一律追溯调整基准年</dd></div>'+
        '<div><dt>方法学与因子变更</dt><dd>对基准年排放影响 ≥ '+config.threshold+'% 时重算</dd></div><div><dt>数据错误</dt><dd>累计影响 ≥ '+config.threshold+'% 时重算</dd></div>'+
        '<div><dt>有机增长</dt><dd>产能变化、新建或关停设施：不重算</dd></div></dl>')+'</div></div>'+
      card("基准年重算记录",'<div class="tableWrap"><table class="compact"><thead><tr><th>日期</th><th>类型</th><th>事项</th><th>影响</th><th>处理</th><th>登记人</th></tr></thead><tbody>'+
        config.recalcLog.slice().reverse().map(row=>'<tr><td>'+row.date+'</td><td>'+textHtml(row.type)+'</td><td>'+textHtml(row.desc)+'</td><td>'+(row.impact>0?'+':'')+row.impact.toFixed(1)+'%</td><td><span class="status '+(row.decision==="已重算"?'ok':'muted')+'">'+textHtml(row.decision)+'</span></td><td>'+textHtml(row.by)+'</td></tr>').join("")+'</tbody></table></div>')+
    '</section>'+
    '<section class="panel"><div class="panelHead"><h3>减排目标</h3></div><div class="tableWrap"><table class="targetTable"><thead><tr><th>编号</th><th>目标</th><th>覆盖范围</th><th>类型</th><th>基准值 · '+config.baseYear+'</th><th>中期目标</th><th>远期目标</th><th>依据</th><th>分解</th><th>操作</th></tr></thead><tbody>'+
      config.items.map(target=>{
        const digits=TARGET_DIGITS(target);
        const plan=allocOf(target);
        return '<tr><td>'+target.id+'</td><td><b>'+textHtml(target.name)+'</b></td><td>'+SCOPE_LABEL[target.scope]+'</td><td>'+(target.type==="intensity"?"强度":"绝对量")+'</td>'+
          '<td>'+fmt(targetBase(target),digits)+' '+targetUnit(target)+'</td>'+
          '<td>'+(target.interim?target.interim.year+' 年 −'+target.interim.reduction+'%':'—')+'</td>'+
          '<td>'+target.targetYear+' 年 −'+target.reduction+'%<small class="cellSub">'+fmt(targetPath(target,target.targetYear),digits)+' '+targetUnit(target)+'</small></td>'+
          '<td>'+textHtml(target.framework||"内部目标")+'</td>'+
          '<td>'+(plan.alloc.issued?'<span class="status ok">已下发 '+plan.rows.length+' 个单位</span>':'<span class="status warn">未分解</span>')+'</td>'+
          '<td class="nowrap"><button class="btn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标分解\');selectAllocTarget(\''+target.id+'\')">分解</button>'+
            (manager?'<button class="btn" onclick="openTargetModal(\''+target.id+'\')">编辑</button><button class="btn" onclick="removeTarget(\''+target.id+'\')">删除</button>':'')+'</td></tr>';
      }).join("")+'</tbody></table></div>'+(config.items.length?'':'<div class="todoEmpty">暂无目标</div>')+'</section>'+
    config.items.map(target=>{
      const years=[];for(let year=config.baseYear;year<=target.targetYear;year++)years.push(year);
      const digits=TARGET_DIGITS(target);
      return '<section class="panel"><div class="panelHead"><h3>'+textHtml(target.name)+' · 年度路径</h3></div><div class="tableWrap"><table class="pathTable"><thead><tr><th>年度</th>'+years.map(year=>'<th>'+year+'</th>').join("")+'</tr></thead><tbody>'+
        '<tr><td>路径值</td>'+years.map(year=>'<td>'+fmt(targetPath(target,year),digits)+'</td>').join("")+'</tr>'+
        '<tr><td>较基准</td>'+years.map(year=>{const cut=pathCut(target,year,target.reduction);return '<td>'+(cut?'−'+cut.toFixed(1)+'%':'基准')+'</td>';}).join("")+'</tr>'+
        '<tr><td>实际</td>'+years.map(year=>REPORT_YEARS.includes(year)?'<td class="'+(targetActual(target,year)<=targetPath(target,year)?'okText':'badText')+'">'+fmt(targetActual(target,year),digits)+'</td>':'<td class="muted">—</td>').join("")+'</tr>'+
      '</tbody></table></div></section>';
    }).join("");
};
function confirmBaseYear(value) {
  const year=Number(value),config=targetsV2();
  if(year===config.baseYear)return;
  const before=Object.values(yearTotals(config.baseYear)).reduce((a,b)=>a+b,0),after=Object.values(yearTotals(year)).reduce((a,b)=>a+b,0);
  openModal('<h2>调整基准年</h2><dl class="detailList"><div><dt>基准年</dt><dd>'+config.baseYear+' → '+year+'</dd></div>'+
    '<div><dt>基准年排放</dt><dd>'+fmt(before,0)+' → '+fmt(after,0)+' tCO₂e</dd></div>'+
    '<div><dt>影响</dt><dd>'+config.items.length+' 项目标的基准值、年度路径和单位分解将重新计算</dd></div></dl>'+
    '<label class="modalForm one">调整原因<input id="baseReason" placeholder="必填"></label>'+
    '<div class="modalActions"><button class="btn" onclick="closeModal();render()">取消</button><button class="btn primary" onclick="applyBaseYear('+year+')">确认调整</button></div>');
}
function applyBaseYear(year) {
  const reason=document.getElementById("baseReason").value.trim();
  if(!reason){showToast("请填写调整原因");return;}
  const config=targetsV2();
  config.recalcLog.push({date:new Date().toISOString().slice(0,10),type:"基准年变更",desc:config.baseYear+" → "+year+"："+reason,impact:0,decision:"已重算",by:MANAGER_NAME});
  config.baseYear=year;persistDemo();closeModal();render();showToast("基准年已调整为 "+year);
}
function editThreshold() {
  openModal('<h2>重算阈值</h2><div class="modalForm one"><label>基准年排放变化阈值（%）<input id="thresholdInput" type="number" min="1" max="20" step="0.5" value="'+targetsV2().threshold+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveThreshold()">保存</button></div>');
}
function saveThreshold() {
  const value=Number(document.getElementById("thresholdInput").value);
  if(!(value>=1&&value<=20)){showToast("阈值需在 1–20% 之间");return;}
  targetsV2().threshold=value;persistDemo();closeModal();render();showToast("重算阈值已更新");
}
function openRecalcModal() {
  openModal('<h2>登记重算事项</h2><div class="modalForm">'+
    '<label>类型<select id="rcType">'+["结构变化","排放因子变更","核算方法变更","数据错误更正","有机增长"].map(type=>'<option>'+type+'</option>').join("")+'</select></label>'+
    '<label>对基准年排放影响（%）<input id="rcImpact" type="number" step="0.1" value="0"></label>'+
    '<label class="wide">事项<input id="rcDesc" placeholder="必填"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveRecalc()">登记</button></div>');
}
function saveRecalc() {
  const config=targetsV2();
  const type=document.getElementById("rcType").value,impact=Number(document.getElementById("rcImpact").value)||0,desc=document.getElementById("rcDesc").value.trim();
  if(!desc){showToast("请填写事项");return;}
  const decision=type==="有机增长"?"不适用，不重算":type==="结构变化"||Math.abs(impact)>=config.threshold?"需重算":"未达阈值，不重算";
  config.recalcLog.push({date:new Date().toISOString().slice(0,10),type,desc,impact,decision,by:MANAGER_NAME});
  persistDemo();closeModal();render();showToast("已登记 · "+decision);
}
openTargetModal = function (id) {
  const target=targetsV2().items.find(item=>item.id===id)||{name:"",scope:"12",type:"absolute",reduction:30,targetYear:2030,framework:"科学碳目标（SBTi）1.5°C 路径",interim:{year:2027,reduction:15}};
  const frameworks=["科学碳目标（SBTi）1.5°C 路径","科学碳目标（SBTi）范围三 2/3 覆盖要求","集团“双碳”规划","内部目标"];
  openModal('<h2>'+(id?'编辑':'新增')+'减排目标</h2><div class="modalForm">'+
    '<label class="wide">目标名称<input id="tgName" value="'+textHtml(target.name)+'"></label>'+
    '<label>覆盖范围<select id="tgScope">'+Object.entries(SCOPE_LABEL).map(([key,label])=>'<option value="'+key+'" '+(key===target.scope?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
    '<label>目标类型<select id="tgType"><option value="absolute" '+(target.type==="absolute"?'selected':'')+'>绝对量（tCO₂e）</option><option value="intensity" '+(target.type==="intensity"?'selected':'')+'>强度（tCO₂e/百万元营收）</option></select></label>'+
    '<label>基准年<input value="'+targets().baseYear+'" disabled></label>'+
    '<label>依据<select id="tgFramework">'+frameworks.map(item=>'<option '+(item===target.framework?'selected':'')+'>'+item+'</option>').join("")+'</select></label>'+
    '<label>中期目标年<select id="tgInterimYear"><option value="">不设</option>'+[2026,2027,2028].map(year=>'<option '+(target.interim&&year===target.interim.year?'selected':'')+'>'+year+'</option>').join("")+'</select></label>'+
    '<label>中期较基准下降（%）<input id="tgInterim" type="number" min="0" max="100" step="0.5" value="'+(target.interim?target.interim.reduction:"")+'"></label>'+
    '<label>远期目标年<select id="tgYear">'+[2028,2030,2032,2035,2040,2050].map(year=>'<option '+(year===target.targetYear?'selected':'')+'>'+year+'</option>').join("")+'</select></label>'+
    '<label>远期较基准下降（%）<input id="tgReduction" type="number" min="1" max="100" step="0.5" value="'+target.reduction+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveTarget(\''+(id||"")+'\')">保存</button></div>');
};
saveTarget = function (id) {
  const get=key=>document.getElementById(key).value;
  const name=get("tgName").trim(),reduction=Number(get("tgReduction")),interimYear=Number(get("tgInterimYear")),interim=Number(get("tgInterim"));
  if(!name){showToast("请填写目标名称");return;}
  if(!(reduction>0&&reduction<=100)){showToast("下降比例需在 0–100% 之间");return;}
  if(interimYear&&!(interim>0&&interim<reduction)){showToast("中期降幅需大于 0 且小于远期降幅");return;}
  const value={name,scope:get("tgScope"),type:get("tgType"),reduction,targetYear:Number(get("tgYear")),framework:get("tgFramework"),
    interim:interimYear?{year:interimYear,reduction:interim}:null};
  const list=targetsV2().items;
  const existing=list.find(item=>item.id===id);
  if(existing)Object.assign(existing,value);
  else list.push({id:"TG-"+String(list.length+1).padStart(2,"0"),issued:new Date().toISOString().slice(0,10),...value});
  persistDemo();closeModal();render();showToast("目标已保存");
};

// ---------- 目标分解 ----------
let allocTargetId = null;
function selectAllocTarget(id){allocTargetId=id;render();}
function targetAllocPage() {
  const config=targetsV2();
  const manager=currentRole==="管理者";
  if(!config.items.length)return pageHead("目标分解","","组织碳排放 / 碳目标管理 / 目标分解")+'<div class="todoEmpty">暂无目标</div>';
  const target=config.items.find(item=>item.id===allocTargetId)||config.items[0];
  allocTargetId=target.id;
  const plan=allocOf(target);
  const digits=TARGET_DIGITS(target);
  const custom=plan.alloc.method==="custom";
  const unitLabel=target.scope==="3"?"责任部门":"下属单位";
  return pageHead("目标分解",manager?'<button class="btn" onclick="saveAlloc(false)">保存</button><button class="btn primary" onclick="saveAlloc(true)">'+(plan.alloc.issued?'重新下发':'下发至'+unitLabel)+'</button>':'',"组织碳排放 / 碳目标管理 / 目标分解")+
    '<div class="lcaMeta"><label>目标 <select onchange="selectAllocTarget(this.value)">'+config.items.map(item=>'<option value="'+item.id+'" '+(item.id===target.id?'selected':'')+'>'+item.id+' · '+textHtml(item.name)+'</option>').join("")+'</select></label>'+
      '<label>分解方式 <select '+(manager?'':'disabled')+' onchange="setAllocMethod(this.value)">'+[["equal","统一比例"],["weighted","按基准排放规模"],["custom","自定义"]].map(([key,label])=>'<option value="'+key+'" '+(key===plan.alloc.method?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
      '<span>'+(plan.alloc.issued?'V'+plan.alloc.version+' · '+plan.alloc.issued+' 下发':'未下发')+'</span></div>'+
    '<div class="statRow">'+statTile("集团目标",target.targetYear+" 年 −"+target.reduction+"%",SCOPE_LABEL[target.scope]+" · "+(target.type==="intensity"?"强度":"绝对量"))+
      statTile("基准值 · "+config.baseYear,fmt(targetBase(target),digits),targetUnit(target))+
      statTile("分解加权降幅",plan.weighted.toFixed(1)+"%",'<span class="'+(plan.covered?'okText':'badText')+'">'+(plan.covered?'覆盖集团目标':'低于集团目标 '+(target.reduction-plan.weighted).toFixed(1)+' 个百分点')+'</span>')+
      statTile(unitLabel,String(plan.rows.length),"个")+'</div>'+
    '<section class="panel"><div class="tableWrap"><table class="allocTable"><thead><tr><th>'+unitLabel+'</th><th>负责人</th><th>基准值 · '+config.baseYear+'</th><th>排放占比</th><th>分解降幅</th>'+
      (target.interim?'<th>'+target.interim.year+' 中期值</th>':'')+'<th>'+target.targetYear+' 目标值</th><th>'+CURRENT_YEAR+' 路径值</th><th>'+CURRENT_YEAR+' 实际</th><th>状态</th></tr></thead><tbody>'+
      plan.rows.map(row=>{
        const st=unitStatus(target,row);
        const interimValue=target.interim?row.base*(1-pathCut(target,target.interim.year,row.cut)/100):0;
        return '<tr><td><b>'+textHtml(row.unit)+'</b></td><td>'+textHtml(row.owner)+'</td><td>'+fmt(row.base,digits)+'</td><td>'+(row.share*100).toFixed(1)+'%</td>'+
          '<td>'+(custom&&manager?'<input class="cutInput" type="number" min="0" max="100" step="0.5" data-unit="'+textHtml(row.unit)+'" value="'+(+row.cut.toFixed(1))+'" oninput="previewAlloc()">%':'−'+row.cut.toFixed(1)+'%')+'</td>'+
          (target.interim?'<td>'+fmt(interimValue,digits)+'</td>':'')+
          '<td>'+fmt(row.base*(1-row.cut/100),digits)+'</td><td>'+fmt(st.path,digits)+'</td><td>'+(st.pending&&!st.actual?'—':fmt(st.actual,digits))+'</td>'+
          '<td>'+(st.pending?'<span class="status warn">'+st.pending+' 项数据未审核</span>':'<span class="status '+(st.ahead?'ok':'bad')+'">'+(st.ahead?'符合路径':'落后路径')+'</span>')+'</td></tr>';
      }).join("")+
      '<tr class="totalRow"><td>合计</td><td></td><td>'+fmt(targetBase(target),digits)+'</td><td>100%</td><td id="allocWeighted">−'+plan.weighted.toFixed(1)+'%</td>'+(target.interim?'<td></td>':'')+
        '<td>'+fmt(targetPath(target,target.targetYear),digits)+'</td><td>'+fmt(targetPath(target,CURRENT_YEAR),digits)+'</td><td>'+fmt(targetActual(target,CURRENT_YEAR),digits)+'</td><td></td></tr>'+
    '</tbody></table></div></section>'+
    card("分解记录",(plan.alloc.log||[]).length||plan.alloc.issued?'<div class="tableWrap"><table class="compact"><thead><tr><th>版本</th><th>时间</th><th>方式</th><th>加权降幅</th><th>操作人</th></tr></thead><tbody>'+
      [...(plan.alloc.log||[])].reverse().concat(plan.alloc.log&&plan.alloc.log.length?[]:[{version:plan.alloc.version,at:plan.alloc.issued,method:plan.alloc.method,weighted:plan.weighted,by:MANAGER_NAME}]).map(row=>'<tr><td>V'+row.version+'</td><td>'+textHtml(row.at)+'</td><td>'+({equal:"统一比例",weighted:"按基准排放规模",custom:"自定义"}[row.method])+'</td><td>−'+Number(row.weighted).toFixed(1)+'%</td><td>'+textHtml(row.by)+'</td></tr>').join("")+
      '</tbody></table></div>':'<div class="todoEmpty">未下发</div>');
}
function setAllocMethod(method) {
  const target=targetsV2().items.find(item=>item.id===allocTargetId);
  const plan=allocOf(target);
  if(method==="custom")plan.rows.forEach(row=>plan.alloc.units[row.unit]=+row.cut.toFixed(1));
  plan.alloc.method=method;persistDemo();render();
}
function readCutInputs(plan) {
  document.querySelectorAll(".cutInput").forEach(input=>{plan.alloc.units[input.dataset.unit]=Number(input.value)||0;});
}
function previewAlloc() {
  const target=targetsV2().items.find(item=>item.id===allocTargetId);
  const shares=allocOf(target).rows.map(row=>row.share);
  let weighted=0;document.querySelectorAll(".cutInput").forEach((input,index)=>weighted+=(Number(input.value)||0)*shares[index]);
  const cell=document.getElementById("allocWeighted");if(cell){cell.textContent="−"+weighted.toFixed(1)+"%";cell.className=weighted>=target.reduction-0.05?"okText":"badText";}
}
function saveAlloc(issue) {
  const target=targetsV2().items.find(item=>item.id===allocTargetId);
  let plan=allocOf(target);
  if(plan.alloc.method==="custom"){readCutInputs(plan);plan=allocOf(target);}
  if(issue&&!plan.covered){showToast("分解加权降幅 "+plan.weighted.toFixed(1)+"% 低于集团目标 "+target.reduction+"%，请调整后下发");return;}
  if(issue) {
    const now=new Date().toLocaleString("zh-CN",{hour12:false});
    plan.alloc.log||=[];
    if(!plan.alloc.log.length&&plan.alloc.issued)plan.alloc.log.push({version:plan.alloc.version,at:plan.alloc.issued,method:plan.alloc.method,weighted:plan.weighted,by:MANAGER_NAME});
    plan.alloc.version=(plan.alloc.version||0)+1;plan.alloc.issued=now.slice(0,10).replace(/\//g,"-");
    plan.alloc.log.push({version:plan.alloc.version,at:now,method:plan.alloc.method,weighted:plan.weighted,by:MANAGER_NAME});
  }
  persistDemo();render();showToast(issue?"已下发至 "+plan.rows.length+" 个"+(target.scope==="3"?"责任部门":"下属单位"):"已保存");
}

// ---------- 目标跟踪：加入单位进度 ----------
const targetTrackPageBase = targetTrackPage;
targetTrackPage = function () {
  targetsV2();
  const html=targetTrackPageBase();
  return html.replace(/<\/section>/g,"</section>@@").split("@@").map((chunk,index)=>{
    const target=targets().items[index];
    if(!target||!chunk.includes("targetCard"))return chunk;
    const plan=allocOf(target),digits=TARGET_DIGITS(target);
    const table='<h4 class="subHead">'+(target.scope==="3"?"责任部门":"下属单位")+'进度</h4><div class="tableWrap"><table class="compact"><thead><tr><th>单位</th><th>负责人</th><th>分解降幅</th><th>基准值</th><th>'+CURRENT_YEAR+' 路径值</th><th>'+CURRENT_YEAR+' 实际</th><th>已较基准</th><th>状态</th></tr></thead><tbody>'+
      plan.rows.map(row=>{const st=unitStatus(target,row);
        return '<tr><td>'+textHtml(row.unit)+'</td><td>'+textHtml(row.owner)+'</td><td>−'+row.cut.toFixed(1)+'%</td><td>'+fmt(row.base,digits)+'</td><td>'+fmt(st.path,digits)+'</td><td>'+(st.pending&&!st.actual?'—':fmt(st.actual,digits))+'</td><td>'+(!row.base||(st.pending&&!st.actual)?'—':(st.reduced>=0?'−':'+')+Math.abs(st.reduced).toFixed(1)+'%')+'</td>'+
          '<td>'+(st.pending?'<span class="status warn">'+st.pending+' 项数据未审核</span>':'<span class="status '+(st.ahead?'ok':'bad')+'">'+(st.ahead?'符合路径':'落后路径')+'</span>')+'</td></tr>';}).join("")+
      '</tbody></table></div>';
    return chunk.replace(/<\/section>$/,table+"</section>");
  }).join("");
};

// ---------- 报告公共 ----------
const GAS_SPLIT = [
  [/燃煤|天然气|柴油|汽油|燃料/,{CO2:0.9955,CH4:0.0010,N2O:0.0035}],
  [/制冷剂/,{HFCs:1}]
];
const S3_RELEVANCE = {C01:"主要原材料与外协件",C02:"生产设备与工装购置",C03:"外购燃料与电力的上游排放",C04:"原材料与外协件入厂运输",C05:"生产废弃物委外处置",C06:"员工差旅",C07:"员工通勤",
  C08:"租赁仓库",C09:"成品配送",C10:"部分泵组由客户集成加工",C11:"售出水泵与电机的运行用电",C12:"售出产品报废处置",C13:"出租试验设备",C14:"区域特许经销门店",C15:"参股企业"};
const UNCERTAINTY = {"一级":0.05,"二级":0.2,"三级":0.5};
const RPT_VERIFY_DEFAULT = {2023:{org:"浙江中衡碳核查服务有限公司",std:"ISO 14064-3:2019",level:"合理保证（范围一、二）；有限保证（范围三）",date:"2024-04-26",result:"无保留意见",no:"ZH-GHG-2024-0418"},
  2024:{org:"浙江中衡碳核查服务有限公司",std:"ISO 14064-3:2019",level:"合理保证（范围一、二）；有限保证（范围三）",date:"2025-04-22",result:"无保留意见",no:"ZH-GHG-2025-0392"},
  2025:{org:"浙江中衡碳核查服务有限公司",std:"ISO 14064-3:2019",level:"合理保证（范围一、二）；有限保证（范围三）",date:"2026-04-17",result:"保留意见：范围三类别 1 支出法数据占比偏高",no:"ZH-GHG-2026-0375"}};
function verificationOf(year){demo.verification||={};return demo.verification[year]||RPT_VERIFY_DEFAULT[year]||null;}
function p1(part,total){if(!total)return "0";const v=part/total*100;return v>0&&v<0.1?"<0.1":v.toFixed(1);}
const sumE = rows=>rows.reduce((sum,row)=>sum+row.emission_tco2e,0);
function tierOf(row){return String(row.quality||"一级").slice(0,2);}
function uncertaintyOf(rows) {
  const total=sumE(rows);
  if(!total)return 0;
  return Math.sqrt(rows.reduce((sum,row)=>sum+Math.pow(row.emission_tco2e*(UNCERTAINTY[tierOf(row)]||0.05),2),0))/total*100;
}
function factorSource(row) {
  const name=scenarioText(row.source_name);
  if(name.includes(" / "))return tierOf(row)==="一级"?"供应商产品碳足迹声明":tierOf(row)==="二级"?"行业平均因子（企业因子库）":"支出法因子（环境扩展投入产出模型）";
  const task=workflowTasks().find(item=>item.name===row.source_name||scenarioText(item.name)===name);
  return task&&task.factorLabel&&task.factorLabel!==task.name?task.factorLabel:(SOURCE_FACTOR_REF[name]||"企业因子库");
}
const SOURCE_FACTOR_REF = {"产品使用电力":"全国电网平均排放因子（生态环境部 2022 年度）","钢材采购":"中国钢铁行业平均（世界钢协 2023）","货物公路运输":"重型柴油货车（交通运输行业因子）",
  "员工私家车通勤":"小型汽油乘用车（交通运输行业因子）","国内高铁差旅":"支出法因子（环境扩展投入产出模型）"};
function svgTrend(series,unit) {
  const years=series.map(item=>item.year);
  const max=Math.max(...series.map(item=>item.values.reduce((a,b)=>a+b,0)))*1.1||1;
  const w=640,h=220,l=70,b=28,t=12,bw=56;
  const colors=["#4D7F17","#86BC25","#008A7A"];
  const x=i=>l+(i+0.5)*(w-l-10)/years.length;
  const y=v=>t+(1-v/max)*(h-t-b);
  return '<svg class="rptChart" viewBox="0 0 '+w+' '+h+'" role="img">'+
    [0,.5,1].map(f=>'<line x1="'+l+'" x2="'+(w-10)+'" y1="'+y(max*f)+'" y2="'+y(max*f)+'" stroke="#E5E7EB"/><text x="'+(l-6)+'" y="'+(y(max*f)+4)+'" font-size="11" text-anchor="end" fill="#667085">'+fmt(max*f,0)+'</text>').join("")+
    series.map((item,i)=>{let acc=0;return item.values.map((value,k)=>{const y0=y(acc);acc+=value;const y1=y(acc);return '<rect x="'+(x(i)-bw/2)+'" y="'+y1+'" width="'+bw+'" height="'+Math.max(0,y0-y1)+'" fill="'+colors[k%3]+'"><title>'+item.year+' '+fmt(value,0)+' '+unit+'</title></rect>';}).join("")+
      '<text x="'+x(i)+'" y="'+(h-8)+'" font-size="12" text-anchor="middle" fill="#344054">'+item.year+'</text>';}).join("")+'</svg>';
}
function rTable(head,rows,cls="") {
  return '<table class="'+cls+'"><thead><tr>'+head.map(cell=>'<th>'+cell+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr'+(row.cls?' class="'+row.cls+'"':'')+'>'+(row.cells||row).map(cell=>'<td>'+cell+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function rSection(no,title,body){return '<section class="rptSec" id="rpt-'+no+'"><h2><span>'+no+'</span>'+title+'</h2>'+body+'</section>';}
const RPT_CSS = '.rptDoc{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:40px 48px;color:#1F2937;line-height:1.7;font-size:14px;max-width:1040px}'+
  '.rptDoc .rptCover{border-top:8px solid #86BC25;padding:28px 0 22px;border-bottom:1px solid #E5E7EB;margin-bottom:20px}.rptDoc .rptLogo{font-weight:800;font-size:28px;letter-spacing:-.5px}.rptDoc .rptLogo i{color:#86BC25;font-style:normal}'+
  '.rptDoc h1{font-size:26px;margin:22px 0 6px}.rptDoc .rptSub{color:#475467}.rptDoc .rptTag{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;margin-left:8px;background:#FFF4DE;color:#A66A00}.rptDoc .rptTag.ok{background:#F0F8E7;color:#4D7F17}'+
  '.rptDoc .rptMeta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 24px;margin-top:18px}.rptDoc .rptMeta div{display:flex;flex-direction:column}.rptDoc .rptMeta span{color:#667085;font-size:12px}'+
  '.rptDoc .rptToc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 24px;padding:14px 18px;background:#F8FAF5;border-radius:6px;margin:8px 0 10px;font-size:13px}.rptDoc .rptToc a{color:#344054;text-decoration:none}.rptDoc .rptToc a:hover{color:#26890D}'+
  '.rptDoc h2{font-size:18px;margin:30px 0 10px;padding-bottom:6px;border-bottom:2px solid #86BC25;display:flex;gap:10px}.rptDoc h2 span{color:#26890D}.rptDoc h3{font-size:15px;margin:18px 0 8px}'+
  '.rptDoc table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 12px;min-width:0}.rptDoc th{background:#F3F8EA;text-align:left;font-weight:600}.rptDoc th,.rptDoc td{padding:7px 9px;border-bottom:1px solid #E5E7EB;vertical-align:top}'+
  '.rptDoc th,.rptDoc td{white-space:normal;word-break:break-word}.rptDoc td:not(:first-child){font-variant-numeric:tabular-nums}.rptDoc tr.totalRow td{font-weight:700;background:#FAFBF8}.rptDoc .kv td:first-child{color:#667085;width:180px}'+
  '.rptDoc .rptKpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:10px 0 14px}.rptDoc .rptKpis div{border:1px solid #E5E7EB;border-radius:6px;padding:12px 14px}.rptDoc .rptKpis span{display:block;color:#667085;font-size:12px}.rptDoc .rptKpis b{font-size:20px}.rptDoc .rptKpis small{display:block;color:#667085}'+
  '.rptDoc .rptChart{width:100%;max-width:640px;height:auto}.rptDoc .rptLegend{display:flex;gap:16px;font-size:12px;color:#475467}.rptDoc .rptLegend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}'+
  '.rptDoc .rptNote{color:#667085;font-size:12px}.rptDoc .stmt{border:1px solid #D0D5DD;border-radius:6px;padding:14px 18px;background:#FCFCFD}.rptDoc .sig{display:flex;gap:48px;margin-top:14px;color:#475467;font-size:13px}'+
  '.rptDoc .up{color:#B42318}.rptDoc .down{color:#26890D}'+
  '@media (max-width:760px){.rptDoc{padding:20px 16px}.rptDoc .rptMeta,.rptDoc .rptToc{grid-template-columns:1fr}.rptDoc .rptKpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rptDoc table{display:block;overflow-x:auto}}'+
  '.rptLayout .rptDoc{max-width:none}@media print{.rptDoc{border:0;padding:0;max-width:none}.rptDoc h2{break-after:avoid}.rptDoc table{break-inside:auto}}';
function rptToc(titles){return '<nav class="rptToc">'+titles.map(([no,title])=>'<a href="#rpt-'+no+'" onclick="event.preventDefault();document.getElementById(\'rpt-'+no+'\').scrollIntoView({behavior:\'smooth\'})">'+no+' '+title+'</a>').join("")+'</nav>';}
function delta(now,prev){if(!prev)return "—";const value=(now-prev)/prev*100;return '<span class="'+(value>0?'up':'down')+'">'+(value>0?'+':'')+value.toFixed(1)+'%</span>';}
function wrapDoc(title,body) {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+textHtml(title)+'</title><style>body{margin:0;background:#F5F6F7;font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif}.rptDoc{margin:24px auto}'+RPT_CSS+'</style></head><body>'+body+'</body></html>';
}

// ---------- 组织温室气体报告 / 范围三报告 ----------
function orgReportData(scope3) {
  const year=reportYear;
  const config=targetsV2();
  const detail=approvedDetail().filter(row=>!scope3||String(row.scope)==="3");
  const issues=isHistoryYear()?[]:workflowIssues().filter(task=>!scope3||task.scope==="3");
  const prev=year-1>=REPORT_YEARS[0]?detailForYear(year-1).filter(row=>!scope3||String(row.scope)==="3"):[];
  const base=detailForYear(config.baseYear).filter(row=>!scope3||String(row.scope)==="3");
  const by=(rows,scope)=>sumE(rows.filter(row=>String(row.scope)===scope));
  return {year,config,detail,issues,prev,base,by,total:sumE(detail)};
}
function orgReportHtml(scope3,meta) {
  const d=orgReportData(scope3);
  const {year,config,detail,prev,base,by,total}=d;
  const company="江南流体装备集团有限公司";
  const title=year+" 年度"+(scope3?"范围三温室气体排放报告":"温室气体排放报告");
  const status=meta.status||(d.issues.length?"草稿":"已核对");
  const verify=verificationOf(year);
  const s=scope=>by(detail,scope);
  const green=detail.filter(row=>/绿电/.test(scenarioText(row.source_name)));
  const s2Location=s("2")+green.reduce((sum,row)=>sum+row.activity_value*0.0005703,0);
  const intensity=(s("1")+s("2"))/YEAR_REVENUE[year];
  const sections=[];
  const no=()=>String(sections.length+1);
  const push=(title,body)=>sections.push([no(),title,body]);

  // 1 概要
  const kpi=(label,value,sub)=>'<div><span>'+label+'</span><b>'+value+'</b><small>'+sub+'</small></div>';
  push("报告概要",'<div class="rptKpis">'+(scope3?
      kpi("范围三排放",fmt(total,0),"tCO₂e")+kpi("已核算类别",new Set(detail.map(row=>row.category_code)).size+" / 15","类别")+
      kpi("供应商一手数据",p1(sumE(detail.filter(row=>tierOf(row)==="一级"&&scenarioText(row.source_name).includes(" / "))),total)+"%","按排放量")+kpi("较上年",prev.length?delta(total,sumE(prev)):"—","可比口径"):
      kpi("排放总量",fmt(total,0),"tCO₂e")+kpi("范围一",fmt(s("1"),0),"tCO₂e")+kpi("范围二（基于位置）",fmt(s2Location,0),"tCO₂e")+kpi("范围三",fmt(s("3"),0),"tCO₂e"))+'</div>'+
    rTable(["指标",config.baseYear+" 基准年",(year-1)+" 年",year+" 年","较上年","较基准年"],(scope3?[["范围三","3"]]:[["范围一","1"],["范围二","2"],["范围三","3"]]).map(([label,scope])=>
      [label,fmt(by(base,scope),0),prev.length?fmt(by(prev,scope),0):"—",fmt(s(scope),0),prev.length?delta(s(scope),by(prev,scope)):"—",delta(s(scope),by(base,scope))]).concat(scope3?[]:[
      {cls:"totalRow",cells:["合计",fmt(sumE(base),0),prev.length?fmt(sumE(prev),0):"—",fmt(total,0),prev.length?delta(total,sumE(prev)):"—",delta(total,sumE(base))]},
      ["范围一+二强度（tCO₂e/百万元）",fmt((by(base,"1")+by(base,"2"))/YEAR_REVENUE[config.baseYear],2),prev.length?fmt((by(prev,"1")+by(prev,"2"))/YEAR_REVENUE[year-1],2):"—",fmt(intensity,2),
        prev.length?delta(intensity,(by(prev,"1")+by(prev,"2"))/YEAR_REVENUE[year-1]):"—",delta(intensity,(by(base,"1")+by(base,"2"))/YEAR_REVENUE[config.baseYear])]]))+
    '<p class="rptNote">单位：tCO₂e。'+(d.issues.length?d.issues.length+' 项数据未完成审核，未计入本期数据。':'本期数据已全部审核。')+'</p>');

  // 2 边界
  if(scope3) {
    const cats=demo.categories.map(cat=>{
      const rows=detail.filter(row=>row.category_code===cat.code);
      const pending=workflowTasks().some(task=>task.scope==="3"&&(task.category===cat.code||task.id.includes(cat.code))&&taskEntry(task).status!=="通过");
      return [cat.code.replace("C","类别 "),cat.name,textHtml(S3_RELEVANCE[cat.code]||"—"),rows.length?'<span class="down">已核算</span>':pending?'数据收集中':'不相关',rows.length?fmt(sumE(rows),0):"—",rows.length?p1(sumE(rows),total)+"%":"—"];
    });
    push("类别筛选与报告边界",'<p>组织边界采用运营控制权法，与组织温室气体报告一致。按 GHG Protocol 范围三标准对 15 个类别逐项识别：</p>'+rTable(["类别","名称","相关活动","状态","排放（tCO₂e）","占比"],cats));
  } else {
    push("组织与报告边界",rTable(["项目","内容"],[["报告主体",company],["报告期",year+"-01-01 至 "+year+"-12-31"],["合并方法","运营控制权法"],
      ["温室气体种类","CO₂、CH₄、N₂O、HFCs（PFCs、SF₆、NF₃ 经识别不涉及）"],["范围三","按 GHG Protocol 范围三标准识别 15 类，相关类别全部纳入"],["排除项","无重大排除；单一排放源 < 0.5% 且合计 < 1% 的可忽略源未单独列示"]],"kv")+
      '<h3>纳入单位</h3>'+rTable(["单位","类型","所在地","主营业务","纳入范围"],ORG_UNITS.map(item=>[item.unit,item.type,item.site,item.business,item.scopes])));
  }

  // 3 方法学
  const stdRows=scope3?[["核算标准","GHG Protocol 企业价值链（范围三）核算与报告标准"],["计算方法","供应商特定法 > 平均数据法 > 支出法，按数据可得性逐级选用"],["数据质量分级","一级：供应商一手数据或实测；二级：行业平均因子、调查推算或模型测算；三级：支出法"]]:
    [["核算标准","GHG Protocol 企业核算与报告标准；ISO 14064-1:2018"],["行业指南","《企业温室气体排放核算与报告指南 发电设施》；《温室气体排放核算方法与报告指南》（机械设备制造）"],
     ["计算方法","排放量 = 活动数据 × 排放因子；燃煤按月度实测低位发热量与元素碳含量计算"],["全球变暖潜势","IPCC 第四次评估报告 100 年 GWP（CH₄ 25，N₂O 298，HFC-134a 1,430）"],
     ["范围二","同时报告基于位置和基于市场的结果；绿电以绿证及交易凭证核销"]];
  push("核算方法学",rTable(["项目","内容"],stdRows,"kv"));

  // 4 基准年
  push("基准年与重算",rTable(["项目","内容"],[["基准年",String(config.baseYear)],["基准年排放",fmt(scope3?by(base,"3"):sumE(base),0)+" tCO₂e"],["重算政策","结构变化一律追溯调整；方法学、因子变更或数据错误影响 ≥ "+config.threshold+"% 时重算"]],"kv")+
    rTable(["日期","类型","事项","影响","处理"],config.recalcLog.map(row=>[row.date,textHtml(row.type),textHtml(row.desc),(row.impact>0?'+':'')+row.impact.toFixed(1)+'%',textHtml(row.decision)])));

  // 5 结果
  const top=detail.slice().sort((a,b)=>b.emission_tco2e-a.emission_tco2e).slice(0,10);
  if(scope3) {
    const cats=[...new Set(detail.map(row=>row.category_code))].map(code=>{const rows=detail.filter(row=>row.category_code===code);
      const tiers=["一级","二级","三级"].map(t=>p1(sumE(rows.filter(row=>tierOf(row)===t)),sumE(rows))+"%");
      return {code,rows,value:sumE(rows),tiers};}).sort((a,b)=>b.value-a.value);
    const suppliers=detail.filter(row=>scenarioText(row.source_name).includes(" / ")).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
    push("排放结果",'<h3>按类别</h3>'+rTable(["类别","排放（tCO₂e）","占比","一级","二级","三级"],cats.map(row=>[textHtml(categoryName(row.code)),fmt(row.value,0),p1(row.value,total)+"%",...row.tiers])
        .concat([{cls:"totalRow",cells:["合计",fmt(total,0),"100%","","",""]}]))+
      '<h3>按供应商</h3>'+rTable(["供应商 / 物料","类别","活动数据","因子","排放（tCO₂e）","数据质量"],suppliers.map(row=>{const [sup,item]=scenarioText(row.source_name).split(" / ");
        return [textHtml(sup)+'<br><small class="rptNote">'+textHtml(item)+'</small>',textHtml(categoryName(row.category_code)),fmt(row.activity_value,0)+" "+textHtml(row.activity_unit),+Number(row.factor_value).toPrecision(4),fmt(row.emission_tco2e,0),textHtml(row.quality||"—")];})));
  } else {
    const gas={CO2:0,CH4:0,N2O:0,HFCs:0};
    detail.filter(row=>String(row.scope)==="1").forEach(row=>{const rule=GAS_SPLIT.find(([re])=>re.test(scenarioText(row.source_name)));
      Object.entries(rule?rule[1]:{CO2:1}).forEach(([key,share])=>gas[key]+=row.emission_tco2e*share);});
    const units=ORG_UNITS.map(item=>{const rows=detail.filter(row=>unitOfRow(row)===item.unit);return [item.unit,fmt(by(rows,"1"),0),fmt(by(rows,"2"),0),by(rows,"3")?fmt(by(rows,"3"),0):"—",fmt(sumE(rows),0),p1(sumE(rows),total)+"%"];});
    const cats=[...new Set(detail.filter(row=>String(row.scope)==="3").map(row=>row.category_code))].map(code=>({code,value:sumE(detail.filter(row=>row.category_code===code))})).sort((a,b)=>b.value-a.value);
    push("排放结果",'<h3>按范围</h3>'+rTable(["范围","排放（tCO₂e）","占比"],[["范围一 直接排放",fmt(s("1"),1),p1(s("1"),total)+"%"],["范围二 基于位置",fmt(s2Location,1),"—"],["范围二 基于市场",fmt(s("2"),1),p1(s("2"),total)+"%"],
        ["范围三 价值链排放",fmt(s("3"),1),p1(s("3"),total)+"%"],{cls:"totalRow",cells:["合计（范围二按基于市场）",fmt(total,1),"100%"]}])+
      '<h3>范围一按温室气体种类</h3>'+rTable(["气体","排放（tCO₂e）","占范围一"],Object.entries(gas).map(([key,value])=>[key.replace("CO2","CO₂").replace("CH4","CH₄").replace("N2O","N₂O"),fmt(value,1),p1(value,s("1"))+"%"]))+
      '<h3>按单位</h3>'+rTable(["单位","范围一","范围二","范围三","合计","占比"],units)+
      '<h3>范围三按类别</h3>'+rTable(["类别","排放（tCO₂e）","占范围三"],cats.map(row=>[textHtml(categoryName(row.code)),fmt(row.value,0),p1(row.value,s("3"))+"%"])));
  }
  sections[sections.length-1][2]+='<h3>主要排放源</h3>'+rTable(["排放源","范围","单位","排放（tCO₂e）","占比"],top.map(row=>[textHtml(scenarioText(row.source_name)),"范围"+row.scope,textHtml(unitOfRow(row)),fmt(row.emission_tco2e,0),p1(row.emission_tco2e,total)+"%"]));

  // 6 趋势
  const series=REPORT_YEARS.filter(y=>y<=year).map(y=>{const t=yearTotals(y);return {year:y,values:scope3?[t["3"]]:[t["1"],t["2"],t["3"]]};});
  push("历年趋势",(scope3?'':svgTrend(series.map(item=>({year:item.year,values:item.values.slice(0,2)})),"tCO₂e")+'<div class="rptLegend"><span><i style="background:#4D7F17"></i>范围一</span><span><i style="background:#86BC25"></i>范围二</span></div>')+
    rTable(["年度",...(scope3?["范围三"]:["范围一","范围二","范围三","合计","范围一+二强度"])],series.map(item=>[item.year+(item.year===config.baseYear?"（基准年）":""),...item.values.map(v=>fmt(v,0)),
      ...(scope3?[]:[fmt(item.values.reduce((a,b)=>a+b,0),0),fmt((item.values[0]+item.values[1])/YEAR_REVENUE[item.year],2)])])));

  // 7 目标
  const goals=config.items.filter(target=>!scope3||target.scope!=="12");
  if(goals.length)push("减排目标与进展",rTable(["目标","依据","基准值","目标","本年实际","本年路径值","状态"],goals.map(target=>{
    const digits=TARGET_DIGITS(target),actual=targetActual(target,year),path=targetPath(target,year);
    return [textHtml(target.name),textHtml(target.framework||"—"),fmt(targetBase(target),digits)+" "+targetUnit(target),target.targetYear+" 年 −"+target.reduction+"%"+(target.interim?"；"+target.interim.year+" 年 −"+target.interim.reduction+"%":""),
      fmt(actual,digits),fmt(path,digits),actual<=path?'<span class="down">符合路径</span>':'<span class="up">落后路径</span>'];}))+
    goals.map(target=>{const plan=allocOf(target);return '<h3>'+textHtml(target.name)+' · 分解</h3>'+rTable([target.scope==="3"?"责任部门":"单位","分解降幅","基准值","本年实际","状态"],plan.rows.map(row=>{const st=unitStatus(target,row,year);
      return [textHtml(row.unit),"−"+row.cut.toFixed(1)+"%",fmt(row.base,TARGET_DIGITS(target)),st.pending&&!st.actual?"—":fmt(st.actual,TARGET_DIGITS(target)),st.pending?st.pending+" 项数据未审核":st.ahead?"符合路径":"落后路径"];}));}).join(""));

  // 8 管理层分析（已生成时）
  const narrative=narrativeHtml(scope3?"scope3":"org",true);
  if(narrative)push("管理层分析",narrative.replace(/<h2>/g,"<h3>").replace(/<\/h2>/g,"</h3>"));

  // 9 数据质量
  const tiers=["一级","二级","三级"].map(t=>({t,value:sumE(detail.filter(row=>tierOf(row)===t)),n:detail.filter(row=>tierOf(row)===t).length}));
  const evRows=detail.map(row=>{const task=typeof taskForDetailRow==="function"?taskForDetailRow(row):null;const evs=task?evidenceFor(task.id):[];return {row,has:evs.length>0,ok:evs.some(ev=>ev.verified)};});
  push("数据质量与不确定性",rTable(["数据质量等级","数据条数","排放（tCO₂e）","占比","不确定性假设"],tiers.map(item=>[item.t,item.n,fmt(item.value,0),p1(item.value,total)+"%","±"+(UNCERTAINTY[item.t]*100)+"%"]))+
    rTable(["范围","不确定性（95% 置信区间）","凭证覆盖","凭证已核验"],(scope3?["3"]:["1","2","3"]).map(scope=>{const rows=detail.filter(row=>String(row.scope)===scope),ev=evRows.filter(item=>String(item.row.scope)===scope);
      return ["范围"+["","一","二","三"][scope],"±"+uncertaintyOf(rows).toFixed(1)+"%",ev.filter(item=>item.has).length+" / "+ev.length,ev.filter(item=>item.ok).length+" / "+ev.length];}).concat([{cls:"totalRow",cells:["合计","±"+uncertaintyOf(detail).toFixed(1)+"%",evRows.filter(item=>item.has).length+" / "+evRows.length,evRows.filter(item=>item.ok).length+" / "+evRows.length]}]))+
    '<p class="rptNote">不确定性按 IPCC 误差传递法（方法 1）合成。</p>');

  // 10 排放因子
  const factors=[];const seen=new Set();
  detail.forEach(row=>{const key=scenarioText(row.source_name).split(" / ").pop()+row.factor_value;if(seen.has(key))return;seen.add(key);
    factors.push([textHtml(scenarioText(row.source_name).split(" / ").pop()),+Number(row.factor_value).toPrecision(5),"tCO₂e / "+textHtml(row.activity_unit),textHtml(factorSource(row))]);});
  push("排放因子来源",rTable(["排放源","因子","单位","来源"],factors));

  // 11 减排措施
  const measures=measureList({now:detail}).filter(item=>!scope3||item.scope==="3");
  push("减排措施",rTable(["措施","范围","年减排潜力（tCO₂e）","测算依据","投入"],measures.map(item=>[textHtml(item.name),"范围"+["","一","二","三"][item.scope],fmt(item.cut,0),textHtml(item.basis),item.cost]))+
    (measures.length?'<p>合计年减排潜力 '+fmt(measures.reduce((a,b)=>a+b.cut,0),0)+' tCO₂e，相当于本期'+(scope3?'范围三':'排放总量')+'的 '+p1(measures.reduce((a,b)=>a+b.cut,0),total)+'%。</p>':''));

  // 12 核查
  push("核查声明",verify?'<div class="stmt">'+rTable(["项目","内容"],[["核查机构",textHtml(verify.org)],["核查标准",textHtml(verify.std)],["保证等级",textHtml(verify.level)],["核查日期",textHtml(verify.date)],["核查结论",textHtml(verify.result)],["声明编号",textHtml(verify.no)]],"kv")+'</div>':
    '<div class="stmt">'+rTable(["项目","内容"],[["核查状态","未核查"],["计划标准","ISO 14064-3:2019"],["计划保证等级","合理保证（范围一、二）；有限保证（范围三）"]],"kv")+'</div>');
  sections[sections.length-1][2]+='<div class="sig"><span>编制：'+MANAGER_NAME+'</span><span>审核：可持续发展委员会</span><span>日期：'+textHtml(meta.created||new Date().toLocaleDateString("zh-CN"))+'</span></div>';

  // 附录
  if(meta.forDocument) {
    push("附录 · 排放清单",rTable(["范围","排放源","单位","活动数据","因子","排放（tCO₂e）","数据质量","凭证"],detail.map(row=>["范围"+row.scope,textHtml(scenarioText(row.source_name)),textHtml(unitOfRow(row)),
      fmt(row.activity_value,2)+" "+textHtml(row.activity_unit),+Number(row.factor_value).toPrecision(5),fmt(row.emission_tco2e,2),textHtml(row.quality||"—"),textHtml(row.evidence||"—")]))+
      (d.issues.length?'<h3>未纳入的数据</h3>'+rTable(["任务","名称","状态"],d.issues.map(task=>[task.id,textHtml(task.name),textHtml(taskEntry(task).status)])):''));
  }

  return '<article class="rptDoc"><div class="rptCover"><div class="rptLogo">Deloitte<i>.</i></div><h1>'+textHtml(company)+'<br>'+title+'<span class="rptTag '+(status==="已核对"?'ok':'')+'">'+textHtml(status)+'</span></h1>'+
    '<div class="rptMeta"><div><span>报告期</span>'+year+' 年 1 月 1 日 – 12 月 31 日</div><div><span>核算标准</span>'+textHtml(standardName(meta.standard||backendState.standard))+'</div><div><span>报告编号</span>'+textHtml(meta.no||("GHG-"+year+(scope3?"-S3":"")+"-预览"))+'</div>'+
      '<div><span>编制单位</span>可持续发展部</div><div><span>生成时间</span>'+textHtml(meta.created||new Date().toLocaleString("zh-CN",{hour12:false}))+'</div><div><span>核查</span>'+(verify?textHtml(verify.result):"未核查")+'</div></div></div>'+
    rptToc(sections.map(([n,t])=>[n,t]))+sections.map(([n,t,b])=>rSection(n,t,b)).join("")+'</article>';
}
renderStandardReport = function () {
  if(!backendState.ready)return needsBackend();
  const scope3=state.page==="范围三专项报告";
  const issues=isHistoryYear()?[]:workflowIssues().filter(task=>!scope3||task.scope==="3");
  const kind=scope3?"scope3":"org";
  const rows=demo.reports.filter(row=>(row.type||"范围三专项报告")===state.page);
  const manager=currentRole==="管理者";
  return '<style>'+RPT_CSS+'</style>'+pageHead(state.page,
      '<select class="headSelect" onchange="changeStandard(this.value)">'+optionList(demo.standards,"code","name",backendState.standard)+'</select>'+
      (manager?'<button class="btn" onclick="openVerifyModal()">登记核查</button>'+(isHistoryYear()?'':'<button class="btn" onclick="openNarrative()">'+((demo.reportNarrative||{})[kind]?'编辑管理层分析':'生成管理层分析')+'</button>'):'')+
      exportMenu("exportReport")+
      (manager&&!isHistoryYear()?'<button class="btn primary" onclick="generateScope3Report()">'+(issues.length?"生成草稿版本":"生成正式版本")+'</button>':''),"组织碳排放 / 报告中心 / "+state.page)+
    '<div class="rptLayout">'+orgReportHtml(scope3,{})+'</div>'+
    card("报告版本",rows.length?'<div class="tableWrap"><table class="compact"><thead><tr><th>编号</th><th>口径</th><th>状态</th><th>排放（tCO₂e）</th><th>生成时间</th><th>操作</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><td>R-'+String(row.id).padStart(3,"0")+'</td><td>'+textHtml(standardName(row.standard_code))+'</td><td>'+entryStatus(row.status==="已核对"?"通过":"草稿")+
        '</td><td>'+fmt(row.total_emission,2)+'</td><td>'+textHtml(String(row.created_at).slice(0,16).replace("T"," "))+'</td><td><button class="btn" onclick="downloadOrgReport('+row.id+')">下载</button></td></tr>').join("")+
      '</tbody></table></div>':'<div class="todoEmpty">暂无版本</div>');
};
reportDocument = function (title,status,standardCode,detail,incomplete,created) {
  const scope3=String(title).includes("范围三");
  return wrapDoc(title,orgReportHtml(scope3,{forDocument:true,status,standard:standardCode,created}));
};
function openVerifyModal() {
  const year=reportYear,v=verificationOf(year)||{};
  openModal('<h2>'+year+' 年度核查结果</h2><div class="modalForm">'+
    '<label class="wide">核查机构<input id="vfOrg" value="'+textHtml(v.org||"")+'"></label>'+
    '<label>核查标准<input id="vfStd" value="'+textHtml(v.std||"ISO 14064-3:2019")+'"></label>'+
    '<label>核查日期<input id="vfDate" type="date" value="'+textHtml(v.date||"")+'"></label>'+
    '<label class="wide">保证等级<select id="vfLevel">'+["合理保证（范围一、二）；有限保证（范围三）","合理保证（范围一、二、三）","有限保证（范围一、二、三）"].map(item=>'<option '+(item===v.level?'selected':'')+'>'+item+'</option>').join("")+'</select></label>'+
    '<label class="wide">核查结论<input id="vfResult" value="'+textHtml(v.result||"无保留意见")+'"></label>'+
    '<label>声明编号<input id="vfNo" value="'+textHtml(v.no||"")+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveVerify()">保存</button></div>');
}
function saveVerify() {
  const get=id=>document.getElementById(id).value.trim();
  if(!get("vfOrg")||!get("vfDate")){showToast("请填写核查机构和日期");return;}
  demo.verification||={};
  demo.verification[reportYear]={org:get("vfOrg"),std:get("vfStd"),date:get("vfDate"),level:get("vfLevel"),result:get("vfResult"),no:get("vfNo")};
  persistDemo();closeModal();render();showToast("核查结果已登记");
}
downloadCurrentReport = function () {
  const scope3=state.page==="范围三专项报告";
  const title="江南流体装备 "+reportYear+" 年度"+(scope3?"范围三温室气体排放报告":"温室气体排放报告");
  downloadLcaFile(reportDocument(title,workflowIssues().length&&!isHistoryYear()?"草稿":"已核对",backendState.standard,[],[],new Date().toLocaleString("zh-CN",{hour12:false})),title+".html","text/html");
};
downloadOrgReport = function (id) {
  const report=demo.reports.find(row=>row.id===id);
  const type=report.type||"范围三专项报告";
  const title="江南流体装备 "+reportYear+" 年度"+(type==="范围三专项报告"?"范围三温室气体排放报告":"温室气体排放报告");
  downloadLcaFile(wrapDoc(title,orgReportHtml(type==="范围三专项报告",{forDocument:true,status:report.status||"草稿",standard:report.standard_code,created:String(report.created_at).slice(0,19).replace("T"," "),no:"R-"+String(report.id).padStart(3,"0")})),
    "R-"+String(report.id).padStart(3,"0")+"-"+title+".html","text/html");
};

// ---------- 产品碳足迹报告（ISO 14067:2018） ----------
const LINE_DQ = {"企业实测":{p:1,u:0.05},"供应商声明":{p:2,u:0.1},"行业平均":{p:3,u:0.2},"情景估算":{p:3,u:0.3}};
function lineQuality(line) {
  const src=String(line.source||"");
  const kind=/供应商/.test(src)?"供应商声明":line.quality==="情景估算"||/情景|方案/.test(src)?"情景估算":/电表|记录|计量|领料|试验/.test(src)?"企业实测":"行业平均";
  const ti=Number(line.year)>=2025?1:Number(line.year)>=2022?2:3;
  const ge=/华东|浙江|中国/.test(String(line.region||"")+src)?(/华东|浙江/.test(src)?1:2):3;
  const te=kind==="企业实测"||kind==="供应商声明"?1:2;
  const p=LINE_DQ[kind].p;
  return {kind,ti,ge,te,p,dqr:(ti+ge+te+p)/4,u:LINE_DQ[kind].u};
}
function dqrLabel(value){return value<=1.6?"优秀":value<=2?"很好":value<=3?"良好":"一般";}
function productLines(model) {
  return model.stages.flatMap((stage,stageIndex)=>stage.enabled?stage.lines.map((line,index)=>({stage:stage.name,stageIndex,index,line,
    perUnit:Number(line.quantity)*Number(line.allocation)/100/model.batchOutput*model.referenceFlow,emission:lineEmission(model,line),q:lineQuality(line)})):[]);
}
function productReportHtml(model,forDocument) {
  const lines=productLines(model);
  const totals=lcaTotals(model);
  const total=lcaTotal(model);
  const fu=model.flowUnit;
  const sections=[];
  const push=(title,body)=>sections.push([String(sections.length+1),title,body]);
  const k=value=>fmt(value,value>=100?1:value>=1?3:4);
  const useLine=lines.find(item=>/运行用电/.test(item.line.name));
  const kwhLines=lines.filter(item=>item.line.unit==="kWh");
  const tkmLines=lines.filter(item=>item.line.unit==="t·km");
  const kwh=sumBy(kwhLines),tkm=sumBy(tkmLines),use=useLine?useLine.emission:0;
  function sumBy(list){return list.reduce((sum,item)=>sum+item.emission,0);}
  const packaging=lines.filter(item=>/纸箱|木托|包装/.test(item.line.name)&&item.line.unit==="kg"&&item.stage===lifecycleStages[0]);
  const bioStore=packaging.reduce((sum,item)=>sum+item.perUnit*0.45*44/12,0);
  const dqr=lines.length?lines.reduce((sum,item)=>sum+item.q.dqr*item.emission,0)/(total||1):0;
  const unc=total?Math.sqrt(lines.reduce((sum,item)=>sum+Math.pow(item.emission*item.q.u,2),0))/total*100:0;

  push("总则",rTable(["项目","内容"],[["研究目的","量化 "+textHtml(model.name)+"（型号 "+textHtml(model.code)+"）的产品碳足迹，识别减排热点"],["预期用途","客户供应链碳数据披露、产品碳标识申请、内部生态设计"],
    ["目标受众","下游客户、认证机构、企业内部"],["比较性声明","不用于向公众披露的比较性声明"],["依据标准","ISO 14067:2018；ISO 14040:2006；ISO 14044:2006"],["委托与编制","江南流体装备集团 · "+textHtml(model.owner||"产品环境合规组")]],"kv"));
  push("研究范围",rTable(["项目","内容"],[["功能单位",textHtml(model.functionalUnit)],["参考流",model.referenceFlow+" "+fu],["系统边界",textHtml(model.boundary)],
    ["时间边界",textHtml(model.period)+"；使用阶段 "+model.lifetime+" 年"],["地理边界",textHtml(model.geography||"中国")],["截断准则",textHtml(model.cutoff||"—")],
    ["分配程序",textHtml(model.allocation||"物理量分配")+"；多产品共线能耗按工时分配"],["排除项",textHtml(model.exclusions||"—")]],"kv")+
    '<h3>生命周期阶段</h3>'+rTable(["阶段","是否纳入","主要过程"],model.stages.map(stage=>[stage.name,stage.enabled?"纳入":"不纳入",stage.enabled?stage.lines.map(line=>textHtml(line.name)).join("、"):"超出 "+textHtml(model.boundary)+" 边界"])));
  push("生命周期清单分析",'<p>批次产量 '+model.batchOutput+' '+fu+'，清单数据按批次采集后折算至参考流。</p>'+
    rTable(["阶段","过程","每参考流用量","排放因子（kgCO₂e/单位）","排放（kgCO₂e）","数据类型","来源","凭证"],lines.map(item=>[item.stage,textHtml(item.line.name),fmt(item.perUnit,item.perUnit>=100?1:3)+" "+textHtml(item.line.unit),
      +Number(item.line.factor).toPrecision(4),k(item.emission),item.q.kind,textHtml(item.line.source||"—"),textHtml(item.line.evidence||"—")])));
  push("影响评价",rTable(["项目","内容"],[["影响类别","气候变化"],["特征化因子","IPCC 第六次评估报告 GWP100"],["结果单位","kgCO₂e / "+model.referenceFlow+" "+fu]],"kv")+
    '<h3>按生命周期阶段</h3>'+rTable(["阶段","排放（kgCO₂e）","贡献率"],totals.filter(stage=>stage.enabled).map(stage=>[stage.name,k(stage.total),p1(stage.total,total)+"%"]).concat([{cls:"totalRow",cells:["产品碳足迹（CFP）",k(total),"100%"]}]))+
    '<h3>按温室气体来源（ISO 14067 第 7.2 条）</h3>'+rTable(["类别","kgCO₂e","说明"],[["化石源温室气体排放",k(total),"计入 CFP"],["生物源温室气体排放",k(0),"计入 CFP"],["生物源温室气体移除",k(0),"计入 CFP"],
      ["直接土地利用变化（dLUC）",k(0),"不涉及"],["航空运输排放",k(0),"不涉及"],["产品中生物碳储存",k(bioStore),"单独报告，不计入 CFP（包装纸木材料）"]]));
  const sens=[];
  if(kwh)sens.push(["电网排放因子 ±10%","±"+k(kwh*0.1),"±"+p1(kwh*0.1,total)+"%"]);
  if(use)sens.push(["使用寿命 8 年 / 12 年",k(total-use*0.2)+" / "+k(total+use*0.2),"−"+p1(use*0.2,total)+"% / +"+p1(use*0.2,total)+"%"]);
  if(use)sens.push(["年运行小时 1,600 h / 2,400 h",k(total-use*0.2)+" / "+k(total+use*0.2),"±"+p1(use*0.2,total)+"%"]);
  if(tkm)sens.push(["运输距离 ±50%","±"+k(tkm*0.5),"±"+p1(tkm*0.5,total)+"%"]);
  const hot=lines.slice().sort((a,b)=>b.emission-a.emission).slice(0,5);
  push("结果解释",'<h3>热点分析</h3>'+rTable(["过程","阶段","排放（kgCO₂e）","贡献率"],hot.map(item=>[textHtml(item.line.name),item.stage,k(item.emission),p1(item.emission,total)+"%"]))+
    '<h3>敏感性分析</h3>'+(sens.length?rTable(["参数","CFP（kgCO₂e）","变化"],sens):'<p>—</p>')+
    '<h3>数据质量评价</h3>'+rTable(["过程","技术代表性","地理代表性","时间代表性","精确度","DQR","评级"],lines.map(item=>[textHtml(item.line.name),item.q.te,item.q.ge,item.q.ti,item.q.p,item.q.dqr.toFixed(2),dqrLabel(item.q.dqr)]))+
    '<p>按排放量加权 DQR '+dqr.toFixed(2)+'（'+dqrLabel(dqr)+'）；合成不确定性 ±'+unc.toFixed(1)+'%（95% 置信区间），CFP 区间 '+k(total*(1-unc/100))+' – '+k(total*(1+unc/100))+' kgCO₂e。</p>'+
    '<h3>局限性</h3><ul><li>使用阶段按额定功率和设计工况测算，实际能耗随客户工况变化。</li><li>回收阶段采用截断法，回收材料的环境收益未抵扣。</li><li>部分原材料采用行业平均因子，供应商一手数据覆盖后需更新。</li></ul>');
  const ideas=[];
  if(use)ideas.push(["电机能效由 IE3 升级为 IE4","使用维护",k(use*0.026),"额定效率 86.0% → 88.3%"]);
  if(use)ideas.push(["配套变频控制","使用维护",k(use*0.15),"部分负载工况节电 15%"]);
  const metal=lines.filter(item=>/铸铁|钢/.test(item.line.name));
  if(metal.length)ideas.push(["铸件采用 30% 再生铁料","原材料获取",k(sumBy(metal)*0.3*0.55),"再生料单位排放降低约 55%"]);
  const make=lines.filter(item=>item.stage===lifecycleStages[1]&&item.line.unit==="kWh");
  if(make.length)ideas.push(["装配车间绿电覆盖 50%","生产制造",k(sumBy(make)*0.5),"绿电按零排放计"]);
  push("结论与改进建议",'<p>'+textHtml(model.name)+' 的产品碳足迹为 <b>'+k(total)+' kgCO₂e / '+model.referenceFlow+' '+fu+'</b>（'+textHtml(model.boundary)+'），'+
    (totals[3]&&totals[3].enabled?'使用维护阶段占 '+p1(totals[3].total,total)+'%，是决定性阶段。':'原材料获取阶段占 '+p1(totals[0].total,total)+'%。')+'</p>'+
    rTable(["改进措施","阶段","减排潜力（kgCO₂e）","依据"],ideas));
  const cert=(demo.lcaCert||{})[model.id];
  push("核查与声明",'<div class="stmt">'+rTable(["项目","内容"],cert?[["核查机构",textHtml(cert.org)],["核查标准","ISO 14067:2018；ISO 14064-3:2019"],["核查日期",textHtml(cert.date)],["结论",textHtml(cert.result)],["证书编号",textHtml(cert.no)]]:
    [["核查状态","未核查"],["模型状态",textHtml(model.status||"草稿")],["模型版本","V"+textHtml(model.version)]],"kv")+'</div>'+
    '<div class="sig"><span>编制：'+textHtml(model.owner||"产品环境合规组")+'</span><span>审核：'+MANAGER_NAME+'</span><span>日期：'+new Date().toLocaleDateString("zh-CN")+'</span></div>');
  if(forDocument&&model.history&&model.history.length)push("附录 · 版本记录",rTable(["快照","时间","CFP（kgCO₂e）"],model.history.map((item,index)=>[String(index+1),textHtml(String(item.at).slice(0,16).replace("T"," ")),k(item.total)])));
  return '<article class="rptDoc"><div class="rptCover"><div class="rptLogo">Deloitte<i>.</i></div><h1>'+textHtml(model.name)+'<br>产品碳足迹报告<span class="rptTag '+(cert?'ok':'')+'">'+(cert?'已核查':'未核查')+'</span></h1>'+
    '<div class="rptMeta"><div><span>产品型号</span>'+textHtml(model.code)+'</div><div><span>功能单位</span>'+textHtml(model.functionalUnit)+'</div><div><span>报告编号</span>CFP-'+textHtml(model.code)+'-'+String(model.period||"").slice(0,4)+'</div>'+
      '<div><span>产品碳足迹</span><b>'+k(total)+' kgCO₂e</b></div><div><span>系统边界</span>'+textHtml(model.boundary)+'</div><div><span>依据</span>ISO 14067:2018</div></div></div>'+
    rptToc(sections.map(([n,t])=>[n,t]))+sections.map(([n,t,b])=>rSection(n,t,b)).join("")+'</article>';
}
function downloadProductReport() {
  const model=activeLca();
  downloadLcaFile(wrapDoc(model.name+" 产品碳足迹报告",productReportHtml(model,true)),"CFP-"+model.code+"-产品碳足迹报告.html","text/html");
}
function productQualityReport(model) {
  const lines=productLines(model),total=lcaTotal(model);
  const dqr=lines.reduce((sum,item)=>sum+item.q.dqr*item.emission,0)/(total||1);
  const kinds=["企业实测","供应商声明","行业平均","情景估算"].map(kind=>{const list=lines.filter(item=>item.q.kind===kind);return [kind,list.length,fmt(list.reduce((a,b)=>a+b.emission,0),2),p1(list.reduce((a,b)=>a+b.emission,0),total)+"%"];});
  return '<style>'+RPT_CSS+'</style>'+lcaHeading("数据质量分析报告")+
    '<div class="statRow">'+statTile("加权 DQR",dqr.toFixed(2),dqrLabel(dqr))+statTile("清单过程",String(lines.length),"条")+
      statTile("有凭证",lines.filter(item=>item.line.evidence).length+" / "+lines.length,"条")+statTile("情景估算排放占比",p1(lines.filter(item=>item.q.kind==="情景估算").reduce((a,b)=>a+b.emission,0),total)+"%","按排放量")+'</div>'+
    '<div class="homeGrid even"><div>'+card("数据来源构成",'<div class="tableWrap"><table class="compact"><thead><tr><th>数据类型</th><th>过程数</th><th>排放（kgCO₂e）</th><th>占比</th></tr></thead><tbody>'+kinds.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>')+'</div>'+
    '<div>'+card("评分规则",'<div class="tableWrap"><table class="compact"><thead><tr><th>指标</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody>'+
      '<tr><td>技术代表性</td><td>实测或供应商</td><td>同类技术平均</td><td>相近技术</td></tr><tr><td>地理代表性</td><td>华东/浙江</td><td>全国</td><td>其他地区</td></tr>'+
      '<tr><td>时间代表性</td><td>≤ 1 年</td><td>≤ 4 年</td><td>&gt; 4 年</td></tr><tr><td>精确度</td><td>计量</td><td>供应商声明</td><td>估算</td></tr></tbody></table></div>')+'</div></div>'+
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>阶段</th><th>过程</th><th>数据类型</th><th>技术</th><th>地理</th><th>时间</th><th>精确度</th><th>DQR</th><th>排放占比</th><th>凭证</th><th>操作</th></tr></thead><tbody>'+
      lines.map(item=>'<tr><td>'+item.stage+'</td><td>'+textHtml(item.line.name)+'</td><td>'+item.q.kind+'</td><td>'+item.q.te+'</td><td>'+item.q.ge+'</td><td>'+item.q.ti+'</td><td>'+item.q.p+'</td><td><span class="status '+(item.q.dqr<=1.6?'ok':item.q.dqr<=2?'ok':item.q.dqr<=3?'warn':'bad')+'">'+item.q.dqr.toFixed(2)+' '+dqrLabel(item.q.dqr)+'</span></td><td>'+p1(item.emission,total)+'%</td><td>'+textHtml(item.line.evidence||"—")+'</td>'+
        '<td><button class="btn" onclick="activeLcaStage='+item.stageIndex+';editLcaLine('+item.index+')">复核</button></td></tr>').join("")+'</tbody></table></div></section>';
}
const reportBeforeIso = report;
report = function () {
  if(state.top!=="产品碳排放")return reportBeforeIso();
  const model=activeLca();
  if(state.page==="数据质量分析报告")return productQualityReport(model);
  return '<style>'+RPT_CSS+'</style>'+lcaHeading("碳足迹评价报告")+
    '<div class="rptBar"><button class="btn" onclick="exportLca()">下载清单（CSV）</button>'+exportMenu("exportReport")+'</div>'+
    productReportHtml(model,false);
};

// ---------- 菜单与路由 ----------
MENUS["组织碳排放"]["碳目标管理"]=["目标设定","目标分解","目标跟踪"];
const renderBeforeTargets = render;
render = function () {
  renderBeforeTargets();
  if(!backendState.ready)return;
  if(state.top==="组织碳排放"&&state.group==="碳目标管理"&&state.page==="目标分解")document.getElementById("content").innerHTML=targetAllocPage();
};
