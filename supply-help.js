// 供应链范围三兜底核算、供应链页面、帮助中心和站内消息。在 evidence-ai.js 之后加载。

// ---------- 采购台账与范围三分级核算 ----------
const PROCUREMENT = [
  {id:"PO-01",supplier:"苏州恒铸精密铸造",item:"HT250 泵体铸件",category:"C01",qty:8600000,unit:"kg",spend:9890,avg:"EF-M03"},
  {id:"PO-02",supplier:"无锡华导铜业",item:"电磁线铜材",category:"C01",qty:2100000,unit:"kg",spend:16170,avg:"EF-M04"},
  {id:"PO-03",supplier:"常州鑫叠电机材料",item:"定转子电工钢",category:"C01",qty:6400000,unit:"kg",spend:4480,avg:"EF-M02"},
  {id:"PO-04",supplier:"嘉兴联运物流",item:"原材料公路运输",category:"C04",qty:9800000,unit:"t·km",spend:4116,avg:"EF-T01"},
  {id:"PO-05",supplier:"浙江卧龙配套电机",item:"YE4 三相异步电机",category:"C01",spend:38600,eeio:"EF-S02"},
  {id:"PO-06",supplier:"嘉善精工机加工",item:"泵轴机加工外协",category:"C01",spend:5200,eeio:"EF-S05"},
  {id:"PO-07",supplier:"宁波安泰轴承",item:"深沟球轴承",category:"C01",spend:3350,eeio:"EF-S05"},
  {id:"PO-08",supplier:"杭州联封密封件",item:"机械密封件",category:"C01",spend:2180,eeio:"EF-S03"},
  {id:"PO-09",supplier:"湖州成越包装",item:"包装箱及托盘",category:"C01",spend:1260,eeio:"EF-S04"}
];
const QUALITY = {1:"一级 · 供应商一手数据",2:"二级 · 行业平均因子",3:"三级 · 支出法"};
const SOURCE_QUALITY = {"钢材采购":"二级 · 行业平均因子","货物公路运输":"二级 · 行业平均因子","国内高铁差旅":"三级 · 支出法","员工私家车通勤":"二级 · 调查推算","产品使用电力":"二级 · 模型测算"};
function factorById(id){return FACTOR_DB.find(row=>row.id===id);}
function procurementSupplierIndex(line){return supplyScope3Items.findIndex(row=>row.supplier===line.supplier);}
function procurementLines() {
  return PROCUREMENT.map(line=>{
    const index=procurementSupplierIndex(line);
    const sup=index>=0?supplyScope3Items[index]:null;
    const approved=sup&&demo.approvedSuppliers?.[sup.id];
    if(approved)return {...line,index,sup,tier:1,method:"供应商一手数据",factorText:approved.unitCarbon+" kgCO₂e/"+approved.unit,emission:approved.total,qty:approved.qty,unit:approved.unit,status:supplierState(index)};
    if(line.qty&&line.avg) {
      const factor=factorById(line.avg);
      const value=factor.value*convertUnit(1,line.unit,factor.unit);
      return {...line,index,sup,tier:2,method:"行业平均因子",factorRef:factor,factorText:(+(value*1000).toPrecision(4))+" kgCO₂e/"+line.unit,emission:line.qty*value,status:sup?supplierState(index):"未邀请"};
    }
    const factor=factorById(line.eeio);
    return {...line,index,sup,tier:3,method:"支出法",factorRef:factor,factorText:factor.value+" tCO₂e/万元",emission:line.spend*factor.value,status:sup?supplierState(index):"未邀请"};
  });
}
const demoCalculateBeforeFallback = demoCalculate;
demoCalculate = function (standardCode,org,period) {
  const result=demoCalculateBeforeFallback(standardCode,org,period);
  if((!org||org===demoOrg)&&(!period||period===demoPeriod)) {
    procurementLines().filter(line=>line.tier>1).forEach(line=>result.detail.push({
      scope:"3",org:demoOrg,period:demoPeriod,category_code:line.category,source_name:line.supplier+" / "+line.item,
      activity_value:line.tier===2?line.qty:line.spend,activity_unit:line.tier===2?line.unit:"万元",
      factor_value:line.tier===2?line.emission/line.qty:line.factorRef.value,gwp_value:1,emission_tco2e:line.emission,
      evidence:"ERP-PO-"+line.id,quality:QUALITY[line.tier],fallback:true
    }));
  }
  result.detail.forEach(row=>{
    if(row.quality)return;
    if(String(row.scope)==="3"&&String(row.source_name).includes(" / "))row.quality=QUALITY[1];
    else row.quality=SOURCE_QUALITY[scenarioText(row.source_name)]||"一级 · 实测/票据";
  });
  result.total_emission=result.detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  result.categories=[...new Set(result.detail.map(row=>row.category_code))].map(code=>{
    const amount=result.detail.filter(row=>row.category_code===code).reduce((sum,row)=>sum+row.emission_tco2e,0);
    return {category_code:code,category_name:code==="S1"?"范围一":code==="S2"?"范围二":categoryName(code),emission_tco2e:amount,share:result.total_emission?+(amount/result.total_emission*100).toFixed(2):0};
  });
  return result;
};

