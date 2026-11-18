const TOPS=["首页","组织碳排放","产品碳排放","供应链碳排放","基础配置","帮助中心"];
const MENUS={
"首页":{"首页总览":["系统总览"]},
"组织碳排放":{
"组织碳看板":["工作台"],
"盘查准备":["组织边界","核算边界","设施设备","排放源"],
"数据填报":["范围一填报","范围二填报","范围三填报","凭证管理"],
"供应链范围三联动":["供应链数据同步","采购件碳排映射","供应商数据审核结果","范围三类别归集"],
"核算分析":["标准切换核算","排放清单","类别分析","异常数据"],
"报告中心":["组织温室气体报告","范围三专项报告","清册导出"]},
"产品碳排放":{
"产品碳足迹看板":[],
"LCA建模与核算":["模型库","系统边界/算法说明"],
"产品数据管理":["产品信息","BOM/物料清单","零部件碳排数据","额外活动因子库"],
"产品碳足迹分析":["分布概览","数据质量评估清单"],
"产品报告中心":["数据质量分析报告","碳足迹评价报告"],
"碳足迹认证管理":[]},
"供应链碳排放":{
"供应链看板":[],
"供应商管理":[],
"供应商协同任务":[],
"采购件碳排放填报":[],
"供应链因子中心":[],
"供应链分析与报告":[]},
"基础配置":{
"因子库管理":["公共因子库","企业私域因子库","供应链因子导入"],
"指标模板配置":["填报因子","填报指标","填报模板","碳排放公式"],
"系统设置":["组织权限","用户角色","审批流程","字典单位"]},
"帮助中心":{"系统说明":["操作手册"]}
};
let state={top:"首页",group:"首页总览",page:"系统总览"};
let backendState={ready:false,error:"",data:null,standard:"GHG_PROTOCOL",calculation:null};

const mapData=[
["S01","填报因子台账：名称、分类、范围、GHG、单位、参考值、GWP","基础配置 / 指标模板配置 / 填报因子"],
["S02","碳填报指标：类别、指标名称、核算方式、指标释义、是否加密","基础配置 / 指标模板配置 / 填报指标"],
["S03","碳模板管理：模板、适用组织、时间颗粒度、填报项","基础配置 / 指标模板配置 / 填报模板"],
["S04","碳排放公式：核算方法和计算公式","基础配置 / 指标模板配置 / 碳排放公式"],
["S05-S06","碳任务列表与任务填报详情，含附件、状态、提交截止时间","组织碳排放 / 碳盘查填报 / 盘查任务、排放数据填报"],
["S07-S08","组织维护、计量点维护","组织碳排放 / 企业基础信息管理 / 盘查主体、计量点"],
["S09-S10","年度组织汇总、碳排放明细分析","组织碳排放 / 组织总览看板、碳排放分析"],
["S11-S12","碳绩效目标进度、目标排放量、排放强度、范围分布","组织碳排放 / 碳绩效管理"],
["S13-S15","清册报告列表与预览：组织边界、活动数据、因子、排放清册","组织碳排放 / 报告中心 / 清册报告"],
["S16-S17","产品碳足迹信息、整机LCA建模","产品碳排放 / 产品碳足迹看板、LCA建模与核算"],
["S18-S19","供应商碳足迹任务、采购件碳排填报","供应链碳排放 / 供应商协同任务、采购件碳排填报"],
["S20-S21","物料清单、标杆产品管理","产品碳排放 / 产品数据管理"],
["S22-S23","产品碳报告、LCA报告","产品碳排放 / 产品报告中心"],
["S24","Deloitte 核算边界管理样例，组织树匹配设备/设施","组织碳排放 / 企业基础信息管理 / 核算边界"],
["S25、S31","企业私域因子新增与企业因子库管理","基础配置 / 因子库管理 / 企业私域因子库"],
["S26-S30","组织排放填报、排放源排行、清单、类别分析、结构分析","组织碳排放 / 碳盘查填报、碳排放分析"],
["S32","温室气体排放报告模板","组织碳排放 / 报告中心 / 温室气体排放报告"],
["S33","新增 LCA 模型弹窗","产品碳排放 / LCA建模与核算 / 模型库"],
["S34","产品碳足迹看板：桑基图、贡献分析、清单、质量评估","产品碳排放 / 产品碳足迹看板、产品碳足迹分析"],
["S35","产品碳足迹评价报告模板，ISO 14067:2018","产品碳排放 / 产品报告中心 / 碳足迹评价报告"]
];

