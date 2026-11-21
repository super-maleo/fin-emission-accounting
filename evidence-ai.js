// 凭证管理、单据智能识别、排放因子智能匹配、报告智能生成与数据穿透。必须在 year-goal-ets.js 之后加载。

// ---------- 通用 ----------
const VENDOR = "vendor/";
const EV_UNITS = {
  "kWh":["kWh",1],"千瓦时":["kWh",1],"度":["kWh",1],"MWh":["kWh",1000],"万kWh":["kWh",10000],"万千瓦时":["kWh",10000],
  "Nm³":["Nm³",1],"Nm3":["Nm³",1],"m³":["Nm³",1],"m3":["Nm³",1],"立方米":["Nm³",1],"万m³":["Nm³",10000],"万立方米":["Nm³",10000],
  "t":["kg",1000],"吨":["kg",1000],"kg":["kg",1],"千克":["kg",1],"公斤":["kg",1],
  "L":["L",1],"升":["L",1],"GJ":["GJ",1],"吉焦":["GJ",1],"t·km":["t·km",1],"吨公里":["t·km",1],"tkm":["t·km",1],"人·km":["人·km",1],"元":["元",1],"万元":["元",10000]
};
function unitBase(unit){return EV_UNITS[String(unit||"").trim()]||null;}
function convertUnit(value,from,to) {
  if(from===to)return value;
  const a=unitBase(from),b=unitBase(to);
  if(!a||!b||a[0]!==b[0])return null;
  return value*a[1]/b[1];
}
function loadScriptOnce(src) {
  window.__loadedScripts ||= {};
  if(window.__loadedScripts[src])return window.__loadedScripts[src];
  window.__loadedScripts[src]=new Promise((resolve,reject)=>{
    const node=document.createElement("script");
    node.src=src;node.onload=resolve;node.onerror=()=>{delete window.__loadedScripts[src];reject(new Error("加载失败："+src));};
    document.head.appendChild(node);
  });
  return window.__loadedScripts[src];
}
async function sha256Hex(buffer) {
  try {
    const digest=await crypto.subtle.digest("SHA-256",buffer);
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  } catch {
    let hash=2166136261;const bytes=new Uint8Array(buffer);
    for(let i=0;i<bytes.length;i++){hash^=bytes[i];hash=Math.imul(hash,16777619);}
    return (hash>>>0).toString(16).padStart(8,"0")+bytes.length.toString(16);
  }
}
function fileSizeText(bytes){return bytes>1048576?(bytes/1048576).toFixed(1)+" MB":Math.max(1,Math.round(bytes/1024))+" KB";}

