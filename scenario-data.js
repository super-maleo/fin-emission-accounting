function prepareScenarioData() {
  if (demo.scenarioVersion !== 2) {
    demo.standards.forEach(standard=>standard.adjustment=1);
    demo.factors.forEach(factor=>{
      if(factor.unit!=="t" && factor.unit!=="万元" && factor.factor_value>0.001) {
        factor.factor_value/=1000;
      }
      factor.reference="2026年度场景因子 · 仅用于演示";
    });
    const suppliers=[
      {id:"SC-001",task:"T-S3-C01",supplier:"苏州恒铸精密铸造",part:"HT250 泵体铸件",category:"C01",qty:1650,unit:"kg",unitCarbon:1.82,total:3.003,status:"已收集",sync:"已自动关联",evidence:"SUP-HT250-202610-018"},
      {id:"SC-002",task:"T-S3-C01",supplier:"无锡华导铜业",part:"电磁线铜材",category:"C01",qty:210,unit:"kg",unitCarbon:4.1,total:.861,status:"待审核",sync:"待审核后关联",evidence:"SUP-CU-202610-041"},
      {id:"SC-003",task:"T-S3-C04",supplier:"嘉兴联运物流",part:"原材料公路运输",category:"C04",qty:1064,unit:"t·km",unitCarbon:.092,total:.097888,status:"已收集",sync:"已自动关联",evidence:"LOG-IN-202610"},
      {id:"SC-004",task:"T-S3-C01",supplier:"常州鑫叠电机材料",part:"定转子电工钢",category:"C01",qty:620,unit:"kg",unitCarbon:2.15,total:1.333,status:"退回补充",sync:"未关联",evidence:"SUP-SI-202610-026"}
    ];
    supplyScope3Items.splice(0,supplyScope3Items.length,...suppliers);
    demo.supplierRows=suppliers;
    demo.scenarioVersion=2;
  }
  demo.lcaModels.forEach(model=>{
    model.stages.forEach(stage=>stage.lines.forEach(line=>{
      if(line.source.includes("估算"))line.quality="情景估算";
      else if(line.source.includes("供应商"))line.quality="供应商数据";
    }));
  });
}

const scenarioNames={
  "A100整机":"P150 循环水泵","A100 整机":"P150 循环水泵","P-A100":"P-P150",
  "A100":"P150","B200":"YE3-90L","标杆产品X":"P150 上年度设计",
  "供应商A":"苏州恒铸精密铸造","供应商B":"无锡华导铜业","供应商C":"常州鑫叠电机材料",
  "供应商D":"湖州成越包装","供应商E":"杭州联封密封件","供应商F":"嘉兴联运物流",
  "电池模组":"铸铁泵体","铝型材":"漆包铜线","塑料件":"定转子电工钢",
  "张三":"陈晓宁","李四":"周建华","王五":"沈嘉禾",
  "集团总部":"杭州总部","上海工厂":"嘉兴装配工厂","苏州基地":"湖州机加工基地",
  "德勤中国 / ESG管理部":"江南流体装备 / 可持续发展部"
};
function scenarioText(value) {
  let output=String(value);
  Object.entries(scenarioNames).forEach(([before,after])=>output=output.split(before).join(after));
  return output;
}

editDemoSupplier = function (index) {
  const row=supplyScope3Items[index];
  openModal('<h2>'+textHtml(row.supplier)+'</h2><p>'+textHtml(row.part)+' · '+row.task+'</p><div class="modalForm">'+
    '<label>活动量（'+textHtml(row.unit)+'）<input id="demoSupplierQuantity" type="number" min="0" step="any" value="'+row.qty+'"></label>'+
    '<label>单位碳排（kgCO₂e / '+textHtml(row.unit)+'）<input id="demoSupplierCarbon" type="number" min="0" step="any" value="'+row.unitCarbon+'"></label>'+
    '<label>凭证编号<input id="supplierEvidence" value="'+textHtml(row.evidence)+'"></label>'+
    '<label>因子来源<input id="supplierSource" value="'+textHtml(row.factorSource||"供应商工艺数据与材料清单估算")+'"></label>'+
    '<label>组织范围三类别<input value="'+textHtml(categoryName(row.category))+'" readonly></label>'+
    '<label>关联任务<input value="'+row.task+'" readonly></label>'+
    '</div><div class="modalActions"><button class="btn" onclick="saveScenarioSupplier('+index+',false)">提交待审核</button>'+
    '<button class="btn primary" onclick="saveScenarioSupplier('+index+',true)">审核通过并关联</button></div>');
};
async function saveScenarioSupplier(index,approved) {
  const evidence=document.getElementById("supplierEvidence").value.trim();
  const source=document.getElementById("supplierSource").value.trim();
  if(!evidence||!source){showToast("请填写凭证编号和因子来源");return;}
  supplyScope3Items[index].evidence=evidence;
  supplyScope3Items[index].factorSource=source;
  await saveDemoSupplier(index,approved);
}

