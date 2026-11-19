// 按角色的首页、组织分析看板和供应链各页面。依赖前面模块的全局函数，必须在 workflow-ui.js 之后加载。

const SUPPLIER_PROFILES = {
  "苏州恒铸精密铸造":{category:"铸件 / 原材料",contact:"顾文斌",email:"gu.wb@hengzhu.example",level:"关键供应商"},
  "无锡华导铜业":{category:"铜材 / 原材料",contact:"许静",email:"xu.jing@huadao.example",level:"关键供应商"},
  "嘉兴联运物流":{category:"公路运输服务",contact:"钱海峰",email:"qian.hf@lianyun.example",level:"一般供应商"},
  "常州鑫叠电机材料":{category:"电工钢 / 原材料",contact:"蒋莉",email:"jiang.li@xindie.example",level:"关键供应商"}
};
const DEADLINE = "2026-08-10";
let supplierStatusFilter = "";

function fmt(value,digits=2) {
  return Number(value||0).toLocaleString("zh-CN",{maximumFractionDigits:digits,minimumFractionDigits:0});
}
function greeting() {
  const hour=new Date().getHours();
  return hour<11?"早上好":hour<13?"中午好":hour<18?"下午好":"晚上好";
}
function pct(part,total) {
  return total?Math.round(part/total*100):0;
}
function helpButton(title,text) {
  return '<button class="helpIcon" title="'+textHtml(title)+'" onclick="openInfoModal(\''+textHtml(title)+'\',\''+textHtml(text)+'\')">?</button>';
}
function pageHead(title,actions="",crumb="") {
  return (crumb?'<div class="breadcrumb">'+textHtml(crumb)+'</div>':'')+
    '<div class="head"><h1>'+textHtml(title)+'</h1><div class="actions">'+actions+'</div></div>';
}
function statTile(label,value,note,action) {
  return '<div class="statTile'+(action?' clickable':'')+'" '+(action?'role="button" tabindex="0" onclick="'+action+'" onkeydown="if(event.key===\'Enter\')this.click()"':'')+'>'+
    '<span>'+label+'</span><b>'+value+'</b><small>'+note+'</small></div>';
}
function meterRows(rows,unit="tCO₂e") {
  const max=Math.max(...rows.map(row=>row.value),0)||1;
  return '<div class="meterList">'+rows.map(row=>'<button class="meterRow" onclick="'+(row.action||"")+'">'+
    '<span class="meterLabel">'+textHtml(row.label)+(row.sub?'<small>'+textHtml(row.sub)+'</small>':'')+'</span>'+
    '<span class="meterTrack"><i style="width:'+Math.max(row.value/max*100,row.value?1.5:0)+'%;background:'+(row.color||"var(--green)")+'"></i></span>'+
    '<span class="meterValue">'+(row.display??fmt(row.value))+' <small>'+(row.unit??unit)+'</small></span></button>').join("")+'</div>';
}
function progressRows(rows) {
  return '<div class="progressList">'+rows.map(row=>'<button class="progressRow" onclick="'+row.action+'">'+
    '<span class="progressLabel">'+textHtml(row.label)+'</span><span class="progressTrack"><i style="width:'+pct(row.done,row.total)+'%"></i></span>'+
    '<span class="progressValue">'+row.done+' / '+row.total+'<small>'+pct(row.done,row.total)+'%</small></span></button>').join("")+'</div>';
}
function todoList(items,empty) {
  if(!items.length)return '<div class="todoEmpty">'+empty+'</div>';
  return '<ul class="todoList">'+items.map(item=>'<li><span class="todoTag '+(item.tone||"")+'">'+item.tag+'</span>'+
    '<div class="todoMain"><b>'+textHtml(item.title)+'</b><small>'+item.meta+'</small>'+
    (item.note?'<em>'+textHtml(item.note)+'</em>':'')+'</div>'+
    '<button class="btn '+(item.primary===false?'':'primary')+'" onclick="'+item.action+'">'+item.button+'</button></li>').join("")+'</ul>';
}
function activityFeed(rows) {
  if(!rows.length)return '<div class="todoEmpty">暂无操作记录</div>';
  return '<ul class="feed">'+rows.slice(-6).reverse().map(row=>'<li><time>'+textHtml(row.at)+'</time><span>'+textHtml(row.actor)+'</span>'+
    textHtml(row.action)+' · '+textHtml(taskTitle(row.taskId))+'</li>').join("")+'</ul>';
}
function taskTitle(taskId) {
  if(String(taskId).startsWith("SUP-")) {
    const row=supplyScope3Items.find(item=>"SUP-"+item.id===taskId);
    return row?row.part:taskId;
  }
  return workflowTasks().find(task=>task.id===taskId)?.name||taskId;
}
function card(title,body,extra="") {
  return '<section class="panel"><div class="panelHead"><h3>'+title+'</h3>'+extra+'</div>'+body+'</section>';
}
function quickLinks(links) {
  return '<div class="quickLinks">'+links.map(link=>'<button onclick="'+link.action+'"><span>'+link.icon+'</span><b>'+link.label+'</b>'+
    (link.note?'<small>'+link.note+'</small>':'')+'</button>').join("")+'</div>';
}
function approvedDetail() {
  return backendState.calculation?.detail||[];
}
function scopeTotals() {
  const totals={"1":0,"2":0,"3":0};
  approvedDetail().forEach(row=>totals[String(row.scope||"3")]+=row.emission_tco2e);
  return totals;
}
function supplierState(index) {
  return taskEntry({locked:true,supplierIndex:index}).status;
}
function openTaskList(scope,status) {
  taskFilters={scope:scope||"",status:status||"",search:""};
  go("组织碳排放","数据填报","填报任务");
}

// ---------- 首页 ----------
home = function () {
  if(!backendState.ready)return needsBackend();
  if(currentRole==="填报人")return fillerHome();
  if(currentRole==="供应商")return supplierHome();
  return managerHome();
};

