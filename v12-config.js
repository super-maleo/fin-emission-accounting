// v12：基础配置。因子库（私域因子建模、供应链因子、智能匹配引擎）、指标模板（指标 / 模板 / 公式 / PCR）、系统设置（组织与权限、角色、审批流程）。

// ================= 企业私域因子库 =================
function v12PrivFactors(){return [...(v12().privFactors||[]),...privateFactorList()];}
function v12PrivatePage() {
  const list=v12PrivFactors(),f=v12State.pfCat||"";
  const cats=[...new Set(list.map(r=>r.cat))];
  const rows=list.filter(r=>!f||r.cat===f).map(r=>[ '<span class="v12Code0">'+r.id+'</span>',v12H(r.cat),'<strong>'+v12H(r.name)+'</strong>','<b>'+r.value+'</b> '+v12H(r.unit),v12H(r.site),'<small title="'+v12H(r.basis)+'">'+v12H(String(r.basis).length>26?String(r.basis).slice(0,26)+"…":r.basis)+'</small>',v12H(r.valid),v12Tag(r.status,["已核查","已存证","启用"].includes(r.status)?"ok":"warn")]);
  return v12Head("企业私域因子库",'<button class="btn primary" onclick="v12FactorBuilder()">因子建模</button>')+
    '<div class="statRow">'+v12Kpi("私域因子",String(list.length),"条")+v12Kpi("实测燃料因子",String(list.filter(r=>r.cat==="固定燃烧").length),"条")+v12Kpi("热电联产分摊",String(list.filter(r=>r.cat==="热电联产").length),"条")+v12Kpi("自建模型",String((v12().privFactors||[]).length),"条")+'</div>'+
    v12Seg([["","全部"],...cats.map(c=>[c,c])],f,"v12PfCat")+v12Panel("因子清单",v12Table(["编号","类别","因子名称","因子值","适用单位","计算依据","有效期","状态"],rows));
}
function v12PfCat(c){v12Set("pfCat",c);}
const V12_FB_TYPES = {
  fuel:{name:"燃料实测因子",formula:"EF = NCV × CC × OF × 44/12",fields:[["ncv","低位发热量 NCV（GJ/t）",21.2],["cc","单位热值含碳量 CC（tC/GJ）",0.0263],["of","碳氧化率 OF",0.98]],unit:"tCO₂/t",calc:v=>v.ncv*v.cc*v.of*44/12},
  chp:{name:"热电联产分摊（热量法）",formula:"EF电 = E × 供电×3.6 ÷ (供电×3.6 + 供热) ÷ 供电",fields:[["e","机组排放 E（tCO₂）",3385486],["sup","供电量（MWh）",2935300],["heat","供热量（GJ）",7717900]],unit:"tCO₂/MWh",calc:v=>v.e*(v.sup*3.6/(v.sup*3.6+v.heat))/v.sup},
  supplier:{name:"供应商加权因子",formula:"EF = Σ(采购量ᵢ × 单位碳排ᵢ) ÷ Σ采购量ᵢ",fields:[["q1","供应商 A 采购量",1300000],["u1","供应商 A 单位碳排（tCO₂e/t）",1.86],["q2","供应商 B 采购量",86000],["u2","供应商 B 单位碳排（tCO₂e/t）",1.42]],unit:"tCO₂e/t",calc:v=>(v.q1*v.u1+v.q2*v.u2)/(v.q1+v.q2)},
  lca:{name:"引用 LCA 模型结果",formula:"EF = 产品碳足迹（从摇篮到大门）÷ 1000",fields:[],unit:"tCO₂e/t",calc:()=>v12GateTotal(activeLca())/1000}
};
function v12FactorBuilder(type) {
  type=type||v12State.fbType||"fuel";v12State.fbType=type;
  const t=V12_FB_TYPES[type];
  v12Modal("因子建模",v12Seg(Object.entries(V12_FB_TYPES).map(([k,x])=>[k,x.name]),type,"v12FactorBuilder")+
    '<p class="v12Formula">'+t.formula+'</p><div class="modalForm">'+v12Field("因子名称",'<input id="fbName" value="'+v12H(type==="lca"?activeLca().name+"（摇篮到大门）":t.name.replace("因子",""))+'">')+v12Field("适用单位",'<select id="fbSite">'+PETRO_ENTITIES.map(e=>'<option>'+v12H(e.org)+'</option>').join("")+'</select>')+
    t.fields.map(([k,l,d])=>v12Field(l,'<input data-fb="'+k+'" type="number" step="any" value="'+d+'" oninput="v12FbCalc()">')).join("")+
    (type==="lca"?v12Field("LCA 模型",'<select onchange="selectLcaModel(this.value);v12FactorBuilder(\'lca\')">'+demo.lcaModels.map(m=>'<option value="'+m.id+'" '+(m.id===activeLca().id?'selected':'')+'>'+v12H(m.name)+'</option>').join("")+'</select>'):'')+
    v12Field("有效期",'<input id="fbValid" value="'+CURRENT_YEAR+' 年度">')+'</div><p class="calcPreview" id="fbOut"></p>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveFactor()">保存至私域因子库</button>');
  v12FbCalc();
}
function v12FbVals(){const v={};document.querySelectorAll("[data-fb]").forEach(i=>v[i.dataset.fb]=Number(i.value));return v;}
function v12FbCalc(){const t=V12_FB_TYPES[v12State.fbType],x=t.calc(v12FbVals());const el=document.getElementById("fbOut");if(el)el.innerHTML=Number.isFinite(x)&&x>0?'计算结果 <b>'+(+x.toPrecision(5))+' '+t.unit+'</b>':'<span class="badText">参数无效</span>';return x;}
function v12SaveFactor() {
  const t=V12_FB_TYPES[v12State.fbType],x=v12FbCalc();
  if(!(Number.isFinite(x)&&x>0)){showToast("参数无效");return;}
  const list=(v12().privFactors ||= []);
  const vals=v12FbVals();
  list.unshift({id:"PF-U"+String(list.length+1).padStart(2,"0"),cat:{fuel:"固定燃烧",chp:"热电联产",supplier:"供应链",lca:"产品碳足迹"}[v12State.fbType],name:v12Val("fbName"),value:+x.toPrecision(5),unit:t.unit,site:v12Val("fbSite"),
    basis:t.formula+(Object.keys(vals).length?" · "+Object.entries(vals).map(([k,v])=>k+"="+v).join("，"):""),valid:v12Val("fbValid"),status:"待审核"});
  v12Persist();closeModal();render();showToast("因子已保存，审核后可在填报中引用");
}

