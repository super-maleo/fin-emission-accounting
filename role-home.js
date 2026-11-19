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

// ---------- 首页：轮播 + 一个紧凑的任务窗口 + 碳市场动态 ----------
let homeTaskTab = "todo";
let carouselIndex = 0;
let carouselTimer = null;
const MARKET_NEWS = [
  {tag:"行情",title:"全国碳市场 CEA 本周震荡上行，成交活跃度回升",text:"挂牌协议成交价在 90 元/吨附近波动，大宗协议成交占比提升。（演示资讯，不代表实时行情）"},
  {tag:"政策",title:"钢铁、水泥、铝冶炼行业纳入全国碳市场配额管理",text:"扩围行业企业需完成年度排放核算、核查与配额清缴，数据质量要求同步提高。（演示资讯）"},
  {tag:"出口",title:"欧盟 CBAM 进入正式实施阶段，出口企业需准备产品隐含排放",text:"申报需按产品提供直接与间接排放数据，供应链一手数据的重要性上升。（演示资讯）"},
  {tag:"CCER",title:"温室气体自愿减排交易市场新增方法学征求意见",text:"新方法学覆盖更多减排场景，项目开发需关注额外性与监测要求。（演示资讯）"},
  {tag:"产品",title:"产品碳足迹标识认证试点范围扩大",text:"试点产品需依据 ISO 14067 或相应 PCR 核算，并保留可追溯的清单数据。（演示资讯）"},
  {tag:"供应链",title:"头部整机企业要求一级供应商按季度提交 PCF 数据",text:"采购合同中开始约定碳数据提交频次、口径和凭证要求。（演示资讯）"}
];
function marketSeries() {
  const values=[];let value=86.4;
  for(let day=0;day<30;day++){value+=Math.sin(day*.9)*1.1+Math.cos(day*.37)*.7+.18;values.push(+value.toFixed(2));}
  return values;
}
function sparkline(values,width=300,height=86) {
  const min=Math.min(...values)-1,max=Math.max(...values)+1;
  const points=values.map((value,index)=>[index/(values.length-1)*width,height-(value-min)/(max-min)*height]);
  const line=points.map(([x,y],index)=>(index?"L":"M")+x.toFixed(1)+" "+y.toFixed(1)).join(" ");
  return '<svg class="spark" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" role="img" aria-label="CEA 近 30 个交易日价格走势（演示）">'+
    '<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86BC25" stop-opacity=".35"/><stop offset="1" stop-color="#86BC25" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="'+line+' L'+width+' '+height+' L0 '+height+' Z" fill="url(#sparkFill)"/><path d="'+line+'" fill="none" stroke="#4D7F17" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
    '<circle cx="'+points.at(-1)[0]+'" cy="'+points.at(-1)[1]+'" r="3.5" fill="#4D7F17"/></svg>';
}
function marketPanel() {
  const values=marketSeries();
  const last=values.at(-1),prev=values.at(-6);
  const change=(last-prev)/prev*100;
  return '<section class="panel marketPanel"><div class="panelHead"><h3>碳市场动态</h3><span class="demoBadge">演示数据 · 非实时</span></div>'+
    '<div class="marketGrid"><div class="marketQuote"><div class="quoteRow"><div><small>全国碳市场 CEA 收盘价</small><b>'+last.toFixed(2)+'</b><span>元/吨</span></div>'+
      '<em class="'+(change>=0?'up':'down')+'">'+(change>=0?'▲ ':'▼ ')+Math.abs(change).toFixed(2)+'% 周</em></div>'+sparkline(values)+
      '<dl class="quoteFacts"><div><dt>30 日最高</dt><dd>'+Math.max(...values).toFixed(2)+'</dd></div><div><dt>30 日最低</dt><dd>'+Math.min(...values).toFixed(2)+'</dd></div>'+
      '<div><dt>CCER 参考价</dt><dd>78.60</dd></div><div><dt>欧盟 EUA</dt><dd>€71.35</dd></div></dl></div>'+
    '<div class="newsWindow" aria-label="碳市场资讯"><ul class="newsScroll">'+[...MARKET_NEWS,...MARKET_NEWS].map((item,index)=>
      '<li'+(index>=MARKET_NEWS.length?' aria-hidden="true"':'')+'><button onclick="openInfoModal(\''+textHtml(item.title)+'\',\''+textHtml(item.text)+'\')"><span class="newsTag">'+item.tag+'</span>'+textHtml(item.title)+'</button></li>').join("")+
    '</ul></div></div></section>';
}
function slideArt(kind) {
  const common='<svg viewBox="0 0 480 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
  if(kind==="wind")return common+'<defs><linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8F4D6"/><stop offset="1" stop-color="#F8FCF3"/></linearGradient></defs>'+
    '<rect width="480" height="260" fill="url(#skyA)"/><circle cx="390" cy="62" r="30" fill="#FFF3C4"/>'+
    '<path d="M0 210 Q120 160 240 200 T480 185 V260 H0Z" fill="#B9DB86"/><path d="M0 232 Q140 196 280 228 T480 220 V260 H0Z" fill="#86BC25"/>'+
    [[150,120],[255,95],[350,130]].map(([x,y],i)=>'<line x1="'+x+'" y1="'+y+'" x2="'+x+'" y2="'+(y+100)+'" stroke="#fff" stroke-width="5"/><g class="blade" style="transform-origin:'+x+'px '+y+'px;animation-duration:'+(5+i)+'s"><path d="M'+x+' '+y+' l-4 -46 8 0Z M'+x+' '+y+' l42 20 -4 7Z M'+x+' '+y+' l-38 26 -4 -7Z" fill="#fff"/></g><circle cx="'+x+'" cy="'+y+'" r="5" fill="#4D7F17"/>').join("")+'</svg>';
  if(kind==="chain")return common+'<rect width="480" height="260" fill="#EEF7F5"/>'+
    '<g stroke="#9ED3C9" stroke-width="2" fill="none"><path d="M90 70 L230 130 L380 60 M90 190 L230 130 L380 200 M230 130 L380 130"/></g>'+
    [[90,70,"#008A7A"],[90,190,"#008A7A"],[230,130,"#86BC25"],[380,60,"#2C6AA0"],[380,130,"#2C6AA0"],[380,200,"#2C6AA0"]].map(([x,y,c])=>'<circle class="pulse" cx="'+x+'" cy="'+y+'" r="18" fill="'+c+'" fill-opacity=".15"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="'+c+'"/>').join("")+
    '<circle class="dash" cx="0" cy="0" r="4" fill="#86BC25"><animateMotion dur="4s" repeatCount="indefinite" path="M90 70 L230 130 L380 130"/></circle></svg>';
  if(kind==="product")return common+'<rect width="480" height="260" fill="#F3F8EA"/>'+
    '<circle cx="240" cy="130" r="92" fill="none" stroke="#C7E39C" stroke-width="14" stroke-dasharray="110 34"/>'+
    '<g transform="translate(200 98)"><rect x="0" y="18" width="62" height="44" rx="10" fill="#4D7F17"/><circle cx="76" cy="40" r="22" fill="#86BC25"/><rect x="18" y="0" width="14" height="22" fill="#4D7F17"/><rect x="-14" y="62" width="104" height="8" rx="4" fill="#6EA51E"/></g>'+
    ['原料','制造','运输','使用','回收'].map((text,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return '<g><circle cx="'+(240+118*Math.cos(a))+'" cy="'+(130+104*Math.sin(a))+'" r="21" fill="#fff" stroke="#86BC25"/><text x="'+(240+118*Math.cos(a))+'" y="'+(134+104*Math.sin(a))+'" text-anchor="middle" font-size="11" fill="#405124">'+text+'</text></g>';}).join("")+'</svg>';
  return common+'<rect width="480" height="260" fill="#F4F7FB"/>'+
    [[60,150],[120,120],[180,135],[240,95],[300,105],[360,70],[420,58]].map(([x,y],i,a)=>'<rect x="'+(x-16)+'" y="'+y+'" width="32" height="'+(230-y)+'" rx="4" fill="'+(i===a.length-1?'#86BC25':'#C9DDF0')+'"/>').join("")+
    '<path d="M60 140 L120 112 L180 124 L240 86 L300 94 L360 60 L420 46" fill="none" stroke="#2C6AA0" stroke-width="3"/><rect x="0" y="230" width="480" height="30" fill="#E3EAF2"/></svg>';
}
function carousel(slides) {
  return '<section class="carousel" onmouseenter="pauseCarousel(true)" onmouseleave="pauseCarousel(false)" aria-roledescription="carousel">'+
    '<div class="slides" style="transform:translateX(-'+(carouselIndex%slides.length)*100+'%)">'+slides.map((slide,index)=>
      '<article class="slide" aria-label="'+(index+1)+' / '+slides.length+'"><div class="slideText"><span class="slideKicker">'+slide.kicker+'</span><h2>'+textHtml(slide.title)+'</h2><p>'+slide.text+'</p>'+
        (slide.button?'<button class="btn primary" onclick="'+slide.action+'">'+slide.button+'</button>':'')+'</div><div class="slideArt" style="background:'+({wind:"#F3F9EA",chain:"#EEF7F5",product:"#F3F8EA",chart:"#F4F7FB"}[slide.art])+'">'+slideArt(slide.art)+'</div></article>').join("")+
    '</div><div class="slideNav"><button aria-label="上一张" onclick="moveCarousel(-1)">‹</button>'+slides.map((slide,index)=>'<i class="'+(index===carouselIndex%slides.length?'on':'')+'" onclick="moveCarousel('+index+',true)"></i>').join("")+
    '<button aria-label="下一张" onclick="moveCarousel(1)">›</button></div></section>';
}
function moveCarousel(step,absolute=false) {
  const element=document.querySelector(".carousel");
  if(!element)return;
  const count=element.querySelectorAll(".slide").length;
  carouselIndex=absolute?step:(carouselIndex+step+count)%count;
  element.querySelector(".slides").style.transform="translateX(-"+carouselIndex*100+"%)";
  element.querySelectorAll(".slideNav i").forEach((dot,index)=>dot.classList.toggle("on",index===carouselIndex));
}
let carouselPaused=false;
function pauseCarousel(value){carouselPaused=value;}
function startCarousel() {
  clearInterval(carouselTimer);
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return;
  carouselTimer=setInterval(()=>{if(!carouselPaused&&document.querySelector(".carousel"))moveCarousel(1);},5000);
}
function setHomeTaskTab(tab){homeTaskTab=tab;render();}
function taskWidget(cfg) {
  const tab=cfg.tabs.find(item=>item.key===homeTaskTab)||cfg.tabs[0];
  return '<section class="panel taskWidget"><div class="panelHead"><h3>'+cfg.title+'</h3><button class="linkBtn" onclick="'+cfg.more.action+'">'+cfg.more.label+' ›</button></div>'+
    '<div class="taskCounts">'+cfg.counts.map(item=>'<button class="'+(item.tone||"")+'" onclick="'+item.action+'"><b>'+item.value+'</b><span>'+item.label+'</span></button>').join("")+'</div>'+
    '<div class="miniProgress"><span><i style="width:'+pct(cfg.progress.done,cfg.progress.total)+'%"></i></span><small>完成 '+cfg.progress.done+' / '+cfg.progress.total+' · '+pct(cfg.progress.done,cfg.progress.total)+'%</small></div>'+
    '<div class="miniTabs">'+cfg.tabs.map(item=>'<button class="'+(item===tab?'active':'')+'" onclick="setHomeTaskTab(\''+item.key+'\')">'+item.label+' <em>'+item.items.length+'</em></button>').join("")+'</div>'+
    (tab.items.length?'<ul class="miniList">'+tab.items.slice(0,4).map(item=>'<li><span class="todoTag '+(item.tone||"")+'">'+item.tag+'</span><div><b>'+textHtml(item.title)+'</b><small>'+(item.note?textHtml(item.note):item.meta)+'</small></div>'+
      '<button class="btn '+(item.primary===false?'':'primary')+'" onclick="'+item.action+'">'+item.button+'</button></li>').join("")+'</ul>'+
      (tab.items.length>4?'<button class="linkBtn moreLink" onclick="'+cfg.more.action+'">还有 '+(tab.items.length-4)+' 项</button>':''):
      '<div class="todoEmpty">'+tab.empty+'</div>')+'</section>';
}
function quickStrip(links) {
  return '<div class="quickStrip">'+links.map(link=>'<button onclick="'+link.action+'"><span>'+link.icon+'</span>'+link.label+'</button>').join("")+'</div>';
}
function homeLayout(greet,slides,widget,links) {
  setTimeout(startCarousel,0);
  return '<div class="welcome compact"><div><h1>'+greet.title+'</h1><p>'+greet.sub+'</p></div>'+greet.help+'</div>'+
    '<div class="homeTop">'+carousel(slides)+widget+'</div>'+quickStrip(links)+marketPanel();
}