// ---------- 供应链页面 ----------
function tierStats(lines) {
  const out={1:0,2:0,3:0};
  lines.forEach(line=>out[line.tier]+=line.emission);
  return out;
}
function tierBadge(tier){return '<span class="status '+({1:"ok",2:"warn",3:"bad"}[tier])+'">'+QUALITY[tier]+'</span>';}
supplierDash = function () {
  if(state.group==="供应链分析与报告")return supplyAnalysis();
  const rows=supplyScope3Items.map((row,index)=>({row,index,status:supplierState(index)}));
  const lines=procurementLines();
  const tiers=tierStats(lines);
  const total=tiers[1]+tiers[2]+tiers[3];
  const done=rows.filter(item=>item.status==="通过").length;
  const approved=Object.values(demo.approvedSuppliers);
  return pageHead("供应链看板",'<button class="btn" onclick="go(\'供应链碳排放\',\'供应链分析与报告\')">分级核算</button><button class="btn primary" onclick="go(\'供应链碳排放\',\'供应商协同任务\')">数据收集与审核</button>',"供应链碳排放 / 供应链看板")+
    '<div class="statRow">'+
      statTile("采购供应商",PROCUREMENT.length+" 家","已协同 "+supplyScope3Items.length+" 家","go('供应链碳排放','供应商管理')")+
      statTile("一手数据覆盖率",pct(tiers[1],total)+"%","按排放量 · "+done+" / "+rows.length+" 项已审核","go('供应链碳排放','供应链分析与报告')")+
      statTile("待审核 / 退回",rows.filter(item=>item.status==="待审核").length+" / "+rows.filter(item=>item.status==="退回").length,"需要跟进","setSupplierFilter('待审核')")+
      statTile("采购相关排放",fmt(total,0),"tCO₂e · 含兜底测算","go('供应链碳排放','供应链分析与报告')")+
    '</div><div class="homeGrid even"><div>'+
      card("收集进度",'<ul class="supplierProgress">'+rows.map(({row,index,status})=>'<li><div><b>'+textHtml(row.supplier)+'</b><small>'+textHtml(row.part)+' · '+
        textHtml(supplierProfile(row.supplier).contact||"")+'</small></div>'+flowSteps(status,true)+
        '<button class="btn '+(status==="待审核"?'primary':'')+'" onclick="editDemoSupplier('+index+','+(status==="待审核")+')">'+(status==="待审核"?"审核":"查看")+'</button></li>').join("")+'</ul>')+
    '</div><div>'+
      card("数据质量构成",meterRows([1,2,3].map(tier=>({label:QUALITY[tier],sub:lines.filter(line=>line.tier===tier).length+" 条采购",value:tiers[tier],display:fmt(tiers[tier],0)+" · "+pct(tiers[tier],total)+"%",
        color:{1:"#4D7F17",2:"#E9A23B",3:"#D92D20"}[tier],action:"go('供应链碳排放','供应链分析与报告')"}))))+
      card("已批准排放构成",meterRows(approved.map(row=>({label:row.supplier,sub:row.part,value:row.total,action:"showSupplierVersions("+supplyScope3Items.findIndex(item=>item.id===row.id)+")"}))))+
    '</div></div>';
};
function supplyAnalysis() {
  const lines=procurementLines();
  const tiers=tierStats(lines);
  const total=tiers[1]+tiers[2]+tiers[3];
  const byCategory={};
  lines.forEach(line=>byCategory[line.category]=(byCategory[line.category]||0)+line.emission);
  traceRows=[];
  return pageHead("供应链分析与报告",'<button class="btn primary" onclick="exportFirstTable()">导出分析表</button>',"供应链碳排放 / 供应链分析与报告")+
    '<div class="statRow">'+statTile("采购相关排放",fmt(total,0),"tCO₂e")+[1,2,3].map(tier=>statTile(QUALITY[tier],fmt(tiers[tier],0),pct(tiers[tier],total)+"% · "+lines.filter(line=>line.tier===tier).length+" 条")).join("")+'</div>'+
    '<div class="homeGrid even"><div>'+card("按范围三类别",meterRows(Object.entries(byCategory).map(([code,value])=>({label:categoryName(code),value,display:fmt(value,0)}))))+'</div>'+
    '<div>'+card("按核算方法",meterRows([1,2,3].map(tier=>({label:QUALITY[tier],value:tiers[tier],display:fmt(tiers[tier],0),color:{1:"#4D7F17",2:"#E9A23B",3:"#D92D20"}[tier]}))))+'</div></div>'+
    card("采购台账分级核算",'<div class="tableWrap"><table><thead><tr><th>供应商</th><th>采购内容</th><th>类别</th><th>采购量</th><th>采购额(万元)</th><th>核算方法</th><th>因子</th><th>排放(tCO₂e)</th><th>占比</th><th>协同状态</th><th></th></tr></thead><tbody>'+
      lines.sort((a,b)=>b.emission-a.emission).map(line=>'<tr><td><strong>'+textHtml(line.supplier)+'</strong><small>'+line.id+'</small></td><td>'+textHtml(line.item)+'</td><td>'+textHtml(categoryName(line.category))+'</td><td>'+(line.qty?fmt(line.qty,0)+' '+textHtml(line.unit):'—')+'</td><td>'+fmt(line.spend,0)+'</td><td>'+tierBadge(line.tier)+
        '</td><td>'+textHtml(line.factorText)+(line.factorRef?'<small>'+textHtml(line.factorRef.name)+'</small>':'')+'</td><td>'+fmt(line.emission,1)+'</td><td>'+(total?(line.emission/total*100).toFixed(1):0)+'%</td><td>'+(line.sup?entryStatus(line.status):'<span class="status gray">未邀请</span>')+'</td><td>'+
        (currentRole!=="管理者"?'':line.sup?(line.tier>1?'<button class="btn" onclick="editDemoSupplier('+line.index+','+(line.status==="待审核")+')">'+(line.status==="待审核"?"审核":"跟进")+'</button>':''):'<button class="btn" onclick="inviteProcurement(\''+line.id+'\')">邀请填报</button>')+'</td></tr>').join("")+
    '</tbody></table></div>');
}
function inviteProcurement(id) {
  const line=PROCUREMENT.find(row=>row.id===id);
  inviteSupplier();
  const set=(field,value)=>{const node=document.getElementById(field);if(node)node.value=value;};
  set("invName",line.supplier);set("invPart",line.item);set("invCategory",line.item);set("invUnit","件");set("invScope3",line.category);
}
supplierMgmt = function () {
  const lines=procurementLines();
  const invitedNames=new Set(supplyScope3Items.map(row=>row.supplier));
  return pageHead("供应商管理",'<button class="btn" onclick="exportFirstTable()">导出</button><button class="btn primary" onclick="inviteSupplier()">邀请供应商</button>',"供应链碳排放 / 供应商管理")+
    '<div class="taskTable tableWrap"><table><thead><tr><th>供应商</th><th>供应品类</th><th>分级</th><th>联系人</th><th>采购额(万元)</th><th>本期任务</th><th>核算方法</th><th>已批准版本</th><th>操作</th></tr></thead><tbody>'+
    supplyScope3Items.map((row,index)=>{
      const profile=supplierProfile(row.supplier);
      const status=supplierState(index);
      const line=lines.find(item=>item.supplier===row.supplier);
      return '<tr><td><strong>'+textHtml(row.supplier)+'</strong><small>'+textHtml(profile.email||"")+'</small></td><td>'+textHtml(profile.category||"")+'</td><td>'+
        textHtml(profile.level||"")+'</td><td>'+textHtml(profile.contact||"")+'</td><td>'+(line?fmt(line.spend,0):'—')+'</td><td>'+entryStatus(status)+
        '<small>'+textHtml(row.part)+'</small></td><td>'+(line?tierBadge(line.tier):'—')+'</td><td>'+((demo.supplierVersionHistory[row.id]||[]).length?'V'+demo.supplierVersionHistory[row.id].length:'—')+'</td><td class="rowActions">'+
        '<button class="btn" onclick="editDemoSupplier('+index+')">查看任务</button>'+
        (["草稿","退回","待填报"].includes(status)?'<button class="btn" onclick="remindTask(\'SUP-'+row.id+'\',\''+textHtml(row.supplier)+'\')">催办</button>':'')+'</td></tr>';
    }).join("")+
    lines.filter(line=>!invitedNames.has(line.supplier)).map(line=>'<tr><td><strong>'+textHtml(line.supplier)+'</strong><small>采购台账</small></td><td>'+textHtml(line.item)+'</td><td>一般供应商</td><td>—</td><td>'+fmt(line.spend,0)+'</td><td><span class="status gray">未邀请</span></td><td>'+tierBadge(line.tier)+'</td><td>—</td><td class="rowActions">'+
      (currentRole==="管理者"?'<button class="btn" onclick="inviteProcurement(\''+line.id+'\')">邀请填报</button>':'')+'</td></tr>').join("")+
    '</tbody></table></div>';
};
const supplyFactorBeforeFallback = supplyFactor;
supplyFactor = function () {
  const html=supplyFactorBeforeFallback().replace(/<td><\/td><td>([^<]*)<\/td><td><button class="btn" onclick="showSupplierVersions\((\d+)\)">/g,(m,evidence,index)=>{
    const versions=demo.supplierVersionHistory[supplyScope3Items[index]?.id]||[];
    return '<td>'+textHtml(String(versions.at(-1)?.approvedAt||"").slice(0,16))+'</td><td>'+evidence+'</td><td><button class="btn" onclick="showSupplierVersions('+index+')">';
  });
  if(currentRole==="供应商")return html;
  const lines=procurementLines().filter(line=>line.tier>1);
  return html+card("兜底因子（未获一手数据时采用）",'<div class="tableWrap"><table><thead><tr><th>供应商 / 采购内容</th><th>方法</th><th>因子</th><th>来源</th><th>排放(tCO₂e)</th></tr></thead><tbody>'+
    lines.map(line=>'<tr><td><strong>'+textHtml(line.supplier)+'</strong><small>'+textHtml(line.item)+'</small></td><td>'+tierBadge(line.tier)+'</td><td>'+textHtml(line.factorRef.name)+'<small>'+textHtml(line.factorText)+'</small></td><td>'+textHtml(line.factorRef.source)+'</td><td>'+fmt(line.emission,1)+'</td></tr>').join("")+
    '</tbody></table></div>');
};

