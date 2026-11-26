// v12：产品碳排放。看板、LCA 建模（含 PCR 选择）、产品信息（BOM / 组分碳排放）、分析、报告（Word 版式）、认证管理。

const V12_STAGE_COLORS = ["#86BC25","#0F6E56","#2C6AA0","#B7791F","#6B4FA0"];
const V12_GWP = [["CO₂","二氧化碳",1],["CH₄（化石）","甲烷",29.8],["N₂O","氧化亚氮",273]];
const V12_LCA_STEPS = [["目标与范围","PCR · 功能单位 · 边界"],["清单分析","分阶段活动数据"],["影响评价","GWP100 特征化"],["结果解释","热点 · 敏感性 · 结论"]];

function v12Model(){return activeLca();}
function v12Kg(v,d){const a=Math.abs(v);return fmt(v,d??(a>=100?1:a>=1?2:4));}
function v12StageTotals(model){return lcaTotals(model);}
function v12ModelLines(model) {
  return model.stages.flatMap((s,si)=>s.enabled?s.lines.map((l,li)=>({...l,stage:s.name,si,li,emission:lineEmission(model,l)})):[]);
}
function v12GateTotal(model){return xkBoundaryTotal(model,"从摇篮到大门");}
function v12CatalogRow(model){return PRODUCT_CATALOG.find(p=>p[0]===model.code||p[6]===model.name);}
function v12Products() {
  const extra=(v12().products||[]);
  return [...PRODUCT_CATALOG.map(p=>({code:p[0],name:p[1],line:p[2],fu:p[3],sales:p[4],status:p[5],model:demo.lcaModels.find(m=>m.code===p[0]||m.name===p[6]),src:"ERP"})),
    ...extra.map(p=>({...p,model:demo.lcaModels.find(m=>m.code===p.code),src:p.src||"手工"}))].map(p=>{
      if(p.model&&p.status==="待建模")p.status="建模中";
      if(p.model&&p.model.status==="已发布")p.status="已发布";
      return p;
    });
}
function v12Certs() {
  const base=CERT_HISTORY.map(r=>({no:r[0],product:r[1],std:r[2],org:r[3],from:r[4],to:r[5],value:r[6],status:r[7],kind:r[0].startsWith("EPD")?"EPD 环境产品声明":r[0].startsWith("LCB")?"低碳产品认证":"产品碳足迹证书"}));
  return [...(v12().certs||[]),...base].map(c=>{
    if(c.status==="有效"&&c.to&&daysUntil(c.to)<0)c.status="已过期";
    c.expiring=c.status==="有效"&&c.to&&daysUntil(c.to)<=180;
    return c;
  });
}
// 气体分项：按活动类型（燃烧以 CO₂ 为主；原油开采含甲烷逸散与放空；运输含少量 N₂O）
function v12GasShare(line) {
  const n=String(line.name);
  if(/原油开采|开采及处理/.test(n))return [0.82,0.17,0.01];
  if(/天然气|乙烯/.test(n))return [0.93,0.065,0.005];
  if(/运|配送|管道|铁路/.test(n))return [0.985,0.002,0.013];
  if(/电力|用电/.test(n))return [0.991,0.003,0.006];
  if(/燃烧|烧焦|干气|蒸汽/.test(n))return [0.996,0.001,0.003];
  return [0.97,0.02,0.01];
}
function v12GasTotals(model) {
  const g=[0,0,0];
  v12ModelLines(model).forEach(l=>{const s=v12GasShare(l);s.forEach((x,i)=>g[i]+=l.emission*x);});
  return g;
}

