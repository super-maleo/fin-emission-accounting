const lifecycleStages = ["原材料获取","生产制造","运输配送","使用维护","回收处置"];
let activeLcaId = null;
let activeLcaStage = 0;

function lcaLine(name, quantity, unit, factor, source, evidence) {
  return {name, quantity, unit, factor, source, evidence, allocation:100, quality:"企业实测", year:2026, region:"中国"};
}
function makePumpModel() {
  return {
    id:"LCA-GSL92-2026", name:"92# 车用汽油（国VI B）", code:"GSL92-VIB", version:"1.0",
    owner:"炼化和新材料板块 · 产品碳足迹组", standard:"ISO 14067:2018", boundary:"从摇篮到坟墓",
    functionalUnit:"1 t 出厂车用汽油（国VI B）及其完全燃烧使用",
    referenceFlow:1, flowUnit:"t", batchOutput:1000, lifetime:1, annualHours:0,
    power:0, geography:"中国东北", period:"2026-01 至 2026-10",
    allocation:"能量分配（热值）", cutoff:"质量和能源单项低于 1%，累计不超过 5%",
    exclusions:"炼厂建设及设备制造、员工通勤。",
    status:"草稿", stages:[
      {name:lifecycleStages[0], enabled:true, lines:[
        lcaLine("自产原油开采（松原、鄂南油田，42%）",454,"t",152,"油田组织盘查分摊（吨油排放）","UP-CRUDE-2026"),
        lcaLine("进口原油开采及处理（58%）",627,"t",128,"行业平均（OPGEE 2023 中东轻质原油）","IMP-CRUDE-2026"),
        lcaLine("进口原油 VLCC 海运",5624000,"t·km",0.0042,"海联油运供应商声明","SHIP-VLCC-202610"),
        lcaLine("国产原油管道输送",318000,"t·km",0.0091,"管道企业能耗分摊","PL-CRUDE-2026")]},
      {name:lifecycleStages[1],enabled:true,lines:[
        lcaLine("炼厂干气燃烧（按能量分配）",58,"t",2892,"燃料气计量 + 组分分析","FG-BH-2026-10"),
        lcaLine("催化裂化烧焦（分配至汽油组分）",22.4,"t",3342,"烧焦量月报","FCC-BH-2026-10"),
        lcaLine("制氢装置（加氢精制氢耗）",3.6,"t",9480,"氢平衡月报 × 制氢装置排放强度","H2-BH-2026-10"),
        lcaLine("外购电力（装置能耗分摊）",58000,"kWh",0.5703,"能源管理系统","ELE-BH-2026-10"),
        lcaLine("热电厂蒸汽（装置能耗分摊）",820,"GJ",146,"自产蒸汽排放因子（热量法）","STM-BH-2026"),
        lcaLine("MTBE 调和组分（外购）",48,"t",1210,"供应商声明","SUP-MTBE-2026")]},
      {name:lifecycleStages[2],enabled:true,lines:[
        lcaLine("成品油管道及铁路至油库",620000,"t·km",0.0185,"物流台账 × 平均运距 620 km","LOG-OUT-202610"),
        lcaLine("油库至加油站二次配送",95000,"t·km",0.078,"承运商配送台账","LOG-DIST-202610"),
        lcaLine("加油站用电（按销量分摊）",18500,"kWh",0.5703,"销售企业电费","ELE-MK-2026")]},
      {name:lifecycleStages[3],enabled:true,lines:[
        lcaLine("汽油完全燃烧（NCV 43.07 GJ/t × CC 18.9 tC/TJ × OF 98%）",1000,"t",2925,"化学计量计算","USE-GSL92")]},
      {name:lifecycleStages[4],enabled:true,lines:[]}
    ], history:[]
  };
}