home = function () {
  if(!backendState.ready)return needsBackend();
  if(currentRole==="填报人")return fillerHome();
  if(currentRole==="供应商")return supplierHome();
  return managerHome();
};

function managerHome() {
  const tasks=workflowTasks();
  const statusOf=task=>taskEntry(task).status;
  const pending=tasks.filter(task=>statusOf(task)==="待审核");
  const returned=tasks.filter(task=>statusOf(task)==="退回");
  const open=tasks.filter(task=>["待填报","草稿"].includes(statusOf(task)));
  const done=tasks.filter(task=>["通过","不适用"].includes(statusOf(task)));
  const totals=scopeTotals();
  const total=totals["1"]+totals["2"]+totals["3"];
  const model=demo.lcaModels[0];
  const supDone=supplyScope3Items.filter((row,index)=>supplierState(index)==="通过").length;
  const item=task=>{
    const status=statusOf(task);
    const entry=taskEntry(task);
    return {tag:task.locked&&status==="待审核"?"供应商":status,tone:{"待审核":"warn","退回":"bad","通过":"ok"}[status]||"",title:task.name+" · "+(task.locked?task.owner:task.org),
      meta:"范围"+task.scope+" · "+textHtml(task.owner)+(entry.activity!==""?" · "+fmt(entry.activity,2)+" "+textHtml(task.unit):""),
      note:status==="退回"?(task.locked?supplyScope3Items[task.supplierIndex].reviewNote:entry.reviewNote):"",
      button:status==="待审核"?"审核":status==="退回"||status==="待填报"||status==="草稿"?"跟进":"查看",primary:status==="待审核",
      action:"openUnifiedTask('"+task.id+"',"+(status==="待审核")+")"};
  };
  return homeLayout(
    {title:MANAGER_NAME+"，"+greeting(),sub:"江南流体装备 · 2026-07 组织盘查 · 数据截止 "+DEADLINE,
      help:helpButton("管理者工作台","首页只放需要你处理的事和关键动态。排放分析在组织碳看板，产品碳足迹在产品碳排放，供应商协同在供应链碳排放。")},
    [
      {kicker:"组织盘查",title:"已审核排放 "+fmt(total,1)+" tCO₂e",text:"范围一 "+fmt(totals["1"],1)+" · 范围二 "+fmt(totals["2"],1)+" · 范围三 "+fmt(totals["3"],1)+"<br>"+open.length+" 项待填报，"+pending.length+" 项等你审核",button:"查看组织碳看板",action:"go('组织碳排放','组织碳看板')",art:"chart"},
      {kicker:"供应链协同",title:supDone+" / "+supplyScope3Items.length+" 家供应商数据已计入范围三",text:"供应商在自己的工作台提交，审核通过后自动关联，组织端无需重复填报",button:"邀请或催办供应商",action:"go('供应链碳排放','供应商管理')",art:"chain"},
      {kicker:"产品碳足迹",title:model.name+" "+fmt(lcaTotal(model)/1000,2)+" tCO₂e / 台",text:"五阶段生命周期建模，桑基图追溯每项活动的贡献",button:"打开产品看板",action:"go('产品碳排放','产品碳足迹看板')",art:"product"},
      {kicker:"绿色能源",title:"绿电与能效是范围二最直接的减排抓手",text:"绿电采购凭证已纳入填报任务，审核后单独披露、不重复计排",button:"查看范围二任务",action:"openTaskList('2')",art:"wind"}
    ],
    taskWidget({title:"我的任务",more:{label:"全部任务",action:"openTaskList()"},
      counts:[{label:"待审核",value:pending.length,tone:"warn",action:"setHomeTaskTab('todo')"},{label:"已退回",value:returned.length,tone:"bad",action:"setHomeTaskTab('todo')"},
        {label:"待填报",value:open.length,action:"setHomeTaskTab('open')"},{label:"已完成",value:done.length,tone:"ok",action:"setHomeTaskTab('done')"}],
      progress:{done:done.length,total:tasks.length},
      tabs:[{key:"todo",label:"待处理",items:[...pending,...returned].map(item),empty:"没有待审核或退回的任务"},
        {key:"open",label:"未提交",items:open.map(item),empty:"所有任务均已提交"},
        {key:"done",label:"已完成",items:done.map(item),empty:"暂无已完成任务"}]}),
    [{icon:"▤",label:"审核队列",action:"go('组织碳排放','数据填报','审核队列')"},{icon:"☷",label:"供应商收集",action:"go('供应链碳排放','供应商协同任务')"},
      {icon:"◈",label:"LCA 模型库",action:"go('产品碳排放','LCA建模与核算','模型库')"},{icon:"▧",label:"组织报告",action:"go('组织碳排放','报告中心','组织排放报告')"},
      {icon:"⚙",label:"因子库",action:"go('基础配置','因子库管理','公共因子库')"}]);
}

