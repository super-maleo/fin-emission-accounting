// 碳履约：2019 年起全部履约周期、分机组监测与配额、完整账户流水与委托记录、筛选。
ETS_YEARS.unshift(2019,2020,2021,2022);
Object.assign(ETS_PROFILE,{
  2019:{coal:102400,elec:3480,supply:201200,heat:318600,be:0.9790,bh:0.1260},
  2020:{coal:96800,elec:3420,supply:190500,heat:301900,be:0.9790,bh:0.1260},
  2021:{coal:103100,elec:3390,supply:203400,heat:335800,be:0.8218,bh:0.1111},
  2022:{coal:100500,elec:3370,supply:198800,heat:332900,be:0.8177,bh:0.1105}
});
const ETS_UNITS = [
  {id:"1",name:"1 号机组",spec:"25 MW 抽凝式汽轮发电机组 · 130 t/h 循环流化床锅炉",commissioned:"2009-06"},
  {id:"2",name:"2 号机组",spec:"25 MW 背压式汽轮发电机组 · 130 t/h 循环流化床锅炉",commissioned:"2011-11"}
];
const ETS_DEADLINE = {2019:"2021-12-31",2020:"2021-12-31",2021:"2023-12-31",2022:"2023-12-31"};
function unitShare(unit,year,month,kind) {
  const base=kind==="heat"?0.41:0.545;
  const s1=base+0.025*Math.sin(month*0.9+year*0.7)+(kind==="heat"?0.01*Math.cos(month):0);
  return unit==="1"?s1:1-s1;
}
function scaleMonths(months,year,unit) {
  return months.map(row=>{const s=unitShare(unit,year,row.month,"power"),h=unitShare(unit,year,row.month,"heat");
    const c=s*0.6+h*0.4;
    return {...row,coal:Math.round(row.coal*c),supply:Math.round(row.supply*s),heat:Math.round(row.heat*h),elec:+(row.elec*s).toFixed(1)};});
}