// ================= 供应链因子 =================
function v12SupplyFactorPage() {
  const rows=[];
  supplyScope3Items.forEach(r=>{const a=demo.approvedSuppliers?.[r.id];if(a)rows.push({sup:r.supplier,item:r.part,value:a.unitCarbon,unit:"kgCO₂e/"+a.unit,src:"供应商一手数据 · V"+(a.version||1),valid:xk().validity?.[r.id]?xk().validity[r.id].from+" 至 "+xk().validity[r.id].to:"—",status:"有效"});});
  v12SupTasksRaw().filter(t=>t.status==="通过").forEach(t=>rows.push({sup:t.supplier,item:t.item,value:t.unitCarbon,unit:"kgCO₂e/"+t.unit,src:(t.method||"")+" · "+(t.evidence||""),valid:CURRENT_YEAR+"-01 至 "+CURRENT_YEAR+"-12",status:"有效"}));
  v12SupTasksRaw().filter(t=>t.status==="待审核").forEach(t=>rows.push({sup:t.supplier,item:t.item,value:t.unitCarbon,unit:"kgCO₂e/"+t.unit,src:(t.method||"")+" · 审核中",valid:"—",status:"审核中"}));
  return v12Head("供应链因子",'<button class="btn" onclick="go(\'供应链碳排放\',\'数据收集与审核\')">数据收集</button>')+
    '<div class="statRow">'+v12Kpi("供应链因子",String(rows.filter(r=>r.status==="有效").length),"条有效")+v12Kpi("审核中",String(rows.filter(r=>r.status!=="有效").length),"条")+v12Kpi("覆盖供应商",String(new Set(rows.map(r=>r.sup)).size),"家")+'</div>'+
    v12Panel("供应商特定因子",v12Table(["供应商","物资","因子值","来源","有效期","状态"],rows.map(r=>['<strong>'+v12H(r.sup)+'</strong>',v12H(r.item),'<b>'+r.value+'</b> '+v12H(r.unit),'<small>'+v12H(r.src)+'</small>',v12H(r.valid),v12Tag(r.status,r.status==="有效"?"ok":"blue")])));
}

// ================= 因子智能匹配引擎 =================
// 1 文本规范化（全半角、括号、同义词归一）→ 2 字符 n-gram + 领域词 TF-IDF 余弦 → 3 规则特征（单位可换算、范围、区域电网、年份）
// → 4 历史确认样本相似度 → 5 线性打分；每次人工确认用成对排序（pairwise perceptron）在线更新权重。
const V12_SYN = [["柴油","0#柴油","车用柴油","轻柴油"],["汽油","车用汽油","92#","95#"],["天然气","管道气","ng","lng","液化天然气"],["电力","外购电","下网电","用电","电网","电"],
  ["烟煤","原煤","燃煤","入炉煤","煤"],["蒸汽","热力","供热","热"],["炼厂干气","干气","燃料气"],["运输","周转量","物流","运距","货运"],["钢管","油套管","钢材","无缝管"],["石油焦","焦炭"],["航空","机票","差旅"],["催化剂","助剂"],["液化石油气","lpg"],["燃料油","重油"]];
