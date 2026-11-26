// v12：供应链碳排放。看板、供应商管理（ERP 导入 / 手工维护 / ESG 画像）、数据收集与审核（两级审批）、供应商分析报告。

const V12_SUP_CATS = ["管材钢材","催化剂与化学品","油田化学品","油田技术服务","运输物流","设备与备件","工业气体","包装材料","工程建设","技术服务","综合服务"];
const V12_SUP_EXTRA = [
  ["天津大桥焊材集团","管材钢材","天津",38200,"C01"],["宝鸡石油钢管有限责任公司","管材钢材","陕西",126500,"C01"],["鞍钢股份 · 管线钢事业部","管材钢材","辽宁",98400,"C01"],
  ["齐鲁催化剂科技有限公司","催化剂与化学品","山东",61800,"C01"],["岳阳石化助剂有限公司","催化剂与化学品","湖南",22600,"C01"],["南京烷基化助剂有限公司","催化剂与化学品","江苏",15800,"C01"],
  ["大庆油田化学助剂厂","油田化学品","黑龙江",33500,"C01"],["克拉玛依新科澳化工","油田化学品","新疆",19700,"C01"],
  ["中远海运能源运输","运输物流","上海",210000,"C04"],["中铁特货物流","运输物流","北京",48600,"C04"],["华北危化品道路运输有限公司","运输物流","河北",21400,"C09"],["招商局能源运输","运输物流","广东",132000,"C04"],
  ["宝石机械制造有限公司","设备与备件","陕西",72300,"C02"],["江汉石油钻头股份","设备与备件","湖北",26800,"C01"],["沈阳鼓风机集团","设备与备件","辽宁",88500,"C02"],["杭州汽轮动力集团","设备与备件","浙江",41200,"C02"],
  ["杭氧股份（滨海气体岛）","工业气体","辽宁",36800,"C01"],["林德气体（大连）","工业气体","辽宁",12400,"C01"],
  ["恒力包装科技","包装材料","江苏",9600,"C01"],["中石化工程建设有限公司","工程建设","北京",318000,"C02"],["中国化学工程第六建设","工程建设","湖北",142000,"C02"],
  ["东方电气集团","设备与备件","四川",56400,"C02"],["德州联合石油科技","设备与备件","山东",17300,"C01"],["中海油服 · 测井公司","技术服务","天津",44800,"C01"],["华为数字能源 · 智能运维","技术服务","广东",8600,"C01"],
  ["国网辽宁电力 · 综合能源","技术服务","辽宁",11200,"C03"]
];
const V12_ESG_AXES = ["环境管理","碳管理","社会责任","公司治理","供应链管理"];

function v12Suppliers() {
  if(v12Suppliers.cache&&v12Suppliers.ver===v12().supVer)return v12Suppliers.cache;
  const rand=seeded(26011);
  const lines=procurementLines();
  const base=[...new Set([...supplyScope3Items.map(r=>r.supplier),...PROCUREMENT.map(p=>p.supplier)])].map(name=>{
    const po=PROCUREMENT.filter(p=>p.supplier===name),sc=supplyScope3Items.find(r=>r.supplier===name),pl=lines.filter(l=>l.supplier===name);
    const item=po[0]?.item||sc?.part||"";
    const t=item+name;
    const cat=/钢管|油套管/.test(t)?"管材钢材":/催化剂|助剂|缓蚀|破乳|涂料|阻垢/.test(t)?"催化剂与化学品":/聚丙烯酰胺|支撑剂|油田化学/.test(t)?"油田化学品":/测井|压裂|防腐补口/.test(t)?"油田技术服务":
      /海运|运输|码头|物流|油运/.test(t)?"运输物流":/钻头|压缩机|工具|反应器|机组|车辆|电机|开关|电缆|控制系统|仪表|服务器|检修/.test(t)?"设备与备件":/气体/.test(t)?"工业气体":/包装|托盘/.test(t)?"包装材料":/工程|EPC/.test(t)?"工程建设":/咨询|云服务|检测|软件/.test(t)?"技术服务":"综合服务";
    return {name,cat,region:/渤海|辽东/.test(name)?"辽宁":/华东/.test(name)?"江苏":/海联/.test(name)?"上海":/胜宇/.test(name)?"山东":/中原/.test(name)?"河南":/西北/.test(name)?"甘肃":/华北/.test(name)?"河北":/大庆/.test(name)?"黑龙江":/大连|沈阳|辽河|滨海/.test(name)?"辽宁":/四川|川北|西南/.test(name)?"四川":/东海|华东/.test(name)?"浙江":["北京","天津","山东","河北","江苏","辽宁"][name.length%6],
      spend:po.reduce((s,p)=>s+(p.spend||0),0),items:po.map(p=>p.item).concat(sc&&!po.length?[sc.part]:[]),category:po[0]?.category||sc?.category||"C01",
      emission:pl.reduce((s,l)=>s+(l.emission||0),0),method:pl[0]?.method||"支出法",legacyIndex:supplyScope3Items.findIndex(r=>r.supplier===name),src:"ERP"};
  });
  const extra=V12_SUP_EXTRA.map(([name,cat,region,spend,category])=>{
    const f={C01:0.62,C02:0.48,C03:0.35,C04:0.95,C09:0.88}[category]||0.6;
    return {name,cat,region,spend,items:[cat],category,emission:spend*f*(0.7+rand()*0.6),method:"支出法",legacyIndex:-1,src:"ERP"};
  });
  const manual=(v12().suppliers||[]).map(s=>({...s,emission:s.emission||0,method:"支出法",legacyIndex:-1,src:"手工"}));
  const all=[...base,...extra,...manual].map((s,i)=>{
    const r=seeded((i+3)*104729+7);r();r();r();
    const esgVals=V12_ESG_AXES.map(()=>Math.round(45+r()*50));
    if(s.legacyIndex>=0||i<4)esgVals[1]=Math.max(esgVals[1],72);
    const esg=Math.round(esgVals.reduce((a,b)=>a+b,0)/esgVals.length);
    const tier=s.spend>=100000?"战略":s.spend>=30000?"重要":"一般";
    const intensity=s.spend?s.emission/s.spend:0;
    const riskScore=Math.round((100-esg)*0.7+Math.min(30,intensity*10));
    return {...s,code:"SUP-"+String(i+1).padStart(3,"0"),esgVals,esg,tier,intensity,riskScore,_r:r,
      certs:[r()<0.8?"ISO 14001":null,r()<0.5?"ISO 50001":null,r()<0.35?"ISO 14064 核查":null,r()<0.18?"SBTi 承诺":null].filter(Boolean),
      contact:["王","李","张","刘","陈","杨","赵","黄"][i%8]+["经理","主管","工程师"][i%3]};
  });
  const order=all.slice().sort((a,b)=>b.riskScore-a.riskScore);
  order.forEach((s,k)=>{
    s.risk=k<Math.round(all.length*0.12)?"高":k<Math.round(all.length*0.42)?"中":"低";
    const r=s._r;delete s._r;
    s.dd=(v12().dd||{})[s.name]||(s.risk==="高"?(r()<0.5?"进行中":"待启动"):s.tier==="战略"?"已完成":r()<0.7?"已完成":"不需要");
  });
  v12Suppliers.cache=all;v12Suppliers.ver=v12().supVer;
  return all;
}
function v12SupRefresh(){v12().supVer=(v12().supVer||0)+1;}
function v12Sup(name){return v12Suppliers().find(s=>s.name===name||s.code===name);}

