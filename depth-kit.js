// 业务深度：审核记录、提交历史、产品目录、调和组分、认证记录、历年供应商协同、用户账号、供应商历史版本。
function seeded(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return ()=>(s=s*16807%2147483647)/2147483647;}
const HIST_F = {};
function histF(key){return HIST_F[key]||(HIST_F[key]={});}
function setHistF(key,field,value){histF(key)[field]=value;render();}
function histSelect(key,field,label,options) {
  const f=histF(key);
  return '<label>'+label+'<select onchange="setHistF(\''+key+'\',\''+field+'\',this.value)"><option value="">全部</option>'+options.map(o=>'<option '+(String(f[field]||"")===String(o)?'selected':'')+'>'+o+'</option>').join("")+'</select></label>';
}
function appendToContent(html){const content=document.getElementById("content");if(content)content.insertAdjacentHTML("beforeend",html);}

// ---------- 月度提交与审核记录 ----------
const REVIEW_MONTHS = [1,2,3,4,5,6,7,8,9];
function monthlyHistory() {
  if(monthlyHistory.cache)return monthlyHistory.cache;
  const tasks=workflowTasks().filter(task=>!task.locked&&task.scope!=="3");
  const rand=seeded(20261121),rows=[];
  tasks.forEach((task,ti)=>REVIEW_MONTHS.forEach(month=>{
    const day=3+Math.floor(rand()*5),submitted="2026-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    const returned=rand()<0.09;
    const reviewDay=Math.min(day+1+Math.floor(rand()*3),28);
    const base=(Number(demo.taskEntries?.[task.id]?.activity)||12000)/12,qty=Math.round(base*(0.86+rand()*0.28));
    const at=t=>"2026-"+String(month+1).padStart(2,"0")+"-"+String(t).padStart(2,"0");
    if(returned) {
      rows.push({month,task:task.name,id:task.id,org:task.org,owner:task.owner,unit:task.unit,qty,submitted:submitted+" 1"+(ti%9)+":2"+(month%6),reviewed:at(reviewDay)+" 09:4"+(month%6),result:"退回",
        note:["抄表数与结算单差异超过 2%，请核对","缺少当月结算凭证","计量单位与模板不一致"][Math.floor(rand()*3)]});
      rows.push({month,task:task.name,id:task.id,org:task.org,owner:task.owner,unit:task.unit,qty,submitted:at(Math.min(reviewDay+1,28))+" 15:1"+(ti%6),reviewed:at(Math.min(reviewDay+2,28))+" 10:0"+(month%6),result:"通过",note:"已补充凭证"});
    } else rows.push({month,task:task.name,id:task.id,org:task.org,owner:task.owner,unit:task.unit,qty,submitted:submitted+" 1"+(ti%9)+":3"+(month%6),reviewed:at(reviewDay)+" 1"+(month%5)+":15",result:"通过",note:""});
  }));
  return monthlyHistory.cache=rows.sort((a,b)=>b.submitted.localeCompare(a.submitted));
}
function historyCard(key,title,rows,showOwner) {
  const f=histF(key);
  const list=rows.filter(r=>(!f.month||r.month+" 月"===f.month)&&(!f.result||r.result===f.result)&&(!f.org||r.org===f.org));
  return '<section class="panel"><div class="panelHead"><h3>'+title+'</h3><span class="muted small">2026 年 1–9 月 · 通过 '+rows.filter(r=>r.result==="通过").length+' · 退回 '+rows.filter(r=>r.result==="退回").length+'</span></div>'+
    '<div class="taskToolbar">'+histSelect(key,"month","数据月份",REVIEW_MONTHS.map(m=>m+" 月"))+histSelect(key,"org","组织",[...new Set(rows.map(r=>r.org))])+histSelect(key,"result","审核结果",["通过","退回"])+'<span>'+list.length+' 条</span></div>'+
    '<div class="tableWrap"><table><thead><tr><th>数据月份</th><th>任务 / 排放源</th><th>组织</th>'+(showOwner?'<th>填报人</th>':'')+'<th>活动量</th><th>提交时间</th><th>审核时间</th><th>审核人</th><th>结果</th><th>意见</th></tr></thead><tbody>'+
    (list.length?list.map(r=>'<tr><td>2026-'+String(r.month).padStart(2,"0")+'</td><td><strong>'+textHtml(r.task)+'</strong><small>'+r.id+'</small></td><td>'+textHtml(r.org)+'</td>'+(showOwner?'<td>'+textHtml(r.owner)+'</td>':'')+'<td>'+fmt(r.qty,0)+' '+textHtml(r.unit)+'</td><td>'+r.submitted+'</td><td>'+r.reviewed+'</td><td>'+MANAGER_NAME+'</td><td><span class="status '+(r.result==="通过"?'ok':'bad')+'">'+r.result+'</span></td><td class="srcCell">'+textHtml(r.note||"—")+'</td></tr>').join(""):'<tr><td colspan="10" class="emptyCell">没有符合条件的记录</td></tr>')+
    '</tbody></table></div></section>';
}