function fillerHome() {
  const mine=myTasks();
  const statusOf=task=>taskEntry(task).status;
  const order={"退回":0,"草稿":1,"待填报":2};
  const todo=mine.filter(task=>order[statusOf(task)]!==undefined).sort((a,b)=>order[statusOf(a)]-order[statusOf(b)]);
  const submitted=mine.filter(task=>statusOf(task)==="待审核");
  const done=mine.filter(task=>["通过","不适用"].includes(statusOf(task)));
  const item=task=>{
    const status=statusOf(task);
    const entry=taskEntry(task);
    return {tag:status,tone:{"退回":"bad","草稿":"warn","待审核":"warn","通过":"ok"}[status]||"",title:task.name,
      meta:task.org+" · 范围"+task.scope+" · 截止 "+task.deadline,note:status==="退回"&&entry.reviewNote?"退回意见："+entry.reviewNote:"",
      button:status==="退回"?"修改":status==="草稿"?"继续":status==="待填报"?"填报":"查看",primary:order[status]!==undefined,action:"openUnifiedTask('"+task.id+"')"};
  };
  const returned=todo.filter(task=>statusOf(task)==="退回").length;
  return homeLayout(
    {title:fillerIdentity+"，"+greeting(),sub:"2026-07 数据填报 · 截止 "+DEADLINE+" · 你负责 "+mine.length+" 项任务",
      help:helpButton("如何填报","点击任务后填写活动量并上传凭证。保存草稿不会进入核算；提交后由管理者审核，退回的任务会显示退回意见，修改后重新提交即可。")},
    [
      {kicker:"本期填报",title:todo.length?"还有 "+todo.length+" 项任务待你处理":"本期任务都已提交",text:returned?returned+" 项被退回，请按退回意见修改后重新提交":"提交后由管理者审核，通过即计入核算",button:todo.length?"立即处理":"查看我的任务",action:todo.length?"openUnifiedTask('"+todo[0].id+"')":"openTaskList()",art:"chart"},
      {kicker:"填报小贴士",title:"凭证编号和附件一起提交，审核更快",text:"支持 PDF、图片、Excel，单个文件 3 MB 以内；录入活动量时会实时显示预计排放",art:"wind"},
      {kicker:"产品数据",title:"你也可以维护产品生命周期活动",text:"原材料、制造、运输、使用、回收五个阶段的活动数据，修改后核算结果即时更新",button:"进入 LCA 清单",action:"go('产品碳排放','LCA建模与核算','模型库')",art:"product"}
    ],
    taskWidget({title:"我的任务",more:{label:"全部任务",action:"openTaskList()"},
      counts:[{label:"待处理",value:todo.length,tone:"warn",action:"setHomeTaskTab('todo')"},{label:"已退回",value:returned,tone:"bad",action:"setHomeTaskTab('todo')"},
        {label:"审核中",value:submitted.length,action:"setHomeTaskTab('open')"},{label:"已完成",value:done.length,tone:"ok",action:"setHomeTaskTab('done')"}],
      progress:{done:done.length,total:mine.length},
      tabs:[{key:"todo",label:"待处理",items:todo.map(item),empty:"所有任务都已提交，辛苦了"},
        {key:"open",label:"审核中",items:submitted.map(item),empty:"没有审核中的任务"},
        {key:"done",label:"已完成",items:done.map(item),empty:"暂无已完成任务"}]}),
    [{icon:"▤",label:"我的全部任务",action:"openTaskList()"},{icon:"◈",label:"产品活动数据",action:"go('产品碳排放','LCA建模与核算','模型库')"},
      {icon:"?",label:"操作手册",action:"go('帮助中心')"}]);
}