const V12_GRID = {"辽宁":"东北","吉林":"东北","黑龙江":"东北","北京":"华北","天津":"华北","河北":"华北","山东":"华北","甘肃":"西北","新疆":"西北","陕西":"西北","上海":"华东","江苏":"华东","浙江":"华东","广东":"南方","四川":"华中","湖北":"华中"};
const V12_W0 = {text:0.48,unit:0.18,scope:0.1,region:0.08,recency:0.08,memory:0.08};
function v12Norm(s) {
  let t=String(s||"").toLowerCase().replace(/[！-～]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/[（(][^）)]*[）)]/g," ").replace(/[\s·,，、\/]+/g," ");
  const extra=[];V12_SYN.forEach(g=>{if(g.some(w=>t.includes(w.toLowerCase())))extra.push("§"+g[0]);});
  return {text:t,canon:extra};
}
function v12Tokens(s) {
  const n=v12Norm(s),t=n.text.replace(/\s+/g,"");
  const tok=[...n.canon,...n.canon];
  for(let i=0;i<t.length-1;i++)tok.push(t.slice(i,i+2));
  for(let i=0;i<t.length;i++)if(/[一-龥]/.test(t[i]))tok.push(t[i]);
  return tok;
}
function v12Vec(tokens,idf){const tf={};tokens.forEach(k=>tf[k]=(tf[k]||0)+1);const v={};let norm=0;Object.entries(tf).forEach(([k,c])=>{const w=(1+Math.log(c))*(idf[k]||idf.__max);v[k]=w;norm+=w*w;});v.__n=Math.sqrt(norm)||1;return v;}
function v12Cos(a,b){let s=0;for(const k in a){if(k!=="__n"&&b[k])s+=a[k]*b[k];}return s/a.__n/b.__n;}
function v12Index() {
  if(v12Index.c&&v12Index.n===FACTOR_DB.length)return v12Index.c;
  const docs=FACTOR_DB.map(r=>({row:r,tok:v12Tokens(r.name+" "+(r.keys||""))}));
  const df={};docs.forEach(d=>new Set(d.tok).forEach(k=>df[k]=(df[k]||0)+1));
  const N=docs.length,idf={};Object.entries(df).forEach(([k,c])=>idf[k]=Math.log((N+1)/(c+1))+1);idf.__max=Math.log(N+1)+1;
  docs.forEach(d=>d.vec=v12Vec(d.tok,idf));
  v12Index.c={docs,idf};v12Index.n=FACTOR_DB.length;
  return v12Index.c;
}
function v12MatchW(){return v12().matchW||{...V12_W0};}
function v12MatchFeatures(q,d,idf,mem) {
  const qv=v12Vec(v12Tokens(q.text),idf),r=d.row;
  const conv=convertUnit(1,q.unit,r.unit);
  const grid=V12_GRID[q.region]||"";
  const region=!q.region?0.7:r.region===q.region?1:r.region===grid||String(r.region).includes(grid)&&grid?0.9:r.region==="全国"?0.7:r.region==="全球"?0.55:0.4;
  const memo=mem.filter(m=>m.id===r.id).reduce((s,m)=>Math.max(s,v12Cos(qv,v12Vec(v12Tokens(m.q),idf))),0);
  return {text:v12Cos(qv,d.vec),unit:conv===null?0:r.unit===q.unit?1:0.85,scope:!q.scope?0.6:String(r.scope)===String(q.scope)?1:0.25,region,recency:Math.max(0,1-(Number(q.year||CURRENT_YEAR)-Number(r.year||2015))/12),memory:memo,conv};
}
function v12Match(q,limit=8) {
  const {docs,idf}=v12Index(),w=v12MatchW(),mem=v12().matchFb||[];
  return docs.map(d=>{const f=v12MatchFeatures(q,d,idf,mem);const score=f.unit?Object.keys(V12_W0).reduce((s,k)=>s+w[k]*f[k],0):0;return {row:d.row,f,score,value:f.conv===null?null:d.row.value*f.conv};})
    .filter(x=>x.value!==null&&x.f.text>0.05).sort((a,b)=>b.score-a.score).slice(0,limit);
}
function v12Learn(q,id) {
  const res=v12Match(q,8),pos=res.find(x=>x.row.id===id);
  if(!pos)return;
  const w={...v12MatchW()},lr=0.08;
  res.filter(x=>x.row.id!==id&&x.score>=pos.score-0.02).slice(0,3).forEach(neg=>{Object.keys(V12_W0).forEach(k=>{w[k]=Math.max(0.02,w[k]+lr*(pos.f[k]-neg.f[k]));});});
  const s=Object.values(w).reduce((a,b)=>a+b,0);Object.keys(w).forEach(k=>w[k]=+(w[k]/s).toFixed(4));
  v12().matchW=w;(v12().matchFb ||= []).push({q:q.text,unit:q.unit,id,at:v12Now()});
}
function v12MatchQuery(){return v12State.mq ||= {text:"燃料油（开工及备用）",unit:"t",scope:"1",region:"辽宁",year:CURRENT_YEAR,task:""};}
function v12MatchPage() {
  const q=v12MatchQuery(),res=q.text?v12Match(q):[],w=v12MatchW(),fb=v12().matchFb||[];
  const pend=workflowTasks().filter(t=>!t.locked&&(/缺省|行业平均|支出法/.test(t.factorLabel||"")||t.scope==="3")&&!demo.factorOverrides?.[t.id]).slice(0,40);
  const acc=fb.length?fb.filter(m=>{const r=v12Match({text:m.q,unit:m.unit,scope:"",region:"",year:CURRENT_YEAR},1)[0];return r&&r.row.id===m.id;}).length/fb.length:null;
  const featLabel={text:"语义",unit:"单位",scope:"范围",region:"区域",recency:"时效",memory:"历史确认"};
  const form='<div class="v12MatchForm"><label class="wide">活动 / 排放源描述<input id="mqText" value="'+v12H(q.text)+'" placeholder="如：加热炉燃用天然气、柴油叉车、钢管采购"></label>'+
    '<label>活动单位<select id="mqUnit">'+["t","kg","万Nm³","Nm³","kWh","MWh","GJ","t·km","人·km","万元","L"].map(u=>'<option '+(u===q.unit?'selected':'')+'>'+u+'</option>').join("")+'</select></label>'+
    '<label>范围<select id="mqScope">'+[["1","范围一"],["2","范围二"],["3","范围三"]].map(([v,l])=>'<option value="'+v+'" '+(v===q.scope?'selected':'')+'>'+l+'</option>').join("")+'</select></label>'+
    '<label>地区<select id="mqRegion"><option value="">不限</option>'+Object.keys(V12_GRID).map(r=>'<option '+(r===q.region?'selected':'')+'>'+r+'</option>').join("")+'</select></label>'+
    '<label>年份<input id="mqYear" type="number" value="'+q.year+'"></label><button class="btn primary" onclick="v12RunMatch()">匹配</button></div>';
  const results=res.length?'<div class="v12MatchList">'+res.map((x,i)=>'<div class="v12MatchRow'+(i===0?' top':'')+'"><div class="m"><b>'+v12H(x.row.name)+'</b><small>'+v12H(x.row.source||"")+' · '+v12H(x.row.region)+' · '+x.row.year+'</small>'+
    '<div class="feat">'+Object.keys(V12_W0).map(k=>'<span title="'+featLabel[k]+' '+x.f[k].toFixed(2)+' × 权重 '+w[k].toFixed(2)+'"><em>'+featLabel[k]+'</em><i style="width:'+Math.round(x.f[k]*100)+'%"></i></span>').join("")+'</div></div>'+
    '<div class="v"><b>'+(+x.value.toPrecision(5))+'</b><small>tCO₂e/'+v12H(q.unit)+(x.row.unit!==q.unit?' · 由 '+v12H(x.row.unit)+' 换算':'')+'</small></div>'+
    '<div class="s"><b>'+Math.round(x.score*100)+'</b><small>匹配度</small></div><button class="btn'+(i===0?' primary':'')+'" onclick="v12AcceptMatch(\''+x.row.id+'\')">'+(q.task?'采用':'确认')+'</button></div>').join("")+'</div>':v12Empty("没有单位可换算的候选因子");
  const engine='<ol class="v12Pipe"><li><b>规范化</b><small>全半角、括号注释、'+V12_SYN.length+' 组同义词归一</small></li><li><b>TF-IDF 语义</b><small>字符二元组 + 领域词，'+v12Index().docs.length+' 条因子建索引</small></li><li><b>规则特征</b><small>单位可换算（硬约束）、范围、区域电网、年份</small></li><li><b>历史确认</b><small>与已确认样本的相似度</small></li><li><b>在线学习</b><small>每次确认按成对排序更新权重</small></li></ol>'+
    '<h4 class="v12H4">当前权重</h4>'+v12HBars(Object.keys(V12_W0).map(k=>({label:featLabel[k],value:w[k],display:w[k].toFixed(3),color:"#86BC25"})))+
    '<dl class="v12KV"><div><dt>确认样本</dt><dd>'+fb.length+' 条</dd></div><div><dt>Top-1 命中率</dt><dd>'+(acc===null?"—":(acc*100).toFixed(0)+"%（在确认样本上回测）")+'</dd></div></dl>'+
    (fb.length?'<button class="linkBtn" onclick="v12ResetMatch()">重置学习结果</button>':'');
  return v12Head("因子智能匹配")+
    '<div class="v12Grid2 a">'+v12Panel("待匹配指标 <em>"+pend.length+"</em>",'<div class="v12PendList">'+pend.map(t=>'<button class="'+(q.task===t.id?'active':'')+'" onclick="v12PickTask(\''+t.id+'\')"><b>'+v12H(t.name)+'</b><small>'+v12H(t.org)+' · 范围'+t.scope+' · '+v12H(t.unit)+'</small><small class="muted">'+v12H(String(t.factorLabel||"").slice(0,40))+'</small></button>').join("")+'</div>')+
      '<div>'+v12Panel("匹配",form+(q.task?'<p class="v12Hint">当前指标：'+v12H(workflowTasks().find(t=>t.id===q.task)?.name||"")+' · 在用 '+(workflowTasks().find(t=>t.id===q.task)?.factor??"—")+' tCO₂e/'+v12H(q.unit)+'</p>':'')+results)+v12Panel("匹配引擎",engine)+'</div></div>';
}
function v12RunMatch(){Object.assign(v12MatchQuery(),{text:v12Val("mqText"),unit:v12Val("mqUnit"),scope:v12Val("mqScope"),region:v12Val("mqRegion"),year:Number(v12Val("mqYear"))||CURRENT_YEAR,task:""});render();}
function v12PickTask(id){const t=workflowTasks().find(x=>x.id===id),e=petroEntity(t.org);const prov=(e?.region||"").slice(0,2).replace("新疆","新疆");
  Object.assign(v12MatchQuery(),{text:t.name+(t.scope==="3"?" "+(V12_S3_NAMES[t.category]||""):""),unit:t.unit,scope:t.scope,region:Object.keys(V12_GRID).find(r=>(e?.region||"").startsWith(r))||"",year:CURRENT_YEAR,task:id});render();}