// ---------- 产品目录 ----------
const PRODUCT_CATALOG = [
  ["GSL92-VIB","92# 车用汽油（国VI B）","成品油","1 t 出厂及燃烧使用",3860000,"已发布","92# 车用汽油（国VI B）"],
  ["HDPE-5000S","高密度聚乙烯树脂 HDPE 5000S","合成树脂","1 t 出厂",420000,"已发布","高密度聚乙烯树脂 HDPE 5000S"],
  ["GSL95-VIB","95# 车用汽油（国VI B）","成品油","1 t 出厂及燃烧使用",1920000,"建模中",""],
  ["DSL0-VI","0# 车用柴油（国VI）","成品油","1 t 出厂及燃烧使用",4650000,"建模中",""],
  ["JET-3","3# 喷气燃料","成品油","1 t 出厂及燃烧使用",1180000,"待建模",""],
  ["LNG-01","液化天然气","天然气","1 t 出厂",3200000,"待建模",""],
  ["LLDPE-7042","线性低密度聚乙烯 LLDPE 7042","合成树脂","1 t 出厂",360000,"待建模",""],
  ["PP-T30S","聚丙烯 PP T30S","合成树脂","1 t 出厂",510000,"待建模",""],
  ["MEG-01","乙二醇（聚酯级）","有机化工原料","1 t 出厂",280000,"待建模",""],
  ["PX-01","对二甲苯","有机化工原料","1 t 出厂",650000,"待建模",""],
  ["SBR-1502","丁苯橡胶 SBR 1502","合成橡胶","1 t 出厂",120000,"待建模",""],
  ["LUB-CK4","CK-4 柴油机油","润滑油","1 t 出厂",86000,"待建模",""],
  ["ASP-70","70# 道路石油沥青","沥青","1 t 出厂",940000,"待建模",""],
  ["PCK-01","石油焦（低硫）","石油焦","1 t 出厂",780000,"待建模",""],
  ["S-01","工业硫磺","副产品","1 t 出厂",410000,"待建模",""]
];
function productCatalogCard() {
  const f=histF("catalog");
  const rows=PRODUCT_CATALOG.filter(r=>(!f.status||r[5]===f.status)&&(!f.line||r[2]===f.line));
  return '<section class="panel"><div class="panelHead"><h3>产品目录</h3><span class="muted small">ERP 物料主数据 · 同步于 2026-11-20 02:00</span></div>'+
    '<div class="taskToolbar">'+histSelect("catalog","line","产品线",[...new Set(PRODUCT_CATALOG.map(r=>r[2]))])+histSelect("catalog","status","碳足迹状态",["已发布","建模中","待建模"])+'<span>'+rows.length+' 个产品</span></div>'+
    '<div class="tableWrap"><table><thead><tr><th>产品编码</th><th>产品名称</th><th>产品线</th><th>功能单位</th><th>2025 年销量</th><th>碳足迹状态</th><th></th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r[0]+'</td><td><strong>'+textHtml(r[1])+'</strong></td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+fmt(r[4],0)+'</td><td><span class="status '+({"已发布":"ok","建模中":"warn"}[r[5]]||"gray")+'">'+r[5]+'</span></td><td>'+
      (r[6]?'<button class="linkBtn" onclick="openCatalogModel(\''+textHtml(r[6])+'\')">查看模型</button>':'<button class="linkBtn" onclick="editLcaModel(true)">新建模型</button>')+'</td></tr>').join("")+
    '</tbody></table></div></section>';
}
function openCatalogModel(name) {
  const model=(demo.lcaModels||[]).find(m=>m.name===name);
  if(model)activeLcaId=model.id;
  go("产品碳排放","LCA建模与核算","模型库");
}