const etsBuildBeforeScale = etsBuild;
etsBuild = function () {
  const data={v:3,monthly:{},cycles:{},ledger:[],orders:[],ccer:[],log:[],seq:0};
  ETS_YEARS.forEach(year=>data.monthly[year]=etsMonthsBuild(year));
  const add=(date,type,vintage,qty,ref,year)=>data.ledger.push({id:"",date,type,vintage,qty,ref,year});
  const vintageBalance=vintage=>data.ledger.filter(row=>row.vintage===vintage).reduce((sum,row)=>sum+row.qty,0);
  const balance=year=>data.ledger.filter(row=>row.vintage<=year).reduce((sum,row)=>sum+row.qty,0);
  let orderSeq=0;
  const order=(date,time,side,product,vintage,qty,price,year,extra={})=>{
    const id="WT"+date.replace(/-/g,"")+String(++orderSeq).padStart(4,"0");
    const status=extra.status||"已成交";
    data.orders.push({id,at:date+" "+time,side,product,vintage,qty,price,filledPrice:extra.filledPrice??price,status,filledAt:status==="已成交"?date:"",channel:extra.channel||"挂牌协议",year,
      counterparty:extra.counterparty||(product==="CEA"?"上海环境能源交易所":"北京绿色交易所"),project:extra.project,note:extra.note});
    if(status==="已成交"&&product==="CEA")add(date,side,vintage,side==="买入"?qty:-qty,id,year);
    return id;
  };
  const surrender=(year,qty,date,ref)=>{
    let left=qty;
    [...new Set(data.ledger.map(row=>row.vintage))].sort().forEach(vintage=>{
      if(vintage>year||left<=0)return;
      const take=Math.min(vintageBalance(vintage),left);
      if(take>0){add(date,"清缴注销",vintage,-take,ref,year);left-=take;}
    });
  };
  const tranche=(total,parts)=>{const out=[];let left=total;parts.forEach((p,i)=>{const q=i===parts.length-1?left:Math.round(total*p/100/100)*100;out.push(q);left-=q;});return out;};
  const history=[
    {year:2019,report:["2020-03-30","2020-06-18","HC-2020-ZJ-0127"],pre:["2021-01-29"],final:["2021-07-16","2021-07-28"],trade:{side:"卖出",dates:["2021-08-11","2021-09-23","2021-11-17","2021-12-08"],prices:[46.8,43.1,44.6,51.2],channel:["挂牌协议","大宗协议","大宗协议","挂牌协议"]},
      ccer:[{id:"CCER-2021-0168",project:"内蒙古乌兰察布察右中旗风电场项目",type:"存量 CCER · 并网风力发电",vintage:2015,qty:4200,acquiredAt:"2021-10-26",price:28.5}],surrender:"2021-12-20",cert:"QJ-2019-330400-0187"},
    {year:2020,report:["2021-03-29","2021-06-25","HC-2021-ZJ-0163"],pre:["2021-01-29"],final:["2021-07-16","2021-07-28"],trade:{side:"卖出",dates:["2021-10-14","2021-11-30","2021-12-15"],prices:[42.9,45.7,53.6],channel:["大宗协议","大宗协议","挂牌协议"]},
      ccer:[{id:"CCER-2021-0203",project:"云南大理洱源光伏电站项目",type:"存量 CCER · 并网光伏发电",vintage:2016,qty:3100,acquiredAt:"2021-11-09",price:31.2},{id:"CCER-2021-0219",project:"湖北恩施清江水电站项目",type:"存量 CCER · 水力发电",vintage:2014,qty:1600,acquiredAt:"2021-11-22",price:26.8}],surrender:"2021-12-24",cert:"QJ-2020-330400-0187"},
    {year:2021,report:["2022-03-30","2022-08-19","HC-2022-ZJ-0291"],pre:["2023-01-31"],final:["2023-09-15","2023-09-28"],trade:{side:"买入",dates:["2023-10-19","2023-11-08","2023-11-27"],prices:[78.6,72.4,70.1],channel:["挂牌协议","大宗协议","挂牌协议"]},
      ccer:[{id:"CCER-2023-0544",project:"江西赣州农村户用沼气项目",type:"存量 CCER · 户用沼气",vintage:2015,qty:3800,acquiredAt:"2023-10-30",price:58.0}],surrender:"2023-12-14",cert:"QJ-2021-330400-0187"},
    {year:2022,report:["2023-03-29","2023-08-25","HC-2023-ZJ-0318"],pre:["2023-01-31"],final:["2023-09-15","2023-09-28"],trade:{side:"买入",dates:["2023-11-14","2023-12-05"],prices:[71.3,69.8],channel:["大宗协议","挂牌协议"]},
      ccer:[{id:"CCER-2023-0587",project:"浙江丽水缙云抽水蓄能配套光伏项目",type:"存量 CCER · 并网光伏发电",vintage:2017,qty:2600,acquiredAt:"2023-11-21",price:61.5}],surrender:"2023-12-19",cert:"QJ-2022-330400-0187"}
  ];
  history.forEach(h=>{
    const year=h.year,months=data.monthly[year],verified=Math.round(etsSums(months).emission),alloc=etsAllocFormula(year,months),pre=Math.round(alloc.qty*0.7);
    data.cycles[year]={year,deadline:ETS_DEADLINE[year],report:{status:"已核查",no:"ER-"+year+"-330400-0187",submittedAt:h.report[0],verifiedAt:h.report[1],verifier:ETS_VERIFIER,verifiedQty:verified,verifyNo:h.report[2]},
      alloc:{pre:{qty:pre,at:h.pre[0]},final:{qty:alloc.qty,power:alloc.power,heat:alloc.heat,at:h.final[0],status:"已确认",confirmedAt:h.final[1]}},surrender:{status:"未清缴"}};
    add(h.pre[0],"预分配",year,pre,ETS_AUTHORITY+" 预分配",year);
    add(h.final[1],"核定补发",year,alloc.qty-pre,ETS_AUTHORITY+" 核定",year);
    const ccer=h.ccer.reduce((s,c)=>s+c.qty,0);
    h.ccer.forEach(c=>{data.ccer.push({...c,status:"已注销",usedFor:year});order(c.acquiredAt,"14:2"+(c.qty%7),"买入","CCER",c.vintage,c.qty,c.price,year,{project:c.project,channel:"协议转让"});});
    const diff=balance(year)-(verified-ccer);
    if(diff!==0) {
      const qty=Math.abs(diff),parts=tranche(qty,h.trade.dates.map(()=>100/h.trade.dates.length));
      parts.forEach((q,i)=>{if(q>0)order(h.trade.dates[i],String(9+i).padStart(2,"0")+":"+String(31+i*7).padStart(2,"0"),diff>0?"卖出":"买入","CEA",year,q,h.trade.prices[i],year,{channel:h.trade.channel[i]});});
      order(h.trade.dates[0],"09:18",diff>0?"卖出":"买入","CEA",year,Math.round(qty/3/100)*100||100,+(h.trade.prices[0]+(diff>0?2.4:-2.6)).toFixed(2),year,{status:"已撤单",filledPrice:0,note:"价格未成交，收盘撤单"});
    }
    surrender(year,verified-ccer,h.surrender,h.cert);
    Object.assign(data.cycles[year].surrender,{status:"已清缴",at:h.surrender,cea:verified-ccer,ccer,cert:h.cert});
  });
  // 2023–2024：与原履约记录一致，交易拆分为多笔成交
  [2023,2024].forEach(year=>{
    const months=data.monthly[year],verified=Math.round(etsSums(months).emission),alloc=etsAllocFormula(year,months),pre=Math.round(alloc.qty*0.7);
    const ccer=year===2023?1850:0;
    data.cycles[year]={year,deadline:(year+1)+"-12-31",
      report:{status:"已核查",no:"ER-"+year+"-330400-0187",submittedAt:(year+1)+"-03-27",verifiedAt:(year+1)+"-06-2"+(year-2022),verifier:ETS_VERIFIER,verifiedQty:verified,verifyNo:"HC-"+(year+1)+"-ZJ-0"+(412+year-2023)},
      alloc:{pre:{qty:pre,at:(year+1)+"-03-15"},final:{qty:alloc.qty,power:alloc.power,heat:alloc.heat,at:(year+1)+"-09-27",status:"已确认",confirmedAt:(year+1)+"-10-0"+(year-2021)}},surrender:{status:"未清缴"}};
    add((year+1)+"-03-15","预分配",year,pre,ETS_AUTHORITY+" 预分配",year);
    add((year+1)+"-10-0"+(year-2021),"核定补发",year,alloc.qty-pre,ETS_AUTHORITY+" 核定",year);
    if(ccer){data.ccer.push({id:"CCER-"+year+"-0412",project:"浙江安吉竹林经营碳汇项目",type:"存量 CCER · 林业碳汇",vintage:2016,qty:ccer,acquiredAt:(year+1)+"-08-14",price:62.5,status:"已注销",usedFor:year});
      order((year+1)+"-08-14","15:06","买入","CCER",2016,ccer,62.5,year,{project:"浙江安吉竹林经营碳汇项目",channel:"协议转让"});}
    const short=verified-ccer-balance(year);
    if(short>0) {
      const qty=Math.ceil(short/100)*100,price=year===2023?78.4:96.2;
      const dates=year===2023?["2024-10-22","2024-11-05","2024-11-13"]:["2025-09-16","2025-10-28","2025-11-14"];
      const prices=year===2023?[96.8,92.1,price]:[88.5,91.7,price];
      tranche(qty,[35,30,35]).forEach((q,i)=>order(dates[i],String(10+i)+":"+String(12+i*9).padStart(2,"0"),"买入","CEA",year,q,prices[i],year,{channel:i===1?"大宗协议":"挂牌协议"}));
      order(dates[0],"09:41","买入","CEA",year,Math.round(qty/4/100)*100,+(prices[0]-3.2).toFixed(2),year,{status:"已撤单",filledPrice:0,note:"价格未成交，收盘撤单"});
    }
    else if(-short>1500) {
      const qty=Math.floor((-short-600)/50)*50,half=Math.round(qty/2/50)*50;
      order((year+1)+"-11-20","10:33","卖出","CEA",year,half,97.8,year);
      order((year+1)+"-11-20","13:47","卖出","CEA",year,qty-half,97.8,year,{channel:"大宗协议"});
    }
    const date=(year+1)+"-12-1"+(year-2015),cert="QJ-"+year+"-330400-0187";
    surrender(year,verified-ccer,date,cert);
    Object.assign(data.cycles[year].surrender,{status:"已清缴",at:date,cea:verified-ccer,ccer,cert});
  });
  {
    const year=2025,months=data.monthly[year],verified=Math.round(etsSums(months).emission),alloc=etsAllocFormula(year,months),pre=Math.round(alloc.qty*0.7);
    data.cycles[year]={year,deadline:"2026-12-31",
      report:{status:"已核查",no:"ER-2025-330400-0187",submittedAt:"2026-03-26",verifiedAt:"2026-06-26",verifier:ETS_VERIFIER,verifiedQty:verified,verifyNo:"HC-2026-ZJ-0438"},
      alloc:{pre:{qty:pre,at:"2026-03-16"},final:{qty:alloc.qty,power:alloc.power,heat:alloc.heat,at:"2026-11-12",status:"待确认",confirmBy:"2026-11-26"}},surrender:{status:"未清缴"}};
    add("2026-03-16","预分配",year,pre,ETS_AUTHORITY+" 预分配",year);
    order("2026-07-08","10:05","买入","CEA",2025,800,86.9,year,{status:"已撤单",filledPrice:0,note:"价格未成交，收盘撤单"});
    order("2026-09-18","10:26","买入","CEA",2025,1500,93.4,year);
    const c1=order("2026-08-21","14:12","买入","CCER",2024,1200,79.6,year,{project:"福建平潭海上风电项目",channel:"挂牌协议"});
    const c2=order("2026-10-15","14:05","买入","CCER",2024,800,85.9,year,{project:"广西北海红树林营造项目",channel:"挂牌协议"});
    data.ccer.push({id:"CCER-2026-1036",project:"福建平潭海上风电项目",type:"并网海上风力发电",vintage:2024,qty:1200,acquiredAt:"2026-08-21",price:79.6,status:"可用",ref:c1});
    data.ccer.push({id:"CCER-2026-1187",project:"广西北海红树林营造项目",type:"红树林营造",vintage:2024,qty:800,acquiredAt:"2026-10-15",price:85.9,status:"可用",ref:c2});
  }
  data.cycles[2026]={year:2026,deadline:"2027-12-31",report:{status:"监测中"},alloc:{},surrender:{status:"未清缴"}};
  data.ledger.sort((a,b)=>a.date.localeCompare(b.date)||(a.qty<0)-(b.qty<0));
  data.ledger.forEach(row=>row.id="LG"+String(++data.seq).padStart(5,"0"));
  data.orders.sort((a,b)=>b.at.localeCompare(a.at));
  // 操作日志：由业务记录生成
  const log=[];
  ETS_YEARS.forEach(year=>{
    data.monthly[year].filter(row=>row.status==="已存证").forEach(row=>log.push({at:row.at+" 09:"+String(10+row.month*3).padStart(2,"0"),actor:"周建华",text:year+" 年 "+row.month+" 月监测数据存证"}));
    const c=data.cycles[year];
    if(c.report.submittedAt)log.push({at:c.report.submittedAt+" 16:05",actor:MANAGER_NAME,text:"提交 "+year+" 年度排放报告 "+c.report.no});
    if(c.report.verifiedAt)log.push({at:c.report.verifiedAt+" 11:30",actor:ETS_VERIFIER,text:"出具 "+year+" 年度核查报告 "+c.report.verifyNo});
    if(c.alloc.final?.confirmedAt)log.push({at:c.alloc.final.confirmedAt+" 10:20",actor:MANAGER_NAME,text:"确认 "+year+" 年度配额核定结果 "+fmt(c.alloc.final.qty,0)+" t"});
    if(c.surrender.at)log.push({at:c.surrender.at+" 15:40",actor:MANAGER_NAME,text:year+" 年度配额清缴完成 · "+c.surrender.cert});
  });
  data.orders.forEach(o=>log.push({at:o.at,actor:MANAGER_NAME,text:(o.status==="已撤单"?"撤单 ":"")+o.side+" "+o.product+(o.project?" · "+o.project:"")+" "+fmt(o.qty,0)+" t @ "+o.price.toFixed(2)}));
  log.push({at:"2026-11-12 16:20",actor:"系统",text:"收到 "+ETS_AUTHORITY+" 2025 年度配额核定结果"});
  data.log=log.sort((a,b)=>b.at.localeCompare(a.at));
  return data;
};
ets = function () {
  if(demo.ets?.v!==3){demo.ets=etsBuild();persistDemo();}
  return demo.ets;
};

