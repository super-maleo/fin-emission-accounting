let currentRole = "管理者";
let supplierIdentity = 1;
const FILLERS = ["陈晓宁","周建华","沈嘉禾"];
const MANAGER_NAME = "林嘉怡";
let fillerIdentity = "陈晓宁";
try {
  const savedRole = JSON.parse(localStorage.getItem("carbon-demo-role") || "null");
  if (savedRole && ["管理者","填报人","供应商"].includes(savedRole.role)) {
    currentRole = savedRole.role;
    if (FILLERS.includes(savedRole.filler)) fillerIdentity = savedRole.filler;
    if (Number.isInteger(savedRole.supplier)) supplierIdentity = savedRole.supplier;
  }
} catch {}
function saveRoleChoice() {
  try {localStorage.setItem("carbon-demo-role",JSON.stringify({role:currentRole,filler:fillerIdentity,supplier:supplierIdentity}));} catch {}
}
function currentPerson() {
  return currentRole==="管理者"?MANAGER_NAME:currentRole==="填报人"?fillerIdentity:(supplyScope3Items[supplierIdentity]?.supplier||"供应商");
}
const ROLE_TOPS = {
  "管理者":TOPS,
  "填报人":["首页","组织碳排放","产品碳排放","帮助中心"],
  "供应商":["首页","供应链碳排放","帮助中心"]
};
const ROLE_GROUPS = {
  "填报人":{"组织碳排放":["数据填报"],"产品碳排放":["LCA建模与核算","产品数据管理"]},
  "供应商":{"供应链碳排放":["供应商协同任务","供应链因子中心"]}
};
function sideLabel(group) {
  if(group==="首页总览")return "我的工作台";
  if(group==="数据填报")return currentRole==="填报人"?"我的填报任务":"填报与审核";
  if(group==="供应商协同任务")return currentRole==="供应商"?"我的填报任务":"数据收集与审核";
  if(group==="供应链因子中心"&&currentRole==="供应商")return "已批准数据";
  return group;
}
delete MENUS["供应链碳排放"]["采购件碳排放填报"];
let taskFilters = {scope:"", status:"", search:""};

MENUS["组织碳排放"] = {
  "组织碳看板":[],
  "数据填报":["填报任务","审核队列"],
  "盘查准备":["核算边界","排放源"],
  "核算分析":["排放清单","异常数据"],
  "报告中心":["组织排放报告","范围三专项报告"]
};

function prepareWorkflow() {
  demo.taskEntries ||= {};
  demo.auditLog ||= [];
  demo.approvedSuppliers ||= {};
  demo.supplierVersionHistory ||= {};
  supplyScope3Items.forEach(row=>{
    if(row.status==="已收集"&&!demo.approvedSuppliers[row.id])demo.approvedSuppliers[row.id]=structuredClone(row);
    const approved=demo.approvedSuppliers[row.id];
    if(approved&&!demo.supplierVersionHistory[row.id]?.length) {
      demo.supplierVersionHistory[row.id]=[{...structuredClone(approved),version:1,approvedBy:"企业管理者",approvedAt:approved.approvedAt||"2026-08-05"}];
    }
  });
  if (!demo.workflowVersion) {
    directTasks.forEach((task,index)=>{
      const old=demo.directEntries[task.id];
      const seed=[
        {activity:8620,evidence:"GAS-JX-202607-021",status:"待审核"},
        {activity:1280,evidence:"FUEL-HZ-202607-008",status:"草稿"},
        {activity:12,evidence:"HVAC-202607-CHECK",status:"通过",note:"空调维保补充 R134a 12 kg"},
        {activity:42100,evidence:"ELE-JX-202607-001",status:"通过"},
        {activity:3260,evidence:"STM-HZ-202607-004",status:"退回",reviewNote:"蒸汽结算单数量与计量月报不一致，请补充 7 月计量表读数截图后重新提交"},
        {activity:18000,evidence:"GEC-202607-019",status:"待审核"}
      ][index];
      demo.taskEntries[task.id]={...seed,...old};
    });
    demo.records.forEach(row=>{
      demo.taskEntries["REC-"+row.id]={
        activity:row.activity_value,evidence:row.evidence,status:"通过",note:row.note||""
      };
    });
    demo.workflowVersion=1;
  }
  if(!demo.auditLog.length) {
    demo.auditLog.push(
      {taskId:"T-S1-03",action:"提交审核",actor:"填报人 陈晓宁",at:"2026/8/1 09:12:40"},
      {taskId:"T-S2-01",action:"提交审核",actor:"填报人 周建华",at:"2026/8/1 10:03:18"},
      {taskId:"T-S1-03",action:"审核通过",actor:"管理者 林嘉怡",at:"2026/8/2 14:20:05"},
      {taskId:"T-S2-01",action:"审核通过",actor:"管理者 林嘉怡",at:"2026/8/2 14:22:41"},
      {taskId:"SUP-SC-004",action:"供应商提交审核",actor:"供应商 常州鑫叠电机材料",at:"2026/8/3 16:45:10"},
      {taskId:"T-S2-02",action:"提交审核",actor:"填报人 陈晓宁",at:"2026/8/4 09:30:22"},
      {taskId:"SUP-SC-002",action:"供应商提交审核",actor:"供应商 无锡华导铜业",at:"2026/8/4 11:08:57"},
      {taskId:"SUP-SC-004",action:"企业退回：电工钢牌号与采购订单不一致，请补充钢厂 EPD 或材质证明",actor:"管理者 林嘉怡",at:"2026/8/5 10:16:33"},
      {taskId:"T-S2-02",action:"退回：蒸汽结算单数量与计量月报不一致，请补充 7 月计量表读数截图后重新提交",actor:"管理者 林嘉怡",at:"2026/8/5 10:40:02"},
      {taskId:"T-S1-01",action:"提交审核",actor:"填报人 陈晓宁",at:"2026/8/6 15:02:47"},
      {taskId:"T-S2-03",action:"提交审核",actor:"填报人 周建华",at:"2026/8/6 16:21:09"}
    );
    const steel=supplyScope3Items.find(row=>row.id==="SC-004");
    if(steel&&!steel.reviewNote)steel.reviewNote="电工钢牌号与采购订单不一致，请补充钢厂 EPD 或材质证明";
  }
}

