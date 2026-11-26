// v12：碳履约。只有滨海石化热电厂（2×350 MW 燃煤热电联产机组）纳入全国碳市场；石化装置尚未纳入。
// 履约口径按化石燃料燃烧排放计；监测 → 报告核查 → 配额核定 → 清缴 在一个年度周期内联动。

etsMonthEmission = function (row) {
  const coal=row.coal*row.ncv*row.cc*CHP_PARAMS.of*44/12;
  return {coal,elec:0,total:coal};
};
const v12EtsBuildBase = etsBuild;
etsBuild = function () {const d=v12EtsBuildBase();d.v=4;return d;};
ets = function () {
  if(demo.ets?.v!==4){demo.ets=etsBuild();persistDemo();}
  return demo.ets;
};
etsCoalFactor = function (year=CURRENT_YEAR) {
  const sums=etsSums(ets().monthly[year]);
  return sums.coal?sums.coalEmission/sums.coal:CHP_COAL_FACTOR;
};

function v12EY(){const y=Number(v12State.etsYear)||etsFocusYear();return ETS_YEARS.includes(y)?y:etsFocusYear();}
function v12EtsYearBar() {
  const y=v12EY();
  return '<div class="v12EtsYears">'+ETS_YEARS.filter(x=>x>=2023).map(x=>{const s=etsStatus(x);return '<button class="'+(x===y?'active':'')+'" onclick="v12Set(\'etsYear\','+x+')"><b>'+x+' 年度</b><span class="status '+s.tone+'">'+s.label+'</span></button>';}).join("")+
    '<select onchange="v12Set(\'etsYear\',this.value)"><option value="">更早年度</option>'+ETS_YEARS.filter(x=>x<2023).map(x=>'<option value="'+x+'" '+(x===y?'selected':'')+'>'+x+' 年度 · '+etsStatus(x).label+'</option>').join("")+'</select></div>';
}
function v12EtsFacts(year) {
  const c=etsCalc(year),cycle=c.cycle,final=cycle.alloc.final,pre=cycle.alloc.pre;
  const bought=ets().ledger.filter(r=>r.year===year&&r.type==="买入").reduce((s,r)=>s+r.qty,0);
  const sold=-ets().ledger.filter(r=>r.year===year&&r.type==="卖出").reduce((s,r)=>s+r.qty,0);
  return {c,cycle,final,pre,bought,sold,alloc:final?final.qty:c.alloc};
}

