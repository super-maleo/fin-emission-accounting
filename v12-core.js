// v12：按 2026-11-26 评审意见重构信息架构、七个业务角色、通用图表与 Word 版报告组件。
// 加载顺序：export-kit.js 之后（最后一组）。v12-core → v12-org → v12-product → v12-supply → v12-ets → v12-config → v12-boot。

// ---------- 角色 ----------
const V12_ROLES = [
  {id:"carbonAdmin",name:"企业碳管理员",person:"高文博",dept:"集团质量健康安全环保部",legacy:"管理者",
    tops:["首页","组织碳排放","产品碳排放","供应链碳排放","碳履约","基础配置","帮助中心"],
    groups:{"基础配置":["因子库管理","指标模板配置"]}},
  {id:"filler",name:"组织碳填报人",legacy:"填报人",tops:["首页","组织碳排放","帮助中心"],
    groups:{"组织碳排放":["填报与审核"]},pages:{"填报与审核":["填报任务"]}},
  {id:"supplier",name:"供应商",legacy:"供应商",tops:["首页","供应链碳排放","帮助中心"],
    groups:{"供应链碳排放":["数据收集与审核","供应商分析报告"]},pages:{"数据收集与审核":["我的填报任务"]}},
  {id:"supplyAdmin",name:"供应商管理员",person:"陈思远",dept:"集团物资采购中心",legacy:"管理者",tops:["首页","供应链碳排放","帮助中心"]},
  {id:"lcaExpert",name:"产品碳建模专家",person:"林雪",dept:"石油化工研究院 · 产品碳足迹组",legacy:"管理者",
    tops:["首页","产品碳排放","基础配置","帮助中心"],groups:{"基础配置":["因子库管理","指标模板配置"]},pages:{"指标模板配置":["PCR 规则库"]}},
  {id:"etsExpert",name:"碳履约与核算专家",person:"王建国",dept:"滨海石化热电厂 · 碳资产管理",legacy:"管理者",
    tops:["首页","组织碳排放","碳履约","帮助中心"],groups:{"组织碳排放":["碳核算","碳盘查报告"]}},
  {id:"sysAdmin",name:"系统管理员",person:"系统管理员",dept:"信息管理部",legacy:"管理者",tops:["首页","基础配置","帮助中心"]}
];
let v12Role = "carbonAdmin";
try {
  const saved=JSON.parse(localStorage.getItem("carbon-v12-role")||"null");
  if(saved&&V12_ROLES.some(r=>r.id===saved.role)) {
    v12Role=saved.role;
    if(FILLERS.includes(saved.filler))fillerIdentity=saved.filler;
    if(Number.isInteger(saved.supplier))supplierIdentity=saved.supplier;
  }
} catch {}
function v12R(){return V12_ROLES.find(r=>r.id===v12Role)||V12_ROLES[0];}
currentRole=v12R().legacy;
function v12SaveRole(){try{localStorage.setItem("carbon-v12-role",JSON.stringify({role:v12Role,filler:fillerIdentity,supplier:supplierIdentity}));}catch{}}
function v12Person() {
  const r=v12R();
  if(r.id==="filler")return fillerIdentity;
  if(r.id==="supplier")return supplyScope3Items[supplierIdentity]?.supplier||"供应商";
  return r.person;
}
currentPerson = function () {return v12Person();};
function v12Is(...ids){return ids.includes(v12Role);}
function v12Admin(){return v12Is("carbonAdmin");}

var V12_PAGES_EXTRA = {};
// ---------- 菜单 ----------
const V12_MENUS = {
  "首页":{"首页总览":["系统总览"]},
  "组织碳排放":{
    "组织碳看板":[],
    "碳目标管理":["目标设置","目标跟踪"],
    "填报与审核":["填报任务","审核任务"],
    "盘查准备":["核算边界","排放源"],
    "碳核算":["碳台账","数据校验"],
    "碳盘查报告":[]
  },
  "产品碳排放":{
    "产品碳足迹看板":[],
    "LCA建模与核算":[],
    "产品信息":[],
    "产品碳足迹分析":[],
    "产品碳足迹报告":[],
    "碳足迹认证管理":[]
  },
  "供应链碳排放":{
    "供应链看板":[],
    "供应商管理":[],
    "数据收集与审核":["收集任务","审核任务"],
    "供应商分析报告":[]
  },
  "碳履约":{
    "履约工作台":[],
    "排放监测":[],
    "配额管理":[]
  },
  "基础配置":{
    "因子库管理":["公共因子库","企业私域因子库","供应链因子","兜底因子库","因子智能匹配"],
    "指标模板配置":["填报指标","填报模板","碳排放公式","PCR 规则库"],
    "系统设置":["组织与权限","用户角色","审批流程","字典单位"]
  },
  "帮助中心":{"常见问题":[],"用户手册":[],"行业标准参考":[]}
};
Object.keys(MENUS).forEach(key=>delete MENUS[key]);
Object.assign(MENUS,V12_MENUS);
TOPS.splice(0,TOPS.length,"首页","组织碳排放","产品碳排放","供应链碳排放","碳履约","基础配置","帮助中心");