// ---------- 整机 BOM（ERP 同步） ----------
const P150_BOM = [
  ["1","C-01","自产原油（松原 / 鄂南）","API 34 · 硫 0.18%",420.2,"自产原油开采"],["1","C-02","进口原油（沙特轻质）","API 33 · 硫 1.9%",446.8,"进口原油开采及处理"],
  ["1","C-03","进口原油（伊拉克巴士拉）","API 29 · 硫 2.8%",213.6,"进口原油开采及处理"],["2","R-01","催化裂化汽油","辛烷值 RON 91",412.0,"催化裂化烧焦"],
  ["2","R-02","重整汽油","辛烷值 RON 102",298.0,"炼厂干气燃烧"],["2","R-03","烷基化油","RON 95",96.0,"炼厂干气燃烧"],["2","R-04","异构化油","RON 87",62.0,"炼厂干气燃烧"],
  ["2","R-05","加氢精制氢耗","H₂ 99.9%",3.6,"制氢装置"],["1","A-01","MTBE","纯度 98%",48.0,"MTBE 调和组分"],["1","A-02","抗氧剂","2,6-二叔丁基对甲酚",0.12,"截断（<1%）"],
  ["1","A-03","金属钝化剂","N,N'-二亚水杨基丙二胺",0.03,"截断（<1%）"],["1","A-04","清净剂","聚醚胺类",0.4,"截断（<1%）"]
];
function bomCard() {
  const total=P150_BOM.reduce((s,r)=>s+r[4],0),cut=P150_BOM.filter(r=>r[5].startsWith("截断")).reduce((s,r)=>s+r[4],0);
  return '<section class="panel"><div class="panelHead"><h3>调和组分及原料平衡 · 92# 车用汽油</h3><span class="muted small">调和配方 BL-2026-10 · '+P150_BOM.length+' 项 · 原油 '+fmt(P150_BOM.filter(r=>r[0]==='1'&&r[1].startsWith('C')).reduce((s,r)=>s+r[4],0),1)+' t / 千吨产品</span></div>'+
    '<div class="tableWrap"><table data-nopage><thead><tr><th>类别</th><th>物料编码</th><th>物料名称</th><th>规格</th><th>千吨产品用量 (t)</th><th>归入 LCA 活动</th></tr></thead><tbody>'+
    P150_BOM.filter(r=>r[4]>0).map(r=>'<tr><td>'+({1:'原料',2:'装置组分'}[r[0]])+'</td><td>'+r[1]+'</td><td><strong>'+r[2]+'</strong></td><td>'+r[3]+'</td><td>'+r[4]+'</td><td>'+(r[5].startsWith("截断")?'<span class="status gray">'+r[5]+'</span>':r[5])+'</td></tr>').join("")+
    '<tr class="totalRow"><td colspan="4">合计</td><td>'+fmt(total,2)+'</td><td>截断物料合计 '+fmt(cut,2)+' kg，按 ISO 14067 质量截断规则（单项 &lt;1%，累计 &lt;5%）</td></tr></tbody></table></div></section>';
}

// ---------- 认证记录 ----------
const CERT_HISTORY = [
  ["CFP-2025-1462","92# 车用汽油（国VI B）","ISO 14067:2018","中国质量认证中心","2025-07-22","2028-07-21","3,612 kgCO₂e/t（含燃烧）","有效"],
  ["CFP-2025-1463","0# 车用柴油（国VI）","ISO 14067:2018","中国质量认证中心","2025-07-22","2028-07-21","3,798 kgCO₂e/t（含燃烧）","有效"],
  ["EPD-2024-2207","HDPE 5000S","EN 15804+A2 / PCR 2019:14","EPD International","2024-12-03","2029-12-02","1,862 kgCO₂e/t","有效"],
  ["CFP-2024-0931","3# 喷气燃料（CORSIA 申报）","CORSIA 生命周期方法","SGS 通标标准","2024-08-16","2026-08-15","88.9 gCO₂e/MJ","已过期"],
  ["CFP-2023-0544","92# 车用汽油（国VI A）","ISO 14067:2018","中国质量认证中心","2023-06-12","2025-07-21","3,684 kgCO₂e/t（含燃烧）","已替换"],
  ["LCB-2023-0129","聚丙烯 PP T30S","低碳产品认证（T/CAB 0098）","中国质量认证中心","2023-10-09","2026-10-08","按牌号披露","续证中"]
];
function certHistoryCard() {
  return '<section class="panel"><div class="panelHead"><h3>认证记录</h3><span class="muted small">'+CERT_HISTORY.filter(r=>r[7]==="有效").length+' 张有效证书</span></div><div class="tableWrap"><table><thead><tr><th>证书编号</th><th>产品</th><th>依据标准</th><th>认证机构</th><th>发证日期</th><th>有效期至</th><th>声明值</th><th>状态</th></tr></thead><tbody>'+
    CERT_HISTORY.map(r=>'<tr><td>'+r[0]+'</td><td><strong>'+r[1]+'</strong></td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td>'+r[5]+'</td><td>'+r[6]+'</td><td><span class="status '+({"有效":"ok","续证中":"warn"}[r[7]]||"gray")+'">'+r[7]+'</span></td></tr>').join("")+'</tbody></table></div></section>';
}