// ---------- 年度切换 ----------
etsTabs = function () {
  const sel=etsSel();
  const recent=ETS_YEARS.filter(year=>year>=2023),older=ETS_YEARS.filter(year=>year<2023);
  return '<div class="etsYearBar"><div class="segTabs">'+recent.map(year=>{const status=etsStatus(year);
      return '<button class="'+(year===sel?'active':'')+'" onclick="setEtsYear('+year+')">'+year+' 年度 <em>'+status.label+'</em></button>';}).join("")+'</div>'+
    '<label class="inlineField">更早年度 <select onchange="if(this.value)setEtsYear(this.value)"><option value="">选择</option>'+older.map(year=>'<option value="'+year+'" '+(year===sel?'selected':'')+'>'+year+' 年度 · '+etsStatus(year).label+'</option>').join("")+'</select></label></div>';
};

// ---------- 通用筛选 ----------
const ETS_F = {};
function etsF(key){return ETS_F[key]||(ETS_F[key]={});}
function setEtsF(key,field,value){etsF(key)[field]=value;render();}
function etsFilterBar(key,fields,count) {
  const f=etsF(key);
  return '<div class="taskToolbar">'+fields.map(field=>field.type==="search"?
    '<label class="taskSearch">查找<input id="etsQ-'+key+'" value="'+textHtml(f[field.key]||"")+'" placeholder="'+field.placeholder+'" onkeydown="if(event.key===\'Enter\')setEtsF(\''+key+'\',\''+field.key+'\',this.value)"></label><button class="btn" onclick="setEtsF(\''+key+'\',\''+field.key+'\',document.getElementById(\'etsQ-'+key+'\').value)">查询</button>':
    '<label>'+field.label+'<select onchange="setEtsF(\''+key+'\',\''+field.key+'\',this.value)"><option value="">全部</option>'+field.options.map(option=>'<option '+(String(f[field.key]||"")===String(option)?'selected':'')+'>'+option+'</option>').join("")+'</select></label>').join("")+
    '<span>'+count+' 条</span></div>';
}
function replaceCard(html,title,newHtml) {
  const marker='<section class="panel"><div class="panelHead"><h3>'+title+'</h3>';
  const start=html.indexOf(marker);
  if(start<0)return html+newHtml;
  const end=html.indexOf("</section>",start)+"</section>".length;
  return html.slice(0,start)+newHtml+html.slice(end);
}

