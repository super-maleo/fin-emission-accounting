// v11：排放源识别（行业模板）、范围三类别筛查、能源转供与输出扣减、C3 派生、重复计算剔除、数据交叉核对、
// 因子系统边界、供应商因子有效期、产品碳足迹边界 / PCR / 建模说明、国家核算口径与核查管理。
// 加载顺序：depth-kit.js 之后、export-kit.js 之前。

const XK_VERSION = 1;
const XK_GRID = 0.0005703;
const XK_HEAT = 0.11;

// ---------- 新增排放源任务 ----------
const XK_TASKS = {};
const XK_TASK_FACTOR = {};
const XK_SCOPE3_ENTRIES = {};
const workflowTasksBeforeXk = workflowTasks;
workflowTasks = function () {
  return workflowTasksBeforeXk().map(task=>{
    const x=XK_TASKS[task.id]||XK_TASK_FACTOR[task.id];
    if(!x)return task;
    const overridden=demo.factorOverrides?.[task.id];
    return {...task,factor:overridden?task.factor:x.factor,factorLabel:overridden?task.factorLabel:x.factorLabel,owner:x.owner||task.owner};
  });
};

// ---------- 初始数据 ----------
function xkPrepare() {
  if(demo.xkVersion===XK_VERSION&&demo.xk)return;
  demo.taskEntries ||= {};
  Object.entries(XK_TASKS).forEach(([id,x])=>{if(!demo.taskEntries[id])demo.taskEntries[id]={...x.entry};});
  Object.entries(XK_SCOPE3_ENTRIES).forEach(([id,entry])=>{if(!demo.taskEntries[id]||demo.taskEntries[id].status==="待填报")demo.taskEntries[id]={...entry};});
  demo.xk={
    template:"石油石化",
    idents:{},
    s3:{},
    dedup:{D1:"待确认",D2:"待确认",D3:"待确认",D4:"待确认"},
    dedupLog:[],
    cross:{
      "T-S1-01":{src:"燃料气计量月报",value:948200},
      "T-S1-02":{src:"天然气贸易交接结算单",value:42380},
      "T-S1-04":{src:"入炉煤皮带秤 + 库存变化",value:1638600},
      "T-S1-07":{src:"再生烟气在线分析（CEMS）反算",value:371900,note:"烟气量计量偏低 1.6%，以烧焦量月报为准",accepted:true},
      "T-S1-10":{src:"制氢原料流量计（DCS 历史数据）",value:224100},
      "T-S1-14":{src:"油田接收站计量",value:20310},
      "T-S2-01":{src:"电网结算单",value:1603400000},
      "T-S2-04":{src:"电网结算单",value:25700000},
      "T-S1-43":{src:"能源统计报表",value:183900},
      "T-S1-52":{src:"注入井口计量汇总",value:36850},
      "T-S2-10":{src:"厂内关口电表",value:11762000000},
      "T-S1-76":{src:"压气站自耗气月报",value:98600}
    },
    validityMonths:12,
    validity:{"SC-001":{from:"2026-08-05",to:"2027-08-04"},"SC-003":{from:"2025-11-01",to:"2026-10-31"}},
    renew:{},
    lca:{
      "LCA-GSL92-2026":{pcr:"PCR-01",
        assumptions:["原油按滨海石化 2026 年 1–10 月加工结构：自产 42%（松原、鄂南管输）、进口 58%（VLCC 海运至大连港）","炼厂共用燃料、蒸汽、电力和氢气按装置能量分配至汽油组分（催化汽油、重整汽油、烷基化油、MTBE）","外购电力采用全国电网平均排放因子 0.5703 kgCO₂/kWh","使用阶段按车用汽油完全燃烧，碳氧化率 98%","成品油经管道和铁路至油库，平均运距 620 km"],
        cutoffs:[["炼厂建设及设备制造","—","PCR 规定排除（资本品）"],["员工通勤","—","PCR 规定排除"],["添加剂（清净剂）","0.02%","质量占比 <1%"]],
        allocations:[["常减压蒸馏燃料","汽油、柴油、航煤等 9 种产品","按能量（热值）","装置物料平衡 2026-01 至 2026-10","24.6%"],["催化裂化烧焦","催化汽油、柴油、液化气","按能量（热值）","装置物料平衡","41.3%"],["制氢装置","加氢精制汽油组分","按氢耗","氢平衡月报","18.9%"],["蒸汽及电力","全厂产品","按装置能耗折算","能源管理系统","按装置"]],
        periods:[["原材料获取","2026-01 至 2026-10","上游企业实测 / 行业平均"],["生产制造","2026-01 至 2026-10","企业实测"],["运输配送","2026-01 至 2026-10","物流台账"],["使用维护","—","化学计量计算"],["回收处置","—","不适用"]]},
      "LCA-HDPE-2026":{pcr:"PCR-02",
        assumptions:["出厂边界，不含使用与废弃处置阶段","乙烯来自滨海石化 120 万 t/a 乙烯装置，按质量分配裂解炉燃料","1-丁烯共聚单体采用行业平均因子","电力因子采用全国电网平均排放因子 0.5703 kgCO₂/kWh"],
        cutoffs:[["抗氧剂、爽滑剂","0.15%","质量占比 <1%"],["包装膜袋","0.4%","质量占比 <1%"]],
        allocations:[["乙烯裂解炉燃料","乙烯、丙烯、裂解汽油等 7 种产品","按质量","裂解装置物料平衡","32.0%"],["聚乙烯装置用电","HDPE 3 个牌号","按产量","MES 产量统计","41.0%"]],
        periods:[["原材料获取","2026-01 至 2026-10","企业实测 / 行业平均"],["生产制造","2026-01 至 2026-10","企业实测"],["运输配送","2026-01 至 2026-10","物流台账"]]}
    },
    pcrs:[],
    docs:{},
    nc:[
      {id:"NC-2025-01",item:"3 月入炉煤元素碳检测样品缺少留样记录",clause:"发电设施核算指南 · 检测与留样",found:"2026-06-12",due:"2026-12-31",status:"整改中",action:""},
      {id:"NC-2025-02",item:"关口电表 E-RD-01 检定证书过期 12 天",clause:"计量器具检定",found:"2026-06-12",due:"2026-08-31",status:"已关闭",action:"2026-07-08 完成检定，证书 JL-2026-0711",closed:"2026-07-08"},
      {id:"NC-2025-03",item:"月度生产报表与 DCS 发电量差异 0.8%，未作说明",clause:"数据质量控制计划",found:"2026-06-13",due:"2026-09-30",status:"已关闭",action:"补充差异说明（抄表时点不同），修订月报模板",closed:"2026-08-20"}
    ]
  };
  demo.xkVersion=XK_VERSION;
  persistDemo();
}
const prepareWorkflowBeforeXk = prepareWorkflow;
prepareWorkflow = function () {
  prepareWorkflowBeforeXk();
  try {xkPrepare();} catch(error){console.error(error);}
};
function xk(){if(!demo.xk)xkPrepare();return demo.xk;}

// ---------- 能源输入输出 ----------
const XK_ENERGY = [
  {id:"E1",org:"滨海石化热电厂",dir:"输出",kind:"电力",qty:126000,unit:"MWh",to:"国网大连供电公司（上网电量）",ghg:"范围一全额计入，单独披露",cn:"范围一扣减",factor:XK_GRID*1000,fl:"全国电网平均排放因子"},
  {id:"E2",org:"滨海石化热电厂",dir:"输出",kind:"热力",qty:1450000,unit:"GJ",to:"大连长兴岛化工园区 6 家园区企业",ghg:"范围一全额计入，单独披露",cn:"范围一扣减",factor:XK_HEAT,fl:"热力缺省因子 0.11 tCO₂/GJ"},
  {id:"E3",org:"滨海石化热电厂",dir:"集团内部供应",kind:"电力",qty:2640000,unit:"MWh",to:"滨海石化分公司（厂内直供线）",ghg:"合并层面剔除受方范围二",cn:"合并层面剔除受方范围二",factor:XK_GRID*1000,fl:"全国电网平均排放因子",dedup:"D1"},
  {id:"E4",org:"滨海石化分公司",dir:"转供",kind:"电力",qty:42000,unit:"MWh",to:"园区配套企业 5 户（外购电转供）",ghg:"范围二扣减，计入范围三 C3",cn:"范围二扣减",factor:XK_GRID*1000,fl:"全国电网平均排放因子"},
  {id:"E5",org:"滨海石化热电厂",dir:"输入",kind:"电力",qty:25600,unit:"MWh",to:"厂用电下网（机组停运 / 启动期间自电网购入）",ghg:"范围二计入（自用，非转供）",cn:"范围二计入（自用，非转供）",factor:XK_GRID*1000,fl:"全国电网平均排放因子"}
];
const XK_C3 = {upstream:0.0000586,lossRate:0.05};
function xkApproved(id){const entry=demo.taskEntries?.[id];return entry&&entry.status==="通过"?Number(entry.activity)||0:0;}
function xkPurchasedKwh(){return PETRO_SOURCES.filter(s=>s.method==="elec").reduce((sum,s)=>sum+xkApproved(s.id),0);}

// ---------- 重复计算 ----------
function xkDedupItems() {
  const pipe=demo.records.find(row=>row.source_name==="无缝钢管及油套管");
  const pipeFactor=Number(demo.factors.find(f=>f.id===pipe?.factor_id)?.factor_value||2.05);
  const ship=demo.records.find(row=>row.source_name==="原油进口海运");
  const shipFactor=Number(demo.factors.find(f=>f.id===ship?.factor_id)?.factor_value||0.0000045);
  return [
    {id:"D1",rule:"R1",type:"集团内部能源互供",what:"滨海石化热电厂直供滨海石化分公司电量",a:"供方 · 滨海石化热电厂 范围一（燃煤热电联产）",b:"受方 · 滨海石化分公司 范围二（外购电力中含热电厂直供结算电量）",qty:310000000,unit:"kWh",factor:XK_GRID,scope:"2",cat:"S2",where:"范围二 · 外购电力"},
    {id:"D2",rule:"R1",type:"集团内部 CO₂ 转移",what:"滨海石化捕集 CO₂ 外供松原油田驱油",a:"供方 · 滨海石化分公司 CO₂ 回收扣减（T-S1-14）",b:"受方 · 松原油田 CCUS 注入量中含外购 CO₂，不得再次扣减",qty:6200,unit:"万Nm³",factor:-0.985*19.7,scope:"1",cat:"S1",where:"范围一 · CO₂ 回收（CCUS 驱油埋存）"},
    {id:"D3",rule:"R2",type:"采购台账与供应商明细重叠",what:"油套管采购台账中含渤海钢管 J55 油套管 130 万 t",a:"C01 · 无缝钢管及油套管（采购台账汇总）",b:"C01 · 渤海钢管制造有限公司 / J55 油套管（单独核算）",qty:1300000,unit:"t",factor:pipeFactor,scope:"3",cat:"C01",where:"范围三 C01 · 无缝钢管及油套管"},
    {id:"D4",rule:"R3",type:"因子边界含运输",what:"海联油运供应商因子为 VLCC 航次全程，C04 原油进口海运中同一航次运量",a:"SUP · 海联油运 / 进口原油 VLCC 海运（边界：装港至卸港全程）",b:"C04 · 原油进口海运 3,200 亿 t·km",qty:320000000000,unit:"t·km",factor:shipFactor,scope:"3",cat:"C04",where:"范围三 C04 · 原油进口海运"}
  ].map(item=>({...item,emission:item.qty*item.factor,status:xk().dedup[item.id]||"待确认"}));
}
function xkDedupRules() {
  const items=xkDedupItems();
  const lines=typeof procurementLines==="function"?procurementLines():[];
  const replaced=lines.filter(line=>line.sup&&line.tier===1).length;
  return [
    ["R1","集团内部能源互供 / CO₂ 转移","供方范围一与受方范围二同一能量；CO₂ 回收在供需双方重复扣减",items.filter(i=>i.rule==="R1").length],
    ["R2","采购台账与供应商明细重叠","同一物料同时以台账汇总和供应商明细计入",items.filter(i=>i.rule==="R2").length],
    ["R3","因子系统边界含运输","供应商 / 物料因子已含运输，C04 再计同一运量",items.filter(i=>i.rule==="R3").length],
    ["R4","同一采购行多级数据","一级数据存在时停用二、三级兜底","通过 · "+replaced+" 条采购行使用一级数据"],
    ["R5","绿电重复计排","绿电电量不再按电网因子计入范围二","通过"],
    ["R6","C3 与范围二口径","C3 线损及上游仅按外部购入电量计算","通过"],
    ["R7","转供电","转供电量从范围二扣减后计入 C3，不在两处重复","通过"]
  ];
}