const navigateBeforeWorkflow = go;
go = function (top,group,page) {
  if(top==="组织碳排放") {
    const aliases={"范围一填报":"填报任务","范围二填报":"填报任务","范围三填报":"填报任务",
      "凭证管理":"填报任务","标准切换核算":"排放清单","类别分析":"排放清单","组织温室气体报告":"范围三专项报告","清册导出":"范围三专项报告"};
    page=aliases[page]||page;
    if(group==="供应链范围三联动"){group="数据填报";page="填报任务";taskFilters.scope="3";}
    if(group && !MENUS[top][group])group=undefined;
  }
  if(top==="供应链碳排放"&&group==="采购件碳排放填报")group="供应商协同任务";
  if(!ROLE_TOPS[currentRole].includes(top)){top="首页";group=undefined;page=undefined;}
  const allowedGroups=ROLE_GROUPS[currentRole]?.[top];
  if(allowedGroups&&!allowedGroups.includes(group)){group=allowedGroups[0];page=undefined;}
  if(currentRole==="填报人"&&page==="审核队列")page="填报任务";
  navigateBeforeWorkflow(top,group,page);
};

function enterRole(role) {
  currentRole=role;
  taskFilters={scope:"",status:"",search:""};
  saveRoleChoice();
  closeModal();
  go("首页");
  showToast("已切换为"+role+" · "+currentPerson());
}
function enterIdentity(value) {
  if(currentRole==="填报人")fillerIdentity=value;
  if(currentRole==="供应商")supplierIdentity=Number(value);
  saveRoleChoice();
  closeModal();
  go("首页");
  showToast("当前身份 · "+currentPerson());
}

renderTop = function () {
  const allowed=ROLE_TOPS[currentRole];
  document.getElementById("topNav").innerHTML=allowed.map(top=>'<button class="'+(state.top===top?'active':'')+
    '" onclick="go(\''+top+'\')">'+top+'</button>').join("");
};
renderSide = function () {
  const allowedGroups=ROLE_GROUPS[currentRole]?.[state.top];
  const groups=Object.fromEntries(Object.entries(MENUS[state.top]).filter(([group])=>!allowedGroups||allowedGroups.includes(group)));
  document.getElementById("sideTitle").textContent=state.top==="首页"?currentRole+" · "+currentPerson():state.top;
  document.getElementById("side").innerHTML=Object.entries(groups).map(([group,pages])=>{
    const visible=pages.filter(page=>currentRole!=="填报人"||page!=="审核队列");
    const active=state.group===group;
    const label=sideLabel(group);
    return '<div class="group"><button class="group-btn '+(active?'active':'')+'" title="'+label+
      '" onclick="go(\''+state.top+'\',\''+group+'\')"><span class="navMark">'+
      ({"首页总览":"⌂","组织碳看板":"▦","数据填报":"▤","盘查准备":"⚙","核算分析":"▥","报告中心":"▧","供应链看板":"▦","供应商管理":"☷","供应商协同任务":"▤","供应链因子中心":"◈","供应链分析与报告":"▧",
        "产品碳足迹看板":"▦","LCA建模与核算":"◈","产品数据管理":"☷","产品碳足迹分析":"▥","产品报告中心":"▧","碳足迹认证管理":"✓",
        "碳目标管理":"◎","履约总览":"▦","配额管理":"▤","排放核查":"✓","CCER 抵销":"◈","配额交易":"⇄","因子库管理":"◈","指标模板配置":"▤","系统设置":"⚙","系统说明":"?"}[group]||"◇")+
      '</span><span class="navLabel">'+label+'</span></button>'+
      (active&&visible.length>1?'<div class="sub">'+visible.map(page=>'<button class="'+(state.page===page?'active':'')+
        '" onclick="go(\''+state.top+'\',\''+group+'\',\''+page+'\')">'+page+'</button>').join("")+'</div>':'')+'</div>';
  }).join("");
};
function toggleSidebar() {
  document.body.classList.toggle("sidebarCollapsed");
  try {localStorage.setItem("carbon-sidebar-collapsed",String(document.body.classList.contains("sidebarCollapsed")));} catch {}
}