productData = function () {
  const model=activeLca();
  if(state.page==="产品信息") {
    return lcaHeading("产品信息")+table("产品档案",["产品编码","产品名称","功能单位","数据期间","系统边界","操作"],
      demo.lcaModels.map(item=>[item.code,item.name,item.functionalUnit,item.period,item.boundary,
        '<button class="btn" onclick="activeLcaId=\''+item.id+'\';editLcaModel()">产品设置</button>']));
  }
  const materials=model.stages[0].lines;
  return lcaHeading(state.page)+table(state.page,["产品","物料 / 活动","批次用量","单位","单位碳排(kgCO₂e)","来源","凭证","操作"],
    materials.map((line,index)=>[model.code,line.name,line.quantity,line.unit,line.factor,line.source,line.evidence,
      '<button class="btn" onclick="activeLcaStage=0;editLcaLine('+index+')">编辑活动</button>']));
};

const baseProductReport = report;
report = function () {
  if(state.top!=="产品碳排放")return baseProductReport();
  const model=activeLca();
  if(state.page==="数据质量分析报告")return productAnalysisForReport(model);
  const totals=lcaTotals(model);
  const total=lcaTotal(model);
  return lcaHeading(state.page)+'<div class="lcaReport"><div class="coverLogo">Deloitte</div><h2>'+textHtml(model.name)+
    ' 碳足迹核算报告</h2><dl><dt>功能单位</dt><dd>'+textHtml(model.functionalUnit)+'</dd><dt>系统边界</dt><dd>'+model.boundary+
    '</dd><dt>参考流</dt><dd>'+model.referenceFlow+' '+model.flowUnit+'</dd><dt>批次产量</dt><dd>'+model.batchOutput+
    ' '+model.flowUnit+'</dd><dt>评价方法</dt><dd>'+model.standard+'</dd><dt>数据期间</dt><dd>'+model.period+
    '</dd><dt>碳足迹结果</dt><dd><b>'+formatEmission(total)+' kgCO₂e</b></dd><dt>排除项</dt><dd>'+textHtml(model.exclusions)+
    '</dd></dl></div>'+
    table("生命周期阶段结果",["阶段","kgCO₂e / 参考流","贡献率","活动数","操作"],totals.map((stage,index)=>
      [stage.name,formatEmission(stage.total),(total?stage.total/total*100:0).toFixed(2)+"%",model.stages[index].lines.length,
        '<button class="btn" onclick="showLcaStageDetail('+index+')">阶段明细</button>']))+
    '<div class="actions"><button class="btn primary" onclick="exportLca()">下载完整清单</button></div>';
};
function productAnalysisForReport(model) {
  const lines=model.stages.flatMap(stage=>stage.enabled?stage.lines:[]);
  const evidenced=lines.filter(line=>line.evidence&&line.source).length;
  const estimated=lines.filter(line=>line.quality==="情景估算").length;
  return lcaHeading("数据质量分析报告")+kpis([["活动清单",lines.length,"条"],
    ["有来源及凭证",evidenced+"/"+lines.length,"条"],["情景估算",estimated,"条"],
    ["数据期间",model.period,model.geography]])+
    table("数据质量追踪",["阶段","活动","来源类型","代表年份","地域","凭证","操作"],
      model.stages.flatMap((stage,stageIndex)=>stage.enabled?stage.lines.map((line,index)=>[stage.name,line.name,line.quality,line.year,line.region,line.evidence,
        '<button class="btn" onclick="activeLcaStage='+stageIndex+';editLcaLine('+index+')">复核数据</button>']):[]));
}