const V12_ALIAS = {
  group:{"数据填报":"填报与审核","核算分析":"碳核算","报告中心":"碳盘查报告","凭证管理":"填报与审核","供应链范围三联动":"填报与审核",
    "供应商协同任务":"数据收集与审核","采购件碳排放填报":"数据收集与审核","供应链分析与报告":"供应商分析报告","供应链因子中心":"供应商管理",
    "产品数据管理":"产品信息","产品报告中心":"产品碳足迹报告","交易委托":"配额管理","CCER 抵销":"配额管理","配额清缴":"配额管理",
    "国家核算报告":"排放监测","核查管理":"排放监测","首页总览":"首页总览"},
  page:{"审核队列":"审核任务","排放清单":"碳台账","重复计算剔除":"数据校验","数据交叉核对":"数据校验","异常数据":"数据校验","行业核算明细":"碳台账",
    "组织架构":"核算边界","能源转供":"碳台账","目标设定":"目标设置","目标分解":"目标设置","组织排放报告":"碳盘查报告","范围三专项报告":"碳盘查报告",
    "组织权限":"组织与权限","填报因子":"填报指标","供应链因子导入":"供应链因子"}
};
function v12Groups(top) {
  const r=v12R();
  const all=Object.keys(MENUS[top]||{});
  return r.groups?.[top]?all.filter(g=>r.groups[top].includes(g)):all;
}
function v12Pages(top,group) {
  const r=v12R();
  if(r.id==="supplier"&&group==="数据收集与审核")return ["我的填报任务"];
  const all=(MENUS[top]||{})[group]||[];
  return r.pages?.[group]?all.filter(p=>r.pages[group].includes(p)):all;
}
go = function (top,group,page) {
  top=top||"首页";
  if(top==="组织碳排放"&&group==="盘查准备"&&page==="组织架构"){top="基础配置";group="系统设置";page="组织与权限";}
  if(top==="组织碳排放"&&group==="盘查准备"&&page==="能源转供"){group="碳核算";page="碳台账";v12State.ledgerTab="energy";}
  if(top==="供应链碳排放"&&group==="供应链因子中心"){top="基础配置";group="因子库管理";page="供应链因子";}
  if(top==="产品碳排放"&&group==="LCA建模与核算"&&page==="PCR 库"){top="基础配置";group="指标模板配置";page="PCR 规则库";}
  if(group)group=V12_ALIAS.group[group]||group;
  if(page)page=V12_ALIAS.page[page]||page;
  const r=v12R();
  if(!r.tops.includes(top)){top="首页";group=undefined;page=undefined;}
  const groups=v12Groups(top);
  if(!group||!groups.includes(group)){group=groups[0];page=undefined;}
  const pages=v12Pages(top,group);
  if(!page||(pages.length&&!pages.includes(page)))page=pages.length?pages[0]:group;
  if(!pages.length)page=group;
  state.top=top;state.group=group;state.page=page;
  try{closeExportMenus();}catch{}
  const panel=document.getElementById("msgPanel");if(panel)panel.hidden=true;
  renderTop();renderSide();render();
  window.scrollTo(0,0);
};
renderTop = function () {
  document.getElementById("topNav").innerHTML=v12R().tops.map(top=>'<button class="'+(state.top===top?'active':'')+'" onclick="go(\''+top+'\')">'+top+'</button>').join("");
};
const V12_ICONS = {"首页总览":"⌂","组织碳看板":"▦","碳目标管理":"◎","填报与审核":"▤","盘查准备":"⚙","碳核算":"∑","碳盘查报告":"▧",
  "产品碳足迹看板":"▦","LCA建模与核算":"◈","产品信息":"☷","产品碳足迹分析":"▥","产品碳足迹报告":"▧","碳足迹认证管理":"✓",
  "供应链看板":"▦","供应商管理":"☷","数据收集与审核":"▤","供应商分析报告":"▧","履约工作台":"▦","排放监测":"◉","配额管理":"▤",
  "因子库管理":"◈","指标模板配置":"▤","系统设置":"⚙","常见问题":"?","用户手册":"☰","行业标准参考":"§"};
function v12SideLabel(group) {
  if(group==="首页总览")return "我的工作台";
  if(group==="填报与审核"&&v12Is("filler"))return "我的填报任务";
  if(group==="数据收集与审核"&&v12Is("supplier"))return "我的填报任务";
  if(group==="供应商分析报告"&&v12Is("supplier"))return "我的碳表现报告";
  return group;
}
renderSide = function () {
  document.getElementById("sideTitle").textContent=state.top==="首页"?v12R().name+" · "+v12Person():state.top;
  document.getElementById("side").innerHTML=v12Groups(state.top).map(group=>{
    const pages=v12Pages(state.top,group);
    const active=state.group===group;
    const label=v12SideLabel(group);
    return '<div class="group"><button class="group-btn '+(active?'active':'')+'" title="'+label+'" onclick="go(\''+state.top+'\',\''+group+'\')"><span class="navMark">'+(V12_ICONS[group]||"◇")+
      '</span><span class="navLabel">'+label+'</span></button>'+
      (active&&pages.length>1?'<div class="sub">'+pages.map(page=>'<button class="'+(state.page===page?'active':'')+'" onclick="go(\''+state.top+'\',\''+group+'\',\''+page+'\')">'+page+'</button>').join("")+'</div>':'')+'</div>';
  }).join("");
};
function v12EnterRole(id) {
  v12Role=id;
  currentRole=v12R().legacy;
  taskFilters={scope:"",status:"",search:""};
  v12SaveRole();
  try{saveRoleChoice();}catch{}
  closeModal();
  go("首页");
  showToast("已切换为 "+v12R().name+" · "+v12Person());
}
enterRole = v12EnterRole;
enterIdentity = function (value) {
  if(v12Is("filler"))fillerIdentity=value;
  if(v12Is("supplier"))supplierIdentity=Number(value);
  v12SaveRole();closeModal();go("首页");showToast("当前身份 · "+v12Person());
};
function v12Chrome() {
  if(!document.getElementById("sidebarToggle")) {
    document.querySelector(".logo").insertAdjacentHTML("afterend",'<button id="sidebarToggle" class="shellIcon" type="button" title="收起 / 展开侧栏" aria-label="收起 / 展开侧栏" onclick="toggleSidebar()">☰</button>');
  }
  let select=document.getElementById("roleSelect");
  if(!select||!select.dataset.v12) {
    if(select)select.remove();
    document.querySelector(".right").insertAdjacentHTML("afterbegin",'<select id="roleSelect" data-v12="1" aria-label="当前角色" onchange="v12EnterRole(this.value)">'+
      V12_ROLES.map(r=>'<option value="'+r.id+'">'+r.name+'</option>').join("")+'</select>');
    select=document.getElementById("roleSelect");
  }
  select.value=v12Role;
  if(!document.getElementById("yearSelect")) {
    select.insertAdjacentHTML("afterend",'<select id="yearSelect" aria-label="报告年度" onchange="setReportYear(this.value)">'+REPORT_YEARS.map(y=>'<option value="'+y+'">'+y+' 年度</option>').join("")+'</select>');
  }
  document.getElementById("yearSelect").value=String(reportYear);
  const pill=document.querySelector(".right .pill");
  if(pill) {
    pill.innerHTML=v12Is("filler")?'<select id="identitySelect" aria-label="当前身份" onchange="enterIdentity(this.value)">'+FILLERS.map(n=>'<option '+(n===fillerIdentity?'selected':'')+'>'+n+'</option>').join("")+'</select>':
      v12Is("supplier")?'<select id="identitySelect" aria-label="当前身份" onchange="enterIdentity(this.value)">'+supplyScope3Items.map((row,i)=>'<option value="'+i+'" '+(i===supplierIdentity?'selected':'')+'>'+textHtml(row.supplier)+'</option>').join("")+'</select>':
      '北辰石油 · '+textHtml(v12Person());
  }
  const av=document.querySelector(".right .avatar");
  if(av)av.textContent=v12Is("sysAdmin")?"管":v12Is("supplier")?"供":String(v12Person()).slice(0,1);
  document.body.dataset.role=currentRole;
  document.body.dataset.v12role=v12Role;
  document.body.dataset.top=state.top;
  document.body.classList.toggle("historyMode",isHistoryYear());
  try{updateBell();}catch{}
}