// ---------- 帮助中心 ----------
const FAQ = [
  ["填报","活动数据和凭证怎么填？","打开任务后填写活动量，在「凭证」区上传结算单、发票或台账。图片和 PDF 会自动识别用量、期间和户名，点击「采用识别值填入」即可回填，提交前请核对。"],
  ["填报","识别出来的数和我填的不一致怎么办？","系统会在凭证上标出差异比例。小于 5% 标黄，可在备注写明原因（如抄表日不一致）；超过 5% 标红，审核人会退回，建议按结算单修正。"],
  ["审核","审核时重点看什么？","看凭证一致性和因子。弹窗内可直接打开凭证原件，识别值与填报值不一致的会标注；因子可点「智能匹配」比较推荐因子。"],
  ["因子","因子智能匹配是怎么推荐的？","按排放源名称与因子名称的语义相似度、单位是否一致或可换算、适用范围、区域和发布年份综合打分，推荐前 5 条。采用后自动换算单位并重算排放，原因子会留在操作记录里。"],
  ["供应链","供应商还没交数据，范围三怎么算？","按数据可得性分级：有审核通过的供应商一手数据用一级；有采购量没有一手数据时用行业平均因子（二级）；只有采购金额时用支出法（三级）。供应商数据审核通过后自动替换。"],
  ["供应链","如何提高一手数据覆盖率？","在「供应链分析与报告」按排放量排序，优先邀请排名靠前的三级、二级供应商填报。"],
  ["凭证","凭证文件存在哪里？","凭证原件保存在系统文件库，台账记录文件指纹（SHA-256）、上传人和时间，重复上传同一文件会提示。"],
  ["报告","报告里的数字怎么追溯到原始单据？","在报告预览点击范围行、在排放清单点击排放源或排放量，可依次看到计算式、填报任务、处理记录和凭证原件。"],
  ["报告","「分析与结论」是怎么生成的？","基于本期已审核数据、上年度归档数据、凭证核验情况和减排目标自动计算并成文，包括排放结构、同比归因、数据质量和量化的减排建议，可编辑后插入报告。"],
  ["履约","配额缺口怎么补？","先在「CCER 抵销」申请抵销（不超过应清缴量的 5%），剩余缺口在「交易委托」买入 CEA，余额满足后提交清缴。"],
  ["账号","如何切换年度查看历史数据？","页面右上角选择年度。已关账年度为只读。"]
];
const MANUAL = [
  {id:"start",title:"快速开始",steps:["右上角选择角色和年度。","首页「我的任务」列出需要处理的事项，点击进入。","顶部铃铛查看审核结果、退回和系统通知。"],go:["首页"]},
  {id:"fill",title:"组织数据填报",steps:["进入「组织碳排放 / 数据填报」，选择任务。","上传结算单或台账，等待识别完成后核对识别结果。","点击「采用识别值填入」，确认活动量和凭证编号。","保存草稿或提交审核；退回的任务按意见修改后再次提交。"],go:["组织碳排放","数据填报","填报任务"]},
  {id:"review",title:"审核与凭证核验",steps:["进入「审核队列」，打开待审核任务。","查看凭证一致性标识，必要时打开原件。","审核通过后关联凭证自动标记为已核验；退回需填写原因。"],go:["组织碳排放","数据填报","审核队列"]},
  {id:"evidence",title:"凭证库",steps:["「组织碳排放 / 凭证管理」集中查看全部凭证。","「批量上传识别」可一次上传多份单据，系统建议关联的填报任务。","按一致性、核验状态筛选，导出凭证台账。"],go:["组织碳排放","凭证管理"]},
  {id:"factor",title:"排放因子与智能匹配",steps:["「基础配置 / 因子库管理 / 因子智能匹配」批量检查全部排放源。","对比当前因子与推荐因子的差异和来源。","选择候选因子采用，系统自动换算单位并重算。"],go:["基础配置","因子库管理","因子智能匹配"]},
  {id:"supply",title:"供应商协同与范围三",steps:["「供应商管理」邀请供应商或从采购台账发起邀请。","供应商提交后在「数据收集与审核」审核。","「供应链分析与报告」查看各采购的核算方法和数据质量分级。"],go:["供应链碳排放","供应商管理"]},
  {id:"product",title:"产品碳足迹",steps:["「LCA 建模与核算」选择模型，按生命周期阶段录入活动数据。","「产品碳足迹看板」查看阶段贡献和热点。","「产品报告中心」生成碳足迹评价报告。"],go:["产品碳排放","LCA建模与核算","模型库"]},
  {id:"ets",title:"碳履约",steps:["「排放监测」按月填报燃煤和电量数据并存证。","「配额管理」确认核定结果。","「CCER 抵销」和「交易委托」补足缺口，「配额清缴」提交清缴并下载确认单。"],go:["碳履约","履约工作台"]},
  {id:"report",title:"报告生成",steps:["「报告中心」预览报告，点击「生成分析与结论」。","编辑生成的段落后「插入报告」。","生成快照或下载报告。"],go:["组织碳排放","报告中心","组织排放报告"]}
];
const STANDARDS = [
  ["ISO 14064-1:2018","组织层面温室气体排放和清除的量化与报告规范","ISO","国际","组织盘查"],
  ["ISO 14064-3:2019","温室气体声明的审定与核查规范","ISO","国际","核查"],
  ["ISO 14067:2018","产品碳足迹 量化要求和指南","ISO","国际","产品碳足迹"],
  ["GHG Protocol","企业核算与报告标准（修订版）","WRI / WBCSD","国际","组织盘查"],
  ["GHG Protocol Scope 3","企业价值链（范围三）核算与报告标准","WRI / WBCSD","国际","范围三"],
  ["PAS 2050:2011","商品和服务生命周期温室气体排放评价规范","BSI","国际","产品碳足迹"],
  ["PCAF 2022","金融业温室气体核算与报告标准（第二版）","PCAF","国际","范围三 类别 15"],
  ["IPCC 2006 / 2019 修订","国家温室气体清单指南","IPCC","国际","排放因子"],
  ["GB/T 32150-2015","工业企业温室气体排放核算和报告通则","国家标准化管理委员会","国内","组织盘查"],
  ["GB/T 24067-2024","温室气体 产品碳足迹 量化要求和指南","国家标准化管理委员会","国内","产品碳足迹"],
  ["环办气候〔2022〕485 号","企业温室气体排放核算与报告指南 发电设施","生态环境部","国内","碳履约"],
  ["国务院令第 775 号","碳排放权交易管理暂行条例","国务院","国内","碳履约"],
  ["生态环境部令第 31 号","温室气体自愿减排交易管理办法（试行）","生态环境部 / 市场监管总局","国内","CCER"],
  ["SBTi","企业净零标准","Science Based Targets initiative","国际","减排目标"]
];
let helpQuery="";let standardFilter="";let manualId="start";
function setHelpQuery(value){helpQuery=value.trim();render();}
function helpFaqPage() {
  const list=FAQ.filter(([tag,q,a])=>!helpQuery||(tag+q+a).includes(helpQuery));
  return pageHead("常见问题","","帮助中心 / 常见问题")+
    '<div class="taskToolbar"><label class="taskSearch">搜索<input id="faqSearch" value="'+textHtml(helpQuery)+'" placeholder="输入关键词" onkeydown="if(event.key===\'Enter\')setHelpQuery(this.value)"></label><button class="btn" onclick="setHelpQuery(document.getElementById(\'faqSearch\').value)">搜索</button><span>'+list.length+' 条</span></div>'+
    '<section class="panel faqList">'+(list.length?list.map(([tag,q,a],index)=>'<details '+(index===0&&!helpQuery?'open':'')+'><summary><span class="todoTag">'+tag+'</span>'+textHtml(q)+'</summary><p>'+textHtml(a)+'</p></details>').join(""):'<div class="todoEmpty">没有匹配的问题</div>')+'</section>';
}
function helpManualPage() {
  const chapter=MANUAL.find(row=>row.id===manualId)||MANUAL[0];
  return pageHead("用户手册",'<button class="btn" onclick="window.print()">打印</button>',"帮助中心 / 用户手册")+
    '<div class="manualGrid"><nav class="manualNav">'+MANUAL.map((row,index)=>'<button class="'+(row.id===chapter.id?'active':'')+'" onclick="manualId=\''+row.id+'\';render()">'+(index+1)+'. '+row.title+'</button>').join("")+'</nav>'+
    '<section class="panel"><div class="panelHead"><h3>'+chapter.title+'</h3>'+(ROLE_TOPS[currentRole].includes(chapter.go[0])?'<button class="btn" onclick="go('+chapter.go.map(item=>"\'"+item+"\'").join(",")+')">前往</button>':'')+'</div>'+
    '<ol class="manualSteps">'+chapter.steps.map(step=>'<li>'+textHtml(step)+'</li>').join("")+'</ol></section></div>';
}
function helpStandardPage() {
  const list=STANDARDS.filter(row=>!standardFilter||row[3]===standardFilter);
  return pageHead("行业标准参考",'<button class="btn" onclick="exportFirstTable()">导出</button>',"帮助中心 / 行业标准参考")+
    '<div class="segTabs">'+[["","全部"],["国际","国际标准"],["国内","国内标准与法规"]].map(([value,label])=>'<button class="'+(standardFilter===value?'active':'')+'" onclick="standardFilter=\''+value+'\';render()">'+label+'</button>').join("")+'</div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>编号</th><th>名称</th><th>发布机构</th><th>类型</th><th>系统应用</th><th>状态</th></tr></thead><tbody>'+
    list.map(row=>'<tr><td><strong>'+textHtml(row[0])+'</strong></td><td>'+textHtml(row[1])+'</td><td>'+textHtml(row[2])+'</td><td>'+row[3]+'</td><td>'+textHtml(row[4])+'</td><td><span class="status ok">现行</span></td></tr>').join("")+'</tbody></table></div>';
}
MENUS["帮助中心"]={"常见问题":[],"用户手册":[],"行业标准参考":[]};