function managerHome() {
  const tasks=workflowTasks();
  const own=tasks.filter(task=>!task.locked);
  const statusOf=task=>taskEntry(task).status;
  const pendingOwn=own.filter(task=>statusOf(task)==="待审核");
  const pendingSup=supplyScope3Items.map((row,index)=>({row,index})).filter(({index})=>supplierState(index)==="待审核");
  const returned=tasks.filter(task=>statusOf(task)==="退回");
  const open=own.filter(task=>["待填报","草稿"].includes(statusOf(task)));
  const done=tasks.filter(task=>["通过","不适用"].includes(statusOf(task))).length;
  const totals=scopeTotals();
  const total=totals["1"]+totals["2"]+totals["3"];
  const orgReports=demo.reports.filter(row=>row.type==="组织排放报告");
  const todo=[
    ...pendingOwn.map(task=>({tag:"待审核",tone:"warn",title:task.name+" · "+task.org,
      meta:"范围"+task.scope+" · "+textHtml(task.owner)+" 提交 · "+fmt(taskEntry(task).activity,2)+" "+textHtml(task.unit),
      button:"审核",action:"openUnifiedTask('"+task.id+"',true)"})),
    ...pendingSup.map(({row,index})=>({tag:"供应商",tone:"warn",title:row.part+" · "+row.supplier,
      meta:"范围三 "+categoryName(row.category)+" · 申报 "+fmt(row.total,3)+" tCO₂e",
      button:"审核",action:"editDemoSupplier("+index+",true)"})),
    ...returned.map(task=>({tag:"已退回",tone:"bad",title:task.name,meta:"等待 "+textHtml(task.owner)+" 修改后重新提交",
      note:task.locked?supplyScope3Items[task.supplierIndex].reviewNote:taskEntry(task).reviewNote,
      button:"跟进",primary:false,action:"openUnifiedTask('"+task.id+"')"}))
  ];
  const scopeRows=["1","2","3"].map(scope=>{
    const list=tasks.filter(task=>task.scope===scope);
    return {label:"范围"+["","一","二","三"][scope],done:list.filter(task=>["通过","不适用"].includes(statusOf(task))).length,
      total:list.length,action:"openTaskList('"+scope+"')"};
  });
  const supDone=supplyScope3Items.filter((row,index)=>supplierState(index)==="通过").length;
  scopeRows.push({label:"供应商数据",done:supDone,total:supplyScope3Items.length,action:"go('供应链碳排放','供应商协同任务')"});
  const models=demo.lcaModels;
  return '<div class="welcome"><div><h1>'+MANAGER_NAME+'，'+greeting()+'</h1><p>2026-07 组织盘查进行中 · 数据截止 '+DEADLINE+
    ' · 已完成 '+done+' / '+tasks.length+' 项数据任务</p></div>'+helpButton("管理者工作台","这里汇总需要你处理的审核、退回跟进和报告事项。排放分析请进入组织碳看板，产品碳足迹请进入产品碳排放。")+'</div>'+
    '<div class="statRow">'+
      statTile("待我审核",pendingOwn.length+pendingSup.length,"企业 "+pendingOwn.length+" · 供应商 "+pendingSup.length,"go('组织碳排放','数据填报','审核队列')")+
      statTile("盘查完成度",pct(done,tasks.length)+"%",done+" / "+tasks.length+" 项已审核或确认不适用","openTaskList()")+
      statTile("已审核排放",fmt(total,1),"tCO₂e · 范围一 "+fmt(totals["1"],1)+" / 二 "+fmt(totals["2"],1)+" / 三 "+fmt(totals["3"],1),"go('组织碳排放','组织碳看板')")+
      statTile("产品碳足迹",models.length+" 个模型",models.map(model=>model.name.split(" ")[0]).join("、"),"go('产品碳排放','产品碳足迹看板')")+
    '</div>'+
    '<div class="homeGrid"><div>'+
      card("待我处理 <em>"+todo.length+"</em>",todoList(todo.slice(0,7),"当前没有需要处理的事项"),
        todo.length>7?'<button class="linkBtn" onclick="go(\'组织碳排放\',\'数据填报\',\'审核队列\')">查看全部</button>':'')+
      card("报告与交付",todoList([
        {tag:orgReports.length?"已生成":"待生成",tone:orgReports.length?"ok":"",title:"2026-07 组织排放报告",
          meta:orgReports.length?"最近 "+String(orgReports[0].created_at).slice(0,16).replace("T"," ")+" · "+orgReports[0].status:(open.length+returned.length+pendingOwn.length)+" 项数据未完成，可先生成草稿",
          button:orgReports.length?"查看":"生成",primary:!orgReports.length,action:"go('组织碳排放','报告中心','组织排放报告')"},
        ...models.map(model=>({tag:"LCA",tone:"ok",title:model.name+" 碳足迹评价报告",
          meta:"版本 "+model.version+" · "+fmt(lcaTotal(model),1)+" kgCO₂e / "+textHtml(model.flowUnit||"参考流"),
          button:"打开",primary:false,action:"activeLcaId='"+model.id+"';go('产品碳排放','产品报告中心','碳足迹评价报告')"}))
      ],""))+
    '</div><div>'+
      card("盘查进度",progressRows(scopeRows))+
      card("快捷入口",quickLinks([
        {icon:"▤",label:"填报任务总览",note:own.length+" 项企业任务",action:"openTaskList()"},
        {icon:"☷",label:"供应商数据收集",note:supplyScope3Items.length+" 家供应商",action:"go('供应链碳排放','供应商协同任务')"},
        {icon:"◈",label:"LCA 模型库",note:"录入生命周期活动",action:"go('产品碳排放','LCA建模与核算','模型库')"},
        {icon:"⚙",label:"因子库",note:demo.factors.length+" 个排放因子",action:"go('基础配置','因子库管理','公共因子库')"}
      ]))+
      card("最近动态",activityFeed(demo.auditLog||[]))+
    '</div></div>';
}