function workflowTasks() {
  const direct=directTasks.map((row,index)=>({
    ...row,scope:row.id.startsWith("T-S1")?"1":"2",category:"",
    org:scenarioText(row.org),owner:index%2?"周建华":"陈晓宁",period:demoPeriod,
    deadline:"2026-08-10",origin:"企业填报",
    factor:[.0021622,.00268,1.43,.0005703,.11,0][index],
    factorLabel:["天然气综合因子","柴油综合因子","R134a 制冷剂场景因子","外购电力因子","外购蒸汽情景因子","绿电凭证披露项（电量不重复计排）"][index],
    locked:false
  }));
  const records=demo.records.map(row=>({
    id:"REC-"+row.id,scope:"3",category:row.category_code,name:scenarioText(row.source_name),
    unit:row.activity_unit,org:"杭州总部",owner:"沈嘉禾",period:row.period,deadline:"2026-08-10",
    origin:"企业填报",factor:Number(demo.factors.find(f=>f.id===row.factor_id)?.factor_value||0),
    factorLabel:demo.factors.find(f=>f.id===row.factor_id)?.name||"待匹配",locked:false
  }));
  const suppliers=supplyScope3Items.map((row,index)=>({
    id:"SUP-"+row.id,scope:"3",category:row.category,name:row.part,unit:row.unit,
    org:"嘉兴装配工厂",owner:row.supplier,period:demoPeriod,deadline:"2026-08-10",origin:"供应商",
    factor:row.unitCarbon/1000,factorLabel:row.factorSource||"供应商碳排因子",
    supplierIndex:index,locked:true
  }));
  const missing=demo.categories.filter(category=>!records.some(row=>row.category===category.code)&&
    !suppliers.some(row=>row.category===category.code)).map(category=>{
      const source=demo.sources.find(row=>row.category_code===category.code);
      const factor=demo.factors.find(row=>row.id===source?.default_factor_id);
      return {id:"T-S3-"+category.code,scope:"3",category:category.code,name:source?.name||category.name,
        unit:source?.activity_unit||"项",org:"杭州总部",owner:"沈嘉禾",period:demoPeriod,deadline:"2026-08-10",
        origin:"企业填报",factor:Number(factor?.factor_value||0),factorLabel:factor?.name||"待匹配",locked:false};
    });
  return [...direct,...records,...missing,...suppliers];
}
function taskEntry(task) {
  if(task.locked) {
    const supplier=supplyScope3Items[task.supplierIndex];
    return {activity:supplier.qty,evidence:supplier.evidence,note:supplier.reviewNote||"",
      status:supplier.status==="已收集"?"通过":supplier.status==="退回补充"?"退回":supplier.status==="待审核"?"待审核":supplier.status==="草稿"?"草稿":"待填报"};
  }
  return demo.taskEntries[task.id]||{activity:"",evidence:"",status:"待填报"};
}
function entryStatus(value) {
  return '<span class="status '+({"通过":"ok","待审核":"warn","退回":"bad"}[value]||"gray")+'">'+value+'</span>';
}
function taskButton(task,review=false) {
  const entry=taskEntry(task);
  const manager=currentRole==="管理者";
  const action=manager&&entry.status==="待审核"?"审核":task.locked?"查看来源":
    ["通过","待审核","不适用"].includes(entry.status)?"查看":manager?"跟进":entry.status==="退回"?"修改":"填报";
  return '<button class="btn '+(["填报","修改","审核"].includes(action)?'primary':'')+'" onclick="openUnifiedTask(\''+task.id+'\','+(manager&&entry.status==="待审核")+')">'+action+'</button>';
}
function myTasks() {
  return workflowTasks().filter(task=>!task.locked&&task.owner===fillerIdentity);
}
function flowSteps(status,supplier=false) {
  const steps=supplier?["供应商填报","提交审核","企业审核","计入范围三"]:["填报数据","提交审核","管理者审核","计入核算"];
  const reached={"待填报":0,"草稿":0,"退回":0,"待审核":2,"通过":4,"不适用":4}[status]??0;
  return '<ol class="flowSteps">'+steps.map((step,index)=>'<li class="'+(index<reached?'done':index===reached?(status==="退回"?'back':'now'):'')+'">'+
    '<i>'+(index<reached?'✓':index+1)+'</i>'+step+(index===0&&status==="退回"?' · 已退回':'')+'</li>').join("")+'</ol>';
}
async function remindTask(taskId,who) {
  auditTask(taskId,"催办 "+who);
  persistDemo();closeModal();render();
  showToast("已向 "+who+" 发送催办提醒");
}
function plainTaskTable(tasks,review=false) {
  return '<div class="taskTable tableWrap"><table><thead><tr><th>任务 / 排放源</th><th>组织</th><th>范围</th><th>期间</th>'+
    '<th>活动量</th><th>状态</th><th>负责人 / 来源</th><th>操作</th></tr></thead><tbody>'+tasks.map(task=>{
      const entry=taskEntry(task);
      return '<tr><td><strong>'+textHtml(task.name)+'</strong><small>'+task.id+
        (task.category?' · '+categoryName(task.category):'')+'</small></td><td>'+task.org+'</td><td>范围'+task.scope+
        '</td><td>'+task.period+'</td><td>'+(entry.activity===""?"—":formatEmission(entry.activity)+' '+textHtml(task.unit))+'</td><td>'+
        entryStatus(entry.status)+'</td><td>'+textHtml(task.owner)+'<small>'+task.origin+'</small></td><td>'+taskButton(task,review)+'</td></tr>';
    }).join("")+'</tbody></table></div>';
}
orgDataEntry = function () {
  if(!backendState.ready)return needsBackend();
  const review=state.page==="审核队列";
  if(review&&currentRole!=="管理者")return '<div class="emptyState">审核队列由管理者处理。</div>';
  const tasks=(currentRole==="填报人"?myTasks():workflowTasks()).filter(task=>{
    const entry=taskEntry(task);
    return (!review||entry.status==="待审核")&&(!taskFilters.scope||task.scope===taskFilters.scope)&&
      (!taskFilters.status||entry.status===taskFilters.status)&&
      (!taskFilters.search||[task.name,task.org,task.owner,task.id].join(" ").includes(taskFilters.search));
  });
  return '<div class="breadcrumb">组织碳排放 / '+(review?"审核队列":"填报任务")+'</div>'+
    '<div class="head"><h1>'+(review?"审核队列":currentRole==="填报人"?"我的填报任务":"填报任务")+'</h1><div class="actions">'+
    '<button class="helpIcon" title="填报帮助" onclick="openInfoModal(\'填报帮助\',\'选择任务后填写活动量并上传凭证，可保存草稿或提交审核。供应商任务自动接收供应商提交的数据。审核通过后进入核算。\')">?</button>'+
    '<button class="btn" onclick="exportFirstTable()">导出任务</button></div></div>'+
    '<div class="taskToolbar"><label>范围<select id="taskScope" onchange="setTaskFilter(\'scope\',this.value)">'+
    '<option value="">全部范围</option>'+["1","2","3"].map(value=>'<option value="'+value+'" '+(taskFilters.scope===value?'selected':'')+'>范围'+value+'</option>').join("")+
    '</select></label><label>状态<select onchange="setTaskFilter(\'status\',this.value)"><option value="">全部状态</option>'+
    ["待填报","草稿","待审核","退回","通过","不适用"].map(value=>'<option '+(taskFilters.status===value?'selected':'')+'>'+value+'</option>').join("")+
    '</select></label><label class="taskSearch">查找任务<input id="taskSearch" placeholder="排放源、组织或负责人" value="'+textHtml(taskFilters.search)+'" onkeydown="if(event.key===\'Enter\')setTaskFilter(\'search\',this.value)"></label>'+
    '<button class="btn" onclick="setTaskFilter(\'search\',document.getElementById(\'taskSearch\').value)">查询</button>'+
    '<span>'+tasks.length+' 项任务</span></div>'+
    (tasks.length?plainTaskTable(tasks,review):'<div class="emptyState">当前条件下没有任务。</div>');
};
function setTaskFilter(key,value) {taskFilters[key]=value;render();}