// ---------- 站内消息 ----------
function messageList() {
  const list=[];
  const log=demo.auditLog||[];
  if(currentRole==="管理者") {
    workflowTasks().filter(task=>taskEntry(task).status==="待审核").forEach(task=>list.push({id:"rv-"+task.id+"-"+(log.filter(row=>row.taskId===task.id).length),tag:"审核",title:(task.locked?task.owner:task.owner)+" 提交了「"+task.name+"」",text:task.locked?"供应商数据待审核":"范围"+task.scope+" · "+task.org,at:log.filter(row=>row.taskId===task.id).at(-1)?.at||"2026-11-18",action:"openUnifiedTask('"+task.id+"',true)"}));
    evidenceList().filter(ev=>evidenceCheck(ev).state==="bad").forEach(ev=>list.push({id:"ev-"+ev.id,tag:"凭证",title:ev.no+" 识别值与填报值不一致",text:evidenceCheck(ev).label,at:ev.uploadedAt,action:"openEvidence('"+ev.id+"')"}));
    if(typeof etsTodos==="function")etsTodos().filter(item=>item.primary).forEach(item=>list.push({id:"ets-"+item.title,tag:"履约",title:item.title,text:item.meta,at:"2026-11-12",action:item.action}));
  }
  if(currentRole==="填报人") {
    myTasks().forEach(task=>{const entry=taskEntry(task);const last=log.filter(row=>row.taskId===task.id&&/审核通过|退回/.test(row.action)).at(-1);
      if(last)list.push({id:"res-"+task.id+"-"+last.at,tag:entry.status==="退回"?"退回":"通过",title:task.name+(entry.status==="退回"?" 被退回":" 审核通过"),text:entry.reviewNote||last.actor,at:last.at,action:"openUnifiedTask('"+task.id+"')"});});
    myTasks().filter(task=>taskEntry(task).status==="退回"&&!log.some(row=>row.taskId===task.id&&/退回/.test(row.action))).forEach(task=>list.push({id:"ret-"+task.id,tag:"退回",title:task.name+" 被退回",text:taskEntry(task).reviewNote||"",at:"2026-11-14",action:"openUnifiedTask('"+task.id+"')"}));
  }
  if(currentRole==="供应商") {
    const row=supplyScope3Items[supplierIdentity];
    if(row){const status=supplierState(supplierIdentity);list.push({id:"sup-"+row.id+"-"+status,tag:status,title:row.part+" · "+status,text:row.reviewNote||"截止 "+DEADLINE,at:"2026-11-15",action:"editDemoSupplier("+supplierIdentity+")"});}
  }
  list.push({id:"sys-ef-2026",tag:"公告",title:"参考因子库已更新至 2022 年度全国电网平均排放因子 0.5703",text:currentRole==="管理者"?"已在用的因子不受影响，可在因子智能匹配中查看差异":"已在用的因子不受影响",at:"2026-11-01",action:currentRole==="管理者"?"go('基础配置','因子库管理','因子智能匹配')":"go('帮助中心','行业标准参考')"});
  list.push({id:"sys-deadline",tag:"公告",title:"2026 年度组织盘查数据截止 "+DEADLINE,text:"请按期完成填报与审核",at:"2026-11-01",action:"go('首页')"});
  return list.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
function msgRead(){demo.msgRead ||= {};return demo.msgRead;}
function unreadCount(){const read=msgRead();return messageList().filter(row=>!read[row.id]).length;}
function toggleMessages(event) {
  event?.stopPropagation();
  const panel=document.getElementById("msgPanel");
  if(!panel.hidden){panel.hidden=true;return;}
  const read=msgRead();
  const list=messageList();
  panel.innerHTML='<div class="msgHead"><b>消息</b><button class="linkBtn" onclick="readAllMessages(event)">全部已读</button></div><ul>'+
    (list.length?list.map((row,index)=>'<li class="'+(read[row.id]?'':'unread')+'" onclick="openMessage('+index+')"><span class="todoTag">'+textHtml(row.tag)+'</span><div><b>'+textHtml(row.title)+'</b><small>'+textHtml(row.text||"")+'</small></div><time>'+textHtml(String(row.at).slice(5,16))+'</time></li>').join(""):'<li class="empty">暂无消息</li>')+'</ul>';
  panel.hidden=false;
}
function openMessage(index) {
  const row=messageList()[index];
  msgRead()[row.id]=true;persistDemo();
  document.getElementById("msgPanel").hidden=true;
  updateBell();
  try {new Function(row.action)();} catch {}
}
function readAllMessages(event) {
  event.stopPropagation();
  messageList().forEach(row=>{msgRead()[row.id]=true;});
  persistDemo();updateBell();toggleMessages();toggleMessages();
}
function updateBell() {
  const count=unreadCount();
  const badge=document.querySelector("#msgBell em");
  if(badge){badge.textContent=count>99?"99+":count;badge.hidden=!count;}
}
document.addEventListener("click",event=>{const panel=document.getElementById("msgPanel");if(panel&&!panel.hidden&&!event.target.closest("#msgPanel,#msgBell"))panel.hidden=true;});

const renderBeforeHelp = render;
render = function () {
  renderBeforeHelp();
  const content=document.getElementById("content");
  if(state.top==="帮助中心")content.innerHTML=state.group==="用户手册"?helpManualPage():state.group==="行业标准参考"?helpStandardPage():helpFaqPage();
  if(!document.getElementById("msgBell")) {
    document.querySelector(".right").insertAdjacentHTML("afterbegin",'<button id="msgBell" class="msgBell" type="button" aria-label="消息" title="消息" onclick="toggleMessages(event)"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Zm0 19a2.6 2.6 0 0 0 2.5-2h-5A2.6 2.6 0 0 0 12 22Z" fill="currentColor"/></svg><em hidden></em></button><div id="msgPanel" class="msgPanel" hidden></div>');
  }
  if(backendState.ready)updateBell();
};
const goBeforeHelp = go;
go = function (top,group,page) {
  if(top==="帮助中心"&&group==="系统说明")group="常见问题";
  goBeforeHelp(top,group,page);
};