function fillerHome() {
  const mine=myTasks();
  const statusOf=task=>taskEntry(task).status;
  const count=status=>mine.filter(task=>statusOf(task)===status).length;
  const order={"退回":0,"草稿":1,"待填报":2};
  const todo=mine.filter(task=>order[statusOf(task)]!==undefined).sort((a,b)=>order[statusOf(a)]-order[statusOf(b)]).map(task=>{
    const entry=taskEntry(task);
    return {tag:statusOf(task),tone:{"退回":"bad","草稿":"warn"}[statusOf(task)]||"",title:task.name,
      meta:task.org+" · 范围"+task.scope+" · "+task.period+" · 截止 "+task.deadline,
      note:statusOf(task)==="退回"&&entry.reviewNote?"退回意见："+entry.reviewNote:"",
      button:statusOf(task)==="退回"?"修改":statusOf(task)==="草稿"?"继续填报":"填报",action:"openUnifiedTask('"+task.id+"')"};
  });
  const submitted=mine.filter(task=>["待审核","通过"].includes(statusOf(task))).map(task=>({
    tag:statusOf(task),tone:statusOf(task)==="通过"?"ok":"warn",title:task.name,
    meta:fmt(taskEntry(task).activity,2)+" "+textHtml(task.unit)+" · 凭证 "+textHtml(taskEntry(task).evidence||"—"),
    button:"查看",primary:false,action:"openUnifiedTask('"+task.id+"')"}));
  const done=count("通过")+count("不适用");
  const ids=new Set(mine.map(task=>task.id));
  return '<div class="welcome"><div><h1>'+fillerIdentity+'，'+greeting()+'</h1><p>2026-07 数据填报 · 截止 '+DEADLINE+' · 你负责 '+mine.length+' 项任务</p></div>'+
    helpButton("如何填报","点击任务后填写活动量并上传凭证。保存草稿不会进入核算；提交后由管理者审核，退回的任务会显示退回意见，修改后重新提交即可。")+'</div>'+
    '<div class="statRow">'+
      statTile("待我填报",count("待填报")+count("草稿"),"含草稿 "+count("草稿")+" 项","openTaskList('','')")+
      statTile("被退回",count("退回"),count("退回")?"请按意见修改后重新提交":"暂无退回","openTaskList('','退回')")+
      statTile("审核中",count("待审核"),"已提交，等待管理者审核","openTaskList('','待审核')")+
      statTile("已完成",done+" / "+mine.length,pct(done,mine.length)+"% 已计入核算","openTaskList('','通过')")+
    '</div>'+
    '<div class="homeGrid"><div>'+
      card("需要我处理 <em>"+todo.length+"</em>",todoList(todo,"所有任务都已提交，辛苦了"))+
      card("已提交",todoList(submitted.slice(0,6),"还没有提交的任务"))+
    '</div><div>'+
      card("我的进度",progressRows(["1","2","3"].map(scope=>{
        const list=mine.filter(task=>task.scope===scope);
        return {label:"范围"+["","一","二","三"][scope],done:list.filter(task=>["通过","不适用"].includes(statusOf(task))).length,total:list.length,action:"openTaskList('"+scope+"')"};
      }).filter(row=>row.total)))+
      card("快捷入口",quickLinks([
        {icon:"▤",label:"我的全部任务",note:mine.length+" 项",action:"openTaskList()"},
        {icon:"◈",label:"产品活动数据",note:"LCA 阶段活动录入",action:"go('产品碳排放','LCA建模与核算','模型库')"},
        {icon:"?",label:"填报说明",note:"操作手册",action:"go('帮助中心')"}
      ]))+
      card("审核反馈",activityFeed((demo.auditLog||[]).filter(row=>ids.has(row.taskId))))+
    '</div></div>';
}

function supplierHome() {
  const index=supplierIdentity;
  const row=supplyScope3Items[index];
  const profile=supplierProfile(row.supplier);
  const status=supplierState(index);
  const versions=demo.supplierVersionHistory[row.id]||[];
  const approved=demo.approvedSuppliers[row.id];
  const button=status==="待审核"?"查看提交":status==="通过"?"更新数据":status==="退回"?"按意见修改":"开始填报";
  return '<div class="welcome"><div><h1>'+textHtml(row.supplier)+'</h1><p>客户 江南流体装备 · 嘉兴装配工厂 · 联系人 '+textHtml(profile.contact||"—")+'</p></div>'+
    helpButton("供应商填报说明","请按采购合同口径填写本期供货活动量和单位产品碳排放，注明因子来源并上传凭证。提交后由江南流体装备审核，审核通过的数据会进入客户的范围三核算；更新数据会形成新版本，旧版本仍保留。")+'</div>'+
    '<section class="supplierTask"><div class="supplierTaskHead"><div><span class="todoTag '+({"通过":"ok","待审核":"warn","退回":"bad"}[status]||"")+'">'+status+'</span>'+
      '<h2>'+textHtml(row.part)+'</h2><p>数据期间 '+demoPeriod+' · 截止 '+DEADLINE+' · 对应客户范围三「'+textHtml(categoryName(row.category))+'」</p></div>'+
      '<button class="btn primary big" onclick="editDemoSupplier('+index+')">'+button+'</button></div>'+
      flowSteps(status,true)+
      (status==="退回"&&row.reviewNote?'<p class="reviewNote">客户退回意见 · '+textHtml(row.reviewNote)+'</p>':'')+
      '<dl class="factGrid"><div><dt>本期活动量</dt><dd>'+fmt(row.qty,2)+' '+textHtml(row.unit)+'</dd></div>'+
      '<div><dt>单位碳排</dt><dd>'+row.unitCarbon+' kgCO₂e / '+textHtml(row.unit)+'</dd></div>'+
      '<div><dt>申报排放</dt><dd>'+fmt(row.total,3)+' tCO₂e</dd></div>'+
      '<div><dt>凭证</dt><dd>'+textHtml(row.evidence||"—")+'</dd></div></dl></section>'+
    '<div class="homeGrid"><div>'+
      card("已批准版本",versions.length?'<div class="tableWrap"><table><thead><tr><th>版本</th><th>活动量</th><th>单位碳排</th><th>排放(tCO₂e)</th><th>批准时间</th></tr></thead><tbody>'+
        versions.slice().reverse().map(item=>'<tr><td>V'+item.version+'</td><td>'+fmt(item.qty,2)+' '+textHtml(item.unit)+'</td><td>'+item.unitCarbon+'</td><td>'+fmt(item.total,3)+'</td><td>'+textHtml(String(item.approvedAt).slice(0,19).replace("T"," "))+'</td></tr>').join("")+
        '</tbody></table></div>':'<div class="todoEmpty">还没有被客户批准的数据版本</div>')+
    '</div><div>'+
      card("客户当前采用",approved?'<div class="bigFigure"><b>'+fmt(approved.total,3)+'</b><span>tCO₂e · V'+(versions.length||1)+'</span></div><p class="muted">'+
        textHtml(approved.factorSource||"供应商材料清单估算")+'</p>':'<div class="todoEmpty">审核通过后显示</div>')+
      card("提交记录",activityFeed((demo.auditLog||[]).filter(item=>item.taskId==="SUP-"+row.id)))+
    '</div></div>';
}