// 文件内容存在浏览器 IndexedDB，元数据随业务数据保存
function evDb() {
  if(window.__evDb)return window.__evDb;
  window.__evDb=new Promise((resolve,reject)=>{
    const request=indexedDB.open("carbon-evidence",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("files");
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return window.__evDb;
}
async function evPutFile(id,file) {
  const db=await evDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
}
async function evGetFile(id) {
  const db=await evDb();
  return new Promise((resolve,reject)=>{const request=db.transaction("files").objectStore("files").get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}

const openModalBeforePeriod = openModal;
openModal = function (html) {
  openModalBeforePeriod(String(html).replace(/>2026-07</g,">"+reportYear+" 年度<"));
};

// ---------- 单据类型 ----------
const DOC_TYPES = [
  {match:"天然气",type:"燃气结算单",issuer:"嘉兴港华燃气有限公司",qtyLabel:"用气量",unit:"Nm³",price:3.85,account:"JX-GH-208173"},
  {match:"柴油",type:"加油卡消费明细",issuer:"中国石化销售股份有限公司浙江湖州石油分公司",qtyLabel:"加油量",unit:"L",price:7.62,account:"1000 3301 8826 4410"},
  {match:"R134a",type:"制冷剂充注记录",issuer:"杭州冷联机电设备维保有限公司",qtyLabel:"充注量",unit:"kg",price:68,account:"WB-2026-0315"},
  {match:CHP_COAL,type:"入厂煤计量汇总单",issuer:"嘉兴热电分公司燃料管理部",qtyLabel:"入厂煤量",unit:"t",price:905,account:"RD-FUEL-01"},
  {match:CHP_ELEC,type:"电费结算单",issuer:"国网浙江省电力有限公司嘉兴供电公司",qtyLabel:"本期电量",unit:"kWh",price:0.66,account:"3304 0218 7702"},
  {match:"外购电力",type:"电费结算单",issuer:"国网浙江省电力有限公司嘉兴供电公司",qtyLabel:"本期电量",unit:"kWh",price:0.68,account:"3304 0218 6631"},
  {match:"蒸汽",type:"蒸汽结算单",issuer:"湖州南太湖热电有限公司",qtyLabel:"用汽热量",unit:"GJ",price:98,account:"HZ-ST-0457"},
  {match:"绿电",type:"绿色电力交易结算单",issuer:"浙江电力交易中心有限公司",qtyLabel:"结算电量",unit:"kWh",price:0.47,account:"ZJPX-GEC-1093"},
  {match:"钢材",type:"采购入库汇总表",issuer:"江南流体装备集团物资采购部",qtyLabel:"入库量",unit:"t",price:4300,account:"ERP-MM-STEEL"},
  {match:"公路运输",type:"运输周转量汇总表",issuer:"江南流体装备集团物流管理部",qtyLabel:"货物周转量",unit:"t·km",price:0.42,account:"TMS-2026"},
  {match:"高铁",type:"差旅平台对账单",issuer:"携程商旅",qtyLabel:"结算金额",unit:"元",price:1,account:"CT-JNFE-2026"},
  {match:"通勤",type:"员工通勤调查汇总表",issuer:"江南流体装备集团人力资源部",qtyLabel:"通勤里程",unit:"人·km",price:0,account:"HR-COMMUTE-2026"},
  {match:"产品使用",type:"产品销售与能效测算表",issuer:"江南流体装备集团营销中心",qtyLabel:"生命周期用电量",unit:"kWh",price:0,account:"CRM-SALES-2026"}
];
function docTypeFor(name){return DOC_TYPES.find(row=>String(name).includes(row.match));}

// ---------- 凭证库 ----------
function evidenceList() {
  if(demo.evidenceVersion!==1&&backendState.ready) {
    demo.evidence=seedEvidence();
    demo.evidenceVersion=1;
    persistDemo();
  }
  return demo.evidence||[];
}
function seedEvidence() {
  const list=[];
  let seq=0;
  const add=row=>list.push({id:"EV-"+String(++seq).padStart(4,"0"),size:180000+((seq*7919)%420000),sha256:(seq*2654435761>>>0).toString(16).padStart(8,"0")+"c3a9"+(seq*40503>>>0).toString(16).padStart(8,"0"),...row});
  const dates=["2026-10-12","2026-10-14","2026-10-19","2026-10-23","2026-11-03","2026-11-06","2026-11-10","2026-11-12"];
  workflowTasks().filter(task=>!task.locked).forEach((task,index)=>{
    const entry=taskEntry(task);
    if(!entry.evidence||entry.activity==="")return;
    const doc=docTypeFor(task.name)||{type:"业务台账",issuer:task.org,qtyLabel:"数量",unit:task.unit,price:0,account:task.id};
    const activity=Number(entry.activity);
    const billed=task.id==="T-S2-02"?57200:activity;
    const qty=convertUnit(billed,task.unit,doc.unit)??billed;
    add({no:entry.evidence,name:task.name+"-"+String(entry.evidence).replace(/\.\w+$/,"")+".pdf",type:doc.type,taskId:task.id,source:"组织填报",org:task.org,period:"2026-01 至 2026-10",
      uploader:task.owner,uploadedAt:dates[index%dates.length]+" "+String(9+index%8).padStart(2,"0")+":"+String(10+index*7%50).padStart(2,"0"),
      fields:{issuer:doc.issuer,account:doc.account,holder:"江南流体装备集团"+(task.org||""),period:"2026年01月01日 至 2026年10月31日",quantity:qty,unit:doc.unit,qtyLabel:doc.qtyLabel,
        amount:doc.price?Math.round(qty*doc.price*100)/100:null,docNo:entry.evidence},
      verified:entry.status==="通过",verifiedBy:entry.status==="通过"?MANAGER_NAME:"",status:"已关联",origin:"seed"});
  });
  supplyScope3Items.forEach((row,index)=>{
    if(!row.evidence||row.evidence==="-")return;
    const transport=row.unit==="t·km";
    add({no:row.evidence,name:row.supplier+"-"+(transport?"运输周转量汇总":"产品碳足迹声明")+".pdf",type:transport?"运输周转量汇总表":"产品碳足迹声明",taskId:"SUP-"+row.id,source:"供应商",org:row.supplier,period:"2026-01 至 2026-10",
      uploader:supplierProfile(row.supplier).contact||row.supplier,uploadedAt:dates[(index+3)%dates.length]+" 15:"+String(20+index*9).padStart(2,"0"),
      fields:{issuer:row.supplier,holder:"江南流体装备集团",period:"2026年01月01日 至 2026年10月31日",quantity:row.qty,unit:row.unit,qtyLabel:transport?"货物周转量":"供货量",
        carbon:row.unitCarbon,carbonUnit:"kgCO₂e/"+row.unit,docNo:row.evidence,product:row.part},
      verified:row.status==="已收集",verifiedBy:row.status==="已收集"?MANAGER_NAME:"",status:"已关联",origin:"seed"});
  });
  if(typeof ets==="function") {
    ets().monthly[CURRENT_YEAR].filter(month=>month.status==="已存证").forEach(month=>{
      add({no:month.evidence,name:"入厂煤计量与化验单-"+CURRENT_YEAR+"-"+String(month.month).padStart(2,"0")+".pdf",type:"入厂煤计量与化验单",taskId:"ETS-"+CURRENT_YEAR+"-"+month.month,source:"碳履约",org:"嘉兴热电分公司",
        period:CURRENT_YEAR+"-"+String(month.month).padStart(2,"0"),uploader:"周建华",uploadedAt:month.at+" 09:30",
        fields:{issuer:"嘉兴热电分公司燃料管理部",holder:"江南流体装备集团嘉兴热电分公司",period:CURRENT_YEAR+"年"+String(month.month).padStart(2,"0")+"月",quantity:month.coal,unit:"t",qtyLabel:"入炉煤量",
          ncv:month.ncv,docNo:month.evidence},verified:true,verifiedBy:"华东电力试验研究院",status:"已关联",origin:"seed"});
    });
  }
  return list;
}
function evidenceFor(taskId){return evidenceList().filter(row=>row.taskId===taskId);}
function evidenceByNo(no){return evidenceList().find(row=>row.no===no);}
function evidenceTask(ev){return workflowTasks().find(task=>task.id===ev.taskId);}
function evidenceFilled(ev) {
  if(String(ev.taskId).startsWith("ETS-")&&typeof ets==="function"){const [,year,month]=ev.taskId.split("-");const row=ets().monthly[year]?.[month-1];return row?{value:row.coal,unit:"t"}:null;}
  const task=evidenceTask(ev);
  if(!task)return null;
  const entry=taskEntry(task);
  if(entry.activity===""||entry.activity===undefined)return null;
  return {value:Number(entry.activity),unit:task.unit};
}
function evidenceCheck(ev) {
  const filled=evidenceFilled(ev);
  const qty=ev.fields?.quantity;
  if(!filled||!(qty>0))return {state:"none",label:"—"};
  const billed=convertUnit(qty,ev.fields.unit,filled.unit);
  if(billed===null)return {state:"warn",label:"单位不一致"};
  const diff=filled.value?(filled.value-billed)/billed*100:0;
  if(Math.abs(diff)<0.5)return {state:"ok",label:"一致",diff,billed};
  return {state:Math.abs(diff)<5?"warn":"bad",label:(diff>0?"填报高 ":"填报低 ")+Math.abs(diff).toFixed(1)+"%",diff,billed};
}
function evidenceChip(ev) {
  const check=evidenceCheck(ev);
  return '<button class="evChip '+check.state+'" onclick="openEvidence(\''+ev.id+'\')" title="'+textHtml(ev.name)+'">'+textHtml(ev.no||ev.name)+'</button>';
}

// 单据预览（原件可下载；系统内的历史凭证按存档字段渲染为单据影像）
function billLines(ev) {
  const f=ev.fields||{};
  const lines=[];
  if(f.account)lines.push(["户号 / 账户",f.account]);
  if(f.holder)lines.push(["户名",f.holder]);
  if(f.product)lines.push(["产品",f.product]);
  if(f.period)lines.push(["结算期间",f.period]);
  if(f.quantity!==undefined&&f.quantity!==null)lines.push([f.qtyLabel||"数量",fmt(f.quantity,2)+" "+(f.unit||"")]);
  if(f.carbon)lines.push(["单位产品碳排放",f.carbon+" "+(f.carbonUnit||"")]);
  if(f.ncv)lines.push(["收到基低位发热量",f.ncv+" GJ/t"]);
  if(f.amount)lines.push(["金额",fmt(f.amount,2)+" 元"]);
  lines.push(["单据编号",f.docNo||ev.no]);
  return lines;
}
function billHtml(ev) {
  const f=ev.fields||{};
  return '<div class="billDoc"><div class="billHead"><b>'+textHtml(f.issuer||ev.org)+'</b><span>'+textHtml(ev.type)+'</span></div>'+
    '<table class="compact">'+billLines(ev).map(([k,v])=>'<tr><th>'+k+'</th><td>'+textHtml(String(v))+'</td></tr>').join("")+'</table>'+
    '<div class="billStamp">'+textHtml((f.issuer||"").replace(/有限公司|股份/g,"").slice(0,10))+'<br>业务专用章</div></div>';
}
function billCanvas(ev) {
  const lines=billLines(ev),f=ev.fields||{};
  const canvas=document.createElement("canvas");
  canvas.width=1100;canvas.height=200+lines.length*64;
  const g=canvas.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,canvas.width,canvas.height);
  g.fillStyle="#111";g.font='bold 34px "PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei",sans-serif';
  g.fillText((f.issuer||"")+" "+ev.type,60,80);
  g.strokeStyle="#999";g.beginPath();g.moveTo(60,110);g.lineTo(1040,110);g.stroke();
  g.font='26px "PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei",sans-serif';
  lines.forEach(([k,v],i)=>g.fillText(k+"："+v,60,170+i*64));
  return canvas;
}
async function downloadEvidence(id) {
  const ev=evidenceList().find(row=>row.id===id);
  if(!ev)return;
  if(ev.origin!=="seed") {
    const file=await evGetFile(id).catch(()=>null);
    if(file){const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=ev.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);return;}
  }
  billCanvas(ev).toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=ev.name.replace(/\.\w+$/,"")+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},"image/png");
}
async function openEvidence(id) {
  const ev=evidenceList().find(row=>row.id===id);
  if(!ev)return;
  const task=evidenceTask(ev);
  const check=evidenceCheck(ev);
  const filled=evidenceFilled(ev);
  let preview=billHtml(ev);
  if(ev.origin!=="seed") {
    const file=await evGetFile(id).catch(()=>null);
    if(file&&/^image\//.test(file.type))preview='<img class="evImage" src="'+URL.createObjectURL(file)+'" alt="'+textHtml(ev.name)+'">';
    else if(file&&file.type==="application/pdf")preview='<iframe class="evFrame" src="'+URL.createObjectURL(file)+'"></iframe>';
    else if(!file)preview='<div class="todoEmpty">原件不在当前设备</div>';
  }
  const f=ev.fields||{};
  openModal('<h2>'+textHtml(ev.no||ev.name)+'</h2><div class="evView"><div class="evPreview">'+preview+'</div><div>'+
    '<dl class="miniFacts"><div><dt>文件</dt><dd>'+textHtml(ev.name)+' · '+fileSizeText(ev.size||0)+'</dd></div><div><dt>类型</dt><dd>'+textHtml(ev.type)+'</dd></div>'+
    '<div><dt>关联数据</dt><dd>'+(task?'<button class="linkBtn" onclick="openUnifiedTask(\''+task.id+'\')">'+textHtml(task.name)+' · '+task.id+'</button>':textHtml(ev.taskId||"未关联"))+'</dd></div>'+
    '<div><dt>识别'+textHtml(f.qtyLabel||"数量")+'</dt><dd>'+(f.quantity!==undefined&&f.quantity!==null?fmt(f.quantity,2)+' '+textHtml(f.unit||""):'—')+'</dd></div>'+
    '<div><dt>填报值</dt><dd>'+(filled?fmt(filled.value,2)+' '+textHtml(filled.unit):'—')+'</dd></div>'+
    '<div><dt>一致性</dt><dd><span class="status '+({ok:"ok",warn:"warn",bad:"bad"}[check.state]||"gray")+'">'+check.label+'</span></dd></div>'+
    '<div><dt>上传</dt><dd>'+textHtml(ev.uploader||"")+' · '+textHtml(ev.uploadedAt||"")+'</dd></div>'+
    '<div><dt>核验</dt><dd>'+(ev.verified?'已核验 · '+textHtml(ev.verifiedBy||""):'待核验')+'</dd></div>'+
    '<div><dt>SHA-256</dt><dd class="mono">'+textHtml(String(ev.sha256||"").slice(0,24))+'…</dd></div></dl></div></div>'+
    '<div class="modalActions">'+(currentRole==="管理者"&&!ev.verified?'<button class="btn" onclick="verifyEvidence(\''+ev.id+'\')">核验通过</button>':'')+
    '<button class="btn" onclick="downloadEvidence(\''+ev.id+'\')">下载</button><button class="btn primary" data-close-modal="1">关闭</button></div>');
}
function verifyEvidence(id) {
  const ev=evidenceList().find(row=>row.id===id);
  ev.verified=true;ev.verifiedBy=MANAGER_NAME;ev.verifiedAt=new Date().toLocaleString("zh-CN",{hour12:false});
  persistDemo();closeModal();render();showToast("凭证已核验");
}

// ---------- 单据智能识别：OCR / PDF 文本层 + 字段抽取 ----------
let ocrWorkerPromise=null;
async function ocrWorker(progress) {
  await loadScriptOnce(VENDOR+"tess/tesseract.min.js");
  window.__ocrProgress=progress;
  ocrWorkerPromise ||= Tesseract.createWorker("chi_sim+eng",1,{workerPath:VENDOR+"tess/worker.min.js",corePath:VENDOR+"tess/",langPath:VENDOR+"lang/",gzip:true,
    logger:message=>window.__ocrProgress?.(message)}).then(async worker=>{await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});return worker;});
  return ocrWorkerPromise;
}
async function ocrImage(source,progress) {
  const worker=await ocrWorker(progress);
  const result=await worker.recognize(source);
  return {text:result.data.text,confidence:result.data.confidence/100,engine:"OCR"};
}
async function pdfText(buffer,progress) {
  await loadScriptOnce(VENDOR+"pdf.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc=VENDOR+"pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
  let text="";
  for(let page=1;page<=Math.min(pdf.numPages,5);page++) {
    const content=await (await pdf.getPage(page)).getTextContent();
    let lastY=null;
    content.items.forEach(item=>{const y=Math.round(item.transform[5]);text+=(lastY!==null&&Math.abs(y-lastY)>3?"\n":"")+item.str;lastY=y;});
    text+="\n";
  }
  if(text.replace(/\s/g,"").length>=20)return {text,confidence:0.99,engine:"PDF 文本层"};
  progress?.({status:"扫描件，转 OCR",progress:0});
  const page=await pdf.getPage(1);
  const viewport=page.getViewport({scale:2});
  const canvas=document.createElement("canvas");canvas.width=viewport.width;canvas.height=viewport.height;
  await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
  return ocrImage(canvas,progress);
}
async function extractFileText(file,progress) {
  const name=file.name.toLowerCase();
  if(file.type.startsWith("image/"))return ocrImage(file,progress);
  if(file.type==="application/pdf"||name.endsWith(".pdf"))return pdfText(await file.arrayBuffer(),progress);
  if(/\.(csv|txt|tsv)$/.test(name))return {text:await file.text(),confidence:1,engine:"文本"};
  return {text:"",confidence:0,engine:"不支持"};
}
const QTY_KEYS = ["本期电量","结算电量","下网电量","用电量","电量","用气量","气量","加油量","充注量","入厂煤量","入炉煤量","煤量","用汽热量","热量","货物周转量","周转量","通勤里程","入库量","供货量","数量","用量","重量"];
function cleanOcr(text) {
  return String(text).replace(/[：]/g,":").replace(/，/g,",").replace(/[ \t]+/g," ")
    .replace(/(\d)\s+(?=[\d,.]*\d)/g,(m,d)=>d).replace(/N\s*m\s*[3³]/g,"Nm³").replace(/m\s*[3³]/g,"m³").replace(/k\s*W\s*h/gi,"kWh").replace(/M\s*W\s*h/g,"MWh");
}
function parseEvidenceText(raw) {
  const text=cleanOcr(raw);
  const lines=text.split(/\n+/).map(line=>line.trim()).filter(Boolean);
  const fields={},conf={};
  const take=(key,value,c)=>{if(value!==undefined&&value!==null&&value!==""&&fields[key]===undefined){fields[key]=value;conf[key]=c;}};
  const issuerLine=lines.find(line=>/(公司|中心|部|集团)/.test(line)&&line.length<=40);
  if(issuerLine)take("issuer",issuerLine.replace(/(电费|燃气|蒸汽)?(结算单|对账单|汇总表|明细|声明|记录).*$/,"").trim(),0.8);
  const type=DOC_TYPES.map(row=>row.type).concat(["产品碳足迹声明","入厂煤计量与化验单","增值税专用发票","运输周转量汇总表"]).find(name=>text.includes(name));
  if(type)take("type",type,0.95);
  const labeled=(labels,pattern)=>{for(const label of labels){const m=text.match(new RegExp(label+"\\s*[:]?\\s*"+pattern));if(m)return m;}return null;};
  let m=labeled(["户号","用户编号","客户编号","账户","合同号"],"([A-Z0-9][A-Z0-9 \\-]{4,24})");if(m)take("account",m[1].trim(),0.95);
  m=labeled(["户名","用户名称","客户名称","购买方名称","采购方","客户"],"([\\u4e00-\\u9fa5（）()A-Za-z]{4,40})");if(m)take("holder",m[1].trim(),0.9);
  m=labeled(["产品名称","产品","物料"],"([\\u4e00-\\u9fa5A-Za-z0-9 \\-]{2,30})");if(m)take("product",m[1].trim(),0.85);
  m=text.match(/(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})?\s*日?\s*(至|到|-|—|~|～)\s*(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})?/);
  if(m)take("period",m[1]+"-"+m[2].padStart(2,"0")+(m[3]?"-"+m[3].padStart(2,"0"):"")+" 至 "+m[5]+"-"+m[6].padStart(2,"0")+(m[7]?"-"+m[7].padStart(2,"0"):""),0.95);
  else if((m=text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)))take("period",m[1]+"-"+m[2].padStart(2,"0"),0.8);
  m=labeled(["单据编号","结算单号","发票号码","编号","凭证号","No\\.?"],"([A-Z0-9][A-Z0-9\\-]{5,30})");if(m)take("docNo",m[1],0.95);
  const unitPattern="(万kWh|万千瓦时|MWh|kWh|千瓦时|万m³|万立方米|Nm³|m³|立方米|t·km|吨公里|tkm|人·km|kg|千克|公斤|GJ|吉焦|吨|t|升|L)";
  const numberPattern="([\\d,]+(?:\\.\\d+)?)";
  let qty=null;
  for(const key of QTY_KEYS) {
    const hit=text.match(new RegExp(key+"[^\\d\\n]{0,8}"+numberPattern+"\\s*"+unitPattern));
    if(hit){qty={value:Number(hit[1].replace(/,/g,"")),unit:hit[2],label:key,c:0.95};break;}
  }
  if(!qty) {
    const hits=[...text.matchAll(new RegExp(numberPattern+"\\s*"+unitPattern+"(?![A-Za-z])","g"))].map(hit=>({value:Number(hit[1].replace(/,/g,"")),unit:hit[2]})).filter(hit=>hit.value>0);
    if(hits.length){hits.sort((a,b)=>b.value-a.value);qty={...hits[0],label:"数量",c:0.7};}
  }
  if(qty){take("quantity",qty.value,qty.c);take("unit",unitBase(qty.unit)&&EV_UNITS[qty.unit][0]===qty.unit?qty.unit:qty.unit,qty.c);take("qtyLabel",qty.label,qty.c);}
  m=text.match(/(金额|合计|价税合计|应付|电费|费用)[^\d\n]{0,10}([\d,]+\.\d{2})/);if(m)take("amount",Number(m[2].replace(/,/g,"")),0.9);
  m=text.match(/([\d.]+)\s*kg\s*CO\s*[2₂]\s*e?\s*\/\s*(kg|t|件|台|t·km)/i);if(m)take("carbon",Number(m[1]),0.9),take("carbonUnit","kgCO₂e/"+m[2],0.9);
  m=text.match(/低位发热量[^\d\n]{0,8}([\d.]+)/);if(m)take("ncv",Number(m[1]),0.9);
  return {fields,conf,lines};
}
function suggestTaskFor(fields) {
  const tasks=workflowTasks().filter(task=>!task.locked&&(currentRole!=="填报人"||task.owner===fillerIdentity));
  const typeDoc=DOC_TYPES.find(row=>row.type===fields.type);
  return tasks.map(task=>{
    let score=0;
    const doc=docTypeFor(task.name);
    if(typeDoc&&doc&&doc.type===typeDoc.type)score+=0.45;
    if(fields.issuer&&doc&&doc.issuer.slice(0,4)===fields.issuer.slice(0,4))score+=0.2;
    if(fields.unit&&convertUnit(1,fields.unit,task.unit)!==null)score+=0.2;
    const shortOrg=String(task.org||"").replace(/江南流体装备集团?/,"");
    if(fields.holder&&shortOrg&&fields.holder.includes(shortOrg))score+=0.15;
    return {task,score};
  }).filter(row=>row.score>=0.35).sort((a,b)=>b.score-a.score);
}
// 识别并登记一个文件，返回凭证记录
async function ingestEvidence(file,{taskId,source,org,onProgress}={}) {
  if(file.size>15*1024*1024)throw new Error("文件超过 15 MB");
  const buffer=await file.arrayBuffer();
  const sha256=await sha256Hex(buffer);
  const duplicate=evidenceList().find(row=>row.sha256===sha256);
  const extracted=await extractFileText(file,onProgress);
  const parsed=parseEvidenceText(extracted.text);
  const list=evidenceList();
  const id="EV-"+String(Math.max(0,...list.map(row=>Number(row.id.slice(3))||0))+1).padStart(4,"0");
  const ev={id,no:parsed.fields.docNo||id,name:file.name,type:parsed.fields.type||"其他凭证",taskId:taskId||"",source:source||"组织填报",org:org||"",
    period:parsed.fields.period||"",uploader:currentPerson(),uploadedAt:new Date().toLocaleString("zh-CN",{hour12:false}),size:file.size,sha256,
    fields:parsed.fields,confidence:parsed.conf,engine:extracted.engine,ocrConfidence:extracted.confidence,rawText:extracted.text.slice(0,4000),
    verified:false,status:taskId?"已关联":"未关联",origin:"upload",duplicateOf:duplicate?.id||""};
  await evPutFile(id,file);
  list.push(ev);
  persistDemo();
  return ev;
}