// ---------- 收集任务 ----------
const V12_SUP_TASK_SEED = [
  {id:"ST-01",supplier:"渤海钢管制造有限公司",name:"N80 套管单位产品碳排放",item:"N80 套管",category:"C01",unit:"t",qty:42000,status:"待填报",deadline:"2026-12-15"},
  {id:"ST-02",supplier:"华东催化剂有限公司",name:"加氢精制催化剂产品碳足迹",item:"加氢精制催化剂",category:"C01",unit:"t",qty:1200,status:"草稿",deadline:"2026-12-15",unitCarbon:5100},
  {id:"ST-03",supplier:"海联油运股份有限公司",name:"成品油沿海运输单位周转量排放",item:"成品油沿海运输",category:"C09",unit:"t·km",qty:4800000000,status:"待填报",deadline:"2026-12-20"},
  {id:"ST-04",supplier:"中原石油钻采装备有限公司",name:"PDC 钻头产品碳足迹",item:"PDC 钻头",category:"C01",unit:"只",qty:3600,status:"待审核",stage:1,deadline:"2026-12-10",unitCarbon:182,method:"产品碳足迹报告",evidence:"CFP-PDC-2026-07.pdf",submitted:"2026-11-21 10:42"},
  {id:"ST-05",supplier:"西北压缩机制造有限公司",name:"压缩机组大修服务排放",item:"压缩机大修",category:"C01",unit:"台次",qty:46,status:"通过",deadline:"2026-11-30",unitCarbon:21800,method:"工艺能耗法",evidence:"WX-REPAIR-2026.xlsx",submitted:"2026-11-08 15:20"},
  {id:"ST-06",supplier:"辽东化工助剂有限公司",name:"缓蚀剂产品碳足迹",item:"缓蚀剂",category:"C01",unit:"t",qty:5600,status:"待填报",deadline:"2026-11-20"},
  {id:"ST-07",supplier:"华北特种气体有限公司",name:"工业氮气单位产品排放",item:"工业氮气",category:"C01",unit:"千 Nm³",qty:182000,status:"待审核",stage:2,deadline:"2026-12-10",unitCarbon:168,method:"工艺能耗法",evidence:"N2-ENERGY-2026.pdf",submitted:"2026-11-19 09:05",log:[["2026-11-20 14:10","陈思远（采购初审）","初审通过：用电量与电费单一致"]]},
  {id:"ST-08",supplier:"渤海包装材料有限公司",name:"FFS 重包装膜袋产品碳足迹",item:"FFS 重包装膜袋",category:"C01",unit:"t",qty:3800,status:"通过",deadline:"2026-11-30",unitCarbon:2650,method:"产品碳足迹报告",evidence:"PKG-CFP-2026.pdf",submitted:"2026-11-02 11:30"},
  {id:"ST-09",supplier:"中远海运能源运输",name:"进口 LNG 海运单位周转量排放",item:"LNG 海运",category:"C04",unit:"t·km",qty:96000000000,status:"待审核",stage:1,deadline:"2026-12-10",unitCarbon:0.0061,method:"燃油消耗法（IMO DCS）",evidence:"IMO-DCS-2025.pdf",submitted:"2026-11-24 16:48"},
  {id:"ST-10",supplier:"宝鸡石油钢管有限责任公司",name:"X70 管线钢管产品碳足迹",item:"X70 管线钢管",category:"C02",unit:"t",qty:86000,status:"退回",deadline:"2026-12-15",unitCarbon:1420,method:"行业平均因子",evidence:"—",submitted:"2026-11-15 10:00",note:"请提供本厂炼钢工艺（高炉 / 电炉）及实测能耗，行业平均值不能作为一级数据"}
];
function v12SupTasksRaw() {
  const v=v12();
  if(!v.supTasks||v.supTaskVer!==1){v.supTasks=structuredClone(V12_SUP_TASK_SEED);v.supTaskVer=1;}
  return v.supTasks;
}
function v12LegacyStatus(s){return {"已收集":"通过","退回补充":"退回"}[s]||s||"待填报";}
function v12SupTasksAll() {
  const legacy=supplyScope3Items.map((r,i)=>{
    const st=v12LegacyStatus(r.status);
    return {id:"SUP-"+r.id,legacy:i,supplier:r.supplier,name:r.part+" 单位产品碳排放",item:r.part,category:r.category,unit:r.unit,qty:r.qty,unitCarbon:r.unitCarbon,status:st,stage:st==="待审核"?2:0,
      deadline:"2026-12-15",evidence:r.evidence,method:r.factorSource||"产品碳足迹报告",note:r.reviewNote,customer:"北辰石油天然气集团有限公司",
      node:st==="待审核"?"碳管理复核":st==="通过"?"已入库":st==="退回"?"退回供应商":"供应商填报",open:"editDemoSupplier("+i+","+(currentRole!=="供应商")+")"};
  });
  const own=v12SupTasksRaw().map(t=>({...t,customer:"北辰石油天然气集团有限公司",
    node:t.status==="待审核"?(t.stage===2?"碳管理复核":"采购初审"):t.status==="通过"?"已入库":t.status==="退回"?"退回供应商":"供应商填报",open:"v12OpenSupTask('"+t.id+"')"}));
  return [...legacy,...own];
}
function v12MySupplierName(){return supplyScope3Items[supplierIdentity]?.supplier||supplyScope3Items[0].supplier;}
function v12SupplierMyTasks(){const me=v12MySupplierName();return v12SupTasksAll().filter(t=>t.supplier===me);}
function v12SupEmission(t){return (Number(t.qty)||0)*(Number(t.unitCarbon)||0)/1000;}