function supplierHome() {
  const index=supplierIdentity;
  const row=supplyScope3Items[index];
  const profile=supplierProfile(row.supplier);
  const status=supplierState(index);
  const versions=demo.supplierVersionHistory[row.id]||[];
  const approved=demo.approvedSuppliers[row.id];
  const button=status==="待审核"?"查看提交":status==="通过"?"更新数据":status==="退回"?"按意见修改":"开始填报";
  const tone={"通过":"ok","待审核":"warn","退回":"bad"}[status]||"";
  const widget='<section class="panel taskWidget"><div class="panelHead"><h3>我的任务</h3><button class="linkBtn" onclick="go(\'供应链碳排放\',\'供应商协同任务\')">任务详情 ›</button></div>'+
    '<div class="supplierMini"><span class="todoTag '+tone+'">'+status+'</span><b>'+textHtml(row.part)+'</b><small>客户 江南流体装备 · '+demoPeriod+' · 截止 '+DEADLINE+'</small></div>'+
    flowSteps(status,true)+
    (status==="退回"&&row.reviewNote?'<p class="reviewNote small">退回意见 · '+textHtml(row.reviewNote)+'</p>':'')+
    '<dl class="miniFacts"><div><dt>申报排放</dt><dd>'+fmt(row.total,3)+' tCO₂e</dd></div><div><dt>客户已采用</dt><dd>'+(approved?fmt(approved.total,3)+' tCO₂e · V'+(versions.length||1):'—')+'</dd></div></dl>'+
    '<button class="btn primary wide" onclick="editDemoSupplier('+index+')">'+button+'</button></section>';
  return homeLayout(
    {title:textHtml(row.supplier),sub:"联系人 "+textHtml(profile.contact||"—")+" · 客户 江南流体装备 · 嘉兴装配工厂",
      help:helpButton("供应商填报说明","请按采购合同口径填写本期供货活动量和单位产品碳排放，注明因子来源并上传凭证。提交后由江南流体装备审核，审核通过的数据会进入客户的范围三核算；更新数据会形成新版本，旧版本仍保留。")},
    [
      {kicker:"本期任务",title:status==="通过"?"本期数据已被客户采用":status==="待审核"?"已提交，等待客户审核":"请提交 "+row.part+" 碳数据",text:"对应客户范围三「"+textHtml(categoryName(row.category))+"」· 截止 "+DEADLINE,button:button,action:"editDemoSupplier("+index+")",art:"chain"},
      {kicker:"数据质量",title:"提供一手数据，让你的产品更具竞争力",text:"优先使用工厂实测能耗或 EPD，比行业平均因子更能体现你的减排成果",art:"product"},
      {kicker:"出口合规",title:"CBAM 与产品碳足迹要求正在传导到供应链",text:"持续、可追溯的碳数据将成为进入头部客户供应体系的基础条件",art:"wind"}
    ],widget,
    [{icon:"▤",label:"我的填报任务",action:"go('供应链碳排放','供应商协同任务')"},{icon:"◈",label:"已批准数据",action:"go('供应链碳排放','供应链因子中心')"},
      {icon:"?",label:"填报说明",action:"go('帮助中心')"}]);
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

// 产品页头：统一面包屑与操作区
lcaHeading = function (title) {
  const crumb="产品碳排放 / "+state.group+(state.page&&state.page!==state.group?" / "+state.page:"");
  return pageHead(title,lcaSelect()+(currentRole==="管理者"?'<button class="btn" onclick="editLcaModel()">模型设置</button>'+
    '<button class="btn primary" onclick="editLcaModel(true)">新增 LCA 模型</button>':''),crumb);
};

// ---------- 基础配置：用户角色与组织权限展示真实的三角色模型 ----------
const ROLE_MATRIX = [
  {role:"管理者",members:[MANAGER_NAME],modules:"全部模块",actions:"审核与退回、催办、确认不适用、邀请供应商、生成报告、维护因子与 LCA 模型",scope:"全组织、全部供应商"},
  {role:"填报人",members:FILLERS,modules:"首页、组织填报、产品活动数据、帮助中心",actions:"填报、保存草稿、提交审核、按退回意见修改、录入 LCA 活动",scope:"本人负责的任务"},
  {role:"供应商",members:null,modules:"首页、我的填报任务、已批准数据、帮助中心",actions:"填报活动量与单位碳排、上传凭证、提交审核、查看已批准版本",scope:"本企业的数据对象"}
];
const renderBackendConfigBeforeRoles = renderBackendConfig;
renderBackendConfig = function () {
  const plainHead=()=>pageHead(state.page,'<button class="btn" onclick="exportFirstTable()">导出</button>',"基础配置 / 系统设置 / "+state.page);
  if(state.page==="用户角色") {
    return plainHead()+'<div class="taskTable tableWrap"><table><thead><tr><th>角色</th><th>成员</th><th>可见模块</th><th>可执行操作</th><th>数据范围</th><th>操作</th></tr></thead><tbody>'+
      ROLE_MATRIX.map(row=>'<tr><td><strong>'+row.role+'</strong></td><td>'+(row.members?row.members.length:supplyScope3Items.length)+' 人<small>'+
        textHtml((row.members||supplyScope3Items.map(item=>item.supplier)).join("、"))+'</small></td><td class="wrapCell">'+row.modules+'</td><td class="wrapCell">'+row.actions+'</td><td>'+row.scope+
        '</td><td><button class="btn" onclick="enterRole(\''+row.role+'\')">以此角色预览</button></td></tr>').join("")+'</tbody></table></div>'+
      '<p class="muted">当前原型通过右上角角色切换模拟权限；正式部署需接入统一登录与服务端权限校验。</p>';
  }
  if(state.page==="组织权限") {
    const tasks=workflowTasks();
    const users=[{name:MANAGER_NAME,role:"管理者",org:"江南流体装备 / 可持续发展部",count:tasks.filter(task=>taskEntry(task).status==="待审核").length,note:"项待审核"},
      ...FILLERS.map(name=>({name,role:"填报人",org:[...new Set(tasks.filter(task=>task.owner===name).map(task=>task.org))].join("、"),count:tasks.filter(task=>task.owner===name).length,note:"项任务"})),
      ...supplyScope3Items.map(row=>({name:supplierProfile(row.supplier).contact||row.supplier,role:"供应商",org:row.supplier,count:1,note:"项数据对象"}))];
    return plainHead()+'<div class="taskTable tableWrap"><table><thead><tr><th>用户</th><th>角色</th><th>所属组织 / 企业</th><th>负责事项</th><th>状态</th></tr></thead><tbody>'+
      users.map(user=>'<tr><td><strong>'+textHtml(user.name)+'</strong></td><td>'+user.role+'</td><td class="wrapCell">'+textHtml(user.org)+'</td><td>'+user.count+' '+user.note+'</td><td>'+entryStatus("通过").replace("通过","启用")+'</td></tr>').join("")+
      '</tbody></table></div>';
  }
  return renderBackendConfigBeforeRoles();
};

// ---------- 产品数据管理与分析：每个页面展示不同的数据 ----------
const PART_SUPPLIERS = [["铸铁","苏州恒铸精密铸造"],["电工钢","常州鑫叠电机材料"],["铜","无锡华导铜业"]];
function partSupplier(line) {
  const match=PART_SUPPLIERS.find(([key])=>line.name.includes(key));
  if(!match)return null;
  const row=supplyScope3Items.find(item=>item.supplier===match[1]);
  return row?{row,approved:demo.approvedSuppliers[row.id]}:null;
}
function lineTable(heads,rows) {
  return '<div class="taskTable tableWrap"><table><thead><tr>'+heads.map(head=>'<th>'+head+'</th>').join("")+'</tr></thead><tbody>'+
    (rows.length?rows.join(""):'<tr><td colspan="'+heads.length+'" class="emptyCell">暂无数据</td></tr>')+'</tbody></table></div>';
}
async function adoptSupplierFactor(index) {
  if(currentRole!=="管理者"){showToast("由管理者确认是否采用供应商数据");return;}
  const model=activeLca();
  const line=model.stages[0].lines[index];
  const link=partSupplier(line);
  if(!link?.approved)return;
  line.factor=link.approved.unitCarbon;
  line.source=link.row.supplier+" 已批准数据 V"+((demo.supplierVersionHistory[link.row.id]||[]).length||1);
  line.evidence=link.approved.evidence;
  line.quality="供应商数据";
  persistDemo();render();
  showToast("已采用供应商数据，产品碳足迹已重新计算");
}
const productDataBeforeRoles = productData;
productData = function () {
  const model=activeLca();
  const materials=model.stages[0].lines;
  if(state.page==="BOM/物料清单") {
    return lcaHeading("BOM/物料清单")+'<div class="taskContext"><span>'+textHtml(model.name)+'</span><span>'+textHtml(model.code)+'</span><span>批次产量 '+model.batchOutput+' '+textHtml(model.flowUnit)+'</span></div>'+
      lineTable(["层级","物料","单台用量","批次用量","来源","凭证","操作"],materials.map((line,index)=>'<tr><td>1.'+(index+1)+'</td><td><strong>'+textHtml(line.name)+'</strong></td><td>'+
        fmt(line.quantity/model.batchOutput,3)+' '+textHtml(line.unit)+'</td><td>'+fmt(line.quantity,2)+' '+textHtml(line.unit)+'</td><td>'+textHtml(line.source)+'</td><td>'+textHtml(line.evidence)+
        '</td><td><button class="btn" onclick="activeLcaStage=0;editLcaLine('+index+')">编辑用量</button></td></tr>'));
  }
  if(state.page==="零部件碳排数据") {
    return lcaHeading("零部件碳排数据")+'<div class="taskContext"><span>关键物料的单位碳排可直接采用供应商已批准数据，替代行业估算值</span></div>'+
      lineTable(["物料","模型采用因子(kgCO₂e)","数据类型","对应供应商","供应商已批准因子","差异","操作"],materials.map((line,index)=>{
        const link=partSupplier(line);
        const approved=link?.approved;
        const diff=approved?(approved.unitCarbon-line.factor)/line.factor*100:null;
        const same=approved&&Number(approved.unitCarbon)===Number(line.factor);
        return '<tr><td><strong>'+textHtml(line.name)+'</strong><small>'+textHtml(line.source)+'</small></td><td>'+line.factor+' / '+textHtml(line.unit)+'</td><td>'+textHtml(line.quality||"—")+
          '</td><td>'+(link?textHtml(link.row.supplier)+'<small>'+entryStatus(supplierState(supplyScope3Items.indexOf(link.row)))+'</small>':'—')+'</td><td>'+(approved?approved.unitCarbon:'—')+
          '</td><td>'+(diff===null?'—':(diff>0?'+':'')+diff.toFixed(1)+'%')+'</td><td>'+(approved&&!same?'<button class="btn primary" onclick="adoptSupplierFactor('+index+')">采用供应商数据</button>':
          same?'<span class="status ok">已采用</span>':'<button class="btn" onclick="activeLcaStage=0;editLcaLine('+index+')">维护因子</button>')+'</td></tr>';
      }));
  }
  if(state.page==="额外活动因子库") {
    const rows=model.stages.slice(1).flatMap((stage,offset)=>stage.lines.map((line,index)=>({stage,stageIndex:offset+1,line,index})));
    return lcaHeading("额外活动因子库")+'<div class="taskContext"><span>制造、运输、使用和回收阶段的能源与活动因子</span></div>'+
      lineTable(["阶段","活动","活动单位","因子(kgCO₂e/单位)","来源","代表年份","地域","操作"],rows.map(({stage,stageIndex,line,index})=>'<tr><td>'+stage.name+'</td><td><strong>'+textHtml(line.name)+
        '</strong></td><td>'+textHtml(line.unit)+'</td><td>'+line.factor+'</td><td>'+textHtml(line.source)+'</td><td>'+line.year+'</td><td>'+textHtml(line.region)+
        '</td><td><button class="btn" onclick="activeLcaStage='+stageIndex+';editLcaLine('+index+')">维护</button></td></tr>'));
  }
  return productDataBeforeRoles();
};
const productAnalysisBeforeRoles = productAnalysis;
productAnalysis = function () {
  if(state.page!=="分布概览")return productAnalysisBeforeRoles();
  const model=activeLca();
  const total=lcaTotal(model);
  let cumulative=0;
  const rows=model.stages.flatMap((stage,stageIndex)=>stage.enabled?stage.lines.map((line,index)=>({stage,stageIndex,line,index,value:lineEmission(model,line)})):[]).sort((a,b)=>b.value-a.value);
  return lcaHeading("分布概览")+'<div class="homeGrid even"><div>'+
    card("阶段占比",meterRows(lcaTotals(model).map((stage,index)=>({label:stage.name,value:stage.total,unit:"kgCO₂e",action:"showLcaStageDetail("+index+")"}))))+'</div><div>'+
    card("热点活动 Top 5",meterRows(rows.slice(0,5).map(row=>({label:row.line.name,sub:row.stage.name,value:row.value,unit:"kgCO₂e",color:"#008A7A",
      action:"activeLcaStage="+row.stageIndex+";editLcaLine("+row.index+")"}))))+'</div></div>'+
    lineTable(["排名","活动","阶段","kgCO₂e / "+textHtml(model.flowUnit),"占比","累计占比","数据类型"],rows.map((row,rank)=>{
      cumulative+=row.value;
      return '<tr><td>'+(rank+1)+'</td><td><strong>'+textHtml(row.line.name)+'</strong></td><td>'+row.stage.name+'</td><td>'+fmt(row.value,4)+'</td><td>'+(total?(row.value/total*100).toFixed(2):0)+
        '%</td><td>'+(total?(cumulative/total*100).toFixed(1):0)+'%</td><td>'+textHtml(row.line.quality||"—")+'</td></tr>';
    }));
};

// ---------- 基础配置：每个页面职责单一，新增通过弹窗 ----------
let configSearch = "";
function setConfigSearch(value){configSearch=value.trim();render();}
function configToolbar(placeholder,extra="") {
  return '<div class="taskToolbar"><label class="taskSearch">查找<input id="configSearch" placeholder="'+placeholder+'" value="'+textHtml(configSearch)+'" onkeydown="if(event.key===\'Enter\')setConfigSearch(this.value)"></label>'+
    '<button class="btn" onclick="setConfigSearch(document.getElementById(\'configSearch\').value)">查询</button>'+extra+'</div>';
}
function matches(values){return !configSearch||values.join(" ").includes(configSearch);}
function openFactorModal(sourceType) {
  openModal('<h2>新增排放因子</h2><div class="modalForm">'+
    '<label>范围三类别<select id="factorCategory">'+optionList(backendState.data.categories,"code","name","C01")+'</select></label>'+
    '<label>因子名称<input id="factorName" placeholder="如：铝锭采购"></label><label>单位<input id="factorUnit" value="t"></label>'+
    '<label>气体<select id="factorGas">'+substanceOptions("CO2")+'</select></label><label>因子值（tCO₂e / 单位）<input id="factorValue" type="number" step="any"></label>'+
    '<label>来源<input id="factorSourceType" value="'+textHtml(sourceType)+'"></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="saveFactorFromModal()">保存因子</button></div>');
}
async function saveFactorFromModal() {
  if(!document.getElementById("factorName").value.trim()||document.getElementById("factorValue").value===""){showToast("请填写因子名称和因子值");return;}
  await saveFactor();closeModal();
}
async function importSupplierFactor(id) {
  const row=demo.approvedSuppliers[id];
  if(!row)return;
  await api("/api/factors",{method:"POST",body:JSON.stringify({category_code:row.category,name:row.supplier+" "+row.part,unit:row.unit,gas:"CO2",
    factor_value:row.unitCarbon/1000,source_type:"企业私域因子库"})});
  demo.importedSupplierFactors ||= {};
  demo.importedSupplierFactors[id]=new Date().toLocaleString("zh-CN",{hour12:false});
  persistDemo();await loadBackendData();render();showToast("已导入企业私域因子库");
}
function factorRows(list) {
  return lineTable(["ID","类别","因子名称","因子值","单位","气体","来源","地区 / 年份"],list.map(f=>'<tr><td>'+f.id+'</td><td>'+textHtml(categoryName(f.category_code))+'</td><td><strong>'+textHtml(f.name)+
    '</strong></td><td>'+f.factor_value+'</td><td>'+textHtml(f.unit)+'</td><td>'+textHtml(f.gas)+'</td><td>'+textHtml(f.source_type)+'</td><td>'+textHtml(f.region||"中国")+' / '+(f.year||2026)+'</td></tr>'));
}
const renderBackendConfigBeforePages = renderBackendConfig;
renderBackendConfig = function () {
  if(!backendState.ready)return needsBackend();
  const data=backendState.data;
  const crumb="基础配置 / "+state.group+" / "+state.page;
  const exportBtn='<button class="btn" onclick="exportFirstTable()">导出</button>';
  if(state.page==="公共因子库"||state.page==="企业私域因子库") {
    const own=state.page==="企业私域因子库";
    const list=data.factors.filter(f=>(own?f.source_type==="企业私域因子库":f.source_type!=="企业私域因子库")&&matches([f.name,categoryName(f.category_code),f.source_type]));
    return pageHead(state.page,exportBtn+'<button class="btn primary" onclick="openFactorModal(\''+(own?"企业私域因子库":"公共因子库")+'\')">新增因子</button>',crumb)+
      configToolbar("因子名称、类别或来源",'<span>'+list.length+' 个因子</span>')+
      (own&&!list.length&&!configSearch?'<div class="emptyState">还没有企业私域因子。可新增，或从「供应链因子导入」把已批准的供应商数据导入。</div>':factorRows(list));
  }
  if(state.page==="供应链因子导入") {
    const rows=Object.values(demo.approvedSuppliers);
    return pageHead(state.page,helpButton("导入说明","把审核通过的供应商单位碳排导入企业私域因子库后，组织和产品核算可以直接选用。")+exportBtn,crumb)+
      lineTable(["供应商 / 数据对象","单位碳排(kgCO₂e)","折算因子(tCO₂e)","单位","范围三类别","来源","状态","操作"],rows.map(row=>{
        const imported=demo.importedSupplierFactors?.[row.id];
        return '<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(row.part)+'</small></td><td>'+row.unitCarbon+'</td><td>'+(row.unitCarbon/1000)+'</td><td>'+textHtml(row.unit)+'</td><td>'+
          textHtml(categoryName(row.category))+'</td><td>'+textHtml(row.factorSource||"供应商材料清单估算")+'</td><td>'+(imported?'<span class="status ok">已导入</span><small>'+imported+'</small>':'<span class="status gray">未导入</span>')+
          '</td><td>'+(imported?'<button class="btn" onclick="go(\'基础配置\',\'因子库管理\',\'企业私域因子库\')">查看</button>':'<button class="btn primary" onclick="importSupplierFactor(\''+row.id+'\')">导入</button>')+'</td></tr>';
      }));
  }
  if(state.page==="填报因子") {
    const list=data.sources.filter(s=>matches([s.name,categoryName(s.category_code)]));
    return pageHead("填报因子",exportBtn,crumb)+configToolbar("排放源或类别",'<span>'+list.length+' 个排放源</span>')+
      lineTable(["排放源","范围三类别","活动单位","默认因子","因子值","状态"],list.map(s=>{
        const factor=data.factors.find(f=>f.id===s.default_factor_id);
        return '<tr><td><strong>'+textHtml(s.name)+'</strong></td><td>'+textHtml(categoryName(s.category_code))+'</td><td>'+textHtml(s.activity_unit)+'</td><td>'+textHtml(factor?.name||"待匹配")+'</td><td>'+(factor?factor.factor_value+' tCO₂e / '+textHtml(factor.unit):'—')+'</td><td>'+(s.enabled?'<span class="status ok">启用</span>':'<span class="status gray">停用</span>')+'</td></tr>';
      }));
  }
  if(state.page==="填报指标") {
    const tasks=workflowTasks().filter(task=>!task.locked&&matches([task.name,task.org,task.unit]));
    return pageHead("填报指标",exportBtn,crumb)+configToolbar("指标、组织或单位",'<span>'+tasks.length+' 项指标</span>')+
      lineTable(["指标","范围","类别","填报单位","核算因子","适用组织","频次","负责人"],tasks.map(task=>'<tr><td><strong>'+textHtml(task.name)+'</strong><small>'+task.id+'</small></td><td>范围'+task.scope+'</td><td>'+
        textHtml(task.scope==="3"?categoryName(task.category):task.scope==="1"?"直接排放":"外购能源")+'</td><td>'+textHtml(task.unit)+'</td><td>'+textHtml(task.factorLabel)+'</td><td>'+textHtml(task.org)+'</td><td>月度</td><td>'+textHtml(task.owner)+'</td></tr>'));
  }
  if(state.page==="填报模板") {
    const tasks=workflowTasks().filter(task=>!task.locked);
    const orgs=[...new Set(tasks.map(task=>task.org))];
    return pageHead("填报模板",exportBtn,crumb)+
      lineTable(["模板","适用组织","包含指标","频次","截止规则","负责人","状态"],orgs.map(org=>{
        const list=tasks.filter(task=>task.org===org);
        return '<tr><td><strong>'+textHtml(org)+' 月度碳数据模板</strong></td><td>'+textHtml(org)+'</td><td class="wrapCell">'+list.map(task=>textHtml(task.name)).join("、")+'</td><td>月度</td><td>次月 10 日</td><td>'+
          textHtml([...new Set(list.map(task=>task.owner))].join("、"))+'</td><td><span class="status ok">启用</span></td></tr>';
      }).concat(['<tr><td><strong>供应商碳数据收集模板</strong></td><td>'+supplyScope3Items.length+' 家供应商</td><td class="wrapCell">活动量、单位碳排、因子来源、凭证</td><td>按采购周期</td><td>次月 10 日</td><td>'+MANAGER_NAME+'</td><td><span class="status ok">启用</span></td></tr>']));
  }
  if(state.page==="碳排放公式") {
    const formulas=data.formulas.filter(f=>f.standard_code===backendState.standard);
    const gwp=data.gwp.filter(g=>g.standard_code===backendState.standard);
    return pageHead("碳排放公式",exportBtn,crumb)+
      '<div class="lcaMeta"><label>核算口径 <select onchange="changeStandard(this.value)">'+optionList(data.standards,"code","name",backendState.standard)+'</select></label><span>'+formulas.length+' 条公式 · '+gwp.length+' 个 GWP 值</span></div>'+
      '<div>'+card("核算公式",lineTable(["类别","表达式","说明"],formulas.map(f=>'<tr><td>'+textHtml(categoryName(f.category_code))+'</td><td><code>'+textHtml(f.expression)+'</code></td><td class="wrapCell">'+textHtml(f.description)+'</td></tr>')))+
      card("GWP 值",lineTable(["气体","时间尺度","GWP"],gwp.map(g=>'<tr><td>'+textHtml(g.gas)+'</td><td>'+g.horizon+' 年</td><td>'+g.value+'</td></tr>')))+'</div>';
  }
  return renderBackendConfigBeforePages();
};
const renderBackendConfigBeforeSystem = renderBackendConfig;
renderBackendConfig = function () {
  if(!backendState.ready)return needsBackend();
  const crumb="基础配置 / "+state.group+" / "+state.page;
  if(state.page==="审批流程") {
    const flows=[
      {name:"企业数据填报",steps:["填报人填报","提交审核","管理者审核","计入组织核算"],rule:"退回需填写原因；通过后锁定编辑",count:workflowTasks().filter(task=>!task.locked).length+" 项任务"},
      {name:"供应商数据收集",steps:["供应商填报","提交审核","管理者审核","自动关联范围三"],rule:"新版本批准前保留已批准值，历史版本可追溯",count:supplyScope3Items.length+" 家供应商"},
      {name:"任务不适用确认",steps:["管理者判断","填写依据","留痕"],rule:"仅管理者可操作，依据写入操作记录",count:"按需"},
      {name:"报告发布",steps:["预览报告","生成快照","下载 / 提交"],rule:"有未完成任务时快照标记为草稿",count:demo.reports.length+" 份快照"}
    ];
    return pageHead("审批流程",'<button class="btn" onclick="exportFirstTable()">导出</button>',crumb)+
      lineTable(["流程","节点","规则","覆盖范围","状态"],flows.map(flow=>'<tr><td><strong>'+flow.name+'</strong></td><td class="wrapCell">'+flow.steps.join(" → ")+'</td><td class="wrapCell">'+flow.rule+'</td><td>'+flow.count+'</td><td><span class="status ok">启用</span></td></tr>'));
  }
  if(state.page==="字典单位") {
    const units={};
    workflowTasks().forEach(task=>{(units[task.unit] ||= new Set()).add(task.name);});
    backendState.data.factors.forEach(f=>{(units[f.unit] ||= new Set()).add(f.name);});
    return pageHead("字典单位",'<button class="btn" onclick="exportFirstTable()">导出</button>',crumb)+
      lineTable(["单位","引用次数","引用示例"],Object.entries(units).sort((a,b)=>b[1].size-a[1].size).map(([unit,set])=>'<tr><td><strong>'+textHtml(unit)+'</strong></td><td>'+set.size+'</td><td class="wrapCell">'+textHtml([...set].slice(0,4).join("、"))+'</td></tr>'));
  }
  return renderBackendConfigBeforeSystem();
};
