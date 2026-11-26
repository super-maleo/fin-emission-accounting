// v12：首页与组织碳排放（看板、碳目标、填报与审核、核算边界、碳台账、数据校验、碳盘查报告）。

// ================= 碳目标 =================
const V12_METHODS = {
  sbti15:{label:"SBTi 1.5°C 绝对收缩法（ACA）",type:"absolute",rate:4.2,note:"年均线性降幅不低于 4.2%"},
  sbtiwb2:{label:"SBTi 远低于 2°C 绝对收缩法（ACA）",type:"absolute",rate:2.5,note:"年均线性降幅不低于 2.5%"},
  sda:{label:"SBTi 行业脱碳法（SDA）· 强度",type:"intensity",rate:null,note:"按行业路径收敛物理强度"},
  custom:{label:"自定义",type:null,rate:null,note:"按企业战略设定"}
};
const V12_NET_ZERO = {year:2050,cut:90};
function v12Targets() {
  const s=v12();
  if(!s.targets) {
    s.targets={baseYear:2023,setAt:"2024-04-18",threshold:5,history:[{at:"2024-04-18",year:2023,by:"高文博",note:"首次设定：2023 年为首个完成第三方合理保证核查的完整年度"}],
      items:[
        {id:"T1",name:"范围一+二 绝对排放下降",scope:"12",type:"absolute",method:"sbti15",targetYear:2030,reduction:29.4,netZero:true,status:"已发布"},
        {id:"T2",name:"范围一+二 排放强度下降",scope:"12",type:"intensity",method:"custom",targetYear:2030,reduction:25,netZero:false,status:"已发布"},
        {id:"T3",name:"范围三 绝对排放下降",scope:"3",type:"absolute",method:"sbtiwb2",targetYear:2030,reduction:17.5,netZero:true,status:"已发布"}
      ]};
  }
  return s.targets;
}
function v12TActual(t,year) {
  const tot=yearTotals(year);
  const v=t.scope==="12"?tot["1"]+tot["2"]:t.scope==="3"?tot["3"]:tot["1"]+tot["2"]+tot["3"];
  return t.type==="intensity"?v/YEAR_REVENUE[year]:v;
}
function v12TBase(t){return v12TActual(t,v12Targets().baseYear);}
function v12TPath(t,year) {
  const base=v12TBase(t),by=v12Targets().baseYear;
  if(year<=by)return base;
  if(year<=t.targetYear)return base*(1-t.reduction/100*(year-by)/(t.targetYear-by));
  if(!t.netZero)return base*(1-t.reduction/100);
  const at=base*(1-t.reduction/100),end=base*(1-V12_NET_ZERO.cut/100);
  return at+(end-at)*Math.min(1,(year-t.targetYear)/(V12_NET_ZERO.year-t.targetYear));
}
function v12TDigits(t){return t.type==="intensity"?2:0;}
function v12TUnit(t){return t.type==="intensity"?"tCO₂e/百万元":"tCO₂e";}
function v12TStatus(t,year=Math.min(reportYear,CURRENT_YEAR)) {
  const actual=v12TActual(t,year),path=v12TPath(t,year),base=v12TBase(t);
  const reduced=(1-actual/base)*100,need=t.reduction*Math.min(1,(year-v12Targets().baseYear)/(t.targetYear-v12Targets().baseYear));
  return {actual,path,base,reduced,need,gap:path?(actual-path)/path*100:0,ok:actual<=path*1.0001,progress:Math.max(0,Math.min(100,reduced/t.reduction*100))};
}
function v12ScopeLabel(s){return {"12":"范围一+二","3":"范围三","123":"范围一+二+三"}[s];}