// ================= 履约工作台 =================
function v12EtsBench() {
  const year=v12EY(),{c,cycle,final,pre,bought,sold,alloc}=v12EtsFacts(year);
  const months=ets().monthly[year],att=months.filter(m=>m.status==="已存证").length;
  const st=etsStatus(year),days=daysUntil(cycle.deadline);
  const stage=(n,title,state,tone,lines,action,btn)=>'<div class="v12EtsStage '+tone+'"><div class="h"><i>'+n+'</i><b>'+title+'</b><span class="status '+(tone==="done"?"ok":tone==="now"?"warn":"gray")+'">'+state+'</span></div>'+
    '<dl>'+lines.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join("")+'</dl>'+(btn?'<button class="linkBtn" onclick="'+action+'">'+btn+' ›</button>':'')+'</div>';
  const rep=cycle.report.status;
  const s1=stage(1,"排放监测",att===12?"已完成":att+" / 12 月",att===12?"done":"now",[["已存证月份",att+" / 12"],["燃煤量",fmt(c.sums.coal,0)+" t"],["燃煤排放",fmt(c.sums.coalEmission,0)+" tCO₂"]],"go('碳履约','排放监测')","月度数据");
  const s2=stage(2,"报告与核查",rep==="已核查"?"已核查":rep==="已提交"?"核查中":rep==="待提交"?"待提交":"监测中",rep==="已核查"?"done":rep==="监测中"?"":"now",
    [["报告排放",cycle.report.reportedQty||rep==="已核查"?fmt(cycle.report.reportedQty||c.verified,0)+" tCO₂":"—"],["核查排放",c.verifiedDone?'<b>'+fmt(c.verified,0)+' tCO₂</b>':"—"],["核查机构",c.verifiedDone?cycle.report.verifier:"—"]],"go('碳履约','排放监测')","报告核查");
  const s3=stage(3,"配额核定",final?.status==="已确认"?"已确认":final?final.status:pre?"已预分配":"未下发",final?.status==="已确认"?"done":final||pre?"now":"",
    [["预分配（70%）",pre?fmt(pre.qty,0)+" t":"—"],["核定配额",final?'<b>'+fmt(final.qty,0)+' t</b>':'预计 '+fmt(c.alloc,0)+' t'],["核定补发",final?fmt(final.qty-(pre?.qty||0),0)+" t":"—"]],"go('碳履约','配额管理');v12State.quotaTab='alloc'","核定明细");
  const s4=stage(4,"配额清缴",c.settled?"已清缴":c.verifiedDone?(c.gap>=0?"可清缴":"有缺口"):"未开始",c.settled?"done":c.verifiedDone?"now":"",
    [["应清缴",c.verifiedDone?fmt(c.verified,0)+" t":"—"],["CCER 抵销",fmt(c.ccer,0)+" / 上限 "+fmt(c.cap,0)],[c.settled?"清缴日期":"缺口 / 盈余",c.settled?cycle.surrender.at:c.verifiedDone?'<b class="'+(c.gap<0?'badText':'okText')+'">'+(c.gap<0?'缺 '+fmt(-c.gap,0):'余 '+fmt(c.gap,0))+' t</b>':"—"]],"go('碳履约','配额管理');v12State.quotaTab='surrender'","清缴");
  const flow='<div class="v12EtsFlow">'+s1+'<span class="arr">→</span>'+s2+'<span class="arr">→</span>'+s3+'<span class="arr">→</span>'+s4+'</div>';
  const balance=v12Columns([
    {label:"应清缴排放",value:c.verified,color:"#344054",display:fmt(c.verified,0)},
    {label:"履约来源",stack:[{label:"预分配",value:pre?.qty||0,color:"#26890D"},{label:"核定补发",value:final?Math.max(0,final.qty-(pre?.qty||0)):0,color:"#86BC25"},{label:"CCER 抵销",value:c.ccer,color:"#0097A9"},{label:"净买入",value:Math.max(0,bought-sold),color:"#B7791F"}]}
  ],{width:520,height:250,barW:110,valFmt:v=>fmt(v,0),axisFmt:v=>v12Big(v)});
  const org=v12Detail(Math.min(year,CURRENT_YEAR)),s1Org=org.filter(r=>String(r.scope)==="1").reduce((s,r)=>s+r.emission_tco2e,0);
  const link='<dl class="v12KV">'+[["纳入设施","滨海石化热电厂 · 2×350 MW 超临界燃煤热电联产机组（全国碳市场 · 发电行业）"],["未纳入","炼油、乙烯、化工装置等石化生产设施尚未纳入全国碳市场，按组织碳盘查口径管理"],
    ["与组织碳关系","机组燃煤排放即组织碳台账范围一「燃煤热电联产」（T-S1-04），月度存证后自动同步"],["占集团范围一",(s1Org?c.sums.coalEmission/s1Org*100:0).toFixed(1)+"%（"+fmt(c.sums.coalEmission,0)+" / "+fmt(s1Org,0)+" tCO₂e）"],["履约口径","化石燃料燃烧排放；外购电力不计入履约排放"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join("")+'</dl>';
  const rows=ETS_YEARS.slice().reverse().map(y=>{const f=v12EtsFacts(y),s=etsStatus(y);
    return {click:"v12Set('etsYear',"+y+")",cls:y===year?"v12Cur":"",cells:[y+" 年度",f.c.verifiedDone?fmt(f.c.verified,0):'<span class="muted">'+fmt(f.c.verified,0)+'（预计）</span>',f.final?fmt(f.final.qty,0):'<span class="muted">'+fmt(f.c.alloc,0)+'（预计）</span>',
      fmt(f.c.ccer,0),(f.bought-f.sold>=0?'+':'')+fmt(f.bought-f.sold,0),'<b class="'+(f.alloc-f.c.verified>=0?'okText':'badText')+'">'+(f.alloc-f.c.verified>=0?'+':'')+fmt(f.alloc-f.c.verified,0)+'</b>',f.cycle.surrender.at||"—",f.cycle.deadline,'<span class="status '+s.tone+'">'+s.label+'</span>']};});
  const todos=etsTodos().filter(t=>!t.year||t.year===year||!etsCalc(t.year).settled);
  return v12Head("履约工作台",'<button class="btn" onclick="showEtsLog&&showEtsLog()">操作日志</button>')+v12EtsYearBar()+
    '<div class="statRow five">'+v12Kpi(c.verifiedDone?"核查排放":"预计排放",fmt(c.verified,0),"tCO₂")+v12Kpi(final?"核定配额":"预计配额",fmt(alloc,0),"t · 预分配 "+(pre?fmt(pre.qty,0):"—"))+
      v12Kpi("配额盈亏",(alloc-c.verified>=0?"+":"")+fmt(alloc-c.verified,0),"t · 配额 − 排放",null,alloc-c.verified>=0?"okText":"badText")+v12Kpi("履约状态",'<span class="status '+st.tone+'">'+st.label+'</span>',c.settled?"清缴凭证 "+cycle.surrender.cert:"清缴截止 "+cycle.deadline)+
      v12Kpi("剩余天数",c.settled?"—":String(Math.max(0,days)),c.settled?"已履约":"天",null,!c.settled&&days<60?"badText":"")+'</div>'+
    v12Panel(year+" 年度履约链路",flow)+
    '<div class="v12Grid2">'+v12Panel("排放与配额勾稽",balance+v12LegendRow([["应清缴排放","#344054"],["预分配","#26890D"],["核定补发","#86BC25"],["CCER 抵销","#0097A9"],["净买入","#B7791F"]]))+
      v12Panel("纳入范围与组织碳关系",link)+'</div>'+
    (todos.length?v12Panel("待办 <em>"+todos.length+"</em>",todoList(todos.map(t=>({...t,button:t.tag==="交易"?"登记购入":t.button,action:String(t.action).replace("go('碳履约','配额清缴')","v12State.quotaTab='surrender';go('碳履约','配额管理')").replace(/openEtsOrder\('买入','CEA',(\d+)\)/,"v12BuyCea($1)")})),"")):'')+
    v12Panel("年度履约台账",v12Table(["履约年度","核查排放 (tCO₂)","核定配额 (t)","CCER 抵销","净买入 / 卖出 (t)","配额盈亏 (t)","清缴日期","清缴截止","状态"],rows,{nopage:true}));
}

// ================= 排放监测 =================
function v12EtsMonitor() {
  const year=v12EY(),c=etsCalc(year),cycle=c.cycle,months=ets().monthly[year];
  const units=ETS_UNITS.map(u=>{const m=scaleMonths(months,year,u.id),s=etsSums(m);return {...u,m,s};});
  const unitCards='<div class="v12Units">'+units.map(u=>'<div class="v12Unit"><div class="h"><b>'+u.name+'</b><small>投运 '+u.commissioned+'</small></div><p>'+v12H(u.spec)+'</p>'+
    '<dl><div><dt>燃煤量</dt><dd>'+fmt(u.s.coal,0)+' t</dd></div><div><dt>供电量</dt><dd>'+fmt(u.s.supply,0)+' MWh</dd></div><div><dt>供热量</dt><dd>'+fmt(u.s.heat,0)+' GJ</dd></div><div><dt>排放</dt><dd><b>'+fmt(u.s.coalEmission,0)+' tCO₂</b></dd></div>'+
    '</dl></div>').join("")+
    '<div class="v12UnitNote"><b>什么是机组</b><p>机组指一台锅炉与其配套汽轮发电机组成的发电单元，是全国碳市场发电行业核算和配额分配的基本单元。每台机组分别计量入炉煤量、元素碳、供电量和供热量，分别计算排放和配额，全厂汇总后履约。</p>'+
    '<p class="v12Formula">E = Σ（FC × NCV × CC × OF × 44/12）<small>FC 入炉煤量 · NCV 低位发热量 · CC 单位热值含碳量 · OF 碳氧化率 '+CHP_PARAMS.of+'</small></p></div></div>';
  const chart=v12Columns(months.map((m,i)=>({label:m.month+"月",stack:units.map((u,k)=>({label:u.name,value:etsMonthEmission(u.m[i]).coal,color:["#26890D","#86BC25"][k]})),action:m.status!=="未到期"?"openEtsMonth("+year+","+m.month+")":""})),{width:1000,height:240,barW:46,labels:false});
  const rows=months.map(m=>{const e=etsMonthEmission(m);return {cells:[m.month+" 月",fmt(m.coal,0),m.ncv,m.cc,m.status==="未到期"?"—":fmt(e.coal,0),fmt(m.supply,0),fmt(m.heat,0),
    '<span class="status '+({"已存证":"ok","待存证":"warn"}[m.status]||"gray")+'">'+m.status+'</span>'+(m.at?'<small>'+m.at+'</small>':''),
    m.status==="未到期"?'':'<button class="'+(m.status==="待存证"?'btn primary':'linkBtn')+'" onclick="openEtsMonth('+year+','+m.month+')">'+(m.status==="待存证"?'录入并存证':'查看')+'</button>']};});
  const sums=etsSums(months);
  rows.push({cls:"totalRow",cells:["合计",fmt(sums.coal,0),"—","—",fmt(sums.coalEmission,0),fmt(sums.supply,0),fmt(sums.heat,0),"",""]});
  const steps=[["月度监测","每月 10 日前存证"],["排放报告","次年 3 月 31 日前"],["第三方核查","省生态环境厅组织"],["核查结论","确定应清缴量"]];
  const rep=cycle.report.status,idx=rep==="已核查"?4:rep==="已提交"?2:rep==="待提交"?1:0;
  const orgQty=year===CURRENT_YEAR?Number(taskEntry({id:"T-S1-04"}).activity)||0:sums.coal;
  const repPanel=v12Panel("年度排放报告与核查",v12Steps(steps,idx)+'<dl class="v12KV">'+[["报告编号",cycle.report.no||"—"],["提交日期",cycle.report.submittedAt||"—"],["报告排放量",(cycle.report.reportedQty||rep==="已核查")?fmt(cycle.report.reportedQty||c.verified,0)+" tCO₂":"—"],
    ["核查机构",cycle.report.verifier||ETS_VERIFIER],["核查报告",cycle.report.verifyNo||"—"],["核查排放量",c.verifiedDone?fmt(c.verified,0)+" tCO₂":"—"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>',
    rep==="待提交"?'<button class="btn primary" onclick="openEtsReport('+year+')">提交排放报告</button>':rep==="已提交"?'<button class="btn primary" onclick="openEtsVerify('+year+')">登记核查结论</button>':'');
  const recon=v12Panel("与组织碳台账核对",'<dl class="v12KV">'+[["碳履约 · 入炉煤量",fmt(sums.coal,0)+" t"],["组织碳 · T-S1-04 燃煤热电联产",fmt(orgQty,0)+" t"],["差异",fmt(orgQty-sums.coal,0)+" t（"+(sums.coal?((orgQty-sums.coal)/sums.coal*100).toFixed(2):0)+"%）"],
    ["同步方式","月度存证后自动写入组织碳填报任务，热电厂填报人无需重复填报"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>',
    '<button class="linkBtn" onclick="go(\'组织碳排放\',\'碳核算\',\'碳台账\')">碳台账 ›</button>');
  return v12Head("排放监测")+v12EtsYearBar()+
    '<div class="statRow">'+v12Kpi("已存证",months.filter(m=>m.status==="已存证").length+" / 12","个月")+v12Kpi("累计燃煤",fmt(sums.coal,0),"t")+v12Kpi("累计排放",fmt(sums.coalEmission,0),"tCO₂")+
      v12Kpi("综合排放因子",(sums.coal?sums.coalEmission/sums.coal:0).toFixed(4),"tCO₂ / t 煤")+'</div>'+
    v12Panel("纳入机组",unitCards)+v12Panel("月度排放（分机组）",chart+v12LegendRow(units.map((u,k)=>[u.name,["#26890D","#86BC25"][k]])))+
    v12Panel("月度监测数据",v12Table(["月份","入炉煤量 (t)","低位发热量 (GJ/t)","单位热值含碳量 (tC/GJ)","排放量 (tCO₂)","供电量 (MWh)","供热量 (GJ)","状态",""],rows,{nopage:true}))+
    '<div class="v12Grid2">'+repPanel+recon+'</div>';
}

// ================= 配额管理 =================
function v12QuotaTab(t){v12Set("quotaTab",t);}
function v12EtsQuota() {
  const tab=v12State.quotaTab||"alloc",year=v12EY();
  const body={setting:v12QuotaSetting,alloc:v12QuotaAlloc,surrender:v12QuotaSurrender,ledger:v12QuotaLedger}[tab](year);
  const holdings=etsHoldings(),total=Object.values(holdings).reduce((a,b)=>a+b,0);
  return v12Head("配额管理")+v12EtsYearBar()+
    '<div class="statRow">'+v12Kpi("账户配额余额",fmt(total,0),"t · "+Object.keys(holdings).filter(v=>holdings[v]>0).map(v=>v+" 年度 "+fmt(holdings[v],0)).join(" · "))+v12Kpi("可用 CCER",fmt(etsCcerFree(),0),"tCO₂e")+
      v12Kpi("CEA 参考价",etsPrice().toFixed(2),"元/t · 持仓市值 "+fmt(total*etsPrice()/10000,0)+" 万元")+v12Kpi("登记账户",'<span style="font-size:16px">'+ETS_ENTITY.account+'</span>',ETS_ENTITY.name)+'</div>'+
    v12Tabs([["setting","配额设置"],["alloc","配额核定"],["surrender","配额清缴"],["ledger","账户流水"]],tab,"v12QuotaTab")+body;
}
function v12EtsCfg() {
  const v=v12();v.etsCfg ||= {preRatio:70,ccerCap:5,cooling:"水冷",coolingK:1,heatK:1,loadK:1};
  return v.etsCfg;
}
function v12QuotaSetting(year) {
  const cfg=v12EtsCfg(),p=ETS_PROFILE[year];
  const yearsRows=ETS_YEARS.slice().reverse().map(y=>[y+" 年度",ETS_PROFILE[y].be,ETS_PROFILE[y].bh,y<2021?"2019–2020 年度方案":y<2023?"2021–2022 年度方案":"2023–2024 年度方案及后续",y===year?v12Tag("当前","ok"):""]);
  return '<div class="v12Grid2">'+v12Panel("分配参数 · "+year+" 年度",'<dl class="v12KV">'+[["机组类别","300 MW 等级以上常规燃煤机组"],["供电基准值",p.be+" tCO₂/MWh"],["供热基准值",p.bh+" tCO₂/GJ"],
      ["冷却方式修正系数",cfg.coolingK.toFixed(3)+"（"+cfg.cooling+"）"],["供热量修正系数",cfg.heatK.toFixed(3)],["负荷（出力）系数修正系数",cfg.loadK.toFixed(3)],["预分配比例",cfg.preRatio+"%（按上年度产出量）"],["CCER 抵销上限",cfg.ccerCap+"% × 核查排放"],["清缴截止",etsCycle(year).deadline]].map(([k,val])=>'<div><dt>'+k+'</dt><dd>'+v12H(val)+'</dd></div>').join("")+'</dl>',
      etsEditable()?'<button class="btn" onclick="v12EditEtsCfg('+year+')">编辑参数</button>':'')+
    v12Panel("配额计算公式",'<p class="v12Formula">配额 = 供电量 × 供电基准值 × 冷却方式修正 × 供热量修正 × 负荷修正<br>　　 + 供热量 × 供热基准值</p>'+
      '<ol class="v12Ol"><li>预分配：上年度供电、供热量 × 基准值 × '+cfg.preRatio+'%，年初发放。</li><li>核定：本年度核查后的实际供电、供热量重新计算，多退少补。</li><li>清缴：注销配额 + CCER（≤ '+cfg.ccerCap+'%）≥ 核查排放量。</li></ol>')+'</div>'+
    v12Panel("历年基准值",v12Table(["年度","供电基准值 (tCO₂/MWh)","供热基准值 (tCO₂/GJ)","依据",""],yearsRows,{nopage:true}));
}
function v12EditEtsCfg(year) {
  const cfg=v12EtsCfg(),p=ETS_PROFILE[year];
  v12Modal(year+" 年度分配参数",'<div class="modalForm">'+v12Field("供电基准值 (tCO₂/MWh)",'<input id="ecBe" type="number" step="0.0001" value="'+p.be+'">')+v12Field("供热基准值 (tCO₂/GJ)",'<input id="ecBh" type="number" step="0.0001" value="'+p.bh+'">')+
    v12Field("冷却方式",'<select id="ecCool"><option '+(cfg.cooling==="水冷"?'selected':'')+'>水冷</option><option '+(cfg.cooling==="空冷"?'selected':'')+'>空冷</option></select>')+v12Field("预分配比例 (%)",'<input id="ecPre" type="number" value="'+cfg.preRatio+'">')+
    v12Field("CCER 抵销上限 (%)",'<input id="ecCap" type="number" value="'+cfg.ccerCap+'">')+'</div>'+(etsCycle(year).alloc.final?'<p class="v12Hint">该年度已下发核定结果，基准值修改仅用于测算，不改变已核定配额。</p>':''),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveEtsCfg('+year+')">保存</button>');
}
function v12SaveEtsCfg(year) {
  const cfg=v12EtsCfg(),be=Number(v12Val("ecBe")),bh=Number(v12Val("ecBh"));
  if(!(be>0&&be<2&&bh>0&&bh<1)){showToast("基准值超出合理范围");return;}
  if(!etsCycle(year).alloc.final){ETS_PROFILE[year].be=be;ETS_PROFILE[year].bh=bh;}
  cfg.cooling=v12Val("ecCool");cfg.coolingK=cfg.cooling==="空冷"?1.05:1;cfg.preRatio=Number(v12Val("ecPre"))||70;cfg.ccerCap=Number(v12Val("ecCap"))||5;
  v12Persist();closeModal();render();showToast("分配参数已保存");
}
function v12QuotaAlloc(year) {
  const cycle=etsCycle(year),final=cycle.alloc.final,pre=cycle.alloc.pre,p=ETS_PROFILE[year],months=ets().monthly[year];
  const units=ETS_UNITS.map(u=>{const s=etsSums(scaleMonths(months,year,u.id));return {u,s,power:s.supply*p.be,heat:s.heat*p.bh};});
  const est=etsAllocFormula(year,months);
  const rows=units.map(x=>[x.u.name,fmt(x.s.supply,0),p.be,"1.000",fmt(x.power,0),fmt(x.s.heat,0),p.bh,fmt(x.heat,0),'<b>'+fmt(x.power+x.heat,0)+'</b>']);
  rows.push({cls:"totalRow",cells:["全厂",fmt(units.reduce((s,x)=>s+x.s.supply,0),0),"","",fmt(est.power,0),fmt(units.reduce((s,x)=>s+x.s.heat,0),0),"",fmt(est.heat,0),'<b>'+fmt(est.qty,0)+'</b>']});
  const tl=[["预分配",pre?fmt(pre.qty,0)+" t · "+pre.at:"未下发",!!pre],["核定结果下发",final?fmt(final.qty,0)+" t · "+final.at:"核查完成后下发",!!final],["企业确认",final?.status==="已确认"?final.confirmedAt:final?.status||"—",final?.status==="已确认"],["补发到账",final?.status==="已确认"?fmt(final.qty-(pre?.qty||0),0)+" t":"—",final?.status==="已确认"]];
  return v12Panel(year+" 年度分机组配额计算",v12Table(["机组","供电量 (MWh)","供电基准值","修正系数","供电配额 (t)","供热量 (GJ)","供热基准值","供热配额 (t)","合计 (t)"],rows,{nopage:true})+
      (final&&Math.abs(final.qty-est.qty)>1?'<p class="v12Hint">主管部门核定 '+fmt(final.qty,0)+' t，按核查产出量计算 '+fmt(est.qty,0)+' t。</p>':''),
      final?.status==="待确认"&&etsEditable()?'<button class="btn" onclick="openAllocObjection('+year+')">提出异议</button><button class="btn primary" onclick="confirmAlloc('+year+')">确认核定结果</button>':final?.status==="异议处理中"&&etsEditable()?'<button class="btn" onclick="withdrawObjection('+year+')">撤回异议</button>':'')+
    v12Panel("核定进度",'<ul class="v12Timeline">'+tl.map(([a,b,ok])=>'<li class="'+(ok?'pass':'')+'"><i></i><b>'+a+'</b><span>'+v12H(b)+'</span></li>').join("")+'</ul>'+
      (final?.status==="待确认"?'<p class="v12Hint badText">请在 '+final.confirmBy+' 前确认或提出异议（剩余 '+Math.max(0,daysUntil(final.confirmBy))+' 天），逾期视为确认。</p>':''));
}
function v12QuotaSurrender(year) {
  const c=etsCalc(year),cycle=c.cycle;
  if(c.settled)return v12Panel(year+" 年度清缴结果",'<dl class="v12KV">'+[["核查排放",fmt(c.verified,0)+" tCO₂"],["注销 CEA",fmt(cycle.surrender.cea,0)+" t"],["CCER 抵销",fmt(cycle.surrender.ccer,0)+" tCO₂e"],["清缴日期",cycle.surrender.at],["清缴凭证",cycle.surrender.cert]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>',
    '<button class="btn" onclick="showEtsCert('+year+')">查看清缴确认单</button>')+etsSurrenderLedger(year);
  const {plan,short}=etsSurrenderPlan(year);
  const room=Math.max(0,c.cap-c.ccer),free=etsCcerFree();
  const gapAll=Math.max(0,-c.gap);
  const buy=Math.max(0,gapAll-Math.min(room,free));
  const checks=[["核查完成",c.verifiedDone,c.verifiedDone?cycle.report.verifyNo:"未核查"],["核定配额已确认",cycle.alloc.final?.status==="已确认",cycle.alloc.final?cycle.alloc.final.status:"未下发"],["CCER 抵销 ≤ 5%",c.ccer<=c.cap,fmt(c.ccer,0)+" / "+fmt(c.cap,0)],["CEA 余额足额",short<=0,short>0?(c.pending?"缺 "+fmt(gapAll,0)+" t（已计待补发 "+fmt(c.pending,0)+" t）":"缺 "+fmt(short,0)+" t"):"足额"]];
  const ready=checks.every(x=>x[1]);
  const steps='<ol class="v12Ol">'+
    (cycle.alloc.final?.status==="待确认"?'<li>确认 '+year+' 年度核定配额，补发 '+fmt(cycle.alloc.final.qty-(cycle.alloc.pre?.qty||0),0)+' t 到账。<button class="linkBtn" onclick="v12QuotaTab(\'alloc\')">去确认 ›</button></li>':'')+
    (room>0&&free>0?'<li>使用可用 CCER 抵销，最多 '+fmt(Math.min(room,free),0)+' tCO₂e。<button class="linkBtn" onclick="openCcerApply('+year+')">申请抵销 ›</button></li>':'')+
    (buy>0?'<li>在上海环境能源交易所购入 CEA '+fmt(Math.ceil(buy/100)*100,0)+' t（约 '+fmt(buy*etsPrice()/10000,1)+' 万元），成交后登记。<button class="linkBtn" onclick="v12BuyCea('+Math.ceil(buy/100)*100+')">登记购入 ›</button></li>':'')+
    '<li>条件满足后提交清缴，系统按配额年度先进先出注销。</li></ol>';
  return '<div class="v12Grid2">'+v12Panel("清缴条件",'<ul class="v12Checks">'+checks.map(([a,ok,b])=>'<li class="'+(ok?'pass':'fail')+'"><i>'+(ok?'✓':'!')+'</i><span>'+a+'</span><small>'+v12H(b)+'</small></li>').join("")+'</ul>',
      etsEditable()?'<button class="btn primary" '+(ready?'':'disabled')+' onclick="openEtsSurrender('+year+')">提交清缴</button>':'')+
    v12Panel("补足方案",'<div class="v12Counts">'+[["应清缴",fmt(c.verified,0),""],["可注销 CEA（含待补发）",fmt(c.available+c.pending,0),"ok"],["已申请 CCER",fmt(c.ccer,0),""],["缺口",gapAll>0?fmt(gapAll,0):"0",gapAll>0?"bad":"ok"]].map(([l,v,t])=>'<div class="'+t+'"><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>'+steps)+'</div>'+
    v12Panel("注销计划",v12Table(["品种","年度 / 项目","数量"],[...plan.map(r=>["CEA",r.vintage+" 年度配额",fmt(r.take,0)+" t"]),...ets().ccer.filter(r=>r.usedFor===year&&r.status==="已锁定").map(r=>["CCER",r.vintage+" · "+v12H(r.project),fmt(r.qty,0)+" tCO₂e"])],{nopage:true,empty:"暂无可注销配额"}))+
    v12Panel("可用 CCER",v12Table(["登记编号","项目","类型","年份","数量","取得日期","状态"],ets().ccer.filter(r=>r.status!=="已注销").map(r=>[r.id,v12H(r.project),v12H(r.type),r.vintage,fmt(r.qty,0),r.acquiredAt,v12Tag(r.status,r.status==="可用"?"ok":"warn")]),{nopage:true,empty:"无"}));
}
function v12QuotaLedger(){
  return v12Panel("配额账户流水",v12Table(["流水号","日期","业务类型","配额年度","变动 (t)","余额 (t)","关联单据"],etsLedgerRows().map(r=>[r.id,r.date,r.type,r.vintage,'<span class="'+(r.qty>=0?'okText':'badText')+'">'+(r.qty>=0?'+':'')+fmt(r.qty,0)+'</span>',fmt(r.balance,0),v12H(r.ref)])),exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]));
}
function v12BuyCea(qty) {
  const year=v12EY();
  v12Modal("登记 CEA 购入",'<p class="muted">在交易所完成成交后登记，配额到账后计入履约来源。</p><div class="modalForm">'+v12Field("成交日期",'<input id="bcDate" type="date" value="'+todayText()+'">')+v12Field("成交编号",'<input id="bcNo" placeholder="交易所成交单号">')+
    v12Field("配额年度",'<select id="bcVin">'+[year,year-1].map(v=>'<option>'+v+'</option>').join("")+'</select>')+v12Field("数量 (t)",'<input id="bcQty" type="number" step="100" value="'+(qty||1000)+'">')+
    v12Field("成交价 (元/t)",'<input id="bcPrice" type="number" step="0.01" value="'+etsPrice().toFixed(2)+'">')+v12Field("交易方式",'<select id="bcCh"><option>挂牌协议</option><option>大宗协议</option></select>')+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveBuyCea('+year+')">登记</button>');
}
function v12SaveBuyCea(year) {
  const qty=Number(v12Val("bcQty")),price=Number(v12Val("bcPrice")),no=v12Val("bcNo")||("CJ"+Date.now().toString().slice(-8));
  if(!(qty>0)||!(price>0)){showToast("请填写数量和成交价");return;}
  const data=ets(),date=v12Val("bcDate")||todayText(),vin=Number(v12Val("bcVin"));
  data.orders.unshift({id:no,at:date+" 10:00",side:"买入",product:"CEA",vintage:vin,qty,price,filledPrice:price,status:"已成交",filledAt:date,channel:v12Val("bcCh"),year,counterparty:"上海环境能源交易所"});
  data.ledger.push({id:"LG"+String(++data.seq).padStart(5,"0"),date,type:"买入",vintage:vin,qty,ref:no,year});
  etsLog("登记购入 CEA "+fmt(qty,0)+" t @ "+price.toFixed(2));
  persistDemo();closeModal();render();showToast("已登记，配额已计入账户");
}

Object.assign(V12_PAGES_EXTRA, {
  "碳履约|履约工作台":()=>v12EtsBench(),
  "碳履约|排放监测":()=>v12EtsMonitor(),
  "碳履约|配额管理":()=>v12EtsQuota()
});

(function(){
  const css=`.v12EtsYears{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.v12EtsYears button{display:flex;gap:8px;align-items:center;border:1px solid #d6dce2;background:#fff;border-radius:6px;padding:8px 12px;cursor:pointer}
.v12EtsYears button.active{border-color:#86BC25;background:#F3F8EA}.v12EtsYears select{height:36px;border:1px solid #d6dce2;border-radius:6px;padding:0 8px;background:#fff}
.v12EtsFlow{display:grid;grid-template-columns:1fr 24px 1fr 24px 1fr 24px 1fr;align-items:stretch;gap:6px}
.v12EtsFlow .arr{display:grid;place-items:center;color:#86BC25;font-size:20px;font-weight:700}
.v12EtsStage{border:1px solid var(--line);border-top:4px solid #D0D5DD;border-radius:8px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:6px}
.v12EtsStage.done{border-top-color:#26890D}.v12EtsStage.now{border-top-color:#B7791F;background:#FFFCF5}
.v12EtsStage .h{display:flex;align-items:center;gap:8px}.v12EtsStage .h i{width:22px;height:22px;border-radius:50%;background:#344054;color:#fff;font-style:normal;font-size:12px;display:grid;place-items:center}
.v12EtsStage.done .h i{background:#26890D}.v12EtsStage .h b{flex:1}
.v12EtsStage dl{margin:0;font-size:12.5px}.v12EtsStage dl div{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #EEF2F6}.v12EtsStage dt{color:var(--sub)}.v12EtsStage dd{margin:0;text-align:right}
.v12EtsStage .linkBtn{align-self:flex-start;margin-top:auto}
.v12Units{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:12px}
.v12Unit{border:1px solid var(--line);border-radius:8px;padding:12px}.v12Unit .h{display:flex;justify-content:space-between}.v12Unit .h small{color:var(--sub)}.v12Unit p{font-size:12px;color:var(--sub);margin:4px 0 8px}
.v12Unit dl{margin:0;font-size:12.5px}.v12Unit dl div{display:flex;justify-content:space-between;padding:3px 0}.v12Unit dt{color:var(--sub)}.v12Unit dd{margin:0}
.v12UnitNote{background:#F6F8F3;border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.7}.v12UnitNote p{margin:4px 0}
.v12Formula{font-family:Menlo,Consolas,monospace;font-size:12.5px;background:#fff;border:1px dashed #C9D5B5;border-radius:6px;padding:8px 10px;line-height:1.8}.v12Formula small{display:block;font-family:inherit;color:var(--sub);font-size:11px}
.v12Timeline{list-style:none;margin:0;padding:0 0 0 6px}.v12Timeline li{position:relative;padding:0 0 16px 22px;border-left:2px solid #E5E7EB;font-size:13px}
.v12Timeline li:last-child{border-left-color:transparent}.v12Timeline li i{position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:#D0D5DD}
.v12Timeline li.pass i{background:#26890D}.v12Timeline li b{display:block}.v12Timeline li span{color:var(--sub);font-size:12px}
tr.v12Cur td{background:#F3F8EA}
@media(max-width:1000px){.v12EtsFlow{grid-template-columns:1fr}.v12EtsFlow .arr{transform:rotate(90deg)}.v12Units{grid-template-columns:1fr}}`;
  const el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
})();