// ---------- 工作台：操作记录与待办等高 ----------
const etsWorkbenchBeforeScale = etsWorkbench;
etsWorkbench = function () {
  const html=etsWorkbenchBeforeScale();
  const log=ets().log.slice(0,6);
  return replaceCard(html,"操作记录",card("操作记录",'<ul class="feed">'+log.map(row=>'<li><time>'+textHtml(row.at)+'</time><span>'+textHtml(row.actor)+'</span>'+textHtml(row.text)+'</li>').join("")+'</ul>',
    '<button class="linkBtn" onclick="showEtsLog()">全部 '+ets().log.length+' 条 ›</button>'));
};
function showEtsLog() {
  openModal('<h2>操作记录</h2><div class="tableWrap"><table class="compact"><thead><tr><th>时间</th><th>操作人</th><th>事项</th></tr></thead><tbody>'+
    ets().log.map(row=>'<tr><td>'+textHtml(row.at)+'</td><td>'+textHtml(row.actor)+'</td><td>'+textHtml(row.text)+'</td></tr>').join("")+'</tbody></table></div>'+
    '<div class="modalActions"><button class="btn primary" data-close-modal="1">关闭</button></div>');
  setTimeout(applyModalPager,0);
}
function applyModalPager() {
  const table=document.querySelector("#modalContent table");if(!table)return;
  const rows=[...table.tBodies[0].rows],size=15;let page=1;const pages=Math.ceil(rows.length/size);
  if(pages<2)return;
  const bar=document.createElement("div");bar.className="pager";
  const draw=()=>{rows.forEach((row,i)=>row.hidden=!(i>=(page-1)*size&&i<page*size));
    bar.innerHTML='<span>共 '+rows.length+' 条</span><div><button type="button" '+(page===1?'disabled':'')+' data-p="'+(page-1)+'">‹</button><em>'+page+' / '+pages+'</em><button type="button" '+(page===pages?'disabled':'')+' data-p="'+(page+1)+'">›</button></div>';};
  bar.addEventListener("click",event=>{const p=Number(event.target.dataset?.p);if(p){page=p;draw();}});
  draw();table.closest(".tableWrap").after(bar);
}