// ================= 首页 =================
function v12HomeTasks() {
  const role=v12Role;
  const items=[];
  if(role==="filler") {
    myTasks().forEach(t=>{const e=taskEntry(t);if(["待填报","草稿","退回"].includes(e.status))items.push({tag:e.status==="退回"?"已退回":e.status,tone:e.status==="退回"?"bad":"warn",title:t.name,meta:t.org+" · 范围"+t.scope+(t.category?" · "+v12CatLabel(t.category):"")+" · 截止 "+t.deadline,note:e.reviewNote,button:e.status==="退回"?"修改":"填报",action:"openUnifiedTask('"+t.id+"')"});});
  } else if(role==="supplier") {
    v12SupplierMyTasks().filter(t=>["待填报","草稿","退回"].includes(t.status)).forEach(t=>items.push({tag:t.status==="退回"?"已退回":t.status,tone:t.status==="退回"?"bad":"warn",title:t.name,meta:t.customer+" · 截止 "+t.deadline,button:"填报",action:t.open}));
  } else if(role==="supplyAdmin") {
    v12SupTasksAll().filter(t=>t.status==="待审核").forEach(t=>items.push({tag:"待审核",tone:"warn",title:t.name,meta:t.supplier+" · "+t.node,button:"审核",action:t.open}));
    v12Suppliers().filter(s=>s.risk==="高").slice(0,3).forEach(s=>items.push({tag:"高风险",tone:"bad",title:s.name+" · 尽调待跟进",meta:s.cat+" · ESG "+s.esg,button:"查看",primary:false,action:"v12OpenSupplier('"+s.code+"')"}));
  } else if(role==="lcaExpert") {
    demo.lcaModels.forEach(m=>items.push({tag:m.status||"草稿",tone:m.status==="已发布"?"ok":"warn",title:m.name,meta:(xkPcrOf(m)?.code||"未选择 PCR")+" · "+m.boundary,button:"建模",action:"selectLcaModel('"+m.id+"');go('产品碳排放','LCA建模与核算')"}));
    PRODUCT_CATALOG.filter(p=>p[5]==="待建模").slice(0,3).forEach(p=>items.push({tag:"待建模",tone:"gray",title:p[1],meta:p[2]+" · 年产量 "+fmt(p[4],0)+" t",button:"新建",primary:false,action:"go('产品碳排放','LCA建模与核算');setTimeout(()=>v12NewModel('"+v12Q(p[0])+"'),50)"}));
  } else if(role==="etsExpert") {
    etsTodos().filter(t=>t.tag!=="监测").forEach(t=>items.push({tag:t.tag||"履约",tone:t.tone||"warn",title:t.title,meta:t.meta||"",button:"处理",action:"go('碳履约','配额管理')"}));
    const months=ets().monthly[CURRENT_YEAR].filter(m=>m.status==="待存证");
    months.forEach(m=>items.push({tag:"待存证",tone:"warn",title:CURRENT_YEAR+" 年 "+m.month+" 月监测数据",meta:"滨海石化热电厂 · 燃煤量 / 低位发热量 / 元素碳",button:"存证",action:"go('碳履约','排放监测')"}));
  } else if(role==="sysAdmin") {
    items.push({tag:"账号",tone:"warn",title:"新增账号申请 3 条",meta:"陇原石化 2 人 · 华北销售 1 人",button:"处理",action:"go('基础配置','系统设置','用户角色')"});
    items.push({tag:"模板",tone:"gray",title:"2027 年度填报模板待下发",meta:"6 套组织模板 · 截止 2026-12-20",button:"查看",primary:false,action:"go('基础配置','指标模板配置','填报模板')"});
    items.push({tag:"因子",tone:"gray",title:"公共因子库 2026.10 版已同步",meta:"新增 12 条 · 更新 7 条",button:"查看",primary:false,action:"go('基础配置','因子库管理','公共因子库')"});
  } else {
    workflowTasks().filter(t=>taskEntry(t).status==="待审核").forEach(t=>{const e=taskEntry(t);items.push({tag:(e.reviewStage===2?"集团复核":"单位审核"),tone:"warn",title:t.name,meta:t.org+" · "+t.owner+" · 范围"+t.scope,button:"审核",action:"openUnifiedTask('"+t.id+"',true)"});});
    workflowTasks().filter(t=>taskEntry(t).status==="退回").forEach(t=>items.push({tag:"已退回",tone:"bad",title:t.name,meta:t.org+" · "+t.owner,button:"跟进",primary:false,action:"openUnifiedTask('"+t.id+"')"}));
    v12SupTasksAll().filter(t=>t.status==="待审核").forEach(t=>items.push({tag:"供应商",tone:"warn",title:t.name,meta:t.supplier+" · "+t.node,button:"审核",action:t.open}));
    etsTodos().filter(t=>t.tag!=="监测").slice(0,2).forEach(t=>items.push({tag:t.tag||"履约",tone:t.tone||"warn",title:t.title,meta:t.meta||"",button:"处理",action:"go('碳履约','配额管理')"}));
    demo.lcaModels.filter(m=>m.status!=="已发布").slice(0,2).forEach(m=>items.push({tag:"LCA",tone:"gray",title:m.name,meta:(m.status||"草稿")+" · "+m.boundary,button:"建模",primary:false,action:"selectLcaModel('"+m.id+"');go('产品碳排放','LCA建模与核算')"}));
  }
  return items;
}
function v12TaskWidget() {
  const items=v12HomeTasks();
  const all=v12Is("filler")?myTasks():v12Is("supplier")?v12SupplierMyTasks():null;
  let counts='';
  if(all) {
    const st=t=>t.status||taskEntry(t).status;
    const c=s=>all.filter(t=>st(t)===s).length;
    counts='<div class="v12Counts">'+[["待填报",c("待填报")+c("草稿"),"warn"],["已退回",c("退回"),"bad"],["审核中",c("待审核"),""],["已通过",c("通过"),"ok"]].map(([l,v,t])=>'<div class="'+t+'"><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>';
  }
  let show=items,max=6;
  if(v12Is("carbonAdmin")) {
    const grp=t=>/审核|复核|退回/.test(t.tag)&&t.tag!=="供应商"?"org":t.tag==="供应商"?"sup":t.tag==="LCA"?"lca":"ets";
    const g={org:[],sup:[],ets:[],lca:[]};items.forEach(t=>g[grp(t)].push(t));
    counts='<div class="v12Counts">'+[["组织碳审核",g.org.length,"warn","go('组织碳排放','填报与审核','审核任务')"],["供应商审核",g.sup.length,"","go('供应链碳排放','数据收集与审核','审核任务')"],["碳履约",g.ets.length,"bad","go('碳履约','履约工作台')"],["LCA 建模",g.lca.length,"","go('产品碳排放','LCA建模与核算')"]].map(([l,v,t,a])=>'<div class="'+t+'" style="cursor:pointer" onclick="'+a+'"><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>';
    show=[];for(let i=0;show.length<items.length&&i<20;i++)["org","sup","ets","lca"].forEach(k=>{if(g[k][i])show.push(g[k][i]);});
    max=5;
  }
  const link=v12Is("filler")?"go('组织碳排放','填报与审核','填报任务')":v12Is("supplier")?"go('供应链碳排放','数据收集与审核')":v12Is("supplyAdmin")?"go('供应链碳排放','数据收集与审核','审核任务')":
    v12Is("lcaExpert")?"go('产品碳排放','LCA建模与核算')":v12Is("etsExpert")?"go('碳履约','履约工作台')":v12Is("sysAdmin")?"go('基础配置','系统设置')":"go('组织碳排放','填报与审核','审核任务')";
  let recent="";
  if(v12Is("filler")&&items.length<4){const r=myTasks().filter(t=>["待审核","通过"].includes(taskEntry(t).status)).sort((a,b)=>(taskEntry(a).status==="待审核"?0:1)-(taskEntry(b).status==="待审核"?0:1)).slice(0,4-items.length);
    if(r.length)recent='<h4 class="v12H4">最近提交</h4>'+todoList(r.map(t=>{const st=taskEntry(t).status;return {tag:st==="待审核"?"审核中":"已通过",tone:st==="待审核"?"gray":"ok",title:t.name,meta:t.org+" · 范围"+t.scope,button:"查看",primary:false,action:"openUnifiedTask('"+t.id+"')"};}),"");}
  return v12Panel("我的任务 <em>"+items.length+"</em>",counts+(items.length?todoList(show.slice(0,max),""):'<div class="todoEmpty">暂无待办</div>')+recent+(items.length>max?'<button class="linkBtn v12More" onclick="'+link+'">还有 '+(items.length-max)+' 项 ›</button>':''),'<button class="linkBtn" onclick="'+link+'">全部 ›</button>','v12Fill');
}
function v12GoalWidget() {
  const cfg=v12Targets();
  const year=Math.min(reportYear,CURRENT_YEAR);
  return v12Panel("碳目标实现情况",'<div class="v12Goals">'+cfg.items.map(t=>{
    const s=v12TStatus(t,year);
    return '<button class="v12Goal" onclick="v12State.targetSel=\''+t.id+'\';go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')"><div class="h"><b>'+v12H(t.name)+'</b>'+v12Tag(s.ok?"符合路径":"落后路径",s.ok?"ok":"bad")+'</div>'+
      '<div class="bar"><i style="width:'+s.progress+'%"></i><em style="left:'+Math.min(100,s.need/t.reduction*100)+'%" title="'+year+' 年应达进度"></em></div>'+
      '<div class="f"><span>'+cfg.baseYear+' → '+t.targetYear+' 下降 '+t.reduction+'%</span><span>已下降 <b class="'+(s.reduced>=0?'':'badText')+'">'+s.reduced.toFixed(1)+'%</b> · 应下降 '+s.need.toFixed(1)+'%</span></div></button>';
  }).join("")+'</div>'+(v12Is("carbonAdmin")?v12GoalFoot(year):''),v12Is("carbonAdmin","etsExpert")||v12Is("filler")?'<button class="linkBtn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标跟踪\')">目标跟踪 ›</button>':'');
}
function v12GoalFoot(year) {
  const t=yearTotals(year),cfg=v12Targets(),t12=cfg.items.find(x=>x.scope==="12"&&x.type==="absolute");
  const act=t["1"]+t["2"],path=t12?v12TPath(t12,year):0;
  return '<div class="v12GoalFoot">'+[[year+" 年范围一+二",v12Wan(act,0)+" 万t"],["年度目标",path?v12Wan(path,0)+" 万t":"—"],[act<=path?"低于目标":"超出目标",v12Wan(Math.abs(path-act),0)+" 万t",act<=path?"okText":"badText"],["2030 目标",t12?v12Wan(v12TPath(t12,t12.targetYear),0)+" 万t":"—"]].map(([l,v,c])=>'<div><span>'+l+'</span><b class="'+(c||"")+'">'+v+'</b></div>').join("")+'</div>';
}
function v12EtsWidget() {
  const year=2025,c=etsCalc(year),st=etsStatus(year),cycle=c.cycle,days=daysUntil(cycle.deadline);
  const can=v12R().tops.includes("碳履约");
  return v12Panel("碳履约情况 · "+year+" 年度",'<div class="v12EtsMini"><div class="days"><b>'+days+'</b><span>天<br>清缴截止 '+cycle.deadline+'</span></div>'+
    '<dl><div><dt>纳入设施</dt><dd>滨海石化热电厂 · 2 台发电机组</dd></div><div><dt>核查排放（应清缴）</dt><dd>'+fmt(c.verified,0)+' t</dd></div>'+
    '<div><dt>可用配额 + CCER</dt><dd>'+fmt(c.available+c.pending+etsCcerFree(),0)+' t</dd></div><div><dt>缺口</dt><dd class="'+(c.gap<0?'badText':'okText')+'">'+(c.gap<0?fmt(-c.gap,0)+' t':'无')+'</dd></div></dl>'+
    '<div class="st">'+v12Tag(st.label,st.tone)+'<small>纳管设施 '+v12Facilities().filter(f=>f.status==="纳管").length+' 个 · 待纳入 '+v12Facilities().filter(f=>f.status!=="纳管").length+' 个</small></div></div>'+
    '<h4 class="v12H4">近年履约</h4>'+v12Table(["年度","核查排放 (t)","核定配额 (t)","状态"],[2023,2024,2025,2026].map(y=>{const k=etsCalc(y),s2=etsStatus(y);return [y+" 年",fmt(k.verified,0),fmt(k.alloc,0),v12Tag(s2.label,s2.tone)];}),{nopage:true}),can?'<button class="linkBtn" onclick="go(\'碳履约\',\'履约工作台\')">履约工作台 ›</button>':'');
}
home = function () {
  const r=v12R();
  const hour=new Date().getHours();
  const hello=hour<11?"早上好":hour<13?"中午好":hour<18?"下午好":"晚上好";
  const sub=v12Is("supplier")?"北辰石油天然气集团有限公司 · 供应商碳数据协同":(r.dept||[...new Set(workflowTasks().filter(t=>t.owner===fillerIdentity).map(t=>t.org))].slice(0,2).join("、")+" · 碳排放填报")+" · "+reportYear+" 年度";
  const goals=v12Is("supplier","sysAdmin","supplyAdmin","lcaExpert")?"":v12GoalWidget();
  const etsW=v12Is("supplier","sysAdmin","supplyAdmin","lcaExpert","filler")?"":v12EtsWidget();
  const market=marketPanel();
  let extra="";
  if(v12Is("supplier"))extra=v12SupplierHomeCard();
  if(v12Is("supplyAdmin"))extra=v12SupplyHomeCard();
  if(v12Is("lcaExpert"))extra=v12LcaHomeCard();
  if(v12Is("sysAdmin"))extra=v12SysHomeCard();
  if(v12Is("filler"))extra=v12FillerHomeCard();
  const hello1='<div class="v12Hello"><h1>'+v12H(v12Person())+'，'+hello+'</h1><p>'+v12H(sub)+'</p></div>';
  const rows=[];
  if(v12Is("filler")){rows.push([v12TaskWidget(),extra]);rows.push([goals,market]);}
  else if(goals){rows.push([goals,v12TaskWidget()]);if(etsW){rows.push([etsW,market]);if(extra)rows.push([extra]);}else rows.push([extra||"",market].filter(Boolean));}
  else{rows.push([extra,v12TaskWidget()].filter(Boolean));rows.push([market]);}
  return hello1+rows.map(r=>'<div class="v12HomeGrid'+(r.length===1?' one':'')+'">'+r.join("")+'</div>').join("");
};
function v12FillerHomeCard() {
  const mine=myTasks(),orgs=[...new Set(mine.map(t=>t.org))];
  const done=t=>["通过","待审核"].includes(taskEntry(t).status);
  const dl=mine.map(t=>t.deadline).sort()[0]||"2026-12-15",left=daysUntil(dl);
  const byScope=["1","2","3"].map(s=>{const l=mine.filter(t=>t.scope===s);return [s,l.length,l.filter(done).length];}).filter(x=>x[1]);
  return v12Panel("填报进度",'<div class="v12FillTop"><div class="d"><b class="'+(left<15?'warnText':'')+'">'+left+'</b><span>天<br>截止 '+dl+'</span></div><div class="p"><b>'+mine.filter(done).length+' / '+mine.length+'</b><span>已提交指标</span>'+v12Progress(mine.filter(done).length,mine.length)+'</div></div>'+
    '<h4 class="v12H4">按组织</h4><div class="v12OrgProg">'+orgs.map(org=>{const list=mine.filter(t=>t.org===org);
    return '<div><span>'+v12H(org)+'<small>'+list.length+' 项指标</small></span>'+v12Progress(list.filter(done).length,list.length)+'</div>';}).join("")+'</div>'+
    '<h4 class="v12H4">按范围</h4><div class="v12OrgProg">'+byScope.map(([s,n,d])=>'<div><span>范围'+["一","二","三"][s-1]+'<small>'+n+' 项</small></span>'+v12Progress(d,n)+'</div>').join("")+'</div>');
}

// ================= 组织碳看板 =================
function v12SegOf(row) {
  if(String(row.scope)==="3")return null;
  const e=petroEntity(row.org);return e?PETRO_SEGMENTS.find(s=>s.id===e.seg):PETRO_SEGMENTS.find(s=>s.id==="HQ");
}
function v12SegTotals(rows) {
  return PETRO_SEGMENTS.map(seg=>({seg,value:rows.filter(r=>String(r.scope)!=="3"&&v12SegOf(r)?.id===seg.id).reduce((s,r)=>s+r.emission_tco2e,0)})).filter(x=>x.value>0);
}
function v12ShowRows(title,filterJs) {
  const rows=v12Detail().filter(new Function("r","return "+filterJs)).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
  const total=rows.reduce((s,r)=>s+r.emission_tco2e,0);
  v12Modal(v12H(title)+' <small class="muted">'+fmt(total,0)+' tCO₂e · '+rows.length+' 条</small>',v12Table(["组织","排放源","范围 / 类别","活动数据","排放量 (tCO₂e)","占比"],rows.map(r=>[v12H(v12OrgOf(r)),'<strong>'+v12H(scenarioText(r.source_name))+'</strong>',
    String(r.scope)==="3"?v12CatLabel(r.category_code):"范围"+r.scope,fmt(r.activity_value,0)+' '+v12H(r.activity_unit),fmt(r.emission_tco2e,0),(r.emission_tco2e/total*100).toFixed(1)+'%']),{cls:"v12Scroll"}),
    '<button class="btn" onclick="closeModal();go(\'组织碳排放\',\'碳核算\',\'碳台账\')">去碳台账</button><button class="btn primary" data-close-modal="1">关闭</button>');
}
function v12OrgDashboard() {
  const year=reportYear,rows=v12Detail(year),tot=v12ScopeSum(rows),all=tot["1"]+tot["2"]+tot["3"];
  const prev=REPORT_YEARS.includes(year-1)?v12ScopeSum(v12Detail(year-1)):null;
  const chg=(a,b)=>b?((a-b)/b*100):null;
  const chgTxt=(a,b)=>{const v=chg(a,b);return v===null?"":'较上年 <em class="v12Chg '+(v>0?'badText':'okText')+'">'+(v>0?'+':'')+v.toFixed(1)+'%</em>';};
  const kpis='<div class="statRow">'+
    v12Kpi("温室气体排放总量",v12Big(all),"tCO₂e · "+(prev?chgTxt(all,prev["1"]+prev["2"]+prev["3"]):""),"v12ShowRows('全部排放','true')")+
    v12Kpi("范围一 · 直接排放",v12Big(tot["1"]),"tCO₂e · 占 "+(tot["1"]/all*100).toFixed(1)+"% · "+(prev?chgTxt(tot["1"],prev["1"]):""),"v12ShowRows('范围一','r.scope==1')")+
    v12Kpi("范围二 · 能源间接",v12Big(tot["2"]),"tCO₂e · 占 "+(tot["2"]/all*100).toFixed(1)+"% · "+(prev?chgTxt(tot["2"],prev["2"]):""),"v12ShowRows('范围二','r.scope==2')")+
    v12Kpi("范围三 · 价值链",v12Big(tot["3"]),"tCO₂e · 占 "+(tot["3"]/all*100).toFixed(1)+"% · "+(prev?chgTxt(tot["3"],prev["3"]):""),"v12ShowRows('范围三','r.scope==3')")+'</div>';
  // 板块饼图
  const segs=v12SegTotals(rows);
  const segTotal=segs.reduce((s,x)=>s+x.value,0);
  const segPanel=v12Panel("板块排放构成 <small>范围一+二</small>",v12Pie(segs.map(x=>({label:x.seg.name,value:x.value,color:x.seg.color,display:v12Wan(x.value,0)+" 万t",
    action:"v12ShowRows('"+x.seg.name+"','r.scope!=3&&v12SegOf(r)?.id===\\'"+x.seg.id+"\\'')"})),{center:[v12Wan(segTotal,0)+" 万t","范围一+二"],size:220}));
  // 排放类型气泡
  const s12=v12State.dashS==="12";
  const kinds=v12SumBy(rows.filter(r=>s12?String(r.scope)!=="3":String(r.scope)==="3"),r=>v12Kind(r));
  const bubbleData=Object.entries(kinds).filter(([,v])=>v>0).map(([k,v])=>({label:k,short:k.replace(/^类别(\d+) /,"C$1 ").replace("（扣减）",""),value:v,display:v12Wan(v,0)+" 万t",
    action:"v12ShowRows('"+v12Q(k)+"','v12Kind(r)===\\'"+v12Q(k)+"\\'')"}));
  const bubblePanel=v12Panel("排放类型分布",v12Bubbles(bubbleData,{width:680,height:370})+'<ul class="v12Legend cols">'+bubbleData.sort((a,b)=>b.value-a.value).map((d,i)=>'<li class="click" onclick="'+d.action+'"><i style="background:'+v12Color(i)+'"></i><span>'+v12H(d.label)+'</span><b>'+d.display+'</b><em>'+(d.value/Object.values(kinds).filter(v=>v>0).reduce((a,b)=>a+b,0)*100).toFixed(1)+'%</em></li>').join("")+'</ul>',v12Seg([["12","范围一+二"],["3","范围三"]],v12State.dashS,"v12SetDashS"));
  // 趋势
  const tg=v12Targets();
  const t12=tg.items.find(t=>t.scope==="12"&&t.type==="absolute"),t3=tg.items.find(t=>t.scope==="3"&&t.type==="absolute");
  const years=[];for(let y=Math.min(tg.baseYear,2023);y<=2030;y++)years.push(y);
  const mode=v12State.trendMode;
  const actualOf=(y,scopes)=>{if(!REPORT_YEARS.includes(y)||y>CURRENT_YEAR)return 0;const t=yearTotals(y);return scopes.reduce((s,k)=>s+t[k],0);};
  const targetOf=y=>mode==="12"?(t12?v12TPath(t12,y):0):(t12&&t3?v12TPath(t12,y)+v12TPath(t3,y):0);
  const scopes=mode==="12"?["1","2"]:["1","2","3"];
  const trendBars=v12Columns(years.map(y=>{const v=actualOf(y,scopes);return {label:String(y),value:v||targetOf(y),hollow:!v,color:v?"#86BC25":"#B9DB86",target:targetOf(y),display:v?v12Wan(v,0):"目标"};}),{height:250,axisFmt:v=>v12Wan(v,0)+"万",valFmt:v=>v12Wan(v,0)});
  const stackRows=REPORT_YEARS.filter(y=>y<=CURRENT_YEAR).map(y=>{const t=yearTotals(y);return {label:String(y),stack:scopes.map((k,i)=>({label:"范围"+["一","二","三"][Number(k)-1],value:t[k],color:["#26890D","#86BC25","#2C6AA0"][i]})),target:targetOf(y)};});
  const stackSvg=v12Columns(stackRows,{height:250,axisFmt:v=>v12Wan(v,0)+"万",valFmt:v=>v12Wan(v,0),targetLine:false});
  const gapRows=scopes.map(k=>{const label="范围"+["一","二","三"][Number(k)-1];const a=yearTotals(Math.min(year,CURRENT_YEAR))[k];return [label,a];});
  const yr=Math.min(year,CURRENT_YEAR);
  const tActual=scopes.reduce((s,k)=>s+yearTotals(yr)[k],0),tTarget=targetOf(yr);
  const gapTable=v12Table(["",yr+" 实际 (万t)","占比","较基准年"],[...gapRows.map(([l,a],i)=>{const b=yearTotals(tg.baseYear)[scopes[i]];return [l,v12Wan(a),(a/tActual*100).toFixed(1)+"%",((a-b)/b*100>0?"+":"")+((a-b)/b*100).toFixed(1)+"%"];}),
    {cls:"totalRow",cells:["合计 / 目标",v12Wan(tActual)+" / "+v12Wan(tTarget),"",'<b class="'+(tActual<=tTarget?'okText':'badText')+'">'+(tActual<=tTarget?"低于目标 ":"超出目标 ")+v12Wan(Math.abs(tActual-tTarget))+" 万t</b>"]}],{nopage:true});
  const trendPanel=v12Panel("碳排放趋势",'<div class="v12Two"><div><h4 class="v12Sub">历年排放与年度目标</h4>'+trendBars+v12LegendRow([["实际排放","#86BC25"],["目标年度（未发生）","#B9DB86"],["年度目标","#D92D20","line"]])+'</div>'+
    '<div><h4 class="v12Sub">分范围排放与目标差异</h4>'+stackSvg+v12LegendRow(scopes.map((k,i)=>["范围"+["一","二","三"][Number(k)-1],["#26890D","#86BC25","#2C6AA0"][i]]).concat([["年度目标","#D92D20","line"]]))+'</div></div><div class="v12TrendTable">'+gapTable+'</div>',
    v12Seg([["12","范围一+二"],["123","范围一+二+三"]],mode,"v12SetTrend"));
  // 来源构成
  const srcRows=rows.filter(r=>!v12State.srcScope||String(r.scope)===v12State.srcScope);
  const bySrc=Object.entries(v12SumBy(srcRows,r=>scenarioText(r.source_name).replace(/（.*?）/g,""))).sort((a,b)=>b[1]-a[1]);
  const top=bySrc.slice(0,9),rest=bySrc.slice(9).reduce((s,x)=>s+x[1],0);
  const srcData=[...top.map(([k,v])=>({label:k,value:v,display:v12Wan(v,1)+" 万t",action:"v12ShowRows('"+v12Q(k)+"','scenarioText(r.source_name).replace(/（.*?）/g,\\'\\')===\\'"+v12Q(k)+"\\'')"})),...(rest>0?[{label:"其他 "+(bySrc.length-9)+" 项",value:rest,color:"#CBD5E1",display:v12Wan(rest,1)+" 万t"}]:[])];
  const srcTotal=srcRows.reduce((s,r)=>s+r.emission_tco2e,0);
  const srcBody=v12State.srcView==="list"?v12Table(["排名","排放来源","排放量 (tCO₂e)","占比"],bySrc.map(([k,v],i)=>[String(i+1),'<strong>'+v12H(k)+'</strong>',fmt(v,0),(v/srcTotal*100).toFixed(2)+"%"]),{cls:"v12Scroll"}):v12Pie(srcData,{center:[v12Wan(srcTotal,0)+" 万t","排放来源"],size:220});
  const srcPanel=v12Panel("碳排放来源构成",srcBody,'<select class="v12Mini" onchange="v12Set(\'srcScope\',this.value)"><option value="">全部范围</option>'+["1","2","3"].map(s=>'<option value="'+s+'" '+(v12State.srcScope===s?'selected':'')+'>范围'+["一","二","三"][s-1]+'</option>').join("")+'</select>'+v12Seg([["chart","图"],["list","表"]],v12State.srcView,"v12SetSrcView"));
  // 范围三 15 类
  const cat=v12SumBy(rows.filter(r=>String(r.scope)==="3"),"category_code");
  const s3total=tot["3"]||1;
  const s3=xkScope3Rows?xkScope3Rows():[];
  const s3Panel=v12Panel("范围三碳排放 <small>GHG Protocol 15 类</small>",'<div class="v12S3">'+Object.keys(V12_S3_NAMES).map((code,i)=>{
    const v=cat[code]||0,rel=s3.find(x=>x.code===code);
    const up=i<8;
    return '<button class="v12S3Row '+(v?'':'zero')+'" onclick="'+(v?"v12ShowRows('"+v12CatLabel(code)+"','r.category_code===\\'"+code+"\\'')":"")+'"><span class="n">'+(i+1)+'</span><span class="l">类别'+(i+1)+' '+V12_S3_NAMES[code]+'<small>'+(up?"上游":"下游")+'</small></span>'+
      '<span class="t"><i style="width:'+(v?Math.max(0.8,v/s3total*100):0)+'%"></i></span><span class="v">'+(v?v12Wan(v,1)+' 万t':'<em>'+(rel&&rel.relevance==="不相关"?"不相关":"未发生")+'</em>')+'</span><span class="p">'+(v?(v/s3total*100).toFixed(1)+'%':'')+'</span></button>';
  }).join("")+'</div>');
  // 组织碳排放
  const metric=v12State.orgMetric;
  const units=PETRO_ENTITIES.map(e=>{const list=rows.filter(r=>r.org===e.org&&String(r.scope)!=="3");const v=list.reduce((s,r)=>s+r.emission_tco2e,0);
    const rev=YEAR_REVENUE[Math.min(year,CURRENT_YEAR)]*(UNIT_REVENUE_SHARE[e.org]||0.01);
    return {e,v,intensity:rev?v/rev:0};}).filter(u=>u.v>0).sort((a,b)=>(metric==="emission"?b.v-a.v:b.intensity-a.intensity));
  const orgSvg=v12Columns(units.map(u=>({label:u.e.org.replace("分公司","").replace("有限公司","").replace("企业",""),value:metric==="emission"?u.v:u.intensity,line:metric==="emission"?u.intensity:undefined,
    color:PETRO_SEGMENTS.find(s=>s.id===u.e.seg).color,display:metric==="emission"?v12Wan(u.v,0):u.intensity.toFixed(1),action:"v12ShowRows('"+v12Q(u.e.org)+"','r.org===\\'"+v12Q(u.e.org)+"\\'&&r.scope!=3')"})),
    {height:300,width:1100,rotate:true,barW:34,axisFmt:metric==="emission"?v=>v12Wan(v,0)+"万":v=>v.toFixed(0),line:metric==="emission"?"强度":false});
  const orgPanel=v12Panel("组织碳排放 <small>范围一+二 · 各单位</small>",orgSvg+v12LegendRow([...PETRO_SEGMENTS.filter(s=>units.some(u=>u.e.seg===s.id)).map(s=>[s.name,s.color]),...(metric==="emission"?[["排放强度 tCO₂e/百万元","#2C6AA0","line"]]:[])]),
    v12Seg([["emission","排放量"],["intensity","排放强度"]],metric,"v12SetOrgMetric"));
  return v12Head("组织碳看板","",'组织碳排放 / 组织碳看板 · '+year+' 年度')+kpis+
    '<div class="v12Grid2">'+segPanel+srcPanel+'</div>'+
    '<div class="v12Grid2 a2">'+bubblePanel+s3Panel+'</div>'+trendPanel+orgPanel;
}
function v12SetDashS(v){v12Set("dashS",v);}
function v12SetTrend(v){v12Set("trendMode",v);}
function v12SetSrcView(v){v12Set("srcView",v);}
function v12SetOrgMetric(v){v12Set("orgMetric",v);}

// ================= 碳目标：目标设置 =================
function v12TargetSetup() {
  const cfg=v12Targets(),edit=v12Admin();
  const baseTot=yearTotals(cfg.baseYear);
  const sel=cfg.items.find(t=>t.id===v12State.targetSel)||cfg.items[0];
  const head=v12Head("目标设置",edit?'<button class="btn" onclick="v12OpenBaseYear()">基准年设置</button><button class="btn primary" onclick="v12OpenTarget()">新增目标</button>':'','组织碳排放 / 碳目标管理 / 目标设置');
  const base='<div class="v12BaseBar"><div><span>基准年</span><b>'+cfg.baseYear+'</b><small>设定于 '+cfg.setAt+'</small></div><div><span>范围一+二</span><b>'+v12Wan(baseTot["1"]+baseTot["2"])+'</b><small>万 tCO₂e</small></div>'+
    '<div><span>范围三</span><b>'+v12Wan(baseTot["3"])+'</b><small>万 tCO₂e</small></div><div><span>营业收入</span><b>'+fmt(YEAR_REVENUE[cfg.baseYear]/100,0)+'</b><small>亿元</small></div><div><span>重算阈值</span><b>±'+cfg.threshold+'%</b><small>结构变化 / 方法学变更</small></div></div>';
  const list=v12Panel("减排目标",v12Table(["目标","覆盖范围","类型","设定方法","基准值","目标年","下降幅度","目标值","长期","状态",""],cfg.items.map(t=>{
    const m=V12_METHODS[t.method]||V12_METHODS.custom;
    return {cls:t.id===sel?.id?"active":"",cells:['<button class="linkBtn strong" onclick="v12State.targetSel=\''+t.id+'\';render()">'+v12H(t.name)+'</button>',v12ScopeLabel(t.scope),t.type==="intensity"?"强度":"绝对量",'<span class="srcCell">'+m.label+'</span>',
      fmt(v12TBase(t),v12TDigits(t))+' <small>'+v12TUnit(t)+'</small>',t.targetYear,t.reduction+'%',fmt(v12TPath(t,t.targetYear),v12TDigits(t)),t.netZero?'2050 净零':'—',v12Tag(t.status||"已发布","ok"),
      edit?'<button class="btn" onclick="v12OpenTarget(\''+t.id+'\')">编辑</button>':'']};
  }),{nopage:true}));
  let detail="";
  if(sel){
    const endYear=sel.netZero?V12_NET_ZERO.year:sel.targetYear;
    const years=[];for(let y=cfg.baseYear;y<=endYear;y++)years.push(y);
    const step=(v12TBase(sel)*(sel.reduction/100))/(sel.targetYear-cfg.baseYear);
    const chart=v12Columns(years.map(y=>{const a=REPORT_YEARS.includes(y)&&y<=CURRENT_YEAR?v12TActual(sel,y):0;return {label:String(y).slice(2),value:a||v12TPath(sel,y),hollow:!a,color:a?(a<=v12TPath(sel,y)?"#26890D":"#D92D20"):(y<=sel.targetYear?"#86BC25":"#98A2B3"),target:v12TPath(sel,y),display:a?"":""};}),
      {height:230,width:1100,barW:18,labels:false,axisFmt:sel.type==="intensity"?v=>v.toFixed(1):v=>v12Wan(v,0)+"万"});
    detail=v12Panel(v12H(sel.name)+' · 年度分解',
      '<div class="v12Facts"><div><span>设定方法</span><b>'+(V12_METHODS[sel.method]||V12_METHODS.custom).label+'</b></div><div><span>近期目标</span><b>'+cfg.baseYear+'–'+sel.targetYear+' 线性下降 '+sel.reduction+'%，年均 '+(sel.reduction/(sel.targetYear-cfg.baseYear)).toFixed(2)+'%</b></div>'+
      '<div><span>长期目标</span><b>'+(sel.netZero?'2050 年较基准下降 '+V12_NET_ZERO.cut+'%，剩余排放以碳移除中和':'不设')+'</b></div><div><span>年均减排量</span><b>'+fmt(step,v12TDigits(sel))+' '+v12TUnit(sel)+'</b></div></div>'+
      chart+v12LegendRow([["已发生（达标）","#26890D"],["已发生（未达标）","#D92D20"],["近期目标年度","#86BC25"],["长期路径","#98A2B3"],["年度目标值","#D92D20","line"]])+
      '<div class="tableWrap v12PathT"><table data-nopage><thead><tr><th>年度</th>'+years.map(y=>'<th class="'+(y===sel.targetYear?'mark':'')+'">'+y+'</th>').join("")+'</tr></thead><tbody>'+
      '<tr><td>年度目标值</td>'+years.map(y=>'<td>'+fmt(v12TPath(sel,y),v12TDigits(sel))+'</td>').join("")+'</tr>'+
      '<tr><td>较基准下降</td>'+years.map(y=>'<td>'+(y===cfg.baseYear?'基准':((1-v12TPath(sel,y)/v12TBase(sel))*100).toFixed(1)+'%')+'</td>').join("")+'</tr>'+
      '<tr><td>当年减排量</td>'+years.map(y=>'<td>'+(y===cfg.baseYear?'—':fmt(v12TPath(sel,y-1)-v12TPath(sel,y),v12TDigits(sel)))+'</td>').join("")+'</tr>'+
      '<tr><td>实际</td>'+years.map(y=>REPORT_YEARS.includes(y)&&y<=CURRENT_YEAR?'<td class="'+(v12TActual(sel,y)<=v12TPath(sel,y)?'okText':'badText')+'">'+fmt(v12TActual(sel,y),v12TDigits(sel))+'</td>':'<td class="muted">—</td>').join("")+'</tr></tbody></table></div>');
  }
  return head+base+list+detail;
}
function v12OpenBaseYear() {
  const cfg=v12Targets();
  const rows=[2023,2024,2025].map(y=>{const t=yearTotals(y);return [y,v12Wan(t["1"]+t["2"]),v12Wan(t["3"]),fmt(YEAR_REVENUE[y]/100,0),verificationOf(y)?"已核查 · "+verificationOf(y).org:"未核查"];});
  v12Modal("基准年设置",'<div class="modalForm"><label>基准年<select id="v12BaseYear">'+[2023,2024,2025].map(y=>'<option '+(y===cfg.baseYear?'selected':'')+'>'+y+'</option>').join("")+'</select></label>'+
    '<label>重算阈值（%）<input id="v12Thr" type="number" min="1" max="20" value="'+cfg.threshold+'"></label><label class="wide">设定依据<input id="v12BaseNote" placeholder="如：首个完成第三方合理保证核查的完整年度"></label></div>'+
    v12Table(["年度","范围一+二 (万t)","范围三 (万t)","营收 (亿元)","核查"],rows,{nopage:true})+
    '<h4 class="v12Sub">重算记录</h4>'+v12Table(["日期","基准年","说明","操作人"],cfg.history.map(h=>[h.at,h.year,v12H(h.note),h.by]),{nopage:true}),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveBaseYear()">保存</button>');
}
function v12SaveBaseYear() {
  const cfg=v12Targets(),y=Number(v12Val("v12BaseYear"));
  cfg.threshold=Number(v12Val("v12Thr"))||5;
  if(y!==cfg.baseYear){cfg.history.unshift({at:v12Today(),year:y,by:v12Person(),note:v12Val("v12BaseNote")||"基准年调整"});cfg.baseYear=y;cfg.setAt=v12Today();}
  v12Persist();closeModal();render();showToast("基准年已设为 "+y+"，各目标已按新基准重新分解");
}
function v12OpenTarget(id) {
  const cfg=v12Targets();
  const t=cfg.items.find(x=>x.id===id)||{name:"",scope:"12",type:"absolute",method:"sbti15",targetYear:2030,reduction:+(4.2*(2030-cfg.baseYear)).toFixed(1),netZero:true};
  v12Modal(id?"编辑目标":"新增目标",'<div class="modalForm">'+
    v12Field("目标名称",'<input id="tgN" value="'+v12H(t.name)+'" placeholder="如：范围一+二 绝对排放下降">')+
    v12Field("覆盖范围",'<select id="tgS">'+["12","3","123"].map(s=>'<option value="'+s+'" '+(s===t.scope?'selected':'')+'>'+v12ScopeLabel(s)+'</option>').join("")+'</select>')+
    v12Field("目标类型",'<select id="tgT" onchange="v12TargetForm()"><option value="absolute" '+(t.type==="absolute"?'selected':'')+'>绝对量（tCO₂e）</option><option value="intensity" '+(t.type==="intensity"?'selected':'')+'>强度（tCO₂e/百万元营收）</option></select>')+
    v12Field("设定方法",'<select id="tgM" onchange="v12TargetForm(true)"></select>')+
    v12Field("目标年",'<select id="tgY" onchange="v12TargetForm(true)">'+[2028,2030,2032,2035].map(y=>'<option '+(y===t.targetYear?'selected':'')+'>'+y+'</option>').join("")+'</select>')+
    v12Field("较基准年下降（%）",'<input id="tgR" type="number" min="1" max="100" step="0.1" value="'+t.reduction+'">')+
    '<label class="wide v12Check"><input id="tgZ" type="checkbox" '+(t.netZero?'checked':'')+'> 设定 2050 年净零长期目标（较基准下降 90%，剩余排放以碳移除中和）</label></div>'+
    '<p class="calcPreview" id="tgHint"></p>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveTarget(\''+(id||"")+'\')">保存并分解</button>');
  window.__tgMethod=t.method;
  v12TargetForm();
}
function v12TargetForm(recalc) {
  const type=v12Val("tgT"),sel=document.getElementById("tgM");
  const opts=Object.entries(V12_METHODS).filter(([,m])=>!m.type||m.type===type);
  const cur=sel.value||window.__tgMethod;
  sel.innerHTML=opts.map(([k,m])=>'<option value="'+k+'" '+(k===cur?'selected':'')+'>'+m.label+'</option>').join("");
  if(!opts.some(([k])=>k===cur))sel.value=opts[0][0];
  const m=V12_METHODS[sel.value],years=Number(v12Val("tgY"))-v12Targets().baseYear;
  const r=document.getElementById("tgR");
  if(m.rate&&recalc!==false)r.value=(m.rate*years).toFixed(1);
  r.readOnly=!!m.rate;
  document.getElementById("tgHint").innerHTML=m.rate?m.label+'：'+m.note+'，'+v12Targets().baseYear+'–'+v12Val("tgY")+' 共 '+years+' 年，下降 <b>'+(m.rate*years).toFixed(1)+'%</b>，按基准年平均分配到每一年':
    type==="intensity"?'强度目标需同时满足绝对排放不增长，系统按基准年平均分配到每一年':'按基准年线性平均分配到每一年';
}
function v12SaveTarget(id) {
  const cfg=v12Targets();
  const v={name:v12Val("tgN"),scope:v12Val("tgS"),type:v12Val("tgT"),method:v12Val("tgM"),targetYear:Number(v12Val("tgY")),reduction:Number(v12Val("tgR")),netZero:document.getElementById("tgZ").checked,status:"已发布"};
  if(!v.name){showToast("请填写目标名称");return;}
  if(!(v.reduction>0&&v.reduction<=100)){showToast("下降幅度需在 0–100% 之间");return;}
  const ex=cfg.items.find(x=>x.id===id);
  if(ex)Object.assign(ex,v);else cfg.items.push({id:"T"+Date.now().toString().slice(-5),...v});
  v12State.targetSel=ex?ex.id:cfg.items.at(-1).id;
  v12Persist();closeModal();render();showToast("目标已保存，已按年度分解");
}

// ================= 碳目标：目标跟踪 =================
function v12TargetTrack() {
  const cfg=v12Targets(),year=Math.min(reportYear,CURRENT_YEAR);
  const cards='<div class="v12TrackCards">'+cfg.items.map(t=>{
    const s=v12TStatus(t,year);
    return '<div class="v12Track '+(s.ok?'ok':'bad')+'"><div class="h"><b>'+v12H(t.name)+'</b>'+v12Tag(s.ok?"符合路径":"落后路径",s.ok?"ok":"bad")+'</div>'+
      '<div class="ring">'+v12Pie([{label:"完成",value:Math.max(0.001,s.progress),color:s.ok?"#26890D":"#D92D20"},{label:"剩余",value:100-Math.max(0,s.progress),color:"#EEF2F6"}],{size:118,legend:false,center:[Math.max(0,s.progress).toFixed(0)+"%","目标完成度"]})+
      '<dl><div><dt>'+year+' 实际</dt><dd>'+fmt(s.actual,v12TDigits(t))+'</dd></div><div><dt>'+year+' 目标值</dt><dd>'+fmt(s.path,v12TDigits(t))+'</dd></div><div><dt>已下降 / 应下降</dt><dd>'+s.reduced.toFixed(1)+'% / '+s.need.toFixed(1)+'%</dd></div><div><dt>'+t.targetYear+' 目标</dt><dd>下降 '+t.reduction+'%</dd></div></dl></div></div>';
  }).join("")+'</div>';
  const t=cfg.items.find(x=>x.id===v12State.targetSel&&x.scope!=="3")||cfg.items.find(x=>x.scope==="12"&&x.type==="absolute")||cfg.items[0];
  const pct=y=>1-v12TPath(t,y)/v12TBase(t);
  const units=PETRO_ENTITIES.map(e=>{
    const val=yy=>v12Detail(yy).filter(r=>r.org===e.org&&String(r.scope)!=="3").reduce((s,r)=>s+r.emission_tco2e,0)/(t.type==="intensity"?YEAR_REVENUE[yy]*(UNIT_REVENUE_SHARE[e.org]||0.01):1);
    const base=val(cfg.baseYear),act=val(year),tgt=base*(1-pct(year)),fin=base*(1-t.reduction/100);
    const red=base?(1-act/base)*100:0;
    return {e,base,act,tgt,fin,red,ok:act<=tgt*1.0001};
  }).filter(u=>u.base>0);
  const ok=units.filter(u=>u.ok).length;
  const unitTable=v12Panel("各单位目标实现情况 <small>"+v12H(t.name)+'</small>',
    '<div class="v12UnitSum"><span>达标 <b class="okText">'+ok+'</b></span><span>未达标 <b class="badText">'+(units.length-ok)+'</b></span><span>按集团同比例分解至各单位（'+year+' 年应较基准下降 '+(pct(year)*100).toFixed(1)+'%）</span></div>'+
    v12Table(["单位","板块","基准值 ("+cfg.baseYear+")",year+" 目标值",year+" 实际","较基准","完成情况",t.targetYear+" 目标值"],units.sort((a,b)=>a.ok-b.ok||b.base-a.base).map(u=>['<strong>'+v12H(u.e.org)+'</strong>',v12H(petroSeg(u.e.org)?.name||""),
      fmt(u.base,v12TDigits(t)),fmt(u.tgt,v12TDigits(t)),'<b class="'+(u.ok?'okText':'badText')+'">'+fmt(u.act,v12TDigits(t))+'</b>',(u.red>=0?'-':'+')+Math.abs(u.red).toFixed(1)+'%',
      '<span class="v12Inline">'+v12Progress(Math.max(0,Math.min(u.red,t.reduction)),t.reduction,u.ok?"":"bad")+v12Tag(u.ok?"达标":"未达标",u.ok?"ok":"bad")+'</span>',fmt(u.fin,v12TDigits(t))])),
    '<select class="v12Mini" onchange="v12Set(\'targetSel\',this.value)">'+cfg.items.filter(x=>x.scope!=="3").map(x=>'<option value="'+x.id+'" '+(x.id===t.id?'selected':'')+'>'+v12H(x.name)+'</option>').join("")+'</select>');
  return v12Head("目标跟踪",'<button class="btn" onclick="go(\'组织碳排放\',\'碳目标管理\',\'目标设置\')">目标设置</button>','组织碳排放 / 碳目标管理 / 目标跟踪 · '+year+' 年度')+cards+unitTable;
}

// ================= 填报与审核 =================
const V12_KIND_ORDER = ["固定燃烧","移动燃烧","火炬燃烧","工业过程","工艺放空","逸散排放","回收扣减","回收利用（扣减）","外购电力","外购热力","购入电力","购入热力"];
function v12TaskKind(t) {
  if(t.scope==="3")return v12CatLabel(t.category);
  const src=petroSource(t.id);
  if(!src)return t.scope==="2"?"外购电力":"固定燃烧";
  return src.method==="elec"?"外购电力":src.method==="heat"?"外购热力":src.method==="vent"?"工艺放空":["fug","gwp"].includes(src.method)?"逸散排放":src.method==="green"?"可再生电力（披露）":src.kind;
}
function v12TaskSort(a,b) {
  if(a.scope!==b.scope)return Number(a.scope)-Number(b.scope);
  if(a.scope==="3")return String(a.category).localeCompare(String(b.category))||a.name.localeCompare(b.name);
  const ka=V12_KIND_ORDER.indexOf(v12TaskKind(a)),kb=V12_KIND_ORDER.indexOf(v12TaskKind(b));
  return (ka<0?99:ka)-(kb<0?99:kb)||a.org.localeCompare(b.org)||a.id.localeCompare(b.id);
}
function v12EvCell(t) {
  const evs=typeof evidenceFor==="function"?evidenceFor(t.id):[];
  const e=taskEntry(t);
  if(evs.length)return '<button class="v12Ev" onclick="event.stopPropagation();openUnifiedTask(\''+t.id+'\')" title="'+v12H(evs.map(x=>x.name).join("、"))+'">📎 '+evs.length+'</button>';
  if(e.attachment)return '<span class="v12Ev">📎 1</span>';
  return e.evidence?'<span class="srcCell">'+v12H(e.evidence)+'</span>':'<span class="muted">未上传</span>';
}
function v12TaskRow(t) {
  const e=taskEntry(t);
  const est=e.activity===""||e.activity===undefined?"—":fmt(+e.activity*t.factor,1);
  const stage=e.status==="待审核"?(e.reviewStage===2?"集团复核":"单位审核"):"";
  return ['<strong>'+v12H(t.name)+'</strong><small>'+t.id+' · '+v12H(v12TaskKind(t))+'</small>',v12H(t.org),
    e.activity===""||e.activity===undefined?'<span class="muted">待填报</span>':fmt(e.activity,2)+' '+v12H(t.unit),est,v12EvCell(t),
    entryStatus(e.status)+(stage?'<small>'+stage+'</small>':''),v12H(t.owner)+'<small>'+v12H(t.origin)+'</small>',taskButton(t)];
}
function v12TaskList() {
  const filler=v12Is("filler");
  let tasks=(filler?myTasks():workflowTasks()).filter(t=>t.id!=="T-S2-04");
  const all=tasks;
  const f=v12State;
  tasks=tasks.filter(t=>{const e=taskEntry(t);return (!f.taskStatus||e.status===f.taskStatus)&&(!f.taskOrg||t.org===f.taskOrg)&&
    (!f.taskQ||[t.name,t.org,t.owner,t.id].join(" ").includes(f.taskQ));}).sort(v12TaskSort);
  const cnt=s=>all.filter(t=>taskEntry(t).status===s).length;
  const kpi='<div class="v12Counts wide">'+[["全部",all.length,"","" ],["待填报",cnt("待填报")+cnt("草稿"),"warn","待填报"],["已退回",cnt("退回"),"bad","退回"],["审核中",cnt("待审核"),"","待审核"],["已通过",cnt("通过"),"ok","通过"]].map(([l,v,tone,s])=>
    '<button class="'+tone+(f.taskStatus===s?' active':'')+'" onclick="v12Set(\'taskStatus\',\''+s+'\')"><b>'+v+'</b><span>'+l+'</span></button>').join("")+'</div>';
  const orgs=[...new Set(all.map(t=>t.org))];
  const tools='<div class="v12Filter"><select onchange="v12Set(\'taskOrg\',this.value)"><option value="">全部组织</option>'+orgs.map(o=>'<option '+(f.taskOrg===o?'selected':'')+'>'+v12H(o)+'</option>').join("")+'</select>'+
    '<input placeholder="搜索指标、组织、负责人" value="'+v12H(f.taskQ)+'" onchange="v12Set(\'taskQ\',this.value)"></div>';
  const scopeSel=f.taskScope||"1";
  const scopeTabs=v12Tabs([["1","范围一 · 直接排放",tasks.filter(t=>t.scope==="1").length],["2","范围二 · 能源间接排放",tasks.filter(t=>t.scope==="2").length],["3","范围三 · 价值链间接排放",tasks.filter(t=>t.scope==="3").length]],scopeSel,"v12SetTaskScope");
  const groups=[["1","范围一 · 直接排放"],["2","范围二 · 能源间接排放"],["3","范围三 · 价值链间接排放"]].filter(([s])=>s===scopeSel).map(([s,label])=>{
    const list=tasks.filter(t=>t.scope===s);
    if(!list.length)return "";
    const done=list.filter(t=>["通过","不适用"].includes(taskEntry(t).status)).length;
    let rows=[],last="";
    list.forEach(t=>{const k=v12TaskKind(t);if(k!==last){rows.push({cls:"v12GroupRow",cells:['<b>'+v12H(k)+'</b>',"","","","","","",""]});last=k;}rows.push(v12TaskRow(t));});
    return v12Panel(label+' <em>'+list.length+'</em>','<div class="v12ScopeProg">'+v12Progress(done,list.length)+'<span>已通过 '+done+' / '+list.length+'</span></div>'+
      v12Table(["指标 / 排放源","组织","活动数据","预计排放 (tCO₂e)","凭证","状态","负责人","操作"],rows,{nopage:true}));
  }).join("");
  return v12Head(filler?"我的填报任务":"填报任务",'<button class="helpIcon" title="填报说明" onclick="v12Modal(\'填报说明\',\'<p>按范围一、二、三逐项填报活动数据，并在任务中上传凭证（发票、结算单、计量报表等），系统自动识别凭证并预填活动量。提交后依次经二级单位审核、集团碳管理员复核，通过后计入碳台账。</p>\')">?</button>'+exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]],"导出"),
    "组织碳排放 / 填报与审核 / 填报任务 · "+reportYear+" 年度")+kpi+tools+scopeTabs+(groups||v12Empty("没有符合条件的任务"));
}
function v12SetTaskScope(v){v12Set("taskScope",v);}
function v12ReviewList() {
  const tab=v12State.reviewTab;
  const all=workflowTasks().filter(t=>t.id!=="T-S2-04"&&!t.locked);
  const logs=demo.auditLog||[];
  const pending=all.filter(t=>taskEntry(t).status==="待审核");
  const done=[...new Set(logs.filter(l=>/审核通过|退回|单位审核/.test(l.action)).map(l=>l.taskId))].map(id=>all.find(t=>t.id===id)).filter(Boolean);
  const list=tab==="todo"?pending:done;
  const flowCell=t=>{const e=taskEntry(t);const st=e.status;const stage=st==="待审核"?(e.reviewStage===2?3:2):st==="通过"?5:st==="退回"?1:0;
    return '<ol class="v12Mini Flow">'+["填报","提交","单位审核","集团复核","入账"].map((n,i)=>'<li class="'+(i<stage?'done':i===stage?'now':'')+'" title="'+n+'">'+n+'</li>').join("")+'</ol>';};
  const lastLog=id=>logs.filter(l=>l.taskId===id).at(-1);
  const rows=list.sort(v12TaskSort).map(t=>{const e=taskEntry(t),l=lastLog(t.id);
    return ['<strong>'+v12H(t.name)+'</strong><small>'+t.id+' · 范围'+t.scope+(t.category?' · '+v12CatLabel(t.category):'')+'</small>',v12H(t.org),v12H(t.owner),
      e.activity!==""?fmt(e.activity,2)+' '+v12H(t.unit):'—',fmt((+e.activity||0)*t.factor,1),flowCell(t),l?'<small>'+v12H(l.at)+'</small>'+v12H(l.action.slice(0,24)):'—',
      tab==="todo"?'<button class="btn primary" onclick="openUnifiedTask(\''+t.id+'\',true)">'+(e.reviewStage===2?'集团复核':'单位审核')+'</button>':'<button class="btn" onclick="openUnifiedTask(\''+t.id+'\')">查看</button>'];});
  const flowDef='<div class="v12FlowDef">'+[["填报人","填报活动数据并上传凭证"],["二级单位审核","单位碳管理负责人核对数据与凭证"],["集团复核","集团碳管理员复核口径与因子"],["计入碳台账","自动核算并进入碳台账"]].map(([a,b],i)=>'<div><i>'+(i+1)+'</i><b>'+a+'</b><small>'+b+'</small></div>').join('<span>›</span>')+'</div>';
  return v12Head("审核任务",'','组织碳排放 / 填报与审核 / 审核任务')+v12Panel("审批流程",flowDef,'<button class="linkBtn" onclick="go(\'基础配置\',\'系统设置\',\'审批流程\')">流程配置 ›</button>')+
    v12Tabs([["todo","待我审核",pending.length],["done","已处理",done.length]],tab,"v12SetReviewTab")+
    v12Panel(tab==="todo"?"待审核":"已处理",v12Table(["任务","组织","填报人","活动数据","排放 (tCO₂e)","审批进度","最近操作",""],rows,{empty:tab==="todo"?"暂无待审核任务":"暂无记录"}));
}
function v12SetReviewTab(v){v12Set("reviewTab",v);}
// 两级审批：二级单位审核 → 集团复核
const v12ReviewBase = reviewUnifiedTask;
reviewUnifiedTask = async function (approved) {
  const entry=demo.taskEntries[openTaskId];
  if(entry&&entry.status==="待审核"&&approved&&entry.reviewStage!==2) {
    entry.reviewStage=2;
    auditTask(openTaskId,"单位审核通过");
    persistDemo();closeModal();render();showToast("单位审核通过，已流转至集团复核");return;
  }
  if(entry&&!approved)entry.reviewStage=0;
  return v12ReviewBase(approved);
};
const v12SaveTaskBase = saveUnifiedTask;
saveUnifiedTask = async function (submit) {
  const id=openTaskId;
  await v12SaveTaskBase(submit);
  const e=demo.taskEntries[id];
  if(submit&&e&&e.status==="待审核"){e.reviewStage=1;persistDemo();}
};
flowSteps = function (status,supplier=false) {
  const e=supplier?{}:(demo.taskEntries?.[openTaskId]||{});
  const steps=supplier?["供应商填报","提交","采购初审","碳管理复核","入库供应链因子"]:["填报数据","提交","二级单位审核","集团复核","计入碳台账"];
  const reached=status==="待审核"?(e.reviewStage===2?3:2):({"待填报":0,"草稿":0,"退回":0,"通过":5,"不适用":5}[status]??0);
  return '<ol class="flowSteps">'+steps.map((s,i)=>'<li class="'+(i<reached?'done':i===reached?(status==="退回"?'back':'now'):'')+'"><i>'+(i<reached?'✓':i+1)+'</i>'+s+(i===0&&status==="退回"?' · 已退回':'')+'</li>').join("")+'</ol>';
};
const v12OpenTaskBase = openUnifiedTask;
openUnifiedTask = function (id,review) {
  v12OpenTaskBase(id,review);
  const e=demo.taskEntries?.[id];
  const box=document.getElementById("modalContent");
  if(!box)return;
  if(e&&e.status==="待审核") {
    const ok=[...box.querySelectorAll(".modalActions .btn.primary")].find(b=>b.textContent.includes("审核通过"));
    if(ok)ok.textContent=e.reviewStage===2?"集团复核通过":"单位审核通过";
  }
  if(!v12Admin()&&!v12Is("filler")) {
    box.querySelectorAll(".modalActions .btn").forEach(b=>{if(/审核|退回|催办|不适用/.test(b.textContent))b.remove();});
    box.querySelectorAll(".modalActions input").forEach(i=>i.remove());
  }
};