// ---------- 填报弹窗：凭证与识别 ----------
function extractionTable(ev,task) {
  const f=ev.fields||{},c=ev.confidence||{};
  const rows=[["type","单据类型"],["issuer","开具方"],["account","户号 / 账户"],["holder","户名"],["period","期间"],["quantity","识别用量"],["amount","金额（元）"],["carbon","单位碳排"],["docNo","单据编号"]]
    .filter(([key])=>f[key]!==undefined);
  const checks=[];
  if(task&&f.quantity>0) {
    const converted=convertUnit(f.quantity,f.unit,task.unit);
    checks.push(converted===null?['bad','单位 '+f.unit+' 无法换算为 '+task.unit]:['ok','换算为 '+fmt(converted,2)+' '+task.unit+(f.unit!==task.unit?'（'+f.unit+' → '+task.unit+'）':'')]);
  }
  if(task&&f.holder) {
    const shortOrg=String(task.org||"").replace(/江南流体装备集团?/,"");
    checks.push(shortOrg&&f.holder.includes(shortOrg)?['ok','户名与填报组织一致']:['warn','户名「'+f.holder+'」与填报组织「'+task.org+'」不一致']);
  }
  if(f.period)checks.push(String(f.period).includes(String(reportYear))?['ok','期间在 '+reportYear+' 年度内']:['warn','期间不在 '+reportYear+' 年度']);
  if(ev.duplicateOf)checks.push(['bad','与 '+ev.duplicateOf+' 为同一文件']);
  return '<div class="extractBox"><div class="extractHead"><b>识别结果</b><span>'+textHtml(ev.engine||"")+(ev.ocrConfidence?' · 置信度 '+Math.round(ev.ocrConfidence*100)+'%':'')+'</span></div>'+
    (rows.length?'<table class="compact"><tbody>'+rows.map(([key,label])=>'<tr><th>'+label+'</th><td>'+textHtml(key==="quantity"?fmt(f.quantity,2)+' '+(f.unit||''):key==="carbon"?f.carbon+' '+(f.carbonUnit||''):key==="amount"?fmt(f.amount,2):String(f[key]))+'</td><td class="conf"><i style="width:'+Math.round((c[key]||0.7)*100)+'%"></i></td></tr>').join("")+'</tbody></table>':'<div class="todoEmpty">未识别到结构化字段</div>')+
    (checks.length?'<ul class="checkList small">'+checks.map(([tone,text])=>'<li class="'+tone+'"><i>'+(tone==="ok"?'✓':'!')+'</i><b>'+textHtml(text)+'</b><small></small></li>').join("")+'</ul>':'')+
    (ev.rawText?'<details class="calculationHelp"><summary>识别原文</summary><pre class="rawText">'+textHtml(ev.rawText)+'</pre></details>':'')+'</div>';
}
function evidencePanel(taskId,editable) {
  const list=evidenceFor(taskId);
  return '<div class="evPanel" id="evPanel"><div class="evPanelHead"><b>凭证</b>'+(editable?'<label class="btn soft evUpload">上传凭证并识别<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.txt" onchange="uploadTaskEvidence(this,\''+taskId+'\')"></label>':'')+'</div>'+
    '<div id="evProgress"></div>'+
    (list.length?'<ul class="evList">'+list.map(ev=>{const check=evidenceCheck(ev);
      return '<li>'+evidenceChip(ev)+'<span>'+textHtml(ev.type)+'</span><span class="status '+({ok:"ok",warn:"warn",bad:"bad"}[check.state]||"gray")+'">'+check.label+'</span>'+
        (ev.verified?'<span class="status ok">已核验</span>':'<span class="status gray">待核验</span>')+
        (editable&&ev.fields?.quantity>0?'<button class="linkBtn" onclick="applyExtraction(\''+ev.id+'\')">采用识别值</button>':'')+'</li>';}).join("")+'</ul>':'<div class="todoEmpty small">尚未上传凭证</div>')+
    '<div id="evExtract"></div></div>';
}
function evProgressText(message) {
  const node=document.getElementById("evProgress");
  if(!node)return;
  const label={"loading tesseract core":"加载识别引擎","initializing tesseract":"初始化识别引擎","loading language traineddata":"加载中文模型","initializing api":"准备识别","recognizing text":"识别文字"}[message.status]||message.status;
  node.innerHTML='<div class="ocrBar"><span>'+textHtml(label)+'</span><i style="width:'+Math.round((message.progress||0)*100)+'%"></i></div>';
}
async function uploadTaskEvidence(input,taskId) {
  const task=workflowTasks().find(row=>row.id===taskId);
  const files=[...input.files];
  input.disabled=true;
  let last=null;
  for(const file of files) {
    evProgressText({status:"读取 "+file.name,progress:0.05});
    try {last=await ingestEvidence(file,{taskId,source:task?.locked?"供应商":"组织填报",org:task?.locked?task.owner:task?.org,onProgress:evProgressText});}
    catch(error){showToast(error.message);}
  }
  input.disabled=false;
  const panel=document.getElementById("evPanel");
  if(panel)panel.outerHTML=evidencePanel(taskId,true);
  if(last) {
    document.getElementById("evExtract").innerHTML=extractionTable(last,task);
    const evidenceInput=document.getElementById("taskEvidence")||document.getElementById("supplierEvidence");
    if(evidenceInput&&!evidenceInput.value)evidenceInput.value=last.no;
    if(last.fields.quantity>0&&task)document.getElementById("evExtract").insertAdjacentHTML("beforeend",'<div class="modalActions left"><button class="btn primary" onclick="applyExtraction(\''+last.id+'\')">采用识别值填入</button></div>');
  }
}
function applyExtraction(id) {
  const ev=evidenceList().find(row=>row.id===id);
  const task=workflowTasks().find(row=>row.id===ev.taskId);
  if(!ev||!task)return;
  if(task.locked) {
    const qty=document.getElementById("demoSupplierQuantity"),carbon=document.getElementById("demoSupplierCarbon");
    const value=convertUnit(ev.fields.quantity,ev.fields.unit,task.unit);
    if(qty&&value!==null){qty.value=+value.toFixed(4);qty.dispatchEvent(new Event("input"));}
    if(carbon&&ev.fields.carbon){carbon.value=ev.fields.carbon;carbon.dispatchEvent(new Event("input"));}
    const evInput=document.getElementById("supplierEvidence");if(evInput)evInput.value=ev.no;
  } else {
    const value=convertUnit(ev.fields.quantity,ev.fields.unit,task.unit);
    if(value===null){showToast("单位无法换算为 "+task.unit);return;}
    const input=document.getElementById("taskActivity");
    if(input){input.value=+value.toFixed(4);previewTaskEmission(task.factor);}
    const evInput=document.getElementById("taskEvidence");if(evInput)evInput.value=ev.no;
  }
  showToast("已填入识别值，请核对后保存");
}
const openUnifiedTaskBeforeEvidence = openUnifiedTask;
openUnifiedTask = function (id,review) {
  openUnifiedTaskBeforeEvidence(id,review);
  const task=workflowTasks().find(row=>row.id===id);
  if(!task||task.locked)return;
  if(!document.getElementById("taskActivity"))return;
  const entry=taskEntry(task);
  const editable=currentRole==="填报人"&&task.owner===fillerIdentity&&!["通过","待审核","不适用"].includes(entry.status);
  document.getElementById("taskAttachment")?.closest("label")?.remove();
  document.getElementById("taskAttachmentLabel")?.remove();
  document.getElementById("taskPreview").insertAdjacentHTML("afterend",evidencePanel(id,editable)+factorPanel(task));
};
const editDemoSupplierBeforeEvidence = editDemoSupplier;
editDemoSupplier = function (index,review) {
  editDemoSupplierBeforeEvidence(index,review);
  const row=supplyScope3Items[index];
  if(!row||!document.getElementById("demoSupplierQuantity"))return;
  const editable=currentRole==="供应商"&&supplierAccess(index)&&row.status!=="待审核";
  document.querySelector('#modalContent input[type=file]')?.closest("label")?.remove();
  const anchor=document.querySelector("#modalContent .modalActions");
  anchor?.insertAdjacentHTML("beforebegin",evidencePanel("SUP-"+row.id,editable));
};
// 审核通过时同步核验关联凭证
const reviewUnifiedTaskBeforeEvidence = reviewUnifiedTask;
reviewUnifiedTask = async function (approved) {
  const id=openTaskId;
  await reviewUnifiedTaskBeforeEvidence(approved);
  if(approved&&taskEntry({id}).status==="通过"){evidenceFor(id).forEach(ev=>{ev.verified=true;ev.verifiedBy=MANAGER_NAME;});persistDemo();}
};
const reviewSupplierTaskBeforeEvidence = reviewSupplierTask;
reviewSupplierTask = async function (index,approved) {
  const id="SUP-"+supplyScope3Items[index].id;
  await reviewSupplierTaskBeforeEvidence(index,approved);
  if(approved&&supplyScope3Items[index].status==="已收集"){evidenceFor(id).forEach(ev=>{ev.verified=true;ev.verifiedBy=MANAGER_NAME;});persistDemo();}
};