// ---------- 排放监测：分机组 ----------
let etsUnitSel = "";
function setEtsUnit(value){etsUnitSel=value;render();}
const etsMonitorPageBeforeScale = etsMonitorPage;
etsMonitorPage = function () {
  const year=etsSel(),data=ets();
  const bar='<div class="taskToolbar"><label>机组<select onchange="setEtsUnit(this.value)"><option value="">全厂</option>'+ETS_UNITS.map(unit=>'<option value="'+unit.id+'" '+(etsUnitSel===unit.id?'selected':'')+'>'+unit.name+'</option>').join("")+'</select></label>'+
    '<span>'+(etsUnitSel?textHtml(ETS_UNITS.find(u=>u.id===etsUnitSel).spec):ETS_UNITS.map(u=>u.name).join("、"))+'</span></div>';
  let html;
  if(etsUnitSel) {
    const orig=data.monthly[year];
    data.monthly[year]=scaleMonths(orig,year,etsUnitSel);
    try{html=etsMonitorPageBeforeScale();}finally{data.monthly[year]=orig;}
    html=html.replace(/onclick="openEtsMonth\([^"]*\)"/g,'disabled');
  } else html=etsMonitorPageBeforeScale();
  const unitTable=card("分机组汇总",'<div class="tableWrap"><table class="compact"><thead><tr><th>机组</th><th>入炉煤量 (t)</th><th>供电量 (MWh)</th><th>供热量 (GJ)</th><th>排放量 (tCO₂)</th><th>供电排放强度 (tCO₂/MWh)</th></tr></thead><tbody>'+
    ETS_UNITS.map(unit=>{const sums=etsSums(scaleMonths(data.monthly[year],year,unit.id));return '<tr><td>'+unit.name+'</td><td>'+fmt(sums.coal,0)+'</td><td>'+fmt(sums.supply,0)+'</td><td>'+fmt(sums.heat,0)+'</td><td>'+fmt(sums.emission,0)+'</td><td>'+(sums.supply?(sums.coalEmission*0.82/sums.supply).toFixed(4):'—')+'</td></tr>';}).join("")+'</tbody></table></div>');
  return html.replace('<section class="panel"><div class="panelHead"><h3>月度数据</h3>',bar+'<section class="panel"><div class="panelHead"><h3>月度数据'+(etsUnitSel?' · '+ETS_UNITS.find(u=>u.id===etsUnitSel).name:'')+'</h3>')
    .replace('<div class="homeGrid even"><div>'+card("年度排放报告","").slice(0,40),'$&')+unitTable;
};