certification = function () {
  return lcaHeading("碳足迹认证管理")+
    table("认证准备",["产品","模型版本","核算活动数","清单文件","认证机构","状态","操作"],
      demo.lcaModels.map(model=>[model.name,model.version,model.stages.filter(stage=>stage.enabled).reduce((sum,stage)=>sum+stage.lines.length,0),
        model.code+"-LCA清单.csv","尚未委托","内部预评估",
        '<button class="btn" onclick="activeLcaId=\''+model.id+'\';exportLca()">准备核算清单</button>']));
};

productAnalysis = function () {
  if(state.page!=="数据质量评估清单")return productDash();
  const model=activeLca();
  return lcaHeading("数据质量评估")+table("数据质量清单",["阶段","活动","质量类型","年份","地域","数据来源","凭证","操作"],
    model.stages.flatMap((stage,stageIndex)=>stage.enabled?stage.lines.map((line,index)=>[
      stage.name,line.name,line.quality,line.year,line.region,line.source,line.evidence,
      '<button class="btn" onclick="activeLcaStage='+stageIndex+';editLcaLine('+index+')">维护数据</button>']):[]));
};

orgWorkbench = function () {
  if(!backendState.ready)return needsBackend();
  const calc=backendState.calculation;
  return header("")+kpis([["已采集范围三",formatEmission(calc.total_emission),"tCO₂e"],
    ["活动记录",calc.detail.length,"条纳入当前核算"],["供应商已关联",supplyScope3Items.filter(row=>row.status==="已收集").length,"条"],
    ["待供应商补充",supplyScope3Items.filter(row=>row.status!=="已收集").length,"条"]])+
    table("范围三类别汇总",["类别","排放量(tCO₂e)","贡献率","操作"],
      calc.categories.map(row=>[row.category_name,formatEmission(row.emission_tco2e),row.share+"%",
        '<button class="btn" onclick="showOrgCategory(\''+row.category_code+'\')">核算明细</button>']));
};
function showOrgCategory(code) {
  const rows=backendState.calculation.detail.filter(row=>row.category_code===code);
  openInfoModal(categoryName(code),rows.map(row=>scenarioText(row.source_name)+"\n活动量 "+row.activity_value+" "+row.activity_unit+
    "\n因子 "+row.factor_value+" tCO₂e / 活动单位\n结果 "+formatEmission(row.emission_tco2e)+" tCO₂e").join("\n\n"));
}

const domainRender = render;
render = function () {
  domainRender();
  const content=document.getElementById("content");
  content.querySelectorAll(".hero p,.entry p,.orgActionCard span,.footer,.head>.desc").forEach(element=>element.remove());
  const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
  const texts=[];
  while(walker.nextNode())texts.push(walker.currentNode);
  texts.forEach(node=>{if(node.parentElement.tagName!=="SCRIPT")node.textContent=scenarioText(node.textContent)});
  document.querySelector(".right .pill").textContent="江南流体装备 · 2026 年度场景";
  content.querySelectorAll(".bars,.donutWrap,.realSankey,.horizontalChart").forEach(chart=>{
    const controls=chart.previousElementSibling;
    if(controls?.classList.contains("chartControls"))controls.remove();
    chart.querySelectorAll(".bar,.hbarRow,.flowPath,.donut").forEach((element,index)=>{
      element.onclick=()=>showChartInventory(chart,index);
    });
  });
  content.querySelectorAll(".tabs button").forEach(button=>{
    if(button.getAttribute("onclick"))return;
    button.onclick=()=>{
      button.parentElement.querySelectorAll("button").forEach(item=>item.classList.toggle("active",item===button));
      showChartInventory(content.querySelector(".bars,.donutWrap,.realSankey")||content,0);
    };
  });
};