// ---------- 组织碳看板：只做排放分析，不重复任务列表 ----------
orgWorkbench = function () {
  if(!backendState.ready)return needsBackend();
  const detail=approvedDetail();
  const totals=scopeTotals();
  const total=totals["1"]+totals["2"]+totals["3"];
  const issues=workflowIssues();
  const byOrg={};
  detail.forEach(row=>{const name=orgUnitName(row.org);byOrg[name]=(byOrg[name]||0)+row.emission_tco2e;});
  const categories=backendState.calculation.categories.filter(row=>!["S1","S2"].includes(row.category_code)).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
  const top=detail.slice().sort((a,b)=>b.emission_tco2e-a.emission_tco2e).slice(0,6);
  const scopeColors={"1":"#4D7F17","2":"#86BC25","3":"#008A7A"};
  return pageHead("组织碳看板",'<button class="btn" onclick="go(\'组织碳排放\',\'核算分析\',\'排放清单\')">排放清单</button>'+
      '<button class="btn primary" onclick="go(\'组织碳排放\',\'报告中心\',\'组织排放报告\')">生成报告</button>',"组织碳排放 / 组织碳看板")+
    '<div class="taskContext"><span>江南流体装备</span><span>'+demoPeriod+'</span><span>'+textHtml(standardName(backendState.standard))+'</span>'+
      (issues.length?'<button class="btn soft" onclick="go(\'组织碳排放\',\'核算分析\',\'异常数据\')">'+issues.length+' 项数据未审核，未计入</button>':'<span class="status ok">数据已全部审核</span>')+'</div>'+
    '<div class="statRow">'+
      statTile("已审核排放总量",fmt(total,1),"tCO₂e")+
      ["1","2","3"].map(scope=>statTile("范围"+["","一","二","三"][scope],fmt(totals[scope],1),"tCO₂e · 占 "+pct(totals[scope],total)+"%","showScopeDetail('"+scope+"')")).join("")+
    '</div>'+
    '<div class="scopeStack" title="范围构成">'+["1","2","3"].map(scope=>'<i style="flex:'+(totals[scope]||0.0001)+';background:'+scopeColors[scope]+'" onclick="showScopeDetail(\''+scope+'\')"></i>').join("")+'</div>'+
    '<div class="homeGrid even"><div>'+
      card("排放来源 Top 6",meterRows(top.map(row=>({label:scenarioText(row.source_name),sub:row.scope==="3"?"范围3 · "+categoryName(row.category_code):row.scope==="1"?"范围1 · 直接排放":"范围2 · 外购能源间接排放",
        value:row.emission_tco2e,color:scopeColors[row.scope]||"var(--green)",action:"showOrgCategory('"+row.category_code+"')"}))))+
    '</div><div>'+
      card("范围三类别",meterRows(categories.slice(0,8).map(row=>({label:row.category_name,value:row.emission_tco2e,
        action:"showOrgCategory('"+row.category_code+"')"}))))+
      card("按组织单元",meterRows(Object.entries(byOrg).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({label:name,value,color:"#2C6AA0",
        action:"openInfoModal('"+textHtml(name)+"','"+textHtml(detail.filter(row=>orgUnitName(row.org)===name).map(row=>scenarioText(row.source_name)+" · "+fmt(row.emission_tco2e,3)+" tCO₂e").join("\\n"))+"')"}))))+
    '</div></div>';
};
function orgUnitName(org) {
  const name=scenarioText(org||"").split(" / ")[0];
  return !name||name==="江南流体装备"?"公司层面（价值链）":name;
}
function showScopeDetail(scope) {
  const rows=approvedDetail().filter(row=>String(row.scope)===scope).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
  openModal('<h2>范围'+["","一","二","三"][scope]+' · 已审核排放明细</h2><div class="tableWrap"><table><thead><tr><th>排放源</th><th>类别</th><th>活动数据</th><th>因子</th><th>排放(tCO₂e)</th><th>凭证</th></tr></thead><tbody>'+
    rows.map(row=>'<tr><td>'+textHtml(scenarioText(row.source_name))+'</td><td>'+textHtml(categoryName(row.category_code))+'</td><td>'+fmt(row.activity_value,2)+' '+textHtml(row.activity_unit)+
      '</td><td>'+row.factor_value+'</td><td>'+fmt(row.emission_tco2e,4)+'</td><td>'+textHtml(row.evidence||"—")+'</td></tr>').join("")+
    '</tbody></table></div><div class="modalActions"><button class="btn primary" data-close-modal="1">关闭</button></div>');
}

// ---------- 排放清单：包含范围一二三 ----------
const orgCalculationBeforeRoles = orgCalculation;
orgCalculation = function () {
  if(state.page!=="排放清单")return orgCalculationBeforeRoles();
  if(!backendState.ready)return needsBackend();
  const detail=approvedDetail().slice().sort((a,b)=>String(a.scope).localeCompare(String(b.scope))||b.emission_tco2e-a.emission_tco2e);
  const total=detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  return pageHead("排放清单",helpButton("清单口径","仅包含审核通过的企业填报数据和供应商数据。草稿、待审核和退回数据不计入；切换核算口径会按对应标准重新计算。")+
      '<button class="btn" onclick="exportFirstTable()">导出清单</button>',"组织碳排放 / 核算分析 / 排放清单")+
    '<div class="lcaMeta"><label>核算口径 <select onchange="changeStandard(this.value)">'+optionList(demo.standards,"code","name",backendState.standard)+
      '</select></label><span>已审核排放 <b>'+fmt(total,4)+' tCO₂e</b></span><span>'+detail.length+' 条活动数据</span></div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>范围</th><th>排放源</th><th>类别</th><th>组织</th><th>活动数据</th><th>因子(tCO₂e/单位)</th><th>排放(tCO₂e)</th><th>占比</th><th>凭证</th></tr></thead><tbody>'+
    detail.map(row=>'<tr><td>范围'+row.scope+'</td><td><strong>'+textHtml(scenarioText(row.source_name))+'</strong></td><td>'+textHtml(categoryName(row.category_code))+
      '</td><td>'+textHtml(orgUnitName(row.org))+'</td><td>'+fmt(row.activity_value,2)+' '+textHtml(row.activity_unit)+'</td><td>'+row.factor_value+
      '</td><td>'+fmt(row.emission_tco2e,4)+'</td><td>'+(total?(row.emission_tco2e/total*100).toFixed(1):0)+'%</td><td>'+textHtml(row.evidence||"—")+'</td></tr>').join("")+
    '</tbody></table></div>';
};