// ---------- 凭证库页面 ----------
let evFilter={source:"",check:"",search:""};
function setEvFilter(key,value){evFilter[key]=value;render();}
function evidencePage() {
  const all=evidenceList().filter(ev=>currentRole!=="填报人"||evidenceTask(ev)?.owner===fillerIdentity);
  const rows=all.filter(ev=>(!evFilter.source||ev.source===evFilter.source)&&(!evFilter.check||(evFilter.check==="未关联"?ev.status==="未关联":evFilter.check==="待核验"?!ev.verified:evidenceCheck(ev).state===evFilter.check))&&
    (!evFilter.search||[ev.no,ev.name,ev.type,ev.org,ev.taskId].join(" ").includes(evFilter.search)));
  const mismatch=all.filter(ev=>["warn","bad"].includes(evidenceCheck(ev).state)).length;
  return pageHead("凭证库",'<button class="btn" onclick="exportFirstTable()">导出台账</button><label class="btn primary evUpload">批量上传识别<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.txt" onchange="batchUploadEvidence(this)"></label>',"组织碳排放 / 凭证管理 / 凭证库")+
    '<div class="statRow five">'+statTile("凭证总数",all.length,"份","setEvFilter(\'check\',\'\')")+statTile("已核验",all.filter(ev=>ev.verified).length,"份")+statTile("待核验",all.filter(ev=>!ev.verified).length,"份","setEvFilter(\'check\',\'待核验\')")+
      statTile("识别值与填报不一致",mismatch,"份","setEvFilter(\'check\',\'bad\')")+statTile("未关联",all.filter(ev=>ev.status==="未关联").length,"份","setEvFilter(\'check\',\'未关联\')")+'</div>'+
    '<div id="evBatch"></div>'+
    '<div class="taskToolbar"><label>来源<select onchange="setEvFilter(\'source\',this.value)"><option value="">全部来源</option>'+["组织填报","供应商","碳履约"].map(value=>'<option '+(evFilter.source===value?'selected':'')+'>'+value+'</option>').join("")+'</select></label>'+
      '<label>状态<select onchange="setEvFilter(\'check\',this.value)"><option value="">全部</option>'+[["ok","一致"],["warn","小幅差异"],["bad","不一致"],["待核验","待核验"],["未关联","未关联"]].map(([value,label])=>'<option value="'+value+'" '+(evFilter.check===value?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
      '<label class="taskSearch">查找<input id="evSearch" value="'+textHtml(evFilter.search)+'" placeholder="编号、文件、组织" onkeydown="if(event.key===\'Enter\')setEvFilter(\'search\',this.value)"></label><button class="btn" onclick="setEvFilter(\'search\',document.getElementById(\'evSearch\').value)">查询</button><span>'+rows.length+' 份</span></div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>凭证编号</th><th>类型</th><th>来源 / 组织</th><th>关联数据</th><th>识别值</th><th>填报值</th><th>一致性</th><th>核验</th><th>上传</th><th></th></tr></thead><tbody>'+
    (rows.length?rows.slice().reverse().map(ev=>{const task=evidenceTask(ev),filled=evidenceFilled(ev),check=evidenceCheck(ev),f=ev.fields||{};
      return '<tr><td>'+evidenceChip(ev)+'<small>'+textHtml(ev.name)+'</small></td><td>'+textHtml(ev.type)+'</td><td>'+textHtml(ev.source)+'<small>'+textHtml(ev.org)+'</small></td><td>'+
        (task?'<button class="linkBtn" onclick="openUnifiedTask(\''+task.id+'\')">'+textHtml(task.name)+'</button><small>'+task.id+'</small>':ev.taskId?textHtml(ev.taskId):(currentRole!=="供应商"?'<button class="btn" onclick="linkEvidence(\''+ev.id+'\')">关联</button>':'—'))+'</td><td>'+
        (f.quantity>0?fmt(f.quantity,2)+' '+textHtml(f.unit||""):'—')+'</td><td>'+(filled?fmt(filled.value,2)+' '+textHtml(filled.unit):'—')+'</td><td><span class="status '+({ok:"ok",warn:"warn",bad:"bad"}[check.state]||"gray")+'">'+check.label+'</span></td><td>'+
        (ev.verified?'<span class="status ok">已核验</span>':'<span class="status gray">待核验</span>')+'</td><td>'+textHtml(ev.uploader||"")+'<small>'+textHtml(String(ev.uploadedAt||"").slice(0,16))+'</small></td><td><button class="btn" onclick="openEvidence(\''+ev.id+'\')">查看</button></td></tr>';}).join(""):
      '<tr><td colspan="10" class="emptyCell">没有符合条件的凭证</td></tr>')+'</tbody></table></div>';
}
async function batchUploadEvidence(input) {
  const files=[...input.files];
  const box=document.getElementById("evBatch");
  const results=[];
  for(const [index,file] of files.entries()) {
    box.innerHTML='<section class="panel"><div class="panelHead"><h3>识别中 '+(index+1)+' / '+files.length+' · '+textHtml(file.name)+'</h3></div><div id="evProgress"></div></section>';
    try {
      const ev=await ingestEvidence(file,{onProgress:evProgressText});
      const best=suggestTaskFor(ev.fields)[0];
      results.push({ev,best});
    } catch(error){showToast(error.message);}
  }
  render();
  document.getElementById("evBatch").innerHTML='<section class="panel"><div class="panelHead"><h3>本次识别 '+results.length+' 份</h3></div><div class="tableWrap"><table class="compact"><thead><tr><th>文件</th><th>类型</th><th>识别用量</th><th>期间</th><th>建议关联</th><th>匹配度</th><th></th></tr></thead><tbody>'+
    results.map(({ev,best})=>'<tr><td>'+evidenceChip(ev)+'<small>'+textHtml(ev.name)+'</small></td><td>'+textHtml(ev.type)+'</td><td>'+(ev.fields.quantity>0?fmt(ev.fields.quantity,2)+' '+textHtml(ev.fields.unit||""):'—')+'</td><td>'+textHtml(ev.fields.period||"—")+'</td><td>'+
      (best?textHtml(best.task.name)+'<small>'+best.task.id+' · '+textHtml(best.task.org)+'</small>':'—')+'</td><td>'+(best?Math.round(best.score*100)+'%':'—')+'</td><td>'+
      (best?'<button class="btn primary" onclick="confirmEvidenceLink(\''+ev.id+'\',\''+best.task.id+'\')">确认关联</button>':'<button class="btn" onclick="linkEvidence(\''+ev.id+'\')">手动关联</button>')+'</td></tr>').join("")+'</tbody></table></div></section>';
}
function linkEvidence(id) {
  const ev=evidenceList().find(row=>row.id===id);
  const options=suggestTaskFor(ev.fields||{});
  const others=workflowTasks().filter(task=>!task.locked&&!options.some(row=>row.task.id===task.id));
  openModal('<h2>关联凭证 '+textHtml(ev.no)+'</h2><div class="modalForm"><label>关联到<select id="evLinkTask">'+
    options.map(row=>'<option value="'+row.task.id+'">'+textHtml(row.task.name)+' · '+textHtml(row.task.org)+'（匹配 '+Math.round(row.score*100)+'%）</option>').join("")+
    others.map(task=>'<option value="'+task.id+'">'+textHtml(task.name)+' · '+textHtml(task.org)+'</option>').join("")+'</select></label></div>'+
    '<div class="modalActions"><button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="confirmEvidenceLink(\''+id+'\',document.getElementById(\'evLinkTask\').value)">确认</button></div>');
}
function confirmEvidenceLink(id,taskId) {
  const ev=evidenceList().find(row=>row.id===id);
  const task=workflowTasks().find(row=>row.id===taskId);
  ev.taskId=taskId;ev.status="已关联";ev.org=task?.org||ev.org;
  persistDemo();closeModal();render();showToast("已关联到 "+(task?.name||taskId));
}

// ---------- 排放因子智能匹配 ----------
const FACTOR_DB = [
  {id:"EF-E01",name:"全国电网平均排放因子",keys:"外购电力 电网 用电 购入电力 下网",value:0.0005703,unit:"kWh",region:"全国",year:2022,source:"生态环境部 2024 年公布（2022 年度）",scope:"2"},
  {id:"EF-E02",name:"全国电网平均排放因子",keys:"外购电力 电网 用电 购入电力",value:0.000581,unit:"kWh",region:"全国",year:2021,source:"生态环境部 2022 年发布",scope:"2"},
  {id:"EF-E04",name:"绿色电力（绿证对应电量）",keys:"绿电 绿证 可再生 光伏 风电",value:0,unit:"kWh",region:"全国",year:2024,source:"市场法 · 绿证电量",scope:"2"},
  {id:"EF-H01",name:"外购热力（蒸汽）缺省因子",keys:"蒸汽 热力 外购蒸汽 供热",value:0.11,unit:"GJ",region:"全国",year:2015,source:"工业企业温室气体核算指南 热力缺省值",scope:"2"},
  {id:"EF-F01",name:"天然气燃烧",keys:"天然气 燃气 锅炉 管道气",value:0.0021622,unit:"Nm³",region:"全国",year:2015,source:"IPCC 2006 / 国家核算指南缺省参数",scope:"1"},
  {id:"EF-F02",name:"柴油燃烧（体积口径）",keys:"柴油 叉车 发电机 运输车辆",value:0.0026006,unit:"L",region:"全国",year:2015,source:"国家核算指南 · 密度 0.84 kg/L",scope:"1"},
  {id:"EF-F03",name:"柴油燃烧（质量口径）",keys:"柴油",value:3.0959,unit:"t",region:"全国",year:2015,source:"国家核算指南缺省参数",scope:"1"},
  {id:"EF-F04",name:"汽油燃烧（体积口径）",keys:"汽油 公务车 车辆",value:0.0021354,unit:"L",region:"全国",year:2015,source:"国家核算指南 · 密度 0.73 kg/L",scope:"1"},
  {id:"EF-F05",name:"液化石油气燃烧",keys:"液化石油气 LPG 食堂",value:3.1013,unit:"t",region:"全国",year:2015,source:"国家核算指南缺省参数",scope:"1"},
  {id:"EF-F06",name:"烟煤（缺省参数）",keys:"燃煤 烟煤 原煤 锅炉 热电",value:1.9003,unit:"t",region:"全国",year:2022,source:"发电设施核算指南缺省值",scope:"1"},
  {id:"EF-F07",name:"烟煤（实测低位发热量 21.18 GJ/t）",keys:"燃煤 烟煤 热电联产 入炉煤 实测",value:2.0047,unit:"t",region:"浙江",year:2025,source:"企业实测 · 发电设施核算指南",scope:"1"},
  {id:"EF-R01",name:"HFC-134a 逸散（GWP AR6）",keys:"R134a 制冷剂 空调 冷水机组 HFC-134a",value:1.53,unit:"kg",region:"全球",year:2021,source:"IPCC AR6 GWP100 = 1530",scope:"1"},
  {id:"EF-R02",name:"HFC-134a 逸散（GWP AR5）",keys:"R134a 制冷剂 空调 HFC-134a",value:1.3,unit:"kg",region:"全球",year:2014,source:"IPCC AR5 GWP100 = 1300",scope:"1"},
  {id:"EF-R03",name:"HFC-134a 逸散（GWP AR4）",keys:"R134a 制冷剂 HFC-134a",value:1.43,unit:"kg",region:"全球",year:2007,source:"IPCC AR4 GWP100 = 1430",scope:"1"},
  {id:"EF-R04",name:"R410A 逸散（GWP AR6）",keys:"R410A 制冷剂 多联机",value:2.256,unit:"kg",region:"全球",year:2021,source:"IPCC AR6",scope:"1"},
  {id:"EF-M01",name:"热轧钢材",keys:"钢材 钢板 型钢 采购 原材料",value:2.06,unit:"t",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M02",name:"冷轧无取向电工钢",keys:"电工钢 硅钢 定转子 冲片",value:0.00245,unit:"kg",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M03",name:"灰铸铁铸件",keys:"铸件 铸铁 泵体 HT250",value:0.00191,unit:"kg",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M04",name:"电解铜 / 漆包铜线",keys:"铜 铜材 电磁线 漆包线",value:0.0046,unit:"kg",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M05",name:"原铝",keys:"铝 铝锭 铝型材",value:0.0165,unit:"kg",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M06",name:"ABS 树脂",keys:"ABS 塑料 注塑",value:3.1,unit:"t",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-M07",name:"瓦楞纸箱",keys:"纸箱 包装 瓦楞",value:0.0011,unit:"kg",region:"全国",year:2022,source:"中国产品全生命周期温室气体排放系数库",scope:"3"},
  {id:"EF-T01",name:"公路货运（重型柴油货车）",keys:"公路运输 货物运输 货车 物流",value:0.000087,unit:"t·km",region:"全国",year:2022,source:"交通运输行业排放因子",scope:"3"},
  {id:"EF-T02",name:"铁路货运",keys:"铁路运输 货物运输",value:0.0000185,unit:"t·km",region:"全国",year:2022,source:"交通运输行业排放因子",scope:"3"},
  {id:"EF-T03",name:"内河水运",keys:"水运 船舶 货物运输",value:0.000012,unit:"t·km",region:"全国",year:2022,source:"交通运输行业排放因子",scope:"3"},
  {id:"EF-T04",name:"下游配送（城配轻型货车）",keys:"下游配送 配送运输 城配",value:0.000091,unit:"t·km",region:"全国",year:2022,source:"交通运输行业排放因子",scope:"3"},
  {id:"EF-B01",name:"高铁出行（支出法）",keys:"高铁 差旅 火车",value:0.000003,unit:"元",region:"全国",year:2020,source:"投入产出表派生",scope:"3"},
  {id:"EF-B02",name:"国内航空出行",keys:"航空 差旅 机票",value:0.000155,unit:"人·km",region:"全国",year:2022,source:"民航行业排放因子",scope:"3"},
  {id:"EF-B03",name:"私家车通勤（汽油乘用车）",keys:"通勤 私家车 员工通勤",value:0.000192,unit:"人·km",region:"全国",year:2022,source:"交通运输行业排放因子",scope:"3"},
  {id:"EF-W01",name:"一般工业固废填埋",keys:"固废 填埋 废弃物",value:0.21,unit:"t",region:"全国",year:2019,source:"IPCC 2019 修订",scope:"3"},
  {id:"EF-W02",name:"废弃产品焚烧",keys:"报废 焚烧 废弃物",value:0.62,unit:"t",region:"全国",year:2019,source:"IPCC 2019 修订",scope:"3"},
  {id:"EF-S01",name:"通用设备制造业（支出法）",keys:"设备 购置 资本品 机械",value:0.62,unit:"万元",region:"全国",year:2020,source:"中国投入产出表 2020 派生",scope:"3"},
  {id:"EF-S02",name:"电气机械和器材（支出法）",keys:"电机 电气 配套",value:0.74,unit:"万元",region:"全国",year:2020,source:"中国投入产出表 2020 派生",scope:"3"},
  {id:"EF-S03",name:"橡胶和塑料制品（支出法）",keys:"密封件 橡胶 塑料",value:1.18,unit:"万元",region:"全国",year:2020,source:"中国投入产出表 2020 派生",scope:"3"},
  {id:"EF-S04",name:"造纸和纸制品（支出法）",keys:"包装 纸制品 托盘",value:1.42,unit:"万元",region:"全国",year:2020,source:"中国投入产出表 2020 派生",scope:"3"},
  {id:"EF-S05",name:"金属制品业（支出法）",keys:"机加工 外协 金属制品 轴承",value:1.05,unit:"万元",region:"全国",year:2020,source:"中国投入产出表 2020 派生",scope:"3"},
  {id:"EF-S06",name:"被投企业营收（PCAF 行业平均）",keys:"投资 被投企业 营收",value:0.7532,unit:"万元",region:"全国",year:2022,source:"PCAF 行业平均排放强度",scope:"3"}
];
const FACTOR_SYNONYMS = {"电":"电力 电网","气":"天然气","煤":"燃煤","汽":"蒸汽 热力","运":"运输"};
function bigrams(text) {
  const clean=String(text).toLowerCase().replace(/[\s·（）()\/\-，,]/g,"");
  const set=new Set();
  for(let i=0;i<clean.length-1;i++)set.add(clean.slice(i,i+2));
  if(clean.length===1)set.add(clean);
  return set;
}
function dice(a,b) {
  const x=bigrams(a),y=bigrams(b);
  if(!x.size||!y.size)return 0;
  let hit=0;x.forEach(item=>{if(y.has(item))hit++;});
  return 2*hit/(x.size+y.size);
}
function matchFactors(task,limit=5) {
  const query=task.name+" "+(task.factorLabel||"")+" "+(task.scope==="3"?categoryName(task.category):"");
  const region=/嘉兴|湖州|杭州|浙江/.test(task.org||"")?"浙江":"";
  return FACTOR_DB.map(row=>{
    const nameSim=Math.max(dice(task.name,row.name),dice(query,row.name+" "+row.keys));
    const keyHit=row.keys.split(" ").some(key=>key.length>1&&query.includes(key))?1:0;
    const text=Math.min(1,nameSim*0.6+keyHit*0.55);
    const converted=convertUnit(1,task.unit,row.unit);
    const unitScore=row.unit===task.unit?1:converted!==null?0.85:0;
    const scopeScore=row.scope===task.scope?1:0.3;
    const regionScore=row.region===region?1:row.region==="华东"&&region?0.85:row.region==="全国"?0.7:0.5;
    const recency=Math.max(0,1-(CURRENT_YEAR-row.year)/12);
    const score=unitScore?text*0.55+unitScore*0.2+scopeScore*0.1+regionScore*0.07+recency*0.08:text*0.3;
    const value=converted!==null?row.value*converted:null;
    const reasons=[];
    if(keyHit||nameSim>0.3)reasons.push("名称语义匹配");
    if(unitScore===1)reasons.push("单位一致");else if(unitScore)reasons.push(row.unit+" → "+task.unit+" 自动换算");else reasons.push("单位不可换算");
    if(row.region!=="全国")reasons.push("区域 "+row.region);
    reasons.push(row.year+" 年");
    return {row,score,value,reasons};
  }).filter(item=>item.value!==null&&item.score>0.35).sort((a,b)=>b.score-a.score).slice(0,limit);
}
function factorPanel(task) {
  if(task.locked)return "";
  const override=demo.factorOverrides?.[task.id];
  return '<div class="factorBox" id="factorBox"><div class="evPanelHead"><b>排放因子</b><button class="btn soft" onclick="showFactorMatches(\''+task.id+'\')">智能匹配</button></div>'+
    '<div class="factorNow"><span>'+textHtml(task.factorLabel)+'</span><b>'+task.factor+' tCO₂e/'+textHtml(task.unit)+'</b>'+(override?'<small>'+textHtml(override.source)+' · '+textHtml(override.by)+' 于 '+textHtml(override.at)+' 采用</small>':'')+'</div><div id="factorMatches"></div></div>';
}
function factorMatchTable(task,matches) {
  const manager=currentRole==="管理者";
  return '<table class="compact matchTable"><thead><tr><th>候选因子</th><th>值 (tCO₂e/'+textHtml(task.unit)+')</th><th>来源</th><th>匹配度</th><th></th></tr></thead><tbody>'+
    matches.map(item=>{const diff=task.factor?(item.value-task.factor)/task.factor*100:0;const current=Math.abs(diff)<0.05;
      return '<tr><td><b>'+textHtml(item.row.name)+'</b><small>'+item.reasons.map(textHtml).join(" · ")+'</small></td><td>'+(+item.value.toPrecision(5))+(current?'<small>当前在用</small>':'<small class="'+(diff>0?'badText':'okText')+'">较当前 '+(diff>0?'+':'')+diff.toFixed(1)+'%</small>')+'</td><td><small>'+textHtml(item.row.source)+'</small></td>'+
        '<td><span class="scoreBar"><i style="width:'+Math.round(item.score*100)+'%"></i></span>'+Math.round(item.score*100)+'%</td><td>'+(manager&&!current?'<button class="btn" onclick="applyFactor(\''+task.id+'\',\''+item.row.id+'\')">采用</button>':'')+'</td></tr>';}).join("")+'</tbody></table>';
}
function showFactorMatches(taskId) {
  const task=workflowTasks().find(row=>row.id===taskId);
  const matches=matchFactors(task);
  document.getElementById("factorMatches").innerHTML=matches.length?factorMatchTable(task,matches):'<div class="todoEmpty">因子库中没有单位可换算的候选因子</div>';
}
async function applyFactor(taskId,factorId) {
  const task=workflowTasks().find(row=>row.id===taskId);
  const row=FACTOR_DB.find(item=>item.id===factorId);
  const value=row.value*convertUnit(1,task.unit,row.unit);
  demo.factorOverrides ||= {};
  demo.factorOverrides[taskId]={value,label:row.name,source:row.source,factorId,by:MANAGER_NAME,at:new Date().toLocaleString("zh-CN",{hour12:false}),previous:task.factor};
  auditTask(taskId,"更换排放因子："+row.name+" "+(+value.toPrecision(5)));
  persistDemo();
  await loadBackendData();
  closeModal();render();showToast("已采用「"+row.name+"」，核算已更新");
}
const workflowTasksBeforeFactor = workflowTasks;
workflowTasks = function () {
  const overrides=demo.factorOverrides||{};
  return workflowTasksBeforeFactor().map(task=>overrides[task.id]&&!task.locked?{...task,factor:overrides[task.id].value,factorLabel:overrides[task.id].label}:task);
};
// 因子库 → 智能匹配：批量检查全部排放源
function factorMatchPage() {
  const tasks=workflowTasks().filter(task=>!task.locked);
  const rows=tasks.map(task=>{const best=matchFactors(task,1)[0];return {task,best,diff:best&&task.factor?(best.value-task.factor)/task.factor*100:0};});
  const high=rows.filter(row=>row.best&&row.best.score>=0.8&&Math.abs(row.diff)>=0.05);
  return pageHead("因子智能匹配",'<button class="btn" onclick="exportFirstTable()">导出</button>'+(currentRole==="管理者"&&high.length?'<button class="btn primary" onclick="applyAllFactors()">采用全部高置信建议（'+high.length+'）</button>':''),"基础配置 / 因子库管理 / 因子智能匹配")+
    '<div class="statRow">'+statTile("排放源",tasks.length,"项")+statTile("与推荐一致",rows.filter(row=>row.best&&Math.abs(row.diff)<0.05).length,"项")+statTile("建议更换",rows.filter(row=>row.best&&Math.abs(row.diff)>=0.05).length,"项 · 高置信 "+high.length)+statTile("参考因子库",FACTOR_DB.length,"条")+'</div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>排放源</th><th>组织</th><th>当前因子</th><th>推荐因子</th><th>推荐值</th><th>差异</th><th>匹配度</th><th></th></tr></thead><tbody>'+
    rows.map(({task,best,diff})=>'<tr><td><strong>'+textHtml(task.name)+'</strong><small>'+task.id+' · 范围'+task.scope+'</small></td><td>'+textHtml(task.org)+'</td><td>'+textHtml(task.factorLabel)+'<small>'+(+Number(task.factor).toPrecision(5))+' tCO₂e/'+textHtml(task.unit)+'</small></td><td>'+
      (best?textHtml(best.row.name)+'<small>'+textHtml(best.row.source)+'</small>':'—')+'</td><td>'+(best?+best.value.toPrecision(5):'—')+'</td><td class="'+(Math.abs(diff)<0.05?'':diff>0?'badText':'okText')+'">'+(best?(Math.abs(diff)<0.05?'一致':(diff>0?'+':'')+diff.toFixed(1)+'%'):'—')+'</td><td>'+
      (best?'<span class="scoreBar"><i style="width:'+Math.round(best.score*100)+'%"></i></span>'+Math.round(best.score*100)+'%':'—')+'</td><td>'+(currentRole==="管理者"&&best&&Math.abs(diff)>=0.05?'<button class="btn" onclick="openFactorMatchModal(\''+task.id+'\')">选择</button>':'')+'</td></tr>').join("")+'</tbody></table></div>';
}
function openFactorMatchModal(taskId) {
  const task=workflowTasks().find(row=>row.id===taskId);
  openModal('<h2>'+textHtml(task.name)+' · 因子匹配</h2><div class="factorNow"><span>当前 '+textHtml(task.factorLabel)+'</span><b>'+task.factor+' tCO₂e/'+textHtml(task.unit)+'</b></div>'+factorMatchTable(task,matchFactors(task))+
    '<div class="modalActions"><button class="btn" data-close-modal="1">关闭</button></div>');
}
async function applyAllFactors() {
  const tasks=workflowTasks().filter(task=>!task.locked);
  demo.factorOverrides ||= {};
  let count=0;
  tasks.forEach(task=>{const best=matchFactors(task,1)[0];if(!best||best.score<0.8)return;const diff=task.factor?(best.value-task.factor)/task.factor*100:0;if(Math.abs(diff)<0.05)return;
    demo.factorOverrides[task.id]={value:best.value,label:best.row.name,source:best.row.source,factorId:best.row.id,by:MANAGER_NAME,at:new Date().toLocaleString("zh-CN",{hour12:false}),previous:task.factor};
    auditTask(task.id,"更换排放因子："+best.row.name);count++;});
  persistDemo();await loadBackendData();render();showToast("已采用 "+count+" 条推荐因子，核算已更新");
}

// ---------- 数据穿透 ----------
function taskForDetailRow(row) {
  const tasks=workflowTasks();
  return tasks.find(task=>task.name===row.source_name&&(task.locked||String(task.scope)===String(row.scope)))||
    tasks.find(task=>task.locked&&String(row.source_name).includes(task.owner)&&String(row.source_name).includes(task.name))||
    tasks.find(task=>scenarioText(task.name)===scenarioText(row.source_name));
}
let traceRows=[];
function traceDetail(index) {
  const row=traceRows[index];
  if(!row)return;
  const task=taskForDetailRow(row);
  const evs=task?evidenceFor(task.id):(row.evidence?[evidenceByNo(row.evidence)].filter(Boolean):[]);
  const log=task?(demo.auditLog||[]).filter(item=>item.taskId===task.id).slice(-6):[];
  openModal('<h2>'+textHtml(scenarioText(row.source_name))+'</h2>'+
    '<ol class="traceChain"><li><span>排放量</span><b>'+fmt(row.emission_tco2e,4)+' tCO₂e</b><small>范围'+row.scope+' · '+textHtml(categoryName(row.category_code))+'</small></li>'+
    '<li><span>计算</span><b>'+fmt(row.activity_value,2)+' '+textHtml(row.activity_unit)+' × '+(+Number(row.factor_value).toPrecision(5))+'</b><small>'+textHtml(row.quality||(task?.factorLabel)||"")+'</small></li>'+
    '<li><span>数据</span><b>'+(task?textHtml(task.id)+' · '+textHtml(task.locked?task.owner:task.org):'—')+'</b><small>'+(task?'负责人 '+textHtml(task.locked?"供应商":task.owner)+' · '+taskEntry(task).status:'')+'</small></li>'+
    '<li><span>凭证</span><b>'+evs.length+' 份</b><small>'+evs.filter(ev=>ev.verified).length+' 份已核验</small></li></ol>'+
    (evs.length?'<div class="tableWrap"><table class="compact"><thead><tr><th>凭证</th><th>类型</th><th>识别值</th><th>一致性</th><th>核验</th></tr></thead><tbody>'+evs.map(ev=>{const check=evidenceCheck(ev);
      return '<tr><td>'+evidenceChip(ev)+'</td><td>'+textHtml(ev.type)+'</td><td>'+(ev.fields?.quantity>0?fmt(ev.fields.quantity,2)+' '+textHtml(ev.fields.unit||""):'—')+'</td><td><span class="status '+({ok:"ok",warn:"warn",bad:"bad"}[check.state]||"gray")+'">'+check.label+'</span></td><td>'+(ev.verified?'已核验':'待核验')+'</td></tr>';}).join("")+'</tbody></table></div>':'')+
    (log.length?'<h3 class="subHead">处理记录</h3><ul class="feed">'+log.reverse().map(item=>'<li><time>'+textHtml(item.at)+'</time><span>'+textHtml(item.actor)+'</span>'+textHtml(item.action)+'</li>').join("")+'</ul>':'')+
    '<div class="modalActions">'+(task?'<button class="btn" onclick="openUnifiedTask(\''+task.id+'\')">打开数据</button>':'')+'<button class="btn primary" data-close-modal="1">关闭</button></div>');
}
function traceLink(row,label) {
  traceRows.push(row);
  return '<button class="linkBtn traceLink" onclick="traceDetail('+(traceRows.length-1)+')">'+label+'</button>';
}
function evidenceCell(row) {
  const task=taskForDetailRow(row);
  const evs=task?evidenceFor(task.id):[];
  if(evs.length)return evs.slice(0,2).map(evidenceChip).join("")+(evs.length>2?'<small>+'+(evs.length-2)+'</small>':'');
  const ev=row.evidence&&evidenceByNo(row.evidence);
  return ev?evidenceChip(ev):textHtml(row.evidence||"—");
}
const orgCalculationBeforeTrace = orgCalculation;
orgCalculation = function () {
  if(state.page!=="排放清单")return orgCalculationBeforeTrace();
  if(!backendState.ready)return needsBackend();
  traceRows=[];
  const detail=approvedDetail().slice().sort((a,b)=>String(a.scope).localeCompare(String(b.scope))||b.emission_tco2e-a.emission_tco2e);
  const total=detail.reduce((sum,row)=>sum+row.emission_tco2e,0);
  return pageHead("排放清单",'<button class="btn" onclick="exportFirstTable()">导出清单</button>',"组织碳排放 / 核算分析 / 排放清单")+
    '<div class="lcaMeta"><label>核算口径 <select onchange="changeStandard(this.value)">'+optionList(demo.standards,"code","name",backendState.standard)+
      '</select></label><span>已审核排放 <b>'+fmt(total,2)+' tCO₂e</b></span><span>'+detail.length+' 条活动数据</span></div>'+
    '<div class="taskTable tableWrap"><table><thead><tr><th>范围</th><th>排放源</th><th>类别</th><th>组织</th><th>活动数据</th><th>因子(tCO₂e/单位)</th><th>排放(tCO₂e)</th><th>占比</th><th>数据质量</th><th>凭证</th></tr></thead><tbody>'+
    detail.map(row=>'<tr><td>范围'+row.scope+'</td><td>'+traceLink(row,'<strong>'+textHtml(scenarioText(row.source_name))+'</strong>')+'</td><td>'+textHtml(categoryName(row.category_code))+
      '</td><td>'+textHtml(orgUnitName(row.org))+'</td><td>'+fmt(row.activity_value,2)+' '+textHtml(row.activity_unit)+'</td><td>'+(+Number(row.factor_value).toPrecision(5))+
      '</td><td>'+traceLink(row,fmt(row.emission_tco2e,2))+'</td><td>'+(total?(row.emission_tco2e/total*100).toFixed(1):0)+'%</td><td>'+qualityBadge(row.quality)+'</td><td>'+evidenceCell(row)+'</td></tr>').join("")+
    '</tbody></table></div>';
};
function qualityBadge(quality) {
  const tier={"一级":"ok","二级":"warn","三级":"bad"}[String(quality||"").slice(0,2)]||"ok";
  return '<span class="status '+tier+'">'+textHtml(quality||"一级 · 实测/票据")+'</span>';
}
showScopeDetail = function (scope) {
  traceRows=[];
  const rows=approvedDetail().filter(row=>String(row.scope)===scope).sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
  openModal('<h2>范围'+["","一","二","三"][scope]+' · 已审核排放明细</h2><div class="tableWrap"><table><thead><tr><th>排放源</th><th>类别</th><th>活动数据</th><th>因子</th><th>排放(tCO₂e)</th><th>凭证</th></tr></thead><tbody>'+
    rows.map(row=>'<tr><td>'+traceLink(row,textHtml(scenarioText(row.source_name)))+'</td><td>'+textHtml(categoryName(row.category_code))+'</td><td>'+fmt(row.activity_value,2)+' '+textHtml(row.activity_unit)+
      '</td><td>'+(+Number(row.factor_value).toPrecision(5))+'</td><td>'+fmt(row.emission_tco2e,2)+'</td><td>'+evidenceCell(row)+'</td></tr>').join("")+
    '</tbody></table></div><div class="modalActions"><button class="btn primary" data-close-modal="1">关闭</button></div>');
};

// ---------- 报告智能生成 ----------
function sourceKey(row){return scenarioText(row.source_name)+"|"+row.scope;}
function narrativeData() {
  const now=approvedDetail();
  const prev=typeof detailForYear==="function"?detailForYear(CURRENT_YEAR-1):[];
  const sum=rows=>rows.reduce((total,row)=>total+row.emission_tco2e,0);
  const byScope=rows=>{const out={"1":0,"2":0,"3":0};rows.forEach(row=>out[String(row.scope)]+=row.emission_tco2e);return out;};
  const prevMap={};prev.forEach(row=>{prevMap[sourceKey(row)]=row;});
  const drivers=now.map(row=>{const old=prevMap[sourceKey(row)];if(!old)return null;
    const activityEffect=(row.activity_value-old.activity_value)*old.factor_value;
    const factorEffect=row.activity_value*(row.factor_value-old.factor_value);
    return {row,old,delta:row.emission_tco2e-old.emission_tco2e,activityEffect,factorEffect};}).filter(Boolean);
  const comparable=drivers.map(item=>item.row);
  return {now,prev,total:sum(now),scopes:byScope(now),prevScopes:byScope(prev.filter(row=>drivers.some(item=>sourceKey(item.old)===sourceKey(row)))),
    drivers:drivers.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),comparableNow:sum(comparable),comparablePrev:sum(drivers.map(item=>item.old)),
    issues:workflowIssues()};
}
function measureList(data) {
  const find=pattern=>data.now.filter(row=>pattern.test(scenarioText(row.source_name)));
  const total=rows=>rows.reduce((sum,row)=>sum+row.emission_tco2e,0);
  const list=[];
  const coal=total(find(/燃煤/));
  if(coal)list.push({name:"热电机组掺烧农林生物质 10%",cut:coal*0.1,basis:"燃煤排放 "+fmt(coal,0)+" tCO₂e × 10%",cost:"中",scope:"1"});
  if(coal)list.push({name:"汽轮机通流改造，供电煤耗降低 8 g/kWh",cut:coal*0.026,basis:"按供电煤耗 305 g/kWh 测算节煤 2.6%",cost:"高",scope:"1"});
  const gas=total(find(/天然气/));
  if(gas)list.push({name:"燃气锅炉烟气余热回收",cut:gas*0.08,basis:"天然气排放 "+fmt(gas,0)+" tCO₂e × 8%",cost:"低",scope:"1"});
  const power=total(find(/外购电力/));
  if(power)list.push({name:"绿电交易覆盖 30% 外购电力",cut:power*0.3,basis:"外购电力排放 "+fmt(power,0)+" tCO₂e × 30%",cost:"中",scope:"2"});
  const use=total(find(/产品使用/));
  if(use)list.push({name:"主力泵型配套 IE5 电机、能效提升 3%",cut:use*0.03,basis:"产品使用阶段 "+fmt(use,0)+" tCO₂e × 3%",cost:"中",scope:"3"});
  const road=find(/公路运输/);
  if(road.length){const tkm=road.reduce((sum,row)=>sum+row.activity_value,0);list.push({name:"大宗原材料 20% 公转铁",cut:tkm*0.2*(0.000087-0.0000185),basis:fmt(tkm*0.2,0)+" t·km × (0.087−0.0185) kg/t·km",cost:"低",scope:"3"});}
  const steel=total(find(/钢材|铸件/));
  if(steel)list.push({name:"铸件与钢材采购 15% 切换为短流程低碳钢",cut:steel*0.15*0.6,basis:"相关排放 "+fmt(steel,0)+" tCO₂e × 15% × 60% 降幅",cost:"中",scope:"3"});
  return list.sort((a,b)=>b.cut-a.cut);
}
function generateNarrative(kind) {
  const d=narrativeData();
  const pctText=(a,b)=>b?((a-b)/b*100>=0?"上升 ":"下降 ")+Math.abs((a-b)/b*100).toFixed(1)+"%":"—";
  const sections=[];
  const s12=d.scopes["1"]+d.scopes["2"];
  const scope3=kind==="scope3";
  const totalNow=scope3?d.scopes["3"]:d.total;
  // 执行摘要
  const targetLines=typeof targets==="function"?targets().items.map(target=>{const status=targetStatus(target);return "「"+target.name+"」较 "+targets().baseYear+" 年已下降 "+status.reduced.toFixed(1)+"%，"+(status.ahead?"优于":"落后于")+"当年目标路径"+(status.ahead?"":" "+status.gap.toFixed(1)+"%")+"。";}).join(""):"";
  sections.push({title:"执行摘要",paras:[
    CURRENT_YEAR+" 年度已审核"+(scope3?"范围三":"温室气体")+"排放 "+fmt(totalNow,0)+" tCO₂e"+(scope3?"":"，其中范围一 "+fmt(d.scopes["1"],0)+"、范围二 "+fmt(d.scopes["2"],0)+"、范围三 "+fmt(d.scopes["3"],0)+" tCO₂e")+"。"+
      "与 "+(CURRENT_YEAR-1)+" 年可比口径（"+d.drivers.length+" 个排放源）相比，排放"+pctText(d.comparableNow,d.comparablePrev)+"。",
    targetLines,
    d.issues.length?"仍有 "+d.issues.length+" 项数据未完成审核，未计入本期数据，报告为草稿版本。":"全部填报数据已完成审核。"
  ].filter(Boolean)});
  // 排放结构
  const sorted=d.now.filter(row=>!scope3||String(row.scope)==="3").slice().sort((a,b)=>b.emission_tco2e-a.emission_tco2e);
  let acc=0;const pareto=[];
  for(const row of sorted){if(acc/totalNow>=0.8)break;pareto.push(row);acc+=row.emission_tco2e;}
  sections.push({title:"排放结构",paras:[
    pareto.length+" 个排放源贡献了 "+(acc/totalNow*100).toFixed(1)+"% 的排放："+pareto.map(row=>scenarioText(row.source_name)+"（"+(row.emission_tco2e/totalNow*100).toFixed(1)+"%）").join("、")+"。",
    scope3?"":"范围一、二合计 "+fmt(s12,0)+" tCO₂e，其中燃煤热电联产占范围一的 "+pct(d.now.filter(row=>/燃煤/.test(row.source_name)).reduce((s,r)=>s+r.emission_tco2e,0),d.scopes["1"])+"%，是直接排放的决定性来源。"
  ].filter(Boolean)});
  // 变化归因
  const top=d.drivers.filter(item=>!scope3||String(item.row.scope)==="3").slice(0,4);
  if(top.length)sections.push({title:"同比变化归因",paras:top.map(item=>scenarioText(item.row.source_name)+"："+(item.delta>=0?"增加 ":"减少 ")+fmt(Math.abs(item.delta),0)+" tCO₂e，其中活动水平变化贡献 "+(item.activityEffect>=0?"+":"")+fmt(item.activityEffect,0)+
    "，排放因子变化贡献 "+(item.factorEffect>=0?"+":"")+fmt(item.factorEffect,0)+"（活动量 "+fmt(item.old.activity_value,0)+" → "+fmt(item.row.activity_value,0)+" "+item.row.activity_unit+"）。")});
  // 数据质量
  const evs=evidenceList();
  const covered=d.now.filter(row=>{const task=taskForDetailRow(row);return task&&evidenceFor(task.id).length;});
  const coveredEmission=covered.reduce((sum,row)=>sum+row.emission_tco2e,0);
  const verifiedEvidence=evs.filter(ev=>ev.verified).length;
  const mismatch=evs.filter(ev=>["warn","bad"].includes(evidenceCheck(ev).state));
  const tiers={};d.now.forEach(row=>{const tier=String(row.quality||"一级").slice(0,2);tiers[tier]=(tiers[tier]||0)+row.emission_tco2e;});
  sections.push({title:"数据质量",paras:[
    "有凭证支撑的排放占 "+(coveredEmission/d.total*100).toFixed(1)+"%；凭证库共 "+evs.length+" 份，已核验 "+verifiedEvidence+" 份。",
    Object.entries(tiers).map(([tier,value])=>tier+"数据 "+(value/d.total*100).toFixed(1)+"%").join("，")+"（一级：实测或票据；二级：行业平均因子；三级：支出法）。",
    mismatch.length?mismatch.length+" 份凭证识别值与填报值存在差异："+mismatch.slice(0,3).map(ev=>ev.no+"（"+evidenceCheck(ev).label+"）").join("、")+"，建议在定稿前复核。":"凭证识别值与填报值全部一致。"
  ]});
  // 履约
  if(!scope3&&typeof etsCalc==="function") {
    const year=etsFocusYear(),calc=etsCalc(year);
    sections.push({title:"碳市场履约",paras:[year+" 年度核查排放 "+fmt(calc.verified,0)+" tCO₂，"+(calc.settled?"已于 "+calc.cycle.surrender.at+" 完成清缴。":(calc.gap>=0?"配额盈余 ":"配额缺口 ")+fmt(Math.abs(calc.gap),0)+" t，清缴截止 "+calc.cycle.deadline+"。")]});
  }
  // 减排建议
  const measures=measureList(d).filter(item=>!scope3||item.scope==="3");
  if(measures.length)sections.push({title:"减排建议",paras:measures.slice(0,5).map((item,index)=>(index+1)+". "+item.name+"：预计年减排 "+fmt(item.cut,0)+" tCO₂e，投入"+item.cost+"。测算依据："+item.basis+"。")});
  return {kind,generatedAt:new Date().toLocaleString("zh-CN",{hour12:false}),sections};
}
function openNarrative() {
  const kind=state.page==="范围三专项报告"?"scope3":"org";
  const saved=(demo.reportNarrative||{})[kind];
  showNarrative(saved||generateNarrative(kind),!!saved);
}
function showNarrative(doc,saved) {
  window.__narrative=doc;
  openModal('<h2>管理层分析'+(saved?' · 已插入报告':'')+'</h2><div class="narrativeMeta">生成于 '+textHtml(doc.generatedAt)+' · 基于 '+approvedDetail().length+' 条已审核数据、'+evidenceList().length+' 份凭证</div>'+
    '<div class="narrative" id="narrativeBody">'+doc.sections.map((section,index)=>'<section><h3>'+textHtml(section.title)+'</h3><div contenteditable="'+(currentRole==="管理者")+'" data-index="'+index+'">'+section.paras.map(text=>'<p>'+textHtml(text)+'</p>').join("")+'</div></section>').join("")+'</div>'+
    '<div class="modalActions"><button class="btn" onclick="regenNarrative()">重新生成</button>'+(currentRole==="管理者"?'<button class="btn primary" onclick="saveNarrative()">插入报告</button>':'<button class="btn primary" data-close-modal="1">关闭</button>')+'</div>');
}
function regenNarrative(){showNarrative(generateNarrative(window.__narrative.kind),false);showToast("已按最新数据重新生成");}
function saveNarrative() {
  const doc=window.__narrative;
  document.querySelectorAll("#narrativeBody [data-index]").forEach(node=>{doc.sections[Number(node.dataset.index)].paras=[...node.querySelectorAll("p")].map(p=>p.innerText.trim()).filter(Boolean);
    if(!node.querySelector("p"))doc.sections[Number(node.dataset.index)].paras=node.innerText.split(/\n+/).filter(Boolean);});
  demo.reportNarrative ||= {};
  demo.reportNarrative[doc.kind]=doc;
  persistDemo();closeModal();render();showToast("已插入报告");
}
function narrativeHtml(kind,forDocument) {
  const doc=(demo.reportNarrative||{})[kind];
  if(!doc)return "";
  return doc.sections.map(section=>(forDocument?'<h2>':'<h3>')+textHtml(section.title)+(forDocument?'</h2>':'</h3>')+section.paras.map(text=>'<p>'+textHtml(text)+'</p>').join("")).join("");
}
const renderStandardReportBeforeNarrative = renderStandardReport;
renderStandardReport = function () {
  const html=renderStandardReportBeforeNarrative();
  const kind=state.page==="范围三专项报告"?"scope3":"org";
  const doc=(demo.reportNarrative||{})[kind];
  return html.replace('<button class="btn" onclick="downloadCurrentReport()">','<button class="btn" onclick="openNarrative()">'+(doc?'编辑分析与结论':'生成分析与结论')+'</button><button class="btn" onclick="downloadCurrentReport()">')
    .replace(/<h3>方法与数据质量<\/h3>/,(doc?'<div class="narrativeInReport">'+narrativeHtml(kind,false)+'</div>':'')+'<h3>方法与数据质量</h3>')
    .replace(/<tr><td>(范围[一二三])<\/td>/g,(m,label)=>'<tr class="clickRow" onclick="showScopeDetail(\''+({"范围一":"1","范围二":"2","范围三":"3"}[label])+'\')"><td>'+label+'</td>');
};
const reportDocumentBeforeNarrative = reportDocument;
reportDocument = function (title,...args) {
  const html=reportDocumentBeforeNarrative(title,...args);
  const kind=String(title).includes("范围三")?"scope3":"org";
  const narrative=narrativeHtml(kind,true);
  return narrative?html.replace("<h2>按范围汇总</h2>",narrative+"<h2>按范围汇总</h2>"):html;
};

// ---------- 菜单与页面 ----------
MENUS["组织碳排放"] = Object.fromEntries(Object.entries(MENUS["组织碳排放"]).flatMap(entry=>entry[0]==="数据填报"?[entry,["凭证管理",[]]]:[entry]));
MENUS["基础配置"]["因子库管理"]=[...MENUS["基础配置"]["因子库管理"],"因子智能匹配"];
ROLE_GROUPS["填报人"]["组织碳排放"]=["数据填报","凭证管理"];
const renderBeforeEvidence = render;
render = function () {
  renderBeforeEvidence();
  if(!backendState.ready)return;
  evidenceList();
  const content=document.getElementById("content");
  if(state.top==="组织碳排放"&&state.group==="凭证管理")content.innerHTML=evidencePage();
  else if(state.top==="基础配置"&&state.page==="因子智能匹配")content.innerHTML=factorMatchPage();
};