let openTaskId;
let uploadedTaskEvidence=null;
function openUnifiedTask(id,review=false) {
  const task=workflowTasks().find(row=>row.id===id);
  if(!task)return;
  if(task.locked){editDemoSupplier(task.supplierIndex,review);return;}
  if(currentRole==="填报人"&&task.owner!==fillerIdentity){showToast("该任务不属于当前填报人");return;}
  const entry=taskEntry(task);
  const readonly=currentRole!=="填报人"||["通过","待审核","不适用"].includes(entry.status);
  review=currentRole==="管理者"&&entry.status==="待审核";
  openTaskId=id;
  uploadedTaskEvidence=entry.attachment||null;
  const taskLog=(demo.auditLog||[]).filter(row=>row.taskId===id);
  openModal('<h2>'+task.name+'</h2><div class="taskContext"><span>'+task.org+'</span><span>范围'+task.scope+
    '</span><span>'+task.period+'</span><span>截止 '+task.deadline+'</span><span>负责人 '+textHtml(task.owner)+'</span>'+entryStatus(entry.status)+'</div>'+
    flowSteps(entry.status)+
    (entry.reviewNote?'<p class="reviewNote">退回意见 · '+textHtml(entry.reviewNote)+'</p>':'')+
    '<div class="modalForm"><label>活动数据（'+textHtml(task.unit)+'）<input id="taskActivity" type="number" min="0" step="any" value="'+entry.activity+'" oninput="previewTaskEmission('+task.factor+')" '+(readonly?'readonly':'')+'></label>'+
    '<label>凭证编号<input id="taskEvidence" value="'+textHtml(entry.evidence||"")+'" '+(readonly?'readonly':'')+'></label>'+
    '<label>凭证文件<input id="taskAttachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" onchange="readTaskAttachment(this)" '+(readonly?'disabled':'')+'></label>'+
    '<label>备注<input id="taskNote" value="'+textHtml(entry.note||"")+'" '+(readonly?'readonly':'')+'></label></div>'+
    '<div id="taskAttachmentLabel">'+(entry.attachment?'<a href="'+entry.attachment.data+'" download="'+textHtml(entry.attachment.name)+'">'+textHtml(entry.attachment.name)+'</a>':'')+'</div>'+
    '<p class="calcPreview" id="taskPreview">'+taskPreviewText(entry.activity,task.factor)+'</p>'+
    '<details class="calculationHelp"><summary>核算因子与口径</summary><p>'+textHtml(task.factorLabel)+' · '+task.factor+
    ' tCO₂e / '+textHtml(task.unit)+'</p><p>活动量 × 排放因子，审核通过后计入核算。</p></details>'+
    (taskLog.length?'<details class="calculationHelp"><summary>操作记录</summary>'+taskLog.map(row=>'<p>'+row.at+' · '+row.action+' · '+row.actor+'</p>').join("")+'</details>':'')+
    '<div class="modalActions">'+(review&&entry.status==="待审核"&&currentRole==="管理者"?
      '<input id="taskReviewNote" placeholder="退回时填写原因"><button class="btn red" onclick="reviewUnifiedTask(false)">退回</button><button class="btn primary" onclick="reviewUnifiedTask(true)">审核通过</button>':
      !readonly?'<button class="btn" onclick="saveUnifiedTask(false)">保存草稿</button><button class="btn primary" onclick="saveUnifiedTask(true)">提交审核</button>':
      currentRole==="管理者"&&["待填报","草稿","退回"].includes(entry.status)?
        '<button class="btn" onclick="setTaskApplicability()">确认不适用</button><button class="btn primary" onclick="remindTask(\''+task.id+'\',\''+textHtml(task.owner)+'\')">催办 '+textHtml(task.owner)+'</button>':
      '<button class="btn" data-close-modal="1">关闭</button>')+'</div>');
}
function taskPreviewText(activity,factor) {
  if(activity===""||activity===undefined||!Number.isFinite(+activity))return "录入活动量后自动计算排放";
  return "预计排放 <b>"+formatEmission(+activity*factor)+" tCO₂e</b> · 审核通过后计入核算";
}
function previewTaskEmission(factor) {
  const element=document.getElementById("taskPreview");
  if(element)element.innerHTML=taskPreviewText(document.getElementById("taskActivity").value,factor);
}
function readTaskAttachment(input) {
  const file=input.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){showToast("请选择 3 MB 以内的凭证文件");input.value="";return;}
  const reader=new FileReader();
  reader.onload=()=>{
    uploadedTaskEvidence={name:file.name,data:reader.result};
    document.getElementById("taskAttachmentLabel").textContent=file.name;
    if(!document.getElementById("taskEvidence").value)document.getElementById("taskEvidence").value=file.name;
  };
  reader.readAsDataURL(file);
}
function auditTask(taskId,action) {
  demo.auditLog.push({taskId,action,actor:currentRole+" "+currentPerson(),at:new Date().toLocaleString("zh-CN",{hour12:false})});
}
async function saveUnifiedTask(submit) {
  const task=workflowTasks().find(row=>row.id===openTaskId);
  const old=taskEntry(task);
  if(task.locked||["通过","待审核"].includes(old.status))return;
  const value=document.getElementById("taskActivity").value;
  const evidence=document.getElementById("taskEvidence").value.trim();
  if(value===""||!Number.isFinite(+value)||+value<0||(submit&&!evidence)){showToast("请填写有效活动量，提交时需填写凭证编号或上传文件");return;}
  demo.taskEntries[task.id]={...old,activity:+value,evidence,note:document.getElementById("taskNote").value,
    status:submit?"待审核":"草稿",attachment:uploadedTaskEvidence,reviewNote:""};
  auditTask(task.id,submit?"提交审核":"保存草稿");
  persistDemo();await loadBackendData();closeModal();render();showToast(submit?"任务已提交审核":"草稿已保存");
}
async function reviewUnifiedTask(approved) {
  if(currentRole!=="管理者"){showToast("请切换管理者进行审核");return;}
  const entry=demo.taskEntries[openTaskId];
  if(!entry||entry.status!=="待审核")return;
  const note=document.getElementById("taskReviewNote").value.trim();
  if(!approved&&!note){showToast("请填写退回原因");return;}
  entry.status=approved?"通过":"退回";
  entry.reviewNote=note;
  auditTask(openTaskId,approved?"审核通过":"退回："+note);
  persistDemo();await loadBackendData();closeModal();render();showToast(approved?"已审核并更新核算":"已退回填报人");
}