home = function () {
  if(!backendState.ready)return needsBackend();
  const model=activeLca();
  const supplierPending=supplyScope3Items.filter(row=>row.status!=="已收集");
  return '<div class="head"><h1>Deloitte 碳排放管理系统</h1></div>'+
    kpis([["范围三已采集排放",formatEmission(backendState.calculation.total_emission),"tCO₂e"],
      ["产品模型",demo.lcaModels.length,"个在库模型"],
      ["供应商待处理",supplierPending.length,"条收集任务"],
      ["已生成组织报告",demo.reports.length,"份"]])+
    '<div class="tabs"><button onclick="go(\'组织碳排放\',\'数据填报\',\'填报任务\')">组织填报</button><button onclick="go(\'产品碳排放\',\'LCA建模与核算\',\'模型库\')">LCA 建模</button>'+
    '<button onclick="go(\'供应链碳排放\',\'采购件碳排放填报\')">供应商收集</button></div>'+
    table("待处理任务",["任务编号","供应商","数据对象","凭证","状态","操作"],supplierPending.map((row,index)=>
      [row.task,row.supplier,row.part,row.evidence,row.status,
        '<button class="btn" onclick="editDemoSupplier('+supplyScope3Items.indexOf(row)+')">处理任务</button>']))+
    table("产品核算进度",["产品","模型版本","系统边界","已录入活动","碳足迹(kgCO₂e / 参考流)","操作"],demo.lcaModels.map(row=>
      [row.name,row.version,row.boundary,row.stages.filter(stage=>stage.enabled).reduce((sum,stage)=>sum+stage.lines.length,0),
        formatEmission(lcaTotal(row)),'<button class="btn" onclick="activeLcaId=\''+row.id+'\';go(\'产品碳排放\',\'LCA建模与核算\',\'模型库\')">进入模型</button>']));
};

supplierDash = function () {
  const accepted=supplyScope3Items.filter(row=>row.status==="已收集");
  const total=accepted.reduce((sum,row)=>sum+row.total,0);
  return header("")+kpis([["数据收集任务",supplyScope3Items.length,"条"],
    ["审核通过",accepted.length,"条自动关联"],
    ["待审核 / 补充",supplyScope3Items.length-accepted.length,"条"],
    ["已关联排放",formatEmission(total),"tCO₂e"]])+
    table("供应商数据台账",["供应商","数据对象","活动量","单位","kgCO₂e / 单位","总排放(tCO₂e)","范围三任务","收集状态","操作"],
      supplyScope3Items.map((row,index)=>[row.supplier,row.part,row.qty,row.unit,row.unitCarbon,formatEmission(row.total),row.task,row.status,
        '<button class="btn" onclick="editDemoSupplier('+index+')">查看 / 更新</button>']));
};

supplierMgmt = function () {
  return header("")+table("供应商档案",["供应商","采购品类","数据对象","凭证编号","收集状态","操作"],
    supplyScope3Items.map((row,index)=>[row.supplier,row.category==="C04"?"运输服务":"原材料",row.part,row.evidence,row.status,
      '<button class="btn" onclick="editDemoSupplier('+index+')">维护数据</button>']));
};
supplyFactor = function () {
  return header("")+table("供应商因子",["供应商","数据对象","kgCO₂e / 单位","活动单位","凭证编号","状态","操作"],
    supplyScope3Items.map((row,index)=>[row.supplier,row.part,row.unitCarbon,row.unit,row.evidence,row.status,
      '<button class="btn" onclick="editDemoSupplier('+index+')">维护因子</button>']));
};