// ================= 供应链看板 =================
function v12SupDrill(kind,val) {
  const list=v12Suppliers().filter(x=>kind==="tier"?x.tier===val:kind==="cat"?x.cat===val:kind==="risk"?x.risk===val:true).sort((a,b)=>b.emission-a.emission);
  const em=list.reduce((a,x)=>a+x.emission,0),sp=list.reduce((a,x)=>a+x.spend,0);
  v12Modal((kind==="tier"?val+"供应商":kind==="risk"?val+"风险供应商":val)+" · "+list.length+" 家",
    '<div class="v12Counts">'+[["供应商",list.length+" 家"],["年采购额",fmt(sp,0)+" 万元"],["采购相关排放",v12Big(em)+" t"],["一手数据占比",(list.filter(x=>x.method==="供应商一手数据").reduce((a,x)=>a+x.emission,0)/(em||1)*100).toFixed(0)+"%"]].map(([l,v])=>'<div><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>'+
    v12Table(["供应商","物资类别","分级","年采购额 (万元)","采购相关排放 (tCO₂e)","核算方式","ESG","风险"],list.map(x=>({click:"closeModal();v12OpenSupplier('"+x.code+"')",cells:['<strong>'+v12H(x.name)+'</strong>',x.cat,x.tier,fmt(x.spend,0),fmt(x.emission,0),v12H(x.method),x.esg,v12Tag(x.risk,{"高":"bad","中":"warn","低":"ok"}[x.risk])]})),{nopage:true}),
    '<button class="btn" data-close-modal="1">关闭</button><button class="btn primary" onclick="v12State.supCat=\''+(kind==="cat"?val:"")+'\';v12State.supTier=\''+(kind==="tier"?val:"")+'\';v12State.supRisk=\''+(kind==="risk"?val:"")+'\';closeModal();go(\'供应链碳排放\',\'供应商管理\')">在供应商管理中查看</button>');
}
function v12TaskDrill(st,label) {
  const list=v12SupTasksAll().filter(t=>t.status===st);
  v12Modal(label+"任务 · "+list.length+" 项",v12Table(["供应商","数据对象","范围三类别","截止日期","当前节点",""],list.map(t=>({click:"closeModal();"+t.open,cells:['<strong>'+v12H(t.supplier)+'</strong>',v12H(t.name),v12CatLabel(t.category),t.deadline+(daysUntil(t.deadline)<0&&st!=="通过"?' <small class="badText">逾期</small>':''),v12H(t.node),'<button class="linkBtn">打开</button>']})),{nopage:true,empty:"没有任务"}),'<button class="btn" data-close-modal="1">关闭</button>');
}
function v12SupplyDash() {
  const sups=v12Suppliers(),tasks=v12SupTasksAll();
  const spend=sups.reduce((s,x)=>s+x.spend,0),em=sups.reduce((s,x)=>s+x.emission,0);
  const covered=sups.filter(s=>tasks.some(t=>t.supplier===s.name));
  const st=k=>tasks.filter(t=>t.status===k).length;
  const overdue=tasks.filter(t=>["待填报","草稿","退回"].includes(t.status)&&daysUntil(t.deadline)<0);
  const dueList=tasks.filter(t=>["待填报","草稿","退回"].includes(t.status)&&daysUntil(t.deadline)<=30).sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline)).slice(0,5);
  const prog=[["通过",st("通过"),"#26890D"],["待审核",st("待审核"),"#2C6AA0"],["退回",st("退回"),"#D92D20"],["填报中",st("草稿"),"#B7791F"],["待填报",st("待填报"),"#D0D5DD"]];
  const stKey={"通过":"通过","待审核":"待审核","退回":"退回","填报中":"草稿","待填报":"待填报"};
  const progBar='<div class="v12StackBar">'+prog.map(([l,v,c])=>v?'<i style="flex:'+v+';background:'+c+';cursor:pointer" title="'+l+' '+v+'" onclick="v12TaskDrill(\''+stKey[l]+'\',\''+l+'\')"></i>':'').join("")+'</div>'+v12LegendRow(prog.map(([l,v,c])=>[l+' '+v,c]));
  const byCat={};tasks.forEach(t=>{const k=v12CatLabel(t.category);(byCat[k] ||= {n:0,done:0}).n++;if(t.status==="通过")byCat[k].done++;});
  const catProg='<div class="v12OrgProg">'+Object.entries(byCat).map(([k,v])=>'<div><span>'+v12H(k)+'<small>'+v.n+' 项任务</small></span>'+v12Progress(v.done,v.n)+'</div>').join("")+'</div>';
  const top=sups.slice().sort((a,b)=>b.emission-a.emission).slice(0,10);
  const tierPie=v12Pie(["战略","重要","一般"].map((k,i)=>({label:k+"供应商",value:sups.filter(s=>s.tier===k).length,display:sups.filter(s=>s.tier===k).length+" 家",color:["#26890D","#86BC25","#A3B18A"][i],action:"v12SupDrill('tier','"+k+"')"})),{size:150,center:[String(sups.length),"家供应商"]});
  const catPie=v12Pie(V12_SUP_CATS.map((c,i)=>({label:c,value:sups.filter(s=>s.cat===c).reduce((a,s)=>a+s.emission,0),display:v12Big(sups.filter(s=>s.cat===c).reduce((a,s)=>a+s.emission,0))+" t",action:"v12SupDrill('cat','"+c+"')"})).filter(d=>d.value>0),{size:150,legend:true});
  const ddc=k=>sups.filter(s=>s.dd===k).length;
  const risk=v12Scatter(sups.map(s=>({x:s.esg,y:Math.min(3.9,Math.max(0.05,s.intensity)),r:3+Math.sqrt(s.spend/16000),color:{"高":"#D92D20","中":"#B7791F","低":"#26890D"}[s.risk],label:s.name+" · ESG "+s.esg+" · 强度 "+s.intensity.toFixed(2)+" tCO₂e/万元",tag:"",action:"v12OpenSupplier('"+s.code+"')"})),
    {width:560,height:440,xmin:40,xmax:100,ymin:0,ymax:Math.min(4,Math.max(...sups.map(s=>s.intensity))*1.1),xLabel:"ESG 评分",yLabel:"碳强度 tCO₂e/万元",quad:[70,1.0],quadLabels:[["高排放 · 低 ESG",54,30],["高排放 · 高 ESG",540,30,"end"],["低排放 · 低 ESG",54,396],["低排放 · 高 ESG",540,396,"end"]]});
  return v12Head("供应链看板",'<button class="btn" onclick="go(\'供应链碳排放\',\'供应商分析报告\')">供应商分析报告</button><button class="btn primary" onclick="go(\'供应链碳排放\',\'数据收集与审核\',\'收集任务\')">发起收集</button>')+
    '<div class="statRow">'+v12Kpi("供应商",String(sups.length),"家 · 战略 "+sups.filter(s=>s.tier==="战略").length+" · 重要 "+sups.filter(s=>s.tier==="重要").length,"go('供应链碳排放','供应商管理')")+
      v12Kpi("年度采购额",v12Big(spend*10000).replace(" 亿"," 亿元").replace(" 万"," 万元"),"已发起数据收集的供应商覆盖 "+(covered.reduce((s,x)=>s+x.spend,0)/(spend||1)*100).toFixed(0)+"%")+
      v12Kpi("采购相关排放",v12Big(em)+" t","tCO₂e · 一手数据 "+(sups.filter(s=>s.method==="供应商一手数据").reduce((a,s)=>a+s.emission,0)/(em||1)*100).toFixed(0)+"%")+
      v12Kpi("数据收集",st("通过")+" / "+tasks.length,"已通过 · 逾期 "+overdue.length+" 项","go('供应链碳排放','数据收集与审核','收集任务')",overdue.length?"warnText":"")+'</div>'+
    '<div class="v12Grid2">'+v12Panel("数据收集进度",progBar+'<h4 class="v12H4">按范围三类别</h4>'+catProg+(dueList.length?'<h4 class="v12H4">逾期及临近截止</h4>'+dueList.map(t=>'<div class="v12Line"><span>'+v12H(t.supplier)+'<small>'+v12H(t.name)+' · '+t.status+'</small></span><em class="'+(daysUntil(t.deadline)<0?'badText':'warnText')+'">'+(daysUntil(t.deadline)<0?'逾期 '+(-daysUntil(t.deadline))+' 天':'剩 '+daysUntil(t.deadline)+' 天')+'</em><button class="linkBtn" onclick="v12RemindSup(\''+t.id+'\')">催办</button></div>').join(""):''),
        '<button class="linkBtn" onclick="go(\'供应链碳排放\',\'数据收集与审核\',\'收集任务\')">收集任务 ›</button>')+
      v12Panel("供应商概况",'<div class="v12Split">'+tierPie+'</div><h4 class="v12H4">按物资类别（采购相关排放）</h4>'+catPie)+'</div>'+
    '<div class="v12Grid2">'+v12Panel("排放 TOP 10 供应商",v12HBars(top.map((s,i)=>({rank:i+1,label:s.name,sub:s.cat+" · "+s.method,value:s.emission,display:v12Big(s.emission)+" t",color:s.method==="供应商一手数据"?"#26890D":"#A3B18A",action:"v12OpenSupplier('"+s.code+"')"}))),
        v12LegendRow([["供应商一手数据","#26890D"],["行业平均 / 支出法","#A3B18A"]]))+
      v12Panel("风险矩阵",risk+v12LegendRow([["高风险","#D92D20"],["中风险","#B7791F"],["低风险","#26890D"]]),'<small class="muted">圆点大小 = 采购额</small>')+'</div>'+
    v12Panel("供应商尽职调查",'<div class="v12Counts">'+[["已完成",ddc("已完成"),"ok"],["进行中",ddc("进行中"),""],["待启动",ddc("待启动"),"warn"],["高风险供应商",sups.filter(s=>s.risk==="高").length,"bad"]].map(([l,v,t])=>'<div class="'+t+'"><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>'+
      v12Table(["供应商","类别","风险","ESG","尽调状态","主要关注点",""],sups.filter(s=>s.risk!=="低").sort((a,b)=>b.riskScore-a.riskScore).slice(0,8).map(s=>[ '<strong>'+v12H(s.name)+'</strong>',s.cat,v12Tag(s.risk,s.risk==="高"?"bad":"warn"),s.esg,v12Tag(s.dd,s.dd==="已完成"?"ok":s.dd==="进行中"?"blue":"warn"),v12H(v12SupConcern(s)),'<button class="linkBtn" onclick="v12OpenSupplier(\''+s.code+'\',\'dd\')">尽调</button>']),{nopage:true}));
}
function v12SupConcern(s) {
  const low=V12_ESG_AXES.map((a,i)=>[a,s.esgVals[i]]).sort((a,b)=>a[1]-b[1])[0];
  return (s.intensity>1?"碳强度高（"+s.intensity.toFixed(2)+" tCO₂e/万元）；":"")+low[0]+"得分偏低（"+low[1]+"）"+(s.certs.includes("ISO 14001")?"":"；无 ISO 14001");
}
function v12RemindSup(id){showToast("已向供应商发送催办通知（站内信 + 邮件）");}