const orgCalculationIssues = orgCalculation;
orgCalculation = function () {
  if(state.page!=="异常数据")return orgCalculationIssues();
  const tasks=workflowIssues();
  return pageHead("待处理数据",helpButton("待处理数据","列出尚未审核通过的企业与供应商任务，这些数据不计入排放清单和报告。")+'<button class="btn" onclick="exportFirstTable()">导出</button>',"组织碳排放 / 核算分析 / 待处理数据")+
    '<div class="taskContext"><span>'+tasks.length+' 项未完成</span><span>待审核 '+tasks.filter(task=>taskEntry(task).status==="待审核").length+'</span><span>已退回 '+tasks.filter(task=>taskEntry(task).status==="退回").length+'</span></div>'+
    plainTaskTable(tasks,currentRole==="管理者");
};

// ---------- 通用页头：去掉无效按钮 ----------
header = function () {
  const crumb=state.page===state.group?state.top+" / "+state.group:state.top+" / "+state.group+" / "+state.page;
  const config=state.top==="基础配置"&&currentRole==="管理者";
  return pageHead(state.page,(config?'<button class="btn primary" onclick="openCreateModal()">新增</button>':'')+
    '<button class="btn" onclick="exportFirstTable()">导出</button>',crumb);
};

// ---------- 供应链 ----------
function supplierRowsForRole() {
  return supplierRowsVisible();
}
supplierDash = function () {
  if(state.group==="供应链分析与报告")return supplyAnalysis();
  const rows=supplyScope3Items.map((row,index)=>({row,index,status:supplierState(index)}));
  const approved=Object.values(demo.approvedSuppliers);
  const total=approved.reduce((sum,row)=>sum+row.total,0);
  const done=rows.filter(item=>item.status==="通过").length;
  return pageHead("供应链看板",'<button class="btn primary" onclick="go(\'供应链碳排放\',\'供应商协同任务\')">数据收集与审核</button>',"供应链碳排放 / 供应链看板")+
    '<div class="statRow">'+
      statTile("协同供应商",supplyScope3Items.length+" 家",supplyScope3Items.filter(row=>supplierProfile(row.supplier).level==="关键供应商").length+" 家关键供应商","go('供应链碳排放','供应商管理')")+
      statTile("收集完成率",pct(done,rows.length)+"%",done+" / "+rows.length+" 项已审核通过","go('供应链碳排放','供应商协同任务')")+
      statTile("待审核 / 退回",rows.filter(item=>item.status==="待审核").length+" / "+rows.filter(item=>item.status==="退回").length,"需要跟进","setSupplierFilter('待审核')")+
      statTile("已计入范围三",fmt(total,3),"tCO₂e · 已批准版本")+
    '</div><div class="homeGrid even"><div>'+
      card("收集进度",'<ul class="supplierProgress">'+rows.map(({row,index,status})=>'<li><div><b>'+textHtml(row.supplier)+'</b><small>'+textHtml(row.part)+' · '+
        textHtml(supplierProfile(row.supplier).contact||"")+'</small></div>'+flowSteps(status,true)+
        '<button class="btn '+(status==="待审核"?'primary':'')+'" onclick="editDemoSupplier('+index+','+(status==="待审核")+')">'+(status==="待审核"?"审核":"查看")+'</button></li>').join("")+'</ul>')+
    '</div><div>'+
      card("已批准排放构成",meterRows(approved.map(row=>({label:row.supplier,sub:row.part,value:row.total,
        action:"showSupplierVersions("+supplyScope3Items.findIndex(item=>item.id===row.id)+")"}))))+
    '</div></div>';
};
function supplyAnalysis() {
  const approved=Object.values(demo.approvedSuppliers);
  const total=approved.reduce((sum,row)=>sum+row.total,0);
  const byCategory={};
  approved.forEach(row=>byCategory[row.category]=(byCategory[row.category]||0)+row.total);
  return pageHead("供应链分析与报告",helpButton("分析口径","仅统计已审核通过的供应商数据版本；待审核或退回的新提交不会覆盖已批准值。")+
      '<button class="btn primary" onclick="exportFirstTable()">导出分析表</button>',"供应链碳排放 / 供应链分析与报告")+
    '<div class="homeGrid even"><div>'+card("按范围三类别",meterRows(Object.entries(byCategory).map(([code,value])=>({label:categoryName(code),value}))))+'</div>'+
    '<div>'+card("数据质量",meterRows([
      {label:"供应商一手数据",value:approved.filter(row=>!String(row.factorSource||"估算").includes("估算")).length,unit:"项",display:approved.filter(row=>!String(row.factorSource||"估算").includes("估算")).length,color:"#4D7F17"},
      {label:"材料清单估算",value:approved.filter(row=>String(row.factorSource||"估算").includes("估算")).length,unit:"项",display:approved.filter(row=>String(row.factorSource||"估算").includes("估算")).length,color:"#E9A23B"}
    ]))+'</div></div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>供应商</th><th>数据对象</th><th>范围三类别</th><th>活动量</th><th>单位碳排(kgCO₂e)</th><th>已批准排放(tCO₂e)</th><th>占比</th><th>数据来源</th><th>版本</th></tr></thead><tbody>'+
    approved.map(row=>'<tr><td><strong>'+textHtml(row.supplier)+'</strong></td><td>'+textHtml(row.part)+'</td><td>'+textHtml(categoryName(row.category))+'</td><td>'+fmt(row.qty,2)+' '+textHtml(row.unit)+
      '</td><td>'+row.unitCarbon+'</td><td>'+fmt(row.total,4)+'</td><td>'+(total?(row.total/total*100).toFixed(1):0)+'%</td><td>'+textHtml(row.factorSource||"供应商材料清单估算")+
      '</td><td>V'+((demo.supplierVersionHistory[row.id]||[]).length||1)+'</td></tr>').join("")+'</tbody></table></div>';
}
function supplierProfile(name) {
  return (demo.supplierProfiles||{})[name]||SUPPLIER_PROFILES[name]||{};
}
function inviteSupplier() {
  const categories=demo.categories.map(row=>'<option value="'+row.code+'">'+textHtml(row.name)+'</option>').join("");
  openModal('<h2>邀请供应商填报</h2><p class="muted">发起后供应商可在自己的工作台看到任务，提交的数据经你审核后自动计入范围三。</p><div class="modalForm">'+
    '<label>供应商名称<input id="invName" placeholder="如：宁波安泰轴承"></label>'+
    '<label>供应品类<input id="invCategory" placeholder="如：轴承 / 外购件"></label>'+
    '<label>联系人<input id="invContact"></label><label>联系邮箱<input id="invEmail" type="email"></label>'+
    '<label>数据对象<input id="invPart" placeholder="如：6205 深沟球轴承"></label>'+
    '<label>活动单位<select id="invUnit"><option>kg</option><option>件</option><option>t</option><option>t·km</option><option>kWh</option></select></label>'+
    '<label>关联范围三类别<select id="invScope3">'+categories+'</select></label>'+
    '<label>分级<select id="invLevel"><option>关键供应商</option><option>一般供应商</option></select></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveSupplierInvite()">发起数据收集</button></div>');
}
async function saveSupplierInvite() {
  const value=id=>document.getElementById(id).value.trim();
  if(!value("invName")||!value("invPart")||!value("invContact")){showToast("请填写供应商名称、联系人和数据对象");return;}
  if(supplyScope3Items.some(row=>row.supplier===value("invName")&&row.part===value("invPart"))){showToast("该供应商已有相同数据对象的任务");return;}
  const next=Math.max(0,...supplyScope3Items.map(row=>Number(String(row.id).replace(/\D/g,""))||0))+1;
  const id="SC-"+String(next).padStart(3,"0");
  const category=value("invScope3");
  supplyScope3Items.push({id,task:"T-S3-"+category,supplier:value("invName"),part:value("invPart"),category,qty:"",unit:value("invUnit"),
    unitCarbon:"",total:0,status:"待填报",sync:"未关联",evidence:""});
  demo.supplierProfiles ||= {};
  demo.supplierProfiles[value("invName")]={category:value("invCategory"),contact:value("invContact"),email:value("invEmail"),level:value("invLevel")};
  demo.supplierRows=supplyScope3Items;
  auditTask("SUP-"+id,"发起供应商数据收集");
  persistDemo();await loadBackendData();closeModal();render();
  showToast("已向 "+value("invName")+" 发起数据收集，可切换供应商身份查看");
}
supplierMgmt = function () {
  return pageHead("供应商管理",'<button class="btn" onclick="exportFirstTable()">导出</button><button class="btn primary" onclick="inviteSupplier()">邀请供应商</button>',"供应链碳排放 / 供应商管理")+
    '<div class="taskTable tableWrap"><table><thead><tr><th>供应商</th><th>供应品类</th><th>分级</th><th>联系人</th><th>关联范围三类别</th><th>本期任务</th><th>已批准版本</th><th>操作</th></tr></thead><tbody>'+
    supplyScope3Items.map((row,index)=>{
      const profile=supplierProfile(row.supplier);
      const status=supplierState(index);
      return '<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(profile.email||"")+'</small></td><td>'+textHtml(profile.category||"")+'</td><td>'+
        textHtml(profile.level||"")+'</td><td>'+textHtml(profile.contact||"")+'</td><td>'+textHtml(categoryName(row.category))+'</td><td>'+entryStatus(status)+
        '<small>'+textHtml(row.part)+'</small></td><td>'+((demo.supplierVersionHistory[row.id]||[]).length?'V'+demo.supplierVersionHistory[row.id].length:'—')+'</td><td class="rowActions">'+
        '<button class="btn" onclick="editDemoSupplier('+index+')">查看任务</button>'+
        (["草稿","退回","待填报"].includes(status)?'<button class="btn" onclick="remindTask(\'SUP-'+row.id+'\',\''+textHtml(row.supplier)+'\')">催办</button>':'')+'</td></tr>';
    }).join("")+'</tbody></table></div>';
};
function setSupplierFilter(value) {
  supplierStatusFilter=value;
  if(state.group!=="供应商协同任务")go("供应链碳排放","供应商协同任务");else render();
}
purchase = supplierTask = function () {
  const own=currentRole==="供应商";
  const rows=supplierRowsVisible().filter(({index})=>own||!supplierStatusFilter||supplierState(index)===supplierStatusFilter);
  const counts=status=>supplyScope3Items.filter((row,index)=>supplierState(index)===status).length;
  return pageHead(own?"我的填报任务":"数据收集与审核",helpButton("供应商数据联动","供应商提交后由企业管理者审核；审核通过的数据自动计入组织范围三对应任务，组织端无需重复填报。更新数据形成新版本，批准前保留原批准值。")+
      '<button class="btn" onclick="exportFirstTable()">导出</button>',"供应链碳排放 / "+(own?"我的填报任务":"数据收集与审核"))+
    (own?'':'<div class="segTabs">'+[["","全部",supplyScope3Items.length],["待审核","待审核",counts("待审核")],["退回","已退回",counts("退回")],["待填报","待填报",counts("待填报")],["草稿","草稿",counts("草稿")],["通过","已通过",counts("通过")]]
      .map(([value,label,count])=>'<button class="'+(supplierStatusFilter===value?'active':'')+'" onclick="setSupplierFilter(\''+value+'\')">'+label+' <em>'+count+'</em></button>').join("")+'</div>')+
    '<div class="taskTable tableWrap"><table><thead><tr><th>'+(own?'数据对象':'供应商 / 数据对象')+'</th><th>范围三类别</th><th>活动量</th><th>单位碳排(kgCO₂e)</th><th>申报排放(tCO₂e)</th><th>状态</th><th>已采用(tCO₂e)</th><th>截止</th><th>操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(({row,index})=>{
      const status=supplierState(index);
      const label=own?(status==="待审核"?"查看提交":status==="退回"?"修改":status==="通过"?"更新数据":"填报"):status==="待审核"?"审核":"查看";
      return '<tr><td><strong>'+textHtml(own?row.part:row.supplier)+'</strong><small>'+textHtml(own?row.task:row.part)+'</small></td><td>'+textHtml(categoryName(row.category))+'</td><td>'+fmt(row.qty,2)+' '+textHtml(row.unit)+
        '</td><td>'+row.unitCarbon+'</td><td>'+fmt(row.total,4)+'</td><td>'+entryStatus(status)+(row.reviewNote&&status==="退回"?'<small>'+textHtml(row.reviewNote)+'</small>':'')+
        '</td><td>'+fmt(demo.approvedSuppliers[row.id]?.total||0,4)+'</td><td>'+DEADLINE+'</td><td><button class="btn '+(["审核","修改","填报"].includes(label)?'primary':'')+
        '" onclick="editDemoSupplier('+index+','+(!own&&status==="待审核")+')">'+label+'</button></td></tr>';
    }).join(""):'<tr><td colspan="9" class="emptyCell">当前筛选下没有任务</td></tr>')+'</tbody></table></div>';
};
orgSupplyLinkage = purchase;
supplyFactor = function () {
  const own=currentRole==="供应商";
  const rows=supplierRowsVisible().filter(({row})=>demo.approvedSuppliers[row.id]);
  return pageHead(own?"已批准数据":"供应链因子中心",helpButton("因子来源","这里是经审核批准、正在被组织范围三核算采用的供应商单位碳排放。历史版本可追溯。")+
      '<button class="btn" onclick="exportFirstTable()">导出</button>',"供应链碳排放 / "+(own?"已批准数据":"供应链因子中心"))+
    '<div class="taskTable tableWrap"><table><thead><tr><th>供应商 / 数据对象</th><th>单位碳排(kgCO₂e)</th><th>活动单位</th><th>因子来源</th><th>当前版本</th><th>批准时间</th><th>凭证</th><th>操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(({row,index})=>{
      const approved=demo.approvedSuppliers[row.id];
      const versions=demo.supplierVersionHistory[row.id]||[];
      return '<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(row.part)+'</small></td><td>'+approved.unitCarbon+'</td><td>'+textHtml(approved.unit)+'</td><td>'+
        textHtml(approved.factorSource||"供应商材料清单估算")+'</td><td>V'+(versions.length||1)+'</td><td>'+textHtml(String(approved.approvedAt||"").slice(0,19).replace("T"," "))+'</td><td>'+
        textHtml(approved.evidence||"")+'</td><td><button class="btn" onclick="showSupplierVersions('+index+')">历史版本</button></td></tr>';
    }).join(""):'<tr><td colspan="8" class="emptyCell">暂无已批准数据。提交并通过客户审核后显示。</td></tr>')+'</tbody></table></div>';
};