// ---------- 核算调整 ----------
function xkAdjustRows(standardCode) {
  const rows=[];
  const base={org:demoOrg,period:demoPeriod,gwp_value:1};
  const push=(scope,cat,name,qty,unit,factor,quality,evidence)=>rows.push({...base,scope,category_code:cat,category_name:cat==="S1"?"范围一":cat==="S2"?"范围二":categoryName(cat),
    source_name:name,activity_value:qty,activity_unit:unit,factor_value:factor,emission_tco2e:qty*factor,quality,evidence,xk:true});
  const kwh=xkPurchasedKwh();
  if(xkApproved("T-S2-01")) {
    push("2","S2","转供园区配套企业电量（扣减）",-42000000,"kWh",XK_GRID,"一级 · 实测/票据","ELE-BH-2026-TEN");
    push("3","C03","转售外购电（转供园区配套企业）",42000000,"kWh",XK_GRID,"一级 · 实测/票据","ELE-BH-2026-TEN");
  }
  if(kwh) {
    push("3","C03","外购电力上游燃料链",kwh,"kWh",XK_C3.upstream,"二级 · 系统派生","ELE-ALL-2026");
    push("3","C03","外购电力输配电损耗（线损率 5%）",kwh*XK_C3.lossRate,"kWh",XK_GRID,"二级 · 系统派生","ELE-ALL-2026");
  }
  xkDedupItems().filter(item=>item.status==="已剔除").forEach(item=>
    push(item.scope,item.cat,"重复计算剔除 · "+item.what,-item.qty,item.unit,item.factor,"调整项",item.id));
  if(standardCode==="CN_GUIDELINE"&&xkApproved("T-S1-04")) {
    XK_ENERGY.filter(e=>e.dir==="输出").forEach(e=>push("1","S1","热电联产输出"+e.kind+"（扣减）",-e.qty*(e.unit==="MWh"?1000:1),e.unit==="MWh"?"kWh":e.unit,e.unit==="MWh"?XK_GRID:e.factor,"一级 · 实测/票据","CHP-OUT-2026"));
  }
  return rows;
}
function xkValidity(id) {
  const v=xk().validity[id];
  if(!v)return {label:"未设置",tone:"gray",days:null};
  const days=Math.ceil((new Date(v.to+"T23:59:59")-new Date(todayText()+"T00:00:00"))/86400000);
  return days<0?{...v,label:"已过期",tone:"bad",days}:days<=30?{...v,label:"即将到期",tone:"warn",days}:{...v,label:"有效",tone:"ok",days};
}
const XK_FALLBACK = {"SC-003":{factor:0.0000052,label:"原油油轮运输（VLCC）· 行业平均",id:"TR-133"},"SC-001":{factor:2.05,label:"无缝钢管 · 行业平均",id:"MT-109"}};
const demoCalculateBeforeXk = demoCalculate;
demoCalculate = function (standardCode,org,period) {
  const result=demoCalculateBeforeXk(standardCode,org,period);
  if(!demo.xk||!((!org||org===demoOrg)&&(!period||period===demoPeriod)))return result;
  supplyScope3Items.forEach(item=>{
    const valid=xkValidity(item.id);
    if(valid.label!=="已过期")return;
    const fb=XK_FALLBACK[item.id];if(!fb)return;
    result.detail.filter(row=>row.source_name===item.supplier+" / "+item.part).forEach(row=>{
      row.factor_value=fb.factor;row.emission_tco2e=Number(row.activity_value)*fb.factor;
      row.quality="二级 · 供应商因子已过期，按行业平均";row.expired=true;
    });
  });
  result.detail.push(...xkAdjustRows(standardCode));
  result.total_emission=result.detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  result.categories=[...new Set(result.detail.map(row=>row.category_code))].map(code=>{
    const amount=result.detail.filter(row=>row.category_code===code).reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {category_code:code,category_name:code==="S1"?"范围一":code==="S2"?"范围二":categoryName(code),emission_tco2e:amount,share:result.total_emission?+(amount/result.total_emission*100).toFixed(2):0};
  });
  return result;
};

// ---------- 通用 ----------
function xkTabs(key,tabs,active) {
  return '<div class="catTabs xkTabs">'+tabs.map(([id,label,count])=>'<button class="'+(active===id?'active':'')+'" onclick="xkSetTab(\''+key+'\',\''+id+'\')">'+label+(count!==undefined?' <em>'+count+'</em>':'')+'</button>').join("")+'</div>';
}
const XK_TAB = {source:"ledger",nat:"entity",lcaNote:"assume"};
function xkSetTab(key,id){XK_TAB[key]=id;render();}
function xkPanel(title,body,extra=""){return '<section class="panel"><div class="panelHead"><h3>'+title+'</h3>'+extra+'</div>'+body+'</section>';}
function xkTable(heads,rows,empty="暂无数据") {
  return '<div class="tableWrap"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+
    (rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+heads.length+'" class="emptyCell">'+empty+'</td></tr>')+'</tbody></table></div>';
}
function xkStatus(label,tone){return '<span class="status '+tone+'">'+label+'</span>';}
function xkManager(){return currentRole==="管理者";}
function xkNum(value,digits=0){return fmt(value,digits);}