function prepareDomainData() {
  if (!demo.lcaModels) {
    const fuel = makePumpModel();
    const resin = structuredClone(fuel);
    Object.assign(resin,{id:"LCA-HDPE-2026",name:"高密度聚乙烯树脂 HDPE 5000S",code:"HDPE-5000S",
      boundary:"从摇篮到大门",functionalUnit:"1 t 出厂 HDPE 树脂",batchOutput:1000,allocation:"质量分配"});
    resin.stages.slice(2).forEach(stage=>stage.enabled=false);
    resin.stages[0].lines = [
      lcaLine("乙烯（滨海石化乙烯装置，按质量分配）",985,"t",1180,"乙烯装置盘查分摊","ETH-BH-2026"),
      lcaLine("1-丁烯共聚单体",28,"t",1450,"行业平均","MAT-C4-2026"),
      lcaLine("聚合催化剂及助剂",1.2,"t",5200,"华东催化剂有限公司声明","SUP-PE-CAT-2026")
    ];
    resin.stages[1].lines = [
      lcaLine("聚合及造粒用电",412000,"kWh",0.5703,"装置电表","ELE-PE-2026"),
      lcaLine("蒸汽",620,"GJ",146,"自产蒸汽排放因子","STM-PE-2026"),
      lcaLine("包装膜袋",4.2,"t",2600,"采购台账","PKG-PE-2026")
    ];
    resin.stages[2].lines = [lcaLine("铁路发运至客户",850000,"t·km",0.0185,"销售发运台账","LOG-PE-2026",)];
    resin.stages[2].lines.forEach(line=>line.outbound=true);
    demo.lcaModels = [fuel,resin];
  }
  activeLcaId ||= demo.lcaModels[0].id;
}
function activeLca() {
  return demo.lcaModels.find(model=>model.id===activeLcaId) || demo.lcaModels[0];
}
function lineEmission(model,line) {
  return Number(line.quantity) * Number(line.factor) * Number(line.allocation) / 100 / model.batchOutput * model.referenceFlow;
}
function lcaTotals(model) {
  return model.stages.map(stage=>({
    name:stage.name, enabled:stage.enabled,
    total:stage.enabled ? stage.lines.reduce((sum,line)=>sum+lineEmission(model,line),0) : 0
  }));
}
function lcaTotal(model) {
  return lcaTotals(model).reduce((sum,stage)=>sum+stage.total,0);
}
function lcaSelect() {
  return '<select aria-label="当前LCA模型" onchange="selectLcaModel(this.value)">' +
    demo.lcaModels.map(model=>'<option value="'+model.id+'" '+(model.id===activeLcaId?'selected':'')+'>'+textHtml(model.name)+'</option>').join("")+'</select>';
}
function selectLcaModel(id) {
  activeLcaId=id;
  activeLcaStage=0;
  render();
}
function lcaHeading(title) {
  return '<div class="breadcrumb">产品碳排放 / '+textHtml(state.group)+'</div><div class="head"><h1>'+title+
    '</h1><div class="actions">'+lcaSelect()+'<button class="btn" onclick="editLcaModel()">模型设置</button>'+
    '<button class="btn primary" onclick="editLcaModel(true)">新增 LCA 模型</button></div></div>';
}
function newLcaModel() {
  return {id:"LCA-"+Date.now(),name:"",code:"",version:"1.0",owner:"产品碳足迹组",
    standard:"ISO 14067:2018",boundary:"从摇篮到大门",functionalUnit:"",referenceFlow:1,flowUnit:"t",
    batchOutput:1000,lifetime:1,annualHours:0,power:0,geography:"中国东北",period:"2026-01 至 2026-10",
    allocation:"物理量分配",cutoff:"",exclusions:"",status:"草稿",
    stages:lifecycleStages.map(name=>({name,enabled:true,lines:[]})),history:[]};
}
let lcaDraft;
function editLcaModel(create=false) {
  lcaDraft=structuredClone(create?newLcaModel():activeLca());
  const fields=[
    ["name","模型名称","text"],["code","产品编码","text"],["functionalUnit","功能单位","text"],
    ["referenceFlow","参考流数量","number"],["flowUnit","参考流单位","text"],["batchOutput","清单对应批次产量","number"],
    ["owner","责任人 / 部门","text"],["period","数据采集期间","text"],["geography","地域范围","text"],
        ["cutoff","截断准则","text"],["exclusions","排除项与回收规则","text"]
  ];
  openModal('<h2>'+(create?'新增 LCA 模型':'模型设置')+'</h2><div class="modalForm">'+
    fields.map(([key,label,type])=>'<label>'+label+'<input data-lca-model="'+key+'" type="'+type+'" '+(type==="number"?'min="0" step="any"':'')+' value="'+textHtml(lcaDraft[key])+'"></label>').join("")+
    '<label>系统边界<select id="lcaBoundary"><option>从摇篮到坟墓</option><option>从摇篮到大门</option></select></label>'+
    '<label>分配方法<select id="lcaAllocation"><option>能量分配（热值）</option><option>质量分配</option><option>经济价值分配</option><option>无需分配</option></select></label>'+
    '<label>评价方法<select id="lcaStandard"><option>ISO 14067:2018</option><option>ISO 14040 / ISO 14044</option></select></label>'+
    '</div><div class="lcaBoundaryStages"><b>生命周期阶段</b>'+lifecycleStages.map((name,index)=>
    '<label><input type="checkbox" data-lca-stage="'+index+'" '+(lcaDraft.stages[index].enabled?'checked':'')+'> '+name+'</label>').join("")+
    '</div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveLcaModel()">保存并录入阶段数据</button></div>');
  document.getElementById("lcaBoundary").value=lcaDraft.boundary;
  document.getElementById("lcaAllocation").value=lcaDraft.allocation;
  document.getElementById("lcaStandard").value=lcaDraft.standard;
  document.getElementById("lcaBoundary").onchange=event=>{
    document.querySelectorAll("[data-lca-stage]").forEach(box=>{
      box.checked=event.target.value==="从摇篮到坟墓" || Number(box.dataset.lcaStage)<2;
    });
  };
}
function saveLcaModel() {
  const numeric=["referenceFlow","batchOutput","lifetime","annualHours","power"];
  document.querySelectorAll("[data-lca-model]").forEach(input=>{
    lcaDraft[input.dataset.lcaModel]=numeric.includes(input.dataset.lcaModel)?Number(input.value):input.value.trim();
  });
  if (!lcaDraft.name || !lcaDraft.code || !lcaDraft.functionalUnit || lcaDraft.batchOutput<=0 || lcaDraft.referenceFlow<=0 ||
      numeric.some(key=>!Number.isFinite(lcaDraft[key])||lcaDraft[key]<0)) {
    showToast("请填写模型名称、产品编码、功能单位及有效的参考流和批次产量");return;
  }
  lcaDraft.boundary=document.getElementById("lcaBoundary").value;
  lcaDraft.allocation=document.getElementById("lcaAllocation").value;
  lcaDraft.standard=document.getElementById("lcaStandard").value;
  const useLine=lcaDraft.stages[3].lines.find(line=>line.name.startsWith("运行用电"));
  if(useLine) {
    useLine.quantity=lcaDraft.batchOutput*lcaDraft.power*lcaDraft.annualHours*lcaDraft.lifetime;
    useLine.name="运行用电（"+lcaDraft.batchOutput+"台 × "+lcaDraft.power+"kW × "+lcaDraft.annualHours+"h × "+lcaDraft.lifetime+"年）";
  }
  document.querySelectorAll("[data-lca-stage]").forEach(box=>lcaDraft.stages[Number(box.dataset.lcaStage)].enabled=box.checked);
  if (!lcaDraft.stages.some(stage=>stage.enabled)) {showToast("请至少选择一个生命周期阶段");return;}
  const existing=demo.lcaModels.findIndex(model=>model.id===lcaDraft.id);
  if(existing>=0)demo.lcaModels[existing]=lcaDraft;else demo.lcaModels.push(lcaDraft);
  activeLcaId=lcaDraft.id;
  activeLcaStage=lcaDraft.stages.findIndex(stage=>stage.enabled);
  persistDemo();closeModal();go("产品碳排放","LCA建模与核算","模型库");
}