function esc(s){return String(s).replace(/'/g,"&#39;")}
function init(){
renderTop();renderSide();render();setupInteractions();
loadBackendData().then(()=>render()).catch(err=>{backendState.error=err.message;render();});
}
function go(top,group,page){
state.top=top;
let gs=Object.keys(MENUS[top]);
state.group=group||gs[0];
let children=MENUS[top][state.group]||[];
state.page=page||(children.length?children[0]:state.group);
renderTop();renderSide();render();
}
function renderTop(){document.getElementById("topNav").innerHTML=TOPS.map(t=>`<button class="${state.top===t?'active':''}" onclick="go('${t}')">${t}</button>`).join("")}
function renderSide(){
document.getElementById("sideTitle").innerText=state.top==="首页"?"Deloitte 碳排放管理系统":state.top;
document.getElementById("side").innerHTML=Object.entries(MENUS[state.top]).map(([g,ps])=>`<div class="group"><button class="group-btn ${state.group===g?'active':''}" onclick="go('${state.top}','${esc(g)}')"><span class="dot"></span>${g}</button>${ps.length?`<div class="sub">${ps.map(p=>`<button class="${state.group===g&&state.page===p?'active':''}" onclick="go('${state.top}','${esc(g)}','${esc(p)}')">${p}</button>`).join("")}</div>`:''}</div>`).join("")
}
function header(desc){
const crumb = state.page===state.group ? `${state.top} / ${state.group}` : `${state.top} / ${state.group} / ${state.page}`;
return `<div class="breadcrumb">${crumb}</div><div class="head"><div><h1>${state.page}</h1><p class="desc">${desc}</p></div><div class="actions"><button class="btn">查询</button><button class="btn">重置</button><button class="btn soft">展开/收起</button><button class="btn primary">新增/创建</button><button class="btn">导出</button></div></div>`;
}
function kpis(arr){return `<div class="grid kpis">${arr.map(i=>`<div class="card kpi"><div class="label">${i[0]}</div><div class="value">${i[1]}</div><div class="note">${i[2]}</div></div>`).join("")}</div>`}
function filters(arr){return `<div class="card" style="margin-bottom:16px"><div class="filters">${arr.map(f=>`<div class="field"><label>${f}</label><select><option>全部</option><option>集团总部</option><option>华东区域</option><option>制造事业部</option><option>供应商A</option></select></div>`).join("")}<button class="btn primary">查询</button><button class="btn">重置</button></div></div>`}
function status(c){let s=String(c); if(["启用","已发布","完成","已提交","通过","低","已认证","已归档","已收集","已自动关联"].includes(s))return`<span class="status ok">${s}</span>`; if(["填报中","审核中","核算中","待补充","中","草稿","待审核","进行中","待提交","待审核后关联"].includes(s))return`<span class="status warn">${s}</span>`; if(["逾期","高","异常","驳回","退回补充","未关联"].includes(s))return`<span class="status bad">${s}</span>`; if(["查看","下载","预览"].includes(s))return`<span class="status info">${s}</span>`; return s}
function table(title,heads,rows){
const hasAction=heads[heads.length-1]==="操作";
const actionLabels=["查看","下载","预览","编辑","删除","审核","修订","上传"];
return `<div class="card"><h3>${title}</h3><div class="tableWrap"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join("")}${hasAction?"":"<th>操作</th>"}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td>${hasAction&&i===r.length-1&&actionLabels.includes(String(c))?`<button class="btn">${c}</button>`:status(c)}</td>`).join("")}${hasAction?"":`<td><button class="btn">查看</button> <button class="btn">编辑</button> <button class="btn red">删除</button></td>`}</tr>`).join("")}</tbody></table></div></div>`;
}
function bars(labels=["范围一","范围二","范围三","能源间接","其他"],values=[62,48,75,53,36]){
return `<div class="card"><h3>趋势与排名</h3><div class="bars">${values.map(v=>`<div class="bar" style="height:${v*2}px"><b>${v}</b></div>`).join("")}</div><div class="xlabels">${labels.map(l=>`<span>${l}</span>`).join("")}</div></div>`;
}
function donut(title="结构分布"){
return `<div class="card"><h3>${title}</h3><div class="donutWrap"><div class="donut"></div><div class="legend"><div><span><i style="background:#86BC25"></i>范围一 / 原材料</span><b>42%</b></div><div><span><i style="background:#008A7A"></i>范围二 / 制造</span><b>23%</b></div><div><span><i style="background:#2C6AA0"></i>范围三 / 运输</span><b>19%</b></div><div><span><i style="background:#CBD5E1"></i>其他</span><b>16%</b></div></div></div></div>`;
}
function home(){
return `<div class="home"><div class="hero"><span class="badge">Deloitte Green Style</span><h1>Deloitte 碳排放管理系统</h1><p>统一覆盖组织、产品和供应链三类碳数据管理场景，围绕基础配置、任务填报、LCA核算、供应商协同、分析看板和报告输出形成闭环。</p><div class="entryGrid"><div class="entry" onclick="go('组织碳排放')"><h3>组织碳排放</h3><p>盘查边界、活动数据、排放清单、绩效目标与 ISO 14064 报告。</p></div><div class="entry" onclick="go('产品碳排放')"><h3>产品碳排放</h3><p>LCA模型、BOM、阶段贡献、热点识别与 ISO 14067 产品报告。</p></div><div class="entry" onclick="go('供应链碳排放')"><h3>供应链碳排放</h3><p>供应商任务、采购件填报、因子审核、质量评分和溯源报告。</p></div></div></div><div class="card"><h3>系统待办</h3><div class="miniGrid"><div class="mini">组织填报待办<b>42</b><span>较昨日 +8</span></div><div class="mini">供应商异常<b>13</b><span>4项高风险</span></div><div class="mini">报告草稿<b>7</b><span>待审核</span></div><div class="mini">因子更新<b>128</b><span>本月新增</span></div></div></div></div>${kpis([["年度组织排放","128,460","tCO₂e，同比 -4.8%"],["产品核算批次","326","覆盖 18 条产品线"],["供应商覆盖率","82%","核心供应商优先覆盖"],["绿电占比","36%","较上期 +6.4%"]])}<div class="grid two">${bars(["组织","产品","供应链","报告","配置"],[70,58,48,34,82])}${donut("组织/产品/供应链数据占比")}</div><div class="footer">© 2026. For information, contact Deloitte China.</div>`
}
function mapping(){
return `${header("S01-S35 按“碳系统截图”目录中文件名升序排列，用于校验页面功能与菜单位置。")}<div class="card" style="margin-bottom:16px"><h3>截图功能映射总表</h3><div class="tableWrap"><table><thead><tr><th>截图</th><th>页面功能</th><th>映射菜单</th></tr></thead><tbody>${mapData.map(r=>`<tr><td><b style="color:var(--green3)">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div></div><div class="mapGrid">${mapData.map(r=>`<div class="map"><div class="mapId">${r[0]}</div><div class="mapFunc">${r[1]}</div><div class="mapMenu">${r[2]}</div></div>`).join("")}</div>`;
}

async function api(path,options={}){
const res=await fetch(path,{headers:{"Content-Type":"application/json"},...options});
const data=await res.json();
if(!res.ok||data.error)throw new Error(data.error||`HTTP ${res.status}`);
return data;
}
async function loadBackendData(){
backendState.data=await api("/api/bootstrap");
backendState.ready=true;
backendState.calculation=await api(`/api/calculate?standard=${encodeURIComponent(backendState.standard)}`);
}
async function refreshBackend(){
await loadBackendData();
render();
showToast("SQLite 数据已刷新");
}
function needsBackend(){
if(backendState.ready)return "";
return `<div class="card"><h3>SQLite 后台连接</h3><p class="desc">${backendState.error?`连接失败：${backendState.error}`:"正在连接 SQLite 后台，请确认通过 python3 server.py 启动。"}</p></div>`;
}
function optionList(rows,valueKey,labelKey,selected){
return rows.map(row=>`<option value="${row[valueKey]}" ${String(row[valueKey])===String(selected)?"selected":""}>${row[labelKey]}</option>`).join("");
}
function categoryName(code){
return backendState.data.categories.find(i=>i.code===code)?.name||code;
}
function standardName(code){
return backendState.data.standards.find(i=>i.code===code)?.name||code;
}
function factorName(id){
return backendState.data.factors.find(i=>String(i.id)===String(id))?.name||id;
}
function substanceOptions(selected){
const rows=backendState.data?.substances?.length?backendState.data.substances:[{gas:"CO2"},{gas:"CH4"},{gas:"N2O"}];
return rows.map(row=>`<option value="${row.gas}" ${String(row.gas)===String(selected)?"selected":""}>${row.gas}</option>`).join("");
}
function sourceRowsFor(category){
return backendState.data.sources.filter(i=>i.category_code===category&&i.enabled);
}
const supplyScope3Items=[
{id:"SC-001",task:"T-S3-C01",supplier:"供应商A",part:"电池模组",category:"C01",source:"钢材采购",qty:12000,unit:"件",unitCarbon:226.4,total:2716.8,status:"已收集",sync:"已自动关联",evidence:"电池模组碳足迹证书.pdf"},
{id:"SC-002",task:"T-S3-C01",supplier:"供应商B",part:"铝型材",category:"C01",source:"钢材采购",qty:86,unit:"t",unitCarbon:9.2,total:791.2,status:"待审核",sync:"待审核后关联",evidence:"供应商B-铝型材.xlsx"},
{id:"SC-003",task:"T-S3-C04",supplier:"供应商F",part:"上游公路运输",category:"C04",source:"货物公路运输",qty:18400,unit:"t·km",unitCarbon:.087,total:1600.8,status:"已收集",sync:"已自动关联",evidence:"承运商里程单.pdf"},
{id:"SC-004",task:"T-S3-C01",supplier:"供应商C",part:"塑料件",category:"C01",source:"塑料 ABS",qty:24.8,unit:"t",unitCarbon:.113,total:2.8024,status:"退回补充",sync:"未关联",evidence:"-"}
];
function formatEmission(v){return Number(v).toLocaleString("zh-CN",{maximumFractionDigits:4})}
function organizationShell(desc,body){
return `${header(desc)}${body}`;
}
function assistButton(type){
return `<button class="helpIcon" type="button" title="辅助填报" onclick="assistTip('${type}')">?</button>`;
}
function assistTip(type){
const tips={
scope1:"默认因子：天然气 2.1622 kgCO₂e/Nm³。必填项：活动数据、单位、凭证。提交规则：保存草稿后可提交审核。",
scope2:"默认因子：华东电网 0.5703 kgCO₂e/kWh。必填项：活动数据、单位、凭证。提交规则：保存草稿后可提交审核。",
scope3:"C01、C04 数据来自供应商数据收集并自动关联到范围三任务；C05、C06、C07 等由组织手工补充。当前标准："+standardName(backendState.standard)
};
openModal(`<h2>辅助填报</h2><p class="modalText">${tips[type]||""}</p><div class="modalActions"><button class="btn primary" data-close-modal="1">知道了</button></div>`);
}
function orgWorkbench(){
if(!backendState.ready)return needsBackend();
const calc=backendState.calculation;
return organizationShell("组织碳排放工作台只保留结果、待办和快捷入口，复杂填报下沉到对应流程页面。",
`${kpis([["本期总排放",formatEmission(calc.total_emission),"tCO₂e / 当前标准口径"],["填报完成度","76%","范围一二 92%，范围三 58%"],["供应链待同步","3","已审核采购件可同步"],["报告状态","草稿","组织报告待确认"]])}
<div class="orgActionGrid">
  <div class="orgActionCard" onclick="go('组织碳排放','盘查准备','组织边界')"><b>盘查准备</b><span>维护组织边界、设施设备、排放源，先定义盘查对象。</span><em>进入准备</em></div>
  <div class="orgActionCard" onclick="go('组织碳排放','数据填报','范围一填报')"><b>范围一/二填报</b><span>按能源、燃料、制冷剂、电力等活动数据逐项填报。</span><em>开始填报</em></div>
  <div class="orgActionCard highlight" onclick="go('组织碳排放','供应链范围三联动','供应链数据同步')"><b>范围三供应链联动</b><span>审核通过的供应商和采购件碳数据，一键同步到组织范围三。</span><em>处理同步</em></div>
  <div class="orgActionCard" onclick="go('组织碳排放','核算分析','标准切换核算')"><b>标准核算</b><span>同一套活动数据按 GHG、ISO、国内指南自动重算。</span><em>查看核算</em></div>
</div>
<div class="grid two">${donut("范围一 / 范围二 / 范围三占比")}${table("本期关键待办",["事项","来源","责任人","截止时间","状态"],[["范围三 C01 采购件同步确认","供应链模块","碳数据管理员","2026-07-31","待审核"],["上海工厂外购电力凭证补充","组织填报","上海工厂","2026-07-30","待补充"],["国内指南口径报告复核","报告中心","ESG经理","2026-08-02","草稿"]])}</div>`);
}
function orgPreparation(){
const page=state.page;
const map={
"组织边界":["维护盘查主体和组织架构。",["组织","上级组织","类型","边界口径","状态"],[["集团总部","-","集团","运营控制法","启用"],["上海工厂","华东区域","生产基地","运营控制法","启用"],["苏州基地","华东区域","生产基地","运营控制法","待补充"]]],
"核算边界":["把组织、设施设备、计量点和排放源绑定到同一个核算边界。",["边界对象","关联设施","关联计量点","排放范围","状态"],[["上海工厂","锅炉房 / 空压站","G-002 / M-001","范围一/二","启用"],["苏州基地","生产线A / 仓储中心","M-019 / S-006","范围二","启用"],["总部办公区","办公室租赁资产","M-088","范围三 C08","待确认"]]],
"设施设备":["维护会产生或承载活动数据的设施、设备和计量点。",["名称","所属组织","类型","活动数据单位","状态"],[["锅炉 B-01","上海工厂","固定燃烧","Nm³","启用"],["电表 M-001","上海工厂","外购电力","kWh","启用"],["制冷机 R-03","总部办公区","制冷剂","kg","待审核"]]],
"排放源":["维护组织填报要选择的排放源，减少用户手工判断。",["排放源","范围","类别","默认因子","填报方式","状态"],[["天然气燃烧","范围一","固定燃烧","天然气排放因子","手工填报","启用"],["外购电力","范围二","购入电力","华东电网因子","账单导入","启用"],["采购件碳排","范围三","C01 外购商品和服务","供应商单位碳排","供应链同步","启用"]]]
}[page];
return organizationShell(map[0],`${filters(["组织","状态","范围","责任人"])}${table(page+"台账",map[1],map[2])}`);
}
function orgDataEntry(){
if(state.page==="范围三填报")return renderScope3CollectionNew();
if(state.page==="凭证管理")return organizationShell("统一管理活动数据对应发票、能源账单、仪表照片、供应商证明等凭证资料。",`${filters(["凭证类型","所属数据","组织","审核状态"])}${table("凭证清单",["凭证名称","关联范围","关联数据","上传人","审核状态"],[["2026-07电费账单.pdf","范围二","外购电力","张三","通过"],["天然气发票.jpg","范围一","天然气燃烧","李四","待审核"],["供应商A电池模组证书.pdf","范围三","C01 采购件同步","供应链模块","通过"]])}`);
const scope=state.page==="范围一填报"?"范围一":"范围二";
const rows=scope==="范围一"?[["天然气燃烧","上海工厂","8,620","Nm³","天然气发票.jpg","待审核"],["柴油叉车","苏州基地","1,280","L","柴油采购单.pdf","待提交"],["制冷剂泄漏","总部办公区","12","kg","维保记录.pdf","待补充"]]:[["外购电力","上海工厂","42,100","kWh","电费账单.pdf","通过"],["外购蒸汽","苏州基地","3,260","GJ","蒸汽结算单.pdf","待审核"],["绿电采购","集团总部","18,000","kWh","绿证.pdf","通过"]];
const tasks=rows.map((r,i)=>[`T-${scope==="范围一"?"S1":"S2"}-0${i+1}`,r[1],r[0],"2026-07",r[2],r[3],r[4],r[5]]);
return organizationShell(`${scope}填报页仅保留任务明细和必要填报信息。`,
`${filters(["组织","期间","排放源","状态"])}
${table(`${scope}填报任务明细 ${assistButton(scope==="范围一"?"scope1":"scope2")}`,["任务编号","组织","排放源","期间","活动数据","单位","凭证","状态"],tasks)}
<div class="card compactForm"><h3>${scope}任务填报 ${assistButton(scope==="范围一"?"scope1":"scope2")}</h3><div class="formGrid"><div class="field"><label>任务</label><select>${tasks.map(r=>`<option>${r[0]} / ${r[2]}</option>`).join("")}</select></div><div class="field"><label>活动数据</label><input value="1000"></div><div class="field"><label>单位</label><input value="${scope==="范围一"?"Nm³":"kWh"}"></div><div class="field wide"><label>凭证</label><input value="选择或上传凭证"></div></div><div class="actions" style="margin-top:12px"><button class="btn primary">保存</button><button class="btn soft">提交</button></div></div>`);
}
function renderScope3CollectionNew(){
if(!backendState.ready)return needsBackend();
const calc=backendState.calculation;
const categories=backendState.data.categories;
const selectedCategory=categories[0]?.code||"C01";
const linked=supplyScope3Items.filter(i=>i.sync==="已自动关联");
const taskRows=[
["T-S3-C01","C01 外购商品和服务","供应商数据收集",linked.filter(i=>i.category==="C01").length+" 条已关联","供应商B待审核 / 供应商C退回","进行中"],
["T-S3-C04","C04 上游运输配送","供应商数据收集",linked.filter(i=>i.category==="C04").length+" 条已关联","无","通过"],
["T-S3-C05","C05 运营中产生的废弃物","组织手工填报","0 条","需补充处置凭证","待提交"],
["T-S3-C06","C06 商务旅行","组织手工填报","1 条","差旅报销数据已导入","通过"],
["T-S3-C07","C07 员工通勤","组织手工填报","1 条","通勤问卷需复核","待审核"]
];
const supplierRows=supplyScope3Items.map(i=>[i.task,i.supplier,i.part,categoryName(i.category),i.qty,i.unit,formatEmission(i.total),i.status,i.sync]);
return organizationShell("范围三填报以任务为中心；供应商数据收集完成后自动显示到对应范围三任务。",
`${filters(["范围三类别","数据来源","任务状态","期间"])}
${table(`范围三填报任务明细 ${assistButton("scope3")}`,["任务编号","范围三类别","数据来源","当前数据","待处理","状态"],taskRows)}
${table("已关联供应商数据",["任务编号","供应商","数据对象","范围三类别","数量","单位","排放量(tCO₂e)","收集状态","关联状态"],supplierRows)}
<div class="card compactForm"><h3>手工任务填报 ${assistButton("scope3")}</h3><div class="formGrid">
  <div class="field"><label>任务</label><select><option>T-S3-C05 / 运营废弃物</option><option>T-S3-C06 / 商务旅行</option><option>T-S3-C07 / 员工通勤</option></select></div>
  <div class="field"><label>类别</label><select id="recordCategory" onchange="syncSourceOptions()">${optionList(categories,"code","name",selectedCategory)}</select></div>
  <div class="field"><label>排放源</label><select id="recordSource">${optionList(sourceRowsFor(selectedCategory),"id","name","")}</select></div>
  <div class="field"><label>活动数据</label><input id="recordActivity" type="number" value="100"></div>
  <div class="field"><label>气体</label><select id="recordGas">${substanceOptions("CO2")}</select></div>
  <div class="field wide"><label>凭证</label><input id="recordEvidence" value="附件凭证.pdf"></div>
  <input id="recordOrg" type="hidden" value="德勤中国 / ESG管理部"><input id="recordPeriod" type="hidden" value="2026-07"><textarea id="recordNote" style="display:none">组织范围三手工任务填报。</textarea>
</div><div class="actions" style="margin-top:12px"><button class="btn primary" type="button" onclick="saveScope3Record()">保存</button><button class="btn soft" type="button" onclick="saveScope3Record()">提交</button></div></div>`);
}
function orgSupplyLinkage(){
if(!backendState.ready)return needsBackend();
const page=state.page;
if(page==="供应链数据同步"){
return organizationShell("供应商数据收集模块完成后，数据自动显示到对应范围三任务；本页只做查看和追踪。",
`${filters(["供应商","范围三类别","收集状态","关联状态"])}
${table("供应商数据收集结果",["任务编号","供应商","数据对象","数量","单位","单位碳排","总排放","范围三任务","收集状态","关联状态"],supplyScope3Items.map(i=>[i.task,i.supplier,i.part,i.qty,i.unit,i.unitCarbon,formatEmission(i.total),categoryName(i.category),i.status,i.sync]))}
${table("范围三任务关联汇总",["任务编号","范围三类别","已关联数据","待处理数据","状态"],[["T-S3-C01","C01 外购商品和服务","供应商A 电池模组","供应商B待审核、供应商C退回补充","进行中"],["T-S3-C04","C04 上游运输配送","供应商F 上游公路运输","无","通过"]])}`);
}
if(page==="采购件碳排映射")return organizationShell("映射规则由供应链数据收集模板预设，组织侧只查看结果。",`${table("采购件映射规则",["数据对象","供应商","范围三任务","规则来源","状态"],supplyScope3Items.map(i=>[i.part,i.supplier,`${i.task} / ${categoryName(i.category)}`,"供应链数据收集模板",i.sync]))}`);
if(page==="供应商数据审核结果")return organizationShell("供应商审核在供应链模块完成；组织侧仅查看审核结果对范围三任务的影响。",`${table("供应商审核结果",["供应商","数据对象","凭证","质量评分","审核结论","范围三影响"],[["供应商A","电池模组", "证书完整", "92", "通过", "已关联 T-S3-C01"],["供应商B","铝型材", "缺少产量证明", "68", "待审核", "暂不计入 T-S3-C01"],["供应商C","塑料件", "因子来源缺失", "54", "退回补充", "未关联"],["供应商F","运输配送", "里程单完整", "86", "通过", "已关联 T-S3-C04"]])}`);
return organizationShell("范围三归集直接读取任务关联结果，避免重复手工判断。",`${table("范围三类别归集",["任务编号","类别","数据来源","关联结果","状态"],[["T-S3-C01","C01 外购商品和服务","供应商采购件数据","1 条已关联，2 条待处理","进行中"],["T-S3-C04","C04 上游运输配送","供应商物流数据","1 条已关联","通过"],["T-S3-C05","C05 运营废弃物","组织手工填报","待填报","待提交"],["T-S3-C06","C06 商务旅行","组织手工填报","已填报","通过"],["T-S3-C07","C07 员工通勤","组织手工填报","待审核","待审核"]])}`);
}
async function syncSupplyToScope3(id){
const item=supplyScope3Items.find(i=>i.id===id);
if(!item)return;
const source=backendState.data.sources.find(s=>s.category_code===item.category&&s.name===item.source)||backendState.data.sources.find(s=>s.category_code===item.category);
if(!source){showToast("未找到匹配排放源，请先维护排放源");return}
await api("/api/records",{method:"POST",body:JSON.stringify({
org:"德勤中国 / ESG管理部",
period:"2026-07",
category_code:item.category,
source_id:source.id,
activity_value:item.qty,
activity_unit:source.activity_unit,
gas:"CO2",
evidence:item.evidence,
note:`来自供应链模块：${item.supplier} / ${item.part}`
})});
await loadBackendData();
render();
showToast(`${item.part} 已同步到组织范围三`);
}
function orgCalculation(){
if(!backendState.ready)return needsBackend();
const calc=backendState.calculation;
if(state.page==="标准切换核算"){
return organizationShell("同一套组织活动数据按不同标准/指南切换核算，不需要用户重复填报。",
`${standardSwitchCard("切换标准后，系统自动选用对应 GWP、口径修正和公式重新计算。")}
${kpis([["当前口径总排放",formatEmission(calc.total_emission),"tCO₂e"],["核算标准",calc.standard.reporting_scope,calc.standard.name],["明细记录",calc.detail.length,"条活动数据"],["覆盖类别",calc.categories.length,"个范围三类别"]])}
${table("当前标准核算明细",["类别","排放源","活动数据","因子","GWP","口径修正","排放量(tCO₂e)"],calc.detail.map(r=>[categoryName(r.category_code),r.source_name,r.activity_value,r.factor_value,r.gwp_value,r.standard_adjustment,formatEmission(r.emission_tco2e)]))}`);
}
if(state.page==="排放清单"){
return organizationShell("清单按组织、期间、范围三类别、活动数据、因子和排放量展开，便于复核和导出。",
`${filters(["组织","期间","范围","类别"])}${table("组织碳排放清单",["组织","期间","类别","排放源","活动数据","单位","因子","排放量"],calc.detail.map(r=>[r.org,r.period,categoryName(r.category_code),r.source_name,r.activity_value,r.activity_unit,r.factor_value,formatEmission(r.emission_tco2e)]))}`);
}
if(state.page==="类别分析"){
return organizationShell("按范围三类别识别贡献热点，优先处理采购件和使用阶段等高贡献类别。",
`${kpis([["最大类别",calc.categories[0]?.category_name||"-","按当前排序"],["类别数量",calc.categories.length,"已产生排放"],["供应链相关","C01 / C04","已接入联动"],["数据质量","81.6","平均分"]])}<div class="grid two">${donut("类别贡献占比")}${table("类别贡献",["类别","排放量(tCO₂e)","占比"],calc.categories.map(c=>[c.category_name,formatEmission(c.emission_tco2e),c.share+"%"]))}</div>`);
}
return organizationShell("集中展示异常、缺失凭证、供应商审核未通过和范围三类别未映射的问题。",
`${table("异常数据列表",["异常类型","数据对象","来源","影响","处理建议","状态"],[["凭证缺失","供应商C 塑料件","供应链模块","不能同步至 C01","退回供应商补充因子证明","待补充"],["活动数据波动","供应商B 铝型材","供应链模块","需复核采购量","补充产量及能耗凭证","审核中"],["手工填报缺失","C07 员工通勤","组织填报","范围三覆盖不足","发起员工通勤问卷","待提交"],["标准口径确认","国内指南报告","报告中心","披露口径待确认","复核类别映射说明","草稿"]])}`);
}
function scope3Header(desc){
return `${header(desc)}<div class="card scopeSwitch"><div class="field"><label>核算标准 / 指南</label><select id="standardSelect" onchange="changeStandard(this.value)">${optionList(backendState.data.standards,"code","name",backendState.standard)}</select></div><div><b>${standardName(backendState.standard)}</b><p class="desc">${backendState.data.standards.find(i=>i.code===backendState.standard)?.guide||""}</p></div><button class="btn soft" type="button" onclick="refreshBackend()">刷新数据库</button></div>`;
}
function standardSwitchCard(desc){
return `<div class="card scopeSwitch"><div class="field"><label>核算标准 / 指南</label><select id="standardSelect" onchange="changeStandard(this.value)">${optionList(backendState.data.standards,"code","name",backendState.standard)}</select></div><div><b>${standardName(backendState.standard)}</b><p class="desc">${desc}</p><p class="desc">${backendState.data.standards.find(i=>i.code===backendState.standard)?.guide||""}</p></div><button class="btn soft" type="button" onclick="refreshBackend()">刷新数据库</button></div>`;
}
async function changeStandard(code){
backendState.standard=code;
backendState.calculation=await api(`/api/calculate?standard=${encodeURIComponent(code)}`);
render();
showToast(`已切换核算标准：${standardName(code)}`);
}
function renderScope3Collection(){
if(!backendState.ready)return needsBackend();
const calc=backendState.calculation;
const categories=backendState.data.categories;
const sources=backendState.data.sources;
const selectedCategory=categories[0]?.code||"C01";
return `${scope3Header("同一套范围三活动数据统一采集；切换 GHG、ISO 14064 或国内指南后，系统自动选用对应 GWP 和公式重算。")}
${kpis([["范围三总排放",calc.total_emission,"tCO₂e"],["已覆盖类别",`${calc.categories.length}/15`,"范围三类别"],["采集记录",backendState.data.records.length,"SQLite 记录"],["当前标准",calc.standard.reporting_scope,calc.standard.name]])}
<div class="grid twoEqual">
  <div class="card"><h3>新增范围三数据</h3>
    <div class="formGrid">
      <div class="field"><label>组织</label><input id="recordOrg" value="德勤中国 / ESG管理部"></div>
      <div class="field"><label>期间</label><input id="recordPeriod" value="2026-07"></div>
      <div class="field"><label>范围三类别</label><select id="recordCategory" onchange="syncSourceOptions()">${optionList(categories,"code","name",selectedCategory)}</select></div>
      <div class="field"><label>排放源</label><select id="recordSource">${optionList(sourceRowsFor(selectedCategory),"id","name","")}</select></div>
      <div class="field"><label>活动数据</label><input id="recordActivity" type="number" value="100"></div>
      <div class="field"><label>气体</label><select id="recordGas">${substanceOptions("CO2")}</select></div>
      <div class="field wide"><label>凭证/附件</label><input id="recordEvidence" value="附件凭证.pdf"></div>
      <div class="field full"><label>备注</label><textarea id="recordNote">范围三数据采集示例，可被不同标准重复核算。</textarea></div>
    </div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" onclick="saveScope3Record()">保存并重算</button></div>
  </div>
  <div class="card"><h3>15 类范围三覆盖状态</h3><div class="scopeCategoryGrid">${categories.map(c=>{const hit=calc.categories.find(i=>i.category_code===c.code);return `<div class="scopeCategory ${hit?"active":""}"><b>${c.code}</b><span>${c.name}</span><em>${hit?hit.emission_tco2e+" tCO₂e":"待采集"}</em></div>`}).join("")}</div></div>
</div>
${table("范围三采集记录",["ID","组织","期间","类别","排放源","活动数据","单位","气体","因子","凭证"],backendState.data.records.map(r=>[r.id,r.org,r.period,categoryName(r.category_code),r.source_name,r.activity_value,r.activity_unit,r.gas,factorName(r.factor_id),r.evidence||"-"]))}
${table("当前标准核算结果",["类别","排放源","活动数据","因子","GWP","口径修正","排放量(tCO₂e)"],calc.detail.map(r=>[categoryName(r.category_code),r.source_name,r.activity_value,r.factor_value,r.gwp_value,r.standard_adjustment,r.emission_tco2e]))}`;
}
function syncSourceOptions(){
const cat=document.getElementById("recordCategory").value;
document.getElementById("recordSource").innerHTML=optionList(sourceRowsFor(cat),"id","name","");
}
async function saveScope3Record(){
const source=backendState.data.sources.find(i=>String(i.id)===document.getElementById("recordSource").value);
await api("/api/records",{method:"POST",body:JSON.stringify({
org:document.getElementById("recordOrg").value,
period:document.getElementById("recordPeriod").value,
category_code:document.getElementById("recordCategory").value,
source_id:source.id,
activity_value:document.getElementById("recordActivity").value,
activity_unit:source.activity_unit,
gas:document.getElementById("recordGas").value,
evidence:document.getElementById("recordEvidence").value,
note:document.getElementById("recordNote").value
})});
await loadBackendData();
render();
showToast("范围三活动数据已写入 SQLite，并完成当前标准重算");
}
function orgOverview(){
const desc={
"数据总览":"展示组织碳排放年度总览、节碳量、绿电占比、排放源排行和目标达成情况。"}[state.page];
return `${header(desc)}${kpis([["年度排放","128,460","tCO₂e"],["同比变化","-4.8%","低于去年同期"],["目标完成率","78%","距年度目标 22%"],["绿电占比","36%","较上期 +6.4%"]])}<div class="grid two">${bars(["范围一","范围二","范围三","华东","华南"],[62,45,70,52,38])}${donut("排放结构")}</div>${table("组织排放排行",["组织","范围一","范围二","范围三","总排放","目标进度"],[["上海工厂","18,420","26,110","9,820","54,350","76%"],["苏州基地","12,130","18,900","6,410","37,440","82%"],["广州工厂","9,840","15,260","4,280","29,380","69%"]])}`;
}
function baseInfo(){
if(state.page==="核算边界")return `${header("组织树匹配设备/设施与计量点，形成可追溯的核算边界。")}<div class="treeLayout"><div class="tree"><b>组织树</b><ul><li class="active">集团总部</li><li>华东区域<ul><li>上海工厂</li><li>苏州基地</li></ul></li><li>华南区域<ul><li>广州工厂</li><li>深圳办公室</li></ul></li></ul></div><div class="canvas"><div class="node green">集团总部</div><br><div class="node blue">上海工厂</div><div class="node">锅炉房</div><div class="node">空压站</div><div class="node teal">电表 M-001</div><div class="node teal">燃气表 G-002</div><br><div class="node blue">苏州基地</div><div class="node">生产线 A</div><div class="node">仓储中心</div><div class="node teal">电表 M-019</div><div class="node teal">蒸汽计量点 S-006</div><div class="card" style="box-shadow:none;margin-top:22px"><h3>边界口径</h3><p class="desc">支持控制权法、运营控制法、股权比例法；边界可关联排放源、设备设施、计量点与填报任务。</p></div></div></div>`;
if(state.page==="背景资料上传")return `${header("集中上传营业执照、厂区平面图、能源账单、设备清单、组织边界说明等背景资料。")}${filters(["资料类型","所属组织","上传状态","年度"])}${table("背景资料清单",["资料名称","资料类型","所属组织","上传人","版本","状态"],[["营业执照.pdf","主体证明","集团总部","张三","V2.0","已归档"],["上海工厂能源账单.xlsx","能源凭证","上海工厂","李四","V1.1","待审核"],["厂区平面图.dwg","边界资料","苏州基地","王五","V1.0","启用"]])}`;
if(state.page==="盘查主体/组织架构")return `${header("维护盘查主体、组织层级、法人实体、经营场所和管理口径。")}${kpis([["盘查主体","38","法人实体 + 分支机构"],["组织层级","4","集团/区域/基地/车间"],["已启用组织","34","占比 89%"],["待补资料","6","组织边界说明缺失"]])}${table("组织架构台账",["组织名称","上级组织","组织类型","法人主体","地址","状态"],[["集团总部","-","集团","是","北京","启用"],["上海工厂","华东区域","生产基地","否","上海","启用"],["苏州基地","华东区域","生产基地","否","苏州","待补充"]])}`;
return `${header("维护设备、设施、计量点与排放源的关系，支撑活动数据填报。")}${filters(["组织","设备类型","能源类型","启用状态"])}${table(state.page+"台账",["名称","所属组织","类型","关联排放源","计量单位","状态"],[["锅炉 B-01","上海工厂","固定燃烧","天然气","Nm³","启用"],["空压机 A-03","苏州基地","耗电设备","外购电力","kWh","启用"],["电表 M-001","广州工厂","计量点","外购电力","kWh","待审核"]])}`;
}
function inventory(){
if(state.page==="凭证管理")return `${header("统一管理活动数据对应发票、能源账单、仪表照片、供应商证明等凭证资料。")}${filters(["凭证类型","所属任务","组织","审核状态"])}${table("凭证资料清单",["凭证名称","凭证类型","所属数据","上传人","上传时间","审核状态"],[["2026-01电费账单.pdf","能源账单","外购电力","张三","2026-02-03","通过"],["天然气发票.jpg","发票","天然气消耗","李四","2026-02-04","待审核"],["柴油采购合同.pdf","合同","移动燃烧","王五","2026-02-07","驳回"]])}`;
if(state.page==="基准年及补充说明")return `${header("管理基准年选择、基准年排放量、重算说明和特殊事项补充披露。")}<div class="grid twoEqual"><div class="card"><h3>基准年设置</h3><div class="formGrid"><div class="field"><label>基准年</label><select><option>2023</option></select></div><div class="field"><label>重算触发</label><select><option>组织边界变化</option></select></div><div class="field"><label>确认状态</label><select><option>待确认</option></select></div><div class="field full"><label>补充说明</label><textarea>因收购新增两家生产主体，基准年排放量需按组织边界变化重算。</textarea></div></div></div>${donut("基准年范围分布")}</div>${table("基准年记录",["组织","基准年","原排放量","调整后排放量","调整原因","状态"],[["集团总部","2023","118,200","124,860","边界变化","待审核"],["上海工厂","2023","45,100","45,100","无调整","通过"]])}`;
return `${header("管理组织碳盘查任务与排放数据填报详情，含附件、状态、提交截止时间和审批流程。")}${filters(["任务类型","所属组织","填报状态","截止时间"])}${kpis([["待填报任务","26","其中逾期 3"],["已提交数据","1,286","活动数据记录"],["附件完整率","91%","较上月 +5%"],["审核通过率","87%","一次通过率"]])}${table("盘查任务与填报明细",["任务名称","适用组织","数据类型","开始时间","截止时间","状态"],[["2026年度组织碳盘查","集团及下属单位","范围一/二/三","2026-01-01","2026-02-28","填报中"],["范围二电力补充填报","上海工厂","外购电力","2026-03-01","2026-03-10","待提交"],["运输活动数据补录","华南区域","范围三运输","2026-03-05","2026-03-25","审核中"]])}`;
}
function analysis(){
if(state.page==="碳排放清单")return `${header("形成按组织、范围、类别、活动数据、排放因子和排放量展开的碳排放清单。")}${filters(["组织","年度","排放范围","排放类别"])}${table("碳排放清单",["组织","范围","类别","活动数据","单位","排放因子","排放量"],[["上海工厂","范围一","天然气燃烧","8,620","Nm³","2.1622","18.64"],["苏州基地","范围二","外购电力","42,100","kWh","0.5703","24.01"],["广州工厂","范围三","运输配送","12,400","吨公里","0.087","1.08"]])}`;
const titles={"数据总览":"按组织和时间展示总体排放趋势、范围分布与关键指标。","类别分析":"按 GHG 类别、能源类别和活动类型分析排放贡献。","结构分析":"拆解范围一、范围二、范围三及能源结构，识别排放构成变化。","排放源分析":"定位高排放源、异常排放源和重点减排对象。"};
return `${header(titles[state.page]||"碳排放分析")} ${kpis([["总排放","128,460","tCO₂e"],["最大类别","外购电力","占比 38%"],["异常源","6","较上月 -2"],["清单完整率","94%","待补充 6%"]])}<div class="grid two">${bars(["天然气","外购电力","柴油","运输","制冷剂"],[43,76,32,54,18])}${donut(state.page+"结构")}</div>${table("分析明细",["组织","排放源","类别","本期排放","环比","贡献率"],[["上海工厂","外购电力","范围二","26,110","-3.2%","20.3%"],["苏州基地","天然气锅炉","范围一","12,130","+4.5%","9.4%"],["广州工厂","运输配送","范围三","4,280","+1.2%","3.3%"]])}`;
}
function performance(){
if(state.page==="目标设置")return `${header("设置集团、区域、组织和排放源层面的碳排放目标、强度目标、绿电目标与节碳目标。")}<div class="grid twoEqual"><div class="card"><h3>目标设置表单</h3><div class="formGrid"><div class="field"><label>目标对象</label><select><option>集团总部</option></select></div><div class="field"><label>目标类型</label><select><option>年度总量目标</option><option>排放强度目标</option></select></div><div class="field"><label>目标年度</label><select><option>2026</option></select></div><div class="field"><label>目标值</label><input value="120000 tCO₂e"></div><div class="field wide"><label>目标说明</label><input value="较2023年基准年下降8%"></div></div></div>${donut("目标类型分布")}</div>${table("目标台账",["对象","目标类型","基准值","目标值","当前值","状态"],[["集团总部","总量目标","124,860","120,000","128,460","进行中"],["上海工厂","强度目标","0.82","0.75","0.78","进行中"]])}`;
return `${header("跟踪目标进度、目标排放量、排放强度和范围分布，辅助制定减排计划。")}${kpis([["年度目标","120,000","tCO₂e"],["当前排放","128,460","超目标 7.1%"],["计划节碳","8,920","tCO₂e"],["进度达成","78%","较计划滞后 6%"]])}<div class="grid two">${bars(["Q1","Q2","Q3","Q4","年度目标"],[52,64,70,78,100])}${donut("目标差距来源")}</div>${table("减排计划",["计划名称","责任组织","减排措施","预计节碳","计划完成","状态"],[["绿电采购计划","集团采购部","提升绿电比例","4,500","2026-09-30","进行中"],["锅炉能效改造","上海工厂","设备升级","2,100","2026-08-15","待提交"],["物流路线优化","华南区域","运输优化","860","2026-07-30","审核中"]])}`;
}
function renderStandardReport(){
if(!backendState.ready)return needsBackend();
const calc=backendState.calculation;
return `${scope3Header("基于同一套范围三采集数据，按选定标准/指南自动生成报告摘要、分类清单和可追溯明细。")}
<div class="grid two">
  <div class="cover"><div class="coverLogo">Deloitte</div><div class="coverTitle">${standardName(backendState.standard)} 范围三核算报告</div><div class="coverSub">Scope 3 Data Collection & Calculation Report</div><div class="coverMeta">报告主体：德勤中国 / ESG管理部<br>报告期间：2026-07<br>总排放：${calc.total_emission} tCO₂e<br>数据库：SQLite / data/carbon.db</div></div>
  <div class="card"><h3>报告生成</h3><p class="desc">${calc.standard.guide}</p><div class="timeline" style="margin-top:14px"><div class="step" data-n="1"><h4>采集</h4><p>同一套范围三活动数据。</p></div><div class="step" data-n="2"><h4>切换</h4><p>选择 GHG / ISO / 国内指南。</p></div><div class="step" data-n="3"><h4>核算</h4><p>匹配因子、GWP 和公式。</p></div><div class="step" data-n="4"><h4>报告</h4><p>生成报告并写入 SQLite。</p></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="button" onclick="generateScope3Report()">生成报告</button><button class="btn" type="button" onclick="exportFirstTable()">导出明细</button></div></div>
</div>
${table("报告分类汇总",["类别","排放量(tCO₂e)","占比"],calc.categories.map(c=>[c.category_name,c.emission_tco2e,c.share+"%"]))}
${table("已生成报告记录",["ID","标准","组织","期间","总排放","生成时间"],backendState.data.reports.map(r=>[r.id,standardName(r.standard_code),r.org,r.period,r.total_emission,r.created_at]))}`;
}
async function generateScope3Report(){
const result=await api("/api/reports",{method:"POST",body:JSON.stringify({standard_code:backendState.standard,org:"德勤中国 / ESG管理部",period:"2026-07"})});
await loadBackendData();
render();
showToast(`已生成报告 #${result.id}，并写入 SQLite`);
}
function report(){
const product=state.top==="产品碳排放";
const std=product?"ISO 14067:2018":"ISO 14064-1:2018";
const title=product?(state.page==="碳足迹评价报告"?"产品碳足迹评价报告":state.page):state.page;
return `${header(`报告封面统一使用绿色 Deloitte 风格；${product?"产品报告":"组织报告"}基于 ${std}。`)}<div class="grid two"><div class="cover"><div class="coverLogo">Deloitte</div><div class="coverTitle">${title}</div><div class="coverSub">Carbon Emission Management System</div><div class="coverMeta">标准依据：${std}<br>报告期间：2026年度 / 2026Q2<br>版本：V1.0 草稿</div></div>${table("报告列表",["报告名称","报告类型","对象","期间","状态","操作"],[[title,"标准报告",product?"A100整机":"集团总部","2026","草稿","预览"],["清册明细附件","附表",product?"BOM清单":"组织清单","2026","审核中","下载"],["数据质量分析报告","质量报告",product?"A100整机":"上海工厂","2026Q2","已发布","查看"]])}</div>`;
}
function lca(){
if(state.page==="系统边界/算法说明")return `${header("维护产品系统边界、生命周期阶段、分配规则、数据取舍原则与算法说明。")}<div class="grid twoEqual"><div class="card"><h3>边界与算法说明</h3><div class="formGrid"><div class="field"><label>生命周期边界</label><select><option>Cradle-to-Gate</option><option>Cradle-to-Grave</option></select></div><div class="field"><label>分配方法</label><select><option>质量分配</option><option>经济价值分配</option></select></div><div class="field"><label>GWP版本</label><select><option>IPCC AR6</option></select></div><div class="field full"><label>算法说明</label><textarea>总碳足迹 = Σ(活动数据 × 排放因子 × GWP)；多产出过程按质量分配法分摊。</textarea></div></div></div>${donut("生命周期边界覆盖")}</div>${table("算法版本",["版本","适用模型","GWP","分配方法","发布时间","状态"],[["V1.0","整机模型","AR6","质量分配","2026-01-12","启用"],["V1.1","部件模型","AR6","经济价值分配","2026-03-18","待审核"]])}`;
return `${header("围绕模型库、整机产品和部件产品建立 LCA 核算流程，支持模型版本与新增模型弹窗。")}${filters(["产品类型","模型状态","核算批次","生命周期阶段"])}<div class="grid two"><div class="card"><h3>LCA 建模流程</h3><div class="timeline"><div class="step" data-n="1"><h4>目标与范围</h4><p>产品范围、功能单位、系统边界。</p></div><div class="step" data-n="2"><h4>清单分析</h4><p>BOM、能源、运输、废弃处理。</p></div><div class="step" data-n="3"><h4>影响评价</h4><p>因子匹配、GWP转换、热点贡献。</p></div><div class="step" data-n="4"><h4>解释报告</h4><p>质量评估、认证材料、报告输出。</p></div></div></div><div class="card"><h3>新增 LCA 模型</h3><div class="formGrid"><div class="field"><label>模型名称</label><input value="整机产品 LCA 模型 V1.0"></div><div class="field"><label>产品类型</label><select><option>整机产品</option><option>部件产品</option></select></div><div class="field"><label>标准依据</label><select><option>ISO 14067:2018</option></select></div><div class="field full"><label>系统边界</label><textarea>覆盖原材料获取、制造、运输、使用及报废处理。</textarea></div></div></div></div>${table("LCA模型库",["模型名称","产品类型","功能单位","边界","版本","状态"],[["A100整机LCA模型","整机产品","kgCO₂e/台","Cradle-to-Grave","V1.0","启用"],["电池模组LCA模型","部件产品","kgCO₂e/件","Cradle-to-Gate","V0.9","待审核"],["包装材料模型","部件产品","kgCO₂e/kg","Cradle-to-Gate","V1.2","启用"]])}`;
}