// ---------- 历年供应商协同 ----------
function supplierHistoryRows() {
  if(supplierHistoryRows.cache)return supplierHistoryRows.cache;
  const rand=seeded(77031),rows=[];
  const names=[...new Set([...supplyScope3Items.map(r=>r.supplier),...PROCUREMENT.slice(0,16).map(r=>r.supplier)])];
  [2025,2024].forEach(year=>names.forEach((name,i)=>{
    if(year===2024&&i>9)return;
    const line=PROCUREMENT.find(r=>r.supplier===name)||{item:"采购件",category:"C01"};
    const r=rand(),status=r<0.72?"通过":r<0.85?"逾期未提交":"未通过";
    rows.push({year,supplier:name,item:line.item,category:line.category,status,submitted:status==="逾期未提交"?"—":year+1+"-0"+(2+Math.floor(rand()*3))+"-"+String(5+Math.floor(rand()*20)).padStart(2,"0"),
      method:status==="通过"?(rand()<0.5?"产品碳足迹报告":"工艺能耗法"):"—",dq:status==="通过"?["一级","一级","二级"][Math.floor(rand()*3)]:"—"});
  }));
  return supplierHistoryRows.cache=rows;
}
function supplierHistoryCard() {
  const f=histF("suphist"),all=supplierHistoryRows();
  const rows=all.filter(r=>(!f.year||String(r.year)===f.year)&&(!f.status||r.status===f.status));
  return '<section class="panel"><div class="panelHead"><h3>历年协同记录</h3><span class="muted small">2024 响应率 '+Math.round(all.filter(r=>r.year===2024&&r.status==="通过").length/all.filter(r=>r.year===2024).length*100)+'% · 2025 响应率 '+Math.round(all.filter(r=>r.year===2025&&r.status==="通过").length/all.filter(r=>r.year===2025).length*100)+'%</span></div>'+
    '<div class="taskToolbar">'+histSelect("suphist","year","年度",["2025","2024"])+histSelect("suphist","status","结果",["通过","未通过","逾期未提交"])+'<span>'+rows.length+' 条</span></div>'+
    '<div class="tableWrap"><table><thead><tr><th>年度</th><th>供应商</th><th>数据对象</th><th>范围三类别</th><th>提交日期</th><th>核算方法</th><th>数据等级</th><th>结果</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r.year+'</td><td><strong>'+textHtml(r.supplier)+'</strong></td><td>'+textHtml(r.item)+'</td><td>'+textHtml(categoryName(r.category))+'</td><td>'+r.submitted+'</td><td>'+r.method+'</td><td>'+r.dq+'</td><td><span class="status '+({"通过":"ok","未通过":"bad"}[r.status]||"gray")+'">'+r.status+'</span></td></tr>').join("")+'</tbody></table></div></section>';
}

// ---------- 供应商自己的历史批准版本 ----------
function supplierOwnHistoryCard() {
  const row=supplyScope3Items[supplierIdentity];if(!row)return "";
  const rand=seeded(4100+supplierIdentity*13);
  const unitNow=Number(row.unitCarbon)||1;
  const rows=[2025,2024,2023].map((year,i)=>{const unit=+(unitNow*(1+0.035*(i+1)+rand()*0.02)).toFixed(3),qty=Math.round((row.qty||100000)*(0.88-i*0.05+rand()*0.06));
    return {year,ver:"V"+(i===0?2:1),unit,qty,total:unit*qty/1000,approvedAt:(year+1)+"-0"+(3+i%2)+"-1"+(2+i),reviewer:MANAGER_NAME};});
  return '<section class="panel"><div class="panelHead"><h3>历年批准记录</h3><span class="muted small">客户 北辰石油 · '+textHtml(row.part)+'</span></div><div class="tableWrap"><table><thead><tr><th>年度</th><th>版本</th><th>单位碳排 (kgCO₂e/'+textHtml(row.unit)+')</th><th>活动量 ('+textHtml(row.unit)+')</th><th>排放 (tCO₂e)</th><th>批准时间</th><th>批准人</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r.year+'</td><td>'+r.ver+'</td><td>'+r.unit+'</td><td>'+fmt(r.qty,0)+'</td><td>'+fmt(r.total,3)+'</td><td>'+r.approvedAt+'</td><td>'+r.reviewer+'</td></tr>').join("")+'</tbody></table></div></section>';
}