lca = function () {
  const model=activeLca();
  const stage=model.stages[activeLcaStage];
  const totals=lcaTotals(model);
  const total=lcaTotal(model);
  const stageTabs='<div class="lcaStageTabs">'+model.stages.map((item,index)=>'<button class="'+(index===activeLcaStage?'active':'')+
    '" onclick="activeLcaStage='+index+';render()">'+item.name+'<small>'+(!item.enabled?'边界外':formatEmission(totals[index].total)+' kgCO₂e')+'</small></button>').join("")+'</div>';
  const rows=stage.lines.map((line,index)=>[textHtml(line.name),line.quantity,line.unit,line.factor,line.allocation+"%",
    formatEmission(lineEmission(model,line)),textHtml(line.source),
    '<button class="btn" onclick="editLcaLine('+index+')">编辑活动</button> <button class="btn red" onclick="removeLcaLine('+index+')">删除活动</button>']);
  return lcaHeading("LCA 建模与清单")+
    '<div class="lcaMeta"><span>'+textHtml(model.functionalUnit)+'</span><span>'+model.boundary+'</span><span>清单批次 '+model.batchOutput+' '+textHtml(model.flowUnit)+'</span><span>总碳足迹 <b>'+formatEmission(total)+' kgCO₂e</b></span></div>'+
    stageTabs+'<div class="lcaStageHead"><h3>'+stage.name+'</h3><div class="actions">'+
    (stage.enabled?'<button class="btn primary" onclick="editLcaLine()">添加活动数据</button>':'<span>该阶段已排除在系统边界外</span>')+
    '<button class="helpIcon" title="核算口径" onclick="showLcaCalculation()">?</button></div></div>'+
    (stage.enabled?table("阶段清单",["活动 / 物料","批次用量","活动单位","kgCO₂e / 活动单位","分配比例","参考流排放(kgCO₂e)","数据来源","操作"],rows):"")+
    '<div class="lcaFooter"><button class="btn" onclick="recordLcaVersion()">保存核算快照</button><button class="btn" onclick="exportLca()">导出完整清单</button>'+
    '<button class="btn soft" onclick="go(\'产品碳排放\',\'产品碳足迹看板\')">查看核算结果</button></div>';
};
let lcaLineIndex;
function editLcaLine(index=-1) {
  lcaLineIndex=index;
  const model=activeLca();
  const line=index<0?lcaLine("",0,"kg",0,"",""):model.stages[activeLcaStage].lines[index];
  const fields=[["name","活动 / 物料名称","text"],["quantity","清单批次活动量","number"],["unit","活动单位","text"],
    ["factor","排放因子（kgCO₂e / 活动单位）","number"],["allocation","分配比例（%）","number"],
    ["source","数据 / 因子来源","text"],["evidence","凭证编号","text"],["year","代表年份","number"],["region","地域代表性","text"]];
  openModal('<h2>'+model.stages[activeLcaStage].name+' · 活动数据</h2><div class="modalForm">'+fields.map(([key,label,type])=>
    '<label>'+label+'<input data-lca-line="'+key+'" type="'+type+'" '+(type==="number"?'min="0" step="any"':'')+' value="'+textHtml(line[key])+'"></label>').join("")+
    '<label>数据质量<select id="lcaLineQuality"><option>企业实测</option><option>供应商数据</option><option>情景估算</option><option>数据库替代</option></select></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveLcaLine()">保存活动数据</button></div>');
  document.getElementById("lcaLineQuality").value=line.quality;
}
function saveLcaLine() {
  const line={};
  document.querySelectorAll("[data-lca-line]").forEach(input=>{
    line[input.dataset.lcaLine]=input.type==="number"?Number(input.value):input.value.trim();
  });
  if (!line.name || !line.unit || !line.source || !line.evidence ||
      ["quantity","factor","allocation","year"].some(key=>!Number.isFinite(line[key])||line[key]<0) ||
      line.allocation>100 || line.quantity===0 || line.allocation===0) {
    showToast("请填写活动量、单位、来源、凭证及 0–100% 范围内的分配比例");return;
  }
  line.quality=document.getElementById("lcaLineQuality").value;
  const lines=activeLca().stages[activeLcaStage].lines;
  if(lcaLineIndex<0)lines.push(line);else lines[lcaLineIndex]=line;
  persistDemo();closeModal();render();showToast("阶段数据已保存，核算结果已更新");
}
function removeLcaLine(index) {
  openModal('<h2>删除活动数据</h2><p>'+textHtml(activeLca().stages[activeLcaStage].lines[index].name)+
    '</p><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn red" onclick="confirmRemoveLcaLine('+index+')">确认删除活动</button></div>');
}
function confirmRemoveLcaLine(index) {
  activeLca().stages[activeLcaStage].lines.splice(index,1);
  persistDemo();closeModal();render();
}
function showLcaCalculation() {
  openInfoModal("核算口径","参考流碳排放 = 批次活动量 × 排放因子 × 分配比例 ÷ 批次产量 × 参考流数量。\n因子单位为 kgCO₂e / 活动单位，已经包含 GWP，不再重复相乘。\n功能单位："+activeLca().functionalUnit+"\n排除项："+activeLca().exclusions);
}
function recordLcaVersion() {
  const model=activeLca();
  model.history.push({at:new Date().toISOString(),stages:lcaTotals(model),total:lcaTotal(model)});
  persistDemo();showToast("已保存核算快照 "+model.history.length);
}
function exportLca() {
  const model=activeLca();
  const rows=[["模型",model.name],["功能单位",model.functionalUnit],["系统边界",model.boundary],["批次产量",model.batchOutput],
    ["阶段","活动","批次用量","单位","因子(kgCO₂e/单位)","分配比例(%)","参考流排放(kgCO₂e)","来源","凭证"]];
  model.stages.filter(stage=>stage.enabled).forEach(stage=>stage.lines.forEach(line=>rows.push(
    [stage.name,line.name,line.quantity,line.unit,line.factor,line.allocation,lineEmission(model,line),line.source,line.evidence])));
  downloadLcaFile(rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(",")).join("\n"),model.code+"-LCA清单.csv","text/csv");
}
function downloadLcaFile(content,name,type) {
  const link=document.createElement("a");
  link.href=URL.createObjectURL(new Blob(["\ufeff"+content],{type:type+";charset=utf-8"}));
  link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

productDash = function () {
  const model=activeLca();
  const totals=lcaTotals(model);
  const total=lcaTotal(model);
  const max=Math.max(...totals.map(stage=>stage.total),1);
  return lcaHeading("产品碳足迹")+
    kpis([["总碳足迹",formatEmission(total),"kgCO₂e / "+model.referenceFlow+" "+model.flowUnit],
      ["功能单位",model.referenceFlow+" "+model.flowUnit,model.name],
      ["清单活动",model.stages.filter(stage=>stage.enabled).reduce((sum,stage)=>sum+stage.lines.length,0),"条活动数据"],
      ["系统边界",model.boundary,model.allocation]])+
    '<div class="card"><div class="lcaStageHead"><h3>生命周期阶段贡献</h3><button class="btn" onclick="showLcaHistory()">核算历史</button></div>'+
    totals.map((stage,index)=>'<button class="lcaContribution" onclick="showLcaStageDetail('+index+')"><span>'+stage.name+'</span>'+
      '<span class="lcaTrack"><i style="width:'+stage.total/max*100+'%;background:'+["#86bc25","#008a7a","#2c6aa0","#d59326","#8b729c"][index]+'"></i></span>'+
      '<b>'+formatEmission(stage.total)+' kgCO₂e</b><span>'+(total?(stage.total/total*100).toFixed(2):"0")+'%</span></button>').join("")+'</div>'+
    table("核算清单",["生命周期阶段","参考流排放(kgCO₂e)","贡献率","边界状态","操作"],
      totals.map((stage,index)=>[stage.name,formatEmission(stage.total),(total?stage.total/total*100:0).toFixed(2)+"%",
        stage.enabled?"纳入":"排除",'<button class="btn" onclick="showLcaStageDetail('+index+')">阶段明细</button>']))+
    '<div class="actions"><button class="btn" onclick="exportLca()">导出清单</button><button class="btn primary" onclick="go(\'产品碳排放\',\'LCA建模与核算\',\'模型库\')">继续建模</button></div>';
};
function showLcaStageDetail(index) {
  const model=activeLca();
  const stage=model.stages[index];
  const rows=stage.lines.map(line=>'<tr><td>'+textHtml(line.name)+'</td><td>'+line.quantity+' '+textHtml(line.unit)+
    '</td><td>'+line.factor+'</td><td>'+formatEmission(lineEmission(model,line))+'</td><td>'+textHtml(line.evidence)+'</td></tr>').join("");
  openModal('<h2>'+stage.name+'</h2><p>'+textHtml(model.name)+' · 批次 '+model.batchOutput+' '+model.flowUnit+'</p>'+
    '<div class="tableWrap"><table><thead><tr><th>活动</th><th>批次用量</th><th>因子</th><th>kgCO₂e / 参考流</th><th>凭证</th></tr></thead><tbody>'+
    rows+'</tbody></table></div><div class="modalActions"><button class="btn primary" onclick="closeModal();activeLcaStage='+index+
    ';go(\'产品碳排放\',\'LCA建模与核算\',\'模型库\')">编辑阶段</button></div>');
}
function showLcaHistory() {
  const model=activeLca();
  if(!model.history.length){recordLcaVersion();}
  openInfoModal("核算历史",model.history.map((item,index)=>"快照 "+(index+1)+" · "+item.at+"\n"+
    item.stages.map(stage=>stage.name+" "+formatEmission(stage.total)+" kgCO₂e").join("\n")+"\n总计 "+formatEmission(item.total)+" kgCO₂e").join("\n\n"));
}

productAnalysis = productDash;
const legacyCreateModal = openCreateModal;
openCreateModal = function () {
  if(state.top==="产品碳排放")editLcaModel(true);
  else legacyCreateModal();
};
header = function () {
  return '<div class="breadcrumb">'+textHtml(state.top+" / "+state.group)+'</div><div class="head"><h1>'+textHtml(state.page)+
    '</h1><div class="actions"><button class="btn">查询</button><button class="btn">重置</button>'+
    '<button class="btn primary">新增/创建</button><button class="btn">导出</button></div></div>';
};