const calculateBeforeWorkflow = demoCalculate;
demoCalculate = function (standardCode,org,period) {
  const result=calculateBeforeWorkflow(standardCode,org,period);
  result.detail=result.detail.filter(row=>row.id!==undefined && taskEntry({id:"REC-"+row.id}).status==="通过");
  if((!org||org===demoOrg)&&(!period||period===demoPeriod)) {
    Object.values(demo.approvedSuppliers).forEach(row=>result.detail.push({
      scope:"3",org:demoOrg,period:demoPeriod,category_code:row.category,
      source_name:row.supplier+" / "+row.part,activity_value:row.qty,activity_unit:row.unit,
      factor_value:row.unitCarbon/1000,gwp_value:1,emission_tco2e:row.total,evidence:row.evidence
    }));
  }
  result.detail.forEach(row=>{
    if(row.id!==undefined) {
      const entry=demo.taskEntries["REC-"+row.id];
      if(entry) {
        row.activity_value=entry.activity;
        row.evidence=entry.evidence;
        row.emission_tco2e=entry.activity*row.factor_value*row.gwp_value;
      }
    }
    row.scope="3";
  });
  if((!org||org===demoOrg)&&(!period||period===demoPeriod)) {
    workflowTasks().filter(task=>!task.locked&&!task.id.startsWith("REC-")).forEach(task=>{
      const entry=taskEntry(task);
      if(entry.status==="通过")result.detail.push({
        scope:task.scope,category_code:task.scope==="3"?task.category:"S"+task.scope,category_name:"范围"+task.scope,
        source_name:task.name,activity_value:entry.activity,activity_unit:task.unit,factor_value:task.factor,
        gwp_value:1,period:task.period,org:task.org,emission_tco2e:entry.activity*task.factor,evidence:entry.evidence
      });
    });
  }
  result.total_emission=result.detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  result.categories=[...new Set(result.detail.map(row=>row.category_code))].map(code=>{
    const entries=result.detail.filter(row=>row.category_code===code);
    const amount=entries.reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {category_code:code,category_name:code==="S1"?"范围一":code==="S2"?"范围二":categoryName(code),
      emission_tco2e:amount,share:result.total_emission?+(amount/result.total_emission*100).toFixed(2):0};
  });
  return result;
};

orgWorkbench = function () {
  if(!backendState.ready)return needsBackend();
  const tasks=workflowTasks();
  const done=tasks.filter(task=>["通过","不适用"].includes(taskEntry(task).status)).length;
  const pending=tasks.filter(task=>taskEntry(task).status==="待审核");
  const returned=tasks.filter(task=>taskEntry(task).status==="退回");
  return '<div class="head"><h1>组织碳工作台</h1><div class="actions"><button class="btn primary" onclick="go(\'组织碳排放\',\'数据填报\',\'填报任务\')">进入填报任务</button>'+
    (currentRole==="管理者"?'<button class="btn" onclick="go(\'组织碳排放\',\'数据填报\',\'审核队列\')">审核队列（'+pending.length+'）</button>':'')+'</div></div>'+
    kpis([["任务完成",done+"/"+tasks.length,(done/tasks.length*100).toFixed(0)+"% 已审核"],
      ["待审核",pending.length,"企业与供应商任务"],["已退回",returned.length,"待补充凭证或数据"],
      ["已审核排放",formatEmission(backendState.calculation.total_emission),"tCO₂e"]])+
    plainTaskTable(currentRole==="管理者"?pending:tasks.filter(task=>["草稿","退回","待填报"].includes(taskEntry(task).status)),currentRole==="管理者");
};