// ================= 产品碳足迹看板 =================
function v12ModelSelect(handler="selectLcaModel") {
  return '<select class="v12Select" onchange="'+handler+'(this.value)">'+demo.lcaModels.map(m=>'<option value="'+m.id+'" '+(m.id===activeLca().id?'selected':'')+'>'+v12H(m.name)+'</option>').join("")+'</select>';
}
function v12CfpDash() {
  const model=v12Model(),totals=v12StageTotals(model),total=lcaTotal(model),gate=v12GateTotal(model);
  const pcr=xkPcrOf(model),cert=v12Certs().find(c=>c.status==="有效"&&model.name.startsWith(c.product.slice(0,6)));
  const products=v12Products(),published=products.filter(p=>p.status==="已发布").length,modeling=products.filter(p=>p.status==="建模中").length;
  const salesAll=products.reduce((s,p)=>s+(p.sales||0),0),salesCov=products.filter(p=>p.model).reduce((s,p)=>s+(p.sales||0),0);
  const lines=v12ModelLines(model).sort((a,b)=>b.emission-a.emission);
  const unit="kgCO₂e / "+model.referenceFlow+" "+model.flowUnit;
  const kpis='<div class="statRow">'+
    v12Kpi("产品碳足迹",v12Kg(total,1),unit+" · "+model.boundary)+
    v12Kpi("从摇篮到大门",v12Kg(gate,1),unit)+
    v12Kpi("PCR",pcr?v12H(pcr.code):'<span class="badText">未选择</span>',pcr?v12H(pcr.name):"建模第一步选择",'go(\'产品碳排放\',\'LCA建模与核算\')')+
    v12Kpi("认证",cert?'<span class="okText">有效</span>':'未认证',cert?v12H(cert.no+" · 至 "+cert.to):"可在认证管理上传证书","go('产品碳排放','碳足迹认证管理')")+'</div>';
  const portfolio=v12Panel("产品碳足迹覆盖",'<div class="v12Split">'+v12Pie([
      {label:"已发布",value:published,color:"#26890D",display:published+" 个"},{label:"建模中",value:modeling,color:"#B7791F",display:modeling+" 个"},{label:"待建模",value:products.length-published-modeling,color:"#D0D5DD",display:(products.length-published-modeling)+" 个"}],
      {size:180,center:[String(products.length),"个产品"]})+
    '<div class="v12Stat"><span>按销量覆盖</span><b>'+(salesAll?(salesCov/salesAll*100).toFixed(1):0)+'%</b><small>已建模产品年销量 '+v12Big(salesCov)+' t / 全部 '+v12Big(salesAll)+' t</small></div></div>',
    '<button class="linkBtn" onclick="go(\'产品碳排放\',\'产品信息\')">产品信息 ›</button>');
  const stagePie=v12Panel("生命周期阶段构成",v12Pie(totals.map((s,i)=>({label:s.name+(s.enabled?'':'（边界外）'),value:s.total,color:V12_STAGE_COLORS[i],display:v12Kg(s.total,1),action:"showLcaStageDetail("+i+")"})),{size:180,center:[v12Kg(total,0),"kgCO₂e"]}));
  const hot=v12Panel("排放热点 TOP 8",v12HBars(lines.slice(0,8).map((l,i)=>({rank:i+1,label:l.name,sub:l.stage,value:l.emission,display:v12Kg(l.emission,1),color:V12_STAGE_COLORS[l.si],action:"v12OpenLine("+l.si+","+l.li+")"})),{unit:" kg"}),
    '<button class="linkBtn" onclick="go(\'产品碳排放\',\'产品碳足迹分析\')">深入分析 ›</button>');
  return v12Head("产品碳足迹看板",v12ModelSelect())+kpis+
    '<div class="v12Grid2">'+portfolio+stagePie+'</div>'+
    lifecycleSankey(model)+hot;
}
function v12OpenLine(si,li) {
  const model=v12Model(),l=model.stages[si].lines[li],e=lineEmission(model,l);
  v12Modal(v12H(l.name),'<dl class="detailList">'+[["生命周期阶段",model.stages[si].name],["批次活动量",fmt(l.quantity,2)+" "+l.unit+"（批次 "+fmt(model.batchOutput,0)+" "+model.flowUnit+"）"],
    ["排放因子",l.factor+" kgCO₂e / "+l.unit],["分配比例",l.allocation+"%"],["计算",fmt(l.quantity,2)+" × "+l.factor+" × "+l.allocation+"% ÷ "+fmt(model.batchOutput,0)+" × "+model.referenceFlow+" = "+v12Kg(e,3)+" kgCO₂e"],
    ["数据来源",l.source],["数据类型",l.quality||"—"],["凭证",l.evidence||"—"]].map(([k,v])=>'<div class="wide"><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>',
    '<button class="btn" data-close-modal="1">关闭</button><button class="btn primary" onclick="closeModal();activeLcaStage='+si+';v12State.lcaStep=1;go(\'产品碳排放\',\'LCA建模与核算\')">去清单编辑</button>');
}

// ================= LCA 建模与核算 =================
function v12LcaStep(i){v12State.lcaStep=i;render();}
function v12LcaStage(i){activeLcaStage=i;render();}
function v12NewModel(code) {
  editLcaModel(true);
  const p=code&&v12Products().find(x=>x.code===code);
  if(!p)return;
  const set=(k,v)=>{const el=document.querySelector('[data-lca-model="'+k+'"]');if(el)el.value=v;};
  set("name",p.name);set("code",p.code);set("functionalUnit",p.fu.replace(/^1 t /,"1 t ")+"");
  const pick=document.getElementById("xkModelPcr");
  if(pick){const hit=xkPcrs().find(x=>x.status==="有效"&&x.id!=="PCR-05"&&x.match.test(p.name));if(hit){pick.value=hit.id;pick.onchange({target:pick});}}
}
function v12LcaPage() {
  const model=v12Model(),step=v12State.lcaStep||0,total=lcaTotal(model),pcr=xkPcrOf(model);
  const meta='<div class="v12ModelBar"><div><b>'+v12H(model.name)+'</b><small>'+v12H(model.code)+' · V'+v12H(model.version||"1.0")+' · '+v12H(model.owner||"")+'</small></div>'+
    '<span>PCR <b>'+(pcr?v12H(pcr.code):'<i class="badText">未选择</i>')+'</b></span><span>边界 <b>'+v12H(model.boundary)+'</b></span><span>功能单位 <b>'+model.referenceFlow+' '+v12H(model.flowUnit)+'</b></span>'+
    '<span>碳足迹 <b class="okText">'+v12Kg(total,1)+'</b> kgCO₂e</span>'+v12Tag(model.status||"草稿",model.status==="已发布"?"ok":model.status==="待审核"?"warn":"gray")+'</div>';
  const body=[v12LcaGoal,v12LcaInventory,v12LcaImpact,v12LcaInterpret][step](model);
  const nav='<div class="v12StepNav">'+(step>0?'<button class="btn" onclick="v12LcaStep('+(step-1)+')">‹ 上一步：'+V12_LCA_STEPS[step-1][0]+'</button>':'<span></span>')+
    (step<3?'<button class="btn primary" onclick="v12LcaStep('+(step+1)+')">下一步：'+V12_LCA_STEPS[step+1][0]+' ›</button>':'<button class="btn primary" onclick="go(\'产品碳排放\',\'产品碳足迹报告\')">生成碳足迹评价报告 ›</button>')+'</div>';
  return v12Head("LCA建模与核算",v12ModelSelect()+'<button class="btn" onclick="editLcaModel()">模型设置</button><button class="btn primary" onclick="editLcaModel(true)">新建 LCA 模型</button>')+
    meta+v12Steps(V12_LCA_STEPS,step,"v12LcaStep",i=>i<step)+body+nav;
}
function v12LcaGoal(model) {
  const pcr=xkPcrOf(model),m=xkModelMeta(model);
  const required=pcr?.req?.find(r=>r[0]==="必选阶段")?.[1]||"";
  const segs='<div class="v12BoundSeg">'+XK_BOUNDARIES.map(b=>'<button class="'+(model.boundary===b?'active':'')+'" onclick="xkSetBoundary(\''+b+'\')"><b>'+b+'</b><span>'+v12Kg(xkBoundaryTotal(model,b),1)+' kgCO₂e</span></button>').join("")+'</div>';
  const stages='<div class="v12StageFlow">'+model.stages.map((s,i)=>'<div class="'+(s.enabled?'on':'off')+'"><i>'+(i+1)+'</i><b>'+s.name+'</b><small>'+(s.enabled?'纳入':'边界外')+'</small></div>').join('<span class="arr">→</span>')+'</div>';
  const pcrPanel=v12Panel("产品类别规则（PCR）",pcr?
    '<div class="v12PcrHead"><div><b>'+v12H(pcr.code)+'</b> '+v12H(pcr.name)+'<small>'+v12H(pcr.org)+' · 有效期 '+v12H(pcr.valid)+'</small></div>'+(pcr.boundary===model.boundary||!XK_BOUNDARIES.includes(pcr.boundary)?v12Tag("边界符合 PCR","ok"):v12Tag("边界与 PCR 不一致","warn"))+'</div>'+
    v12Table(["PCR 条款","要求","本模型"],(pcr.req||[]).map(r=>[v12H(r[0]),v12H(r[1]),r[0]==="功能单位"?v12H(model.functionalUnit):r[0]==="截断准则"?v12H(model.cutoff||"—"):r[0]==="分配规则"?v12H(model.allocation):r[0]==="必选阶段"?model.stages.filter(s=>s.enabled).map(s=>s.name).join("、"):"已采用"]),{nopage:true}):
    v12Empty("尚未选择 PCR。选择后自动带出功能单位、系统边界、截断与分配规则。"),
    '<button class="btn'+(pcr?'':' primary')+'" onclick="xkOpenPcrPick()">'+(pcr?'更换 PCR':'选择 PCR')+'</button>');
  const scope=v12Panel("研究范围",'<dl class="v12KV">'+[["功能单位",model.functionalUnit],["参考流",model.referenceFlow+" "+model.flowUnit+" · 清单批次 "+fmt(model.batchOutput,0)+" "+model.flowUnit],["数据代表期",model.period],["地域代表性",model.geography],
    ["分配方法",model.allocation],["截断准则",model.cutoff||"—"],["排除项",model.exclusions||"—"],["评价标准",model.standard]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>',
    '<button class="btn" onclick="editLcaModel()">编辑</button>');
  const assume=v12Panel("建模假设与取舍",'<ol class="v12Ol">'+(m.assumptions.length?m.assumptions.map(a=>'<li>'+v12H(a)+'</li>').join(""):'<li class="muted">未填写</li>')+'</ol>'+
    v12Table(["取舍项","占比","依据"],m.cutoffs.map(c=>c.map(v12H)),{nopage:true,empty:"无取舍项"}),
    '<button class="btn" onclick="xkOpenNoteEdit(\'assumptions\')">编辑假设</button><button class="btn" onclick="xkOpenNoteEdit(\'cutoffs\')">编辑取舍</button>');
  return pcrPanel+v12Panel("系统边界",segs+stages+(required?'<p class="v12Hint">PCR 必选阶段：'+v12H(required)+'</p>':''))+'<div class="v12Grid2">'+scope+assume+'</div>';
}
function v12LcaInventory(model) {
  const totals=v12StageTotals(model),total=lcaTotal(model);
  if(!model.stages[activeLcaStage])activeLcaStage=0;
  const stage=model.stages[activeLcaStage];
  const flow='<div class="v12StageChev">'+model.stages.map((s,i)=>'<button class="'+(i===activeLcaStage?'active ':'')+(s.enabled?'':'off')+'" onclick="v12LcaStage('+i+')"><i>'+(i+1)+'</i><span><b>'+s.name+'</b><small>'+
    (!s.enabled?'边界外':s.lines.length+' 项 · '+v12Kg(totals[i].total,1)+' kg')+'</small></span></button>').join("")+'</div>';
  const rows=stage.lines.map((l,i)=>[ '<strong>'+v12H(l.name)+'</strong>',fmt(l.quantity,2)+' '+v12H(l.unit),l.factor+'<small>kgCO₂e/'+v12H(l.unit)+'</small>',l.allocation+'%',
    '<b>'+v12Kg(lineEmission(model,l),2)+'</b>',total?(lineEmission(model,l)/total*100).toFixed(2)+'%':'—',v12H(l.source)+'<small>'+v12H(l.evidence||"")+'</small>',v12Tag(l.quality||"—",l.quality==="企业实测"?"ok":l.quality==="供应商数据"?"blue":"gray"),
    '<button class="linkBtn" onclick="editLcaLine('+i+')">编辑</button> <button class="linkBtn red" onclick="removeLcaLine('+i+')">删除</button>']);
  const sum=totals[activeLcaStage].total;
  return flow+v12Panel(stage.name+' <small>'+(stage.enabled?'阶段合计 '+v12Kg(sum,2)+' kgCO₂e · 占 '+(total?(sum/total*100).toFixed(1):0)+'%':'不在当前系统边界内')+'</small>',
    stage.enabled?v12Table(["活动 / 物料","批次活动量","排放因子","分配","参考流排放 kgCO₂e","贡献","数据来源 / 凭证","数据类型","操作"],rows,{nopage:true,empty:"该阶段暂无活动数据"}):v12Empty("当前系统边界为「"+v12H(model.boundary)+"」，本阶段不纳入核算。"),
    stage.enabled?'<button class="btn" onclick="showLcaCalculation()">计算口径</button><button class="btn" onclick="exportLca()">导出清单</button><button class="btn primary" onclick="editLcaLine()">添加活动数据</button>':'');
}
function v12LcaImpact(model) {
  const g=v12GasTotals(model),total=g.reduce((s,x)=>s+x,0),totals=v12StageTotals(model);
  const gasRows=V12_GWP.map(([f,n,gwp],i)=>[f+' <small>'+n+'</small>',gwp,v12Kg(g[i]/gwp,4)+' kg',v12Kg(g[i],2),total?(g[i]/total*100).toFixed(2)+'%':'—']);
  gasRows.push({cls:"totalRow",cells:["合计","—","—",'<b>'+v12Kg(total,2)+'</b>',"100%"]});
  const stageRows=model.stages.map((s,i)=>{
    const gs=[0,0,0];s.enabled&&s.lines.forEach(l=>{const e=lineEmission(model,l),sh=v12GasShare(l);sh.forEach((x,k)=>gs[k]+=e*x);});
    return {label:s.name,stack:gs.map((v,k)=>({label:V12_GWP[k][0],value:v,color:["#2C6AA0","#B7791F","#6B4FA0"][k]})),display:v12Kg(totals[i].total,0)};
  });
  return '<div class="v12Grid2">'+v12Panel("影响评价方法",'<dl class="v12KV">'+[["影响类别","气候变化（GWP100）"],["特征化模型","IPCC AR6（2021）100 年全球增温潜势"],["结果指标","kgCO₂e / "+model.referenceFlow+" "+model.flowUnit],["生物源碳","本产品不含生物源碳，单列为 0"],["土地利用变化","不涉及"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>')+
    v12Panel("特征化结果",v12Table(["温室气体","GWP100","质量","kgCO₂e","占比"],gasRows,{nopage:true}))+'</div>'+
    v12Panel("分阶段、分气体特征化结果",v12Columns(stageRows,{width:1000,height:260,barW:60,valFmt:v=>v12Kg(v,0),axisFmt:v=>v12Kg(v,0)})+v12LegendRow([["CO₂","#2C6AA0"],["CH₄","#B7791F"],["N₂O","#6B4FA0"]]));
}
function v12Sensitivity(model,n=6) {
  const total=lcaTotal(model);
  return v12ModelLines(model).sort((a,b)=>b.emission-a.emission).slice(0,n).map(l=>({name:l.name,stage:l.stage,emission:l.emission,share:total?l.emission/total*100:0,delta:total?l.emission*0.1/total*100:0}));
}
function v12LcaInterpret(model) {
  const total=lcaTotal(model),lines=v12ModelLines(model),pcr=xkPcrOf(model);
  const sens=v12Sensitivity(model);
  const required=(pcr?.req?.find(r=>r[0]==="必选阶段")?.[1]||"");
  const checks=[
    ["PCR 已选择",!!pcr,pcr?pcr.code:"未选择"],
    ["系统边界符合 PCR",!pcr||!XK_BOUNDARIES.includes(pcr.boundary)||pcr.boundary===model.boundary,model.boundary],
    ["纳入阶段均有活动数据",model.stages.filter(s=>s.enabled&&s.name!=="回收处置").every(s=>s.lines.length),model.stages.filter(s=>s.enabled).map(s=>s.name+" "+s.lines.length+" 项").join("、")],
    ["每条活动有数据来源与凭证",lines.every(l=>l.source&&l.evidence),lines.filter(l=>!l.evidence).length+" 条缺凭证"],
    ["累计截断 ≤ 5%",xkModelMeta(model).cutoffs.reduce((s,c)=>s+(parseFloat(c[1])||0),0)<=5,xkModelMeta(model).cutoffs.reduce((s,c)=>s+(parseFloat(c[1])||0),0).toFixed(2)+"%"],
    ["一手数据占比 ≥ 50%",lines.filter(l=>l.quality==="企业实测").reduce((s,l)=>s+l.emission,0)/(total||1)>=0.5,(lines.filter(l=>l.quality==="企业实测").reduce((s,l)=>s+l.emission,0)/(total||1)*100).toFixed(1)+"%"]];
  const ok=checks.every(c=>c[1]);
  const top=lines.sort((a,b)=>b.emission-a.emission)[0];
  const tornado='<div class="v12Tornado">'+sens.map(s=>'<div><span class="l">'+v12H(s.name)+'<small>'+s.stage+'</small></span><span class="t"><i class="neg" style="width:'+(s.delta/sens[0].delta*48)+'%"></i><i class="pos" style="width:'+(s.delta/sens[0].delta*48)+'%"></i></span><span class="v">±'+s.delta.toFixed(2)+'%</span></div>').join("")+'</div>';
  return '<div class="v12Grid2">'+v12Panel("完整性与一致性检查",'<ul class="v12Checks">'+checks.map(c=>'<li class="'+(c[1]?'pass':'fail')+'"><i>'+(c[1]?'✓':'!')+'</i><span>'+c[0]+'</span><small>'+v12H(c[2])+'</small></li>').join("")+'</ul>')+
    v12Panel("敏感性分析 <small>单项活动数据 ±10%</small>",tornado)+'</div>'+
    v12Panel("结论",'<ol class="v12Ol"><li>'+v12H(model.name)+'（'+v12H(model.boundary)+'）碳足迹为 <b>'+v12Kg(total,1)+' kgCO₂e / '+model.referenceFlow+' '+v12H(model.flowUnit)+'</b>。</li>'+
      (top?'<li>最大贡献活动为「'+v12H(top.name)+'」，占 '+(top.emission/total*100).toFixed(1)+'%；该项 ±10% 变化使结果变化 ±'+(top.emission/total*10).toFixed(2)+'%。</li>':'')+
      '<li>'+(ok?'完整性与一致性检查全部通过，可提交审核并生成碳足迹评价报告。':'仍有 '+checks.filter(c=>!c[1]).length+' 项检查未通过，处理后再提交审核。')+'</li></ol>',
      '<button class="btn" onclick="recordLcaVersion()">保存核算快照</button>'+(model.status==="已发布"?v12Tag("已发布","ok"):'<button class="btn primary" '+(ok?'':'disabled')+' onclick="v12PublishModel()">'+(model.status==="待审核"?'审核通过并发布':'提交审核')+'</button>'));
}
function v12PublishModel() {
  const model=v12Model();
  model.status=model.status==="待审核"?"已发布":"待审核";
  if(model.status==="已发布"){recordLcaVersion();}
  persistDemo();render();showToast(model.status==="已发布"?"模型已发布，产品碳足迹值已更新":"已提交审核");
}
// PCR 选择后回到第一步；“建模说明”链接不再使用
xkLcaBar = function(){return "";};

// ================= 产品信息 =================
function v12ProductInfo() {
  const f=v12State.prodLine||"",q=(v12State.prodQ||"").toLowerCase();
  const all=v12Products();
  const list=all.filter(p=>(!f||p.line===f)&&(!q||(p.code+p.name).toLowerCase().includes(q)));
  const lines=[...new Set(all.map(p=>p.line))];
  const rows=list.map(p=>({click:"v12OpenProduct('"+v12Q(p.code)+"')",cells:['<span class="v12Code0">'+v12H(p.code)+'</span>','<strong>'+v12H(p.name)+'</strong>',v12H(p.line),v12H(p.fu),fmt(p.sales||0,0),
    p.model?'<b>'+v12Kg(lcaTotal(p.model),0)+'</b><small>kgCO₂e/t · '+v12H(p.model.boundary)+'</small>':'—',
    v12Tag(p.status,p.status==="已发布"?"ok":p.status==="建模中"?"warn":"gray"),v12H(p.src),'<button class="linkBtn" onclick="event.stopPropagation();v12OpenProduct(\''+v12Q(p.code)+'\')">查看</button>']}));
  return v12Head("产品信息",'<button class="btn" onclick="v12ErpSyncProducts()">从 ERP 同步</button><button class="btn primary" onclick="v12NewProduct()">新增产品</button>')+
    '<div class="statRow">'+v12Kpi("产品",String(all.length),"个 · "+lines.length+" 条产品线")+v12Kpi("已发布碳足迹",String(all.filter(p=>p.status==="已发布").length),"个")+v12Kpi("建模中",String(all.filter(p=>p.status==="建模中").length),"个")+v12Kpi("待建模",String(all.filter(p=>p.status==="待建模").length),"个")+'</div>'+
    v12Panel("产品清单",'<div class="taskToolbar"><label>产品线<select onchange="v12Set(\'prodLine\',this.value)"><option value="">全部</option>'+lines.map(l=>'<option '+(l===f?'selected':'')+'>'+v12H(l)+'</option>').join("")+'</select></label>'+
      '<label class="taskSearch">搜索<input placeholder="产品编码 / 名称" value="'+v12H(v12State.prodQ||"")+'" onchange="v12Set(\'prodQ\',this.value)"></label><span>'+list.length+' 个产品 · ERP 物料主数据同步于 2026-11-20 02:00</span></div>'+
      v12Table(["产品编码","产品名称","产品线","功能单位","年销量 (t)","碳足迹","状态","来源",""],rows));
}
function v12ErpSyncProducts(){showToast("已从 ERP 同步物料主数据：新增 0，更新 2（销量）");}
function v12NewProduct() {
  v12Modal("新增产品",'<div class="modalForm">'+v12Field("产品编码",'<input id="npCode" placeholder="如 DSL-10">')+v12Field("产品名称",'<input id="npName">')+
    v12Field("产品线",'<select id="npLine">'+[...new Set(PRODUCT_CATALOG.map(p=>p[2]))].map(l=>'<option>'+v12H(l)+'</option>').join("")+'</select>')+v12Field("功能单位",'<input id="npFu" value="1 t 出厂">')+
    v12Field("年销量 (t)",'<input id="npSales" type="number" min="0">')+v12Field("生产单位",'<select id="npOrg">'+PETRO_ENTITIES.filter(e=>e.seg!=="HQ").map(e=>'<option>'+v12H(e.name)+'</option>').join("")+'</select>')+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveProduct()">保存</button>');
}
function v12SaveProduct() {
  const code=v12Val("npCode"),name=v12Val("npName");
  if(!code||!name){showToast("请填写产品编码和名称");return;}
  if(v12Products().some(p=>p.code===code)){showToast("产品编码已存在");return;}
  (v12().products ||= []).push({code,name,line:v12Val("npLine"),fu:v12Val("npFu")||"1 t 出厂",sales:Number(v12Val("npSales"))||0,status:"待建模",org:v12Val("npOrg"),src:"手工"});
  v12Persist();closeModal();render();showToast("产品已新增");
}
// 组分 / 原料碳排放：BOM 行 × 对应活动排放强度
const V12_HDPE_BOM = [["1","M-01","乙烯（聚合级）","纯度 99.95%",985,"乙烯"],["1","M-02","1-丁烯","共聚单体",28,"1-丁烯"],["1","M-03","聚合催化剂及助剂","Ziegler-Natta",1.2,"催化剂"],["3","P-01","包装膜袋","25 kg 重膜袋",4.2,"包装"],["1","A-01","抗氧剂","1010 / 168",1.5,"截断（<1%）"]];
function v12Bom(p) {
  if(p.code==="GSL92-VIB")return P150_BOM.map(r=>({type:{1:"原料",2:"装置组分",3:"包装"}[r[0]],code:r[1],name:r[2],spec:r[3],qty:r[4],link:r[5]}));
  if(p.code==="HDPE-5000S")return V12_HDPE_BOM.map(r=>({type:{1:"原料",2:"装置组分",3:"包装"}[r[0]],code:r[1],name:r[2],spec:r[3],qty:r[4],link:r[5]}));
  return (v12().boms||{})[p.code]||[];
}
function v12BomEmission(p) {
  const model=p.model;if(!model)return [];
  const lines=v12ModelLines(model);
  return v12Bom(p).map(b=>{
    if(b.link.startsWith("截断"))return {...b,emission:0,line:"截断"};
    const key=b.link.replace(/[（(].*$/,"").slice(0,4);
    const ls=lines.filter(l=>l.name.includes(key)||(key==="自产原油"&&l.name.includes("自产原油"))||(key==="进口原油"&&l.name.includes("进口原油开采")));
    const same=v12Bom(p).filter(x=>x.link===b.link).reduce((s,x)=>s+x.qty,0)||b.qty;
    const e=ls.reduce((s,l)=>s+l.emission,0)*b.qty/same;
    return {...b,emission:e,line:ls.map(l=>l.name).join("；")||"—"};
  });
}
function v12OpenProduct(code,tab) {
  const p=v12Products().find(x=>x.code===code);if(!p)return;
  tab=tab||"base";
  const tabs=[["base","基本信息"],["bom","BOM / 原料组成"],["comp","组分碳排放"],["lca","LCA 模型"],["cert","认证"]];
  const bom=v12Bom(p),comp=v12BomEmission(p),certs=v12Certs().filter(c=>p.name.startsWith(c.product.slice(0,6))||c.product.startsWith(p.name.slice(0,6)));
  let body="";
  if(tab==="base")body='<dl class="detailList">'+[["产品编码",p.code],["产品名称",p.name],["产品线",p.line],["功能单位",p.fu],["年销量",fmt(p.sales||0,0)+" t"],["生产单位",p.org||(p.line==="成品油"||p.line==="沥青"||p.line==="石油焦"?"滨海石化分公司":"滨海石化分公司 · 化工部")],["适用 PCR",(xkPcrs().find(x=>x.status==="有效"&&x.id!=="PCR-05"&&x.match.test(p.name))||{code:"GB/T 24067-2024（通则）"}).code],["数据来源",p.src==="ERP"?"ERP 物料主数据":"手工维护"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>';
  if(tab==="bom")body=bom.length?v12Table(["类别","物料编码","物料名称","规格","千吨产品用量 (t)","对应 LCA 活动"],bom.map(b=>[b.type,b.code,'<strong>'+v12H(b.name)+'</strong>',v12H(b.spec),fmt(b.qty,2),b.link.startsWith("截断")?v12Tag(b.link,"gray"):v12H(b.link)]),{nopage:true}):
    v12Empty('尚未维护 BOM。<button class="btn" onclick="showToast(\'已从 ERP 拉取 BOM，待确认\')">从 ERP 拉取 BOM</button>');
  if(tab==="comp"){
    const sum=comp.reduce((s,c)=>s+c.emission,0);
    body=comp.length?v12HBars(comp.filter(c=>c.emission>0).sort((a,b)=>b.emission-a.emission).map(c=>({label:c.name,sub:c.type,value:c.emission,display:v12Kg(c.emission,1)})),{unit:" kg"})+
      v12Table(["物料","用量 (t/千吨)","kgCO₂e / t 产品","占原料与组分合计","计算依据"],comp.map(c=>['<strong>'+v12H(c.name)+'</strong>',fmt(c.qty,2),c.emission?v12Kg(c.emission,2):'0（截断）',sum?(c.emission/sum*100).toFixed(1)+'%':'—','<small>'+v12H(c.line)+'</small>']),{nopage:true}):v12Empty(p.model?"未维护 BOM":"尚未建立 LCA 模型");
  }
  if(tab==="lca")body=p.model?'<dl class="detailList">'+[["模型",p.model.name+" V"+(p.model.version||"1.0")],["系统边界",p.model.boundary],["碳足迹",v12Kg(lcaTotal(p.model),1)+" kgCO₂e / "+p.model.referenceFlow+" "+p.model.flowUnit],["从摇篮到大门",v12Kg(v12GateTotal(p.model),1)+" kgCO₂e"],["PCR",xkPcrOf(p.model)?.code||"—"],["状态",p.model.status||"草稿"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>':v12Empty("尚未建立 LCA 模型");
  if(tab==="cert")body=v12Table(["证书编号","类型","依据标准","有效期至","声明值","状态"],certs.map(c=>[v12H(c.no),v12H(c.kind),v12H(c.std),c.to,v12H(c.value),v12Tag(c.status,c.status==="有效"?"ok":"gray")]),{nopage:true,empty:"暂无认证"});
  v12Modal(v12H(p.name)+' <small class="muted">'+v12H(p.code)+'</small>',v12Tabs(tabs,tab,"v12ProductTab")+'<div class="v12ModalBody">'+body+'</div>',
    '<button class="btn" data-close-modal="1">关闭</button>'+(p.model?'<button class="btn primary" onclick="closeModal();selectLcaModel(\''+p.model.id+'\');go(\'产品碳排放\',\'LCA建模与核算\')">打开 LCA 模型</button>':'<button class="btn primary" onclick="closeModal();go(\'产品碳排放\',\'LCA建模与核算\');setTimeout(()=>v12NewModel(\''+v12Q(p.code)+'\'),50)">新建 LCA 模型</button>'));
  v12State.prodOpen=code;
}
function v12ProductTab(tab){v12OpenProduct(v12State.prodOpen,tab);}

// ================= 产品碳足迹分析 =================
function v12CfpAnalysis() {
  const models=demo.lcaModels,model=v12Model(),total=lcaTotal(model);
  const gateT=m=>{const c=structuredClone(m);xkApplyBoundary(c,"从摇篮到大门");return lcaTotals(c).slice(0,3);};
  const cmp=v12Columns(models.map(m=>({label:m.name.length>12?m.name.slice(0,12)+"…":m.name,stack:gateT(m).map((s,k)=>({label:s.name,value:s.total,color:V12_STAGE_COLORS[k]})),action:"selectLcaModel('"+m.id+"')"})),{width:560,height:250,barW:70,valFmt:v=>v12Kg(v,0)});
  const lines=v12ModelLines(model);
  const q={};lines.forEach(l=>q[l.quality||"未标注"]=(q[l.quality||"未标注"]||0)+l.emission);
  const src=v12Pie(Object.entries(q).map(([k,v],i)=>({label:k,value:v,display:v12Kg(v,0)+" kg",color:{"企业实测":"#26890D","供应商数据":"#2C6AA0","情景估算":"#B7791F","数据库替代":"#667085"}[k]||v12Color(i)})),{size:170,center:[(q["企业实测"]/(total||1)*100||0).toFixed(0)+"%","一手数据"]});
  const certs=v12Certs().filter(c=>model.name.startsWith(c.product.slice(0,6))||c.product.slice(0,4)===model.name.slice(0,4));
  const hist=[...certs.map(c=>({label:c.from.slice(0,4)+" 认证",value:parseFloat(String(c.value).replace(/,/g,""))||0,color:"#A3B18A"})).filter(r=>r.value).reverse(),
    ...(model.history||[]).slice(-3).map((h,i)=>({label:"快照 "+((model.history.length-Math.min(3,model.history.length))+i+1),value:h.total,color:"#86BC25"})),{label:"当前",value:total,color:"#26890D"}];
  const sens=v12Sensitivity(model,6);
  const stages=v12StageTotals(model);
  const perStage=v12Columns(stages.map((s,i)=>({label:s.name,value:s.total,color:V12_STAGE_COLORS[i],display:v12Kg(s.total,0)})),{width:560,height:240,barW:60});
  const byAct={};lines.forEach(l=>{const k=/电力|用电/.test(l.name)?"电力":/蒸汽/.test(l.name)?"蒸汽":/运|配送|管道|铁路/.test(l.name)?"运输":/燃烧|烧焦|干气/.test(l.name)?"燃料燃烧与工艺":/原油|乙烯|丁烯|MTBE|催化剂|包装/.test(l.name)?"原料与物料":"其他";byAct[k]=(byAct[k]||0)+l.emission;});
  return v12Head("产品碳足迹分析",v12ModelSelect())+
    '<div class="statRow">'+v12Kpi("碳足迹",v12Kg(total,1),"kgCO₂e / "+model.referenceFlow+" "+model.flowUnit)+v12Kpi("活动数据",String(lines.length),"条")+
      v12Kpi("最大贡献阶段",stages.slice().sort((a,b)=>b.total-a.total)[0].name,(stages.slice().sort((a,b)=>b.total-a.total)[0].total/(total||1)*100).toFixed(1)+"%")+
      v12Kpi("较上次认证",certs[0]?((total-(parseFloat(String(certs[0].value).replace(/,/g,""))||total))/(parseFloat(String(certs[0].value).replace(/,/g,""))||total)*100).toFixed(1)+"%":"—",certs[0]?v12H(certs[0].no):"无认证记录")+'</div>'+
    '<div class="v12Grid2">'+v12Panel("生命周期阶段分布",perStage)+v12Panel("按排放类型",v12Pie(Object.entries(byAct).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,value:v,display:v12Kg(v,0)+" kg"})),{size:170}))+'</div>'+
    '<div class="v12Grid2">'+v12Panel("产品间对比 <small>从摇篮到大门 · kgCO₂e / t</small>",cmp+v12LegendRow(lifecycleStages.slice(0,3).map((s,i)=>[s,V12_STAGE_COLORS[i]])))+
      v12Panel("历次核算与认证",v12Columns(hist,{width:560,height:250,barW:56,valFmt:v=>v12Kg(v,0)}))+'</div>'+
    '<div class="v12Grid2">'+v12Panel("数据来源构成 <small>按排放量</small>",'<div class="v12SrcWrap">'+src+'<div class="v12StageQ"><h4 class="v12Sub">各阶段一手数据占比</h4>'+stages.map((st,i)=>{const ls=lines.filter(l=>l.stage===st.name),t=ls.reduce((a,l)=>a+l.emission,0),p=ls.filter(l=>/实测|供应商/.test(l.quality||"")).reduce((a,l)=>a+l.emission,0);
      return '<div class="r"><span>'+v12H(st.name)+'<small>'+ls.length+' 条</small></span><i><b style="width:'+(t?p/t*100:0)+'%;background:'+V12_STAGE_COLORS[i]+'"></b></i><em>'+(t?(p/t*100).toFixed(0)+'%':'—')+'</em></div>';}).join("")+'</div></div>')+v12Panel("敏感性 <small>单项 ±10% 对结果的影响</small>",
      v12HBars(sens.map(s=>({label:s.name,sub:s.stage,value:s.delta,display:"±"+s.delta.toFixed(2)+"%"})),{color:"#B7791F"}))+'</div>'+
    v12Panel("活动明细",v12Table(["阶段","活动","参考流排放 kgCO₂e","占比","数据类型"],lines.sort((a,b)=>b.emission-a.emission).map(l=>({click:"v12OpenLine("+l.si+","+l.li+")",cells:[l.stage,'<strong>'+v12H(l.name)+'</strong>',v12Kg(l.emission,2),(l.emission/(total||1)*100).toFixed(2)+"%",v12H(l.quality||"—")]})),{nopage:true}));
}

// ================= 产品碳足迹报告（Word 版式） =================
function v12CfpReport() {
  const model=v12Model(),total=lcaTotal(model),totals=v12StageTotals(model),pcr=xkPcrOf(model),m=xkModelMeta(model),lines=v12ModelLines(model);
  const unit="kgCO₂e / "+model.referenceFlow+" "+model.flowUnit;
  const g=v12GasTotals(model),sens=v12Sensitivity(model,5);
  const no="BCPC-CFP-"+(model.code||"MODEL")+"-"+CURRENT_YEAR;
  const T=(h,r,c)=>v12DocTable(h,r,{caption:c});
  const P=t=>'<p>'+t+'</p>';
  const q={};lines.forEach(l=>q[l.quality||"未标注"]=(q[l.quality||"未标注"]||0)+l.emission);
  const sections=[
    {title:"报告摘要",body:T(["项目","内容"],[["委托方 / 生产者","北辰石油天然气集团有限公司 · 滨海石化分公司"],["产品名称",v12H(model.name)],["产品编码",v12H(model.code)],["功能单位",v12H(model.functionalUnit)],["系统边界",v12H(model.boundary)],["依据标准","ISO 14067:2018；GB/T 24067-2024"+(pcr?"；"+v12H(pcr.code):"")],["数据代表期",v12H(model.period)],["碳足迹结果",'<b>'+v12Kg(total,2)+" "+unit+'</b>'],["报告编号",no]],"表 0-1 报告摘要")},
    {title:"本报告信息",subs:["报告基本信息","缩略语"],body:'<h3>报告基本信息</h3>'+T(["项目","内容"],[["报告名称",v12H(model.name)+" 产品碳足迹评价报告"],["编制单位","北辰石油 · 石油化工研究院 产品碳足迹组"],["编制人",v12Person()],["审核人","高文博（集团 ESG 管理部）"],["报告日期",v12Today()],["报告用途","产品碳足迹声明、客户披露与第三方核查"]],"表 0-2 报告基本信息")+
      '<h3>缩略语</h3>'+T(["缩略语","全称"],[["CFP","产品碳足迹 Carbon Footprint of a Product"],["PCR","产品类别规则 Product Category Rules"],["LCA","生命周期评价 Life Cycle Assessment"],["GWP","全球增温潜势 Global Warming Potential"],["FU","功能单位 Functional Unit"]],"表 0-3 缩略语")},
    {title:"1 碳足迹概述",body:P(v12H(model.name)+" 在「"+v12H(model.boundary)+"」系统边界下，碳足迹为 "+v12Kg(total,2)+" "+unit+"。其中"+totals.filter(s=>s.enabled&&s.total>0).map(s=>s.name+" "+v12Kg(s.total,1)+"（"+(s.total/total*100).toFixed(1)+"%）").join("，")+"。")+
      v12Fig(v12Pie(totals.filter(s=>s.total>0).map((s,i)=>({label:s.name,value:s.total,color:V12_STAGE_COLORS[model.stages.findIndex(x=>x.name===s.name)],display:v12Kg(s.total,1)})),{size:200,center:[v12Kg(total,0),"kgCO₂e"]}),"图 1-1 生命周期各阶段碳足迹占比")},
    {title:"2 企业和产品简介",subs:["企业简介","产品简介"],body:'<h3>2.1 企业简介</h3>'+P("北辰石油天然气集团有限公司是集油气勘探开发、炼油化工、油气储运和成品油销售于一体的综合性能源企业。本产品由滨海石化分公司生产，该公司原油加工能力 1,500 万 t/a，配套 120 万 t/a 乙烯装置及 2×350 MW 自备热电厂。")+
      '<h3>2.2 产品简介</h3>'+T(["项目","内容"],[["产品名称",v12H(model.name)],["产品编码",v12H(model.code)],["年产量 / 销量",fmt(v12CatalogRow(model)?.[4]||0,0)+" t"],["生产工艺",/汽油/.test(model.name)?"常减压蒸馏 → 催化裂化 / 连续重整 / 烷基化 → 加氢精制 → 调和":"乙烯裂解 → 淤浆法聚合 → 造粒 → 包装"],["主要用途",/汽油/.test(model.name)?"点燃式发动机车用燃料":"中空容器、管材、薄膜"]],"表 2-1 产品基本信息")},
    {title:"3 目的和范围",subs:["研究目的","依据标准与 PCR","功能单位与参考流","系统边界","取舍准则","假设与局限","影响评价方法","软件与数据库","数据质量要求"],body:
      '<h3>3.1 研究目的</h3>'+P("量化 "+v12H(model.name)+" 全生命周期温室气体排放，识别减排热点，为客户碳足迹披露、产品低碳认证及工艺改进提供依据。")+
      '<h3>3.2 依据标准与 PCR</h3>'+P("ISO 14067:2018《温室气体 产品碳足迹 量化要求和指南》；GB/T 24067-2024；ISO 14040/14044。"+(pcr?"产品类别规则采用 "+v12H(pcr.code+"《"+pcr.name+"》")+"（"+v12H(pcr.org)+"）。":"无适用 PCR，按通则执行。"))+
      '<h3>3.3 功能单位与参考流</h3>'+P("功能单位："+v12H(model.functionalUnit)+"；参考流："+model.referenceFlow+" "+v12H(model.flowUnit)+"；清单批次 "+fmt(model.batchOutput,0)+" "+v12H(model.flowUnit)+"。")+
      '<h3>3.4 系统边界</h3>'+T(["生命周期阶段","是否纳入","主要过程"],model.stages.map(s=>[s.name,s.enabled?"纳入":"不纳入",s.lines.map(l=>v12H(l.name.replace(/（.*$/,""))).join("、")||"—"]),"表 3-1 系统边界")+
      '<h3>3.5 取舍准则</h3>'+P(v12H(model.cutoff||"—")+"。")+T(["取舍项","占比","依据"],m.cutoffs.map(c=>c.map(v12H)),"表 3-2 取舍项")+
      '<h3>3.6 假设与局限</h3><ul>'+m.assumptions.map(a=>'<li>'+v12H(a)+'</li>').join("")+'<li>局限：进口原油上游采用行业平均数据，未获取油田一手数据。</li></ul>'+
      '<h3>3.7 影响评价方法</h3>'+P("采用 IPCC AR6（2021）GWP100 特征化因子：CO₂ = 1，CH₄（化石）= 29.8，N₂O = 273。")+
      '<h3>3.8 软件与数据库</h3>'+P("北辰石油碳管理平台 LCA 模块；背景数据采用企业私域因子库、国家温室气体排放因子数据库及 Ecoinvent 3.10。")+
      '<h3>3.9 数据质量要求</h3>'+T(["指标","要求"],[["时间代表性","数据代表期 "+v12H(model.period)],["地域代表性",v12H(model.geography)],["技术代表性","本企业实际工艺"],["一手数据比例","前景过程 100% 企业实测"]],"表 3-3 数据质量要求")},
    {title:"4 清单分析",subs:["数据收集","分配","各单元过程清单","数据质量评价"],body:
      '<h3>4.1 数据收集</h3>'+P("活动数据来自 ERP、MES、能源管理系统、物流台账及供应商声明；共收集活动数据 "+lines.length+" 条。")+
      '<h3>4.2 分配</h3>'+T(["共用输入 / 输出","分配对象","方法","依据数据","本产品分摊比例"],m.allocations.map(c=>c.map(v12H)),"表 4-1 分配方法")+
      '<h3>4.3 各单元过程清单</h3>'+model.stages.filter(s=>s.enabled&&s.lines.length).map((s,k)=>T(["活动 / 物料","批次活动量","单位","排放因子 kgCO₂e/单位","数据来源"],s.lines.map(l=>[v12H(l.name),fmt(l.quantity,2),v12H(l.unit),l.factor,v12H(l.source)]),"表 4-"+(k+2)+" "+s.name+"阶段清单")).join("")+
      '<h3>4.4 数据质量评价</h3>'+T(["数据类型","排放量 kgCO₂e","占比"],Object.entries(q).map(([k,v])=>[k,v12Kg(v,2),(v/(total||1)*100).toFixed(1)+"%"]),"表 4-9 数据来源构成")},
    {title:"5 碳足迹结果",subs:["总体结果","各阶段贡献","单元过程贡献"],body:
      '<h3>5.1 总体结果</h3>'+T(["温室气体","GWP100","kgCO₂e","占比"],V12_GWP.map(([f,n,w],i)=>[f,w,v12Kg(g[i],2),(g[i]/(total||1)*100).toFixed(2)+"%"]).concat([{cls:"total",cells:["合计","—",v12Kg(total,2),"100%"]}]),"表 5-1 碳足迹结果（按气体）")+
      '<h3>5.2 各阶段贡献</h3>'+T(["生命周期阶段","kgCO₂e","占比"],totals.map(s=>[s.name,s.enabled?v12Kg(s.total,2):"不纳入",s.enabled?(s.total/(total||1)*100).toFixed(2)+"%":"—"]),"表 5-2 各阶段贡献")+
      v12Fig(v12Columns(totals.map((s,i)=>({label:s.name,value:s.total,color:V12_STAGE_COLORS[i]})),{width:560,height:230,barW:56,valFmt:v=>v12Kg(v,0)}),"图 5-1 各阶段碳足迹")+
      '<h3>5.3 单元过程贡献</h3>'+T(["排序","活动","阶段","kgCO₂e","占比"],lines.slice().sort((a,b)=>b.emission-a.emission).map((l,i)=>[i+1,v12H(l.name),l.stage,v12Kg(l.emission,2),(l.emission/(total||1)*100).toFixed(2)+"%"]),"表 5-3 单元过程贡献")},
    {title:"6 结果解释",subs:["重大问题识别","完整性检查","敏感性检查"],body:
      '<h3>6.1 重大问题识别</h3>'+P("贡献超过 5% 的单元过程："+lines.filter(l=>l.emission/(total||1)>0.05).map(l=>v12H(l.name)+"（"+(l.emission/total*100).toFixed(1)+"%）").join("；")+"。")+
      '<h3>6.2 完整性检查</h3>'+P("纳入边界的各阶段均已收集活动数据；累计截断 "+m.cutoffs.reduce((s,c)=>s+(parseFloat(c[1])||0),0).toFixed(2)+"%，满足 ≤5% 要求。")+
      '<h3>6.3 敏感性检查</h3>'+T(["活动","基准贡献","±10% 时结果变化"],sens.map(s=>[v12H(s.name),s.share.toFixed(2)+"%","±"+s.delta.toFixed(2)+"%"]),"表 6-1 敏感性分析")},
    {title:"7 结论与建议",body:P("1. "+v12H(model.name)+" 碳足迹为 "+v12Kg(total,2)+" "+unit+"。")+P("2. 减排重点："+sens.slice(0,3).map(s=>v12H(s.name.replace(/（.*$/,""))).join("、")+"。")+
      P("3. 建议：提高原油上游一手数据比例；推进炼厂干气与催化烧焦余热回收；扩大绿电在装置用电中的比例。")},
    {title:"参考文献与附录",body:'<ul><li>ISO 14067:2018 Greenhouse gases — Carbon footprint of products</li><li>GB/T 24067-2024 温室气体 产品碳足迹 量化要求和指南</li><li>IPCC AR6 WG1, 2021</li>'+(pcr?'<li>'+v12H(pcr.code+" "+pcr.name)+'</li>':'')+'</ul>'+
      T(["凭证编号","活动","来源"],lines.map(l=>[v12H(l.evidence||"—"),v12H(l.name),v12H(l.source)]),"附表 A 数据凭证清单")}
  ];
  const doc=v12Doc({title:model.name+" 产品碳足迹评价报告",titleLines:[model.name,"产品碳足迹评价报告"],en:"Carbon Footprint of Product Report",sub:"依据 ISO 14067:2018 / GB/T 24067-2024",
    meta:[["报告编号",no],["产品名称",model.name],["功能单位",model.functionalUnit],["系统边界",model.boundary],["编制日期",v12Today()]],org:"北辰石油天然气集团有限公司",date:v12Today().slice(0,7).replace("-"," 年 ")+" 月"},sections);
  return v12Head("产品碳足迹报告",v12ModelSelect()+v12DocMenu())+'<div class="wdWrap">'+doc+'</div>';
}

// ================= 碳足迹认证管理 =================
function v12CertPage() {
  const certs=v12Certs(),f=v12State.certStatus||"";
  const list=certs.filter(c=>!f||c.status===f||(f==="即将到期"&&c.expiring));
  const card=c=>'<div class="v12Cert '+(c.status==="有效"?"live":"off")+'" onclick="v12OpenCert(\''+v12Q(c.no)+'\')"><div class="h">'+v12Tag(c.status,c.status==="有效"?(c.expiring?"warn":"ok"):c.status==="续证中"?"warn":"gray")+'<small>'+v12H(c.kind)+'</small></div>'+
    '<b>'+v12H(c.product)+'</b><span class="val">'+v12H(c.value)+'</span><dl><div><dt>证书编号</dt><dd>'+v12H(c.no)+'</dd></div><div><dt>认证机构</dt><dd>'+v12H(c.org)+'</dd></div><div><dt>有效期</dt><dd>'+c.from+' 至 '+c.to+(c.expiring?' <em class="badText">（'+daysUntil(c.to)+' 天后到期）</em>':'')+'</dd></div></dl>'+(c.file?'<small class="file">📎 '+v12H(c.file.name)+'</small>':'')+'</div>';
  return v12Head("碳足迹认证管理",'<button class="btn primary" onclick="v12UploadCert()">上传证书</button>')+
    '<div class="statRow">'+v12Kpi("证书",String(certs.length),"张")+v12Kpi("有效",String(certs.filter(c=>c.status==="有效").length),"张",'v12Set(\'certStatus\',\'有效\')')+v12Kpi("180 天内到期",String(certs.filter(c=>c.expiring).length),"张 · 需安排复评",'v12Set(\'certStatus\',\'即将到期\')',certs.some(c=>c.expiring)?"warnText":"")+v12Kpi("已过期 / 替换",String(certs.filter(c=>["已过期","已替换"].includes(c.status)).length),"张")+'</div>'+
    v12Seg([["","全部"],["有效","有效"],["即将到期","即将到期"],["续证中","续证中"],["已过期","已过期"]],f,"v12CertFilter")+
    '<div class="v12CertGrid">'+list.map(card).join("")+'</div>';
}
function v12CertFilter(v){v12Set("certStatus",v);}
function v12OpenCert(no) {
  const c=v12Certs().find(x=>x.no===no);if(!c)return;
  const preview=c.file?.data?(c.file.type==="application/pdf"?'<iframe class="v12CertFile" src="'+c.file.data+'"></iframe>':'<img class="v12CertFile" src="'+c.file.data+'" alt="">'):
    '<div class="v12CertPaper"><div class="t">'+(c.kind==="EPD 环境产品声明"?"ENVIRONMENTAL PRODUCT DECLARATION":"产品碳足迹证书")+'<small>'+(c.kind==="EPD 环境产品声明"?"":"CARBON FOOTPRINT OF PRODUCT CERTIFICATE")+'</small></div>'+
    '<p>证书编号：'+v12H(c.no)+'</p><p class="n">北辰石油天然气集团有限公司</p><p>产品：'+v12H(c.product)+'</p><p>依据：'+v12H(c.std)+'</p><p class="v">'+v12H(c.value)+'</p><p>有效期：'+c.from+' 至 '+c.to+'</p><p class="o">'+v12H(c.org)+'</p></div>';
  v12Modal(v12H(c.product)+" · "+v12H(c.no),'<div class="v12CertView">'+preview+'<dl class="detailList">'+[["证书类型",c.kind],["依据标准",c.std],["认证机构",c.org],["发证日期",c.from],["有效期至",c.to],["声明值",c.value],["状态",c.status],["附件",c.file?c.file.name:"原件存档于集团档案室"]].map(([k,v])=>'<div class="wide"><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl></div>',
    '<button class="btn" data-close-modal="1">关闭</button>'+(c.file?.data?'<a class="btn" download="'+v12H(c.file.name)+'" href="'+c.file.data+'">下载附件</a>':'')+(c.status==="有效"&&c.expiring?'<button class="btn primary" onclick="v12RenewCert(\''+v12Q(c.no)+'\')">发起复评</button>':''));
}
function v12RenewCert(no){const c=(v12().certs||[]).find(x=>x.no===no);if(c)c.status="续证中";v12Persist();closeModal();render();showToast("已发起复评，认证机构将收到通知");}
function v12UploadCert() {
  v12Modal("上传证书",'<div class="modalForm">'+v12Field("产品",'<select id="ucProd">'+v12Products().map(p=>'<option>'+v12H(p.name)+'</option>').join("")+'</select>')+
    v12Field("证书类型",'<select id="ucKind"><option>产品碳足迹证书</option><option>EPD 环境产品声明</option><option>低碳产品认证</option><option>碳标签</option></select>')+
    v12Field("证书编号",'<input id="ucNo">')+v12Field("依据标准",'<input id="ucStd" value="ISO 14067:2018">')+v12Field("认证机构",'<input id="ucOrg">')+v12Field("声明值",'<input id="ucVal" placeholder="如 3,560 kgCO₂e/t">')+
    v12Field("发证日期",'<input id="ucFrom" type="date">')+v12Field("有效期至",'<input id="ucTo" type="date">')+v12Field("证书附件（PDF / 图片）",'<input id="ucFile" type="file" accept=".pdf,image/*">',"wide")+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveCert()">保存</button>');
}
async function v12SaveCert() {
  const no=v12Val("ucNo"),from=v12Val("ucFrom"),to=v12Val("ucTo");
  if(!no||!from||!to){showToast("请填写证书编号和有效期");return;}
  const input=document.getElementById("ucFile"),file=input.files?.[0];
  let att=null;
  if(file){
    if(file.size>3*1024*1024){showToast("附件超过 3 MB，请压缩后上传");return;}
    att={name:file.name,type:file.type,data:await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file);})};
  }
  (v12().certs ||= []).unshift({no,product:v12Val("ucProd"),kind:v12Val("ucKind"),std:v12Val("ucStd"),org:v12Val("ucOrg")||"—",value:v12Val("ucVal")||"—",from,to,status:new Date(to)<new Date()?"已过期":"有效",file:att});
  v12Persist();closeModal();render();showToast("证书已上传");
}

// ================= 首页卡片 =================
function v12LcaHomeCard() {
  const products=v12Products();
  return v12Panel("产品碳足迹",'<div class="v12LcaCards">'+demo.lcaModels.map(m=>'<button onclick="selectLcaModel(\''+m.id+'\');go(\'产品碳排放\',\'产品碳足迹看板\')"><span>'+v12H(m.name)+'</span><b>'+v12Kg(lcaTotal(m),0)+'</b><small>kgCO₂e / '+m.referenceFlow+' '+v12H(m.flowUnit)+' · '+v12H(m.boundary)+'</small></button>').join("")+'</div>'+
    '<div class="v12Stat"><span>产品覆盖</span><b>'+products.filter(p=>p.model).length+' / '+products.length+'</b><small>有效证书 '+v12Certs().filter(c=>c.status==="有效").length+' 张 · 180 天内到期 '+v12Certs().filter(c=>c.expiring).length+' 张</small></div>',
    '<button class="linkBtn" onclick="go(\'产品碳排放\',\'产品碳足迹看板\')">看板 ›</button>');
}

Object.assign(V12_PAGES_EXTRA, {
  "产品碳排放|产品碳足迹看板":()=>v12CfpDash(),
  "产品碳排放|LCA建模与核算":()=>v12LcaPage(),
  "产品碳排放|产品信息":()=>v12ProductInfo(),
  "产品碳排放|产品碳足迹分析":()=>v12CfpAnalysis(),
  "产品碳排放|产品碳足迹报告":()=>v12CfpReport(),
  "产品碳排放|碳足迹认证管理":()=>v12CertPage()
});

(function v12ProductStyle(){
  const css=`
.v12Select{height:36px;border:1px solid #d6dce2;border-radius:6px;background:#fff;padding:0 8px;max-width:300px}
.v12Split{display:flex;gap:20px;align-items:center}
.v12Split .v12PieWrap{flex:1;min-width:0}
.v12HBars{display:flex;flex-direction:column}
.v12SrcWrap{display:grid;gap:14px}.v12StageQ .r{display:grid;grid-template-columns:110px 1fr 44px;gap:10px;align-items:center;font-size:12.5px;padding:5px 0}.v12StageQ .r small{color:var(--sub);margin-left:6px}.v12StageQ i{height:8px;background:#F2F4F7;border-radius:4px;overflow:hidden;display:block}.v12StageQ i b{display:block;height:100%}.v12StageQ em{font-style:normal;text-align:right;font-weight:600}\n.v12HBar{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(0,1.4fr) 96px;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid #F2F4F7;font-size:13px}
.v12HBar.click{cursor:pointer}.v12HBar.click:hover{background:#F8FCF3}
.v12HBar .l{display:block;min-width:0;line-height:1.35}.v12HBar .l small{display:block;color:var(--sub);font-size:11px;margin-left:28px}
.v12HBar .l em{font-style:normal;width:20px;height:20px;line-height:20px;text-align:center;border-radius:4px;background:#F2F4F7;display:inline-block;font-size:11px;font-weight:700;margin-right:8px}
.v12HBar .t{height:12px;background:#F2F4F7;border-radius:3px;overflow:hidden}.v12HBar .t i{display:block;height:100%;border-radius:3px}
.v12HBar .v{text-align:right;font-weight:600}.v12HBar .v small{font-weight:400;color:var(--sub)}
.v12Stat{display:flex;flex-direction:column;gap:2px;padding:12px 14px;background:#F6F8F3;border-radius:6px;min-width:180px}
.v12Stat span{font-size:12px;color:var(--sub)}.v12Stat b{font-size:24px;color:#26890D}.v12Stat small{font-size:12px;color:var(--sub)}
.v12ModelBar{display:flex;flex-wrap:wrap;gap:22px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:13px;color:var(--sub)}
.v12ModelBar>div{margin-right:auto}.v12ModelBar>div b{display:block;font-size:15px;color:#101828}.v12ModelBar>div small{font-size:12px}
.v12ModelBar span b{color:#101828;margin-left:4px}
.v12Grid2 table,.modalBox table{min-width:0}
.v12BoundSeg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.v12BoundSeg button{border:1px solid #d6dce2;background:#fff;border-radius:6px;padding:10px 14px;text-align:left;cursor:pointer}
.v12BoundSeg button b{display:block;font-size:14px}.v12BoundSeg button span{font-size:12px;color:var(--sub)}
.v12BoundSeg button.active{border-color:#86BC25;background:#F3F8EA}
.v12StageFlow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.v12StageFlow>div{display:flex;align-items:center;gap:8px;border:1px solid #d6dce2;border-radius:20px;padding:6px 14px 6px 6px;background:#fff}
.v12StageFlow>div i{width:24px;height:24px;border-radius:50%;background:#86BC25;color:#fff;font-style:normal;display:grid;place-items:center;font-size:12px;font-weight:700}
.v12StageFlow>div small{color:var(--sub);font-size:11px}
.v12StageFlow>div.off{opacity:.5}.v12StageFlow>div.off i{background:#98A2B3}
.v12StageFlow .arr{color:#98A2B3}
.v12Hint{font-size:12px;color:var(--sub);margin:10px 0 0}
.v12PcrHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
.v12PcrHead small{display:block;color:var(--sub);font-size:12px;margin-top:2px}
.v12KV{display:grid;grid-template-columns:1fr;gap:0;margin:0}
.v12KV>div{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:8px 0;border-bottom:1px solid #F2F4F7;font-size:13px}
.v12KV dt{color:var(--sub)}.v12KV dd{margin:0}
.v12Ol{margin:0 0 12px;padding-left:20px;line-height:1.8;font-size:13px}
.v12StageChev{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin-bottom:14px}
.v12StageChev button{position:relative;display:flex;gap:10px;align-items:center;border:0;background:#EEF2F6;padding:12px 10px 12px 26px;cursor:pointer;text-align:left;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%)}
.v12StageChev button:first-child{clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%);padding-left:14px;border-radius:6px 0 0 6px}
.v12StageChev button i{width:26px;height:26px;flex-shrink:0;border-radius:50%;background:#fff;color:#26890D;font-style:normal;font-weight:700;display:grid;place-items:center;border:2px solid #86BC25}
.v12StageChev button b{display:block;font-size:13px}.v12StageChev button small{font-size:11px;color:var(--sub)}
.v12StageChev button.active{background:#86BC25}.v12StageChev button.active b,.v12StageChev button.active small{color:#fff}
.v12StageChev button.off{opacity:.55}.v12StageChev button.off i{border-color:#98A2B3;color:#98A2B3}
.v12Tornado>div{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 70px;gap:12px;align-items:center;padding:7px 0;border-bottom:1px solid #F2F4F7;font-size:12.5px}
.v12Tornado .l small{display:block;color:var(--sub);font-size:11px}
.v12Tornado .t{position:relative;height:14px;display:flex;justify-content:center}
.v12Tornado .t i{display:block;height:100%}.v12Tornado .t i.neg{background:#86BC25;margin-left:auto}.v12Tornado .t i.pos{background:#B7791F;margin-right:auto}
.v12Tornado .t::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;border-left:1px solid #667085}
.v12Tornado .v{text-align:right;font-weight:600}
.v12Checks{list-style:none;margin:0;padding:0}
.v12Checks li{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #F2F4F7;font-size:13px}
.v12Checks li i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;color:#fff;background:#26890D}
.v12Checks li.fail i{background:#D92D20}.v12Checks li{background:none!important;color:inherit!important}.v12Checks small{color:var(--sub);font-size:12px;text-align:right}
.v12Code0{font-family:Menlo,Consolas,monospace;font-size:12px;color:#475467}
.v12ModalBody{min-height:260px;padding-top:6px}
.v12CertGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
.v12Cert{background:#fff;border:1px solid var(--line);border-top:4px solid #86BC25;border-radius:8px;padding:16px;cursor:pointer;display:flex;flex-direction:column;gap:6px}
.v12Cert.off{border-top-color:#D0D5DD}.v12Cert:hover{box-shadow:0 4px 14px rgba(16,24,40,.08)}
.v12Cert .h{display:flex;justify-content:space-between;align-items:center}.v12Cert .h small{color:var(--sub);font-size:12px}
.v12Cert>b{font-size:15px}.v12Cert .val{font-size:18px;font-weight:700;color:#26890D}
.v12Cert dl{margin:4px 0 0;font-size:12px}.v12Cert dl div{display:grid;grid-template-columns:64px 1fr;gap:6px;padding:2px 0}.v12Cert dt{color:var(--sub)}.v12Cert dd{margin:0}
.v12Cert .file{color:#2C6AA0}
.v12CertView{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}
.v12CertFile{width:100%;height:420px;border:1px solid var(--line);object-fit:contain}
.v12CertPaper{border:8px double #86BC25;padding:28px 24px;text-align:center;font-family:"SimSun","Songti SC",serif;background:#FDFEFB}
.v12CertPaper .t{font-size:20px;font-weight:700;letter-spacing:2px;margin-bottom:14px}.v12CertPaper .t small{display:block;font-size:10px;letter-spacing:1px;color:#667085;font-family:Arial}
.v12CertPaper p{margin:6px 0;font-size:13px}.v12CertPaper .n{font-size:16px;font-weight:700}.v12CertPaper .v{font-size:22px;font-weight:700;color:#26890D;margin:14px 0}.v12CertPaper .o{margin-top:18px;font-weight:700}
.v12LcaCards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.v12LcaCards button{border:1px solid var(--line);background:#fff;border-radius:6px;padding:12px;text-align:left;cursor:pointer}
.v12LcaCards span{display:block;font-size:13px;color:var(--sub)}.v12LcaCards b{font-size:22px;color:#26890D}.v12LcaCards small{display:block;font-size:11px;color:var(--sub)}
@media(max-width:900px){.v12StageChev{grid-template-columns:1fr}.v12CertView,.v12BoundSeg{grid-template-columns:1fr}}
`;
  const el=document.createElement("style");el.id="v12ProductCss";el.textContent=css;document.head.appendChild(el);
})();