function realSankey(){
return `<div class="realSankey">
<svg viewBox="0 0 1180 390" preserveAspectRatio="none">
  <defs>
    <linearGradient id="m1" x1="0" x2="1"><stop offset="0%" stop-color="#00B894"/><stop offset="100%" stop-color="#F6D743"/></linearGradient>
    <linearGradient id="m2" x1="0" x2="1"><stop offset="0%" stop-color="#F6D743"/><stop offset="100%" stop-color="#35C7D4"/></linearGradient>
    <linearGradient id="m3" x1="0" x2="1"><stop offset="0%" stop-color="#35C7D4"/><stop offset="100%" stop-color="#6F63D9"/></linearGradient>
    <linearGradient id="m4" x1="0" x2="1"><stop offset="0%" stop-color="#6F63D9"/><stop offset="100%" stop-color="#FF8A3D"/></linearGradient>
    <linearGradient id="g2" x1="0" x2="1"><stop offset="0%" stop-color="#56CCF2"/><stop offset="100%" stop-color="#2F80ED"/></linearGradient>
    <linearGradient id="g3" x1="0" x2="1"><stop offset="0%" stop-color="#F2994A"/><stop offset="100%" stop-color="#F2C94C"/></linearGradient>
    <linearGradient id="g4" x1="0" x2="1"><stop offset="0%" stop-color="#BB6BD9"/><stop offset="100%" stop-color="#9B51E0"/></linearGradient>
  </defs>

  <!-- column titles -->
  <text class="stageTitle" x="40" y="28">输入数据</text>
  <text class="stageTitle" x="285" y="28">清单建模</text>
  <text class="stageTitle" x="545" y="28">生命周期阶段</text>
  <text class="stageTitle" x="810" y="28">碳足迹结果</text>
  <text class="stageTitle" x="1010" y="28">热点贡献</text>

  <!-- left to inventory -->
  <path class="flowPath main" d="M135,95 C210,95 230,92 305,92" stroke="url(#m1)" stroke-width="54"/>
  <path class="flowPath" d="M135,175 C210,175 230,172 305,150" stroke="#7DDDC5" stroke-width="36"/>
  <path class="flowPath" d="M135,250 C210,250 230,232 305,205" stroke="#9BE7D3" stroke-width="28"/>
  <path class="flowPath" d="M135,315 C212,315 236,278 305,252" stroke="#C7F2E5" stroke-width="18"/>

  <!-- inventory to lifecycle -->
  <path class="flowPath main" d="M335,92 C420,92 455,78 550,78" stroke="url(#m2)" stroke-width="78"/>
  <path class="flowPath" d="M335,150 C420,150 460,145 550,145" stroke="#F8E36D" stroke-width="42"/>
  <path class="flowPath" d="M335,205 C420,205 460,215 550,215" stroke="#F6C75F" stroke-width="30"/>
  <path class="flowPath" d="M335,252 C420,252 460,286 550,292" stroke="#F9E9A8" stroke-width="20"/>

  <!-- lifecycle to result -->
  <path class="flowPath main" d="M580,78 C680,78 720,88 815,96" stroke="url(#m3)" stroke-width="112"/>
  <path class="flowPath" d="M580,145 C680,145 720,145 815,145" stroke="#7CDCE4" stroke-width="44"/>
  <path class="flowPath" d="M580,215 C680,215 720,205 815,195" stroke="#86D5F7" stroke-width="30"/>
  <path class="flowPath" d="M580,292 C680,292 720,250 815,230" stroke="#C9EAFE" stroke-width="18"/>

  <!-- result to hotspots: ordered and non-crossing -->
  <path class="flowPath main" d="M845,96 C910,96 940,76 1015,74" stroke="url(#m4)" stroke-width="62"/>
  <path class="flowPath main" d="M845,118 C915,126 945,138 1015,140" stroke="#FFB16A" stroke-width="46"/>
  <path class="flowPath" d="M845,155 C920,178 950,188 1015,190" stroke="#F7A9A8" stroke-width="32"/>
  <path class="flowPath" d="M845,195 C920,218 950,238 1015,242" stroke="url(#g2)" stroke-width="24"/>
  <path class="flowPath" d="M845,232 C920,265 950,296 1015,306" stroke="url(#g4)" stroke-width="20"/>

  <!-- nodes column 1 -->
  <g class="node">
    <rect x="34" y="70" width="12" height="52" fill="#00B894"/><text x="52" y="91">原材料数据</text><text class="valueLabel" x="52" y="109">599.3 kgCO₂e</text>
    <rect x="34" y="156" width="12" height="38" fill="#2ECCB3"/><text x="52" y="172">能源数据</text><text class="valueLabel" x="52" y="190">289.4 kgCO₂e</text>
    <rect x="34" y="234" width="12" height="32" fill="#6BE2C8"/><text x="52" y="249">运输数据</text><text class="valueLabel" x="52" y="267">184.7 kgCO₂e</text>
    <rect x="34" y="304" width="12" height="24" fill="#A7EBD9"/><text x="52" y="318">废弃处理</text><text class="valueLabel" x="52" y="336">175.2 kgCO₂e</text>
  </g>

  <!-- nodes column 2 -->
  <g class="node">
    <rect x="305" y="52" width="14" height="80" fill="#F6D743"/><text x="326" y="82">BOM / 物料清单</text><text class="valueLabel" x="326" y="102">占比 48.0%</text>
    <rect x="305" y="128" width="14" height="44" fill="#F8E36D"/><text x="326" y="148">制造活动数据</text><text class="valueLabel" x="326" y="166">占比 23.2%</text>
    <rect x="305" y="190" width="14" height="34" fill="#F6C75F"/><text x="326" y="208">物流活动数据</text><text class="valueLabel" x="326" y="226">占比 14.8%</text>
    <rect x="305" y="242" width="14" height="24" fill="#F9E9A8"/><text x="326" y="258">回收处置数据</text><text class="valueLabel" x="326" y="276">占比 14.0%</text>
  </g>

  <!-- nodes column 3 -->
  <g class="node">
    <rect x="550" y="32" width="14" height="92" fill="#35C7D4"/><text x="572" y="70">原材料获取</text><text class="valueLabel" x="572" y="88">48.0%</text>
    <rect x="550" y="124" width="14" height="46" fill="#62D6E0"/><text x="572" y="146">产品制造</text><text class="valueLabel" x="572" y="164">23.2%</text>
    <rect x="550" y="198" width="14" height="34" fill="#8DDEF2"/><text x="572" y="218">运输配送</text><text class="valueLabel" x="572" y="236">14.8%</text>
    <rect x="550" y="280" width="14" height="26" fill="#C9EAFE"/><text x="572" y="298">报废处理</text><text class="valueLabel" x="572" y="316">14.0%</text>
  </g>

  <!-- result node -->
  <g class="node">
    <rect x="815" y="56" width="16" height="198" fill="#6F63D9"/>
    <text x="840" y="118">A100 整机产品碳足迹</text>
    <text class="valueLabel" x="840" y="138">1,248.6 kgCO₂e / 台</text>
    <text class="valueLabel" x="840" y="158">数据质量评分 86.4</text>
  </g>

  <!-- hotspot nodes -->
  <g class="node">
    <rect x="1015" y="44" width="14" height="62" fill="#FF8A3D"/><text x="1037" y="70">铝合金外壳</text><text class="valueLabel" x="1037" y="88">301.8 / 24.2%</text>
    <rect x="1015" y="118" width="14" height="48" fill="#FFA85E"/><text x="1037" y="140">电池模组</text><text class="valueLabel" x="1037" y="158">226.4 / 18.1%</text>
    <rect x="1015" y="174" width="14" height="34" fill="#F7A9A8"/><text x="1037" y="194">制造用电</text><text class="valueLabel" x="1037" y="212">144.9 / 11.6%</text>
    <rect x="1015" y="230" width="14" height="28" fill="#56CCF2"/><text x="1037" y="246">运输配送</text><text class="valueLabel" x="1037" y="264">104.9 / 8.4%</text>
    <rect x="1015" y="292" width="14" height="24" fill="#BB6BD9"/><text x="1037" y="310">其他项目</text><text class="valueLabel" x="1037" y="328">470.6 / 37.7%</text>
  </g>

  <!-- clean summary box -->
  <rect class="captionBox" x="34" y="350" width="470" height="28"/>
  <text class="captionText" x="48" y="369">说明：流线宽度按碳足迹贡献比例近似展示；从左至右依次为输入数据、清单建模、生命周期阶段、结果汇总与热点贡献。</text>
</svg>
</div>`;
}