const workflowRenderBefore = render;
render = function () {
  workflowRenderBefore();
  if(!document.getElementById("sidebarToggle")) {
    document.querySelector(".logo").insertAdjacentHTML("afterend",
      '<button id="sidebarToggle" class="shellIcon" type="button" title="收起 / 展开侧栏" aria-label="收起 / 展开侧栏" onclick="toggleSidebar()">☰</button>');
  }
  if(!document.getElementById("roleSelect")) {
    document.querySelector(".right").insertAdjacentHTML("afterbegin",
      '<select id="roleSelect" aria-label="当前角色" onchange="enterRole(this.value)">'+
      ["管理者","填报人","供应商"].map(role=>'<option>'+role+'</option>').join("")+'</select>');
  }
  document.getElementById("roleSelect").value=currentRole;
  const pill=document.querySelector(".right .pill");
  pill.innerHTML=currentRole==="管理者"?"江南流体装备 · "+MANAGER_NAME:
    '<select id="identitySelect" aria-label="当前身份" onchange="enterIdentity(this.value)">'+
    (currentRole==="填报人"?FILLERS.map(name=>'<option '+(name===fillerIdentity?'selected':'')+'>'+name+'</option>').join(""):
      supplyScope3Items.map((row,index)=>'<option value="'+index+'" '+(index===supplierIdentity?'selected':'')+'>'+textHtml(row.supplier)+'</option>').join(""))+'</select>';
  const avatar=document.querySelector(".right .avatar");
  if(avatar)avatar.textContent=currentPerson().slice(0,1);
  try {document.body.classList.toggle("sidebarCollapsed",localStorage.getItem("carbon-sidebar-collapsed")==="true");}catch {}
};