// ---------- 外壳 ----------
const renderBeforeRoles = render;
render = function () {
  renderBeforeRoles();
  document.body.dataset.role=currentRole;
  document.body.dataset.top=state.top;
};

// 填报人只维护活动数据，模型新增、设置和删除由管理者处理
const editLcaModelBeforeRoles = editLcaModel;
editLcaModel = function (...args) {
  if(currentRole!=="管理者"){showToast("模型新增和设置由管理者维护，你可以录入和修改阶段活动数据");return;}
  return editLcaModelBeforeRoles(...args);
};
const removeLcaLineBeforeRoles = removeLcaLine;
removeLcaLine = function (...args) {
  if(currentRole!=="管理者"){showToast("删除活动需管理者操作");return;}
  return removeLcaLineBeforeRoles(...args);
};

// ---------- 报告中心：可预览、生成快照、下载可打印报告 ----------
const BOUNDARY_TEXT = "运营控制权法 · 杭州总部、嘉兴装配工厂、湖州机加工基地，范围三按 GHG Protocol 15 类识别";
function reportScopeRows(detail) {
  const total=detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  return {total,scopes:["1","2","3"].map(scope=>{
    const value=detail.filter(row=>String(row.scope)===scope).reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {scope,label:["","范围一 直接排放","范围二 外购能源间接排放","范围三 价值链间接排放"][scope],value,share:total?value/total*100:0};
  }),categories:[...new Set(detail.filter(row=>String(row.scope)==="3").map(row=>row.category_code))].map(code=>{
    const value=detail.filter(row=>row.category_code===code).reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {code,name:categoryName(code),value,share:total?value/total*100:0};
  }).sort((a,b)=>b.value-a.value)};
}
renderStandardReport = function () {
  if(!backendState.ready)return needsBackend();
  const scope3=state.page==="范围三专项报告";
  const detail=approvedDetail().filter(row=>!scope3||String(row.scope)==="3");
  const issues=workflowIssues().filter(task=>!scope3||task.scope==="3");
  const summary=reportScopeRows(detail);
  const rows=demo.reports.filter(row=>(row.type||"范围三专项报告")===state.page);
  return pageHead(state.page,helpButton("报告说明","预览始终基于当前已审核数据。生成快照会冻结当时的数据，便于对外提交和追溯；仍有未完成任务时快照标记为草稿。")+
      '<button class="btn" onclick="downloadCurrentReport()">下载预览</button>'+
      '<button class="btn primary" onclick="generateScope3Report()">'+(issues.length?"生成草稿快照":"生成正式快照")+'</button>',"组织碳排放 / 报告中心 / "+state.page)+
    '<div class="lcaMeta"><label>核算口径 <select onchange="changeStandard(this.value)">'+optionList(demo.standards,"code","name",backendState.standard)+'</select></label>'+
      (issues.length?'<button class="btn soft" onclick="go(\'组织碳排放\',\'核算分析\',\'异常数据\')">'+issues.length+' 项数据未完成，报告将标记为草稿</button>':'<span class="status ok">数据已全部审核</span>')+'</div>'+
    '<div class="reportPreview"><div class="reportCover"><div class="coverLogo">Deloitte.</div><h2>江南流体装备 · 2026 年 7 月'+(scope3?'范围三专项报告':'温室气体排放报告')+'</h2>'+
      '<p>'+textHtml(standardName(backendState.standard))+' · '+(issues.length?'草稿':'已核对')+'</p></div>'+
      '<dl class="reportFacts"><div><dt>报告主体</dt><dd>江南流体装备有限公司</dd></div><div><dt>核算期间</dt><dd>'+demoPeriod+'</dd></div>'+
      '<div><dt>组织边界</dt><dd>'+BOUNDARY_TEXT+'</dd></div><div><dt>'+(scope3?'范围三排放':'排放总量')+'</dt><dd><b>'+fmt(summary.total,2)+' tCO₂e</b></dd></div></dl>'+
      (scope3?'':'<h3>按范围</h3><table><thead><tr><th>范围</th><th>排放(tCO₂e)</th><th>占比</th></tr></thead><tbody>'+
        summary.scopes.map(row=>'<tr><td>'+row.label+'</td><td>'+fmt(row.value,4)+'</td><td>'+row.share.toFixed(1)+'%</td></tr>').join("")+'</tbody></table>')+
      '<h3>范围三 · 按类别</h3><table><thead><tr><th>类别</th><th>排放(tCO₂e)</th><th>占比</th><th></th></tr></thead><tbody>'+
        summary.categories.map(row=>'<tr><td>'+textHtml(row.name)+'</td><td>'+fmt(row.value,4)+'</td><td>'+row.share.toFixed(1)+'%</td><td><button class="linkBtn" onclick="showOrgCategory(\''+row.code+'\')">明细</button></td></tr>').join("")+'</tbody></table>'+
      '<h3>方法与数据质量</h3><p class="muted">排放量 = 活动数据 × 排放因子 × GWP。仅纳入审核通过的企业填报与供应商数据，共 '+detail.length+' 条；'+
        (issues.length?issues.length+' 项任务尚未完成，未计入本报告。':'所有任务已完成。')+'排放因子为演示用场景因子，正式披露前需专业复核。</p></div>'+
    card("报告快照",rows.length?'<div class="tableWrap"><table><thead><tr><th>编号</th><th>口径</th><th>状态</th><th>排放(tCO₂e)</th><th>生成时间</th><th>操作</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><td>R-'+String(row.id).padStart(3,"0")+'</td><td>'+textHtml(standardName(row.standard_code))+'</td><td>'+entryStatus(row.status==="已核对"?"通过":"草稿")+
        '</td><td>'+fmt(row.total_emission,4)+'</td><td>'+textHtml(String(row.created_at).slice(0,16).replace("T"," "))+'</td><td><button class="btn" onclick="downloadOrgReport('+row.id+')">下载报告</button></td></tr>').join("")+
      '</tbody></table></div>':'<div class="todoEmpty">尚未生成快照。确认预览无误后点击右上角生成。</div>');
};
function reportDocument(title,status,standardCode,detail,incomplete,created) {
  const summary=reportScopeRows(detail);
  const tableRows=(rows,cols)=>rows.map(row=>'<tr>'+cols.map(col=>'<td>'+col(row)+'</td>').join("")+'</tr>').join("");
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>'+textHtml(title)+'</title><style>'+
    'body{font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#1f2937;max-width:900px;margin:40px auto;padding:0 24px;line-height:1.6}'+
    '.cover{border-top:8px solid #86BC25;padding:28px 0 18px;margin-bottom:24px;border-bottom:1px solid #e5e7eb}.logo{font-weight:900;font-size:26px}.logo span{color:#86BC25}'+
    'h1{font-size:26px;margin:18px 0 6px}h2{font-size:17px;border-left:4px solid #86BC25;padding-left:8px;margin-top:28px}'+
    'table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f3f8ea;text-align:left}th,td{padding:7px 8px;border-bottom:1px solid #e5e7eb}'+
    '.facts td:first-child{color:#667085;width:120px}.tag{display:inline-block;padding:2px 8px;border-radius:4px;background:'+(status==="已核对"?'#f0f8e7;color:#4d7f17':'#fff4de;color:#a66a00')+'}'+
    '.note{color:#667085;font-size:12px}@media print{body{margin:0}}</style></head><body>'+
    '<div class="cover"><div class="logo">Deloitte<span>.</span></div><h1>'+textHtml(title)+'</h1><span class="tag">'+textHtml(status)+'</span></div>'+
    '<table class="facts"><tr><td>报告主体</td><td>江南流体装备有限公司</td></tr><tr><td>核算期间</td><td>'+demoPeriod+'</td></tr>'+
    '<tr><td>核算标准</td><td>'+textHtml(standardName(standardCode))+'</td></tr><tr><td>组织边界</td><td>'+BOUNDARY_TEXT+'</td></tr>'+
    '<tr><td>排放总量</td><td><b>'+fmt(summary.total,4)+' tCO₂e</b></td></tr><tr><td>生成时间</td><td>'+textHtml(created)+'</td></tr></table>'+
    '<h2>按范围汇总</h2><table><tr><th>范围</th><th>排放(tCO₂e)</th><th>占比</th></tr>'+tableRows(summary.scopes,[row=>row.label,row=>fmt(row.value,4),row=>row.share.toFixed(1)+"%"])+'</table>'+
    '<h2>范围三按类别汇总</h2><table><tr><th>类别</th><th>排放(tCO₂e)</th><th>占比</th></tr>'+tableRows(summary.categories,[row=>textHtml(row.name),row=>fmt(row.value,4),row=>row.share.toFixed(1)+"%"])+'</table>'+
    '<h2>排放清单</h2><table><tr><th>范围</th><th>排放源</th><th>活动数据</th><th>因子</th><th>排放(tCO₂e)</th><th>凭证</th></tr>'+
    tableRows(detail,[row=>"范围"+row.scope,row=>textHtml(scenarioText(row.source_name)),row=>fmt(row.activity_value,2)+" "+textHtml(row.activity_unit),row=>row.factor_value,row=>fmt(row.emission_tco2e,4),row=>textHtml(row.evidence||"—")])+'</table>'+
    (incomplete.length?'<h2>未纳入的任务</h2><table><tr><th>任务</th><th>名称</th><th>状态</th></tr>'+tableRows(incomplete,[row=>row.id,row=>textHtml(row.name),row=>row.status])+'</table>':'')+
    '<h2>方法说明</h2><p>排放量 = 活动数据 × 排放因子 × GWP。仅纳入审核通过的企业填报与供应商数据。</p>'+
    '<p class="note">本报告由 Deloitte 碳排放管理系统演示环境生成，使用虚构企业与场景因子，不构成第三方核证结论。可使用浏览器“打印 → 存储为 PDF”导出。</p></body></html>';
}
function downloadCurrentReport() {
  const scope3=state.page==="范围三专项报告";
  const detail=approvedDetail().filter(row=>!scope3||String(row.scope)==="3");
  const issues=workflowIssues().filter(task=>!scope3||task.scope==="3");
  downloadLcaFile(reportDocument("江南流体装备 2026 年 7 月"+(scope3?"范围三专项报告":"温室气体排放报告"),issues.length?"草稿":"已核对",backendState.standard,detail,
    issues.map(task=>({id:task.id,name:task.name,status:taskEntry(task).status})),new Date().toLocaleString("zh-CN",{hour12:false})),
    state.page+"-预览-"+demoPeriod+".html","text/html");
}
downloadOrgReport = function (id) {
  const report=demo.reports.find(row=>row.id===id);
  const snapshot=JSON.parse(report.content_json);
  const type=report.type||"范围三专项报告";
  downloadLcaFile(reportDocument("江南流体装备 2026 年 7 月"+(type==="范围三专项报告"?"范围三专项报告":"温室气体排放报告"),report.status||"草稿",report.standard_code,
    snapshot.detail||[],snapshot.incompleteTasks||[],String(report.created_at).slice(0,19).replace("T"," ")),"R-"+String(report.id).padStart(3,"0")+"-"+type+".html","text/html");
};