orgCalculation = function () {
  if(!backendState.ready)return needsBackend();
  const calc=backendState.calculation;
  const standardControl='<div class="lcaMeta"><label>核算口径 <select onchange="changeStandard(this.value)">'+
    optionList(demo.standards,"code","name",backendState.standard)+'</select></label><span>已采集排放 <b>'+
    formatEmission(calc.total_emission)+' tCO₂e</b></span></div>';
  if(state.page==="异常数据") {
    return header("")+table("数据异常",["任务","供应商","数据对象","状态","待处理项","操作"],
      supplyScope3Items.flatMap((row,index)=>row.status!=="已收集"?[[row.task,row.supplier,row.part,row.status,
        row.status==="待审核"?"核对单位碳排和凭证":"补充因子来源与工艺边界",
        '<button class="btn" onclick="editDemoSupplier('+index+')">处理任务</button>']]:[]));
  }
  if(state.page==="类别分析")return header("")+standardControl+
    table("范围三类别贡献",["类别","tCO₂e","占比","操作"],calc.categories.map(row=>
      [row.category_name,formatEmission(row.emission_tco2e),row.share+"%",
        '<button class="btn" onclick="showOrgCategory(\''+row.category_code+'\')">核算明细</button>']));
  return header("")+standardControl+
    table("组织范围三排放清单",["排放源","类别","期间","活动数据","单位","因子(tCO₂e/单位)","GWP","排放(tCO₂e)","操作"],
      calc.detail.map(row=>[row.source_name,categoryName(row.category_code),row.period,row.activity_value,row.activity_unit,row.factor_value,
        row.gwp_value,formatEmission(row.emission_tco2e),
        '<button class="btn" onclick="showOrgCategory(\''+row.category_code+'\')">核算明细</button>']));
};

renderStandardReport = function () {
  if(!backendState.ready)return needsBackend();
  const calc=backendState.calculation;
  return header("")+'<div class="lcaMeta"><label>报告口径 <select onchange="changeStandard(this.value)">'+
    optionList(demo.standards,"code","name",backendState.standard)+'</select></label>'+
    '<button class="btn primary" onclick="generateScope3Report()">生成范围三报告</button></div>'+
    '<div class="lcaReport"><div class="coverLogo">Deloitte</div><h2>2026 年 7 月范围三采集清单</h2>'+
    '<p>江南流体装备 · '+textHtml(standardName(backendState.standard))+'</p><p>已采集排放 <b>'+
    formatEmission(calc.total_emission)+' tCO₂e</b> · '+calc.detail.length+' 条活动数据</p></div>'+
    table("类别汇总",["类别","tCO₂e","占比","操作"],calc.categories.map(row=>
      [row.category_name,formatEmission(row.emission_tco2e),row.share+"%",
        '<button class="btn" onclick="showOrgCategory(\''+row.category_code+'\')">核算明细</button>']))+
    table("报告记录",["编号","口径","期间","排放(tCO₂e)","生成时间","操作"],demo.reports.map(row=>
      [row.id,standardName(row.standard_code),row.period,formatEmission(row.total_emission),row.created_at,
        '<button class="btn" onclick="downloadOrgReport('+row.id+')">下载报告</button>']));
};
function downloadOrgReport(id) {
  const report=demo.reports.find(row=>row.id===id);
  const snapshot=JSON.parse(report.content_json);
  downloadLcaFile("江南流体装备 · 范围三报告\n"+standardName(report.standard_code)+"\n期间 "+report.period+
    "\n总排放 "+report.total_emission+" tCO₂e\n\n"+
    snapshot.detail.map(row=>scenarioText(row.source_name)+"\t"+row.activity_value+" "+row.activity_unit+
      "\t"+formatEmission(row.emission_tco2e)+" tCO₂e").join("\n"),
    "Scope3-"+report.id+".txt","text/plain");
}
function showChartInventory(chart,index) {
  const card=chart.closest(".card");
  const tableElement=card?.querySelector("table")||document.querySelector("#content table");
  if(tableElement?.tBodies[0]?.rows.length) {
    const rows=[...tableElement.tBodies[0].rows].slice(0,12).map(row=>row.innerText.replace(/查看|编辑|删除/g,"").trim()).join("\n\n");
    openInfoModal(card?.querySelector("h3")?.textContent||"数据明细",rows);
    return;
  }
  if(state.top==="产品碳排放") {showLcaStageDetail(index%5);return;}
  const rows=backendState.calculation?.detail||[];
  openInfoModal("核算活动明细",rows.map(row=>scenarioText(row.source_name)+" · "+row.activity_value+" "+row.activity_unit+
    " · "+formatEmission(row.emission_tco2e)+" tCO₂e").join("\n"));
}