function supplierAccess(index) {
  return currentRole!=="供应商" || index===supplierIdentity;
}
function supplierRowsVisible() {
  return supplyScope3Items.map((row,index)=>({row,index})).filter(({index})=>supplierAccess(index));
}
purchase = supplierTask = supplierDash = supplierMgmt = supplyFactor = function () {
  const own=currentRole==="供应商";
  const supplier=supplyScope3Items[supplierIdentity];
  return '<div class="head"><h1>'+(own?"我的数据收集任务":"供应商数据收集")+'</h1><div class="actions"><button class="btn" onclick="exportFirstTable()">导出任务</button></div></div>'+
    (own?'<div class="taskContext">'+textHtml(supplier.supplier)+' · 数据期间 '+demoPeriod+'</div>':'')+
    '<div class="tableWrap taskTable"><table><thead><tr><th>供应商 / 数据对象</th><th>范围三任务</th><th>活动量</th><th>单位碳排(kgCO₂e)</th><th>状态</th><th>已批准排放(tCO₂e)</th><th>操作</th></tr></thead><tbody>'+
    supplierRowsVisible().map(({row,index})=>'<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(row.part)+'</small></td><td>'+row.task+
      '</td><td>'+row.qty+' '+row.unit+'</td><td>'+row.unitCarbon+'</td><td>'+entryStatus(taskEntry({locked:true,supplierIndex:index}).status)+
      '</td><td>'+formatEmission(demo.approvedSuppliers[row.id]?.total||0)+'</td><td><button class="btn '+(own?'primary':'')+
      '" onclick="editDemoSupplier('+index+','+(!own)+')">'+(own?(row.status==="待审核"?"查看提交":"填报任务"):row.status==="待审核"?"审核":"查看")+'</button></td></tr>').join("")+'</tbody></table></div>';
};
orgSupplyLinkage = purchase;
let supplierUpload=null;
editDemoSupplier = function (index,review=false) {
  if(!supplierAccess(index)){showToast("该任务不属于当前供应商");return;}
  const row=supplyScope3Items[index];
  const own=currentRole==="供应商";
  const editable=own&&row.status!=="待审核";
  const approved=demo.approvedSuppliers[row.id];
  supplierUpload=row.attachment||null;
  const log=demo.auditLog.filter(item=>item.taskId==="SUP-"+row.id);
  openModal('<h2>'+textHtml(row.part)+'</h2><div class="taskContext">'+textHtml(row.supplier)+' · '+row.task+
    ' · '+demoPeriod+' · 截止 2026-08-10</div>'+flowSteps(taskEntry({locked:true,supplierIndex:index}).status,true)+(row.reviewNote?'<p class="reviewNote">退回意见 · '+textHtml(row.reviewNote)+'</p>':'')+
    '<div class="modalForm"><label>活动量（'+textHtml(row.unit)+'）<input id="demoSupplierQuantity" type="number" min="0" step="any" value="'+row.qty+'" oninput="previewSupplierEmission()" '+(!editable?'readonly':'')+'></label>'+
    '<label>单位碳排（kgCO₂e / '+row.unit+'）<input id="demoSupplierCarbon" type="number" min="0" step="any" value="'+row.unitCarbon+'" oninput="previewSupplierEmission()" '+(!editable?'readonly':'')+'></label>'+
    '<label>凭证编号<input id="supplierEvidence" value="'+textHtml(row.evidence)+'" '+(!editable?'readonly':'')+'></label>'+
    '<label>因子来源<input id="supplierSource" value="'+textHtml(row.factorSource||"供应商工艺数据与材料清单估算")+'" '+(!editable?'readonly':'')+'></label>'+
    '<label>凭证附件<input type="file" onchange="readSupplierAttachment(this)" '+(!editable?'disabled':'')+'></label></div>'+
    '<p class="calcPreview" id="supplierPreview">'+supplierPreviewText(row.qty,row.unitCarbon)+'</p>'+
    '<div id="supplierAttachmentLabel">'+(row.attachment?'<a href="'+row.attachment.data+'" download="'+textHtml(row.attachment.name)+'">'+textHtml(row.attachment.name)+'</a>':'')+'</div>'+
    (approved?'<details class="calculationHelp"><summary>已批准版本</summary><p>'+approved.qty+' '+approved.unit+' × '+approved.unitCarbon+
      ' kgCO₂e / '+approved.unit+' = '+formatEmission(approved.total)+' tCO₂e</p><p>'+textHtml(approved.evidence)+'</p>'+
      (approved.attachment?'<a href="'+approved.attachment.data+'" download="'+textHtml(approved.attachment.name)+'">'+textHtml(approved.attachment.name)+'</a>':'')+'</details>':'')+
    (log.length?'<details class="calculationHelp"><summary>操作记录</summary>'+log.map(item=>'<p>'+item.at+' · '+item.actor+' · '+textHtml(item.action)+'</p>').join("")+'</details>':'')+
    '<div class="modalActions">'+(editable?'<button class="btn" onclick="submitSupplierTask('+index+',false)">保存草稿</button>'+
      '<button class="btn primary" onclick="submitSupplierTask('+index+',true)">提交审核</button>':
      currentRole==="管理者"&&row.status==="待审核"?'<input id="supplierReviewNote" placeholder="退回时填写原因">'+
      '<button class="btn red" onclick="reviewSupplierTask('+index+',false)">退回</button>'+
      '<button class="btn primary" onclick="reviewSupplierTask('+index+',true)">审核通过</button>':
      currentRole==="管理者"&&["草稿","退回补充","待填报"].includes(row.status)?'<button class="btn primary" onclick="remindTask(\'SUP-'+row.id+'\',\''+textHtml(row.supplier)+'\')">催办供应商</button>':
      '<button class="btn" data-close-modal="1">关闭</button>')+
      '<button class="btn" onclick="showSupplierVersions('+index+')">历史批准版本</button></div>');
};
function supplierPreviewText(qty,carbon) {
  if(qty===""||carbon===""||!Number.isFinite(+qty)||!Number.isFinite(+carbon))return "录入活动量和单位碳排后自动计算";
  return "本次申报排放 <b>"+formatEmission(+qty*+carbon/1000)+" tCO₂e</b> = 活动量 × 单位碳排 ÷ 1000";
}
function previewSupplierEmission() {
  const element=document.getElementById("supplierPreview");
  if(element)element.innerHTML=supplierPreviewText(document.getElementById("demoSupplierQuantity").value,document.getElementById("demoSupplierCarbon").value);
}
function readSupplierAttachment(input) {
  const file=input.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){showToast("请选择 3 MB 以内的凭证文件");return;}
  const reader=new FileReader();
  reader.onload=()=>{
    supplierUpload={name:file.name,data:reader.result};
    document.getElementById("supplierAttachmentLabel").textContent=file.name;
    if(!document.getElementById("supplierEvidence").value)document.getElementById("supplierEvidence").value=file.name;
  };
  reader.readAsDataURL(file);
}
async function submitSupplierTask(index,submit) {
  if(currentRole!=="供应商"||!supplierAccess(index)){showToast("当前身份不能提交该供应商任务");return;}
  const row=supplyScope3Items[index];
  if(row.status==="待审核"){showToast("任务正在审核中");return;}
  const quantity=document.getElementById("demoSupplierQuantity").value;
  const factor=document.getElementById("demoSupplierCarbon").value;
  const evidence=document.getElementById("supplierEvidence").value.trim();
  const source=document.getElementById("supplierSource").value.trim();
  if(quantity===""||factor===""||!Number.isFinite(+quantity)||!Number.isFinite(+factor)||+quantity<0||+factor<0||
      (submit&&(!evidence||!source))){showToast("请填写有效的活动量、单位碳排、来源和凭证");return;}
  Object.assign(row,{qty:+quantity,unitCarbon:+factor,total:+quantity*+factor/1000,evidence,factorSource:source,
    attachment:supplierUpload,status:submit?"待审核":"草稿",sync:demo.approvedSuppliers[row.id]?"新版本待审核":"待审核后关联",reviewNote:""});
  demo.supplierRows=supplyScope3Items;
  auditTask("SUP-"+row.id,submit?"供应商提交审核":"供应商保存草稿");
  persistDemo();await loadBackendData();closeModal();render();showToast(submit?"已提交企业审核":"草稿已保存");
}
async function reviewSupplierTask(index,approved) {
  if(currentRole!=="管理者"){showToast("企业管理者才能审核供应商任务");return;}
  const row=supplyScope3Items[index];
  if(row.status!=="待审核")return;
  const note=document.getElementById("supplierReviewNote").value.trim();
  if(!approved&&!note){showToast("请填写退回原因");return;}
  row.status=approved?"已收集":"退回补充";
  row.reviewNote=note;
  row.sync=approved?"已自动关联":demo.approvedSuppliers[row.id]?"保留已批准版本":"未关联";
  if(approved) {
    const versions=demo.supplierVersionHistory[row.id] ||= [];
    const snapshot={...structuredClone(row),version:versions.length+1,approvedBy:"企业管理者 "+MANAGER_NAME,approvedAt:new Date().toLocaleString("zh-CN",{hour12:false})};
    versions.push(snapshot);
    demo.approvedSuppliers[row.id]=structuredClone(snapshot);
  }
  demo.supplierRows=supplyScope3Items;
  auditTask("SUP-"+row.id,approved?"企业审核通过并关联范围三":"企业退回："+note);
  persistDemo();await loadBackendData();closeModal();render();showToast(approved?"已关联范围三任务":"已退回供应商");
}
saveScenarioSupplier = saveDemoSupplier = function () {
  showToast("请通过当前任务的提交或审核入口操作");
};
function showSupplierVersions(index) {
  if(!supplierAccess(index)){showToast("该任务不属于当前供应商");return;}
  const row=supplyScope3Items[index];
  const versions=demo.supplierVersionHistory[row.id]||[];
  openModal('<h2>'+textHtml(row.part)+' · 历史批准版本</h2>'+
    (versions.length?versions.slice().reverse().map(snapshot=>'<section class="calculationHelp"><h3>版本 '+snapshot.version+
      '</h3><p>'+snapshot.qty+' '+textHtml(snapshot.unit)+' × '+snapshot.unitCarbon+' kgCO₂e / '+textHtml(snapshot.unit)+
      ' = '+formatEmission(snapshot.total)+' tCO₂e</p><p>因子来源 · '+textHtml(snapshot.factorSource||"供应商材料清单估算")+
      '</p><p>凭证 · '+textHtml(snapshot.evidence)+'</p><p>审核 · '+snapshot.approvedBy+' · '+snapshot.approvedAt+'</p>'+
      (snapshot.attachment?'<a href="'+snapshot.attachment.data+'" download="'+textHtml(snapshot.attachment.name)+'">'+textHtml(snapshot.attachment.name)+'</a>':'')+'</section>').join(""):
      '<p>暂无批准版本。</p>'));
}

