// v12：碳盘查报告（组织温室气体排放报告），GHG Protocol 与 ISO 14064-1:2018 两版，贴近 Word 版式，可导出 Word / PDF。

const V12_ISO_CATS = [
  {no:"1",name:"类别1：直接温室气体排放和清除",en:"Direct GHG emissions and removals",subs:[["1.1","固定燃烧源的排放",r=>v12IsoS1(r,"固定燃烧")],["1.2","移动燃烧源的排放",r=>v12IsoS1(r,"移动燃烧")],["1.3","工业过程排放和清除",r=>v12IsoS1(r,"工业过程")||v12IsoS1(r,"回收")],["1.4","人为系统逸散排放（含火炬、放空）",r=>v12IsoS1(r,"逸散")],["1.5","土地利用、土地利用变化和林业",()=>false]]},
  {no:"2",name:"类别2：输入能源的间接温室气体排放",en:"Indirect GHG emissions from imported energy",subs:[["2.1","输入电力产生的间接排放",r=>String(r.scope)==="2"&&v12Kind(r)==="外购电力"],["2.2","输入热力 / 蒸汽产生的间接排放",r=>String(r.scope)==="2"&&v12Kind(r)!=="外购电力"]]},
  {no:"3",name:"类别3：运输产生的间接温室气体排放",en:"Indirect GHG emissions from transportation",subs:[["3.1","货物上游运输和配送",r=>r.category_code==="C04"],["3.2","货物下游运输和配送",r=>r.category_code==="C09"],["3.3","员工通勤",r=>r.category_code==="C07"],["3.4","客户和访客交通",()=>false],["3.5","商务差旅",r=>r.category_code==="C06"]]},
  {no:"4",name:"类别4：组织使用产品的间接温室气体排放",en:"Indirect GHG emissions from products used by organization",subs:[["4.1","购买货物",r=>r.category_code==="C01"],["4.2","资本货物",r=>r.category_code==="C02"],["4.3","固体和液体废物处置",r=>r.category_code==="C05"],["4.4","资产使用（上游租赁）",r=>r.category_code==="C08"],["4.5","燃料和能源相关活动（未包含在类别1、2）",r=>r.category_code==="C03"]]},
  {no:"5",name:"类别5：与使用组织产品相关的间接温室气体排放",en:"Indirect GHG emissions associated with the use of products",subs:[["5.1","产品使用阶段",r=>r.category_code==="C11"],["5.2","下游租赁资产",r=>r.category_code==="C13"],["5.3","产品寿命终止阶段",r=>r.category_code==="C12"],["5.4","售出中间产品的加工",r=>r.category_code==="C10"]]},
  {no:"6",name:"类别6：其他来源的间接温室气体排放",en:"Indirect GHG emissions from other sources",subs:[["6.1","特许经营",r=>r.category_code==="C14"],["6.2","投资",r=>r.category_code==="C15"]]}
];
function v12IsoS1(r,kind) {
  if(String(r.scope)!=="1")return false;
  const k=v12Kind(r);
  if(kind==="逸散")return ["逸散排放","工艺放空","火炬燃烧"].includes(k);
  if(kind==="回收")return k.startsWith("回收");
  if(kind==="固定燃烧")return k==="固定燃烧";
  return k===kind;
}
function v12GasSplit(rows) {
  const g={CO2:0,CH4:0,N2O:0,HFCs:0};
  rows.forEach(r=>{
    const src=String(r.scope)==="1"?v12SrcOf(r):null;
    if(src&&src.method==="gwp"){g.HFCs+=r.emission_tco2e;return;}
    if(src){const c=petroCalc(src,demo.taskEntries?.[src.id]?.params,src.activity);const share=c.co2e?c.ch4*c.gwp/c.co2e:0;g.CH4+=r.emission_tco2e*share;g.CO2+=r.emission_tco2e*(1-share);return;}
    if(String(r.scope)==="3"&&["C11","C12"].includes(r.category_code)){g.CO2+=r.emission_tco2e*0.996;g.CH4+=r.emission_tco2e*0.003;g.N2O+=r.emission_tco2e*0.001;return;}
    g.CO2+=r.emission_tco2e;
  });
  return g;
}
function v12DQ(rows) {
  const t={一级:0,二级:0,三级:0};rows.forEach(r=>{const k=String(r.quality||"一级").slice(0,2);t[k]=(t[k]||0)+r.emission_tco2e;});
  const all=rows.reduce((s,r)=>s+r.emission_tco2e,0)||1;
  const score=(t["一级"]*1+t["二级"]*2+t["三级"]*3)/all;
  return {t,all,score,grade:score<=1.5?"一级（优）":score<=2.2?"二级（良）":"三级（一般）"};
}
function v12OrgReport() {
  const std=v12State.reportStd;
  const year=reportYear,rows=v12Detail(year),tot=v12ScopeSum(rows),all=tot["1"]+tot["2"]+tot["3"];
  const iso=std==="ISO";
  const ver=verificationOf(year);
  const b=v12Boundary();
  const cfg=v12Targets();
  const head=v12Head("碳盘查报告",v12Seg([["GHG","GHG Protocol 版"],["ISO","ISO 14064-1 版"]],std,"v12SetReportStd")+v12DocMenu(),"组织碳排放 / 碳盘查报告 · "+year+" 年度");
  const closed=year<CURRENT_YEAR;
  const cover={titleLines:[year+" 年度","北辰石油天然气集团有限公司",iso?"温室气体盘查报告书":"温室气体排放报告"],en:iso?"GHG Inventory Report (ISO 14064-1:2018)":"Corporate GHG Emissions Report (GHG Protocol)",
    meta:[["报告主体","北辰石油天然气集团有限公司"],["报告期","%Y 年 1 月 1 日至 %Y 年 12 月 31 日".replace(/%Y/g,year)],["编制依据",iso?"ISO 14064-1:2018《组织层次上对温室气体排放和清除的量化和报告的规范及指南》":"《温室气体核算体系：企业核算与报告标准》（修订版）及范围三标准"],
      ["组织边界",b.method+"法"],["报告编号","BCSY-GHG-"+year+(iso?"-ISO":"-GHGP")],["版本",closed?"V1.0（已核查）":"V0.9（初稿，盘查进行中）"]],
    org:"北辰石油天然气集团有限公司 质量健康安全环保部",date:closed?(year+1)+" 年 3 月":"2026 年 11 月"};
  const pct=v=>(v/all*100).toFixed(2)+"%";
  const segs=v12SegTotals(rows);
  const gas=v12GasSplit(rows);
  const s1k=v12SumBy(rows.filter(r=>String(r.scope)==="1"),r=>v12Kind(r));
  const s3c=v12SumBy(rows.filter(r=>String(r.scope)==="3"),"category_code");
  const s3rel=xkScope3Rows?xkScope3Rows():[];
  const dq=v12DQ(rows);
  const yearsT=REPORT_YEARS.filter(y=>y<=CURRENT_YEAR).map(y=>{const t=yearTotals(y);return [y,t["1"],t["2"],t["3"]];});
  const trendSvg=v12Columns(yearsT.map(([y,a,b2,c])=>({label:String(y),stack:[{label:"范围一",value:a,color:"#26890D"},{label:"范围二",value:b2,color:"#86BC25"}]})),{height:220,width:560,axisFmt:v=>v12Wan(v,0)+"万",valFmt:v=>v12Wan(v,0)+"万"});
  const scopePie=v12Pie([{label:"范围一",value:tot["1"],color:"#26890D"},{label:"范围二",value:tot["2"],color:"#86BC25"},{label:"范围三",value:tot["3"],color:"#2C6AA0"}],{size:200,legend:true,center:[v12Wan(all,0)+"万t","排放总量"]});
  const factorRows=[];const seen={};
  rows.filter(r=>String(r.scope)!=="3").forEach(r=>{const src=v12SrcOf(r);const k=src?src.method+"|"+(src.params?.ref||src.name):r.source_name;if(seen[k])return;seen[k]=1;
    const fm=v12Formula(r);factorRows.push([v12H(scenarioText(r.source_name)),v12H(fm.f),v12H(fm.p||"—"),src?v12H(src.params?.ref||PETRO_GUIDES[src.guide]):"—"]);});
  const s3FactorRows=rows.filter(r=>String(r.scope)==="3").slice(0,20).map(r=>[v12CatLabel(r.category_code),v12H(scenarioText(r.source_name)),(+Number(r.factor_value).toPrecision(4))+" tCO₂e/"+v12H(r.activity_unit),v12H(r.quality||"—")]);
  const measures=[["滨海石化 2 号催化裂化余热回收改造","年节能 4.2 万 tce，减排 11.0 万 tCO₂e","2026-06 投运"],["松原油田 CCUS 二期扩建","年注入埋存 CO₂ 由 120 万 t 提升至 190 万 t","2026-09 投运"],
    ["鄂南油气田伴生气回收与放空治理","放空气回收 1.8 亿 m³，减少 CH₄ 排放 9.6 万 t","持续实施"],["华北销售加油站分布式光伏","装机 186 MW，年发电 2.1 亿 kWh","1,120 座站点"],["西部管道压气站电驱替代燃驱","完成 6 座，年减排 38 万 tCO₂e","2026 年度"]];
  const plan=[["滨海石化热电厂 1 号机组掺烧生物质（10%）","预计年减排 18 万 tCO₂e"],["陇原石化氢能替代干气制氢","预计年减排 22 万 tCO₂e"],["油气田 LDAR 全覆盖与甲烷在线监测","甲烷强度降至 0.20% 以下"],["绿电采购（市场法）扩大至 60 亿 kWh","范围二（市场法）下降 30%"]];
  const sections=[];
  const summaryTable=v12DocTable(["项目","排放量（tCO₂e）","占比"],[["范围一（直接排放）",fmt(tot["1"],2),pct(tot["1"])],["范围二（能源间接排放，位置法）",fmt(tot["2"],2),pct(tot["2"])],["范围三（价值链间接排放）",fmt(tot["3"],2),pct(tot["3"])],{cls:"total",cells:["合计",fmt(all,2),"100%"]}]);
  if(!iso) {
    sections.push({title:"1 报告概述",subs:["1.1 报告摘要","1.2 编制依据"],body:'<h3>1.1 报告摘要</h3><p>北辰石油天然气集团有限公司（以下简称“北辰石油”）按照《温室气体核算体系：企业核算与报告标准》编制本年度温室气体排放报告。'+year+' 年度，北辰石油温室气体排放总量为 '+fmt(all,0)+' tCO₂e，其中范围一 '+fmt(tot["1"],0)+' tCO₂e，范围二 '+fmt(tot["2"],0)+' tCO₂e，范围三 '+fmt(tot["3"],0)+' tCO₂e。范围三中售出产品使用阶段占比最高，为 '+((s3c.C11||0)/tot["3"]*100).toFixed(1)+'%。</p>'+summaryTable+v12Fig(scopePie,"图 1-1 "+year+" 年度排放结构")+
      '<h3>1.2 编制依据</h3><ul><li>《温室气体核算体系：企业核算与报告标准》（修订版）</li><li>《温室气体核算体系：企业价值链（范围三）核算与报告标准》</li><li>《温室气体核算体系：范围二指南》</li><li>《中国石油化工企业温室气体排放核算方法与报告指南（试行）》</li><li>《中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）》</li><li>IPCC 第六次评估报告（AR6）全球增温潜势值</li></ul>'});
    sections.push({title:"2 公司简介",body:'<p>北辰石油是集油气勘探开发、炼油化工、管道储运、成品油销售和工程技术服务于一体的综合性能源企业，下设油气和新能源、炼化和新材料、天然气管道、销售、工程技术服务五大板块。'+year+' 年原油产量 '+fmt(PETRO_OUTPUT.crude.value,0)+' 万吨，天然气产量 '+fmt(PETRO_OUTPUT.gas.value,0)+' 亿立方米，原油加工量 '+fmt(PETRO_OUTPUT.refining.value,0)+' 万吨，乙烯产量 '+fmt(PETRO_OUTPUT.ethylene.value,0)+' 万吨。</p><p>北辰石油承诺持续开展温室气体盘查，建立覆盖集团、板块和企业三级的碳排放数据管理体系，以数据支撑减排目标的制定与跟踪。</p>'});
    sections.push({title:"3 组织边界",subs:["3.1 合并方法","3.2 纳入实体"],body:'<h3>3.1 合并方法</h3><p>本报告采用'+b.method+'法确定组织边界：对拥有运营控制权的业务 100% 计入排放，对合营、联营等无运营控制权的业务不计入范围一、二，其排放按持股比例在范围三类别15（投资）中报告。</p>'+
      '<h3>3.2 纳入实体</h3>'+v12DocTable(["板块","实体","控制类型","持股比例","合并比例"],[...PETRO_ENTITIES.map(e=>[petroSeg(e.org)?.name||"",e.org+(e.merged?"（"+e.merged+" 家合并）":""),b.ent[e.org]?.control||"全资",(b.ent[e.org]?.equity??100)+"%",v12BoundaryRatio(b,e.org)+"%"]),...V12_JV.map(j=>[PETRO_SEGMENTS.find(s=>s.id===j.seg).name,j.org,b.ent[j.org].control,b.ent[j.org].equity+"%",v12BoundaryRatio(b,j.org)+"%"])],{caption:"表 3-1 组织边界纳入实体"})});
    sections.push({title:"4 运营边界",subs:["4.1 范围一与范围二","4.2 范围三类别识别"],body:'<h3>4.1 范围一与范围二</h3><p>范围一包括固定燃烧、火炬燃烧、工业过程（催化裂化烧焦、制氢、乙烯裂解烧焦、环氧乙烷等）、油气生产放空与逸散；CO₂ 捕集回收量单独扣减。范围二包括外购电力与外购热力，按位置法报告，绿电电量单独披露。</p>'+
      '<h3>4.2 范围三类别识别</h3>'+v12DocTable(["类别","相关性","排放量（tCO₂e）","说明"],Object.keys(V12_S3_NAMES).map(code=>{const r=s3rel.find(x=>x.code===code)||{};return [v12CatLabel(code),r.relevance||(s3c[code]?"相关":"不相关"),s3c[code]?fmt(s3c[code],0):"—",r.reason||"—"];}),{caption:"表 4-1 范围三类别识别"})});
    sections.push({title:"5 量化方法",subs:["5.1 核算方法","5.2 活动数据与排放因子","5.3 全球增温潜势"],body:'<h3>5.1 核算方法</h3><p>范围一、二采用排放因子法和物料平衡法，按行业核算指南公式计算；范围三按 GHG Protocol 范围三标准，优先采用供应商一手数据，其次为行业平均因子，最后为支出法因子。</p>'+
      '<h3>5.2 活动数据与排放因子</h3>'+v12DocTable(["排放源","核算公式","主要参数 / 因子","来源"],factorRows,{caption:"表 5-1 范围一、二核算方法与参数"})+v12DocTable(["类别","活动","排放因子","数据质量"],s3FactorRows,{caption:"表 5-2 范围三主要排放因子"})+
      '<h3>5.3 全球增温潜势</h3>'+v12DocTable(["温室气体","化学式","GWP（AR6，100 年）"],[["二氧化碳","CO₂","1"],["甲烷","CH₄","27.9"],["氧化亚氮","N₂O","273"],["氢氟碳化物","HFC-134a","1,530"]])});
    sections.push({title:"6 排放结果",subs:["6.1 按范围","6.2 按温室气体","6.3 按板块","6.4 范围一排放源","6.5 范围三"],body:'<h3>6.1 按范围</h3>'+summaryTable+
      '<h3>6.2 按温室气体</h3>'+v12DocTable(["温室气体","排放量（tCO₂e）","占比"],Object.entries(gas).filter(([,v])=>v>0).map(([g,v])=>[g,fmt(v,0),pct(v)]))+
      '<h3>6.3 按板块（范围一+二）</h3>'+v12DocTable(["板块","排放量（tCO₂e）","占范围一+二"],segs.map(x=>[x.seg.name,fmt(x.value,0),(x.value/(tot["1"]+tot["2"])*100).toFixed(1)+"%"]))+
      '<h3>6.4 范围一排放源</h3>'+v12DocTable(["排放类型","排放量（tCO₂e）","占范围一"],Object.entries(s1k).sort((a,b2)=>b2[1]-a[1]).map(([k,v])=>[k,fmt(v,0),(v/tot["1"]*100).toFixed(1)+"%"]))+
      '<h3>6.5 范围三</h3>'+v12DocTable(["类别","排放量（tCO₂e）","占范围三"],Object.keys(V12_S3_NAMES).filter(c=>s3c[c]).map(c=>[v12CatLabel(c),fmt(s3c[c],0),(s3c[c]/tot["3"]*100).toFixed(1)+"%"]))});
    sections.push({title:"7 基准年与排放趋势",body:'<p>北辰石油以 '+cfg.baseYear+' 年为基准年。当组织结构、核算方法或数据错误导致基准年排放变化超过 '+cfg.threshold+'% 时，对基准年进行重新计算。</p>'+v12DocTable(["年度","范围一","范围二","范围三","合计"],yearsT.map(([y,a,b2,c])=>[y+(y===cfg.baseYear?"（基准年）":""),fmt(a,0),fmt(b2,0),fmt(c,0),fmt(a+b2+c,0)]),{caption:"表 7-1 历年排放（tCO₂e）"})+v12Fig(trendSvg,"图 7-1 范围一+二排放趋势")});
    sections.push({title:"8 减排目标与行动",body:v12DocTable(["目标","覆盖范围","方法","目标年","下降幅度",year+" 进展"],cfg.items.map(t=>{const s=v12TStatus(t,Math.min(year,CURRENT_YEAR));return [t.name,v12ScopeLabel(t.scope),(V12_METHODS[t.method]||V12_METHODS.custom).label,t.targetYear,t.reduction+"%","已下降 "+s.reduced.toFixed(1)+"%（"+(s.ok?"符合路径":"落后路径")+"）"];}))+
      '<h3>本年度减排行动</h3>'+v12DocTable(["项目","减排效果","进度"],measures)});
    sections.push({title:"9 数据质量与核查",body:'<p>按排放量加权，一级数据（实测 / 结算凭证）占 '+(dq.t["一级"]/dq.all*100).toFixed(1)+'%，二级数据（行业平均 / 系统派生）占 '+(dq.t["二级"]/dq.all*100).toFixed(1)+'%，三级数据（支出法 / 估算）占 '+(dq.t["三级"]/dq.all*100).toFixed(1)+'%，综合评级为'+dq.grade+'。</p>'+
      (ver?'<p>本报告由 '+ver.org+' 依据 '+ver.std+' 进行核查，保证等级为'+ver.level+'。</p>':'<p>本年度盘查进行中，计划于 '+(year+1)+' 年 4 月完成第三方核查。</p>')+'<div class="wdSign"><p>编制：质量健康安全环保部</p><p>审核：高文博</p><p>批准：集团碳达峰碳中和工作领导小组</p></div>'});
  } else {
    sections.push({title:"报告书摘要",body:'<p>为满足监管部门、投资机构和客户对碳信息披露的要求，支撑集团“双碳”目标的实现，北辰石油天然气集团有限公司（以下简称“北辰石油”）依据 ISO 14064-1:2018 开展 '+year+' 年度温室气体盘查。本次盘查资料期间为 '+year+' 年 1 月 1 日至 '+year+' 年 12 月 31 日，盘查结果'+(ver?'已经 '+ver.org+' 核查':'将于盘查完成后进行内部查证与外部核查')+'。</p>'+
      '<p>'+year+' 年度温室气体排放总量为 '+fmt(all,2)+' tCO₂e，其中类别1 直接排放 '+fmt(tot["1"],2)+' tCO₂e，类别2 输入能源间接排放 '+fmt(tot["2"],2)+' tCO₂e，类别3–6 其他间接排放合计 '+fmt(tot["3"],2)+' tCO₂e。</p>'});
    sections.push({title:"第一章 组织介绍",subs:["1.1 前言","1.2 公司简介","1.3 政策声明"],body:'<h3>1.1 前言</h3><p>全球气候变暖已成为人类共同面临的重大环境议题。北辰石油基于可持续发展理念，通过温室气体盘查掌握自身排放状况，识别减排机会，推动能源结构向清洁低碳转型。</p>'+
      '<h3>1.2 公司简介</h3><p>北辰石油下设五大业务板块及集团总部，共 '+PETRO_ENTITIES.reduce((s,e)=>s+(e.merged||1),0)+' 家所属企业，业务覆盖油气勘探开发、炼油化工、管道储运、成品油销售和工程技术服务。</p>'+
      '<h3>1.3 政策声明</h3><ul><li>致力于集团温室气体盘查，确实掌握温室气体排放状况；</li><li>积极推动节能降碳措施与持续改进，降低生产经营对气候的影响；</li><li>扩大天然气、可再生能源和 CCUS 等低碳业务；</li><li>遵守法律法规及相关方要求，定期公开披露温室气体信息。</li></ul>'});
    sections.push({title:"第二章 边界设定",subs:["2.1 报告涵盖的时间及责任","2.2 组织边界","2.3 报告边界","2.4 重要性原则","2.5 排除门槛与实质性偏差"],body:'<h3>2.1 报告涵盖的时间及责任</h3><p>本报告盘查期间为 '+year+' 年 1 月 1 日至 '+year+' 年 12 月 31 日。报告由集团质量健康安全环保部负责编制，各所属企业负责本单位活动数据的收集与填报。报告边界发生改变时，本报告一并修订并重新发行。</p>'+
      '<h3>2.2 组织边界</h3><p>依照 ISO 14064-1 并参考 GHG Protocol，以“'+b.method+'”方式设定组织边界，纳入 '+Object.keys(b.ent).filter(o=>v12BoundaryRatio(b,o)>0).length+' 家实体。</p>'+
      '<h3>2.3 报告边界</h3>'+v12DocTable(["类别 / 子类别","描述","是否量化","是否重大"],V12_ISO_CATS.flatMap(c=>[{cls:"sub",cells:[c.no,c.name,"",""]},...c.subs.map(([no,name,fn])=>{const v=rows.filter(fn).reduce((s,r)=>s+r.emission_tco2e,0);return [no,name,v?"是":"NA",c.no<="2"?"/":v/all>0.01?"是":v?"否":"NA"];})]),{caption:"表 2-1 报告边界"})+
      '<h3>2.4 重要性原则</h3><p>对间接排放类别（类别3–6）按排放量级、影响程度、风险与机会、行业指引及数据可得性综合评价，排放量占总排放 1% 以上或评分达到阈值的子类别判定为重大并予以量化。</p>'+
      '<h3>2.5 排除门槛与实质性偏差</h3><p>单一排放源小于总排放 0.5% 且累计不超过 5% 的可排除；实质性偏差以 5% 为限，超过时须更正并重新发布。</p>'});
    const isoRows=V12_ISO_CATS.flatMap(c=>{const sub=c.subs.map(([no,name,fn])=>[no,name,rows.filter(fn).reduce((s,r)=>s+r.emission_tco2e,0)]);const sum=sub.reduce((s,x)=>s+x[2],0);
      return [{cls:"sub",cells:[c.no,c.name,fmt(sum,2),(sum/all*100).toFixed(2)+"%"]},...sub.map(x=>[x[0],x[1],x[2]?fmt(x[2],2):"NA",x[2]?(x[2]/all*100).toFixed(2)+"%":"—"])];});
    sections.push({title:"第三章 温室气体排放量",subs:["3.1 温室气体种类说明","3.2 各类别排放量化结果","3.3 生物质燃烧的量化","3.4 温室气体清除"],body:'<h3>3.1 温室气体种类说明</h3><p>本次盘查涉及 CO₂、CH₄、N₂O 和 HFCs 四类温室气体；未涉及 PFCs、SF₆ 和 NF₃。</p>'+
      '<h3>3.2 各类别排放量化结果</h3>'+v12DocTable(["类别","描述","排放量（tCO₂e）","占比"],[...isoRows,{cls:"total",cells:["合计","",fmt(all,2),"100%"]}],{caption:"表 3-1 各类别温室气体排放量"})+
      v12DocTable(["温室气体","CO₂","CH₄","N₂O","HFCs","合计"],[["排放量（tCO₂e）",...["CO2","CH4","N2O","HFCs"].map(g=>fmt(gas[g],0)),fmt(all,0)],["占比",...["CO2","CH4","N2O","HFCs"].map(g=>(gas[g]/all*100).toFixed(2)+"%"),"100%"]],{caption:"表 3-2 各温室气体排放量"})+
      '<h3>3.3 生物质燃烧的量化</h3><p>本年度无生物质燃烧排放。</p><h3>3.4 温室气体清除</h3><p>CO₂ 捕集并用于油田驱油埋存量 '+fmt(-rows.filter(r=>v12Kind(r).startsWith("回收")).reduce((s,r)=>s+r.emission_tco2e,0),0)+' tCO₂，已在类别1 中扣减。</p>'});
    sections.push({title:"第四章 量化方法",subs:["4.1 数据管理","4.2 量化方法","4.3 活动数据收集","4.4 排放因子","4.5 数据质量"],body:'<h3>4.1 各排放源数据管理</h3><p>各所属企业通过碳管理平台按排放源逐项填报活动数据并上传凭证，经二级单位审核、集团复核后计入碳台账。</p>'+
      '<h3>4.2 量化方法</h3><p>采用排放因子法：温室气体排放量 = 活动数据 × 排放因子 × GWP；工业过程采用物料平衡法；火炬、放空按组分分析计算。</p>'+
      '<h3>4.3 活动数据收集和统计</h3><p>活动数据来源于计量仪表、能源结算单、DCS 历史数据、物料平衡月报和财务台账，详见附件1。</p>'+
      '<h3>4.4 确定和计算排放因子</h3>'+v12DocTable(["排放源","核算公式","主要参数 / 因子","来源"],factorRows.slice(0,24),{caption:"表 4-1 排放因子"})+
      '<h3>4.5 数据质量得分</h3>'+v12DocTable(["数据等级","说明","排放量（tCO₂e）","占比"],[["一级","实测 / 结算凭证",fmt(dq.t["一级"],0),(dq.t["一级"]/dq.all*100).toFixed(1)+"%"],["二级","行业平均 / 系统派生",fmt(dq.t["二级"],0),(dq.t["二级"]/dq.all*100).toFixed(1)+"%"],["三级","支出法 / 估算",fmt(dq.t["三级"],0),(dq.t["三级"]/dq.all*100).toFixed(1)+"%"]],{caption:"表 4-2 数据质量"})+'<p>按排放量加权的综合得分为 '+dq.score.toFixed(2)+'，评级为'+dq.grade+'。</p>'});
    sections.push({title:"第五章 基准年",subs:["5.1 基准年选定","5.2 基准年温室气体清单","5.3 基准年重新计算"],body:'<h3>5.1 基准年选定</h3><p>选定 '+cfg.baseYear+' 年为基准年，该年度为首个完成第三方合理保证核查的完整年度。</p>'+
      '<h3>5.2 基准年温室气体清单</h3>'+v12DocTable(["年度","类别1","类别2","类别3–6","合计"],yearsT.map(([y,a,b2,c])=>[y+(y===cfg.baseYear?"（基准年）":""),fmt(a,0),fmt(b2,0),fmt(c,0),fmt(a+b2+c,0)]))+
      '<h3>5.3 基准年选择变化以及基准年重新计算</h3><p>当发生组织结构调整、核算方法学变更或发现重大错误，导致基准年排放量变化超过 '+cfg.threshold+'% 时，重新计算基准年排放。</p>'});
    sections.push({title:"第六章 查证",subs:["6.1 内部查证","6.2 外部核查"],body:'<h3>6.1 内部查证</h3><p>集团组织内部审核员对各企业排放源识别、活动数据和排放因子进行抽查，数据交叉核对和重复计算检查结果已在系统中留痕。</p><h3>6.2 温室气体报告核查</h3><p>'+(ver?'本报告由 '+ver.org+' 依据 '+ver.std+' 核查，保证等级：'+ver.level+'。':'计划于 '+(year+1)+' 年 4 月委托第三方机构依据 ISO 14064-3:2019 进行核查。')+'</p>'});
    sections.push({title:"第七章 减量措施",subs:["7.1 温室气体减量策略","7.2 本年度实施方案","7.3 下年度拟实施方案"],body:'<h3>7.1 温室气体减量策略</h3><p>以节能提效、燃料替代、甲烷控排和 CCUS 为重点，配合绿电替代和产品低碳化，落实集团减排目标。</p><h3>7.2 '+year+' 年度开展的节能减排实施方案</h3>'+v12DocTable(["项目","减排效果","进度"],measures)+
      '<h3>7.3 '+(year+1)+' 年度拟开展的节能减排实施方案</h3>'+v12DocTable(["项目","预期效果"],plan)});
    sections.push({title:"第八章 报告书管理",body:'<p>本报告书由集团质量健康安全环保部负责编制、保存和更新；用于集团温室气体信息披露、减排目标管理及相关方沟通；报告以电子版和纸质版形式保存，相关方可通过集团官网或书面申请取得。</p><div class="wdSign"><p>编制：质量健康安全环保部</p><p>审核：高文博</p><p>批准：集团碳达峰碳中和工作领导小组</p></div>'});
    sections.push({title:"附件 排放量明细表",body:v12DocTable(["类别","组织","排放源","活动数据","排放量（tCO₂e）"],rows.slice().sort((a,b2)=>Number(a.scope)-Number(b2.scope)||b2.emission_tco2e-a.emission_tco2e).slice(0,60).map(r=>[String(r.scope)==="3"?v12CatLabel(r.category_code):"类别"+r.scope,v12OrgOf(r),scenarioText(r.source_name),fmt(r.activity_value,0)+" "+r.activity_unit,fmt(r.emission_tco2e,2)]),{caption:"附表 排放量明细（前 60 项）"})});
  }
  return head+'<div class="wdWrap">'+v12Doc(cover,sections)+'</div>';
}
function v12SetReportStd(v){v12Set("reportStd",v);}