// ---------- 用户账号 ----------
const USER_ACCOUNTS = [
  ["高文博","质量健康安全环保部","管理者","集团全部组织","2026-11-21 09:12","启用"],["王立群","采购中心","管理者（范围三）","采购中心、供应商","2026-11-20 17:45","启用"],
  ["刘建平","松原油田分公司 · 质量安全环保处","填报人","松原油田分公司","2026-11-21 08:36","启用"],["赵海峰","滨海石化分公司 · 生产技术处","填报人","滨海石化分公司、滨海石化热电厂","2026-11-21 08:02","启用"],
  ["孙卫东","西部管道分公司 · 生产运行处","填报人","西部管道分公司","2026-11-19 14:20","启用"],["顾敏","陇原石化分公司 · 动力科","填报人","陇原石化分公司","2026-11-18 10:41","启用"],
  ["许静","财务部","只读","集团全部组织","2026-11-15 16:08","启用"],["何志远","审计部","只读","集团全部组织","2026-10-30 11:22","启用"],
  ["李卫东","滨海石化热电厂 · 燃料部","填报人","滨海石化热电厂","2026-11-20 15:30","启用"],["孙佳","石油化工研究院","产品碳足迹","产品数据","2026-11-21 08:55","启用"],
  ["钱鹏","石油化工研究院","产品碳足迹","产品数据","2026-11-17 09:10","启用"],["朱丽","销售分公司","只读","产品数据","2026-11-02 13:48","启用"],
  ["许诺","渤海钢管有限公司","供应商","本企业","2026-11-14 10:20","启用"],["王海","华东催化剂有限公司","供应商","本企业","2026-11-20 16:12","启用"],
  ["蒋涛","海联油运有限公司","供应商","本企业","2026-11-12 09:36","启用"],["吴越","胜宇油田化学有限公司","供应商","本企业","2026-11-19 11:05","启用"],
  ["赵敏","原 · 陇原石化分公司","填报人","陇原石化分公司","2026-06-30 17:20","停用"],["德勤项目组","外部顾问","只读","集团全部组织","2026-11-10 10:00","启用"]
];
function userAccountsCard() {
  const f=histF("users");
  const rows=USER_ACCOUNTS.filter(r=>(!f.role||r[2]===f.role)&&(!f.status||r[5]===f.status));
  return '<section class="panel"><div class="panelHead"><h3>用户账号</h3><span class="muted small">统一身份认证 · 企业微信扫码登录</span></div>'+
    '<div class="taskToolbar">'+histSelect("users","role","角色",[...new Set(USER_ACCOUNTS.map(r=>r[2]))])+histSelect("users","status","状态",["启用","停用"])+'<span>'+rows.length+' 个账号</span></div>'+
    '<div class="tableWrap"><table><thead><tr><th>姓名</th><th>部门 / 单位</th><th>角色</th><th>数据范围</th><th>最近登录</th><th>状态</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td><strong>'+r[0]+'</strong></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td><span class="status '+(r[5]==="启用"?'ok':'gray')+'">'+r[5]+'</span></td></tr>').join("")+'</tbody></table></div></section>';
}

const renderBeforeDepth = render;
render = function () {
  renderBeforeDepth();
  if(!backendState.ready)return;
  const {top,group,page}=state;
  try {
    if(top==="组织碳排放"&&page==="审核队列"&&currentRole==="管理者")appendToContent(historyCard("review","审核记录",monthlyHistory(),true));
    else if(top==="组织碳排放"&&page==="填报任务"&&currentRole==="填报人")appendToContent(historyCard("mine","我的提交记录",monthlyHistory().filter(r=>r.owner===FILLER_NAME()),false));
    else if(top==="组织碳排放"&&page==="填报任务"&&currentRole==="管理者")appendToContent(historyCard("allsub","月度提交记录",monthlyHistory(),true));
    else if(top==="产品碳排放"&&page==="产品信息")appendToContent(productCatalogCard());
    else if(top==="产品碳排放"&&page==="BOM/物料清单"&&/汽油/.test(activeLca()?.name||""))appendToContent(bomCard());
    else if(top==="产品碳排放"&&group==="碳足迹认证管理")appendToContent(certHistoryCard());
    else if(top==="供应链碳排放"&&group==="供应商协同任务"&&currentRole==="管理者")appendToContent(supplierHistoryCard());
    else if(top==="供应链碳排放"&&group==="供应链因子中心"&&currentRole==="供应商")appendToContent(supplierOwnHistoryCard());
    else if(top==="基础配置"&&page==="用户角色")appendToContent(userAccountsCard());
  } catch(error){console.error(error);}
};
function FILLER_NAME(){return typeof fillerIdentity!=="undefined"?fillerIdentity:"刘建平";}