// ---------- 配额管理：分机组核定与流水筛选 ----------
const etsAllocPageBeforeScale = etsAllocPage;
etsAllocPage = function () {
  const year=etsSel(),p=ETS_PROFILE[year],data=ets();
  let html=etsAllocPageBeforeScale();
  const units=card(year+" 年度分机组配额",'<div class="tableWrap"><table class="compact"><thead><tr><th>机组</th><th>供电量 (MWh)</th><th>供电基准值</th><th>供电配额 (t)</th><th>供热量 (GJ)</th><th>供热基准值</th><th>供热配额 (t)</th><th>小计 (t)</th></tr></thead><tbody>'+
    ETS_UNITS.map(unit=>{const sums=etsSums(scaleMonths(data.monthly[year],year,unit.id));const power=Math.round(sums.supply*p.be),heat=Math.round(sums.heat*p.bh);
      return '<tr><td>'+unit.name+'</td><td>'+fmt(sums.supply,0)+'</td><td>'+p.be+'</td><td>'+fmt(power,0)+'</td><td>'+fmt(sums.heat,0)+'</td><td>'+p.bh+'</td><td>'+fmt(heat,0)+'</td><td>'+fmt(power+heat,0)+'</td></tr>';}).join("")+'</tbody></table></div>');
  const f=etsF("ledger");
  let balance=0;
  const all=data.ledger.map(row=>{balance+=row.qty;return {...row,balance};}).reverse();
  const rows=all.filter(row=>(!f.vintage||String(row.vintage)===f.vintage)&&(!f.type||row.type===f.type)&&(!f.q||[row.id,row.ref,row.date].join(" ").includes(f.q)));
  const ledger='<section class="panel"><div class="panelHead"><h3>配额账户流水</h3><span class="muted small">'+ETS_ENTITY.account+'</span></div>'+
    etsFilterBar("ledger",[{key:"vintage",label:"配额年度",options:[...new Set(data.ledger.map(r=>r.vintage))].sort()},{key:"type",label:"业务类型",options:[...new Set(data.ledger.map(r=>r.type))]},{key:"q",type:"search",placeholder:"流水号、单据、日期"}],rows.length)+
    '<div class="tableWrap"><table><thead><tr><th>流水号</th><th>日期</th><th>业务类型</th><th>配额年度</th><th>变动 (t)</th><th>账户余额 (t)</th><th>关联单据</th></tr></thead><tbody>'+
    (rows.length?rows.map(row=>'<tr><td>'+row.id+'</td><td>'+row.date+'</td><td>'+row.type+'</td><td>'+row.vintage+'</td><td class="'+(row.qty>=0?'okText':'badText')+'">'+(row.qty>=0?'+':'')+fmt(row.qty,0)+'</td><td>'+fmt(row.balance,0)+'</td><td>'+textHtml(row.ref)+'</td></tr>').join(""):'<tr><td colspan="7" class="emptyCell">没有符合条件的流水</td></tr>')+
    '</tbody></table></div></section>';
  html=replaceCard(html,"配额账户流水",ledger);
  return html.replace('<section class="panel"><div class="panelHead"><h3>配额账户流水</h3>',units+'<section class="panel"><div class="panelHead"><h3>配额账户流水</h3>');
};