// ================= 核算边界 =================
const V12_JV = [
  {org:"中渤海洋油气合资公司",seg:"UP",equity:49,control:"合营",op:false,fin:false,emission:1860000,note:"外方担任作业者"},
  {org:"华油燃气股份有限公司",seg:"MK",equity:35,control:"联营",op:false,fin:false,emission:420000,note:"城市燃气联营企业"},
  {org:"滨海港务油品码头公司",seg:"MK",equity:60,control:"控股",op:true,fin:true,emission:86000,note:"已纳入销售板块合并报送"}
];
function v12Boundary() {
  const s=v12();
  if(!s.boundary) {
    const ent={};
    PETRO_ENTITIES.forEach(e=>ent[e.org]={equity:e.merged?92:e.org==="滨海石化热电厂"?100:100,control:e.merged?"全资 / 控股":"全资",op:true,fin:true,include:true});
    ent["其他炼化企业"].equity=88;ent["其他油气田企业"].equity=95;
    V12_JV.forEach(j=>ent[j.org]={equity:j.equity,control:j.control,op:j.op,fin:j.fin,include:j.op});
    s.boundary={method:"运营控制权",version:"V2026.1",status:"已发布",publishedAt:"2026-03-12",by:"高文博",ent,
      s3:{},log:[{at:"2026-03-12",v:"V2026.1",note:"新增滨海港务油品码头公司（控股 60%）",by:"高文博"},{at:"2025-03-08",v:"V2025.1",note:"年度复核，无变化",by:"高文博"}]};
  }
  return s.boundary;
}
function v12BoundaryRatio(b,org) {
  const x=b.ent[org];if(!x)return 0;
  if(b.method==="股权比例")return x.equity;
  if(b.method==="财务控制权")return x.fin?100:0;
  return x.op?100:0;
}
function v12BoundaryPage() {
  const b=v12Boundary(),step=v12State.boundaryStep,edit=v12Admin();
  const steps=[["合并方法","确定组织边界方法"],["集团总部","总部机关与直属单位"],["板块与分子公司","逐级确定纳入范围"],["运营边界","范围一、二、三识别"],["确认发布","生成边界版本"]];
  const stepper=v12Steps(steps,step,"v12SetBStep");
  let body="";
  if(step===0) {
    const opts=[["运营控制权","对其拥有运营控制权的业务 100% 计入，无控制权的不计入。GHG Protocol 与 ISO 14064-1 推荐，国内核算指南一致。","推荐"],
      ["财务控制权","对其拥有财务控制权（可主导财务和经营政策）的业务 100% 计入。",""],["股权比例","按持股比例计入各业务排放，适用于合资经营较多的油气上游企业。",""]];
    body=v12Panel("第 1 步 · 选择组织边界合并方法",'<div class="v12Radio">'+opts.map(([m,d,tag])=>'<label class="'+(b.method===m?'on':'')+'"><input type="radio" name="bm" '+(b.method===m?'checked':'')+' '+(edit?'':'disabled')+' onchange="v12SetBMethod(\''+m+'\')"><b>'+m+(tag?' '+v12Tag(tag,"ok"):'')+'</b><small>'+d+'</small></label>').join("")+'</div>'+
      '<div class="v12Impact">'+["运营控制权","财务控制权","股权比例"].map(m=>{const bb={...b,method:m};const n=Object.keys(b.ent).filter(o=>v12BoundaryRatio(bb,o)>0).length;return '<div class="'+(m===b.method?'on':'')+'"><span>'+m+'</span><b>'+n+'</b><small>家实体纳入</small></div>';}).join("")+'</div>');
  } else if(step===1) {
    const hq=PETRO_ENTITIES.find(e=>e.org==="集团总部"),x=b.ent["集团总部"];
    const srcs=PETRO_SOURCES.filter(s=>s.org==="集团总部");
    body=v12Panel("第 2 步 · 集团总部",'<div class="v12Facts"><div><span>实体</span><b>北辰石油天然气集团有限公司（总部机关）</b></div><div><span>地址</span><b>'+hq.region+'</b></div><div><span>范围</span><b>'+hq.capacity+'</b></div><div><span>控制类型</span><b>'+x.control+' · 运营控制</b></div></div>'+
      '<h4 class="v12Sub">纳入设施</h4>'+v12Table(["设施 / 单元","纳入","排放源"],hq.units.map(u=>[u,v12Tag("纳入","ok"),srcs.map(s=>s.name).join("、")||"—"]),{nopage:true})+
      '<h4 class="v12Sub">总部承担的价值链核算</h4><p class="muted small">集团层面统一核算范围三（外购原油、售出产品使用、投资等），由集团总部组织填报。</p>');
  } else if(step===2) {
    const sel=v12State.boundaryEntity;
    const rows=[];
    PETRO_SEGMENTS.filter(s=>s.id!=="HQ").forEach(seg=>{
      rows.push({cls:"v12GroupRow",cells:['<b style="color:'+seg.color+'">'+seg.name+'</b>',"","","","","","",""]});
      [...PETRO_ENTITIES.filter(e=>e.seg===seg.id).map(e=>({org:e.org,parent:e.parent,units:e.units.length,merged:e.merged})),...V12_JV.filter(j=>j.seg===seg.id).map(j=>({org:j.org,jv:j}))].forEach(e=>{
        const x=b.ent[e.org],ratio=v12BoundaryRatio(b,e.org);
        rows.push([(e.parent?'<span class="v12Indent">└ </span>':'')+'<strong>'+v12H(e.org)+'</strong>'+(e.merged?'<small>'+e.merged+' 家企业合并报送</small>':e.jv?'<small>'+v12H(e.jv.note)+'</small>':''),
          x.control,x.equity+'%',x.op?'是':'否',x.fin?'是':'否','<b>'+ratio+'%</b>',ratio>0?v12Tag("纳入","ok"):v12Tag("不纳入 · 计入 C15 投资","gray"),
          edit?'<button class="btn" onclick="v12OpenEntity(\''+v12Q(e.org)+'\')">设置</button>':'']);
      });
    });
    body=v12Panel("第 3 步 · 板块与分子公司 <small>按 "+b.method+" 计算合并比例</small>",v12Table(["实体","控制类型","持股比例","运营控制","财务控制","合并比例","纳入结论",""],rows,{nopage:true}));
  } else if(step===3) {
    const rows=xkScope3Rows?xkScope3Rows():[];
    body=v12Panel("第 4 步 · 运营边界",'<div class="v12OpBound"><div><b>范围一 · 直接排放</b><small>固定燃烧、移动燃烧、火炬燃烧、工业过程、逸散与放空，CO₂ 回收单独扣减</small>'+v12Tag("全部纳入","ok")+'</div>'+
      '<div><b>范围二 · 能源间接排放</b><small>外购电力（位置法 / 市场法）、外购热力；绿电单独披露</small>'+v12Tag("全部纳入","ok")+'</div></div>'+
      '<h4 class="v12Sub">范围三 · 15 类相关性识别</h4>'+v12Table(["类别","相关性","判断依据","数据来源","负责部门"],Object.keys(V12_S3_NAMES).map(code=>{const r=rows.find(x=>x.code===code)||{};
        return [v12CatLabel(code),v12Tag(r.relevance||"相关",(r.relevance||"相关")==="相关"?"ok":"gray"),'<span class="srcCell">'+v12H(r.reason||"—")+'</span>',v12H(r.data||r.source||"—"),v12H(typeof deptOf==="function"?deptOf(code):"—")];}),{nopage:true}));
  } else {
    const inc=Object.keys(b.ent).filter(o=>v12BoundaryRatio(b,o)>0);
    const facilities=PETRO_ENTITIES.filter(e=>inc.includes(e.org)).reduce((s,e)=>s+(e.merged||1),0);
    const srcs=PETRO_SOURCES.filter(s=>inc.includes(s.org)).length;
    body=v12Panel("第 5 步 · 确认发布",'<div class="statRow">'+v12Kpi("合并方法",b.method,"组织边界")+v12Kpi("纳入实体",String(inc.length),"含合并报送企业 "+facilities+" 家")+v12Kpi("排放源",String(srcs),"项 · 范围一、二")+v12Kpi("当前版本",b.version,b.status+" · "+b.publishedAt)+'</div>'+
      '<h4 class="v12Sub">版本记录</h4>'+v12Table(["日期","版本","变更说明","发布人"],b.log.map(l=>[l.at,l.v,v12H(l.note),l.by]),{nopage:true})+
      (edit?'<div class="v12Actions"><button class="btn primary" onclick="v12PublishBoundary()">发布新版本并生成填报任务</button></div>':''));
  }
  const nav='<div class="v12StepNav">'+(step>0?'<button class="btn" onclick="v12SetBStep('+(step-1)+')">上一步</button>':'<span></span>')+(step<4?'<button class="btn primary" onclick="v12SetBStep('+(step+1)+')">下一步</button>':'')+'</div>';
  return v12Head("核算边界",'<span class="muted small">当前版本 '+b.version+' · '+b.status+'</span>','组织碳排放 / 盘查准备 / 核算边界')+stepper+body+nav;
}
function v12SetBStep(i){v12State.boundaryStep=i;render();}
function v12SetBMethod(m){v12Boundary().method=m;v12Boundary().status="待发布";v12Persist();render();}
function v12OpenEntity(org) {
  const x=v12Boundary().ent[org];
  v12Modal(v12H(org)+" · 边界设置",'<div class="modalForm">'+v12Field("控制类型",'<select id="beC">'+["全资","全资 / 控股","控股","合营","联营","参股"].map(c=>'<option '+(c===x.control?'selected':'')+'>'+c+'</option>').join("")+'</select>')+
    v12Field("持股比例（%）",'<input id="beE" type="number" min="0" max="100" value="'+x.equity+'">')+
    v12Field("运营控制权",'<select id="beO"><option value="1" '+(x.op?'selected':'')+'>拥有</option><option value="0" '+(!x.op?'selected':'')+'>不拥有</option></select>')+
    v12Field("财务控制权",'<select id="beF"><option value="1" '+(x.fin?'selected':'')+'>拥有</option><option value="0" '+(!x.fin?'selected':'')+'>不拥有</option></select>')+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveEntity(\''+v12Q(org)+'\')">保存</button>');
}
function v12SaveEntity(org) {
  const b=v12Boundary(),x=b.ent[org];
  Object.assign(x,{control:v12Val("beC"),equity:Number(v12Val("beE")),op:v12Val("beO")==="1",fin:v12Val("beF")==="1"});
  b.status="待发布";v12Persist();closeModal();render();showToast("已更新，合并比例按 "+b.method+" 重新计算");
}
function v12PublishBoundary() {
  const b=v12Boundary();
  const n=Number(b.version.split(".")[1]||1)+1;
  b.version="V2026."+n;b.status="已发布";b.publishedAt=v12Today();
  b.log.unshift({at:v12Today(),v:b.version,note:"合并方法："+b.method+"；纳入 "+Object.keys(b.ent).filter(o=>v12BoundaryRatio(b,o)>0).length+" 家实体",by:v12Person()});
  v12Persist();render();showToast("边界 "+b.version+" 已发布，填报任务已按边界同步");
}

// ================= 碳台账 =================
function v12Formula(row) {
  if(String(row.scope)==="3")return {f:"E = AD × EF",p:"EF "+(+Number(row.factor_value).toPrecision(4))+" tCO₂e/"+(row.activity_unit||"")};
  const src=v12SrcOf(row);
  if(!src)return {f:"E = AD × EF",p:"EF "+(+Number(row.factor_value).toPrecision(4))};
  const m=PETRO_METHODS[src.method];
  const p={...src.params,...(demo.taskEntries?.[src.id]?.params||{})};
  return {f:m.formula,p:m.fields.length?m.fields.map(([k,l])=>l.replace(/（.*?）/g,"")+" "+(+Number(p[k]).toPrecision(5))).join("；"):"",src};
}
function v12Ledger() {
  const tab=v12State.ledgerTab;
  const head=v12Head("碳台账",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]],"导出台账"),"组织碳排放 / 碳核算 / 碳台账 · "+reportYear+" 年度");
  const tabs=v12Tabs([["ledger","排放台账"],["energy","能源转供与扣减"]],tab,"v12SetLedgerTab");
  if(tab==="energy")return head+tabs+v12EnergyPanel();
  const all=v12Detail();
  const f=v12State;
  const rows=all.filter(r=>(!f.ledgerScope||String(r.scope)===f.ledgerScope)&&(!f.ledgerOrg||v12OrgOf(r)===f.ledgerOrg)).sort((a,b)=>Number(a.scope)-Number(b.scope)||String(a.category_code).localeCompare(String(b.category_code))||b.emission_tco2e-a.emission_tco2e);
  const tot=v12ScopeSum(all);
  window.__ledgerRows=rows;
  const orgs=[...new Set(all.map(v12OrgOf))];
  const tools='<div class="v12Filter"><select onchange="v12Set(\'ledgerScope\',this.value)"><option value="">全部范围</option>'+["1","2","3"].map(s=>'<option value="'+s+'" '+(f.ledgerScope===s?'selected':'')+'>范围'+["一","二","三"][s-1]+'</option>').join("")+'</select>'+
    '<select onchange="v12Set(\'ledgerOrg\',this.value)"><option value="">全部组织</option>'+orgs.map(o=>'<option '+(f.ledgerOrg===o?'selected':'')+'>'+v12H(o)+'</option>').join("")+'</select><span class="muted small">'+rows.length+' 条 · 合计 '+fmt(rows.reduce((s,r)=>s+r.emission_tco2e,0),0)+' tCO₂e</span></div>';
  const kpi='<div class="statRow">'+v12Kpi("排放总量",v12Big(tot["1"]+tot["2"]+tot["3"]),"tCO₂e · "+all.length+" 条台账")+v12Kpi("范围一",v12Big(tot["1"]),"tCO₂e")+v12Kpi("范围二",v12Big(tot["2"]),"tCO₂e · 位置法")+v12Kpi("范围三",v12Big(tot["3"]),"tCO₂e")+'</div>';
  const table=v12Table(["范围 / 类别","组织","排放源","活动数据","核算公式","参数 / 排放因子","排放量 (tCO₂e)","数据质量","凭证"],rows.map((r,i)=>{const fm=v12Formula(r);
    return {click:"v12OpenLedger("+i+")",cells:[String(r.scope)==="3"?'范围三<small>'+v12CatLabel(r.category_code)+'</small>':'范围'+["一","二"][r.scope-1]+'<small>'+v12H(v12Kind(r))+'</small>',v12H(v12OrgOf(r)),'<strong>'+v12H(scenarioText(r.source_name))+'</strong>',
      fmt(r.activity_value,2)+' '+v12H(r.activity_unit),'<code class="v12Code">'+v12H(fm.f)+'</code>','<span class="srcCell">'+v12H(fm.p)+'</span>','<b>'+fmt(r.emission_tco2e,1)+'</b>',v12H(String(r.quality||"一级").slice(0,2)),v12H(r.evidence||"—")]};}));
  return head+tabs+kpi+tools+v12Panel("排放台账",table);
}
function v12SetLedgerTab(v){v12Set("ledgerTab",v);}
function v12OpenLedger(i) {
  const r=window.__ledgerRows[i],fm=v12Formula(r);
  let steps=[];
  if(fm.src){const c=petroCalc(fm.src,demo.taskEntries?.[fm.src.id]?.params,r.activity_value);steps=c.steps.concat(["CO₂ "+fmt(c.co2,1)+" t"+(c.ch4?" · CH₄ "+fmt(c.ch4,2)+" t × GWP "+c.gwp:"")]);}
  else steps=["E = "+fmt(r.activity_value,2)+" "+r.activity_unit+" × "+(+Number(r.factor_value).toPrecision(5))+" = "+fmt(r.emission_tco2e,1)+" tCO₂e"];
  v12Modal(v12H(scenarioText(r.source_name)),'<div class="taskContext"><span>'+v12H(v12OrgOf(r))+'</span><span>'+(String(r.scope)==="3"?v12CatLabel(r.category_code):"范围"+r.scope)+'</span><span>'+v12H(r.quality||"")+'</span><span>凭证 '+v12H(r.evidence||"—")+'</span></div>'+
    '<div class="ptParams"><div class="ptParamsHead"><b>核算公式</b><code>'+v12H(fm.f)+'</code>'+(fm.src?'<span>'+v12H(PETRO_GUIDES[fm.src.guide]||"")+'</span>':'')+'</div><div class="ptWork">'+steps.map(s=>'<div>'+v12H(s)+'</div>').join("")+'<b>排放量 '+fmt(r.emission_tco2e,1)+' tCO₂e</b></div></div>'+
    (fm.p?'<p class="muted small">参数：'+v12H(fm.p)+'</p>':''),
    (fm.src?'<button class="btn" onclick="closeModal();openUnifiedTask(\''+fm.src.id+'\')">查看填报任务</button>':'')+'<button class="btn primary" data-close-modal="1">关闭</button>');
}
function v12EnergyPanel() {
  const t=e=>e.qty*e.factor;
  const list=XK_ENERGY.filter(e=>e.id!=="E5");
  const kwh=xkPurchasedKwh();
  const c3=[["外购电力上游燃料链",kwh,"kWh",XK_C3.upstream,"上游燃料开采、加工与运输 · 行业平均"],["外购电力输配电损耗",kwh*XK_C3.lossRate,"kWh",XK_GRID,"线损率 5% × 全国电网平均排放因子"],["外购电转供园区企业",42000000,"kWh",XK_GRID,"范围二扣减后计入类别3"]];
  return '<div class="statRow">'+list.slice(0,4).map(e=>v12Kpi(e.org.replace("滨海石化","")+" · "+e.dir+e.kind,fmt(e.qty,0)+" "+e.unit,v12H(e.ghg)+" · "+fmt(t(e),0)+" t")).join("")+'</div>'+
    v12Panel("能源输入输出台账",v12Table(["编号","主体","方向","能源","数量","对象","GHG Protocol / ISO 14064 处理","国内核算指南处理","折算排放 (tCO₂e)"],list.map(e=>[e.id,v12H(e.org),v12Tag(e.dir,e.dir==="转供"?"warn":"ok"),e.kind,fmt(e.qty,0)+" "+e.unit,v12H(e.to),v12H(e.ghg),v12H(e.cn),fmt(t(e),1)]),{nopage:true}))+
    v12Panel("范围三 类别3 燃料和能源相关活动（系统派生）",v12Table(["活动","数量","单位","因子 (tCO₂e/单位)","依据","排放 (tCO₂e)"],c3.map(r=>[r[0],fmt(r[1],0),r[2],+Number(r[3]).toPrecision(4),'<span class="srcCell">'+r[4]+'</span>',fmt(r[1]*r[3],1)]),{nopage:true}));
}