function productDash(){
return `${header("展示产品碳足迹数据总览，包括产品选择、核算批次、功能单位、总碳足迹、阶段占比、热点贡献和质量评分。")}${kpis([["当前产品","A100 整机","功能单位：kgCO₂e/台"],["总碳足迹","1,248.6","较标杆高 12.7%"],["最高阶段","原材料获取","贡献 48%"],["质量评分","86.4","达到报告阈值"]])}<div class="card"><h3>产品生命周期桑基图</h3>${realSankey()}</div><div class="grid two" style="margin-top:16px">${donut("生命周期阶段占比")}${table("热点贡献明细",["物料/阶段","生命周期阶段","活动数据","排放因子","贡献值","贡献率"],[["铝合金外壳","原材料获取","328 kg","9.2","301.8","24.2%"],["电池模组","原材料获取","1 件","226.4","226.4","18.1%"],["制造用电","产品制造","42 kWh","0.5703","24.0","11.6%"],["运输配送","运输阶段","12,400 t·km","0.087","104.9","8.4%"]])}</div>`;
}
function productData(){
const title=state.page;
let heads=["名称","产品/物料编码","类型","适用产品","版本","状态"];
let rows=[["A100整机","P-A100","整机产品","-","V1.0","启用"],["电池模组","M-BAT01","零部件","A100","V2.1","启用"],["标杆产品X","B-X001","标杆产品","A100","V1.0","已认证"]];
if(title==="BOM/物料清单"){heads=["父项产品","物料名称","物料编码","用量","单位","数据来源"];rows=[["A100整机","铝合金外壳","M-AL01","32.8","kg","ERP"],["A100整机","电池模组","M-BAT01","1","件","PLM"],["A100整机","包装材料","M-PKG02","4.6","kg","供应商"]]}
if(title==="零部件碳排数据"){heads=["零部件","供应商","单位碳排","核算批次","质量评分","状态"];rows=[["电池模组","供应商A","226.4","2026Q2","88","已提交"],["铝合金外壳","供应商B","301.8","2026Q2","76","待补充"],["包装材料","供应商C","18.2","2026Q2","91","通过"]]}
return `${header("管理产品信息、标杆产品、BOM物料清单、零部件碳排数据和额外活动因子。")}${filters(["产品线","产品类型","版本","状态"])}${table(title+"台账",heads,rows)}`;
}
function productAnalysis(){
if(state.page==="数据质量评估清单")return `${header("按数据来源、时间代表性、地域代表性、技术代表性和完整性评价产品碳足迹数据质量。")}${kpis([["平均质量分","86.4","达到报告阈值"],["一级数据占比","62%","供应商直接数据"],["待补充项","18","主要为运输数据"],["低可信因子","5","需替换"]])}${table("数据质量评估清单",["数据项","来源类型","时间代表性","地域代表性","技术代表性","质量分"],[["电池模组","供应商一级数据","高","中","高","88"],["铝合金外壳","行业数据库","中","中","中","76"],["运输距离","估算数据","低","中","中","62"]])}`;
return productDash();
}
function certification(){
return `${header("管理产品碳足迹认证上传、证书管理、认证状态跟踪和到期提醒。")}${kpis([["有效证书","28","ISO 14067 / 第三方认证"],["待认证产品","12","本季度计划"],["即将到期","4","90天内到期"],["认证通过率","92%","一次通过"]])}${table("认证证书台账",["产品","认证机构","证书编号","标准","有效期","状态"],[["A100整机","TÜV","CFP-2026-001","ISO 14067:2018","2028-06-30","已认证"],["B200部件","SGS","CFP-2026-018","ISO 14067:2018","2028-03-31","已认证"],["包装材料","第三方机构","CFP-2026-029","ISO 14067:2018","2027-12-31","待审核"]])}`;
}
function supplierDash(){
return `${header("展示供应商碳排与采购件碳排总览，重点监控供应链风险、关键指标异常、数据质量和供应商排名。")}
<div class="supplyAlert">⚠ <b>风险提示：</b>本期共有 13 项供应链碳数据异常，其中 4 项为高风险；建议优先跟进供应商B、供应商C的活动数据与因子来源。</div>
<div class="supplyCompactKpis">
  <div class="card kpi"><div class="label">覆盖供应商</div><div class="value">186</div><div class="note">核心供应商覆盖率 82%</div></div>
  <div class="card kpi"><div class="label">待办任务</div><div class="value">42</div><div class="note">待供应商提交 31</div></div>
  <div class="card kpi"><div class="label">异常数据</div><div class="value">13</div><div class="note">高风险 4 项</div></div>
  <div class="card kpi"><div class="label">平均质量分</div><div class="value">81.6</div><div class="note">较上期 +3.2</div></div>
</div>

<div class="supplyBoardGrid">
  <div class="supplyTopGrid">
    <div class="card supplyChartCard">
      <h3>供应链碳排与风险趋势排名</h3>
      <div class="filters" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto">
        <div class="field"><label>组织范围</label><select><option>集团总部</option><option>华东区域</option><option>华南区域</option></select></div>
        <div class="field"><label>供应商类型</label><select><option>核心供应商</option><option>一级供应商</option><option>二级供应商</option></select></div>
        <button class="btn soft">查询</button>
      </div>
      <div class="horizontalChart">
        <div class="hbarRow"><div class="hbarLabel">供应商A</div><div class="hbarTrack"><div class="hbarFill" style="width:92%"></div></div><div class="hbarValue">46.2</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商B</div><div class="hbarTrack"><div class="hbarFill orange" style="width:84%"></div></div><div class="hbarValue">42.1</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商C</div><div class="hbarTrack"><div class="hbarFill orange" style="width:76%"></div></div><div class="hbarValue">38.5</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商D</div><div class="hbarTrack"><div class="hbarFill" style="width:68%"></div></div><div class="hbarValue">34.2</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商E</div><div class="hbarTrack"><div class="hbarFill blue" style="width:61%"></div></div><div class="hbarValue">30.8</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商F</div><div class="hbarTrack"><div class="hbarFill" style="width:52%"></div></div><div class="hbarValue">26.4</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商G</div><div class="hbarTrack"><div class="hbarFill blue" style="width:38%"></div></div><div class="hbarValue">19.2</div></div>
        <div class="hbarRow"><div class="hbarLabel">供应商H</div><div class="hbarTrack"><div class="hbarFill" style="width:22%"></div></div><div class="hbarValue">11.0</div></div>
      </div>
      <div class="chartLegend"><span><i style="background:#86BC25"></i>碳排放量 kgCO₂e</span><span><i style="background:#E9A23B"></i>风险较高</span><span><i style="background:#2C6AA0"></i>数据质量待提升</span></div>
    </div>

    <div class="card indicatorTable supplyIndicatorCard">
      <h3>供应商关键指标监控</h3>
      <div class="tableWrap">
        <table>
          <thead><tr><th>供应商名称</th><th>ESG评级</th><th>风险指标</th><th>指标权重</th><th>指标评分</th><th>对项目影响评估</th></tr></thead>
          <tbody>
            <tr><td>供应商A</td><td>E</td><td>碳排放强度</td><td>0.30</td><td>5</td><td>碳排放强度较稳定，可作为电池模组低碳采购优先对象。</td></tr>
            <tr><td>供应商B</td><td>E</td><td>活动数据波动</td><td>0.25</td><td>2</td><td>近期活动数据波动较大，可能影响铝型材碳足迹准确性。</td></tr>
            <tr><td>供应商C</td><td>E</td><td>因子来源完整性</td><td>0.25</td><td>2</td><td>因子证明缺失，需补充第三方证明或原始核算资料。</td></tr>
            <tr><td>供应商D</td><td>E</td><td>单位产品能耗</td><td>0.20</td><td>4</td><td>能耗表现相对稳定，对产品碳足迹影响可控。</td></tr>
            <tr><td>供应商E</td><td>E</td><td>数据质量评分</td><td>0.25</td><td>3</td><td>数据质量低于核心供应商平均水平，需进行质量复核。</td></tr>
            <tr><td>供应商F</td><td>E</td><td>运输凭证完整性</td><td>0.15</td><td>3</td><td>部分运输凭证缺失，影响范围三运输阶段追溯。</td></tr>
            <tr><td>供应商G</td><td>E</td><td>绿电使用比例</td><td>0.20</td><td>4</td><td>绿电使用比例提升，有助于降低制造阶段碳排。</td></tr>
            <tr><td>供应商H</td><td>E</td><td>碳数据提交及时率</td><td>0.15</td><td>5</td><td>提交及时率高，协同效率较好。</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="supplyBottomGrid">
    <div class="card riskTable supplyRiskCard">
      <div class="helpListHead"><h3>供应商风险监控</h3><div class="riskTabs"><span>全部</span><span>待整改</span><span class="active">风险较高</span><span>综合评级</span></div></div>
      <div class="tableWrap">
        <table>
          <thead><tr><th>序号</th><th>发生日期</th><th>标题</th><th>相关供应商</th><th>类型</th><th>风险来源</th><th>处理建议</th><th>责任人</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>2026-07-02</td><td>供应商B铝型材数据波动超过阈值</td><td>供应商B</td><td><span class="status bad">数据异常</span></td><td>活动数据环比 +28%</td><td>要求补充产量、能耗及发票凭证</td><td>采购经理</td></tr>
            <tr><td>2</td><td>2026-07-01</td><td>供应商C塑料件因子来源缺失</td><td>供应商C</td><td><span class="status warn">资料缺失</span></td><td>因子证明未上传</td><td>补充第三方证明或原始核算资料</td><td>碳数据管理员</td></tr>
            <tr><td>3</td><td>2026-06-29</td><td>供应商E数据质量评分低于阈值</td><td>供应商E</td><td><span class="status warn">质量预警</span></td><td>质量分 68</td><td>进行数据质量复核并重新评分</td><td>供应链专员</td></tr>
            <tr><td>4</td><td>2026-06-28</td><td>供应商A提交新版电池模组碳足迹</td><td>供应商A</td><td><span class="status ok">已处理</span></td><td>版本更新</td><td>核对版本差异并归档认证材料</td><td>产品碳管理员</td></tr>
            <tr><td>5</td><td>2026-06-25</td><td>运输配送数据缺少承运商凭证</td><td>供应商F</td><td><span class="status warn">凭证缺失</span></td><td>附件不完整</td><td>补充承运商证明及运输里程记录</td><td>物流负责人</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;
}
function supplierMgmt(){
return `${header("维护供应商目录、供应商资料和供应商权限，支撑供应商协同填报。")}${filters(["供应商层级","采购品类","权限状态","风险等级"])}${table(state.page+"台账",["供应商","供应商层级","采购品类","联系人","权限状态","风险等级"],[["供应商A","一级供应商","电池模组","王经理","启用","低"],["供应商B","一级供应商","铝型材","李经理","启用","中"],["供应商C","二级供应商","塑料件","赵经理","待审核","高"]])}`;
}
function supplierTask(){
return `${header("管理供应商碳足迹任务、待办流程、审核记录和任务提醒。")}${filters(["任务状态","供应商","采购件","截止时间"])}${table(state.page+"明细",["任务名称","供应商","采购件","提交版本","截止时间","状态"],[["A100电池模组碳足迹","供应商A","电池模组","V2.1","2026-07-15","已提交"],["铝型材数据补充","供应商B","铝型材","V1.0","2026-07-12","待补充"],["塑料件异常核验","供应商C","塑料件","V0.8","2026-07-09","逾期"]])}`;
}
function purchase(){
return `${header("管理采购件填报台账、供应商报量、部件碳结果和版本管理。")}${kpis([["采购件数量","842","已覆盖 620"],["供应商报量","1,286","本期记录"],["已核算部件","538","完成率 64%"],["版本冲突","9","需人工确认"]])}${table(state.page+"台账",["采购件","供应商","报量","单位碳排","版本","状态"],[["电池模组","供应商A","12,000 件","226.4","V2.1","已提交"],["铝型材","供应商B","86,000 kg","9.2","V1.2","审核中"],["塑料件","供应商C","24,800 件","3.8","V0.9","待补充"]])}`;
}
function supplyFactor(){
return `${header("管理供应商因子提交、审核，并将通过的供应链因子同步至企业因子库。")}${filters(["供应商","因子类型","审核状态","同步状态"])}${table(state.page+"记录",["因子名称","供应商","物料/采购件","单位","参考值","同步状态"],[["电池模组单位碳排因子","供应商A","电池模组","kgCO₂e/件","226.4","已提交"],["铝型材单位碳排因子","供应商B","铝型材","kgCO₂e/kg","9.2","待审核"],["塑料件单位碳排因子","供应商C","塑料件","kgCO₂e/件","3.8","待补充"]])}`;
}
function renderBackendConfig(){
if(!backendState.ready)return needsBackend();
if(state.group==="因子库管理"){
return `${scope3Header("维护范围三底层数据库：排放因子库、排放源库、排放物质库和 GWP 库。新增后会写入 SQLite 并可被核算调用。")}
<div class="grid twoEqual">
  <div class="card"><h3>新增排放因子</h3><div class="formGrid">
    <div class="field"><label>类别</label><select id="factorCategory">${optionList(backendState.data.categories,"code","name","C01")}</select></div>
    <div class="field"><label>因子名称</label><input id="factorName" value="新增范围三因子"></div>
    <div class="field"><label>单位</label><input id="factorUnit" value="t"></div>
    <div class="field"><label>气体</label><select id="factorGas">${substanceOptions("CO2")}</select></div>
    <div class="field"><label>因子值</label><input id="factorValue" type="number" value="1.23"></div>
    <div class="field"><label>来源</label><input id="factorSourceType" value="${state.page==="企业私域因子库"?"企业私域因子库":state.page}"></div>
  </div><div class="actions" style="margin-top:12px"><button class="btn primary" type="button" onclick="saveFactor()">保存因子</button></div></div>
  <div class="card"><h3>新增排放物质 / GWP</h3><div class="formGrid">
    <div class="field"><label>物质编码</label><input id="substanceGas" value="R134a"></div>
    <div class="field"><label>物质名称</label><input id="substanceName" value="四氟乙烷"></div>
    <div class="field"><label>化学式</label><input id="substanceFormula" value="CH2FCF3"></div>
    <div class="field"><label>物质类型</label><select id="substanceType"><option>直接温室气体</option><option>含氟温室气体</option><option>混合制冷剂</option></select></div>
    <div class="field full"><label>物质说明</label><input id="substanceDescription" value="制冷剂泄漏相关排放"></div>
    <div class="field"><label>标准</label><select id="gwpStandard">${optionList(backendState.data.standards,"code","name",backendState.standard)}</select></div>
    <div class="field"><label>温室气体</label><input id="gwpGas" value="SF6"></div>
    <div class="field"><label>时间尺度</label><input id="gwpHorizon" type="number" value="100"></div>
    <div class="field"><label>GWP值</label><input id="gwpValue" type="number" value="24300"></div>
  </div><div class="actions" style="margin-top:12px"><button class="btn soft" type="button" onclick="saveSubstance()">保存物质</button><button class="btn primary" type="button" onclick="saveGwp()">保存 GWP</button></div></div>
</div>
${table("排放因子库",["ID","类别","因子名称","单位","气体","因子值","来源","地区","年份","参考"],backendState.data.factors.map(f=>[f.id,categoryName(f.category_code),f.name,f.unit,f.gas,f.factor_value,f.source_type,f.region,f.year,f.reference]))}
${table("排放源管理",["ID","类别","排放源","活动单位","默认因子","状态"],backendState.data.sources.map(s=>[s.id,categoryName(s.category_code),s.name,s.activity_unit,factorName(s.default_factor_id),s.enabled?"启用":"停用"]))}
${table("排放物质库",["ID","编码","名称","化学式","类型","说明"],backendState.data.substances.map(s=>[s.id,s.gas,s.name,s.formula,s.substance_type,s.description]))}
${table("GWP库",["ID","标准","气体","时间尺度","GWP值","参考"],backendState.data.gwp.map(g=>[g.id,standardName(g.standard_code),g.gas,g.horizon,g.value,g.reference]))}`;
}
if(state.group==="指标模板配置"){
return `${scope3Header("维护核算公式库。同一活动数据会根据标准切换使用对应公式和 GWP，实现多口径报告。")}
<div class="card"><h3>新增核算公式</h3><div class="formGrid">
  <div class="field"><label>标准</label><select id="formulaStandard">${optionList(backendState.data.standards,"code","name",backendState.standard)}</select></div>
  <div class="field"><label>类别</label><select id="formulaCategory">${optionList(backendState.data.categories,"code","name","C01")}</select></div>
  <div class="field wide"><label>公式表达式</label><input id="formulaExpression" value="activity_value * factor_value * gwp_value * standard_adjustment"></div>
  <div class="field full"><label>公式说明</label><textarea id="formulaDescription">活动数据 × 排放因子 × GWP × 标准口径修正</textarea></div>
</div><div class="actions" style="margin-top:12px"><button class="btn primary" type="button" onclick="saveFormula()">保存公式</button></div></div>
${table("核算公式库",["ID","标准","类别","表达式","说明","状态"],backendState.data.formulas.map(f=>[f.id,standardName(f.standard_code),categoryName(f.category_code),f.expression,f.description,f.enabled?"启用":"停用"]))}`;
}
return factorConfig();
}
async function saveFactor(){
const v=id=>document.getElementById(id).value;
await api("/api/factors",{method:"POST",body:JSON.stringify({category_code:v("factorCategory"),name:v("factorName"),unit:v("factorUnit"),gas:v("factorGas"),factor_value:v("factorValue"),source_type:v("factorSourceType")})});
await loadBackendData();render();showToast("排放因子已写入 SQLite");
}
async function saveGwp(){
const v=id=>document.getElementById(id).value;
await api("/api/gwp",{method:"POST",body:JSON.stringify({standard_code:v("gwpStandard"),gas:v("gwpGas"),horizon:v("gwpHorizon"),value:v("gwpValue"),reference:"用户维护 GWP"})});
await loadBackendData();render();showToast("GWP 已写入 SQLite");
}
async function saveSubstance(){
const v=id=>document.getElementById(id).value;
await api("/api/substances",{method:"POST",body:JSON.stringify({gas:v("substanceGas"),name:v("substanceName"),formula:v("substanceFormula"),substance_type:v("substanceType"),description:v("substanceDescription")})});
await loadBackendData();render();showToast("排放物质已写入 SQLite");
}
async function saveFormula(){
const v=id=>document.getElementById(id).value;
await api("/api/formulas",{method:"POST",body:JSON.stringify({standard_code:v("formulaStandard"),category_code:v("formulaCategory"),expression:v("formulaExpression"),description:v("formulaDescription")})});
await loadBackendData();render();showToast("核算公式已写入 SQLite");
}
function factorConfig(){
if(state.group==="指标模板配置"){
const heads={ "填报因子":["因子名称","分类","范围","GHG","单位","参考值/GWP"], "填报指标":["指标类别","指标名称","核算方式","指标释义","是否加密"], "填报模板":["模板名称","适用组织","时间颗粒度","填报项数量","状态"], "碳排放公式":["公式名称","核算方法","适用指标","计算公式","状态"]}[state.page];
const rows={ "填报因子":[["天然气排放因子","固定燃烧","范围一","CO₂","Nm³","2.1622"],["外购电力因子","购入电力","范围二","CO₂","kWh","0.5703"]], "填报指标":[["能源消耗","天然气消耗量","活动数据×因子","统计天然气使用量","否"],["购入电力","外购电力量","活动数据×因子","统计外购电力","否"]], "填报模板":[["组织月度填报模板","全部生产基地","月度","42","启用"],["供应商采购件模板","核心供应商","季度","18","待审核"]], "碳排放公式":[["固定燃烧公式","活动数据法","天然气消耗","活动数据×低位热值×排放因子×GWP","启用"],["外购电力公式","电网因子法","外购电力","用电量×区域电网因子","启用"]]}[state.page];
return `${header("基础配置下的指标、因子、模板和公式配置页面，已按 S01-S04 映射拆分。")}${filters(["分类","适用范围","状态","版本"])}${table(state.page+"配置",heads,rows)}`;
}
if(state.group==="系统设置")return `${header("配置组织权限、用户角色、审批流程和字典单位，确保系统管理与业务流程一致。")}${filters(["对象类型","状态","所属模块","更新时间"])}${table(state.page+"配置",["配置名称","配置对象","适用模块","责任人","更新时间","状态"],[["组织碳管理员","角色","组织碳排放","系统管理员","2026-07-01","启用"],["供应商审批流","审批流程","供应链碳排放","采购经理","2026-06-26","启用"],["排放单位字典","字典单位","基础配置","系统管理员","2026-06-12","待审核"]])}`;
return `${header("维护公共因子库、企业私域因子库和供应链因子导入，支持因子版本、来源、审核和启停用。")}${filters(["因子来源","因子分类","适用范围","状态"])}${table(state.page+"台账",["因子名称","来源","分类","单位","参考值","状态"],[["华东区域电网因子","公共因子库","外购电力","kgCO₂e/kWh","0.5703","启用"],["企业天然气因子","企业私域","固定燃烧","kgCO₂e/Nm³","2.1622","启用"],["供应商电池模组因子","供应链导入","采购件","kgCO₂e/件","226.4","待审核"]])}`;
}
function help(){
return `${header("帮助中心提供常见问题、行业标准参考和消息中心，用于支持用户快速查找操作说明、标准依据和系统通知。")}
<div class="helpHero">
  <div>
    <span class="badge">Help Center</span>
    <h2>Deloitte 碳排放管理系统帮助中心</h2>
    <p>围绕组织碳盘查、产品碳足迹、供应链协同、报告输出和基础配置，提供问题检索、标准参考与消息提醒。</p>
    <div class="helpSearch"><span>⌕</span><input value="搜索：ISO 14064、ISO 14067、碳盘查、产品碳足迹、供应商填报..." /></div>
  </div>
  <div class="helpHeroPanel">
    <div class="helpMini"><b>FAQ</b><span>常见问题</span></div>
    <div class="helpMini"><b>STD</b><span>行业标准参考</span></div>
    <div class="helpMini"><b>MSG</b><span>消息中心</span></div>
    <div class="helpMini"><b>DOC</b><span>操作资料</span></div>
  </div>
</div>

<div class="helpTileGrid">
  <div class="helpTile" onclick="go('帮助中心','系统说明','操作手册')">
    <svg viewBox="0 0 260 110">
      <rect x="28" y="18" width="204" height="76" rx="12" fill="#FFFFFF" stroke="#DCEBCB"/>
      <circle cx="56" cy="40" r="10" fill="#86BC25"/>
      <rect x="78" y="34" width="116" height="8" rx="4" fill="#86BC25"/>
      <rect x="50" y="58" width="154" height="7" rx="3.5" fill="#E5E7EB"/>
      <rect x="50" y="74" width="124" height="7" rx="3.5" fill="#E5E7EB"/>
      <text x="52" y="44" font-size="13" fill="#FFFFFF" font-weight="800">?</text>
    </svg>
    <h3>常见问题</h3>
    <p>查看碳盘查、产品碳足迹、供应商填报和报告生成的高频问题。</p>
    <span class="openHint">查看问题 →</span>
  </div>

  <div class="helpTile" onclick="go('帮助中心','系统说明','操作手册')">
    <svg viewBox="0 0 260 110">
      <rect x="56" y="16" width="128" height="78" rx="8" fill="#FFFFFF" stroke="#DCEBCB"/>
      <rect x="72" y="32" width="74" height="8" rx="4" fill="#86BC25"/>
      <rect x="72" y="50" width="92" height="7" rx="3.5" fill="#CFE6AE"/>
      <rect x="72" y="66" width="72" height="7" rx="3.5" fill="#E5E7EB"/>
      <circle cx="194" cy="78" r="18" fill="#F0F8E7" stroke="#86BC25"/>
      <text x="185" y="83" font-size="13" fill="#4D7F17" font-weight="900">ISO</text>
    </svg>
    <h3>行业标准参考</h3>
    <p>查看 ISO 14064、ISO 14067、GHG Protocol、PAS 2050 等标准说明。</p>
    <span class="openHint">查看标准 →</span>
  </div>

  <div class="helpTile" onclick="go('帮助中心','系统说明','操作手册')">
    <svg viewBox="0 0 260 110">
      <rect x="44" y="24" width="172" height="62" rx="12" fill="#FFFFFF" stroke="#DCEBCB"/>
      <path d="M58 44 L126 66 L202 44" fill="none" stroke="#86BC25" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="206" cy="30" r="13" fill="#D64545"/>
      <text x="202" y="35" font-size="12" fill="#FFFFFF" font-weight="900">3</text>
      <rect x="74" y="74" width="82" height="6" rx="3" fill="#E5E7EB"/>
    </svg>
    <h3>消息中心</h3>
    <p>查看任务提醒、审核通知、标准更新和系统公告。</p>
    <span class="openHint">查看消息 →</span>
  </div>

  <div class="helpTile" onclick="go('组织碳排放','报告中心','温室气体排放报告')">
    <svg viewBox="0 0 260 110">
      <rect x="60" y="14" width="118" height="82" rx="8" fill="#FFFFFF" stroke="#DCEBCB"/>
      <path d="M148 14 L178 44 L148 44 Z" fill="#EAF7E5" stroke="#DCEBCB"/>
      <rect x="78" y="42" width="48" height="7" rx="3.5" fill="#86BC25"/>
      <rect x="78" y="58" width="78" height="7" rx="3.5" fill="#CFE6AE"/>
      <rect x="78" y="74" width="62" height="7" rx="3.5" fill="#E5E7EB"/>
      <circle cx="198" cy="76" r="16" fill="#F0F8E7" stroke="#86BC25"/>
      <path d="M190 76 L196 82 L207 68" fill="none" stroke="#4D7F17" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h3>报告资料</h3>
    <p>查看组织清册报告、温室气体排放报告和产品评价报告相关说明。</p>
    <span class="openHint">查看报告 →</span>
  </div>
</div>

<div class="helpContentGrid">
  <div class="helpListCard">
    <div class="helpListHead"><h3>常见问题</h3><a href="javascript:void(0)">查看更多</a></div>
    <div class="faqList">
      <div class="faqItem"><div class="faqNo">1</div><div class="faqTitle">如何创建组织碳盘查任务，并分发给下属组织进行填报？</div><div class="faqTag">碳盘查</div></div>
      <div class="faqItem"><div class="faqNo">2</div><div class="faqTitle">排放数据填报时，活动数据、排放因子和附件凭证之间如何关联？</div><div class="faqTag">填报</div></div>
      <div class="faqItem"><div class="faqNo">3</div><div class="faqTitle">企业私域因子与公共因子库中的因子冲突时，应如何选择和留痕？</div><div class="faqTag">因子库</div></div>
      <div class="faqItem"><div class="faqNo">4</div><div class="faqTitle">产品碳足迹核算中，BOM物料清单与生命周期阶段如何映射？</div><div class="faqTag">LCA</div></div>
      <div class="faqItem"><div class="faqNo">5</div><div class="faqTitle">供应商提交的采购件碳排数据如何审核并同步至企业因子库？</div><div class="faqTag">供应链</div></div>
      <div class="faqItem"><div class="faqNo">6</div><div class="faqTitle">温室气体排放报告生成后，如何下载清册明细和报告附件？</div><div class="faqTag">报告</div></div>
      <div class="faqItem"><div class="faqNo">7</div><div class="faqTitle">基准年发生组织边界变化时，系统如何进行重算说明和版本管理？</div><div class="faqTag">基准年</div></div>
      <div class="faqItem"><div class="faqNo">8</div><div class="faqTitle">如何查看数据质量评分，并定位质量较低的活动数据或供应商数据？</div><div class="faqTag">质量</div></div>
    </div>
  </div>

  <div class="grid" style="gap:16px">
    <div class="helpListCard">
      <div class="helpListHead"><h3>行业标准参考</h3><a href="javascript:void(0)">全部标准</a></div>
      <div class="standardTabs"><button class="active">国际标准</button><button>国内指南</button><button>产品碳足迹</button></div>
      <div class="standardList">
        <div class="standardItem"><div><b>ISO 14064-1:2018</b><span>组织层面温室气体排放与清除的量化和报告规范。</span></div><div class="arrow">›</div></div>
        <div class="standardItem"><div><b>ISO 14067:2018</b><span>产品碳足迹量化、披露与评价相关要求。</span></div><div class="arrow">›</div></div>
        <div class="standardItem"><div><b>GHG Protocol</b><span>企业温室气体核算与报告标准，支持范围一、二、三核算。</span></div><div class="arrow">›</div></div>
        <div class="standardItem"><div><b>PAS 2050</b><span>产品和服务生命周期温室气体排放评估规范。</span></div><div class="arrow">›</div></div>
      </div>
    </div>

    <div class="helpListCard">
      <div class="helpListHead"><h3>消息中心</h3><a href="javascript:void(0)">查看全部</a></div>
      <div class="messagePanel">
        <div class="messageItem"><div class="messageIcon">审</div><div><b>供应商A提交了电池模组碳足迹数据</b><span>请在供应链因子中心完成审核并确认是否同步至企业因子库。</span></div><div class="messageTime">10:28</div></div>
        <div class="messageItem"><div class="messageIcon">报</div><div><b>2026年度温室气体排放报告已生成草稿</b><span>报告中心已完成封面、清册和活动数据明细预览。</span></div><div class="messageTime">昨天</div></div>
        <div class="messageItem"><div class="messageIcon">标</div><div><b>ISO 14067 产品碳足迹参考资料已更新</b><span>新增数据质量评价、系统边界和功能单位示例说明。</span></div><div class="messageTime">07-01</div></div>
      </div>
    </div>
  </div>
</div>`;
}
function render(){
let h="";
if(state.top==="首页"&&state.page==="系统总览")h=home();
else if((state.top==="首页"&&state.page==="截图映射")||state.page==="菜单与截图映射")h=mapping();
else if(state.top==="组织碳排放"&&state.group==="组织碳看板")h=orgWorkbench();
else if(state.top==="组织碳排放"&&state.group==="盘查准备")h=orgPreparation();
else if(state.top==="组织碳排放"&&state.group==="数据填报")h=orgDataEntry();
else if(state.top==="组织碳排放"&&state.group==="供应链范围三联动")h=orgSupplyLinkage();
else if(state.top==="组织碳排放"&&state.group==="核算分析")h=orgCalculation();
else if(state.top==="组织碳排放"&&state.group==="报告中心")h=renderStandardReport();
else if(state.group==="报告中心"||state.group==="产品报告中心")h=report();
else if(state.top==="产品碳排放"&&state.group==="产品碳足迹看板")h=productDash();
else if(state.top==="产品碳排放"&&state.group==="LCA建模与核算")h=lca();
else if(state.top==="产品碳排放"&&state.group==="产品数据管理")h=productData();
else if(state.top==="产品碳排放"&&state.group==="产品碳足迹分析")h=productAnalysis();
else if(state.top==="产品碳排放"&&state.group==="碳足迹认证管理")h=certification();
else if(state.top==="供应链碳排放"&&state.group==="供应链看板")h=supplierDash();
else if(state.top==="供应链碳排放"&&state.group==="供应商管理")h=supplierMgmt();
else if(state.top==="供应链碳排放"&&state.group==="供应商协同任务")h=supplierTask();
else if(state.top==="供应链碳排放"&&state.group==="采购件碳排放填报")h=purchase();
else if(state.top==="供应链碳排放"&&state.group==="供应链因子中心")h=supplyFactor();
else if(state.top==="供应链碳排放"&&state.group==="供应链分析与报告")h=supplierDash();
else if(state.top==="基础配置")h=renderBackendConfig();
else if(state.top==="帮助中心")h=help();
document.getElementById("content").innerHTML=h;
}

function setupInteractions(){
if(window.__deloitteInteractionsReady)return;
window.__deloitteInteractionsReady=true;
ensureUiLayer();
document.addEventListener("click",function(e){
  const close=e.target.closest("[data-close-modal]");
  if(close){closeModal();return}
  if(e.target.classList.contains("modalMask")){closeModal();return}
  const riskTab=e.target.closest(".riskTabs span");
  if(riskTab){riskTab.parentElement.querySelectorAll("span").forEach(i=>i.classList.remove("active"));riskTab.classList.add("active");showToast(`已切换到「${riskTab.textContent.trim()}」风险视图`);return}
  const standardTab=e.target.closest(".standardTabs button");
  if(standardTab){switchStandardTab(standardTab);return}
  const faq=e.target.closest(".faqItem");
  if(faq){toggleFaq(faq);return}
  const standard=e.target.closest(".standardItem");
  if(standard){openInfoModal("标准参考", standard.innerText);return}
  const message=e.target.closest(".messageItem");
  if(message){openInfoModal("消息详情", message.innerText);return}
  const btn=e.target.closest("button.btn");
  if(!btn)return;
  if(btn.onclick)return;
  const label=btn.textContent.trim();
  if(label==="查询"){simulateQuery(btn);return}
  if(label==="重置"){resetControls();return}
  if(label==="展开/收起"){toggleFilterPanels(btn);return}
  if(label==="新增/创建"){openCreateModal();return}
  if(label==="导出"){exportFirstTable();return}
  if(label==="查看"||label==="预览"||label==="下载"){openRowModal(label,btn);return}
  if(label==="编辑"||label==="修订"||label==="审核"||label==="上传"){openEditModal(label,btn);return}
  if(label==="删除"){deleteRow(btn);return}
});
document.addEventListener("input",function(e){
  if(e.target.closest(".helpSearch"))filterHelp(e.target.value);
});
}

function ensureUiLayer(){
if(document.getElementById("toast"))return;
document.body.insertAdjacentHTML("beforeend",`<div id="toast" class="toast" role="status"></div><div id="modalMask" class="modalMask" hidden><div class="modalBox"><button class="modalClose" data-close-modal="1">×</button><div id="modalContent"></div></div></div>`);
}

function showToast(text){
const toast=document.getElementById("toast");
toast.textContent=text;
toast.classList.add("show");
clearTimeout(window.__toastTimer);
window.__toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function openModal(html){
document.getElementById("modalContent").innerHTML=html;
document.getElementById("modalMask").hidden=false;
}

function closeModal(){
document.getElementById("modalMask").hidden=true;
}

function textHtml(s){
return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}

function currentTitle(){
return state.page===state.group?state.group:state.page;
}

function simulateQuery(btn){
const content=document.getElementById("content");
content.querySelectorAll("tbody tr").forEach((row,index)=>{
  row.classList.toggle("rowHighlight",index<2);
});
showToast(`已按当前条件查询「${currentTitle()}」，高亮展示前 2 条结果`);
}

function resetControls(){
const content=document.getElementById("content");
content.querySelectorAll("select").forEach(select=>select.selectedIndex=0);
content.querySelectorAll("input").forEach(input=>{if(!input.closest(".helpSearch"))input.value=""});
content.querySelectorAll("tbody tr").forEach(row=>{row.style.display="";row.classList.remove("rowHighlight")});
content.querySelectorAll(".filtersCollapsed").forEach(card=>card.classList.remove("filtersCollapsed"));
showToast("已重置当前页面筛选条件和临时高亮");
}

function toggleFilterPanels(btn){
const panels=[...document.querySelectorAll("#content .filters")].map(item=>item.closest(".card")||item);
if(!panels.length){showToast("当前页面没有可折叠的筛选区");return}
const collapsed=!panels[0].classList.contains("filtersCollapsed");
panels.forEach(panel=>panel.classList.toggle("filtersCollapsed",collapsed));
btn.classList.toggle("soft",!collapsed);
showToast(collapsed?"已收起高级筛选条件":"已展开高级筛选条件");
}

function openCreateModal(){
const title=currentTitle();
const fields=state.top==="产品碳排放"
  ?["模型/产品名称","产品类型","标准依据","系统边界说明"]
  :state.top==="供应链碳排放"
  ?["供应商名称","采购件名称","提交截止日期","协同说明"]
  :state.top==="基础配置"
  ?["配置名称","适用范围","版本","说明"]
  :["任务/资料名称","所属组织","责任人","说明"];
openModal(`<h2>新增/创建 - ${textHtml(title)}</h2><div class="modalForm">${fields.map((field,index)=>`<label>${field}${index===fields.length-1?`<textarea>${field}示例说明</textarea>`:`<input value="${field}示例" />`}</label>`).join("")}</div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="showToast('已保存为原型草稿');closeModal()">保存草稿</button></div>`);
}

function rowData(btn){
const row=btn.closest("tr");
if(!row)return {title:currentTitle(),headers:[],values:[]};
const table=row.closest("table");
const headers=[...table.querySelectorAll("thead th")].map(th=>th.textContent.trim());
const values=[...row.children].map(td=>td.innerText.trim());
return {title:table.closest(".card")?.querySelector("h3")?.textContent.trim()||currentTitle(),headers,values,row};
}

function openRowModal(action,btn){
const data=rowData(btn);
const pairs=data.headers.map((h,i)=>`<tr><th>${textHtml(h)}</th><td>${textHtml(data.values[i]||"")}</td></tr>`).join("");
openModal(`<h2>${action} - ${textHtml(data.title)}</h2><div class="tableWrap"><table><tbody>${pairs}</tbody></table></div><div class="modalActions"><button class="btn" data-close-modal="1">关闭</button><button class="btn primary" onclick="showToast('${action}内容已加入原型预览');closeModal()">${action}</button></div>`);
}

function openEditModal(action,btn){
const data=rowData(btn);
const editable=data.headers.slice(0,Math.min(4,data.headers.length)).map((h,i)=>`<label>${textHtml(h)}<input value="${textHtml(data.values[i]||"")}" /></label>`).join("");
openModal(`<h2>${action} - ${textHtml(data.title)}</h2><div class="modalForm">${editable}<label>处理说明<textarea>已根据当前页面场景生成${action}表单。</textarea></label></div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="showToast('${action}已完成，原型数据保持在前端');closeModal()">确认</button></div>`);
}

function deleteRow(btn){
const row=btn.closest("tr");
if(!row)return;
row.classList.add("rowRemoving");
setTimeout(()=>row.remove(),180);
showToast("已从当前原型表格移除该行");
}

function exportFirstTable(){
const table=document.querySelector("#content table");
if(!table){showToast("当前页面没有可导出的表格");return}
const rows=[...table.querySelectorAll("tr")].map(tr=>[...tr.children].map(cell=>`"${cell.innerText.replace(/"/g,'""')}"`).join(",")).join("\n");
const blob=new Blob(["\ufeff"+rows],{type:"text/csv;charset=utf-8"});
const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download=`${currentTitle()}-${new Date().toISOString().slice(0,10)}.csv`;
a.click();
URL.revokeObjectURL(a.href);
showToast("已导出当前表格 CSV");
}