// ================= 供应商管理 =================
function v12SupplierMgmt() {
  const f=v12State.supCat||"",r=v12State.supRisk||"",tr=v12State.supTier||"",q=(v12State.supQ||"").toLowerCase();
  const all=v12Suppliers(),list=all.filter(s=>(!f||s.cat===f)&&(!r||s.risk===r)&&(!tr||s.tier===tr)&&(!q||(s.name+s.code).toLowerCase().includes(q)));
  const tasks=v12SupTasksAll();
  return v12Head("供应商管理",'<button class="btn" onclick="v12ErpImport()">从 ERP 导入</button><button class="btn primary" onclick="v12NewSupplier()">新增供应商</button>')+
    '<div class="statRow">'+v12Kpi("供应商",String(all.length),"家 · ERP "+all.filter(s=>s.src==="ERP").length+" · 手工 "+all.filter(s=>s.src==="手工").length)+v12Kpi("战略供应商",String(all.filter(s=>s.tier==="战略").length),"家 · 采购额 ≥ 10 亿元")+
      v12Kpi("平均 ESG 评分",String(Math.round(all.reduce((a,s)=>a+s.esg,0)/all.length)),"分")+v12Kpi("高风险",String(all.filter(s=>s.risk==="高").length),"家","v12Set('supRisk','高')","badText")+'</div>'+
    v12Panel("供应商名录",'<div class="taskToolbar"><label>物资类别<select onchange="v12Set(\'supCat\',this.value)"><option value="">全部</option>'+V12_SUP_CATS.map(c=>'<option '+(c===f?'selected':'')+'>'+c+'</option>').join("")+'</select></label>'+
      '<label>分级<select onchange="v12Set(\'supTier\',this.value)"><option value="">全部</option>'+["战略","重要","一般"].map(c=>'<option '+(c===tr?'selected':'')+'>'+c+'</option>').join("")+'</select></label>'+
      '<label>风险等级<select onchange="v12Set(\'supRisk\',this.value)"><option value="">全部</option>'+["高","中","低"].map(c=>'<option '+(c===r?'selected':'')+'>'+c+'</option>').join("")+'</select></label>'+
      '<label class="taskSearch">搜索<input placeholder="供应商名称 / 编码" value="'+v12H(v12State.supQ||"")+'" onchange="v12Set(\'supQ\',this.value)"></label><span>'+list.length+' 家</span></div>'+
      v12Table(["编码","供应商","物资类别","地区","分级","年采购额 (万元)","采购相关排放 (tCO₂e)","核算方式","ESG","风险","碳数据",""],list.map(s=>{
        const ts=tasks.filter(t=>t.supplier===s.name);
        return {click:"v12OpenSupplier('"+s.code+"')",cells:['<span class="v12Code0">'+s.code+'</span>','<strong>'+v12H(s.name)+'</strong>',s.cat,s.region,v12Tag(s.tier,s.tier==="战略"?"ok":s.tier==="重要"?"blue":"gray"),fmt(s.spend,0),fmt(s.emission,0),v12H(s.method),
          '<b>'+s.esg+'</b>',v12Tag(s.risk,{"高":"bad","中":"warn","低":"ok"}[s.risk]),ts.length?ts.filter(t=>t.status==="通过").length+" / "+ts.length+" 已通过":'<span class="muted">未发起</span>','<button class="linkBtn" onclick="event.stopPropagation();v12OpenSupplier(\''+s.code+'\')">画像</button>']};
      })));
}
function v12ErpImport() {
  const rows=[["V-200871","天津渤化永利化工","催化剂与化学品","天津",8600],["V-200915","中石油管道局工程有限公司","工程建设","河北",64200],["V-201033","锦州港股份","运输物流","辽宁",12800],["V-201102","兰州兰石重型装备","设备与备件","甘肃",23400]];
  const have=new Set(v12Suppliers().map(s=>s.name));
  v12Modal("从 ERP 导入供应商",'<p class="muted">ERP 供应商主数据（SAP MM · LFA1）· 本年新增或变更 '+rows.length+' 条</p>'+
    v12Table(["","ERP 编码","供应商","物资类别","地区","年采购额 (万元)","状态"],rows.map(r=>[have.has(r[1])?'':'<input type="checkbox" data-erp="'+v12H(JSON.stringify(r))+'" checked>',r[0],'<strong>'+v12H(r[1])+'</strong>',r[2],r[3],fmt(r[4],0),have.has(r[1])?v12Tag("已存在","gray"):v12Tag("新增","ok")]),{nopage:true}),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12DoErpImport()">导入选中</button>');
}
function v12DoErpImport() {
  const picked=[...document.querySelectorAll("[data-erp]:checked")].map(el=>JSON.parse(el.dataset.erp));
  if(!picked.length){showToast("请选择要导入的供应商");return;}
  (v12().suppliers ||= []).push(...picked.map(r=>({name:r[1],cat:r[2],region:r[3],spend:r[4],items:[r[2]],category:r[2]==="工程建设"?"C02":r[2]==="运输物流"?"C04":"C01",emission:r[4]*0.6,erp:r[0],srcTag:"ERP"})));
  v12().suppliers.forEach(s=>{if(s.srcTag==="ERP")s.src="ERP";});
  v12SupRefresh();v12Persist();closeModal();render();showToast("已导入 "+picked.length+" 家供应商，采购额按支出法估算排放");
}
function v12NewSupplier() {
  v12Modal("新增供应商",'<div class="modalForm">'+v12Field("供应商名称",'<input id="nsName">')+v12Field("统一社会信用代码",'<input id="nsUscc" placeholder="18 位">')+
    v12Field("物资类别",'<select id="nsCat">'+V12_SUP_CATS.map(c=>'<option>'+c+'</option>').join("")+'</select>')+v12Field("地区",'<input id="nsRegion">')+
    v12Field("年采购额（万元）",'<input id="nsSpend" type="number" min="0">')+v12Field("范围三类别",'<select id="nsCatCode">'+["C01","C02","C04","C09"].map(c=>'<option value="'+c+'">'+v12CatLabel(c)+'</option>').join("")+'</select>')+
    v12Field("碳数据联系人",'<input id="nsContact">')+v12Field("联系邮箱",'<input id="nsMail" type="email">')+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveSupplier()">保存</button>');
}
function v12SaveSupplier() {
  const name=v12Val("nsName");if(!name){showToast("请填写供应商名称");return;}
  if(v12Sup(name)){showToast("供应商已存在");return;}
  const spend=Number(v12Val("nsSpend"))||0;
  (v12().suppliers ||= []).push({name,cat:v12Val("nsCat"),region:v12Val("nsRegion")||"—",spend,items:[v12Val("nsCat")],category:v12Val("nsCatCode"),emission:spend*0.6,uscc:v12Val("nsUscc"),contactName:v12Val("nsContact"),mail:v12Val("nsMail")});
  v12SupRefresh();v12Persist();closeModal();render();showToast("供应商已新增");
}
function v12OpenSupplier(code,tab) {
  const s=v12Sup(code);if(!s)return;
  tab=tab||"base";v12State.supOpen=code;
  const tasks=v12SupTasksAll().filter(t=>t.supplier===s.name);
  const avg=V12_ESG_AXES.map((_,i)=>Math.round(v12Suppliers().reduce((a,x)=>a+x.esgVals[i],0)/v12Suppliers().length));
  let body="";
  if(tab==="base")body='<dl class="detailList">'+[["供应商编码",s.code],["物资类别",s.cat],["地区",s.region],["分级",s.tier+"供应商"],["主要采购物资",s.items.join("、")],["年采购额",fmt(s.spend,0)+" 万元"],["范围三类别",v12CatLabel(s.category)],["采购相关排放",fmt(s.emission,0)+" tCO₂e（"+s.method+"）"],["管理体系认证",s.certs.join("、")||"无"],["碳数据联系人",s.contactName||s.contact],["数据来源",s.src==="ERP"?"ERP 供应商主数据":"手工维护"]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v12H(v)+'</dd></div>').join("")+'</dl>';
  if(tab==="esg")body='<div class="v12EsgView">'+v12Radar(V12_ESG_AXES,[{values:s.esgVals,color:"#26890D"},{values:avg,color:"#98A2B3"}],{size:280})+'<div>'+v12LegendRow([[s.name,"#26890D"],["供应商平均","#98A2B3"]])+
    v12Table(["维度","得分","平均","评价依据"],V12_ESG_AXES.map((a,i)=>[a,'<b>'+s.esgVals[i]+'</b>',avg[i],["ISO 14001、环保处罚记录、排污许可","碳盘查、减排目标、碳数据响应","安全事故、劳工合规、社区关系","反腐败、信息披露、股权结构","二级供应商管理、绿色采购"][i]]),{nopage:true})+
    '<p class="v12Hint">综合评分 <b>'+s.esg+'</b> · 风险等级 '+v12Tag(s.risk,{"高":"bad","中":"warn","低":"ok"}[s.risk])+'</p></div></div>';
  if(tab==="carbon")body=v12Table(["数据收集任务","范围三类别","申报值","排放 tCO₂e","状态"],tasks.map(t=>[v12H(t.name),v12CatLabel(t.category),t.unitCarbon?t.unitCarbon+" kgCO₂e/"+v12H(t.unit):"—",t.unitCarbon?fmt(v12SupEmission(t),0):"—",v12Tag(t.status,{"通过":"ok","待审核":"blue","退回":"bad"}[t.status]||"warn")]),{nopage:true,empty:"尚未发起数据收集"})+
    '<p class="v12Hint">当前核算方式：'+v12H(s.method)+'。一手数据经两级审核后入库供应链因子，下一核算周期替换支出法 / 行业平均结果。</p>';
  if(tab==="dd"){
    const items=[["环境合规","近三年无重大环保处罚",s.esgVals[0]>60],["温室气体盘查","已开展组织层面盘查",s.esgVals[1]>65],["减排目标","设定量化减排目标",s.esgVals[1]>80],["安全生产","近三年无较大以上安全事故",s.esgVals[2]>55],["商业道德","签署供应商行为准则",s.esgVals[3]>50],["二级供应商","识别关键二级供应商",s.esgVals[4]>60]];
    body='<div class="v12DDHead">'+v12Tag("尽调 "+s.dd,s.dd==="已完成"?"ok":s.dd==="进行中"?"blue":"warn")+'<span>上次尽调 '+(s.dd==="已完成"?"2026-0"+(3+s.code.charCodeAt(6)%6)+"-15":"—")+'</span></div>'+
      '<ul class="v12Checks">'+items.map(([a,b,ok])=>'<li class="'+(ok?'pass':'fail')+'"><i>'+(ok?'✓':'!')+'</i><span>'+a+'<small> · '+b+'</small></span><small>'+(ok?'符合':'需整改')+'</small></li>').join("")+'</ul>';
  }
  v12Modal(v12H(s.name)+' <small class="muted">'+s.code+'</small>',v12Tabs([["base","基本信息"],["esg","ESG 画像"],["carbon","碳数据"],["dd","尽职调查"]],tab,"v12SupTab")+'<div class="v12ModalBody">'+body+'</div>',
    '<button class="btn" data-close-modal="1">关闭</button>'+(tab==="dd"&&s.dd!=="已完成"&&!v12Is("supplier")?'<button class="btn" onclick="v12StartDD(\''+s.code+'\')">'+(s.dd==="进行中"?'完成尽调':'启动尽调')+'</button>':'')+
    (!v12Is("supplier")?'<button class="btn" onclick="v12State.reportSup=\''+s.code+'\';v12State.keepRep=1;closeModal();go(\'供应链碳排放\',\'供应商分析报告\')">分析报告</button><button class="btn primary" onclick="closeModal();v12NewSupTask(\''+s.code+'\')">发起数据收集</button>':''));
}
function v12SupTab(t){v12OpenSupplier(v12State.supOpen,t);}
function v12StartDD(code){const s=v12Sup(code);(v12().dd ||= {})[s.name]=s.dd==="进行中"?"已完成":"进行中";v12SupRefresh();v12Persist();v12OpenSupplier(code,"dd");render();showToast("尽调状态已更新");}

// ================= 数据收集与审核 =================
function v12SupCollect() {
  const tasks=v12SupTasksAll(),f=v12State.supTaskSt||"";
  const list=tasks.filter(t=>!f||t.status===f||(f==="逾期"&&["待填报","草稿","退回"].includes(t.status)&&daysUntil(t.deadline)<0));
  const c=k=>tasks.filter(t=>t.status===k).length;
  return v12Head("收集任务",'<button class="btn" onclick="v12RemindAll()">批量催办</button><button class="btn primary" onclick="v12NewSupTask()">发起收集任务</button>')+
    '<div class="statRow five">'+[["全部",tasks.length,""],["待填报",c("待填报")+c("草稿"),"待填报"],["待审核",c("待审核"),"待审核"],["退回",c("退回"),"退回"],["已通过",c("通过"),"通过"]].map(([l,v,k])=>v12Kpi(l,String(v),"项","v12Set('supTaskSt','"+k+"')")).join("")+'</div>'+
    v12Panel("数据收集任务",v12Table(["供应商","数据对象","范围三类别","采购量","申报单位碳排","截止日期","当前节点","状态",""],list.map(t=>{
      const late=["待填报","草稿","退回"].includes(t.status)&&daysUntil(t.deadline)<0;
      return {click:t.open,cells:['<strong>'+v12H(t.supplier)+'</strong>',v12H(t.name),v12CatLabel(t.category),fmt(t.qty,0)+" "+v12H(t.unit),t.unitCarbon?t.unitCarbon+'<small>kgCO₂e/'+v12H(t.unit)+'</small>':'—',
        t.deadline+(late?'<small class="badText">逾期 '+(-daysUntil(t.deadline))+' 天</small>':''),v12H(t.node),v12Tag(t.status,{"通过":"ok","待审核":"blue","退回":"bad"}[t.status]||"warn"),
        ["待填报","草稿","退回"].includes(t.status)?'<button class="linkBtn" onclick="event.stopPropagation();v12RemindSup(\''+t.id+'\')">催办</button>':'<button class="linkBtn">查看</button>']};
    }),{empty:"没有符合条件的任务"}));
}
function v12RemindAll(){const n=v12SupTasksAll().filter(t=>["待填报","草稿","退回"].includes(t.status)).length;showToast("已向 "+n+" 项未完成任务的供应商发送催办");}
function v12NewSupTask(code) {
  const sups=v12Suppliers();
  v12Modal("发起数据收集任务",'<div class="modalForm">'+v12Field("供应商",'<select id="ntSup">'+sups.map(s=>'<option value="'+s.code+'" '+(s.code===code?'selected':'')+'>'+v12H(s.name)+'</option>').join("")+'</select>',"wide")+
    v12Field("数据对象（采购物资 / 服务）",'<input id="ntItem" placeholder="如：J55 油套管">')+v12Field("范围三类别",'<select id="ntCat">'+["C01","C02","C04","C09"].map(c=>'<option value="'+c+'">'+v12CatLabel(c)+'</option>').join("")+'</select>')+
    v12Field("采购量",'<input id="ntQty" type="number" min="0">')+v12Field("计量单位",'<input id="ntUnit" value="t">')+v12Field("截止日期",'<input id="ntDue" type="date" value="2026-12-20">')+
    v12Field("数据要求",'<select id="ntReq"><option>单位产品碳足迹（摇篮到大门，附报告或计算表）</option><option>运输单位周转量排放（附燃油 / 电耗记录）</option><option>服务过程排放（附能耗清单）</option></select>',"wide")+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveSupTask()">下发任务</button>');
}
function v12SaveSupTask() {
  const s=v12Sup(v12Val("ntSup")),item=v12Val("ntItem");
  if(!s||!item){showToast("请选择供应商并填写数据对象");return;}
  v12SupTasksRaw().push({id:"ST-"+Date.now().toString().slice(-6),supplier:s.name,name:item+" 单位产品碳排放",item,category:v12Val("ntCat"),unit:v12Val("ntUnit")||"t",qty:Number(v12Val("ntQty"))||0,status:"待填报",deadline:v12Val("ntDue")||"2026-12-20",req:v12Val("ntReq")});
  v12Persist();closeModal();render();showToast("任务已下发至 "+s.name);
}
const V12_SUP_FLOW = [["供应商填报","供应商碳数据联系人"],["采购初审","物资采购中心 · 陈思远"],["碳管理复核","集团 ESG 管理部 · 高文博"],["入库供应链因子","下一核算周期替换支出法"]];
function v12SupFlowIdx(t){return t.status==="通过"?4:t.status==="待审核"?(t.stage===2?2:1):0;}
function v12SupReview() {
  const tab=v12State.supRevTab||"todo",all=v12SupTasksAll();
  const mine=t=>t.status==="待审核";
  const todo=all.filter(mine),done=all.filter(t=>["通过","退回"].includes(t.status)||(t.status==="待审核"&&!mine(t)));
  const list=tab==="todo"?todo:done;
  return v12Head("审核任务")+v12Panel("审批流程",'<div class="v12FlowDef">'+v12Steps(V12_SUP_FLOW,-1)+'</div>')+
    v12Tabs([["todo","待我审核",todo.length],["done","已处理 / 其他节点",done.length]],tab,"v12SupRevSet")+
    v12Panel(tab==="todo"?"待我审核":"已处理",v12Table(["供应商","数据对象","申报值","核算方法","提交时间","当前节点","状态",""],list.map(t=>({click:t.open,cells:['<strong>'+v12H(t.supplier)+'</strong>',v12H(t.name),t.unitCarbon?t.unitCarbon+' kgCO₂e/'+v12H(t.unit)+'<small>折合 '+fmt(v12SupEmission(t),0)+' tCO₂e</small>':'—',v12H(t.method||"—"),t.submitted||"—",v12H(t.node),v12Tag(t.status,{"通过":"ok","待审核":"blue","退回":"bad"}[t.status]||"warn"),'<button class="btn'+(tab==="todo"?' primary':'')+'">'+(tab==="todo"?'审核':'查看')+'</button>']})),{empty:"暂无待审核任务"}));
}
function v12SupRevSet(t){v12Set("supRevTab",t);}
function v12SupplierTaskPage() {
  const tasks=v12SupplierMyTasks(),me=v12MySupplierName(),s=v12Sup(me);
  return v12Head("我的填报任务")+'<div class="v12SupBanner"><div><b>'+v12H(me)+'</b><small>客户：北辰石油天然气集团有限公司 · 物资采购中心</small></div><span>'+tasks.filter(t=>t.status==="通过").length+' / '+tasks.length+' 已通过</span></div>'+
    v12Panel("填报任务",v12Table(["数据对象","范围三类别","采购量","截止日期","当前节点","状态",""],tasks.map(t=>({click:t.open,cells:['<strong>'+v12H(t.name)+'</strong>'+(t.note&&t.status==="退回"?'<small class="badText">退回：'+v12H(t.note)+'</small>':''),v12CatLabel(t.category),fmt(t.qty,0)+" "+v12H(t.unit),t.deadline,v12H(t.node),
      v12Tag(t.status,{"通过":"ok","待审核":"blue","退回":"bad"}[t.status]||"warn"),'<button class="btn'+(["待填报","草稿","退回"].includes(t.status)?' primary':'')+'">'+(["待填报","草稿","退回"].includes(t.status)?'填报':'查看')+'</button>']})),{empty:"暂无任务"}))+
    v12Panel("填报说明",'<ol class="v12Ol"><li>优先填报经第三方核查的产品碳足迹（从摇篮到大门），上传报告或证书。</li><li>无产品碳足迹时，按工艺能耗法计算：单位碳排 =（燃料 × 排放因子 + 电力 × 电网因子 + 外购原料隐含碳）÷ 产量。</li><li>例：油套管 1 t 耗电 420 kWh、天然气 38 Nm³、热轧卷 1.05 t（1,850 kgCO₂e/t），则单位碳排 ≈ 420×0.5703 + 38×2.16 + 1.05×1,850 ≈ 2,264 kgCO₂e/t。</li></ol>');
}
function v12OpenSupTask(id) {
  const t=v12SupTasksRaw().find(x=>x.id===id);if(!t)return;
  const supplierView=v12Is("supplier"),editable=supplierView&&["待填报","草稿","退回"].includes(t.status);
  const canReview=!supplierView&&t.status==="待审核"&&v12Is("carbonAdmin");
  const idx=v12SupFlowIdx(t);
  const ro=editable?'':' readonly';
  const log=(t.log||[]).map(l=>'<li><b>'+l[0]+'</b> '+v12H(l[1])+' · '+v12H(l[2])+'</li>').join("");
  v12Modal(v12H(t.name),'<div class="taskContext"><span>'+v12H(t.supplier)+'</span><span>'+v12CatLabel(t.category)+'</span><span>截止 '+t.deadline+'</span></div>'+v12Steps(V12_SUP_FLOW,idx)+
    (t.note&&t.status==="退回"?'<p class="reviewNote">退回意见 · '+v12H(t.note)+'</p>':'')+
    '<div class="modalForm">'+v12Field("采购量（"+v12H(t.unit)+"）",'<input id="stQty" type="number" value="'+(t.qty||"")+'" readonly>')+
    v12Field("核算方法",'<select id="stMethod" '+(editable?'':'disabled')+'>'+["产品碳足迹报告","工艺能耗法","燃油消耗法（IMO DCS）","行业平均因子"].map(m=>'<option '+(m===t.method?'selected':'')+'>'+m+'</option>').join("")+'</select>')+
    v12Field("单位碳排（kgCO₂e / "+v12H(t.unit)+"）",'<input id="stUc" type="number" min="0" step="any" value="'+(t.unitCarbon??"")+'" oninput="v12SupPreview()"'+ro+'>')+
    v12Field("数据期间",'<input id="stPeriod" value="'+v12H(t.period||"2025-01 至 2025-12")+'"'+ro+'>')+
    v12Field("证明材料",editable?'<input id="stFile" type="file" accept=".pdf,.xlsx,.png,.jpg">':'<input value="'+v12H(t.evidence||"—")+'" readonly>')+
    v12Field("第三方核查",'<select id="stVerify" '+(editable?'':'disabled')+'><option>有（附核查声明）</option><option '+(t.verified===false?'selected':'')+'>无</option></select>')+'</div>'+
    '<p class="calcPreview" id="stPreview">'+(t.unitCarbon?'折合排放 <b>'+fmt(v12SupEmission(t),1)+' tCO₂e</b> = '+fmt(t.qty,0)+' '+v12H(t.unit)+' × '+t.unitCarbon+' ÷ 1000':'填写单位碳排后自动计算')+'</p>'+
    (log?'<details class="calculationHelp" open><summary>审批记录</summary><ul class="v12Log">'+log+'</ul></details>':'')+
    (canReview?'<label class="v12Wide">审核意见<input id="stNote" placeholder="退回时必填"></label>':''),
    '<button class="btn" data-close-modal="1">关闭</button>'+(editable?'<button class="btn" onclick="v12SubmitSupTask(\''+id+'\',false)">保存草稿</button><button class="btn primary" onclick="v12SubmitSupTask(\''+id+'\',true)">提交审核</button>':'')+
    (canReview?'<button class="btn red" onclick="v12ReviewSupTask(\''+id+'\',false)">退回</button><button class="btn primary" onclick="v12ReviewSupTask(\''+id+'\',true)">'+(t.stage===2?'复核通过 · 入库供应链因子':'初审通过')+'</button>':''));
}
function v12SupPreview() {
  const t=v12SupTasksRaw().find(x=>document.getElementById("stQty")&&Number(document.getElementById("stQty").value)===x.qty)||{};
  const uc=Number(v12Val("stUc")),qty=Number(v12Val("stQty"));
  const el=document.getElementById("stPreview");if(el)el.innerHTML=uc?'折合排放 <b>'+fmt(qty*uc/1000,1)+' tCO₂e</b>':'填写单位碳排后自动计算';
}
async function v12SubmitSupTask(id,submit) {
  const t=v12SupTasksRaw().find(x=>x.id===id);
  const uc=v12Val("stUc"),file=document.getElementById("stFile")?.files?.[0];
  if(submit&&(!uc||!Number.isFinite(+uc)||+uc<=0)){showToast("请填写有效的单位碳排");return;}
  if(submit&&!file&&!t.evidence){showToast("请上传证明材料");return;}
  Object.assign(t,{unitCarbon:uc?+uc:t.unitCarbon,method:v12Val("stMethod"),period:v12Val("stPeriod"),verified:v12Val("stVerify")!=="无",evidence:file?file.name:t.evidence,status:submit?"待审核":"草稿",stage:submit?1:0,submitted:submit?v12Now():t.submitted});
  (t.log ||= []).push([v12Now(),v12MySupplierName(),submit?"提交审核":"保存草稿"]);
  v12Persist();closeModal();render();showToast(submit?"已提交，等待采购初审":"草稿已保存");
}
function v12ReviewSupTask(id,ok) {
  const t=v12SupTasksRaw().find(x=>x.id===id),note=v12Val("stNote");
  if(!ok&&!note){showToast("请填写退回原因");return;}
  const who=(t.stage===2?"高文博（碳管理复核）":"陈思远（采购初审）");
  if(!ok){t.status="退回";t.note=note;t.stage=0;}
  else if(t.stage===2){t.status="通过";t.stage=0;}
  else t.stage=2;
  (t.log ||= []).push([v12Now(),who,ok?(t.status==="通过"?"复核通过，入库供应链因子":"初审通过")+(note?"："+note:""):"退回："+note]);
  v12Persist();closeModal();render();showToast(ok?(t.status==="通过"?"已入库":"初审通过，转碳管理复核"):"已退回供应商");
}

// ================= 供应商分析报告 =================
function v12SupReports(){const v=v12();if(!v.supReports){v.supReports={};v12Suppliers().slice().sort((a,b)=>b.emission-a.emission).slice(0,6).forEach((x,i)=>v.supReports[x.code]={at:"2026-11-"+String(18+i).padStart(2,"0"),by:"陈思远",sent:i<4});}return v.supReports;}
function v12SupReportList() {
  const sups=v12Suppliers().slice().sort((a,b)=>b.emission-a.emission),rep=v12SupReports(),tasks=v12SupTasksAll();
  const f=v12State.repCat||"",q=(v12State.repQ||"").toLowerCase();
  const list=sups.filter(x=>(!f||x.cat===f)&&(!q||(x.name+x.code).toLowerCase().includes(q)));
  return v12Head("供应商分析报告",'<button class="btn primary" onclick="v12BatchSupReport()">批量生成</button>')+
    '<div class="statRow">'+v12Kpi("供应商",String(sups.length),"家 · 每家一份年度报告")+v12Kpi("已生成",String(Object.keys(rep).length),"份")+v12Kpi("已发送供应商",String(Object.values(rep).filter(r=>r.sent).length),"份")+v12Kpi("待生成",String(sups.length-Object.keys(rep).length),"份")+'</div>'+
    v12Panel(reportYear+" 年度供应商报告",'<div class="taskToolbar"><label>物资类别<select onchange="v12Set(\'repCat\',this.value)"><option value="">全部</option>'+V12_SUP_CATS.map(c=>'<option '+(c===f?'selected':'')+'>'+c+'</option>').join("")+'</select></label><label class="taskSearch">搜索<input placeholder="供应商名称 / 编码" value="'+v12H(v12State.repQ||"")+'" onchange="v12Set(\'repQ\',this.value)"></label><span>'+list.length+' 家</span></div>'+
      v12Table(["供应商","物资类别","分级","采购相关排放 (tCO₂e)","碳数据","ESG","报告","操作"],list.map(x=>{const r=rep[x.code],ts=tasks.filter(t=>t.supplier===x.name);
        return {click:"v12State.reportSup='"+x.code+"';render()",cells:['<strong>'+v12H(x.name)+'</strong><small class="muted"> '+x.code+'</small>',x.cat,x.tier,fmt(x.emission,0),ts.length?ts.filter(t=>t.status==="通过").length+" / "+ts.length+" 已通过":'<span class="muted">支出法估算</span>',x.esg,
          r?v12Tag(r.sent?"已发送":"已生成",r.sent?"ok":"blue")+'<small class="muted"> '+r.at+'</small>':v12Tag("待生成","gray"),
          '<button class="linkBtn" onclick="event.stopPropagation();v12State.reportSup=\''+x.code+'\';render()">'+(r?"查看":"生成")+'</button>'+(r&&!r.sent?'<button class="linkBtn" onclick="event.stopPropagation();v12SendSupReport(\''+x.code+'\')">发送</button>':'')]};})));
}
function v12BatchSupReport(){const rep=v12SupReports();let n=0;v12Suppliers().forEach(x=>{if(!rep[x.code]){rep[x.code]={at:v12Today(),by:v12Person(),sent:false};n++;}});v12Persist();render();showToast("已生成 "+n+" 份报告");}
function v12SendSupReport(code){const r=v12SupReports()[code];if(r){r.sent=true;r.sentAt=v12Today();}v12Persist();render();showToast("报告已发送至供应商门户");}
function v12SupReport() {
  const sups=v12Suppliers();
  if(v12Is("supplier"))v12State.reportSup=v12Sup(v12MySupplierName())?.code;
  else if(!v12State.reportSup||!v12Sup(v12State.reportSup))return v12SupReportList();
  const s=v12Sup(v12State.reportSup);
  if(!v12Is("supplier")){const rep=v12SupReports();if(!rep[s.code]){rep[s.code]={at:v12Today(),by:v12Person(),sent:false};v12Persist();}}
  const tasks=v12SupTasksAll().filter(t=>t.supplier===s.name);
  const all=sups.slice().sort((a,b)=>b.emission-a.emission),rank=all.findIndex(x=>x.code===s.code)+1;
  const s3=yearTotals?yearTotals(reportYear):null;
  const totalSup=all.reduce((a,x)=>a+x.emission,0);
  const peers=sups.filter(x=>x.cat===s.cat);
  const peerInt=peers.reduce((a,x)=>a+x.intensity,0)/(peers.length||1);
  const avg=V12_ESG_AXES.map((_,i)=>Math.round(sups.reduce((a,x)=>a+x.esgVals[i],0)/sups.length));
  const T=(h,r,c)=>v12DocTable(h,r,{caption:c});const P=t=>'<p>'+t+'</p>';
  const hist=[[reportYear-2,s.intensity*1.09],[reportYear-1,s.intensity*1.04],[reportYear,s.intensity]];
  const sections=[
    {title:"1 供应商概况",body:T(["项目","内容"],[["供应商名称",v12H(s.name)],["供应商编码",s.code],["物资类别",s.cat],["地区",s.region],["分级",s.tier+"供应商"],["主要采购物资",v12H(s.items.join("、"))],["管理体系认证",s.certs.join("、")||"无"]],"表 1-1 基本信息")},
    {title:"2 采购与范围三贡献",body:P(reportYear+" 年度北辰石油向贵司采购 "+fmt(s.spend,0)+" 万元，对应采购相关排放 "+fmt(s.emission,0)+" tCO₂e，计入北辰石油"+v12CatLabel(s.category)+"。当前核算方式为「"+v12H(s.method)+"」。")+
      T(["指标","贵司","同品类平均"],[["碳强度（tCO₂e / 万元）",s.intensity.toFixed(3),peerInt.toFixed(3)],["较同品类平均",((s.intensity-peerInt)/(peerInt||1)*100>0?"+":"")+((s.intensity-peerInt)/(peerInt||1)*100).toFixed(1)+"%","—"],["范围三类别",v12CatLabel(s.category),"—"]],"表 2-1 排放强度对比（同品类平均为匿名统计）")+
      v12Fig(v12Columns(hist.map(h=>({label:h[0]+" 年",value:h[1],color:h[0]===reportYear?"#26890D":"#A3C77A",display:h[1].toFixed(3),target:peerInt})),{width:560,height:230,barW:56,axisFmt:v=>v.toFixed(2)}),"图 2-1 贵司碳强度变化（红线：同品类平均）")},
    {title:"3 碳数据提交与质量",body:T(["数据对象","单位碳排","核算方法","状态"],tasks.map(t=>[v12H(t.name),t.unitCarbon?t.unitCarbon+" kgCO₂e/"+v12H(t.unit):"—",v12H(t.method||"—"),t.status]),"表 3-1 数据收集任务")+
      P(tasks.length?"共下发 "+tasks.length+" 项数据收集任务，已通过 "+tasks.filter(t=>t.status==="通过").length+" 项。"+(tasks.some(t=>t.status==="退回")?"存在退回任务，主要问题为一手数据不足。":""):"尚未发起数据收集任务，当前采用支出法估算。")},
    {title:"4 ESG 评估",body:v12Fig(v12Radar(V12_ESG_AXES,[{values:s.esgVals,color:"#26890D"},{values:avg,color:"#98A2B3"}],{size:260}),"图 4-1 ESG 画像（绿色：本供应商；灰色：平均）")+
      T(["维度","得分","平均"],V12_ESG_AXES.map((a,i)=>[a,s.esgVals[i],avg[i]]).concat([{cls:"total",cells:["综合",s.esg,Math.round(avg.reduce((a,b)=>a+b,0)/avg.length)]}]),"表 4-1 ESG 评分")},
    {title:"5 尽职调查与风险",body:T(["项目","结论"],[["风险等级",s.risk],["尽调状态",s.dd],["主要关注点",v12H(v12SupConcern(s))]],"表 5-1 风险评估")},
    {title:"6 改进建议",body:'<ol>'+[s.method!=="供应商一手数据"?"提交经核查的产品碳足迹，替代支出法估算，预计可提高范围三数据质量等级。":"保持年度产品碳足迹更新，并扩大覆盖的产品规格。",
      s.esgVals[1]<70?"开展组织层面温室气体盘查并设定量化减排目标。":"将减排目标与北辰石油范围三目标（2030 年下降 17.5%）对齐。",
      !s.certs.includes("ISO 14001")?"建立 ISO 14001 环境管理体系。":"推进 ISO 50001 能源管理体系认证。",
      s.risk==="高"?"列入重点跟踪名单，2027 年一季度前完成现场尽调。":"按年度频次复评。"].map(x=>'<li>'+x+'</li>').join("")+'</ol>'}
  ];
  if(v12Is("supplier")){sections.splice(4,1);sections[4].title="5 改进建议";}
  const doc=v12Doc({title:s.name+" 供应商碳绩效分析报告",titleLines:[s.name,"供应商碳绩效分析报告"],en:"Supplier Carbon Performance Report",sub:reportYear+" 年度",
    meta:[["供应商编码",s.code],["物资类别",s.cat],...(v12Is("supplier")?[]:[["风险等级",s.risk]]),["编制单位","北辰石油 · 物资采购中心"],["编制日期",v12Today()]],org:"北辰石油天然气集团有限公司",date:v12Today().slice(0,7).replace("-"," 年 ")+" 月"},sections);
  const r=v12SupReports()[s.code];
  const pick=v12Is("supplier")?'':'<button class="btn" onclick="v12State.reportSup=\'\';render()">‹ 返回报告列表</button>'+(r&&!r.sent?'<button class="btn" onclick="v12SendSupReport(\''+s.code+'\')">发送给供应商</button>':'');
  return v12Head(v12Is("supplier")?"供应商分析报告":v12H(s.name),pick+v12DocMenu(),v12Is("supplier")?"":"供应链碳排放 / 供应商分析报告 / "+v12H(s.name))+'<div class="wdWrap">'+doc+'</div>';
}

// ================= 首页卡片 =================
function v12SupplierHomeCard() {
  const me=v12MySupplierName(),s=v12Sup(me),tasks=v12SupplierMyTasks();
  return v12Panel("我的碳数据档案",'<div class="v12LcaCards"><button onclick="go(\'供应链碳排放\',\'供应商分析报告\')"><span>ESG 综合评分</span><b>'+(s?s.esg:"—")+'</b><small>满分 100 · 按 ESG 问卷与碳数据质量评定</small></button>'+
    '<button onclick="go(\'供应链碳排放\',\'数据收集与审核\')"><span>已通过数据</span><b>'+tasks.filter(t=>t.status==="通过").length+' / '+tasks.length+'</b><small>项填报任务</small></button></div>'+
    '<ul class="v12Ol"><li>客户要求：2026-12-15 前提交本年度采购物资单位产品碳排放。</li><li>经第三方核查的产品碳足迹可直接作为一级数据使用。</li></ul>');
}
function v12SupplyHomeCard() {
  const tasks=v12SupTasksAll(),sups=v12Suppliers();
  return v12Panel("供应链碳数据",'<div class="v12LcaCards"><button onclick="go(\'供应链碳排放\',\'数据收集与审核\',\'收集任务\')"><span>数据收集</span><b>'+tasks.filter(t=>t.status==="通过").length+' / '+tasks.length+'</b><small>已通过 · 逾期 '+tasks.filter(t=>["待填报","草稿","退回"].includes(t.status)&&daysUntil(t.deadline)<0).length+' 项</small></button>'+
    '<button onclick="go(\'供应链碳排放\',\'供应商管理\')"><span>高风险供应商</span><b class="badText">'+sups.filter(s=>s.risk==="高").length+'</b><small>尽调待启动 '+sups.filter(s=>s.dd==="待启动").length+' 家</small></button></div>',
    '<button class="linkBtn" onclick="go(\'供应链碳排放\',\'供应链看板\')">看板 ›</button>');
}

Object.assign(V12_PAGES_EXTRA, {
  "供应链碳排放|供应链看板":()=>v12SupplyDash(),
  "供应链碳排放|供应商管理":()=>v12SupplierMgmt(),
  "供应链碳排放|数据收集与审核|收集任务":()=>v12SupCollect(),
  "供应链碳排放|数据收集与审核|审核任务":()=>v12SupReview(),
  "供应链碳排放|数据收集与审核|我的填报任务":()=>v12SupplierTaskPage(),
  "供应链碳排放|供应商分析报告":()=>v12SupReport()
});

(function(){
  const css=`.v12StackBar{display:flex;height:22px;border-radius:4px;overflow:hidden;margin:6px 0 8px;background:#F2F4F7}.v12StackBar i{display:block;height:100%}
.v12H4{font-size:13px;margin:16px 0 6px;color:#344054}
.v12Line{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid #F2F4F7;font-size:13px}.v12Line small{display:block;color:var(--sub);font-size:11px}
.v12EsgView{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start}
.v12DDHead{display:flex;gap:12px;align-items:center;margin-bottom:10px;color:var(--sub);font-size:13px}
.v12SupBanner{display:flex;justify-content:space-between;align-items:center;background:#F3F8EA;border:1px solid #D9EAC0;border-radius:8px;padding:14px 18px;margin-bottom:14px}
.v12SupBanner b{font-size:16px}.v12SupBanner small{display:block;color:var(--sub);font-size:12px}.v12SupBanner span{font-weight:700;color:#26890D}
.v12Log{margin:6px 0;padding-left:18px;font-size:12.5px;line-height:1.8}
.v12Wide{display:grid;gap:4px;margin-top:10px;font-size:12px;color:var(--sub)}.v12Wide input{height:34px;border:1px solid #d6dce2;border-radius:5px;padding:0 10px}
.v12QL{font-size:11px;fill:#98A2B3}
.status.blue{background:#EAF2FB;color:#1F5F99}
@media(max-width:900px){.v12EsgView{grid-template-columns:1fr}}`;
  const el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
})();

(function(){const g=go;go=function(top,group,page){if(group==="供应商分析报告"&&!v12State.keepRep)v12State.reportSup="";v12State.keepRep=0;return g.apply(this,arguments);};})();