// ================= 数据校验 =================
function v12Issues() {
  const s=v12();s.issues ||= {};
  const year=reportYear,cur=v12Detail(year),prev=REPORT_YEARS.includes(year-1)?v12Detail(year-1):[];
  const out=[];
  // 重复计算
  xkDedupItems().forEach(i=>out.push({id:"DUP-"+i.id,type:"重复计算",obj:i.what,desc:i.type+"：A "+i.a+"；B "+i.b,impact:fmt(i.emission,0)+" tCO₂e",status:i.status==="已剔除"?"已处理":i.status==="不剔除"?"已确认":"待处理",open:"xkOpenDedup('"+i.id+"')",org:"集团"}));
  // 交叉核对
  xkCrossRows().forEach(r=>out.push({id:"CRS-"+r.task.id,type:"交叉核对",obj:r.task.name,org:r.task.org,desc:r.meta[0]+" vs "+(r.c?r.c.src:"未录入核对数据")+"，阈值 ±"+r.meta[1]+"%",
    impact:r.diff===null?"—":(r.diff>0?"+":"")+r.diff.toFixed(2)+"%",status:r.status==="一致"?"通过":r.status==="已说明"?"已确认":r.status==="超阈值"?"待处理":"待核对",open:"xkOpenCross('"+r.task.id+"')"}));
  // 异常数据：同比波动、因子偏离、凭证缺失
  const key=r=>r.org+"|"+r.source_name;
  const pm={};prev.forEach(r=>pm[key(r)]=(pm[key(r)]||0)+r.emission_tco2e);
  cur.forEach(r=>{
    const p=pm[key(r)];
    if(p&&r.emission_tco2e>1000){const d=(r.emission_tco2e-p)/p*100;if(Math.abs(d)>12){const id="ANO-Y-"+key(r);out.push({id,type:"异常数据",sub:"同比波动",obj:scenarioText(r.source_name),org:v12OrgOf(r),desc:"较上年 "+(d>0?"+":"")+d.toFixed(1)+"%（阈值 ±12%）",impact:fmt(r.emission_tco2e-p,0)+" tCO₂e",status:s.issues[id]?.status||"待处理",open:"v12OpenIssue('"+v12Q(id)+"')",row:r,prev:p,delta:d});}}
    if(!r.evidence&&String(r.scope)!=="3"){const id="ANO-E-"+key(r);out.push({id,type:"异常数据",sub:"凭证缺失",obj:scenarioText(r.source_name),org:v12OrgOf(r),desc:"已入账但无凭证编号",impact:fmt(r.emission_tco2e,0)+" tCO₂e",status:s.issues[id]?.status||"待处理",open:"v12OpenIssue('"+v12Q(id)+"')",row:r});}
  });
  workflowTasks().filter(t=>t.petro).forEach(t=>{const e=taskEntry(t);const src=petroSource(t.id);if(!src||!e.params)return;
    const keys=Object.keys(e.params).filter(k=>typeof src.params[k]==="number"&&src.params[k]&&Math.abs(e.params[k]-src.params[k])/Math.abs(src.params[k])>0.08);
    keys.forEach(k=>{const id="ANO-P-"+t.id+"-"+k;const lab=(PETRO_METHODS[src.method].fields.find(f=>f[0]===k)||[k,k])[1];
      out.push({id,type:"异常数据",sub:"参数偏离",obj:t.name,org:t.org,desc:lab+" 填报 "+e.params[k]+"，较缺省 / 历史值 "+src.params[k]+" 偏离 "+((e.params[k]-src.params[k])/src.params[k]*100).toFixed(1)+"%",impact:"—",status:s.issues[id]?.status||"待处理",open:"v12OpenIssue('"+v12Q(id)+"')",task:t});});});
  return out;
}
function v12CheckPage() {
  const all=v12Issues(),tab=v12State.checkTab;
  const list=all.filter(i=>tab==="all"||i.type===tab);
  const n=(t,s)=>all.filter(i=>(!t||i.type===t)&&(!s||i.status===s)).length;
  const kpi='<div class="statRow">'+v12Kpi("校验项",String(all.length),"重复计算 "+n("重复计算")+" · 交叉核对 "+n("交叉核对")+" · 异常 "+n("异常数据"))+v12Kpi("待处理",'<span class="badText">'+n("","待处理")+'</span>',"项 · 需在关账前处理")+
    v12Kpi("已确认 / 已处理",String(n("","已确认")+n("","已处理")+n("","通过")),"项")+v12Kpi("待核对",String(n("","待核对")),"项 · 缺少第二数据源")+'</div>';
  window.__issues=all;
  const tone=s=>({"待处理":"bad","待核对":"warn","已确认":"ok","已处理":"ok","通过":"ok","已退回":"warn"}[s]||"gray");
  return v12Head("数据校验",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"组织碳排放 / 碳核算 / 数据校验 · "+reportYear+" 年度")+kpi+
    v12Tabs([["all","全部",all.length],["重复计算","重复计算",n("重复计算")],["交叉核对","交叉核对",n("交叉核对")],["异常数据","异常数据",n("异常数据")]],tab,"v12SetCheckTab")+
    v12Panel("校验结果",v12Table(["类型","对象","组织","问题描述","影响","状态","操作"],list.sort((a,b)=>(a.status==="待处理"?0:1)-(b.status==="待处理"?0:1)).map(i=>[v12Tag(i.sub||i.type,i.type==="重复计算"?"info":i.type==="交叉核对"?"warn":"bad"),'<strong>'+v12H(i.obj)+'</strong>',v12H(i.org||"—"),'<span class="srcCell">'+v12H(i.desc)+'</span>',i.impact,v12Tag(i.status,tone(i.status)),
      '<button class="btn '+(i.status==="待处理"?'primary':'')+'" onclick="'+i.open+'">查看明细</button>'])));
}
function v12SetCheckTab(v){v12Set("checkTab",v);}
function v12OpenIssue(id) {
  const i=window.__issues.find(x=>x.id===id)||v12Issues().find(x=>x.id===id);
  const st=v12().issues[id]||{};
  let detail="";
  if(i.sub==="同比波动")detail=v12Table(["年度","排放量 (tCO₂e)","活动数据"],[[reportYear-1,fmt(i.prev,0),"—"],[reportYear,fmt(i.row.emission_tco2e,0),fmt(i.row.activity_value,0)+" "+v12H(i.row.activity_unit)]],{nopage:true});
  else if(i.row)detail=v12Table(["排放源","活动数据","排放量"],[[v12H(scenarioText(i.row.source_name)),fmt(i.row.activity_value,0)+" "+v12H(i.row.activity_unit),fmt(i.row.emission_tco2e,0)]],{nopage:true});
  v12Modal(v12H(i.sub||i.type)+" · "+v12H(i.obj),'<div class="taskContext"><span>'+v12H(i.org||"")+'</span>'+v12Tag(i.status,i.status==="待处理"?"bad":"ok")+'</div><p>'+v12H(i.desc)+'</p>'+detail+
    (st.note?'<p class="reviewNote">处理说明 · '+v12H(st.note)+'（'+v12H(st.by||"")+' '+v12H(st.at||"")+'）</p>':'')+
    (v12Is("carbonAdmin","etsExpert")?'<div class="modalForm"><label class="wide">处理说明<input id="isNote" placeholder="如：新装置投产导致排放增加，已核对 DCS 月报"></label></div>':''),
    (v12Is("carbonAdmin","etsExpert")?'<button class="btn" onclick="v12SaveIssue(\''+v12Q(id)+'\',\'已退回\')">退回填报人</button><button class="btn primary" onclick="v12SaveIssue(\''+v12Q(id)+'\',\'已确认\')">确认合理</button>':'<button class="btn" data-close-modal="1">关闭</button>'));
}
function v12SaveIssue(id,status) {
  const note=v12Val("isNote");
  if(!note){showToast("请填写处理说明");return;}
  v12().issues[id]={status,note,by:v12Person(),at:v12Now()};
  const i=window.__issues.find(x=>x.id===id);
  if(status==="已退回"&&i?.task){const e=demo.taskEntries[i.task.id];if(e){e.status="退回";e.reviewNote=note;auditTask(i.task.id,"退回："+note);}}
  v12Persist();closeModal();render();showToast(status==="已确认"?"已确认并留痕":"已退回填报人");
}