function toggleFaq(item){
let answer=item.nextElementSibling;
if(!answer||!answer.classList.contains("faqAnswer")){
  answer=document.createElement("div");
  answer.className="faqAnswer";
  answer.textContent="系统会在当前模块保留操作记录、审核状态和数据来源。实际落地时可对接任务流、附件库和报告模板生成服务。";
  item.insertAdjacentElement("afterend",answer);
}
answer.hidden=!answer.hidden;
}

function filterHelp(value){
const keyword=value.replace(/^搜索：/,"").trim();
document.querySelectorAll(".faqItem,.standardItem,.messageItem").forEach(item=>{
  item.style.display=!keyword||item.innerText.includes(keyword)?"":"none";
});
}

function switchStandardTab(tab){
tab.parentElement.querySelectorAll("button").forEach(btn=>btn.classList.remove("active"));
tab.classList.add("active");
const list=tab.closest(".helpListCard").querySelector(".standardList");
const data={
  "国际标准":[["ISO 14064-1:2018","组织层面温室气体排放与清除的量化和报告规范。"],["ISO 14067:2018","产品碳足迹量化、披露与评价相关要求。"],["GHG Protocol","企业温室气体核算与报告标准，支持范围一、二、三核算。"],["PAS 2050","产品和服务生命周期温室气体排放评估规范。"]],
  "国内指南":[["GB/T 32150","工业企业温室气体排放核算和报告通则。"],["企业温室气体排放核算方法与报告指南","覆盖发电、钢铁、化工、建材等行业核算方法。"],["产品碳足迹管理体系建设指南","用于产品层面碳足迹管理和披露准备。"]],
  "产品碳足迹":[["PCR 产品种类规则","定义产品碳足迹核算范围、功能单位和数据质量要求。"],["LCA 生命周期评价","覆盖目标范围、清单分析、影响评价和结果解释。"],["EPD 环境产品声明","用于第三方披露和客户侧低碳采购。"]]
};
list.innerHTML=(data[tab.textContent.trim()]||data["国际标准"]).map(i=>`<div class="standardItem"><div><b>${i[0]}</b><span>${i[1]}</span></div><div class="arrow">›</div></div>`).join("");
showToast(`已切换标准分类：${tab.textContent.trim()}`);
}

function openInfoModal(title,content){
openModal(`<h2>${textHtml(title)}</h2><p class="modalText">${textHtml(content)}</p><div class="modalActions"><button class="btn primary" data-close-modal="1">知道了</button></div>`);
}
init();