// ---------- 交易委托：筛选 ----------
const etsTradePageBeforeScale = etsTradePage;
etsTradePage = function () {
  const html=etsTradePageBeforeScale();
  const f=etsF("orders"),orders=ets().orders;
  const rows=orders.filter(row=>(!f.year||row.at.startsWith(f.year))&&(!f.product||row.product===f.product)&&(!f.side||row.side===f.side)&&(!f.status||row.status===f.status)&&(!f.q||[row.id,row.project||"",row.counterparty||""].join(" ").includes(f.q)));
  const filled=rows.filter(row=>row.status==="已成交");
  const amount=filled.reduce((sum,row)=>sum+(row.side==="买入"?1:-1)*row.qty*row.filledPrice,0);
  const table='<section class="panel"><div class="panelHead"><h3>委托记录</h3><span class="muted small">成交 '+filled.length+' 笔 · 净'+(amount>=0?'支出':'收入')+' '+fmt(Math.abs(amount)/10000,1)+' 万元</span></div>'+
    etsFilterBar("orders",[{key:"year",label:"委托年份",options:[...new Set(orders.map(r=>r.at.slice(0,4)))].sort().reverse()},{key:"product",label:"品种",options:["CEA","CCER"]},{key:"side",label:"方向",options:["买入","卖出"]},
      {key:"status",label:"状态",options:[...new Set(orders.map(r=>r.status))]},{key:"q",type:"search",placeholder:"委托号、项目、交易场所"}],rows.length)+
    '<div class="tableWrap"><table><thead><tr><th>委托号</th><th>委托时间</th><th>方向</th><th>品种</th><th>年度</th><th>数量</th><th>委托价</th><th>成交价</th><th>金额 (元)</th><th>方式</th><th>交易场所</th><th>状态</th><th></th></tr></thead><tbody>'+
    (rows.length?rows.map(row=>'<tr><td>'+row.id+'</td><td>'+row.at+'</td><td class="'+(row.side==="买入"?'badText':'okText')+'">'+row.side+'</td><td>'+row.product+(row.project?'<small>'+textHtml(row.project)+'</small>':'')+'</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td><td>'+row.price.toFixed(2)+'</td><td>'+(row.status==="已成交"?row.filledPrice.toFixed(2):'—')+'</td><td>'+
      (row.status==="已成交"?fmt(row.qty*row.filledPrice,0):'—')+'</td><td>'+row.channel+'</td><td>'+textHtml(row.counterparty||"上海环境能源交易所")+'</td><td><span class="status '+({"已成交":"ok","已报":"warn"}[row.status]||"gray")+'">'+row.status+'</span>'+(row.note?'<small>'+textHtml(row.note)+'</small>':'')+'</td><td>'+
      (row.status==="已报"&&etsEditable()?'<button class="linkBtn" onclick="cancelEtsOrder(\''+row.id+'\')">撤单</button>':'')+'</td></tr>').join(""):'<tr><td colspan="13" class="emptyCell">没有符合条件的委托</td></tr>')+
    '</tbody></table></div></section>';
  return replaceCard(html,"委托记录",table);
};