// ---------- 状态 ----------
const v12State = {ledgerTab:"ledger",ledgerScope:"",ledgerOrg:"",checkTab:"all",dashS:"12",srcView:"chart",srcScope:"",orgMetric:"emission",trendMode:"12",
  taskScope:"",taskStatus:"",taskOrg:"",taskQ:"",reviewTab:"todo",reportStd:"GHG",boundaryStep:0,boundaryEntity:"",targetSel:"",cfpModel:"",
  supTab:"all",supQ:"",supCat:"",supReport:0,etsTab:"quota",cfgOrg:"集团总部",tplSel:"",fmScope:"",indScope:"",matchTask:""};
function v12() {
  demo.v12 ||= {};
  return demo.v12;
}
function v12Persist(){try{persistDemo();}catch(error){console.error(error);}}

// ---------- 通用小部件 ----------
const v12Q = s=>String(s??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;").replace(/\n/g," ");
const v12H = s=>textHtml(String(s??""));
function v12Head(title,actions="",crumb) {
  const c=crumb??(state.top+(state.group&&state.group!==title?" / "+state.group:"")+(state.page&&state.page!==state.group&&state.page!==title?" / "+state.page:"")+(title!==state.group?"":""));
  return '<div class="breadcrumb">'+v12H(c)+'</div><div class="head"><h1>'+v12H(title)+'</h1><div class="actions">'+actions+'</div></div>';
}
function v12Panel(title,body,extra="",cls="") {
  return '<section class="panel '+cls+'"><div class="panelHead"><h3>'+title+'</h3><div class="panelTools">'+extra+'</div></div>'+body+'</section>';
}
function v12Tabs(items,active,handler) {
  return '<div class="v12Tabs">'+items.map(([id,label,badge])=>'<button class="'+(id===active?'active':'')+'" onclick="'+handler+'(\''+v12Q(id)+'\')">'+label+(badge!==undefined&&badge!==""?'<em>'+badge+'</em>':'')+'</button>').join("")+'</div>';
}
function v12Seg(items,active,handler) {
  return '<div class="v12Seg">'+items.map(([id,label])=>'<button class="'+(id===active?'active':'')+'" onclick="'+handler+'(\''+v12Q(id)+'\')">'+label+'</button>').join("")+'</div>';
}
function v12Set(key,value){v12State[key]=value;render();}
function v12Tag(label,tone="gray"){return '<span class="status '+tone+'">'+v12H(label)+'</span>';}
function v12Table(heads,rows,opts={}) {
  return '<div class="tableWrap'+(opts.cls?' '+opts.cls:'')+'"><table'+(opts.nopage?' data-nopage':'')+'><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+
    (rows.length?rows.map(r=>'<tr'+(r.cls?' class="'+r.cls+'"':'')+(r.click?' class="clickRow" onclick="'+r.click+'"':'')+'>'+(r.cells||r).map(c=>'<td>'+(c??'—')+'</td>').join("")+'</tr>').join(""):
      '<tr><td colspan="'+heads.length+'" class="emptyCell">'+(opts.empty||"暂无数据")+'</td></tr>')+'</tbody></table></div>';
}
function v12Num(v,d=0){return fmt(v,d);}
function v12Wan(v,d=1){return fmt(v/10000,d);}
function v12Big(v){const a=Math.abs(v);return a>=1e8?fmt(v/1e8,2)+" 亿":a>=1e4?fmt(v/1e4,a>=1e6?0:1)+" 万":fmt(v,a>=100?0:1);}
function v12Kpi(label,value,note,action,tone) {
  return '<div class="statTile'+(action?' clickable':'')+'" '+(action?'role="button" tabindex="0" onclick="'+action+'"':'')+'><span>'+label+'</span><b'+(tone?' class="'+tone+'"':'')+'>'+value+'</b><small>'+(note||"")+'</small></div>';
}
function v12Steps(steps,active,handler,done) {
  return '<ol class="v12Steps">'+steps.map((s,i)=>{
    const state=i<active||done?.(i)?"done":i===active?"now":"";
    return '<li class="'+state+'"'+(handler?' onclick="'+handler+'('+i+')"':'')+'><i>'+(state==="done"&&i!==active?'✓':i+1)+'</i><span><b>'+s[0]+'</b>'+(s[1]?'<small>'+s[1]+'</small>':'')+'</span></li>';
  }).join("")+'</ol>';
}
function v12Empty(text){return '<div class="emptyState">'+text+'</div>';}
function v12Modal(title,body,actions) {
  openModal('<h2>'+title+'</h2>'+body+'<div class="modalActions">'+(actions||'<button class="btn" data-close-modal="1">关闭</button>')+'</div>');
}
function v12Field(label,input,cls=""){return '<label class="'+cls+'">'+label+input+'</label>';}
function v12Val(id){const el=document.getElementById(id);return el?el.value.trim():"";}
function v12Today(){return todayText();}
function v12Now(){return nowText().slice(0,16);}

// ---------- 图表（SVG） ----------
const V12_PALETTE = ["#26890D","#86BC25","#0F6E56","#2C6AA0","#B7791F","#6B4FA0","#0097A9","#C2410C","#667085","#A3B18A","#1F5F99","#D97706","#7C3AED","#0E7490","#9CA3AF"];
function v12Color(i){return V12_PALETTE[i%V12_PALETTE.length];}
function v12Arc(cx,cy,r,a0,a1) {
  const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
  return {x0,y0,x1,y1,large:a1-a0>Math.PI?1:0};
}
// data: [{label,value,color,action}]
function v12Pie(data,opts={}) {
  const size=opts.size||220,r=size/2-6,cx=size/2,cy=size/2,inner=opts.donut===false?0:r*0.58;
  const total=data.reduce((s,d)=>s+Math.max(d.value,0),0)||1;
  let a=-Math.PI/2;
  const parts=data.map((d,i)=>{
    const v=Math.max(d.value,0),span=v/total*Math.PI*2;
    const color=d.color||v12Color(i);
    if(span>=Math.PI*2-1e-6){a+=span;return '<circle cx="'+cx+'" cy="'+cy+'" r="'+(inner?(r+inner)/2:r)+'" fill="'+(inner?'none':color)+'" stroke="'+color+'" stroke-width="'+(inner?r-inner:0)+'"><title>'+v12H(d.label)+'</title></circle>';}
    const o=v12Arc(cx,cy,r,a,a+span),n=v12Arc(cx,cy,inner,a,a+span);
    const path=inner?'M'+o.x0+' '+o.y0+' A'+r+' '+r+' 0 '+o.large+' 1 '+o.x1+' '+o.y1+' L'+n.x1+' '+n.y1+' A'+inner+' '+inner+' 0 '+o.large+' 0 '+n.x0+' '+n.y0+' Z':
      'M'+cx+' '+cy+' L'+o.x0+' '+o.y0+' A'+r+' '+r+' 0 '+o.large+' 1 '+o.x1+' '+o.y1+' Z';
    a+=span;
    return '<path d="'+path+'" fill="'+color+'" stroke="#fff" stroke-width="1.5"'+(d.action?' style="cursor:pointer" onclick="'+d.action+'"':'')+'><title>'+v12H(d.label)+' · '+fmt(v,0)+' · '+(v/total*100).toFixed(1)+'%</title></path>';
  }).join("");
  const center=inner&&opts.center?'<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" class="v12PieV">'+v12H(opts.center[0])+'</text><text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" class="v12PieL">'+v12H(opts.center[1])+'</text>':'';
  const legend=opts.legend===false?'':'<ul class="v12Legend">'+data.map((d,i)=>'<li'+(d.action?' class="click" onclick="'+d.action+'"':'')+'><i style="background:'+(d.color||v12Color(i))+'"></i><span>'+v12H(d.label)+'</span><b>'+(d.display??fmt(d.value,0))+'</b><em>'+(Math.max(d.value,0)/total*100).toFixed(1)+'%</em></li>').join("")+'</ul>';
  return '<div class="v12PieWrap'+(opts.vertical?' vertical':'')+'"><svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" role="img">'+parts+center+'</svg>'+legend+'</div>';
}
// 气泡：面积与数值成正比的打包布局
function v12Bubbles(data,opts={}) {
  const W=opts.width||640,H=opts.height||300;
  const items=data.filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  if(!items.length)return v12Empty("暂无数据");
  const max=items[0].value;
  const maxR=Math.min(H*0.36,W*0.2);
  const minR=opts.minR||16;
  const placed=[];
  items.forEach((d,i)=>{
    const r=Math.max(minR,Math.sqrt(d.value/max)*maxR);
    let best=null;
    if(!placed.length)best={x:W/2,y:H/2};
    else {
      for(let k=0;k<1800&&!best;k++){
        const ang=k*0.37,rad=4+k*0.9;
        const x=W/2+Math.cos(ang)*rad*1.45,y=H/2+Math.sin(ang)*rad*0.8;
        if(x-r<2||x+r>W-2||y-r<2||y+r>H-2)continue;
        if(placed.every(p=>Math.hypot(p.x-x,p.y-y)>=p.r+r+3))best={x,y};
      }
      if(!best)best={x:W-r-4,y:r+4};
    }
    placed.push({...d,x:best.x,y:best.y,r,color:d.color||v12Color(i)});
  });
  const total=items.reduce((s,d)=>s+d.value,0);
  return '<svg class="v12Bubble" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img">'+placed.map(p=>{
    const share=p.value/total*100;
    const big=p.r>=34;
    return '<g'+(p.action?' style="cursor:pointer" onclick="'+p.action+'"':'')+'><circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+p.r.toFixed(1)+'" fill="'+p.color+'" fill-opacity=".82" stroke="#fff" stroke-width="2"><title>'+v12H(p.label)+' · '+fmt(p.value,0)+' tCO₂e · '+share.toFixed(1)+'%</title></circle>'+
      (p.r>=22?'<text x="'+p.x.toFixed(1)+'" y="'+(p.y-(big?4:0)).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" class="v12BubT" style="font-size:'+Math.min(14,Math.max(10,p.r/3.4))+'px">'+v12H(p.short||p.label)+'</text>':'')+
      (big?'<text x="'+p.x.toFixed(1)+'" y="'+(p.y+13).toFixed(1)+'" text-anchor="middle" class="v12BubV">'+(p.display||v12Big(p.value))+'</text>':'')+'</g>';
  }).join("")+'</svg>';
}
// 纵向柱状：series [{label, value, color, hollow, target, note, action}]
function v12Columns(rows,opts={}) {
  const W=opts.width||640,H=opts.height||240,padL=opts.padL??54,padB=opts.padB??(opts.rotate?64:34),padT=22,padR=opts.padR??12;
  const vals=rows.flatMap(r=>[r.value||0,r.target||0,...(r.stack||[]).map(()=>0)]);
  const stackSum=r=>r.stack?r.stack.reduce((s,x)=>s+x.value,0):r.value||0;
  const maxV=Math.max(...rows.map(stackSum),...vals,0)*1.1||1;
  const n=rows.length,slot=(W-padL-padR)/n,bw=Math.min(opts.barW||44,slot*0.62);
  const y=v=>padT+(H-padT-padB)*(1-v/maxV);
  const ticks=4,grid=Array.from({length:ticks+1},(_,i)=>{const v=maxV/ticks*i;return '<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y(v)+'" y2="'+y(v)+'" class="v12Grid"/><text x="'+(padL-6)+'" y="'+(y(v)+4)+'" text-anchor="end" class="v12Ax">'+(opts.axisFmt?opts.axisFmt(v):v12Big(v))+'</text>';}).join("");
  let targetLine="";
  const tPts=rows.map((r,i)=>r.target?[padL+slot*i+slot/2,y(r.target)]:null).filter(Boolean);
  if(tPts.length>1&&opts.targetLine!==false)targetLine='<polyline points="'+tPts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(" ")+'" class="v12TLine"/>';
  const bars=rows.map((r,i)=>{
    const x=padL+slot*i+(slot-bw)/2;
    let g='';
    if(r.stack){
      let acc=0;
      r.stack.forEach((s,k)=>{const y0=y(acc),y1=y(acc+s.value);g+='<rect x="'+x.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,y0-y1).toFixed(1)+'" fill="'+(s.color||v12Color(k))+'"><title>'+v12H(r.label+" · "+s.label+" "+fmt(s.value,0))+'</title></rect>';acc+=s.value;});
    } else if(r.value) {
      g+='<rect x="'+x.toFixed(1)+'" y="'+y(r.value).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-padB-y(r.value)).toFixed(1)+'" rx="3" fill="'+(r.hollow?'#fff':(r.color||opts.color||"#86BC25"))+'"'+(r.hollow?' stroke="'+(r.color||"#86BC25")+'" stroke-dasharray="4 3" stroke-width="1.5"':'')+'><title>'+v12H(r.label+" · "+(r.display||fmt(r.value,0)))+'</title></rect>';
    }
    const top=stackSum(r);
    if(opts.labels!==false&&top)g+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y(top)-5).toFixed(1)+'" text-anchor="middle" class="v12Val">'+(r.display||(opts.valFmt?opts.valFmt(top):v12Big(top)))+'</text>';
    if(r.target)g+='<line x1="'+(x-6).toFixed(1)+'" x2="'+(x+bw+6).toFixed(1)+'" y1="'+y(r.target).toFixed(1)+'" y2="'+y(r.target).toFixed(1)+'" class="v12TMark"><title>目标 '+fmt(r.target,0)+'</title></line>';
    const lx=x+bw/2,ly=H-padB+15;
    g+=opts.rotate?'<text transform="translate('+lx.toFixed(1)+','+(ly-4)+') rotate(-32)" text-anchor="end" class="v12Ax">'+v12H(r.label)+'</text>':'<text x="'+lx.toFixed(1)+'" y="'+ly+'" text-anchor="middle" class="v12Ax">'+v12H(r.label)+'</text>';
    if(r.sub)g+='<text x="'+lx.toFixed(1)+'" y="'+(ly+14)+'" text-anchor="middle" class="v12AxS">'+v12H(r.sub)+'</text>';
    return '<g'+(r.action?' style="cursor:pointer" onclick="'+r.action+'"':'')+'>'+g+'</g>';
  }).join("");
  let line2="";
  if(opts.line){
    const lmax=Math.max(...rows.map(r=>r.line||0))*1.15||1;
    const ly2=v=>padT+(H-padT-padB)*(1-v/lmax);
    const pts=rows.map((r,i)=>[padL+slot*i+slot/2,ly2(r.line||0)]);
    line2='<polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(" ")+'" class="v12Line2"/>'+pts.map((p,i)=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.5" class="v12Dot2"><title>'+v12H(rows[i].label+" · "+opts.line+" "+fmt(rows[i].line,2))+'</title></circle>').join("");
  }
  return '<svg class="v12Col" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img">'+grid+bars+targetLine+line2+'<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+(H-padB)+'" y2="'+(H-padB)+'" class="v12Base"/></svg>';
}
function v12LegendRow(items){return '<div class="v12LegendRow">'+items.map(([label,color,kind])=>'<span><i class="'+(kind||"")+'" style="'+(kind==="line"?'border-color:'+color:'background:'+color)+'"></i>'+label+'</span>').join("")+'</div>';}
function v12Radar(axes,series,opts={}) {
  const S=opts.size||240,c=S/2,R=S/2-34,n=axes.length;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [c+Math.cos(a)*R*v,c+Math.sin(a)*R*v];};
  let g='';
  [0.25,0.5,0.75,1].forEach(k=>{g+='<polygon points="'+axes.map((_,i)=>pt(i,k).map(x=>x.toFixed(1)).join(",")).join(" ")+'" class="v12RGrid"/>';});
  axes.forEach((a,i)=>{const [x,y]=pt(i,1);const [lx,ly]=pt(i,1.18);g+='<line x1="'+c+'" y1="'+c+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="v12RGrid"/><text x="'+lx.toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" text-anchor="middle" class="v12Ax">'+v12H(a)+'</text>';});
  series.forEach((s,k)=>{g+='<polygon points="'+s.values.map((v,i)=>pt(i,v/100).map(x=>x.toFixed(1)).join(",")).join(" ")+'" fill="'+(s.color||v12Color(k))+'" fill-opacity="'+(k?0.08:0.28)+'" stroke="'+(s.color||v12Color(k))+'" stroke-width="2"'+(k?' stroke-dasharray="4 3"':'')+'/>';
    if(!k)s.values.forEach((v,i)=>{const [x,y]=pt(i,v/100);g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3" fill="'+(s.color||v12Color(k))+'"><title>'+v12H(axes[i]+" "+v)+'</title></circle>';});});
  return '<svg class="v12Radar" viewBox="0 0 '+S+' '+S+'" width="'+S+'" height="'+S+'">'+g+'</svg>';
}
function v12Scatter(points,opts={}) {
  const W=opts.width||560,H=opts.height||280,pl=48,pb=36,pt=14,pr=14;
  const xmax=opts.xmax||Math.max(...points.map(p=>p.x))*1.1||1,ymax=opts.ymax||Math.max(...points.map(p=>p.y))*1.1||1;
  const xmin=opts.xmin||0,ymin=opts.ymin||0;
  const X=v=>pl+(W-pl-pr)*(v-xmin)/(xmax-xmin),Y=v=>pt+(H-pt-pb)*(1-(v-ymin)/(ymax-ymin));
  let g='';
  if(opts.quad){const qx=X(opts.quad[0]),qy=Y(opts.quad[1]);
    g+='<rect x="'+pl+'" y="'+pt+'" width="'+(qx-pl)+'" height="'+(qy-pt)+'" fill="#FEF3F2"/><rect x="'+qx+'" y="'+pt+'" width="'+(W-pr-qx)+'" height="'+(qy-pt)+'" fill="#FFFAEB"/><rect x="'+pl+'" y="'+qy+'" width="'+(qx-pl)+'" height="'+(H-pb-qy)+'" fill="#FFFAEB"/><rect x="'+qx+'" y="'+qy+'" width="'+(W-pr-qx)+'" height="'+(H-pb-qy)+'" fill="#F3F8EA"/>';
    (opts.quadLabels||[]).forEach(([t,x,y,a])=>{g+='<text x="'+x+'" y="'+y+'" text-anchor="'+(a||"start")+'" class="v12QL">'+t+'</text>';});}
  g+='<line x1="'+pl+'" y1="'+(H-pb)+'" x2="'+(W-pr)+'" y2="'+(H-pb)+'" class="v12Base"/><line x1="'+pl+'" y1="'+pt+'" x2="'+pl+'" y2="'+(H-pb)+'" class="v12Base"/>';
  g+='<text x="'+((W+pl)/2)+'" y="'+(H-6)+'" text-anchor="middle" class="v12Ax">'+v12H(opts.xLabel||"")+'</text><text transform="translate(12,'+((H-pb+pt)/2)+') rotate(-90)" text-anchor="middle" class="v12Ax">'+v12H(opts.yLabel||"")+'</text>';
  points.forEach((p,i)=>{g+='<g'+(p.action?' style="cursor:pointer" onclick="'+p.action+'"':'')+'><circle cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(p.r||6)+'" fill="'+(p.color||v12Color(i))+'" fill-opacity=".8" stroke="#fff"><title>'+v12H(p.label)+'</title></circle>'+(p.tag?'<text x="'+(X(p.x)+8).toFixed(1)+'" y="'+(Y(p.y)+4).toFixed(1)+'" class="v12AxS">'+v12H(p.tag)+'</text>':'')+'</g>';});
  return '<svg class="v12Scatter" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">'+g+'</svg>';
}
function v12HBars(rows,opts={}) {
  const max=Math.max(...rows.map(r=>r.value),0)||1;
  return '<div class="v12HBars">'+rows.map((r,i)=>'<div class="v12HBar'+(r.action?' click':'')+'" '+(r.action?'onclick="'+r.action+'"':'')+'><span class="l">'+(r.rank?'<em>'+r.rank+'</em>':'')+v12H(r.label)+(r.sub?'<small>'+v12H(r.sub)+'</small>':'')+'</span><span class="t"><i style="width:'+Math.max(r.value/max*100,r.value?1.2:0)+'%;background:'+(r.color||opts.color||v12Color(i))+'"></i></span><span class="v">'+(r.display??fmt(r.value,0))+(opts.unit?'<small>'+opts.unit+'</small>':'')+'</span></div>').join("")+'</div>';
}
function v12Progress(done,total,tone){const p=total?Math.round(done/total*100):0;return '<span class="v12Prog '+(tone||"")+'"><i style="width:'+p+'%"></i></span><small class="v12ProgT">'+p+'%</small>';}

// ---------- Word 版报告 ----------
// 结构：.wdDoc > .wdCover(.wdTitle h1, .wdSub, table.wdMeta, .wdOrg) + .wdToc + section.wdSec(h2, h3, p, table, ul, figure)
function v12Doc(cover,sections,opts={}) {
  const toc='<div class="wdPage wdTocPage"><h2 class="wdTocTitle">目 录</h2><ol class="wdToc">'+sections.map((s,i)=>'<li><a href="#wd-'+i+'" onclick="event.preventDefault();document.getElementById(\'wd-'+i+'\').scrollIntoView({behavior:\'smooth\'})">'+v12H(s.title)+'</a>'+
    (s.subs?.length?'<ol>'+s.subs.map(t=>'<li>'+v12H(t)+'</li>').join("")+'</ol>':'')+'</li>').join("")+'</ol></div>';
  return '<article class="wdDoc rptDoc" data-title="'+v12H(cover.title||(cover.titleLines||[]).join(' '))+'"><div class="wdPage wdCover">'+(cover.logo!==false?'<div class="wdLogo">北辰石油<small>BEICHEN PETROLEUM</small></div>':'')+
    '<div class="wdCoverMid"><h1 class="wdTitle">'+cover.titleLines.map(v12H).join("<br>")+'</h1>'+(cover.en?'<p class="wdEn">'+v12H(cover.en)+'</p>':'')+(cover.sub?'<p class="wdSubT">'+v12H(cover.sub)+'</p>':'')+'</div>'+
    '<table class="wdMeta">'+cover.meta.map(([k,v])=>'<tr><th>'+v12H(k)+'</th><td>'+v12H(v)+'</td></tr>').join("")+'</table>'+
    '<div class="wdOrg">'+v12H(cover.org)+'<br>'+v12H(cover.date)+'</div></div>'+(opts.noToc?'':toc)+
    sections.map((s,i)=>'<section class="wdPage wdSec" id="wd-'+i+'"><h2>'+v12H(s.title)+'</h2>'+s.body+'</section>').join("")+'</article>';
}
function v12DocTable(heads,rows,opts={}) {
  return '<table class="wdTable'+(opts.cls?' '+opts.cls:'')+'">'+(opts.caption?'<caption>'+v12H(opts.caption)+'</caption>':'')+'<thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(r.cls?' class="'+r.cls+'"':'')+'>'+(r.cells||r).map(c=>'<td>'+(c??"—")+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function v12Fig(svg,caption){return '<figure class="wdFig">'+svg+'<figcaption>'+v12H(caption)+'</figcaption></figure>';}

// Word 导出：封面、目录域、标题编号、表格、图片（SVG 转 PNG）、页眉页脚页码
async function v12SvgPng(svg) {
  const vb=(svg.getAttribute("viewBox")||"0 0 600 300").split(/\s+/).map(Number);
  const w=vb[2],h=vb[3],scale=2;
  const clone=svg.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("width",w);clone.setAttribute("height",h);
  const css='text{font-family:Arial,"Microsoft YaHei",sans-serif}.v12Ax,.v12AxS{font-size:11px;fill:#667085}.v12Val{font-size:11px;fill:#344054;font-weight:600}.v12Grid{stroke:#EEF2F6}.v12Base{stroke:#D0D5DD}.v12TLine{fill:none;stroke:#D92D20;stroke-width:1.6;stroke-dasharray:5 4}.v12TMark{stroke:#D92D20;stroke-width:2.4}.v12Line2{fill:none;stroke:#2C6AA0;stroke-width:2}.v12Dot2{fill:#2C6AA0}.v12PieV{font-size:18px;font-weight:700;fill:#101828}.v12PieL{font-size:11px;fill:#667085}.v12BubT{fill:#fff;font-weight:600}.v12BubV{fill:#fff;font-size:11px}.v12RGrid{fill:none;stroke:#E5E7EB}';
  clone.insertAdjacentHTML("afterbegin","<style>"+css+"</style>");
  const data="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(clone));
  const img=new Image();
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=fail;img.src=data;});
  const canvas=document.createElement("canvas");canvas.width=w*scale;canvas.height=h*scale;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const b64=canvas.toDataURL("image/png").split(",")[1];
  const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return {bytes,w,h};
}
async function v12Docx(docEl,name) {
  const X=xmlEsc;
  const rPr=(o={})=>'<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="宋体"/>'+(o.b?'<w:b/>':'')+(o.color?'<w:color w:val="'+o.color+'"/>':'')+(o.sz?'<w:sz w:val="'+o.sz+'"/><w:szCs w:val="'+o.sz+'"/>':'')+'</w:rPr>';
  const run=(t,o)=>'<w:r>'+rPr(o)+'<w:t xml:space="preserve">'+X(t)+'</w:t></w:r>';
  const p=(t,o={})=>'<w:p><w:pPr>'+(o.style?'<w:pStyle w:val="'+o.style+'"/>':'')+(o.jc?'<w:jc w:val="'+o.jc+'"/>':'')+(o.ind?'<w:ind w:firstLine="420"/>':'')+(o.space?'<w:spacing w:before="'+o.space[0]+'" w:after="'+o.space[1]+'"/>':'')+(o.num?'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>':'')+'</w:pPr>'+run(t,o)+'</w:p>';
  const pageBreak='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const media=[];
  const tbl=(rows,head=true,widths)=>{
    const cols=Math.max(...rows.map(r=>r.length));const W=9000;
    const cw=widths||Array.from({length:cols},()=>Math.floor(W/cols));
    const border='<w:tblBorders><w:top w:val="single" w:sz="8" w:color="404040"/><w:bottom w:val="single" w:sz="8" w:color="404040"/><w:left w:val="single" w:sz="4" w:color="A0A0A0"/><w:right w:val="single" w:sz="4" w:color="A0A0A0"/><w:insideH w:val="single" w:sz="4" w:color="A0A0A0"/><w:insideV w:val="single" w:sz="4" w:color="A0A0A0"/></w:tblBorders>';
    return '<w:tbl><w:tblPr><w:tblW w:w="'+W+'" w:type="dxa"/><w:jc w:val="center"/>'+border+'<w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+cw.map(w=>'<w:gridCol w:w="'+w+'"/>').join("")+'</w:tblGrid>'+
      rows.map((r,ri)=>'<w:tr>'+(ri===0&&head?'<w:trPr><w:tblHeader/></w:trPr>':'')+Array.from({length:cols},(_,c)=>'<w:tc><w:tcPr><w:tcW w:w="'+cw[c]+'" w:type="dxa"/>'+(ri===0&&head?'<w:shd w:val="clear" w:color="auto" w:fill="E8F2DA"/>':'')+'<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="260" w:lineRule="auto"/>'+(ri===0&&head?'<w:jc w:val="center"/>':'')+'</w:pPr>'+run(r[c]??"",{b:ri===0&&head,sz:18})+'</w:p></w:tc>').join("")+'</w:tr>').join("")+'</w:tbl>'+p("",{space:[0,60]});
  };
  const image=async svg=>{
    try{
      const png=await v12SvgPng(svg);
      const id=media.length+1;media.push({name:"image"+id+".png",bytes:png.bytes});
      const cx=Math.round(5600000),cy=Math.round(cx*png.h/png.w);
      return '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="图'+id+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
    }catch(error){console.error(error);return "";}
  };
  const cell=el=>(el.innerText??el.textContent??"").replace(/\s*\n\s*/g," ").trim();
  // 封面
  const cover=docEl.querySelector(".wdCover");
  let body=p("北辰石油天然气集团有限公司",{jc:"left",color:"26890D",b:true,sz:24});
  for(let i=0;i<6;i++)body+=p("");
  cover.querySelector(".wdTitle").innerHTML.split(/<br\s*\/?>/i).map(s=>s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&")).forEach(line=>body+=p(line,{jc:"center",b:true,sz:44}));
  const en=cover.querySelector(".wdEn");if(en)body+=p(cell(en),{jc:"center",sz:24,color:"555555"});
  const sub=cover.querySelector(".wdSubT");if(sub)body+=p(cell(sub),{jc:"center",sz:24});
  for(let i=0;i<4;i++)body+=p("");
  const metaRows=[...cover.querySelectorAll(".wdMeta tr")].map(tr=>[cell(tr.children[0]),cell(tr.children[1])]);
  body+=tbl(metaRows,false,[2600,6400]);
  for(let i=0;i<3;i++)body+=p("");
  cell(cover.querySelector(".wdOrg")).split(/\s{2,}|\n/).forEach(line=>body+=p(line,{jc:"center",sz:24,b:true}));
  body+=pageBreak;
  // 目录（Word 域，打开后按 F9 更新页码）
  body+=p("目 录",{jc:"center",b:true,sz:32,space:[120,240]});
  body+='<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>';
  docEl.querySelectorAll(".wdSec").forEach(sec=>{
    body+=p(cell(sec.querySelector("h2")),{sz:22});
    sec.querySelectorAll("h3").forEach(h=>body+='<w:p><w:pPr><w:ind w:left="420"/></w:pPr>'+run(cell(h),{sz:20})+'</w:p>');
  });
  body+='<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'+pageBreak;
  // 正文
  const secs=[...docEl.querySelectorAll(".wdSec")];
  for(let si=0;si<secs.length;si++){
    const sec=secs[si];
    body+=p(cell(sec.querySelector("h2")),{style:"Heading1",b:true,sz:30});
    const walk=async node=>{
      for(const el of [...node.children]){
        const tag=el.tagName.toLowerCase();
        if(tag==="h2")continue;
        if(tag==="h3")body+=p(cell(el),{style:"Heading2",b:true,sz:26});
        else if(tag==="h4")body+=p(cell(el),{style:"Heading3",b:true,sz:22});
        else if(tag==="p")body+=p(cell(el),{ind:!el.classList.contains("wdNote"),sz:el.classList.contains("wdNote")?18:21});
        else if(tag==="ul"||tag==="ol")[...el.querySelectorAll(":scope>li")].forEach(li=>body+=p("· "+cell(li),{sz:21}));
        else if(tag==="table"){
          const cap=el.querySelector("caption");if(cap)body+=p(cell(cap),{jc:"center",b:true,sz:20});
          const rows=[...el.querySelectorAll("tr")].map(tr=>[...tr.children].map(cell));
          if(rows.length)body+=tbl(rows,!!el.querySelector("thead"));
        }
        else if(tag==="figure"){const svg=el.querySelector("svg");if(svg)body+=await image(svg);const fc=el.querySelector("figcaption");if(fc)body+=p(cell(fc),{jc:"center",sz:18,color:"555555"});}
        else if(el.classList.contains("wdSign"))[...el.children].forEach(c=>body+=p(cell(c),{sz:21}));
        else if(el.classList.contains("wdKpis"))body+=tbl([["指标","数值"],...[...el.children].map(d=>[cell(d.querySelector("span")),cell(d.querySelector("b"))+" "+cell(d.querySelector("small")||{textContent:""})])]);
        else if(tag==="svg"){body+=await image(el);}
        else await walk(el);
      }
    };
    await walk(sec);
    if(si<secs.length-1&&sec.dataset.break!=="no")body+=pageBreak;
  }
  const title=docEl.dataset.title||name;
  const sect='<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1300" w:bottom="1300" w:left="1300" w:header="700" w:footer="700" w:gutter="0"/><w:titlePg/></w:sectPr>';
  const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+ns+'><w:body>'+body+sect+'</w:body></w:document>';
  const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+ns+'><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="86BC25"/></w:pBdr><w:jc w:val="right"/></w:pPr>'+run(title,{sz:16,color:"666666"})+'</w:p></w:hdr>';
  const footer='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+ns+'><w:p><w:pPr><w:jc w:val="center"/></w:pPr>'+run("第 ",{sz:18})+'<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'+run(" 页",{sz:18})+'</w:p></w:ftr>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="宋体"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:eastAsia="黑体"/><w:b/><w:sz w:val="30"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:eastAsia="黑体"/><w:b/><w:sz w:val="26"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style></w:styles>';
  const settings='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:updateFields w:val="true"/></w:settings>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+
    media.map((m,i)=>'<Relationship Id="rIdImg'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+m.name+'"/>').join("")+'</Relationships>';
  const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  const core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+X(title)+'</dc:title><dc:creator>北辰石油天然气集团有限公司</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().slice(0,19)+'Z</dcterms:created></cp:coreProperties>';
  const files=[{name:"[Content_Types].xml",data:types},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
    {name:"word/_rels/document.xml.rels",data:rels},{name:"word/document.xml",data:documentXml},{name:"word/styles.xml",data:styles},{name:"word/settings.xml",data:settings},
    {name:"word/header1.xml",data:header},{name:"word/footer1.xml",data:footer},{name:"docProps/core.xml",data:core},
    ...media.map(m=>({name:"word/media/"+m.name,data:m.bytes}))];
  return new Blob([zipFiles(files)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
async function v12ExportDoc(format) {
  try{closeExportMenus();}catch{}
  const doc=document.querySelector("#content .wdDoc");
  if(!doc){showToast("当前页面没有报告");return;}
  const name=safeName((doc.dataset.title||"报告")+"-"+v12Today());
  if(format==="docx"){showToast("正在生成 Word…");const blob=await v12Docx(doc,name);saveBlob(blob,name+".docx");showToast("已导出 Word（打开后目录可按 F9 更新页码）");return;}
  if(format==="pdf"){doc.classList.add("wdPrinting");try{await exportPdf(doc,name);}finally{doc.classList.remove("wdPrinting");}return;}
  if(format==="xlsx"){
    const sheets=[...doc.querySelectorAll(".wdSec")].map(sec=>{
      const rows=[[cellText(sec.querySelector("h2"))]],headers=[],titles=[0];
      sec.querySelectorAll("table").forEach(t=>{const cap=t.querySelector("caption");rows.push([]);if(cap){titles.push(rows.length);rows.push([cellText(cap)]);}headers.push(rows.length);rows.push(...[...t.querySelectorAll("tr")].map(tr=>[...tr.children].map(cellText)));});
      return {name:cellText(sec.querySelector("h2")).slice(0,28),rows,headers,titles};
    }).filter(s=>s.rows.length>1);
    saveBlob(xlsxBlob(sheets),name+".xlsx");showToast("已导出 Excel 数据表");
  }
}
function v12DocMenu(){return exportMenu("v12ExportDoc",[["docx","Word"],["pdf","PDF"],["xlsx","Excel 数据表"]],"导出报告");}

// 页面数据：年度化
function v12Detail(year=reportYear){return detailForYear(year);}
function v12SumBy(rows,key){const m={};rows.forEach(r=>{const k=typeof key==="function"?key(r):r[key];m[k]=(m[k]||0)+r.emission_tco2e;});return m;}
function v12ScopeSum(rows){const t={"1":0,"2":0,"3":0};rows.forEach(r=>t[String(r.scope)]+=r.emission_tco2e);return t;}
const V12_S3_NAMES = {C01:"外购商品和服务",C02:"资本品",C03:"燃料和能源相关活动",C04:"上游运输和配送",C05:"运营中产生的废弃物",C06:"商务旅行",C07:"员工通勤",C08:"上游租赁资产",
  C09:"下游运输和配送",C10:"售出产品加工",C11:"售出产品使用",C12:"售出产品报废处理",C13:"下游租赁资产",C14:"特许经营",C15:"投资"};
function v12CatLabel(code){const n=Number(String(code).replace("C",""));return "类别"+n+" "+(V12_S3_NAMES[code]||"");}
function v12SrcOf(row) {
  return PETRO_SOURCES.find(s=>s.org===row.org&&s.name===row.source_name)||PETRO_SOURCES.find(s=>s.name===row.source_name);
}
function v12Kind(row) {
  if(String(row.scope)==="3")return v12CatLabel(row.category_code);
  const src=v12SrcOf(row);
  if(!src)return String(row.scope)==="2"?"外购电力":"固定燃烧";
  if(src.method==="elec")return "外购电力";
  if(src.method==="heat")return "外购热力";
  if(["vent"].includes(src.method))return "工艺放空";
  if(["fug","gwp"].includes(src.method))return "逸散排放";
  if(["rec","recCH4"].includes(src.method))return "回收利用（扣减）";
  return src.kind==="购入电力"?"外购电力":src.kind;
}
function v12OrgOf(row){return row.org==="德勤中国 / ESG管理部"?"集团总部（价值链）":row.org;}