const categoryNameBeforeWorkflow=categoryName;
categoryName=function (code) {
  return code==="S1"?"范围一":code==="S2"?"范围二":categoryNameBeforeWorkflow(code);
};

function workflowIssues() {
  return workflowTasks().filter(task=>!["通过","不适用"].includes(taskEntry(task).status));
}
function setTaskApplicability() {
  if(currentRole!=="管理者")return;
  openModal('<h2>确认任务不适用</h2><label>适用性判断依据<textarea id="applicabilityReason" placeholder="填写组织边界、业务活动及判断依据"></textarea></label>'+
    '<div class="modalActions"><button class="btn primary" onclick="saveTaskApplicability()">确认并留痕</button></div>');
}
async function saveTaskApplicability() {
  if(currentRole!=="管理者")return;
  const reason=document.getElementById("applicabilityReason").value.trim();
  if(!reason){showToast("请填写不适用依据");return;}
  const task=workflowTasks().find(row=>row.id===openTaskId);
  demo.taskEntries[task.id]={...taskEntry(task),status:"不适用",reviewNote:reason};
  auditTask(task.id,"确认不适用："+reason);
  persistDemo();await loadBackendData();closeModal();render();
}
const orgCalculationBeforeWorkflow=orgCalculation;
orgCalculation=function () {
  if(state.page!=="异常数据")return orgCalculationBeforeWorkflow();
  const tasks=workflowIssues();
  return '<div class="head"><h1>待处理数据</h1></div>'+plainTaskTable(tasks,currentRole==="管理者");
};

generateScope3Report=async function () {
  const scope3=state.page==="范围三专项报告";
  const detail=backendState.calculation.detail.filter(row=>!scope3||row.scope==="3");
  const issues=workflowIssues().filter(task=>!scope3||task.scope==="3");
  const total=detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  const categories=[...new Set(detail.map(row=>row.category_code))].map(code=>{
    const emission=detail.filter(row=>row.category_code===code).reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {category_code:code,category_name:categoryName(code),emission_tco2e:emission,share:total?emission/total*100:0};
  });
  const id=Math.max(0,...demo.reports.map(row=>row.id))+1;
  demo.reports.unshift({id,standard_code:backendState.standard,org:demoOrg,period:demoPeriod,
    type:scope3?"范围三专项报告":"组织排放报告",status:issues.length?"不完整草稿":"已核对",
    total_emission:total,content_json:JSON.stringify({...backendState.calculation,detail,categories,total_emission:total,
      incompleteTasks:issues.map(task=>({id:task.id,name:task.name,status:taskEntry(task).status}))}),
    created_at:new Date().toISOString()});
  persistDemo();render();showToast(issues.length?"已生成草稿，仍有 "+issues.length+" 项待处理任务":"已生成报告快照");
};
renderStandardReport=function () {
  if(!backendState.ready)return needsBackend();
  const scope3=state.page==="范围三专项报告";
  const issues=workflowIssues().filter(task=>!scope3||task.scope==="3");
  const details=backendState.calculation.detail.filter(row=>!scope3||row.scope==="3");
  const total=details.reduce((sum,row)=>sum+row.emission_tco2e,0);
  const rows=demo.reports.filter(row=>(row.type||"范围三专项报告")===state.page);
  return '<div class="head"><h1>'+state.page+'</h1><div class="actions"><button class="btn primary" onclick="generateScope3Report()">生成'+(issues.length?"草稿":"报告")+
    '</button></div></div><div class="taskContext"><span>'+demoPeriod+'</span><span>'+formatEmission(total)+' tCO₂e</span><span>'+details.length+' 条已批准数据</span>'+
    (issues.length?'<button class="btn soft" onclick="go(\'组织碳排放\',\'核算分析\',\'异常数据\')">'+issues.length+' 项未完成</button>':'')+'</div>'+
    table("报告快照",["编号","报告类型","期间","状态","排放(tCO₂e)","生成时间","操作"],
      rows.map(row=>[row.id,row.type||"范围三专项报告",row.period,row.status||"草稿",formatEmission(row.total_emission),row.created_at,
        '<button class="btn" onclick="downloadOrgReport('+row.id+')">下载报告</button>']));
};
downloadOrgReport=function (id) {
  const report=demo.reports.find(row=>row.id===id);
  const snapshot=JSON.parse(report.content_json);
  downloadLcaFile("江南流体装备 · "+(report.type||"范围三专项报告")+"\n"+(report.status||"草稿")+"\n"+
    standardName(report.standard_code)+"\n期间 "+report.period+"\n已批准排放 "+formatEmission(report.total_emission)+" tCO₂e\n\n"+
    snapshot.detail.map(row=>"范围"+(row.scope||"3")+" · "+scenarioText(row.source_name)+"\t"+row.activity_value+" "+row.activity_unit+
      "\t"+formatEmission(row.emission_tco2e)+" tCO₂e").join("\n")+
    "\n\n待处理任务\n"+(snapshot.incompleteTasks||[]).map(task=>task.id+" "+task.name+" "+task.status).join("\n"),
    "Carbon-"+report.id+".txt","text/plain");
};