// ---------- 排放源（台账 / 行业模板识别 / 范围三筛查） ----------
const XK_TEMPLATES = {
  "油气开采":{guide:"中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）",rows:[
    ["1","固定燃烧","加热炉、锅炉、注汽锅炉天然气","T-S1-43"],
    ["1","固定燃烧","加热炉自用原油","T-S1-44"],
    ["1","移动燃烧","作业机具、车辆柴油","T-S1-45"],
    ["1","火炬燃烧","伴生气火炬（CO₂ + 未完全燃烧 CH₄）","T-S1-46"],
    ["1","工艺放空","油井套管气放空","T-S1-47"],
    ["1","工艺放空","原油储罐呼吸及装车挥发 CH₄","",{status:"待确认",note:"联合站储罐 286 座，大罐抽气覆盖率待生产部门确认"}],
    ["1","设备逃逸","井口装置、联合站、接转站","T-S1-48"],
    ["1","工业过程","含 CO₂ 天然气酸性气体脱除","T-S1-51"],
    ["1","回收扣减","CO₂ 回收（CCUS 驱油埋存）","T-S1-52"],
    ["1","回收扣减","CH₄ 回收利用（套管气回收）","T-S1-53"],
    ["1","逸散排放","油田采出水处理 CH₄","",{status:"不适用",note:"采出水密闭回注，无厌氧处理单元"}],
    ["2","购入电力","机采井、注水泵、集输泵外购电力","T-S2-10"],
    ["3","C01","外购 CO₂ 驱油（集团内部供应，不重复扣减）","DEDUP"]]},

  "热电联产":{guide:"企业温室气体排放核算与报告指南 发电设施",rows:[
    ["1","固定燃烧","燃煤机组","T-S1-04"],
    ["1","固定燃烧","点火及助燃用油","",{status:"待确认",note:"2026 年启停 6 次，柴油用量待燃料部统计"}],
    ["1","工业过程","石灰石-石膏湿法脱硫","",{status:"待确认",note:"石灰石消耗量取自脱硫系统月报"}],
    ["1","输出扣减","上网电量、对外供热（国内口径范围一扣减）","ENERGY"],
    ["2","购入电力","厂用电下网（自用，非转供）","T-S2-04"],
    ["3","C03","集团内部直供电（合并层面剔除）","DEDUP"]]},

  "石油石化":{guide:"中国石油化工企业温室气体排放核算方法与报告指南（试行）",rows:[
    ["1","固定燃烧","加热炉、锅炉炼厂干气","T-S1-01"],
    ["1","固定燃烧","转化炉、加热炉天然气","T-S1-02"],
    ["1","固定燃烧","开工及备用燃料油","T-S1-03"],
    ["1","火炬燃烧","火炬气（正常工况）","T-S1-05"],
    ["1","火炬燃烧","火炬气（事故工况）","T-S1-06"],
    ["1","工业过程","催化裂化装置烧焦","T-S1-07"],
    ["1","工业过程","连续重整装置烧焦","T-S1-08"],
    ["1","工业过程","加氢装置催化剂间歇再生","T-S1-09"],
    ["1","工业过程","制氢装置原料转化 CO₂","T-S1-10"],
    ["1","工业过程","乙烯裂解炉管烧焦","T-S1-12"],
    ["1","工业过程","环氧乙烷 / 乙二醇","T-S1-13"],
    ["1","工业过程","延迟焦化 / 石油焦煅烧","",{status:"不适用",note:"滨海石化无焦化及煅烧装置（天山石化已纳入 T-S1-32）"}],
    ["1","固定燃烧","废气、废液焚烧炉","",{status:"待确认",note:"硫磺回收尾气焚烧炉 2 台，燃料气已计入 T-S1-01，需确认是否单独计量"}],
    ["1","回收扣减","CO₂ 回收利用（外供驱油）","T-S1-14"],
    ["1","输出扣减","热电厂上网电量、对外供热（国内口径范围一扣减）","ENERGY"],
    ["2","购入电力","外购电力","T-S2-01"],
    ["2","转供扣减","外购电转供园区配套企业（范围二扣减，计入 C3）","ENERGY"],
    ["3","C03","热电厂厂内直供电（合并层面剔除）","DEDUP"],
    ["3","C11","售出成品油及化工产品燃烧","",{status:"已纳入",note:"由销售板块按销量统一核算"}]]}
};
const XK_TEMPLATE_ORGS = {"油气开采":"松原油田分公司、鄂南油气田分公司、塔河油田分公司","热电联产":"滨海石化热电厂","石油石化":"滨海石化分公司、陇原石化分公司、天山石化分公司"};
function xkIdentRows(name) {
  const tpl=XK_TEMPLATES[name];
  const tasks=workflowTasks();
  return tpl.rows.map((r,i)=>{
    const key=name+"#"+i;
    const saved=xk().idents[key]||{};
    const task=r[3]&&r[3].startsWith("T-")?tasks.find(t=>t.id===r[3]):null;
    const created=saved.task?tasks.find(t=>t.id===saved.task):null;
    const def=r[4]||{};
    let status=saved.status||(task||r[3]==="ENERGY"||r[3]==="DEDUP"?"已纳入":def.status||"待确认");
    if(created)status="已纳入";
    return {key,i,scope:r[0],kind:r[1],name:r[2],link:created||task,special:r[3],status,note:saved.note??def.note??""};
  });
}
function xkSourceLedger() {
  const tasks=workflowTasks().filter(t=>t.scope!=="3"&&!t.locked);
  const kinds={};const modes={};
  PETRO_SOURCES.forEach(s=>{kinds[s.id]=s.kind;modes[s.id]=s.mode;});
  const rows=tasks.map(t=>{const entry=taskEntry(t);const x=XK_TASKS[t.id];
    return ['<strong>'+textHtml(t.name)+'</strong><small>'+t.id+'</small>','范围'+["","一","二"][t.scope],x?x.kind:kinds[t.id]||(t.created?"工业过程":"—"),textHtml(t.org),'<span class="srcCell">'+textHtml(t.factorLabel)+'</span>',x?x.mode:modes[t.id]||"任务填报",entryStatus(entry.status)];});
  XK_ENERGY.filter(e=>e.dir!=="输入").forEach(e=>rows.push(['<strong>'+textHtml(e.org+" · "+e.dir+e.kind)+'</strong><small>'+e.id+'</small>',e.dir==="转供"?"范围二":"范围一",e.dir==="集团内部供应"?"内部互供":e.dir==="转供"?"转供扣减":"输出扣减",textHtml(e.org),'<span class="srcCell">'+textHtml(e.fl)+'</span>',"能源转供台账",xkStatus("启用","ok")]));
  return xkPanel("排放源台账 <em>"+rows.length+"</em>",xkTable(["排放源","范围","类别","组织","默认因子","填报方式","状态"],rows),'<button class="linkBtn" onclick="go(\'组织碳排放\',\'盘查准备\',\'能源转供\')">能源转供 ›</button>');
}
function xkIdentPage() {
  const name=xk().template;
  const rows=xkIdentRows(name);
  const manager=xkManager();
  const count=s=>rows.filter(r=>r.status===s).length;
  const tone={"已纳入":"ok","待确认":"warn","不适用":"gray"};
  return '<div class="xkBar"><label>行业模板<select onchange="xkSetTemplate(this.value)">'+Object.keys(XK_TEMPLATES).map(k=>'<option '+(k===name?'selected':'')+'>'+k+'</option>').join("")+'</select></label>'+
      '<span>适用组织 <b>'+XK_TEMPLATE_ORGS[name]+'</b></span><span>核算指南 <b>'+textHtml(XK_TEMPLATES[name].guide)+'</b></span>'+
      '<span class="xkCounts">'+["已纳入","待确认","不适用"].map(s=>xkStatus(s+" "+count(s),tone[s])).join("")+'</span></div>'+
    xkPanel("潜在排放源识别清单",xkTable(["范围","类别","潜在排放源","识别结论","依据 / 说明","关联任务","操作"],rows.map(r=>[
      "范围"+["","一","二","三"][r.scope],textHtml(r.kind),'<strong>'+textHtml(r.name)+'</strong>',xkStatus(r.status,tone[r.status]),'<span class="srcCell">'+textHtml(r.note||"—")+'</span>',
      r.link?'<button class="linkBtn" onclick="openUnifiedTask(\''+r.link.id+'\')">'+r.link.id+'</button>':r.special==="ENERGY"?'<button class="linkBtn" onclick="go(\'组织碳排放\',\'盘查准备\',\'能源转供\')">能源转供</button>':r.special==="DEDUP"?'<button class="linkBtn" onclick="go(\'组织碳排放\',\'核算分析\',\'重复计算剔除\')">重复计算剔除</button>':'—',
      manager&&!r.link&&!r.special?'<button class="btn" onclick="xkOpenIdent(\''+r.key+'\')">判定</button>':''])));
}
function xkSetTemplate(value){xk().template=value;persistDemo();render();}
function xkOpenIdent(key) {
  const [name,i]=key.split("#");
  const r=xkIdentRows(name)[Number(i)];
  const canCreate=true;
  openModal('<h2>'+textHtml(r.name)+'</h2><div class="taskContext"><span>'+name+'</span><span>范围'+["","一","二","三"][r.scope]+'</span><span>'+textHtml(r.kind)+'</span></div>'+
    '<div class="modalForm"><label>识别结论<select id="xkIdentStatus"><option>待确认</option><option>已纳入</option><option>不适用</option></select></label>'+
    (canCreate?'<label>责任组织<select id="xkIdentOrg">'+PETRO_ENTITIES.map(e=>e.org).map(o=>'<option>'+o+'</option>').join("")+'</select></label>'+
      '<label>活动数据单位<input id="xkIdentUnit" value="'+(r.scope==="1"&&/SF₆|制冷/.test(r.name)?"kg":r.kind==="工业过程"?"t":"t")+'"></label>'+
      '<label>排放因子（tCO₂e/单位）<input id="xkIdentFactor" type="number" step="any" value="'+(/SF₆/.test(r.name)?"23.5":/石灰石/.test(r.name)?"0.44":/油/.test(r.name)?"3.0959":"")+'"></label>':'')+
    '<label class="wide">依据 / 说明<input id="xkIdentNote" value="'+textHtml(r.note||"")+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveIdent(\''+key+'\')">保存'+(canCreate?'（纳入时生成填报任务）':'')+'</button></div>');
  document.getElementById("xkIdentStatus").value=r.status;
}
function xkSaveIdent(key) {
  const status=document.getElementById("xkIdentStatus").value;
  const note=document.getElementById("xkIdentNote").value.trim();
  if(status==="不适用"&&!note){showToast("判定为不适用时请填写依据");return;}
  const saved={status,note};
  const [name,i]=key.split("#");
  const r=xkIdentRows(name)[Number(i)];
  if(status==="已纳入"&&document.getElementById("xkIdentOrg")) {
    const factor=Number(document.getElementById("xkIdentFactor").value);
    const unit=document.getElementById("xkIdentUnit").value.trim()||"t";
    if(!(factor>0)){showToast("纳入时请填写排放因子");return;}
    const id="T-S"+r.scope+"-N"+String(1+Object.keys(xk().created||{}).length).padStart(2,"0");
    xk().created ||= {};
    xk().created[id]={id,org:document.getElementById("xkIdentOrg").value,name:r.name.replace(/（.*?）/g,""),unit,factor,factorLabel:r.name+" · 识别清单新增",scope:r.scope};
    demo.taskEntries[id]={activity:"",evidence:"",status:"待填报"};
    saved.task=id;
    auditTask(id,"由排放源识别清单生成任务");
  }
  xk().idents[key]=saved;
  persistDemo();closeModal();render();
  showToast(saved.task?"已纳入并生成填报任务 "+saved.task:"识别结论已保存");
}
// 识别清单新增的任务并入统一任务
const workflowTasksBeforeXkCreated = workflowTasks;
workflowTasks = function () {
  const list=workflowTasksBeforeXkCreated();
  const created=Object.values(demo.xk?.created||{}).map(t=>({...t,scope:String(t.scope),category:"",owner:petroEntity(t.org)?.owner||"赵海峰",period:demoPeriod,deadline:"2026-12-15",origin:"企业填报",locked:false,created:true}));
  const index=list.findIndex(t=>t.scope==="3");
  return index<0?[...list,...created]:[...list.slice(0,index),...created,...list.slice(index)];
};

const XK_S3_DEFAULT = {
  C01:["纳入","外购原油、进口天然气、催化剂及化学助剂、油套管",[1,1,1,1]],C02:["纳入","工程建设与设备购置（支出法）",[1,0,0,1]],
  C03:["纳入","外购天然气上游、外购电上游燃料链及线损、转售外购电",[0,1,0,1]],C04:["纳入","原油进口海运、原油及成品油铁路运输",[1,1,1,1]],
  C05:["纳入","含油污泥、废催化剂等危废委外处置",[0,1,1,1]],C06:["纳入","差旅平台导入",[0,1,0,1]],C07:["纳入","在岗员工通勤问卷推算",[0,0,0,1]],
  C08:["纳入","承租社会油库及储罐（第三方运营，未计入范围一、二）",[0,0,1,1]],C09:["纳入","成品油二次配送（承运商）",[1,1,1,1]],
  C10:["纳入","合成树脂、合成纤维原料等中间品下游加工",[1,0,1,1]],C11:["纳入","售出成品油、天然气、液化石油气燃烧，占范围三 90% 以上",[1,1,1,1]],
  C12:["纳入","售出合成树脂废弃焚烧及填埋",[0,1,1,1]],C13:["纳入","对外出租油库及码头",[0,0,0,1]],
  C14:["纳入","品牌加盟加油站",[0,1,1,1]],C15:["纳入","联营及合营企业按持股比例",[1,0,1,1]]
};
function xkScope3Rows() {
  const detail=approvedDetail();
  return demo.categories.map(c=>{
    const saved=xk().s3[c.code]||{};
    const d=XK_S3_DEFAULT[c.code]||["待确认","",[0,0,0,0]];
    const amount=detail.filter(r=>r.category_code===c.code).reduce((s,r)=>s+r.emission_tco2e,0);
    const tasks=workflowTasks().filter(t=>t.category===c.code);
    return {code:c.code,name:c.name,decision:saved.decision||d[0],reason:saved.reason??d[1],flags:d[2],amount,tasks};
  });
}
function xkScope3Page() {
  const rows=xkScope3Rows();
  const total=rows.reduce((s,r)=>s+r.amount,0);
  const flag=v=>v?'<i class="xkDot on">●</i>':'<i class="xkDot">○</i>';
  return xkPanel("范围三类别筛查",xkTable(["类别","规模","影响力","风险 / 机遇","利益相关方","结论","依据","已核算(tCO₂e)","任务",""],rows.map(r=>[
    '<strong>'+r.code+'</strong> '+textHtml(r.name),flag(r.flags[0]),flag(r.flags[1]),flag(r.flags[2]),flag(r.flags[3]),
    xkStatus(r.decision,r.decision==="纳入"?"ok":r.decision==="不适用"?"gray":"warn"),'<span class="srcCell">'+textHtml(r.reason||"—")+'</span>',
    r.amount?xkNum(r.amount,1)+'<small>'+(total?(r.amount/total*100).toFixed(1):0)+'%</small>':'—',
    r.tasks.length?r.tasks.length+' 项':'—',xkManager()?'<button class="btn" onclick="xkOpenS3(\''+r.code+'\')">调整</button>':''])),
    '<span class="muted small">纳入 '+rows.filter(r=>r.decision==="纳入").length+' 类 · 不适用 '+rows.filter(r=>r.decision==="不适用").length+' 类</span>');
}
function xkOpenS3(code) {
  const r=xkScope3Rows().find(x=>x.code===code);
  openModal('<h2>'+code+' '+textHtml(r.name)+'</h2><div class="modalForm"><label>结论<select id="xkS3Decision"><option>纳入</option><option>不适用</option><option>暂不纳入</option></select></label>'+
    '<label class="wide">依据<input id="xkS3Reason" value="'+textHtml(r.reason||"")+'"></label></div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveS3(\''+code+'\')">保存</button></div>');
  document.getElementById("xkS3Decision").value=r.decision;
}
async function xkSaveS3(code) {
  const decision=document.getElementById("xkS3Decision").value,reason=document.getElementById("xkS3Reason").value.trim();
  if(decision!=="纳入"&&!reason){showToast("请填写不纳入的依据");return;}
  xk().s3[code]={decision,reason};
  const id="T-S3-"+code;
  if(workflowTasks().some(t=>t.id===id)) {
    const entry=demo.taskEntries[id]||{activity:"",evidence:""};
    if(decision!=="纳入")demo.taskEntries[id]={...entry,status:"不适用",note:reason};
    else if(entry.status==="不适用")demo.taskEntries[id]={...entry,status:"待填报"};
    auditTask(id,"范围三筛查："+decision+(reason?"（"+reason+"）":""));
  }
  persistDemo();await loadBackendData();closeModal();render();showToast(code+" 已调整为「"+decision+"」");
}
function xkSourcePage() {
  const tab=XK_TAB.source;
  const tabs=[["ledger","排放源台账"],["ident","行业模板识别",xkIdentRows(xk().template).filter(r=>r.status==="待确认").length+" 待确认"],["s3","范围三筛查","15 类"]];
  return pageHead("排放源",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 盘查准备 / 排放源")+xkTabs("source",tabs,tab)+
    (tab==="ident"?xkIdentPage():tab==="s3"?xkScope3Page():xkSourceLedger());
}

// ---------- 能源转供 ----------
function xkEnergyPage() {
  const std=backendState.standard;
  const cn=std==="CN_GUIDELINE";
  const t=e=>e.qty*e.factor;
  const out=XK_ENERGY.filter(e=>e.dir==="输出");
  const kwh=xkPurchasedKwh();
  const c3=[["外购电力上游燃料链",kwh,"kWh",XK_C3.upstream*1000,"kgCO₂e/kWh · 行业平均"],["外购电力输配电损耗",kwh*XK_C3.lossRate,"kWh",XK_GRID*1000,"线损率 5% × 全国电网平均排放因子"],["转售外购电（转供园区配套企业）",42000000,"kWh",XK_GRID*1000,"全国电网平均排放因子"]];
  return pageHead("能源转供",'<label class="inlineSelect">核算口径 <select onchange="changeStandard(this.value)">'+optionList(demo.standards,"code","name",std)+'</select></label>',"组织碳排放 / 盘查准备 / 能源转供")+
    '<div class="statRow">'+statTile("对外输出电力",xkNum(out[0].qty)+" MWh",cn?"范围一扣减 "+xkNum(t(out[0]))+" t":"单独披露 "+xkNum(t(out[0]))+" t")+
      statTile("对外输出热力",xkNum(out[1].qty)+" GJ",cn?"范围一扣减 "+xkNum(t(out[1]))+" t":"单独披露 "+xkNum(t(out[1]))+" t")+
      statTile("集团内部直供",xkNum(2640000)+" MWh",'重复计算 '+xkStatus(xk().dedup.D1,xk().dedup.D1==="已剔除"?"ok":"warn"),"go('组织碳排放','核算分析','重复计算剔除')")+
      statTile("外购电转供",xkNum(42000)+" MWh","范围二扣减 → C3 "+xkNum(42000*XK_GRID*1000)+" t")+'</div>'+
    xkPanel("能源输入输出台账",xkTable(["编号","主体","方向","能源","数量","对象","GHG Protocol / ISO 14064","国内企业核算指南","折算排放(tCO₂e)"],XK_ENERGY.map(e=>[
      e.id,textHtml(e.org),xkStatus(e.dir,e.dir==="输入"?"gray":e.dir==="转供"?"warn":"ok"),e.kind,xkNum(e.qty)+" "+e.unit,textHtml(e.to),
      '<span class="'+(!cn?'xkOn':'')+'">'+textHtml(e.ghg)+'</span>','<span class="'+(cn?'xkOn':'')+'">'+textHtml(e.cn)+'</span>',xkNum(t(e),1)])))+
    xkPanel("范围三 C3 燃料和能源相关活动（系统派生）",xkTable(["活动","数量","单位","因子","依据","排放(tCO₂e)"],c3.map(r=>[r[0],xkNum(r[1]),r[2],+r[3].toPrecision(4),'<span class="srcCell">'+r[4]+'</span>',xkNum(r[1]*r[3]/1000,1)])),
      '<button class="linkBtn" onclick="go(\'组织碳排放\',\'核算分析\',\'排放清单\')">排放清单 ›</button>');
}

// ---------- 重复计算剔除 ----------
function xkDedupPage() {
  const items=xkDedupItems();
  const done=items.filter(i=>i.status==="已剔除");
  const manager=xkManager();
  return pageHead("重复计算剔除",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 核算分析 / 重复计算剔除")+
    '<div class="statRow">'+statTile("检查规则",String(xkDedupRules().length),"条")+statTile("检出重复",String(items.length),"项")+
      statTile("待确认",String(items.filter(i=>i.status==="待确认").length),"项")+statTile("已剔除",xkNum(done.reduce((s,i)=>s+i.emission,0),1),"tCO₂e")+'</div>'+
    xkPanel("检出项",xkTable(["编号","重复内容","重复数据","重复量","剔除排放(tCO₂e)","状态","操作"],items.map(i=>[
      i.id,'<div class="xkWhat"><strong>'+textHtml(i.what)+'</strong><small>'+textHtml(i.type)+'</small></div>','<div class="xkAB"><span><em>A</em>'+textHtml(i.a)+'</span><span><em>B</em>'+textHtml(i.b)+'</span></div>',xkNum(i.qty)+" "+i.unit,'<b>'+xkNum(i.emission,1)+'</b><small>'+textHtml(i.where)+'</small>',
      xkStatus(i.status,i.status==="已剔除"?"ok":i.status==="不剔除"?"gray":"warn"),
      manager?(i.status==="待确认"?'<button class="btn primary" onclick="xkOpenDedup(\''+i.id+'\')">处理</button>':'<button class="btn" onclick="xkUndoDedup(\''+i.id+'\')">撤销</button>'):''])))+
    xkPanel("检查规则",xkTable(["规则","名称","检查内容","结果"],xkDedupRules().map(r=>[r[0],'<strong>'+r[1]+'</strong>',r[2],typeof r[3]==="number"?xkStatus("检出 "+r[3]+" 项",r[3]?"warn":"ok"):xkStatus(r[3],"ok")])))+
    (xk().dedupLog.length?xkPanel("处理记录",xkTable(["时间","编号","处理","说明","操作人"],xk().dedupLog.map(l=>[l.at,l.id,l.action,textHtml(l.note||"—"),l.by]))):"");
}
function xkOpenDedup(id) {
  const i=xkDedupItems().find(x=>x.id===id);
  openModal('<h2>'+textHtml(i.type)+'</h2><dl class="detailList"><div class="wide"><dt>重复内容</dt><dd>'+textHtml(i.what)+'</dd></div><div class="wide"><dt>数据 A</dt><dd>'+textHtml(i.a)+'</dd></div><div class="wide"><dt>数据 B</dt><dd>'+textHtml(i.b)+'</dd></div>'+
    '<div><dt>重复量</dt><dd>'+xkNum(i.qty)+' '+i.unit+'</dd></div><div><dt>剔除排放</dt><dd><b>'+xkNum(i.emission,1)+' tCO₂e</b></dd></div><div><dt>剔除位置</dt><dd>'+textHtml(i.where)+'</dd></div></dl>'+
    '<div class="modalForm"><label class="wide">说明<input id="xkDedupNote" placeholder="不剔除时必填"></label></div>'+
    '<div class="modalActions"><button class="btn" onclick="xkSaveDedup(\''+id+'\',false)">不剔除</button><button class="btn primary" onclick="xkSaveDedup(\''+id+'\',true)">确认剔除</button></div>');
}
async function xkSaveDedup(id,remove) {
  const note=document.getElementById("xkDedupNote").value.trim();
  if(!remove&&!note){showToast("不剔除时请填写说明");return;}
  xk().dedup[id]=remove?"已剔除":"不剔除";
  xk().dedupLog.unshift({at:nowText().slice(0,16),id,action:remove?"确认剔除":"不剔除",note,by:MANAGER_NAME});
  persistDemo();await loadBackendData();closeModal();render();showToast(remove?"已剔除，排放清单已更新":"已标记为不剔除");
}
async function xkUndoDedup(id) {
  xk().dedup[id]="待确认";
  xk().dedupLog.unshift({at:nowText().slice(0,16),id,action:"撤销",note:"",by:MANAGER_NAME});
  persistDemo();await loadBackendData();render();showToast("已撤销");
}

// ---------- 数据交叉核对 ----------
const XK_CROSS_META = {
  "T-S1-01":["燃料气流量计",2],"T-S1-02":["贸易交接计量",1],"T-S1-04":["入厂煤计量",1],"T-S1-07":["烧焦量月报",2],"T-S1-10":["原料计量",2],
  "T-S1-14":["外输 CO₂ 质量流量计",1],"T-S2-01":["关口电表",1],"T-S2-04":["关口电表",1],"T-S1-43":["采油厂计量间汇总",3],
  "T-S1-47":["单井套压测试推算",10],"T-S1-52":["注入站质量流量计",2],"T-S2-10":["电网结算单",1],"T-S1-76":["自耗气计量",2]
};
const XK_CROSS_SOURCES = ["DCS 历史数据","能源统计报表","贸易交接结算单","电网结算单","第三方检测报告","物料平衡月报","CEMS 在线监测","财务发票"];
function xkCrossRows() {
  return workflowTasks().filter(t=>XK_CROSS_META[t.id]).map(t=>{
    const entry=taskEntry(t);
    const meta=XK_CROSS_META[t.id];
    const c=xk().cross[t.id];
    const pri=Number(entry.activity)||0;
    const diff=c&&pri?(c.value-pri)/pri*100:null;
    let status="未核对",tone="gray";
    if(c&&diff!==null){
      if(Math.abs(diff)<=meta[1]){status="一致";tone="ok";}
      else if(c.accepted){status="已说明";tone="ok";}
      else {status="超阈值";tone="bad";}
    }
    return {task:t,entry,meta,c,pri,diff,status,tone};
  });
}
function xkCrossPage() {
  const rows=xkCrossRows();
  const n=s=>rows.filter(r=>r.status===s).length;
  return pageHead("数据交叉核对",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 核算分析 / 数据交叉核对")+
    '<div class="statRow">'+statTile("核对排放源",String(rows.length),"项")+statTile("一致",String(n("一致")+n("已说明")),"项 · 含已说明 "+n("已说明"))+
      statTile("超阈值",'<i class="bad" style="font-style:normal">'+n("超阈值")+'</i>',"项")+statTile("未核对",String(n("未核对")),"项")+'</div>'+
    xkPanel("主数据与核对数据",xkTable(["排放源","组织","主数据源","主数据","核对数据源","核对数据","差异","阈值","结论","说明",""],rows.map(r=>[
      '<strong>'+textHtml(r.task.name)+'</strong><small>'+r.task.id+'</small>',textHtml(r.task.org),r.meta[0],r.pri?xkNum(r.pri)+' '+textHtml(r.task.unit):'—',
      r.c?textHtml(r.c.src):'—',r.c?xkNum(r.c.value)+' '+textHtml(r.task.unit):'—',
      r.diff===null?'—':'<b class="'+(Math.abs(r.diff)<=r.meta[1]?'':'badText')+'">'+(r.diff>0?'+':'')+r.diff.toFixed(2)+'%</b>',
      '±'+r.meta[1]+'%',xkStatus(r.status,r.tone),'<span class="srcCell">'+textHtml(r.c?.note||"—")+'</span>',
      xkManager()?'<button class="btn '+(r.status==="超阈值"||r.status==="未核对"?'primary':'')+'" onclick="xkOpenCross(\''+r.task.id+'\')">'+(r.status==="超阈值"?"处理":r.c?"修改":"录入")+'</button>':''])));
}
function xkCrossBlock(taskId) {
  const r=xkCrossRows().find(x=>x.task.id===taskId);
  if(!r)return "";
  return '<div class="xkCross"><b>交叉核对</b><span>'+r.meta[0]+' '+(r.pri?xkNum(r.pri):'—')+'</span><span>'+(r.c?textHtml(r.c.src)+' '+xkNum(r.c.value):'未录入核对数据')+'</span>'+
    (r.diff!==null?'<span>差异 <b class="'+(r.tone==="bad"?'badText':'')+'">'+(r.diff>0?'+':'')+r.diff.toFixed(2)+'%</b> / 阈值 ±'+r.meta[1]+'%</span>':'')+xkStatus(r.status,r.tone)+
    (xkManager()?'<button class="linkBtn" onclick="xkOpenCross(\''+taskId+'\')">'+(r.c?'修改':'录入')+'核对数据</button>':'')+'</div>';
}
function xkOpenCross(id) {
  const r=xkCrossRows().find(x=>x.task.id===id);
  const c=r.c||{};
  const sources=[...new Set([c.src,...XK_CROSS_SOURCES].filter(Boolean))];
  openModal('<h2>'+textHtml(r.task.name)+' · 交叉核对</h2><div class="taskContext"><span>'+textHtml(r.task.org)+'</span><span>'+r.meta[0]+' '+(r.pri?xkNum(r.pri)+' '+textHtml(r.task.unit):'—')+'</span><span>阈值 ±'+r.meta[1]+'%</span></div>'+
    '<div class="modalForm"><label>核对数据源<select id="xkCrossSrc">'+sources.map(s=>'<option '+(s===c.src?'selected':'')+'>'+textHtml(s)+'</option>').join("")+'</select></label>'+
    '<label>核对数据（'+textHtml(r.task.unit)+'）<input id="xkCrossValue" type="number" step="any" value="'+(c.value??"")+'" oninput="xkCrossPreview('+r.pri+','+r.meta[1]+')"></label>'+
    '<label class="wide">差异说明<input id="xkCrossNote" value="'+textHtml(c.note||"")+'"></label></div><p class="calcPreview" id="xkCrossPreview"></p>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn" onclick="xkSaveCross(\''+id+'\',true)">接受差异</button><button class="btn primary" onclick="xkSaveCross(\''+id+'\',false)">保存</button></div>');
  xkCrossPreview(r.pri,r.meta[1]);
}
function xkCrossPreview(pri,thr) {
  const v=Number(document.getElementById("xkCrossValue").value);
  const el=document.getElementById("xkCrossPreview");
  if(!v||!pri){el.innerHTML="录入核对数据后自动计算差异";return;}
  const d=(v-pri)/pri*100;
  el.innerHTML='差异 <b class="'+(Math.abs(d)>thr?'badText':'okText')+'">'+(d>0?'+':'')+d.toFixed(2)+'%</b> · '+(Math.abs(d)>thr?'超过阈值，需说明差异原因':'在阈值范围内');
}
function xkSaveCross(id,accept) {
  const value=Number(document.getElementById("xkCrossValue").value);
  const note=document.getElementById("xkCrossNote").value.trim();
  if(!(value>0)){showToast("请填写核对数据");return;}
  if(accept&&!note){showToast("接受差异时请填写差异说明");return;}
  xk().cross[id]={src:document.getElementById("xkCrossSrc").value,value,note,accepted:accept,by:MANAGER_NAME,at:nowText().slice(0,16)};
  auditTask(id,"交叉核对："+xk().cross[id].src+" "+value+(accept?"，接受差异":""));
  persistDemo();closeModal();render();showToast(accept?"已接受差异并记录说明":"核对数据已保存");
}
const openUnifiedTaskBeforeXk = openUnifiedTask;
openUnifiedTask = function (id,review) {
  openUnifiedTaskBeforeXk(id,review);
  try {
    const block=xkCrossBlock(id);
    const actions=document.querySelector("#modalContent .modalActions");
    if(block&&actions)actions.insertAdjacentHTML("beforebegin",block);
  } catch(error){console.error(error);}
};

// ---------- 因子系统边界 ----------
function xkFactorBoundary(row) {
  const lib=FACTOR_LIBRARY.find(f=>f.id===row.id);
  const cat=lib?.category||"";
  const name=String(row.name||"");
  if(/GLEC/.test(String(row.source)))return ["油井到车轮（WTW）","含燃料上游"];
  if(cat==="固定燃烧"||cat==="移动源")return ["燃烧直接排放","不含燃料上游"];
  if(cat==="工业过程")return ["过程直接排放","—"];
  if(cat==="逸散 / GWP")return ["直接逸散","—"];
  if(cat==="电力")return ["发电侧","不含上游燃料链、线损"];
  if(cat==="热力")return ["生产侧","不含输送损耗"];
  if(cat==="原材料"||/钢|铜|铝|塑|树脂|纸/.test(name)&&!cat)return ["从摇篮到大门","含原料运输，不含出厂运输"];
  if(cat==="运输")return ["车轮到车轮（TTW）","不含燃料上游"];
  if(cat==="差旅通勤")return ["车轮到车轮（TTW）","不含燃料上游"];
  if(cat==="废弃物")return ["处置过程","不含收运"];
  if(cat==="支出法（EEIO）")return ["从摇篮到大门（产业链）","含上游运输"];
  return ["—","—"];
}
function xkDecorateFactorTable() {
  const content=document.getElementById("content");
  const table=[...content.querySelectorAll("table")].find(t=>/编号/.test(t.querySelector("th")?.textContent||"")&&/因子值/.test(t.querySelector("thead")?.textContent||""));
  if(!table||table.dataset.xk)return;
  table.dataset.xk="1";
  const heads=[...table.querySelectorAll("thead th")];
  const srcIndex=heads.findIndex(th=>th.textContent==="来源");
  if(srcIndex<0)return;
  heads[srcIndex].insertAdjacentHTML("beforebegin","<th>系统边界</th><th>运输 / 上游</th>");
  table.querySelectorAll("tbody tr").forEach(tr=>{
    const cells=tr.children;
    if(cells.length===1){cells[0].colSpan=(cells[0].colSpan||1)+2;return;}
    const id=cells[0].textContent.trim();
    const row=FACTOR_LIBRARY.find(f=>f.id===id);
    const [b,t]=row?xkFactorBoundary(row):["—","—"];
    cells[srcIndex].insertAdjacentHTML("beforebegin",'<td><span class="xkTag">'+b+'</span></td><td class="srcCell">'+t+'</td>');
  });
}
const openLibFactorBeforeXk = openLibFactor;
openLibFactor = function (id) {
  openLibFactorBeforeXk(id);
  const row=FACTOR_LIBRARY.find(f=>f.id===id);
  const list=document.querySelector("#modalContent .detailList");
  if(row&&list){const [b,t]=xkFactorBoundary(row);list.insertAdjacentHTML("beforeend",'<div><dt>系统边界</dt><dd>'+b+'</dd></div><div><dt>运输 / 上游</dt><dd>'+t+'</dd></div>');}
};
const matchFactorsBeforeXk = matchFactors;
matchFactors = function (task,limit) {
  return matchFactorsBeforeXk(task,limit).map(item=>{
    const [b]=xkFactorBoundary(item.row);
    if(b!=="—"&&!item.reasons.some(r=>r.startsWith("边界")))item.reasons.push("边界 "+b);
    return item;
  });
};

// ---------- 供应商因子有效期 ----------
const XK_SUP_BOUNDARY = {"SC-001":"从摇篮到大门","SC-002":"从摇篮到大门","SC-003":"装港至卸港全程（TTW）","SC-004":"从摇篮到大门"};
function xkSupplierFactorTable() {
  const rows=supplyScope3Items.map((row,index)=>({row,index})).filter(({row})=>demo.approvedSuppliers[row.id]);
  const months=xk().validityMonths;
  return '<div class="xkBar"><span>默认有效期 <select onchange="xkSetValidityMonths(this.value)">'+[6,12,24,36].map(m=>'<option value="'+m+'" '+(m===months?'selected':'')+'>'+m+' 个月</option>').join("")+'</select></span>'+
    '<span>到期前 30 天提醒，过期后按行业平均因子（二级）计算</span></div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>供应商 / 数据对象</th><th>单位碳排(kgCO₂e)</th><th>活动单位</th><th>系统边界</th><th>版本</th><th>有效期</th><th>状态</th><th>当前采用</th><th>操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(({row,index})=>{
      const approved=demo.approvedSuppliers[row.id];
      const versions=demo.supplierVersionHistory?.[row.id]||[];
      const v=xkValidity(row.id);
      const fb=XK_FALLBACK[row.id];
      const renew=xk().renew[row.id];
      const using=v.label==="已过期"&&fb?'<span class="badText">行业平均 '+(fb.factor*1000)+'</span><small>'+textHtml(fb.label)+'</small>':'供应商因子 '+approved.unitCarbon;
      return '<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(row.part)+'</small></td><td>'+approved.unitCarbon+'</td><td>'+textHtml(approved.unit)+'</td><td><span class="xkTag">'+(XK_SUP_BOUNDARY[row.id]||"—")+'</span></td><td>V'+(versions.length||1)+'</td>'+
        '<td>'+(v.from?v.from+' 至 '+v.to:'—')+(v.days!==null?'<small>'+(v.days<0?'已过期 '+(-v.days)+' 天':'剩余 '+v.days+' 天')+'</small>':'')+'</td><td>'+xkStatus(v.label,v.tone)+(renew?'<small>已发起更新 '+renew+'</small>':'')+'</td><td>'+using+'</td>'+
        '<td><button class="btn" onclick="showSupplierVersions('+index+')">历史版本</button> '+(xkManager()?'<button class="btn" onclick="xkOpenValidity(\''+row.id+'\')">有效期</button> '+(v.label!=="有效"&&!renew?'<button class="btn primary" onclick="xkRenew(\''+row.id+'\')">发起更新</button>':''):'')+'</td></tr>';
    }).join(""):'<tr><td colspan="9" class="emptyCell">暂无已批准数据</td></tr>')+'</tbody></table></div>';
}
function xkSetValidityMonths(value){xk().validityMonths=Number(value);persistDemo();render();showToast("新批准的供应商因子默认有效期为 "+value+" 个月");}
function xkOpenValidity(id) {
  const v=xk().validity[id]||{};
  const row=supplyScope3Items.find(r=>r.id===id);
  openModal('<h2>'+textHtml(row.supplier)+' · 有效期</h2><div class="modalForm"><label>生效日期<input id="xkVFrom" type="date" value="'+(v.from||todayText())+'"></label><label>失效日期<input id="xkVTo" type="date" value="'+(v.to||"")+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveValidity(\''+id+'\')">保存</button></div>');
}
async function xkSaveValidity(id) {
  const from=document.getElementById("xkVFrom").value,to=document.getElementById("xkVTo").value;
  if(!from||!to||to<from){showToast("请填写有效的起止日期");return;}
  xk().validity[id]={from,to};
  persistDemo();await loadBackendData();closeModal();render();showToast("有效期已更新，核算已重算");
}
function xkRenew(id) {
  const row=supplyScope3Items.find(r=>r.id===id);
  xk().renew[id]=todayText().slice(5);
  persistDemo();render();showToast("已向 "+row.supplier+" 发送数据更新请求");
}
// 新批准的供应商数据自动设置有效期
if(typeof reviewSupplierTask==="function") {
  const reviewSupplierTaskBeforeXk = reviewSupplierTask;
  reviewSupplierTask = async function (...args) {
    const result=await reviewSupplierTaskBeforeXk(...args);
    try {
      supplyScope3Items.forEach(item=>{
        if(demo.approvedSuppliers[item.id]&&!xk().validity[item.id]) {
          const from=todayText(),d=new Date(from+"T00:00:00");d.setMonth(d.getMonth()+xk().validityMonths);d.setDate(d.getDate()-1);
          xk().validity[item.id]={from,to:d.toISOString().slice(0,10)};
        }
      });
      persistDemo();
    } catch(error){console.error(error);}
    return result;
  };
}

// ---------- 产品碳足迹：系统边界、PCR、建模说明 ----------
const XK_BOUNDARIES = ["从摇篮到坟墓","从摇篮到大门","从大门到大门"];
const XK_PCR_BASE = [
  {id:"PCR-01",code:"Q/BCSY 018-2026",name:"车用汽油、柴油产品碳足迹核算规则",org:"企业 PCR",scope:"国 VI 车用汽油、车用柴油、航空煤油",unit:"1 t 出厂成品油（可选含燃烧使用）",boundary:"从摇篮到坟墓",valid:"2026-03-01 至 2029-02-28",status:"有效",match:/汽油|柴油|煤油/,
    req:[["功能单位","1 t 出厂成品油；含使用阶段时以 1 t 完全燃烧计"],["必选阶段","原油开采与运输、炼制、储运配送、燃烧使用"],["截断准则","单项 <1%，累计 <5%"],["分配规则","炼厂共用燃料、蒸汽、电力和氢气按装置能量（热值）分配"],["使用情景","完全燃烧，碳氧化率 98%"],["数据质量","原油上游优先采用油田实测；进口原油采用行业平均并注明来源国"]]},
  {id:"PCR-02",code:"Q/BCSY 019-2026",name:"聚烯烃树脂产品碳足迹核算规则",org:"企业 PCR",scope:"聚乙烯、聚丙烯树脂",unit:"1 t 出厂树脂",boundary:"从摇篮到大门",valid:"2026-03-01 至 2029-02-28",status:"有效",match:/聚乙烯|聚丙烯|树脂|HDPE|LLDPE|PP/,
    req:[["功能单位","1 t 出厂树脂"],["必选阶段","原料获取（含乙烯裂解）、聚合、造粒包装"],["截断准则","单项 <1%，累计 <5%"],["分配规则","乙烯裂解按质量分配"]]},
  {id:"PCR-03",code:"PCR 2019:13",name:"Basic chemicals（基础化学品）",org:"EPD International",scope:"乙烯、丙烯、芳烃等基础化学品",unit:"1 t 产品",boundary:"从摇篮到大门",valid:"现行",status:"有效",match:/乙烯|丙烯|芳烃|乙二醇/,
    req:[["系统边界","从摇篮到大门"],["分配","联产品按质量或经济价值分配"]]},
  {id:"PCR-04",code:"ISO 14067 + IPIECA",name:"天然气产品价值链碳排放指南",org:"IPIECA / OGCI",scope:"管道天然气、LNG",unit:"1 GJ 交付天然气",boundary:"从摇篮到大门",valid:"现行",status:"有效",match:/天然气|LNG/,
    req:[["系统边界","开采、处理、管输 / 液化至交付点"],["甲烷","须单列甲烷排放强度"]]},
  {id:"PCR-05",code:"GB/T 24067-2024",name:"温室气体 产品碳足迹 量化要求和指南",org:"国家标准",scope:"通用（无适用 PCR 时）",unit:"按研究目的确定",boundary:"按研究目的确定",valid:"现行",status:"有效",match:/./,
    req:[["用途","无适用 PCR 时作为通则"]]},
  {id:"PCR-06",code:"Q/BCSY 020（在编）",name:"润滑油产品碳足迹核算规则",org:"企业 PCR",scope:"内燃机油、工业润滑油",unit:"1 t 出厂润滑油",boundary:"从摇篮到大门",valid:"—",status:"编制中",match:/润滑油/,
    req:[["进度","2026-12 完成内部评审"]]}
];
function xkPcrs(){return [...XK_PCR_BASE,...(xk().pcrs||[]).map(p=>({...p,match:new RegExp(p.matchText||"$^")}))];}
function xkModelMeta(model){const all=xk().lca;return all[model.id]||(all[model.id]={pcr:"",assumptions:[],cutoffs:[],allocations:[],periods:lifecycleStages.map(s=>[s,model.period||"—","—"])});}
function xkPcrOf(model){return xkPcrs().find(p=>p.id===xkModelMeta(model).pcr);}
function xkOutbound(line){return line&&(line.outbound===true||/成品配送|出厂运输|至客户/.test(String(line.name||"")));}
const lineEmissionBeforeXk = lineEmission;
lineEmission = function (model,line) {
  if(model&&model.boundary!=="从摇篮到坟墓"&&xkOutbound(line))return 0;
  return lineEmissionBeforeXk(model,line);
};
function xkApplyBoundary(model,boundary) {
  model.boundary=boundary;
  model.stages.forEach((stage,index)=>{stage.enabled=boundary==="从摇篮到坟墓"?true:boundary==="从摇篮到大门"?index<3:index===1;});
}
function xkBoundaryTotal(model,boundary) {
  const copy=structuredClone(model);
  xkApplyBoundary(copy,boundary);
  return lcaTotal(copy);
}
function xkSetBoundary(boundary) {
  if(currentRole!=="管理者"){showToast("系统边界由管理者在模型设置中调整");return;}
  const model=activeLca();
  xkApplyBoundary(model,boundary);
  if(!model.stages[activeLcaStage]?.enabled)activeLcaStage=model.stages.findIndex(s=>s.enabled);
  persistDemo();render();showToast("系统边界已切换为「"+boundary+"」");
}
function xkLcaBar() {
  const model=activeLca();
  const pcr=xkPcrOf(model);
  const conflict=pcr&&pcr.boundary&&XK_BOUNDARIES.includes(pcr.boundary)&&pcr.boundary!==model.boundary;
  return '<div class="xkLcaBar"><div class="xkSeg">'+XK_BOUNDARIES.map(b=>'<button class="'+(model.boundary===b?'active':'')+'" onclick="xkSetBoundary(\''+b+'\')"><span>'+b+'</span><b>'+formatEmission(+xkBoundaryTotal(model,b).toFixed(2))+'</b><small>kgCO₂e</small></button>').join("")+'</div>'+
    '<div class="xkPcr"><span>PCR</span>'+(pcr?'<b>'+textHtml(pcr.code)+'</b><small>'+textHtml(pcr.name)+'</small>':'<b class="badText">未选择</b>')+
    (conflict?xkStatus("边界与 PCR 要求不一致","warn"):pcr?xkStatus("符合 PCR","ok"):'')+
    '<button class="linkBtn" onclick="xkOpenPcrPick()">'+(pcr?'更换':'选择')+'</button><button class="linkBtn" onclick="go(\'产品碳排放\',\'LCA建模与核算\',\'建模说明\')">建模说明 ›</button></div></div>';
}
function xkOpenPcrPick() {
  const model=activeLca();
  const list=xkPcrs().filter(p=>p.status!=="编制中");
  const current=xkModelMeta(model).pcr;
  openModal('<h2>'+textHtml(model.name)+' · 选择 PCR</h2>'+xkTable(["","编号","名称","适用范围","系统边界","匹配"],list.map(p=>[
    '<input type="radio" name="xkPcrPick" value="'+p.id+'" '+(p.id===current?'checked':'')+'>',textHtml(p.code),'<strong>'+textHtml(p.name)+'</strong><small>'+textHtml(p.org)+'</small>',textHtml(p.scope),textHtml(p.boundary),
    p.match.test(model.name)?(p.id==="PCR-05"?xkStatus("通则","gray"):xkStatus("适用","ok")):'—']))+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSavePcrPick()">确定</button></div>');
}
function xkSavePcrPick() {
  if(currentRole!=="管理者"){showToast("PCR 由管理者确定");return;}
  const picked=document.querySelector('input[name="xkPcrPick"]:checked');
  if(!picked){showToast("请选择 PCR");return;}
  const model=activeLca();
  xkModelMeta(model).pcr=picked.value;
  const pcr=xkPcrOf(model);
  if(pcr&&XK_BOUNDARIES.includes(pcr.boundary)&&pcr.boundary!==model.boundary)xkApplyBoundary(model,pcr.boundary);
  persistDemo();closeModal();render();showToast("已采用 "+pcr.code+"，系统边界按 PCR 设为「"+model.boundary+"」");
}
// 模型设置：先选 PCR，系统边界三选一
const editLcaModelBeforeXk = editLcaModel;
editLcaModel = function (create=false) {
  editLcaModelBeforeXk(create);
  const select=document.getElementById("lcaBoundary");
  if(!select||!lcaDraft)return;
  select.innerHTML=XK_BOUNDARIES.map(b=>'<option>'+b+'</option>').join("");
  select.value=XK_BOUNDARIES.includes(lcaDraft.boundary)?lcaDraft.boundary:"从摇篮到坟墓";
  select.onchange=event=>{
    const b=event.target.value;
    document.querySelectorAll("[data-lca-stage]").forEach(box=>{const i=Number(box.dataset.lcaStage);box.checked=b==="从摇篮到坟墓"?true:b==="从摇篮到大门"?i<3:i===1;});
  };
  const meta=create?{pcr:""}:xkModelMeta(lcaDraft);
  const form=document.querySelector("#modalContent .modalForm");
  form.insertAdjacentHTML("afterbegin",'<label class="wide">产品类别规则（PCR）<select id="xkModelPcr"><option value="">无适用 PCR，按 GB/T 24067 / ISO 14067 通则</option>'+
    xkPcrs().filter(p=>p.status!=="编制中"&&p.id!=="PCR-05").map(p=>'<option value="'+p.id+'" '+(p.id===meta.pcr?'selected':'')+'>'+textHtml(p.code+" · "+p.name)+'</option>').join("")+'</select></label>');
  document.getElementById("xkModelPcr").onchange=event=>{
    const pcr=xkPcrs().find(p=>p.id===event.target.value);
    if(pcr&&XK_BOUNDARIES.includes(pcr.boundary)){select.value=pcr.boundary;select.onchange({target:select});}
    const fu=document.querySelector('[data-lca-model="functionalUnit"]');
    if(pcr&&fu&&!fu.value)fu.value=pcr.unit;
  };
};
const saveLcaModelBeforeXk = saveLcaModel;
saveLcaModel = function () {
  const pcr=document.getElementById("xkModelPcr")?.value??"";
  const id=lcaDraft?.id;
  saveLcaModelBeforeXk();
  if(id&&demo.lcaModels.some(m=>m.id===id)) {
    const model=demo.lcaModels.find(m=>m.id===id);
    xkModelMeta(model).pcr=pcr;
    persistDemo();render();
  }
};

function xkPcrPage() {
  const list=xkPcrs();
  const models=demo.lcaModels;
  const catalog=typeof PRODUCT_CATALOG!=="undefined"?PRODUCT_CATALOG:[];
  const covered=catalog.filter(p=>list.some(x=>x.id!=="PCR-05"&&x.status==="有效"&&x.match.test(p[1]))).length;
  return pageHead("PCR 库",(xkManager()?'<button class="btn primary" onclick="xkOpenPcrNew()">新增 PCR</button>':''),"产品碳排放 / LCA建模与核算 / PCR 库")+
    '<div class="statRow">'+statTile("PCR",String(list.length),"项 · 有效 "+list.filter(p=>p.status==="有效").length)+statTile("已关联模型",String(models.filter(m=>xkPcrOf(m)).length)+" / "+models.length,"个模型")+
      statTile("产品覆盖",covered+" / "+catalog.length,"个产品有适用 PCR")+statTile("编制中",String(list.filter(p=>p.status==="编制中").length),"项")+'</div>'+
    xkPanel("产品类别规则",xkTable(["编号","名称","发布机构","适用产品","功能 / 声明单位","系统边界","有效期","状态","关联模型",""],list.map(p=>{
      const used=models.filter(m=>xkModelMeta(m).pcr===p.id);
      return [textHtml(p.code),'<strong>'+textHtml(p.name)+'</strong>',textHtml(p.org),textHtml(p.scope),textHtml(p.unit),textHtml(p.boundary),textHtml(p.valid),xkStatus(p.status,p.status==="有效"?"ok":"warn"),
        used.length?used.map(m=>'<button class="linkBtn" onclick="selectLcaModel(\''+m.id+'\');go(\'产品碳排放\',\'LCA建模与核算\',\'模型库\')">'+textHtml(m.name)+'</button>').join(" "):'—',
        '<button class="btn" onclick="xkOpenPcr(\''+p.id+'\')">要求</button>'];})))+
    xkPanel("产品 PCR 适用性",xkTable(["产品编码","产品","类别","适用 PCR","建模状态"],catalog.map(p=>{
      const hit=list.filter(x=>x.id!=="PCR-05"&&x.match.test(p[1]));
      return [p[0],'<strong>'+textHtml(p[1])+'</strong>',textHtml(p[2]),hit.length?hit.map(x=>xkStatus(x.code,x.status==="有效"?"ok":"warn")).join(" "):xkStatus("无适用 PCR · 按 GB/T 24067","gray"),textHtml(p[5])];})));
}
function xkOpenPcr(id) {
  const p=xkPcrs().find(x=>x.id===id);
  openModal('<h2>'+textHtml(p.name)+'</h2><div class="taskContext"><span>'+textHtml(p.code)+'</span><span>'+textHtml(p.org)+'</span>'+xkStatus(p.status,p.status==="有效"?"ok":"warn")+'</div>'+
    '<dl class="detailList"><div class="wide"><dt>适用产品</dt><dd>'+textHtml(p.scope)+'</dd></div><div class="wide"><dt>功能 / 声明单位</dt><dd>'+textHtml(p.unit)+'</dd></div><div class="wide"><dt>系统边界</dt><dd>'+textHtml(p.boundary)+'</dd></div>'+
    (p.req||[]).map(r=>'<div class="wide"><dt>'+textHtml(r[0])+'</dt><dd>'+textHtml(r[1])+'</dd></div>').join("")+'</dl><div class="modalActions"><button class="btn" data-close-modal="1">关闭</button></div>');
}
function xkOpenPcrNew() {
  openModal('<h2>新增 PCR</h2><div class="modalForm"><label>编号<input id="xkPcrCode"></label><label>名称<input id="xkPcrName"></label><label>发布机构<input id="xkPcrOrg"></label>'+
    '<label>适用产品关键词<input id="xkPcrMatch" placeholder="如：汽油|柴油"></label><label>功能 / 声明单位<input id="xkPcrUnit"></label><label>系统边界<select id="xkPcrBoundary">'+XK_BOUNDARIES.map(b=>'<option>'+b+'</option>').join("")+'</select></label>'+
    '<label>有效期<input id="xkPcrValid" placeholder="2026-01-01 至 2028-12-31"></label></div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSavePcrNew()">保存</button></div>');
}
function xkSavePcrNew() {
  const v=id=>document.getElementById(id).value.trim();
  if(!v("xkPcrCode")||!v("xkPcrName")){showToast("请填写编号和名称");return;}
  xk().pcrs.push({id:"PCR-U"+Date.now(),code:v("xkPcrCode"),name:v("xkPcrName"),org:v("xkPcrOrg")||"—",scope:v("xkPcrMatch")||"—",matchText:v("xkPcrMatch"),unit:v("xkPcrUnit")||"—",boundary:v("xkPcrBoundary"),valid:v("xkPcrValid")||"—",status:"有效",req:[]});
  persistDemo();closeModal();render();showToast("PCR 已加入");
}
function xkNotePage() {
  const model=activeLca();
  const meta=xkModelMeta(model);
  const pcr=xkPcrOf(model);
  const tab=XK_TAB.lcaNote;
  const cutSum=meta.cutoffs.reduce((s,c)=>s+(parseFloat(c[1])||0),0);
  const manager=xkManager();
  const body=tab==="cutoff"?
      xkPanel("取舍（截断）",'<div class="xkBar"><span>准则 <b>'+textHtml(model.cutoff||"—")+'</b></span><span>累计截断 <b class="'+(cutSum>5?'badText':'okText')+'">'+cutSum.toFixed(2)+'%</b> / 上限 5%</span></div>'+
        xkTable(["排除项","质量 / 能耗占比","依据"],meta.cutoffs.map(c=>[textHtml(c[0]),textHtml(c[1]),textHtml(c[2])])),manager?'<button class="btn" onclick="xkOpenNoteEdit(\'cutoffs\')">编辑</button>':''):
    tab==="alloc"?
      xkPanel("分配方法",'<div class="xkBar"><span>模型默认 <b>'+textHtml(model.allocation||"—")+'</b></span></div>'+
        xkTable(["共用输入 / 输出","分配对象","方法","依据数据","本产品分摊比例"],meta.allocations.map(c=>c.map(textHtml))),manager?'<button class="btn" onclick="xkOpenNoteEdit(\'allocations\')">编辑</button>':''):
    tab==="period"?
      xkPanel("数据时间范围",xkTable(["生命周期阶段","数据期间","数据类型","纳入边界"],meta.periods.map((c,i)=>[textHtml(c[0]),textHtml(c[1]),textHtml(c[2]),model.stages[i]?(model.stages[i].enabled?xkStatus("纳入","ok"):xkStatus("边界外","gray")):'—'])),manager?'<button class="btn" onclick="xkOpenNoteEdit(\'periods\')">编辑</button>':''):
      xkPanel("建模假设",'<ol class="xkList">'+meta.assumptions.map(a=>'<li>'+textHtml(a)+'</li>').join("")+'</ol>',manager?'<button class="btn" onclick="xkOpenNoteEdit(\'assumptions\')">编辑</button>':'');
  return lcaHeading("建模说明")+
    '<div class="lcaMeta"><span>PCR <b>'+(pcr?textHtml(pcr.code):'未选择')+'</b></span><span>'+textHtml(model.boundary)+'</span><span>'+textHtml(model.functionalUnit)+'</span><span>数据期间 '+textHtml(model.period||"—")+'</span></div>'+
    xkTabs("lcaNote",[["assume","假设",meta.assumptions.length],["cutoff","取舍",meta.cutoffs.length],["alloc","分配",meta.allocations.length],["period","数据时间范围"]],tab)+body;
}
const XK_NOTE_FIELDS = {assumptions:["假设",1,"每行一条"],cutoffs:["取舍",3,"排除项 | 占比 | 依据"],allocations:["分配",5,"共用输入 | 分配对象 | 方法 | 依据数据 | 比例"],periods:["数据时间范围",3,"阶段 | 数据期间 | 数据类型"]};
function xkOpenNoteEdit(field) {
  const meta=xkModelMeta(activeLca());
  const f=XK_NOTE_FIELDS[field];
  const text=meta[field].map(r=>Array.isArray(r)?r.join(" | "):r).join("\n");
  openModal('<h2>编辑'+f[0]+'</h2><p class="desc">'+f[2]+'</p><textarea id="xkNoteText" class="xkTextarea" rows="9">'+textHtml(text)+'</textarea>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveNote(\''+field+'\')">保存</button></div>');
}
function xkSaveNote(field) {
  const f=XK_NOTE_FIELDS[field];
  const lines=document.getElementById("xkNoteText").value.split("\n").map(l=>l.trim()).filter(Boolean);
  const rows=f[1]===1?lines:lines.map(l=>{const parts=l.split("|").map(s=>s.trim());while(parts.length<f[1])parts.push("—");return parts.slice(0,f[1]);});
  xkModelMeta(activeLca())[field]=rows;
  persistDemo();closeModal();render();showToast(f[0]+"已保存，碳足迹报告同步更新");
}
// 碳足迹报告加入 PCR 与建模说明
if(typeof productReportHtml==="function") {
  const productReportHtmlBeforeXk = productReportHtml;
  productReportHtml = function (model,forDocument) {
    const html=productReportHtmlBeforeXk(model,forDocument);
    try {
      const meta=xkModelMeta(model);
      const pcr=xkPcrOf(model);
      const extra='<h3>产品类别规则（PCR）</h3>'+rTable(["项目","内容"],[["PCR",pcr?textHtml(pcr.code+" "+pcr.name):"无适用 PCR，按 GB/T 24067-2024 / ISO 14067:2018 通则"],["发布机构",pcr?textHtml(pcr.org):"—"],["PCR 要求边界",pcr?textHtml(pcr.boundary):"—"],["本研究边界",textHtml(model.boundary)]],"kv")+
        '<h3>建模假设</h3>'+rTable(["编号","假设"],meta.assumptions.map((a,i)=>["A"+(i+1),textHtml(a)]))+
        '<h3>取舍</h3>'+rTable(["排除项","占比","依据"],meta.cutoffs.map(c=>c.map(textHtml)))+
        '<h3>分配</h3>'+rTable(["共用输入 / 输出","分配对象","方法","依据数据","分摊比例"],meta.allocations.map(c=>c.map(textHtml)))+
        '<h3>数据时间范围</h3>'+rTable(["阶段","数据期间","数据类型"],meta.periods.map(c=>c.map(textHtml)));
      return html.replace('<h3>生命周期阶段</h3>',extra+'<h3>生命周期阶段</h3>');
    } catch(error){console.error(error);return html;}
  };
}

// ---------- 碳履约：国家核算口径、核查管理 ----------
function xkNationalRows() {
  const tasks=workflowTasks().filter(t=>t.org==="滨海石化分公司"&&t.petro);
  const rows=tasks.map(t=>{
    const entry=taskEntry(t);const qty=Number(entry.activity)||0;const src=petroSource(t.id);
    const cnF=petroCalc(src,entry.params,qty);const cn=cnF.co2+cnF.ch4*21;
    return {name:t.name,id:t.id,kind:PETRO_METHODS[src.method].label,qty,unit:t.unit,ent:qty*t.factor,cn,
      note:src.method==="elec"?"一致（净购入电力）":src.method==="rec"?"一致（回收量扣减）":"一致（"+PETRO_METHODS[src.method].formula+"）",status:entry.status};
  });
  rows.push({name:"外购电转供园区配套企业",id:"E4",kind:"净购入电力",qty:-42000000,unit:"kWh",ent:-42000000*XK_GRID,cn:-42000000*XK_GRID,note:"一致（净购入扣减）"});
  rows.push({name:"热电厂直供电量（报告主体外）",id:"E3",kind:"净购入电力",qty:0,unit:"kWh",ent:0,cn:310000000*XK_GRID,note:"国家口径按法人边界计入净购入电力；集团合并层面剔除"});
  return rows;
}
function xkNationalPage() {
  const tab=XK_TAB.nat;
  const rows=xkNationalRows();
  const ent=rows.reduce((s,r)=>s+r.ent,0),cn=rows.reduce((s,r)=>s+r.cn,0);
  const year=typeof etsFocusYear==="function"?etsFocusYear():2025;
  const verified=typeof etsCalc==="function"?etsCalc(year).verified:0;
  const chp2026=(Number(taskEntry({id:"T-S1-04"}).activity)||0)*(typeof etsCoalFactor==="function"?etsCoalFactor():2.0047);
  const threshold=26000;
  const entitySum=org=>workflowTasks().filter(t=>t.org===org&&t.petro).reduce((s,t)=>{const e=taskEntry(t);const src=petroSource(t.id);const c=petroCalc(src,e.params,Number(e.activity)||0);return s+c.co2+c.ch4*21;},0);
  const entities=[
    ["滨海石化热电厂","电力（热电联产）","企业温室气体排放核算与报告指南 发电设施",xkStatus("全国碳市场","ok"),xkNum(verified)+'<small>'+year+' 年度核查量</small>',xkNum(chp2026)+'<small>2026 年度（月度存证）</small>',"—",'<button class="linkBtn" onclick="go(\'碳履约\',\'履约工作台\')">履约工作台 ›</button>'],
    ["滨海石化分公司","石油化工（原油加工、乙烯）","中国石油化工企业温室气体排放核算方法与报告指南（试行）",xkStatus("年度排放报告 · 拟纳入","warn"),"—",xkNum(cn)+'<small>2026 年度（按当前填报）</small>',
      '<span class="badText">2.6 万 tCO₂e</span><small>已达 '+(cn/threshold*100).toFixed(0)+'%</small>','<button class="linkBtn" onclick="xkSetTab(\'nat\',\'recon\')">口径对照 ›</button>'],
    ...["陇原石化分公司","天山石化分公司"].map(org=>[org,"石油化工（原油加工、乙烯）","中国石油化工企业温室气体排放核算方法与报告指南（试行）",xkStatus("年度排放报告 · 拟纳入","warn"),"—",xkNum(entitySum(org))+'<small>2026 年度</small>','<span class="badText">2.6 万 tCO₂e</span>','<button class="linkBtn" onclick="go(\'组织碳排放\',\'核算分析\',\'行业核算明细\')">核算明细 ›</button>']),
    ...["松原油田分公司","鄂南油气田分公司","塔河油田分公司"].map(org=>[org,"石油天然气开采","中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）",xkStatus("年度排放报告","gray"),"—",xkNum(entitySum(org))+'<small>2026 年度 · CH₄ 按 GWP 21</small>','<span class="badText">2.6 万 tCO₂e</span>','<button class="linkBtn" onclick="go(\'组织碳排放\',\'核算分析\',\'行业核算明细\')">核算明细 ›</button>']),
    ["西部管道分公司","油气输送","中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）",xkStatus("年度排放报告","gray"),"—",xkNum(entitySum("西部管道分公司"))+'<small>2026 年度</small>','<span class="badText">2.6 万 tCO₂e</span>','<button class="linkBtn" onclick="go(\'组织碳排放\',\'核算分析\',\'行业核算明细\')">核算明细 ›</button>']
  ];
  const guides=[
    ["发电设施","企业温室气体排放核算与报告指南 发电设施","全国碳市场","化石燃料燃烧（元素碳实测）、购入电力","已内置"],
    ["钢铁","中国钢铁生产企业温室气体排放核算方法与报告指南（试行）","全国碳市场（2025 年纳入）","燃料燃烧、熔剂分解、电极、外购含碳原料、固碳产品","已内置"],
    ["水泥","中国水泥生产企业温室气体排放核算方法与报告指南（试行）","全国碳市场（2025 年纳入）","燃料燃烧、原料碳酸盐分解、生料有机碳","已内置"],
    ["铝冶炼","中国电解铝生产企业温室气体排放核算方法与报告指南（试行）","全国碳市场（2025 年纳入）","燃料燃烧、阳极消耗、阳极效应 PFCs","已内置"],
    ["石油化工","中国石油化工企业温室气体排放核算方法与报告指南（试行）","年度排放报告 · 拟纳入全国碳市场","燃料燃烧、火炬燃烧、催化裂化 / 重整烧焦、制氢、乙烯裂解、环氧乙烷、石油焦煅烧、氧化沥青、CO₂ 回收扣减、净购入电热","已内置 · 本企业适用"],
    ["石油天然气生产","中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）","年度排放报告","燃料燃烧、火炬燃烧、工艺放空、设备逃逸、酸性气体脱除、CO₂ / CH₄ 回收","已内置 · 本企业适用"],
    ["机械设备制造","机械设备制造企业温室气体排放核算方法与报告指南（试行）","未纳入 · 年度排放报告","燃料燃烧、CO₂ 保护焊、电气设备 SF₆ / HFCs / PFCs、净购入电热","已内置"],
    ["化工","中国化工生产企业温室气体排放核算方法与报告指南（试行）","未纳入 · 年度排放报告","燃料燃烧、工业过程、CO₂ 回收、净购入电热","可配置"]
  ];
  const body=tab==="recon"?
      xkPanel("滨海石化分公司：企业盘查口径 → 国家核算口径",xkTable(["排放源","类型","活动数据","企业盘查(tCO₂e)","国家口径(tCO₂e)","差异","说明"],rows.map(r=>[
        '<strong>'+textHtml(r.name)+'</strong><small>'+r.id+'</small>',r.kind,xkNum(r.qty)+" "+r.unit,xkNum(r.ent,1),xkNum(r.cn,1),'<b class="'+(Math.abs(r.cn-r.ent)>0.05?(r.cn>r.ent?'badText':'okText'):'')+'">'+(Math.abs(r.cn-r.ent)<0.05?'—':(r.cn>r.ent?'+':'')+xkNum(r.cn-r.ent,1))+'</b>','<span class="srcCell">'+textHtml(r.note)+'</span>']).concat([[
        '<strong>合计</strong>',"","",'<b>'+xkNum(ent,1)+'</b>','<b>'+xkNum(cn,1)+'</b>','<b>'+(cn>ent?'+':'')+xkNum(cn-ent,1)+'</b>',"国家口径 CH₄ GWP 取 21，按法人边界"]])))
    :tab==="guide"?
      xkPanel("行业核算指南",xkTable(["行业","指南","管理方式","核算内容","系统支持"],guides.map(g=>[g[0],textHtml(g[1]),xkStatus(g[2],/全国碳市场/.test(g[2])?"ok":"gray"),'<span class="srcCell">'+textHtml(g[3])+'</span>',xkStatus(g[4],/本企业/.test(g[4])?"ok":/已内置/.test(g[4])?"ok":"gray")])))
    :xkPanel("报告主体",xkTable(["报告主体","行业","适用指南","全国碳市场","核查排放(tCO₂)","本年度(tCO₂)","报送门槛","",""],entities.map(e=>[ '<strong>'+e[0]+'</strong>',e[1],'<span class="srcCell">'+textHtml(e[2])+'</span>',e[3],e[4],e[5],e[6],e[7]])));
  return pageHead("国家核算报告",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"碳履约 / 国家核算报告")+
    '<div class="statRow">'+statTile("发电设施 · 核查量",xkNum(verified),year+" 年度 tCO₂")+statTile("滨海石化 · 国家口径",xkNum(cn),"tCO₂ · 2026 年度")+
      statTile("滨海石化 · 企业盘查",xkNum(ent),"tCO₂e · 范围一、二")+statTile("年度报告主体",String(entities.length),"家 · 均超 2.6 万 tCO₂e")+'</div>'+
    xkTabs("nat",[["entity","报告主体"],["recon","口径对照"],["guide","行业核算指南",guides.length]],tab)+body;
}
const XK_DOCS = [
  ["监测计划（2026 年度备案版）","滨海石化热电厂","MP-BHP-2026","赵海峰"],
  ["排放设施及计量器具清单","滨海石化热电厂","FAC-BHP-2026","赵海峰"],
  ["燃煤入厂 / 入炉计量记录（1–12 月）","滨海石化热电厂","MRV","赵海峰"],
  ["煤质化验报告：元素碳含量（月度）","滨海石化热电厂","LAB-C","赵海峰"],
  ["煤质化验报告：低位发热量（月度）","滨海石化热电厂","LAB-NCV","赵海峰"],
  ["检测机构资质证明（CMA / CNAS）","滨海石化热电厂","QUAL-LAB-2026","赵海峰"],
  ["发电量、供热量生产月报","滨海石化热电厂","PRD-BHP","赵海峰"],
  ["上网 / 下网电量结算单","滨海石化热电厂","ELE-BHP","赵海峰"],
  ["供热结算单","滨海石化热电厂","HEAT-BHP","赵海峰"],
  ["计量器具检定 / 校准证书","滨海石化热电厂","CAL-BHP-2026","赵海峰"],
  ["数据质量控制计划及内部审核记录","滨海石化热电厂","DQ-BHP-2026","高文博"],
  ["年度排放报告（初稿）","滨海石化热电厂","RPT-BHP-2026","高文博"]
];
function xkDocStatus(i) {
  const saved=xk().docs[i];
  if(saved)return {status:"已归集",evidence:saved.evidence,at:saved.at};
  const monthly=[2,3,4,6,7,8];
  if(monthly.includes(i))return {status:"已归集",evidence:XK_DOCS[i][2]+"-2026-01~10",at:"2026-11-10",partial:"10 / 12 月"};
  if([0,1,5,9].includes(i))return {status:"已归集",evidence:XK_DOCS[i][2],at:"2026-03-15"};
  return {status:"待归集",evidence:"",at:""};
}
function xkVerifyPage() {
  const docs=XK_DOCS.map((d,i)=>({d,i,...xkDocStatus(i)}));
  const ready=docs.filter(d=>d.status==="已归集").length;
  const nc=xk().nc;
  const steps=[["监测计划备案","2026-03-15","done"],["月度数据存证","10 / 12 月","now"],["年度排放报告","截止 2027-03-31",""],["文件评审","",""],["现场核查","",""],["不符合项整改","",""],["核查报告","",""]];
  const manager=xkManager();
  return pageHead("核查管理",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"碳履约 / 核查管理")+
    '<div class="statRow">'+statTile("核查年度","2026","滨海石化热电厂")+statTile("核查资料",ready+" / "+docs.length,"已归集")+
      statTile("不符合项",String(nc.filter(n=>n.status!=="已关闭").length),"未关闭 · 共 "+nc.length)+statTile("数据交叉核对",xkCrossRows().filter(r=>r.status==="超阈值").length+" 项","超阈值","go('组织碳排放','核算分析','数据交叉核对')")+'</div>'+
    '<section class="panel"><div class="panelHead"><h3>2026 年度核查进度</h3></div><ol class="flowSteps">'+steps.map((s,i)=>'<li class="'+s[2]+'"><i>'+(s[2]==="done"?'✓':i+1)+'</i>'+s[0]+(s[1]?'<small> · '+s[1]+'</small>':'')+'</li>').join("")+'</ol></section>'+
    xkPanel("核查资料清单",xkTable(["资料","主体","凭证编号","负责人","状态","归集时间",""],docs.map(x=>[
      '<strong>'+textHtml(x.d[0])+'</strong>'+(x.partial?'<small>已归集 '+x.partial+'</small>':''),textHtml(x.d[1]),textHtml(x.evidence||"—"),x.d[3],xkStatus(x.status,x.status==="已归集"?(x.partial?"warn":"ok"):"bad"),x.at||"—",
      manager?'<button class="btn '+(x.status!=="已归集"?'primary':'')+'" onclick="xkOpenDoc('+x.i+')">'+(x.status==="已归集"?"更新":"归集")+'</button>':''])))+
    xkPanel("不符合项与整改（2025 年度核查）",xkTable(["编号","不符合项","条款","发现日期","整改期限","整改措施","状态",""],nc.map((n,i)=>[n.id,'<strong>'+textHtml(n.item)+'</strong>',textHtml(n.clause),n.found,n.due,'<span class="srcCell">'+textHtml(n.action||"—")+'</span>',
      xkStatus(n.status,n.status==="已关闭"?"ok":"warn")+(n.closed?'<small>'+n.closed+'</small>':''),manager&&n.status!=="已关闭"?'<button class="btn primary" onclick="xkOpenNc('+i+')">关闭</button>':''])));
}
function xkOpenDoc(i) {
  const d=XK_DOCS[i];
  openModal('<h2>'+textHtml(d[0])+'</h2><div class="modalForm"><label>凭证编号<input id="xkDocEv" value="'+textHtml(xkDocStatus(i).evidence||d[2]+"-2026")+'"></label><label>文件<input type="file" id="xkDocFile"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveDoc('+i+')">归集</button></div>');
}
function xkSaveDoc(i) {
  const evidence=document.getElementById("xkDocEv").value.trim();
  if(!evidence){showToast("请填写凭证编号");return;}
  const file=document.getElementById("xkDocFile").files[0];
  xk().docs[i]={evidence,at:todayText(),file:file?file.name:""};
  persistDemo();closeModal();render();showToast("已归集到 2026 年度核查资料");
}
function xkOpenNc(i) {
  const n=xk().nc[i];
  openModal('<h2>'+n.id+' · 关闭不符合项</h2><p class="desc">'+textHtml(n.item)+'</p><div class="modalForm"><label class="wide">整改措施<input id="xkNcAction" value="'+textHtml(n.action||"")+'"></label><label>整改凭证<input id="xkNcEv" placeholder="凭证编号"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="xkSaveNc('+i+')">关闭不符合项</button></div>');
}
function xkSaveNc(i) {
  const action=document.getElementById("xkNcAction").value.trim(),ev=document.getElementById("xkNcEv").value.trim();
  if(!action||!ev){showToast("请填写整改措施和整改凭证");return;}
  Object.assign(xk().nc[i],{action:action+"（"+ev+"）",status:"已关闭",closed:todayText()});
  persistDemo();closeModal();render();showToast("不符合项已关闭");
}

// ---------- 常见问题 ----------
if(typeof FAQ!=="undefined"&&Array.isArray(FAQ)) FAQ.push(
  ["核算","厂用电下网是转供电吗？","不是。厂用电下网是热电机组停运或启动期间自电网购入、供本厂自用的电量，计入范围二。外购电转供给园区配套企业的电量在「能源转供」单独登记，从范围二扣减并计入范围三 C3。"],
  ["核算","催化裂化烧焦为什么算工业过程排放？","按《中国石油化工企业温室气体排放核算方法与报告指南》，催化剂连续烧焦产生的 CO₂ 计入工业生产过程排放：烧焦量 × 焦炭含碳量 × 碳氧化率 × 44/12。烧焦量可由再生烟气量和组分反算，系统在「行业核算明细」中逐项展示参数。"],
  ["核算","CO₂ 回收外供油田驱油，两边都能扣减吗？","不能。回收量只在捕集方扣减一次（滨海石化 T-S1-14），油田注入的外购 CO₂ 不得再次扣减，系统在「重复计算剔除」规则 R1 中自动检出。"],
  ["核算","甲烷的 GWP 用多少？","切换核算口径即可：国内指南按 21，ISO 14064-1 按 28，GHG Protocol 按 IPCC AR6 的 27.9。工艺放空、设备逃逸和火炬未完全燃烧的 CH₄ 都按所选口径换算 CO₂e。"],
  ["核算","热电联产对外供电、供热怎么处理？","GHG Protocol / ISO 14064 口径下范围一全额计入，对外售出部分单独披露；国内企业核算指南口径下按输出量从范围一扣减。切换核算口径后排放清单自动按对应规则计算。"],
  ["核算","集团内部互供能源会重复计算吗？","「重复计算剔除」按规则自动检出集团内部能源互供、采购台账与供应商明细重叠、因子边界已含运输等情形，确认后在合并层面剔除并记录。"],
  ["因子","供应商因子过期了怎么办？","供应商因子按批准日起设置有效期（默认 12 个月）。到期前 30 天提醒，过期后自动改用行业平均因子（二级）计算，并可一键向供应商发起更新。"],
  ["产品","碳足迹建模前要做什么？","先在「PCR 库」确认有无适用的产品类别规则，模型设置中选择 PCR 后，系统边界和功能单位按 PCR 预置；假设、取舍、分配和数据时间范围在「建模说明」维护，并写入碳足迹报告。"]
);

// ---------- 菜单与页面 ----------
MENUS["组织碳排放"]["盘查准备"]=["核算边界","排放源","能源转供"];
MENUS["组织碳排放"]["核算分析"]=["排放清单","重复计算剔除","数据交叉核对","异常数据"];
MENUS["产品碳排放"]["LCA建模与核算"]=["模型库","PCR 库","建模说明","系统边界/算法说明"];
MENUS["碳履约"]["国家核算报告"]=[];
MENUS["碳履约"]["核查管理"]=[];

(function xkStyle(){
  const css='.xkTabs{margin-top:4px}.xkBar{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;background:#f7f9fa;border:1px solid #e4e7eb;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#52606d}'+
    '.xkBar b{color:#1f2933}.xkBar select{margin-left:6px;height:30px;border:1px solid #d9dee5;border-radius:6px;padding:0 8px;font:inherit}.xkBar label{display:flex;align-items:center;gap:6px}.xkCounts{display:flex;gap:6px;margin-left:auto}'+
    '.xkDot{font-style:normal;color:#cbd2d9}.xkDot.on{color:#26890d}.xkTag{display:inline-block;background:#eef6ea;color:#1d6b0a;border-radius:10px;padding:1px 8px;font-size:12px;white-space:nowrap}'+
    '.xkOn{font-weight:600;color:#1d6b0a}.xkLcaBar{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin:2px 0 14px}.xkSeg{display:flex;border:1px solid #d9dee5;border-radius:10px;overflow:hidden;background:#fff}'+
    '.xkSeg button{border:0;border-right:1px solid #e4e7eb;background:#fff;padding:7px 16px;font:inherit;cursor:pointer;text-align:left;display:flex;flex-direction:column;min-width:150px}.xkSeg button:last-child{border-right:0}'+
    '.xkSeg button span{font-size:12px;color:#7b8794}.xkSeg button b{font-size:15px;color:#1f2933}.xkSeg button small{font-size:11px;color:#9aa5b1}.xkSeg button.active{background:#e8f3e3;box-shadow:inset 0 -3px 0 #26890d}.xkSeg button.active span{color:#1d6b0a;font-weight:600}'+
    '.xkPcr{flex:1;min-width:300px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;border:1px solid #e4e7eb;border-radius:10px;padding:8px 14px;background:#fbfcfd;font-size:13px}.xkPcr>span:first-child{color:#7b8794}.xkPcr small{color:#7b8794}'+
    '.xkCross{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;border:1px dashed #c3d9b8;background:#f6fbf3;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:13px}.xkCross>b{color:#1d6b0a}'+
    '.xkList{margin:0;padding-left:22px;line-height:1.9}.xkTextarea{width:100%;box-sizing:border-box;border:1px solid #d9dee5;border-radius:8px;padding:10px;font:inherit;font-size:13px;line-height:1.7}'+
    '.inlineSelect{display:flex;align-items:center;gap:6px;font-size:13px}.inlineSelect select{height:34px;border:1px solid #d9dee5;border-radius:6px;padding:0 8px;font:inherit}'+
    '.panel .flowSteps small{color:#7b8794;font-weight:400}.xkWhat{min-width:220px}.xkWhat small{display:block;color:#7b8794;margin-top:2px}.xkAB{display:flex;flex-direction:column;gap:4px;min-width:250px;font-size:12px;color:#52606d}.xkAB em{font-style:normal;display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:4px;background:#e4e7eb;color:#3e4c59;font-size:11px;margin-right:6px}';
  document.head.insertAdjacentHTML("beforeend","<style>"+css+"</style>");
})();

const XK_PAGES = ["排放源","能源转供","重复计算剔除","数据交叉核对"];
const orgPreparationBeforeXk = orgPreparation;
orgPreparation = function () {return XK_PAGES.includes(state.page)?"":orgPreparationBeforeXk();};
const orgCalculationBeforeXk = orgCalculation;
orgCalculation = function () {return XK_PAGES.includes(state.page)?"":orgCalculationBeforeXk();};
const renderBeforeXk = render;
render = function () {
  renderBeforeXk();
  if(!backendState.ready||!demo.xk)return;
  const {top,group,page}=state;
  const content=document.getElementById("content");
  try {
    let html=null;
    if(top==="组织碳排放"&&page==="排放源")html=xkSourcePage();
    else if(top==="组织碳排放"&&page==="能源转供")html=xkEnergyPage();
    else if(top==="组织碳排放"&&page==="重复计算剔除")html=xkDedupPage();
    else if(top==="组织碳排放"&&page==="数据交叉核对")html=xkCrossPage();
    else if(top==="产品碳排放"&&page==="PCR 库")html=xkPcrPage();
    else if(top==="产品碳排放"&&page==="建模说明")html=xkNotePage();
    else if(top==="碳履约"&&group==="国家核算报告")html=xkNationalPage();
    else if(top==="碳履约"&&group==="核查管理")html=xkVerifyPage();
    if(html!==null)content.innerHTML=html;
    if(top==="产品碳排放"&&page==="模型库") {
      const meta=content.querySelector(".lcaMeta");
      if(meta)meta.insertAdjacentHTML("afterend",xkLcaBar());
      if(activeLca().boundary!=="从摇篮到坟墓")content.querySelectorAll("table tbody tr").forEach(tr=>{
        const cells=tr.children;
        if(cells.length>5&&xkOutbound({name:cells[0].textContent}))cells[5].innerHTML='0 '+xkStatus("边界外","gray");
      });
    }
    if(top==="基础配置"&&page==="公共因子库")xkDecorateFactorTable();
    if(top==="供应链碳排放"&&group==="供应链因子中心"&&currentRole==="管理者") {
      const first=content.querySelector(".taskTable");
      if(first)first.outerHTML=xkSupplierFactorTable();
    }
  } catch(error){console.error(error);}
};