async function v12AcceptMatch(id) {
  const q=v12MatchQuery();
  v12Learn(q,id);v12Persist();
  if(q.task&&v12Is("carbonAdmin","sysAdmin")){await applyFactor(q.task,id);q.task="";}
  else {render();showToast("已记录确认结果，匹配权重已更新");}
}
function v12ResetMatch(){delete v12().matchW;delete v12().matchFb;v12Persist();render();showToast("已重置");}

// ================= 填报指标 / 模板 / 公式 =================
const V12_KIND_RANK = ["固定燃烧","移动燃烧","火炬燃烧","工业过程","工艺放空","设备逃逸","逸散排放","回收扣减","购入电力","购入热力"];
function v12Indicators() {
  const map=new Map();
  workflowTasks().filter(t=>!String(t.id).startsWith("SUP-")).forEach(t=>{
    const k=t.scope+"|"+t.name;
    if(!map.has(k))map.set(k,{scope:t.scope,name:t.name,unit:t.unit,kind:t.scope==="3"?v12CatLabel(t.category):t.kind,category:t.category,method:t.method,factorLabel:t.factorLabel,orgs:[]});
    map.get(k).orgs.push(t.org);
  });
  return [...map.values()].sort((a,b)=>a.scope.localeCompare(b.scope)||(a.scope==="3"?a.category.localeCompare(b.category):V12_KIND_RANK.indexOf(a.kind)-V12_KIND_RANK.indexOf(b.kind))||a.name.localeCompare(b.name,"zh"));
}
function v12IndicatorPage() {
  const all=v12Indicators(),s=v12State.indScope||"1";
  const list=all.filter(x=>x.scope===s);
  let last="",n=0;
  const rows=[];
  list.forEach(x=>{if(x.kind!==last){last=x.kind;rows.push({cls:"v12GroupRow",cells:['<b>'+v12H(x.kind)+'</b>',"","","","",""]});}
    rows.push([String(++n).padStart(2,"0"),'<strong>'+v12H(x.name)+'</strong>',v12H(x.unit),x.method&&PETRO_METHODS[x.method]?'<span class="v12Code">'+v12H(PETRO_METHODS[x.method].formula)+'</span>':x.scope==="3"?'<span class="v12Code">E = AD × EF</span>':'—','<small>'+v12H(String(x.factorLabel||"").replace(/^[^·]*·\s*/,"").slice(0,30))+'</small>',x.orgs.length+' 家<small>'+v12H([...new Set(x.orgs)].slice(0,3).join("、"))+'</small>']);});
  return v12Head("填报指标",'<button class="btn primary" onclick="v12NewIndicator()">新增指标</button>')+
    '<div class="statRow">'+[["1","范围一"],["2","范围二"],["3","范围三"]].map(([k,l])=>v12Kpi(l,String(all.filter(x=>x.scope===k).length),"项指标","v12Set('indScope','"+k+"')")).join("")+v12Kpi("合计",String(all.length),"项")+'</div>'+
    v12Tabs([["1","范围一 直接排放",all.filter(x=>x.scope==="1").length],["2","范围二 能源间接",all.filter(x=>x.scope==="2").length],["3","范围三 价值链",all.filter(x=>x.scope==="3").length]],s,"v12IndScope")+
    v12Panel("指标清单",v12Table(["序号","指标","活动单位","计算公式","默认因子 / 参数","适用组织"],rows,{nopage:true}));
}
function v12IndScope(s){v12Set("indScope",s);}
function v12NewIndicator() {
  v12Modal("新增指标",'<div class="modalForm">'+v12Field("指标名称",'<input id="niName">')+v12Field("范围",'<select id="niScope"><option value="1">范围一</option><option value="2">范围二</option><option value="3">范围三</option></select>')+
    v12Field("排放类型 / 类别",'<select id="niKind">'+V12_KIND_RANK.map(k=>'<option>'+k+'</option>').join("")+Object.keys(V12_S3_NAMES).map(c=>'<option value="'+c+'">'+v12CatLabel(c)+'</option>').join("")+'</select>')+
    v12Field("活动单位",'<input id="niUnit" value="t">')+v12Field("计算公式",'<select id="niMethod">'+Object.entries(PETRO_METHODS).map(([k,m])=>'<option value="'+k+'">'+v12H(m.label)+'</option>').join("")+'</select>')+'</div>',
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="closeModal();showToast(\'指标已新增，需在填报模板中勾选后下发\')">保存</button>');
}
function v12TplOf(org) {
  const tasks=workflowTasks().filter(t=>t.org===org&&!String(t.id).startsWith("SUP-"));
  const off=(v12().tplOff||{})[org]||[];
  return {org,tasks,on:tasks.filter(t=>!off.includes(t.id))};
}
function v12TemplatePage() {
  const orgs=PETRO_ENTITIES.map(e=>e.org);
  const rows=orgs.map(org=>{const t=v12TplOf(org),e=petroEntity(org),seg=PETRO_SEGMENTS.find(s=>s.id===e.seg);
    const c=s=>t.on.filter(x=>x.scope===s).length;
    return {click:"v12OpenTpl('"+v12Q(org)+"')",cells:['<strong>'+v12H(org)+'</strong><small>'+e.code+'</small>',v12H(seg?.name||""),v12H((seg?.guide||"通用")+"行业模板"),c("1"),c("2"),c("3"),'<b>'+t.on.length+'</b>',v12H(e.owner),"月度 · 次月 10 日前",v12Tag("已下发","ok"),'<button class="linkBtn">指标</button>']};});
  return v12Head("填报模板",'<button class="btn" onclick="showToast(\'已向 \'+'+orgs.length+'+\' 家单位下发 2027 年度模板（草稿）\')">生成 2027 年度模板</button>')+
    v12Panel(CURRENT_YEAR+" 年度组织填报模板",v12Table(["组织","板块","基础模板","范围一","范围二","范围三","指标数","填报人","填报频次","状态",""],rows,{nopage:true}));
}
function v12OpenTpl(org) {
  const t=v12TplOf(org),off=(v12().tplOff||{})[org]||[];
  const grp=s=>t.tasks.filter(x=>x.scope===s).sort((a,b)=>V12_KIND_RANK.indexOf(a.kind)-V12_KIND_RANK.indexOf(b.kind)||String(a.category).localeCompare(String(b.category)));
  const sec=(s,l)=>{const g=grp(s);return g.length?'<h4 class="v12H4">'+l+' <small class="muted">'+g.length+' 项</small></h4><div class="v12TplList">'+g.map(x=>'<label><input type="checkbox" data-tpl="'+x.id+'" '+(off.includes(x.id)?'':'checked')+'><span><b>'+v12H(x.name)+'</b><small>'+v12H(x.scope==="3"?v12CatLabel(x.category):x.kind)+' · '+v12H(x.unit)+'</small></span></label>').join("")+'</div>':'';};
  v12Modal(v12H(org)+" · 填报模板",sec("1","范围一 直接排放")+sec("2","范围二 能源间接排放")+sec("3","范围三 价值链排放"),
    '<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="v12SaveTpl(\''+v12Q(org)+'\')">保存</button>');
}
function v12SaveTpl(org){const off=[...document.querySelectorAll("[data-tpl]")].filter(i=>!i.checked).map(i=>i.dataset.tpl);(v12().tplOff ||= {})[org]=off;v12Persist();closeModal();render();showToast("模板已保存，下一填报周期生效");}
const V12_S3_METHODS = [
  ["C01","类别1 外购商品和服务","供应商特定法 / 平均数据法 / 支出法","E = Σ(采购量ᵢ × EFᵢ)；无实物量时 E = Σ(采购额ᵢ × EF支出ᵢ)"],
  ["C02","类别2 资本货物","支出法","E = Σ(资本支出ᵢ × EF支出ᵢ)"],["C03","类别3 燃料和能源相关活动","平均数据法","E = Σ(燃料量 × EF上游) + 外购电 × (EF上游 + EF线损)"],
  ["C04","类别4 上游运输和配送","距离法","E = Σ(货物量 × 运距 × EF运输方式)"],["C05","类别5 运营中产生的废弃物","废弃物类型法","E = Σ(废弃物量ᵢ × EF处置方式ᵢ)"],
  ["C06","类别6 商务旅行","距离法","E = Σ(人·km × EF交通方式) + 住宿间夜 × EF住宿"],["C07","类别7 员工通勤","平均数据法","E = 员工数 × 通勤天数 × 人均通勤距离 × EF交通方式"],
  ["C08","类别8 上游租赁资产","资产特定法","E = Σ(租赁资产能耗ᵢ × EFᵢ)"],["C09","类别9 下游运输和配送","距离法","E = Σ(售出量 × 运距 × EF运输方式)"],
  ["C10","类别10 售出产品的加工","平均数据法","E = Σ(中间品量ᵢ × EF加工ᵢ)"],["C11","类别11 售出产品的使用","直接使用阶段法","E = Σ(售出燃料量ᵢ × NCVᵢ × CCᵢ × OFᵢ × 44/12)"],
  ["C12","类别12 售出产品报废处理","废弃物类型法","E = Σ(产品量ᵢ × 处置比例ⱼ × EF处置ⱼ)"],["C13","类别13 下游租赁资产","资产特定法","E = Σ(出租资产能耗ᵢ × EFᵢ)"],
  ["C14","类别14 特许经营","特许经营方特定法","E = Σ(特许经营网点能耗ᵢ × EFᵢ)"],["C15","类别15 投资","股权比例法","E = Σ(被投资企业范围一+二排放ᵢ × 持股比例ᵢ)"]
];
function v12FormulaPage() {
  const tasks=workflowTasks();
  const s1=["comb","flare","flareCH4","fcc","regen","h2","eth","eo","asph","calc","acid","vent","fug","gwp","rec","recCH4"],s2=["elec","heat","green"];
  const row=(k,i)=>{const m=PETRO_METHODS[k];return [String(i+1).padStart(2,"0"),'<strong>'+v12H(m.label)+'</strong>','<span class="v12Code">'+v12H(m.formula)+'</span>',m.fields.map(f=>v12H(f[1])+(f[2]?' <small>'+v12H(f[2])+'</small>':'')).join("<br>")||"—",tasks.filter(t=>t.method===k).length+" 项"];};
  return v12Head("碳排放公式")+
    v12Panel("范围一 直接排放",v12Table(["编号","排放类型","计算公式","参数","引用指标"],s1.filter(k=>PETRO_METHODS[k]).map(row),{nopage:true}))+
    v12Panel("范围二 能源间接排放",v12Table(["编号","排放类型","计算公式","参数","引用指标"],s2.map(row),{nopage:true}))+
    v12Panel("范围三 价值链排放",v12Table(["类别","名称","核算方法","计算公式","引用指标"],V12_S3_METHODS.map(r=>[r[0].replace("C","类别 "),'<strong>'+r[1].replace(/^类别\d+ /,"")+'</strong>',v12H(r[2]),'<span class="v12Code">'+v12H(r[3])+'</span>',tasks.filter(t=>t.scope==="3"&&t.category===r[0]).length+" 项"]),{nopage:true}))+
    v12Panel("通用常数",v12Table(["常数","数值","说明"],[["C → CO₂","44/12","碳与二氧化碳分子量比"],["CO₂ 密度","19.7 tCO₂/万Nm³","标准状况"],["CH₄ 密度","7.17 tCH₄/万Nm³","标准状况"],["GWP CH₄","21 / 28 / 27.9","国内指南 / ISO 14064 / GHG Protocol AR6"],["电网排放因子","0.5703 tCO₂/MWh","全国电网平均"]],{nopage:true}));
}
function v12PcrRulePage(){return xkPcrPage().replace(/<div class="breadcrumb">[^<]*<\/div>/,'<div class="breadcrumb">基础配置 / 指标模板配置 / PCR 规则库</div>').replace("<h1>PCR 库</h1>","<h1>PCR 规则库</h1>");}

// ================= 系统设置 =================
function v12OrgPeople(org) {
  const e=petroEntity(org)||{};
  const list=[];
  if(e.owner)list.push([e.owner,"填报人","填报、上传凭证",e.merged?"汇总报送 "+e.merged+" 家":"本单位全部指标"]);
  list.push([{"RF":"马俊","UP":"陈亮","PL":"冯涛","MK":"黄磊","ES":"许诺","HQ":"高文博"}[e.seg]||"—","二级单位审核人","单位审核","本板块"]);
  list.push(["高文博","集团复核人","集团复核、计入碳台账","全集团"]);
  if(org==="滨海石化热电厂")list.push(["王建国","碳资产管理","碳履约监测、清缴","热电厂"]);
  return list;
}
function v12OrgPage() {
  const sel=v12State.orgSel||"集团总部",e=petroEntity(sel)||{};
  const tree='<div class="v12Tree"><div class="root'+(sel==="集团总部"?' active':'')+'" onclick="v12Set(\'orgSel\',\'集团总部\')">北辰石油天然气集团有限公司</div>'+PETRO_SEGMENTS.filter(s=>s.id!=="HQ").map(s=>'<div class="seg"><span><i style="background:'+s.color+'"></i>'+v12H(s.name)+'</span>'+
    PETRO_ENTITIES.filter(x=>x.seg===s.id&&!x.parent).map(x=>'<div class="v12TN'+(x.org===sel?' active':'')+'" onclick="v12Set(\'orgSel\',\''+v12Q(x.org)+'\')">'+v12H(x.org)+(x.merged?'<small>'+x.merged+' 家</small>':'')+'</div>'+
      PETRO_ENTITIES.filter(c=>c.parent===x.org).map(c=>'<div class="v12TN child'+(c.org===sel?' active':'')+'" onclick="v12Set(\'orgSel\',\''+v12Q(c.org)+'\')">'+v12H(c.org)+'</div>').join("")).join("")+'</div>').join("")+'</div>';
  const seg=PETRO_SEGMENTS.find(s=>s.id===e.seg);
  const tasks=workflowTasks().filter(t=>t.org===sel);
  const detail=v12Panel(v12H(sel),'<dl class="detailList">'+[["组织编码",e.code],["所属板块",seg?.name],["上级组织",sel==="集团总部"?"—":e.parent||"集团总部"],["所在地",e.region],["生产规模",e.capacity],["主要装置",(e.units||[]).join("、")],["核算边界","运营控制权 · 100% 纳入"],["碳市场","滨海石化热电厂"===sel?"全国碳市场重点排放单位":"未纳入"],["填报指标",tasks.length+" 项"]].map(([k,v])=>'<div class="wide"><dt>'+k+'</dt><dd>'+v12H(v||"—")+'</dd></div>').join("")+'</dl>',
    '<button class="btn" onclick="showToast(\'已保存\')">编辑</button><button class="btn" onclick="v12AddOrg()">新增下级</button>')+
    v12Panel("人员与权限",v12Table(["姓名","角色","权限","数据范围",""],v12OrgPeople(sel).map(p=>['<strong>'+p[0]+'</strong>',v12Tag(p[1],p[1]==="填报人"?"blue":p[1]==="集团复核人"?"ok":"gray"),p[2],p[3],'<button class="linkBtn" onclick="showToast(\'已打开权限设置\')">设置</button>']),{nopage:true}),'<button class="btn" onclick="v12AddPerson()">添加人员</button>');
  return v12Head("组织与权限")+'<div class="v12OrgLayout">'+v12Panel("组织架构",tree)+'<div>'+detail+'</div></div>';
}
function v12AddOrg(){v12Modal("新增下级组织",'<div class="modalForm">'+v12Field("组织名称",'<input>')+v12Field("组织编码",'<input>')+v12Field("上级组织",'<input value="'+v12H(v12State.orgSel||"集团总部")+'" readonly>')+v12Field("控制关系",'<select><option>全资（运营控制）</option><option>控股</option><option>合营</option><option>联营</option></select>')+'</div>','<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="closeModal();showToast(\'组织已新增，请在核算边界中确认纳入方式\')">保存</button>');}
function v12AddPerson(){v12Modal("添加人员",'<div class="modalForm">'+v12Field("姓名",'<input>')+v12Field("账号（邮箱）",'<input type="email">')+v12Field("角色",'<select>'+V12_ROLES.map(r=>'<option>'+r.name+'</option>').join("")+'</select>')+v12Field("数据范围",'<input value="'+v12H(v12State.orgSel||"集团总部")+'">')+'</div>','<button class="btn" data-close-modal="1">取消</button><button class="btn primary" onclick="closeModal();showToast(\'已发送账号开通邀请\')">保存</button>');}
const V12_PERM_MODS = ["组织碳填报","组织碳审核","碳台账与报告","产品碳足迹","供应链管理","供应商填报","碳履约","基础配置","系统设置"];
const V12_PERM = {carbonAdmin:["查看","审核","管理","查看","查看","—","查看","因子 / 模板","—"],filler:["填报","—","查看本单位","—","—","—","—","—","—"],supplier:["—","—","—","—","—","填报","—","—","—"],
  supplyAdmin:["—","—","—","—","管理","初审","—","—","—"],lcaExpert:["—","—","—","管理","—","—","—","PCR","—"],etsExpert:["—","—","查看","—","—","—","管理","—","—"],sysAdmin:["—","—","—","—","—","—","—","管理","管理"]};
function v12RolePage() {
  const users=[["高文博","企业碳管理员","集团 ESG 管理部","启用"],["赵海峰","组织碳填报人","滨海石化分公司","启用"],["刘建平","组织碳填报人","松原油田分公司","启用"],["孙卫东","组织碳填报人","西部管道分公司 / 集团总部","启用"],
    ["陈思远","供应商管理员","集团物资采购中心","启用"],["林雪","产品碳建模专家","石油化工研究院","启用"],["王建国","碳履约与核算专家","滨海石化热电厂","启用"],["渤海钢管制造有限公司","供应商","外部","启用"],["华东催化剂有限公司","供应商","外部","启用"],["何立新","组织碳填报人","陇原石化分公司","待激活"]];
  return v12Head("用户角色",'<button class="btn primary" onclick="v12AddPerson()">新增用户</button>')+
    v12Panel("角色权限矩阵",v12Table(["角色",...V12_PERM_MODS],V12_ROLES.map(r=>['<strong>'+r.name+'</strong>',...V12_PERM[r.id].map(p=>p==="—"?'<span class="muted">—</span>':v12Tag(p,/管理|审核|初审/.test(p)?"ok":/填报/.test(p)?"blue":"gray"))]),{nopage:true}))+
    v12Panel("用户账号",v12Table(["姓名 / 单位","角色","所属组织","状态",""],users.map(u=>['<strong>'+u[0]+'</strong>',u[1],u[2],v12Tag(u[3],u[3]==="启用"?"ok":"warn"),'<button class="linkBtn" onclick="showToast(\'已重置密码并发送邮件\')">重置密码</button>'])));
}
const V12_FLOWS = [
  ["组织碳填报",[["填报","各单位填报人"],["单位审核","二级单位审核人"],["集团复核","集团 ESG 管理部"],["计入碳台账","自动"]],"5 个工作日 / 节点"],
  ["供应商碳数据",[["供应商填报","供应商联系人"],["采购初审","物资采购中心"],["碳管理复核","集团 ESG 管理部"],["计入范围三","自动替换支出法"]],"5 个工作日 / 节点"],
  ["LCA 模型发布",[["建模","产品碳建模专家"],["完整性检查","系统"],["技术审核","产品碳足迹组组长"],["发布","更新产品碳足迹值"]],"10 个工作日"],
  ["碳盘查报告",[["编制","企业碳管理员"],["内部审核","ESG 管理部负责人"],["第三方核查","核查机构"],["批准发布","分管领导"]],"按年度计划"],
  ["配额清缴",[["清缴方案","碳履约与核算专家"],["资金审批","财务部"],["分管领导审批","分管领导"],["注册登记系统操作","碳资产管理岗"]],"截止前 30 日启动"]
];
function v12FlowPage() {
  return v12Head("审批流程")+V12_FLOWS.map(([name,steps,sla])=>v12Panel(name+' <small>'+sla+'</small>','<div class="v12FlowDef">'+v12Steps(steps,-1)+'</div>','<button class="btn" onclick="showToast(\'流程配置已打开\')">配置</button>')).join("");
}
function v12SysHomeCard() {
  return v12Panel("系统概况",'<div class="v12Counts">'+[["组织",PETRO_ENTITIES.length,""],["用户",10,""],["填报指标",v12Indicators().length,""],["因子",FACTOR_DB.length,"ok"]].map(([l,v,t])=>'<div class="'+t+'"><b>'+v+'</b><span>'+l+'</span></div>').join("")+'</div>'+
    '<dl class="v12KV"><div><dt>公共因子库</dt><dd>'+v12H(typeof FACTOR_VERSION!=="undefined"?Object.values(FACTOR_VERSION)[0]:"2026.10")+'</dd></div><div><dt>填报模板</dt><dd>'+CURRENT_YEAR+' 年度 · '+PETRO_ENTITIES.length+' 套已下发</dd></div><div><dt>匹配引擎</dt><dd>确认样本 '+((v12().matchFb||[]).length)+' 条</dd></div></dl>');
}

Object.assign(V12_PAGES_EXTRA, {
  "基础配置|因子库管理|企业私域因子库":()=>v12PrivatePage(),
  "基础配置|因子库管理|供应链因子":()=>v12SupplyFactorPage(),
  "基础配置|因子库管理|因子智能匹配":()=>v12MatchPage(),
  "基础配置|指标模板配置|填报指标":()=>v12IndicatorPage(),
  "基础配置|指标模板配置|填报模板":()=>v12TemplatePage(),
  "基础配置|指标模板配置|碳排放公式":()=>v12FormulaPage(),
  "基础配置|指标模板配置|PCR 规则库":()=>v12PcrRulePage(),
  "基础配置|系统设置|组织与权限":()=>v12OrgPage(),
  "基础配置|系统设置|用户角色":()=>v12RolePage(),
  "基础配置|系统设置|审批流程":()=>v12FlowPage()
});

(function(){
  const css=`.v12MatchForm{display:grid;grid-template-columns:repeat(4,1fr) auto;gap:10px;align-items:end;margin-bottom:12px}
.v12MatchForm label{display:grid;gap:4px;font-size:12px;color:var(--sub)}.v12MatchForm label.wide{grid-column:1/-1}
.v12MatchForm input,.v12MatchForm select{height:36px;border:1px solid #d6dce2;border-radius:5px;padding:0 10px;background:#fff;color:#101828}
.v12MatchList{display:flex;flex-direction:column;gap:8px}
.v12MatchRow{display:grid;grid-template-columns:minmax(0,1fr) 150px 64px auto;gap:14px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.v12MatchRow.top{border-color:#86BC25;background:#F8FCF3}.v12MatchRow .m small{display:block;color:var(--sub);font-size:11px}
.v12MatchRow .feat{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:6px}
.v12MatchRow .feat span{display:block;height:16px;background:#F2F4F7;border-radius:3px;position:relative;overflow:hidden}.v12MatchRow .feat i{display:block;height:100%;background:#C9E29B}
.v12MatchRow .feat em{position:absolute;left:4px;top:1px;font-size:10px;font-style:normal;color:#344054}
.v12MatchRow .v b{font-size:15px}.v12MatchRow .v small,.v12MatchRow .s small{display:block;font-size:11px;color:var(--sub)}.v12MatchRow .s b{font-size:20px;color:#26890D}
.v12Pipe{list-style:none;counter-reset:p;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.v12Pipe li{counter-increment:p;background:#F6F8F3;border-radius:6px;padding:8px 10px;font-size:12.5px}.v12Pipe li::before{content:counter(p);display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#86BC25;color:#fff;font-size:11px;margin-right:6px}
.v12Pipe li small{display:block;color:var(--sub);font-size:11px;margin-top:2px}
.v12PendList{display:flex;flex-direction:column;max-height:900px;overflow:auto}
.v12PendList button{border:0;border-bottom:1px solid #F2F4F7;background:#fff;text-align:left;padding:8px 6px;cursor:pointer}.v12PendList button.active{background:#F3F8EA}
.v12PendList b{display:block;font-size:13px}.v12PendList small{display:block;font-size:11px;color:var(--sub)}
.v12TplList{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v12TplList label{display:flex;gap:8px;align-items:flex-start;border:1px solid #EEF2F6;border-radius:6px;padding:6px 8px}
.v12TplList b{display:block;font-size:13px}.v12TplList small{color:var(--sub);font-size:11px}
.v12OrgLayout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px;align-items:start}
.v12Tree{font-size:13px}.v12Tree .root{font-weight:700;padding:8px;border-radius:6px;cursor:pointer}
.v12Tree .seg{margin:6px 0 6px 8px}.v12Tree .seg>span{display:flex;align-items:center;gap:6px;color:var(--sub);font-size:12px;padding:4px 0}.v12Tree .seg>span i{width:8px;height:8px;border-radius:2px}
.v12Tree .v12TN{padding:6px 8px 6px 18px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between}.v12Tree .v12TN.child{padding-left:34px}
.v12Tree .v12TN small{color:var(--sub)}.v12Tree .v12TN:hover,.v12Tree .root:hover{background:#F6F8F3}.v12Tree .active{background:#E8F2DA!important;color:#26890D;font-weight:600}
tr.v12GroupRow td{background:#F6F8F3}
@media(max-width:1000px){.v12OrgLayout{grid-template-columns:1fr}.v12MatchForm{grid-template-columns:1fr 1fr}.v12Pipe{grid-template-columns:1fr}}`;
  const el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
})();