// ---------- CCER：筛选 ----------
const etsCcerPageBeforeScale = etsCcerPage;
etsCcerPage = function () {
  const html=etsCcerPageBeforeScale();
  const f=etsF("ccer"),list=ets().ccer;
  const rows=list.filter(row=>(!f.status||row.status===f.status)&&(!f.used||String(row.usedFor||"")===f.used)&&(!f.q||[row.id,row.project,row.type].join(" ").includes(f.q)));
  const table='<section class="panel"><div class="panelHead"><h3>CCER 持仓</h3><span class="muted small">累计取得 '+fmt(list.reduce((s,r)=>s+r.qty,0),0)+' tCO₂e · 已注销 '+fmt(list.filter(r=>r.status==="已注销").reduce((s,r)=>s+r.qty,0),0)+'</span></div>'+
    etsFilterBar("ccer",[{key:"status",label:"状态",options:[...new Set(list.map(r=>r.status))]},{key:"used",label:"抵销年度",options:[...new Set(list.filter(r=>r.usedFor).map(r=>String(r.usedFor)))].sort()},{key:"q",type:"search",placeholder:"登记编号、项目"}],rows.length)+
    '<div class="tableWrap"><table><thead><tr><th>登记编号</th><th>项目</th><th>方法学类型</th><th>减排量年份</th><th>数量 (tCO₂e)</th><th>取得日期</th><th>成本 (元/t)</th><th>状态</th><th>用于</th><th></th></tr></thead><tbody>'+
    (rows.length?rows.map(row=>'<tr><td>'+row.id+'</td><td>'+textHtml(row.project)+'</td><td>'+row.type+'</td><td>'+row.vintage+'</td><td>'+fmt(row.qty,0)+'</td><td>'+row.acquiredAt+'</td><td>'+row.price.toFixed(2)+'</td><td><span class="status '+({"可用":"ok","已锁定":"warn"}[row.status]||"gray")+'">'+row.status+'</span></td><td>'+(row.usedFor?row.usedFor+' 年度':'—')+'</td><td>'+
      (row.status==="已锁定"&&etsEditable()&&!etsCalc(row.usedFor).settled?'<button class="linkBtn" onclick="releaseCcer(\''+row.id+'\')">撤回</button>':'')+'</td></tr>').join(""):'<tr><td colspan="10" class="emptyCell">没有符合条件的持仓</td></tr>')+
    '</tbody></table></div></section>';
  return replaceCard(html,"CCER 持仓",table);
};
