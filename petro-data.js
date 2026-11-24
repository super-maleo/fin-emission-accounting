// 石化行业数据集：北辰石油天然气集团（油气田、炼化、管道、销售、工程技术服务）。
// 范围一、二排放源按《中国石油化工企业温室气体排放核算方法与报告指南（试行）》和
// 《中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）》的公式与参数计算。
// 加载顺序：最先加载（offline-demo.js 之前），其余模块从这里取组织、排放源和参数。

const PETRO_GROUP = "北辰石油天然气集团有限公司";
const PETRO_GUIDES = {
  "石化":"中国石油化工企业温室气体排放核算方法与报告指南（试行）",
  "油气":"中国石油天然气生产企业温室气体排放核算方法与报告指南（试行）",
  "发电":"企业温室气体排放核算与报告指南 发电设施",
  "通用":"工业其他行业企业温室气体排放核算方法与报告指南（试行）"
};
// 组织层级：集团 → 板块 → 所属企业 → 生产单元
const PETRO_SEGMENTS = [
  {id:"UP",name:"油气和新能源板块",guide:"油气",color:"#0F6E56"},
  {id:"RF",name:"炼化和新材料板块",guide:"石化",color:"#4D7F17"},
  {id:"PL",name:"天然气管道板块",guide:"油气",color:"#2C6AA0"},
  {id:"MK",name:"销售板块",guide:"通用",color:"#B7791F"},
  {id:"ES",name:"工程技术服务板块",guide:"通用",color:"#6B4FA0"},
  {id:"HQ",name:"集团总部",guide:"通用",color:"#667085"}
];
const PETRO_ENTITIES = [
  {org:"滨海石化分公司",seg:"RF",code:"RF-01",owner:"赵海峰",region:"辽宁省大连市",capacity:"原油加工 2,000 万 t/a · 乙烯 120 万 t/a · 环氧乙烷/乙二醇 40 万 t/a",
    units:["常减压蒸馏（2 套）","重油催化裂化（350 + 280 万 t/a）","连续重整（220 万 t/a）","加氢裂化 / 柴油加氢","制氢（天然气 + 干气，14 万 t/a）","乙烯裂解（120 万 t/a）","环氧乙烷/乙二醇","火炬系统（3 座）","CO₂ 捕集（50 万 t/a）"],ets:false},
  {org:"滨海石化热电厂",seg:"RF",parent:"滨海石化分公司",code:"RF-01-P",owner:"赵海峰",region:"辽宁省大连市",capacity:"2×350 MW 超临界燃煤热电联产机组",units:["1 号机组","2 号机组"],ets:true},
  {org:"陇原石化分公司",seg:"RF",code:"RF-02",owner:"何立新",region:"甘肃省兰州市",capacity:"原油加工 1,050 万 t/a · 乙烯 80 万 t/a",
    units:["常减压蒸馏","催化裂化（300 + 120 万 t/a）","连续重整（120 万 t/a）","制氢（天然气，6 万 t/a）","乙烯裂解（80 万 t/a）","氧化沥青","火炬系统（2 座）"]},
  {org:"天山石化分公司",seg:"RF",code:"RF-03",owner:"王磊",region:"新疆克拉玛依市",capacity:"原油加工 1,000 万 t/a · 乙烯 220 万 t/a",
    units:["常减压蒸馏","催化裂化（160 万 t/a）","制氢","乙烯裂解（220 万 t/a）","延迟焦化 / 石油焦煅烧","火炬系统（3 座）"]},
  {org:"其他炼化企业",seg:"RF",code:"RF-99",owner:"周敏",region:"—",capacity:"22 家炼化企业合并报送 · 原油加工 1.36 亿 t/a",units:["二级单位汇总报送"],merged:22},
  {org:"松原油田分公司",seg:"UP",code:"UP-01",owner:"刘建平",region:"吉林省松原市",capacity:"原油 2,950 万 t · 天然气 58 亿 m³ · CCUS 驱油埋存",
    units:["采油厂（11 个）","联合站（112 座）","接转站（978 座）","天然气处理厂（含 CO₂ 分离）","CCUS 循环注入站"]},
  {org:"鄂南油气田分公司",seg:"UP",code:"UP-02",owner:"马丽娟",region:"陕西省西安市",capacity:"原油 2,560 万 t · 天然气 520 亿 m³",
    units:["采油厂（12 个）","采气厂（6 个）","集气站（486 座）","天然气净化厂（5 座）"]},
  {org:"塔河油田分公司",seg:"UP",code:"UP-03",owner:"郭振宇",region:"新疆库尔勒市",capacity:"原油 760 万 t · 天然气 330 亿 m³",
    units:["采油气作业区（9 个）","天然气处理厂（4 座）","凝析油处理站"]},
  {org:"其他油气田企业",seg:"UP",code:"UP-99",owner:"周敏",region:"—",capacity:"13 家油气田企业合并报送",units:["二级单位汇总报送"],merged:13},
  {org:"西部管道分公司",seg:"PL",code:"PL-01",owner:"孙卫东",region:"新疆乌鲁木齐市",capacity:"干线 1.2 万 km · 压气站 62 座 · 年输气 1,020 亿 m³",
    units:["燃驱压气站（34 座）","电驱压气站（28 座）","阀室（980 座）","储气库（4 座）"]},
  {org:"其他管道企业",seg:"PL",code:"PL-99",owner:"周敏",region:"—",capacity:"5 家管道及储气库企业合并报送",units:["二级单位汇总报送"],merged:5},
  {org:"华北销售分公司",seg:"MK",code:"MK-01",owner:"李静",region:"北京市",capacity:"加油站 2,860 座 · 油库 46 座 · 加气站 140 座",units:["加油站","油库","CNG/LNG 加气站","配送车队"]},
  {org:"其他销售企业",seg:"MK",code:"MK-99",owner:"周敏",region:"—",capacity:"34 家省区销售企业合并报送 · 加油站 2.0 万座",units:["二级单位汇总报送"],merged:34},
  {org:"北辰钻探工程公司",seg:"ES",code:"ES-01",owner:"张国栋",region:"天津市",capacity:"钻机 960 部 · 压裂车组 72 套",units:["钻井队","压裂队","修井队"]},
  {org:"集团总部",seg:"HQ",code:"HQ",owner:"孙卫东",region:"北京市",capacity:"总部机关及直属科研院所",units:["总部办公区","科研院所"]}
];
const PETRO_FILLERS = ["赵海峰","刘建平","孙卫东"];
const PETRO_MANAGER = "高文博";
function petroEntity(org){return PETRO_ENTITIES.find(e=>e.org===org);}
function petroSeg(org){const e=petroEntity(org);return PETRO_SEGMENTS.find(s=>s.id===e?.seg);}

// ---------- 计算方法 ----------
// 燃料参数：低位发热量 NCV（GJ/t 或 GJ/万Nm³）、单位热值含碳量 CC（tC/GJ）、碳氧化率 OF
const PF = {
  ng:{ncv:389.31,cc:0.0153,of:0.99,ref:"指南缺省值"},
  dry:{ncv:45.92,cc:0.01735,of:0.99,ref:"企业实测（月度组分分析加权）"},
  fo:{ncv:41.816,cc:0.0211,of:0.98,ref:"指南缺省值"},
  crude:{ncv:41.816,cc:0.02008,of:0.98,ref:"指南缺省值"},
  diesel:{ncv:42.652,cc:0.0202,of:0.98,ref:"指南缺省值"},
  gasoline:{ncv:43.07,cc:0.0189,of:0.98,ref:"指南缺省值"},
  coal:{ncv:21.18,cc:0.02634,of:0.98,ref:"入炉煤月度实测加权"},
  coal2:{ncv:20.86,cc:0.02618,of:0.98,ref:"各企业实测加权"},
  mh:{ncv:51.86,cc:0.01462,of:0.99,ref:"企业实测（甲烷氢组分分析）"}
};
const C_TO_CO2 = 44/12;
const CO2_DENSITY = 19.7;   // tCO₂/万Nm³
const CH4_DENSITY = 7.17;   // tCH₄/万Nm³
const PETRO_GRID = 0.0005703; // tCO₂/kWh
const PETRO_HEAT = 0.11;      // tCO₂/GJ
const PETRO_METHODS = {
  comb:{label:"燃料燃烧",formula:"E = FC × NCV × CC × OF × 44/12",fields:[["ncv","低位发热量 NCV","GJ/单位"],["cc","单位热值含碳量 CC","tC/GJ"],["of","碳氧化率 OF",""]]},
  flare:{label:"火炬燃烧",formula:"E = Q × (CC非CO₂ × OF × 44/12 + V_CO₂ × 19.7)",fields:[["cc","火炬气非 CO₂ 含碳量","tC/万Nm³"],["vco2","火炬气 CO₂ 体积分数",""],["of","火炬燃烧碳氧化率",""]]},
  flareCH4:{label:"火炬燃烧",formula:"E_CO₂ = Q × (CC × OF × 44/12 + V_CO₂ × 19.7)；E_CH₄ = Q × V_CH₄ × (1 − OF) × 7.17",fields:[["cc","火炬气非 CO₂ 含碳量","tC/万Nm³"],["vco2","火炬气 CO₂ 体积分数",""],["vch4","火炬气 CH₄ 体积分数",""],["of","火炬燃烧效率",""]]},
  fcc:{label:"催化剂烧焦（连续）",formula:"E = MC × CF × OF × 44/12",fields:[["cf","焦炭含碳量 CF","tC/t"],["of","烧焦碳氧化率 OF",""]]},
  regen:{label:"催化剂烧焦（间歇）",formula:"E = MC × (CF前 − CF后) × 44/12",fields:[["cfq","再生前催化剂含碳量","tC/t"],["cfh","再生后催化剂含碳量","tC/t"]]},
  h2:{label:"制氢装置",formula:"E = [AD × CC原料 − (Q合成气 × CC合成气 + Q残渣 × CC残渣)] × 44/12",fields:[["ccr","原料含碳量","tC/t"],["qsg","合成气产量","t"],["ccsg","合成气含碳量","tC/t"],["qw","残渣量","t"],["ccw","残渣含碳量","tC/t"]]},
  eth:{label:"乙烯裂解炉管烧焦",formula:"E = Q烧焦气 × (φCO₂ + φCO) × 19.7",fields:[["pco2","烧焦尾气 CO₂ 体积分数",""],["pco","烧焦尾气 CO 体积分数",""]]},
  eo:{label:"环氧乙烷 / 乙二醇",formula:"E = (RE × RCC − PEO × PCC) × 44/12",fields:[["rcc","乙烯原料含碳量 RCC","tC/t"],["peo","当量环氧乙烷产量 PEO","t"],["pcc","环氧乙烷含碳量 PCC","tC/t"]]},
  asph:{label:"氧化沥青",formula:"E = M氧化沥青 × EF",fields:[["ef","氧化沥青排放因子","tCO₂/t"]]},
  calc:{label:"石油焦煅烧",formula:"E = [M生焦 × CC生焦 − (M煅烧焦 × CC煅烧焦 + M粉尘 × CC粉尘)] × 44/12",fields:[["ccr","生焦含碳量","tC/t"],["mp","煅烧焦产量","t"],["ccp","煅烧焦含碳量","tC/t"],["md","收集粉尘量","t"],["ccd","粉尘含碳量","tC/t"]]},
  acid:{label:"酸性气体脱除",formula:"E = (Q进 × V进 − Q出 × V出) × 19.7",fields:[["vin","原料气 CO₂ 体积分数",""],["qout","净化气量 Q出","万Nm³"],["vout","净化气 CO₂ 体积分数",""]]},
  vent:{label:"工艺放空",formula:"E_CH₄ = Q放空 × V_CH₄ × 7.17",fields:[["vch4","放空气 CH₄ 体积分数",""]]},
  fug:{label:"设备逃逸",formula:"E_CH₄ = Num设施 × EF设施",fields:[["ef","设施逃逸排放因子","tCH₄/(个·a)"]]},
  rec:{label:"CO₂ 回收利用（扣减）",formula:"R = Q回收 × PUR × 19.7",fields:[["pur","回收 CO₂ 纯度 PUR",""]]},
  recCH4:{label:"CH₄ 回收利用（扣减）",formula:"R_CH₄ = Q回收 × V_CH₄ × 7.17",fields:[["vch4","回收气 CH₄ 体积分数",""]]},
  elec:{label:"净购入电力",formula:"E = AD电 × EF电网",fields:[["ef","电网排放因子","tCO₂/kWh"]]},
  heat:{label:"净购入热力",formula:"E = AD热 × EF热",fields:[["ef","热力排放因子","tCO₂/GJ"]]},
  green:{label:"可再生电力（披露项）",formula:"自发自用 / 绿电交易电量单独披露，不计入范围二",fields:[]},
  gwp:{label:"含氟气体逸散",formula:"E = 补充量 × GWP / 1000",fields:[["gwp","GWP","—"]]}
};
// 按核算口径取 CH₄ 的 GWP（国内指南 21；ISO 14064 28；GHG Protocol AR6 27.9）
function petroGwpCH4() {
  const std=typeof backendState!=="undefined"?backendState.standard:"GHG_PROTOCOL";
  return {GHG_PROTOCOL:27.9,ISO_14064:28,CN_GUIDELINE:21}[std]||27.9;
}
// 计算一条排放源：返回 CO₂、CH₄（t）与 CO₂e，以及带数字的计算过程
function petroCalc(src,params,activity) {
  const p={...src.params,...(params||{})};
  const ad=Number(activity??src.activity)||0;
  const n=(v,d=4)=>Number(v).toLocaleString("zh-CN",{maximumFractionDigits:d});
  let co2=0,ch4=0,steps=[];
  switch(src.method) {
    case "comb":{
      const gj=ad*p.ncv;co2=gj*p.cc*p.of*C_TO_CO2;
      steps=["AD = "+n(ad)+" "+src.unit+" × "+n(p.ncv)+" GJ/"+src.unit+" = "+n(gj,0)+" GJ","EF = "+n(p.cc,5)+" × "+n(p.of)+" × 44/12 = "+n(p.cc*p.of*C_TO_CO2,5)+" tCO₂/GJ"];break;}
    case "flare":{co2=ad*(p.cc*p.of*C_TO_CO2+p.vco2*CO2_DENSITY);
      steps=["非 CO₂ 部分 = "+n(ad)+" × "+n(p.cc)+" × "+n(p.of)+" × 44/12 = "+n(ad*p.cc*p.of*C_TO_CO2,0)+" t","CO₂ 部分 = "+n(ad)+" × "+n(p.vco2)+" × 19.7 = "+n(ad*p.vco2*CO2_DENSITY,0)+" t"];break;}
    case "flareCH4":{co2=ad*(p.cc*p.of*C_TO_CO2+p.vco2*CO2_DENSITY);ch4=ad*p.vch4*(1-p.of)*CH4_DENSITY;
      steps=["CO₂ = "+n(ad)+" × ("+n(p.cc)+" × "+n(p.of)+" × 44/12 + "+n(p.vco2)+" × 19.7) = "+n(co2,0)+" t","CH₄ = "+n(ad)+" × "+n(p.vch4)+" × (1 − "+n(p.of)+") × 7.17 = "+n(ch4,1)+" t"];break;}
    case "fcc":co2=ad*p.cf*p.of*C_TO_CO2;steps=["E = "+n(ad)+" t × "+n(p.cf)+" × "+n(p.of)+" × 44/12"];break;
    case "regen":co2=ad*(p.cfq-p.cfh)*C_TO_CO2;steps=["E = "+n(ad)+" t × ("+n(p.cfq)+" − "+n(p.cfh)+") × 44/12"];break;
    case "h2":co2=(ad*p.ccr-(p.qsg*p.ccsg+p.qw*p.ccw))*C_TO_CO2;
      steps=["原料碳 = "+n(ad)+" × "+n(p.ccr)+" = "+n(ad*p.ccr,0)+" tC","产出碳 = "+n(p.qsg)+" × "+n(p.ccsg)+" + "+n(p.qw)+" × "+n(p.ccw)+" = "+n(p.qsg*p.ccsg+p.qw*p.ccw,0)+" tC"];break;
    case "eth":co2=ad*(p.pco2+p.pco)*CO2_DENSITY;steps=["E = "+n(ad)+" 万Nm³ × ("+n(p.pco2)+" + "+n(p.pco)+") × 19.7"];break;
    case "eo":co2=(ad*p.rcc-p.peo*p.pcc)*C_TO_CO2;steps=["乙烯碳 = "+n(ad)+" × "+n(p.rcc)+" = "+n(ad*p.rcc,0)+" tC","产品碳 = "+n(p.peo)+" × "+n(p.pcc)+" = "+n(p.peo*p.pcc,0)+" tC"];break;
    case "asph":co2=ad*p.ef;steps=["E = "+n(ad)+" t × "+n(p.ef)];break;
    case "calc":co2=(ad*p.ccr-(p.mp*p.ccp+p.md*p.ccd))*C_TO_CO2;
      steps=["生焦碳 = "+n(ad)+" × "+n(p.ccr)+" = "+n(ad*p.ccr,0)+" tC","产出碳 = "+n(p.mp)+" × "+n(p.ccp)+" + "+n(p.md)+" × "+n(p.ccd)+" = "+n(p.mp*p.ccp+p.md*p.ccd,0)+" tC"];break;
    case "acid":co2=(ad*p.vin-p.qout*p.vout)*CO2_DENSITY;steps=["脱除 CO₂ = ("+n(ad)+" × "+n(p.vin)+" − "+n(p.qout)+" × "+n(p.vout)+") 万Nm³ = "+n(ad*p.vin-p.qout*p.vout,0)+" 万Nm³"];break;
    case "vent":ch4=ad*p.vch4*CH4_DENSITY;steps=["CH₄ = "+n(ad)+" 万Nm³ × "+n(p.vch4)+" × 7.17"];break;
    case "fug":ch4=ad*p.ef;steps=["CH₄ = "+n(ad)+" "+src.unit+" × "+n(p.ef)+" tCH₄/(个·a)"];break;
    case "rec":co2=-ad*p.pur*CO2_DENSITY;steps=["R = "+n(ad)+" 万Nm³ × "+n(p.pur)+" × 19.7"];break;
    case "recCH4":ch4=-ad*p.vch4*CH4_DENSITY;steps=["R = "+n(ad)+" 万Nm³ × "+n(p.vch4)+" × 7.17"];break;
    case "elec":co2=ad*p.ef;steps=["E = "+n(ad,0)+" kWh × "+n(p.ef,7)+" tCO₂/kWh"];break;
    case "heat":co2=ad*p.ef;steps=["E = "+n(ad,0)+" GJ × "+n(p.ef)+" tCO₂/GJ"];break;
    case "gwp":co2=ad*p.gwp/1000;steps=["E = "+n(ad)+" kg × "+n(p.gwp,0)+" / 1000"];break;
    default:break;
  }
  const gwp=petroGwpCH4();
  return {co2,ch4,gwp,co2e:co2+ch4*gwp,steps};
}
function petroFactor(src,params,activity) {
  const ad=Number(activity??src.activity)||0;
  if(!ad)return 0;
  return petroCalc(src,params,ad).co2e/ad;
}

// ---------- 排放源 ----------
const PETRO_SOURCES = [];
function PS(id,org,kind,name,unit,method,params,activity,extra={}) {
  PETRO_SOURCES.push({id,org,kind,name,unit,method,params,activity,...extra});
}
// 滨海石化分公司
PS("T-S1-01","滨海石化分公司","固定燃烧","炼厂干气（加热炉、锅炉）","t","comb",PF.dry,952000,{facility:"常减压、催化、重整、加氢加热炉 46 台",evidence:"FG-BH-2026-10",status:"通过",mode:"燃料气流量计 + 月度组分分析"});
PS("T-S1-02","滨海石化分公司","固定燃烧","天然气（转化炉、加热炉）","万Nm³","comb",PF.ng,42000,{facility:"制氢转化炉 2 台、乙烯裂解炉补燃",evidence:"NG-BH-2026-10",status:"待审核",mode:"贸易交接计量"});
PS("T-S1-03","滨海石化分公司","固定燃烧","燃料油（开工及备用）","t","comb",PF.fo,35000,{facility:"开工加热炉、备用锅炉",evidence:"FO-BH-2026-Q3",status:"通过",mode:"罐区收发台账"});
PS("T-S1-04","滨海石化热电厂","固定燃烧","燃煤热电联产","t","comb",PF.coal,1652000,{facility:"2×350 MW 超临界热电联产机组",evidence:"MRV-BH-2026-10",status:"通过",mode:"入炉煤皮带秤 + 元素碳月度检测",guide:"发电"});
PS("T-S1-05","滨海石化分公司","火炬燃烧","火炬气（正常工况）","万Nm³","flare",{cc:5.62,vco2:0.012,of:0.98},1850,{facility:"高压火炬、低压火炬、酸性气火炬",evidence:"FL-BH-2026-10",status:"通过",mode:"火炬气超声波流量计"});
PS("T-S1-06","滨海石化分公司","火炬燃烧","火炬气（事故工况）","万Nm³","flare",{cc:6.05,vco2:0.008,of:0.98},27.6,{facility:"2026-06-14 催化Ⅱ套气压机停机 6 h",evidence:"FL-BH-2026-0614",status:"退回",mode:"事故记录 × 流速 × 时长",reviewNote:"事故火炬气流速取设计值 4.6 万Nm³/h，请补充 DCS 流量曲线截图"});
PS("T-S1-07","滨海石化分公司","工业过程","催化裂化装置烧焦（Ⅰ、Ⅱ套）","t","fcc",{cf:0.932,of:0.98},378000,{facility:"重油催化裂化 350 + 280 万 t/a",evidence:"FCC-BH-2026-10",status:"通过",mode:"烟气量 × 组分反算烧焦量"});
PS("T-S1-08","滨海石化分公司","工业过程","连续重整装置烧焦","t","fcc",{cf:0.925,of:0.98},4200,{facility:"连续重整 220 万 t/a 再生器",evidence:"CCR-BH-2026-10",status:"通过",mode:"再生器烧焦量月报"});
PS("T-S1-09","滨海石化分公司","工业过程","加氢装置催化剂再生（间歇烧焦）","t","regen",{cfq:0.118,cfh:0.006},1260,{facility:"柴油加氢、蜡油加氢器外再生",evidence:"REG-BH-2026-05",status:"通过",mode:"再生前后催化剂含碳分析"});
PS("T-S1-10","滨海石化分公司","工业过程","制氢装置（天然气原料）","t","h2",{ccr:0.742,qsg:0,ccsg:0,qw:0,ccw:0},225000,{facility:"制氢Ⅰ套 10 万 t/a",evidence:"H2-BH-2026-10",status:"通过",mode:"原料计量 + 组分分析"});
PS("T-S1-11","滨海石化分公司","工业过程","制氢装置（炼厂干气原料）","t","h2",{ccr:0.62,qsg:1800,ccsg:0.21,qw:0,ccw:0},68000,{facility:"制氢Ⅱ套 4 万 t/a",evidence:"H2-BH2-2026-10",status:"待审核",mode:"原料计量 + 组分分析"});
PS("T-S1-12","滨海石化分公司","工业过程","乙烯裂解炉管烧焦","万Nm³","eth",{pco2:0.038,pco:0.006},1320,{facility:"裂解炉 12 台，年烧焦 86 次",evidence:"ETH-BH-2026-10",status:"通过",mode:"烧焦尾气流量 + 在线分析"});
PS("T-S1-13","滨海石化分公司","工业过程","环氧乙烷/乙二醇装置","t","eo",{rcc:0.857,peo:315000,pcc:0.545},236000,{facility:"EO/EG 40 万 t/a",evidence:"EO-BH-2026-10",status:"通过",mode:"乙烯进料计量 + 产品产量"});
PS("T-S1-14","滨海石化分公司","回收扣减","CO₂ 回收（制氢尾气捕集，外供松原油田驱油）","万Nm³","rec",{pur:0.995},20400,{facility:"CO₂ 捕集装置 50 万 t/a",evidence:"CCUS-BH-2026-10",status:"通过",mode:"外输 CO₂ 质量流量计"});
PS("T-S2-01","滨海石化分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},1600000000,{facility:"220 kV 总降变电站",evidence:"ELE-BH-2026-10",status:"通过",mode:"关口电表 + 电费结算单"});
PS("T-S2-04","滨海石化热电厂","购入电力","厂用电下网","kWh","elec",{ef:PETRO_GRID},25600000,{facility:"机组启停及检修期间",evidence:"ELE-BHP-2026-10",status:"通过",mode:"关口电表",guide:"发电"});
// 陇原石化分公司
PS("T-S1-16","陇原石化分公司","固定燃烧","炼厂干气（加热炉、锅炉）","t","comb",{...PF.dry,ncv:45.6,cc:0.01748},520000,{evidence:"FG-LY-2026-10",status:"通过",mode:"燃料气流量计 + 月度组分分析"});
PS("T-S1-17","陇原石化分公司","固定燃烧","天然气（转化炉、加热炉）","万Nm³","comb",PF.ng,31000,{evidence:"NG-LY-2026-10",status:"通过",mode:"贸易交接计量"});
PS("T-S1-18","陇原石化分公司","固定燃烧","燃料油（开工及备用）","t","comb",PF.fo,12000,{evidence:"FO-LY-2026-Q3",status:"草稿",mode:"罐区收发台账"});
PS("T-S1-19","陇原石化分公司","火炬燃烧","火炬气（正常工况）","万Nm³","flare",{cc:5.48,vco2:0.015,of:0.98},980,{evidence:"FL-LY-2026-10",status:"通过",mode:"火炬气流量计"});
PS("T-S1-20","陇原石化分公司","工业过程","催化裂化装置烧焦","t","fcc",{cf:0.928,of:0.98},246000,{evidence:"FCC-LY-2026-10",status:"通过",mode:"烟气量 × 组分反算烧焦量"});
PS("T-S1-21","陇原石化分公司","工业过程","连续重整装置烧焦","t","fcc",{cf:0.925,of:0.98},2100,{evidence:"CCR-LY-2026-10",status:"通过",mode:"再生器烧焦量月报"});
PS("T-S1-22","陇原石化分公司","工业过程","制氢装置（天然气原料）","t","h2",{ccr:0.742,qsg:0,ccsg:0,qw:0,ccw:0},98000,{evidence:"H2-LY-2026-10",status:"通过",mode:"原料计量 + 组分分析"});
PS("T-S1-23","陇原石化分公司","工业过程","乙烯裂解炉管烧焦","万Nm³","eth",{pco2:0.036,pco:0.007},860,{evidence:"ETH-LY-2026-10",status:"通过",mode:"烧焦尾气流量 + 在线分析"});
PS("T-S1-24","陇原石化分公司","工业过程","氧化沥青装置","t","asph",{ef:0.03},180000,{evidence:"ASP-LY-2026-10",status:"通过",mode:"产品产量"});
PS("T-S2-05","陇原石化分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},2100000000,{evidence:"ELE-LY-2026-10",status:"通过",mode:"关口电表 + 电费结算单"});
PS("T-S2-06","陇原石化分公司","购入热力","外购蒸汽","GJ","heat",{ef:PETRO_HEAT},3800000,{evidence:"STM-LY-2026-10",status:"退回",mode:"蒸汽结算单",reviewNote:"9 月蒸汽结算量与计量月报相差 4.2%，请补充计量表读数后重新提交"});
// 天山石化分公司
PS("T-S1-25","天山石化分公司","固定燃烧","炼厂干气（加热炉、锅炉）","t","comb",{...PF.dry,ncv:46.2,cc:0.01722},480000,{evidence:"FG-TS-2026-10",status:"通过",mode:"燃料气流量计 + 月度组分分析"});
PS("T-S1-26","天山石化分公司","固定燃烧","天然气（乙烯裂解炉燃料）","万Nm³","comb",PF.ng,115000,{evidence:"NG-TS-2026-10",status:"通过",mode:"贸易交接计量"});
PS("T-S1-27","天山石化分公司","固定燃烧","甲烷氢（乙烯装置副产燃料气）","t","comb",PF.mh,610000,{evidence:"MH-TS-2026-10",status:"待审核",mode:"燃料气流量计 + 组分分析"});
PS("T-S1-28","天山石化分公司","火炬燃烧","火炬气（正常工况）","万Nm³","flare",{cc:5.71,vco2:0.01,of:0.98},1420,{evidence:"FL-TS-2026-10",status:"通过",mode:"火炬气流量计"});
PS("T-S1-29","天山石化分公司","工业过程","催化裂化装置烧焦","t","fcc",{cf:0.93,of:0.98},152000,{evidence:"FCC-TS-2026-10",status:"通过",mode:"烟气量 × 组分反算烧焦量"});
PS("T-S1-30","天山石化分公司","工业过程","制氢装置（天然气原料）","t","h2",{ccr:0.742,qsg:0,ccsg:0,qw:0,ccw:0},86000,{evidence:"H2-TS-2026-10",status:"通过",mode:"原料计量 + 组分分析"});
PS("T-S1-31","天山石化分公司","工业过程","乙烯裂解炉管烧焦","万Nm³","eth",{pco2:0.041,pco:0.005},2350,{evidence:"ETH-TS-2026-10",status:"通过",mode:"烧焦尾气流量 + 在线分析"});
PS("T-S1-32","天山石化分公司","工业过程","石油焦煅烧","t","calc",{ccr:0.893,mp:312000,ccp:0.985,md:9800,ccd:0.9},420000,{evidence:"CAL-TS-2026-10",status:"通过",mode:"生焦投料 + 煅烧焦产量"});
PS("T-S2-07","天山石化分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},2600000000,{evidence:"ELE-TS-2026-10",status:"通过",mode:"关口电表 + 电费结算单"});
// 其他炼化企业（合并报送）
PS("T-S1-33","其他炼化企业","固定燃烧","炼厂干气","t","comb",PF.dry,8600000,{evidence:"RF-MERGE-2026-FG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-34","其他炼化企业","固定燃烧","天然气","万Nm³","comb",PF.ng,420000,{evidence:"RF-MERGE-2026-NG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-35","其他炼化企业","固定燃烧","燃料油","t","comb",PF.fo,260000,{evidence:"RF-MERGE-2026-FO",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-36","其他炼化企业","固定燃烧","燃煤（自备电厂）","t","comb",PF.coal2,5200000,{evidence:"RF-MERGE-2026-COAL",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-37","其他炼化企业","火炬燃烧","火炬气","万Nm³","flare",{cc:5.55,vco2:0.012,of:0.98},14800,{evidence:"RF-MERGE-2026-FL",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-38","其他炼化企业","工业过程","催化裂化装置烧焦","t","fcc",{cf:0.93,of:0.98},2500000,{evidence:"RF-MERGE-2026-FCC",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-39","其他炼化企业","工业过程","制氢装置","t","h2",{ccr:0.735,qsg:0,ccsg:0,qw:0,ccw:0},1450000,{evidence:"RF-MERGE-2026-H2",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-40","其他炼化企业","工业过程","乙烯裂解炉管烧焦","万Nm³","eth",{pco2:0.039,pco:0.006},12800,{evidence:"RF-MERGE-2026-ETH",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-41","其他炼化企业","工业过程","环氧乙烷/乙二醇装置","t","eo",{rcc:0.857,peo:1094000,pcc:0.545},820000,{evidence:"RF-MERGE-2026-EO",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-42","其他炼化企业","回收扣减","CO₂ 回收利用","万Nm³","rec",{pur:0.99},18600,{evidence:"RF-MERGE-2026-REC",status:"待审核",mode:"所属企业汇总报送"});
PS("T-S2-08","其他炼化企业","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},14500000000,{evidence:"RF-MERGE-2026-ELE",status:"通过",mode:"所属企业汇总报送"});
PS("T-S2-09","其他炼化企业","购入热力","外购蒸汽","GJ","heat",{ef:PETRO_HEAT},21000000,{evidence:"RF-MERGE-2026-STM",status:"通过",mode:"所属企业汇总报送"});
// 松原油田分公司
PS("T-S1-43","松原油田分公司","固定燃烧","天然气（加热炉、锅炉、注汽锅炉）","万Nm³","comb",PF.ng,180000,{facility:"加热炉 6,820 台、注汽锅炉 46 台",evidence:"NG-SY-2026-10",status:"通过",mode:"采油厂计量间汇总"});
PS("T-S1-44","松原油田分公司","固定燃烧","原油（加热炉自用）","t","comb",PF.crude,62000,{evidence:"CR-SY-2026-10",status:"通过",mode:"站库自用油台账"});
PS("T-S1-45","松原油田分公司","移动燃烧","柴油（作业机具、车辆）","t","comb",PF.diesel,96000,{evidence:"DS-SY-2026-10",status:"通过",mode:"加油卡记录"});
PS("T-S1-46","松原油田分公司","火炬燃烧","火炬燃烧（伴生气）","万Nm³","flareCH4",{cc:5.05,vco2:0.018,vch4:0.82,of:0.98},3200,{evidence:"FL-SY-2026-10",status:"通过",mode:"火炬流量计"});
PS("T-S1-47","松原油田分公司","工艺放空","油井套管气放空","万Nm³","vent",{vch4:0.8},6300,{facility:"偏远单井 8,600 口",evidence:"VT-SY-2026-10",status:"待审核",mode:"单井套压测试推算"});
PS("T-S1-53","松原油田分公司","回收扣减","CH₄ 回收利用（套管气回收）","万Nm³","recCH4",{vch4:0.8},1800,{evidence:"RC-SY-2026-10",status:"通过",mode:"回收装置计量"});
PS("T-S1-48","松原油田分公司","设备逃逸","油井井口装置","口","fug",{ef:0.23},68400,{evidence:"LDAR-SY-2026",status:"通过",mode:"在册井数 × LDAR 核定因子"});
PS("T-S1-49","松原油田分公司","设备逃逸","联合站","座","fug",{ef:1.4},112,{evidence:"LDAR-SY-2026",status:"通过",mode:"在册站数 × LDAR 核定因子"});
PS("T-S1-50","松原油田分公司","设备逃逸","接转站","座","fug",{ef:0.18},978,{evidence:"LDAR-SY-2026",status:"通过",mode:"在册站数 × LDAR 核定因子"});
PS("T-S1-51","松原油田分公司","工业过程","酸性气体脱除（含 CO₂ 天然气净化）","万Nm³","acid",{vin:0.226,qout:148000,vout:0.02},186000,{facility:"天然气处理厂 CO₂ 分离",evidence:"AG-SY-2026-10",status:"通过",mode:"进出口气量 + 在线色谱"});
PS("T-S1-52","松原油田分公司","回收扣减","CO₂ 回收（CCUS 驱油埋存）","万Nm³","rec",{pur:0.985},38000,{facility:"CCUS 循环注入站 6 座",evidence:"CCUS-SY-2026-10",status:"通过",mode:"注入站质量流量计"});
PS("T-S2-10","松原油田分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},11800000000,{facility:"机采井、注水泵、集输泵",evidence:"ELE-SY-2026-10",status:"通过",mode:"电网结算单"});
// 鄂南油气田分公司
PS("T-S1-54","鄂南油气田分公司","固定燃烧","天然气（加热炉、锅炉）","万Nm³","comb",PF.ng,125000,{evidence:"NG-EN-2026-10",status:"通过",mode:"作业区计量汇总"});
PS("T-S1-55","鄂南油气田分公司","移动燃烧","柴油（作业机具、车辆）","t","comb",PF.diesel,210000,{evidence:"DS-EN-2026-10",status:"通过",mode:"加油卡记录"});
PS("T-S1-56","鄂南油气田分公司","火炬燃烧","火炬燃烧","万Nm³","flareCH4",{cc:5.02,vco2:0.02,vch4:0.9,of:0.98},6800,{evidence:"FL-EN-2026-10",status:"通过",mode:"火炬流量计"});
PS("T-S1-57","鄂南油气田分公司","工艺放空","气井测试及管线放空","万Nm³","vent",{vch4:0.93},2900,{evidence:"VT-EN-2026-10",status:"通过",mode:"放空记录 × 管容计算"});
PS("T-S1-58","鄂南油气田分公司","设备逃逸","油井井口装置","口","fug",{ef:0.23},75400,{evidence:"LDAR-EN-2026",status:"通过",mode:"在册井数 × LDAR 核定因子"});
PS("T-S1-59","鄂南油气田分公司","设备逃逸","气井井口装置","口","fug",{ef:0.38},22600,{evidence:"LDAR-EN-2026",status:"通过",mode:"在册井数 × LDAR 核定因子"});
PS("T-S1-60","鄂南油气田分公司","设备逃逸","集气站","座","fug",{ef:4.6},486,{evidence:"LDAR-EN-2026",status:"通过",mode:"在册站数 × LDAR 核定因子"});
PS("T-S1-61","鄂南油气田分公司","工业过程","酸性气体脱除（天然气净化厂）","万Nm³","acid",{vin:0.031,qout:3720000,vout:0.018},3800000,{evidence:"AG-EN-2026-10",status:"通过",mode:"进出口气量 + 在线色谱"});
PS("T-S2-11","鄂南油气田分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},6200000000,{evidence:"ELE-EN-2026-10",status:"通过",mode:"电网结算单"});
// 塔河油田分公司
PS("T-S1-62","塔河油田分公司","固定燃烧","天然气（加热炉、锅炉）","万Nm³","comb",PF.ng,95000,{evidence:"NG-TH-2026-10",status:"通过",mode:"作业区计量汇总"});
PS("T-S1-63","塔河油田分公司","移动燃烧","柴油（作业机具、车辆）","t","comb",PF.diesel,82000,{evidence:"DS-TH-2026-10",status:"待填报",mode:"加油卡记录"});
PS("T-S1-64","塔河油田分公司","火炬燃烧","火炬燃烧","万Nm³","flareCH4",{cc:5.1,vco2:0.026,vch4:0.84,of:0.98},4100,{evidence:"FL-TH-2026-10",status:"通过",mode:"火炬流量计"});
PS("T-S1-65","塔河油田分公司","工艺放空","工艺放空","万Nm³","vent",{vch4:0.88},1200,{evidence:"VT-TH-2026-10",status:"通过",mode:"放空记录"});
PS("T-S1-66","塔河油田分公司","设备逃逸","油气井井口装置","口","fug",{ef:0.38},9800,{evidence:"LDAR-TH-2026",status:"通过",mode:"在册井数 × LDAR 核定因子"});
PS("T-S1-67","塔河油田分公司","工业过程","酸性气体脱除","万Nm³","acid",{vin:0.046,qout:2560000,vout:0.025},2650000,{evidence:"AG-TH-2026-10",status:"通过",mode:"进出口气量 + 在线色谱"});
PS("T-S2-12","塔河油田分公司","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},1850000000,{evidence:"ELE-TH-2026-10",status:"通过",mode:"电网结算单"});
// 其他油气田企业（合并报送）
PS("T-S1-68","其他油气田企业","固定燃烧","天然气","万Nm³","comb",PF.ng,620000,{evidence:"UP-MERGE-2026-NG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-69","其他油气田企业","固定燃烧","原油 / 重油（稠油注汽）","t","comb",PF.crude,380000,{evidence:"UP-MERGE-2026-CR",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-70","其他油气田企业","移动燃烧","柴油","t","comb",PF.diesel,450000,{evidence:"UP-MERGE-2026-DS",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-71","其他油气田企业","火炬燃烧","火炬燃烧","万Nm³","flareCH4",{cc:5.06,vco2:0.02,vch4:0.85,of:0.98},21000,{evidence:"UP-MERGE-2026-FL",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-72","其他油气田企业","工艺放空","工艺放空","万Nm³","vent",{vch4:0.85},9800,{evidence:"UP-MERGE-2026-VT",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-73","其他油气田企业","设备逃逸","油气井井口装置","口","fug",{ef:0.23},186000,{evidence:"UP-MERGE-2026-LDAR",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-74","其他油气田企业","工业过程","酸性气体脱除","万Nm³","acid",{vin:0.038,qout:6050000,vout:0.02},6200000,{evidence:"UP-MERGE-2026-AG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-75","其他油气田企业","回收扣减","CO₂ 回收（CCUS 驱油埋存）","万Nm³","rec",{pur:0.985},21000,{evidence:"UP-MERGE-2026-CCUS",status:"通过",mode:"所属企业汇总报送"});
PS("T-S2-13","其他油气田企业","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},21500000000,{evidence:"UP-MERGE-2026-ELE",status:"通过",mode:"所属企业汇总报送"});
// 西部管道分公司
PS("T-S1-76","西部管道分公司","固定燃烧","天然气（燃驱压缩机组）","万Nm³","comb",PF.ng,98000,{facility:"燃驱压气站 34 座、燃气轮机 86 台",evidence:"NG-XB-2026-10",status:"通过",mode:"自耗气计量"});
PS("T-S1-77","西部管道分公司","工艺放空","清管、维检修放空","万Nm³","vent",{vch4:0.92},1250,{evidence:"VT-XB-2026-10",status:"待审核",mode:"放空作业票 × 管容计算"});
PS("T-S1-78","西部管道分公司","设备逃逸","压气站","座","fug",{ef:28.5},62,{evidence:"LDAR-XB-2026",status:"通过",mode:"在册站数 × LDAR 核定因子"});
PS("T-S1-79","西部管道分公司","设备逃逸","阀室","座","fug",{ef:0.86},980,{evidence:"LDAR-XB-2026",status:"通过",mode:"在册阀室数 × LDAR 核定因子"});
PS("T-S1-80","西部管道分公司","设备逃逸","储气库","座","fug",{ef:120},4,{evidence:"LDAR-XB-2026",status:"通过",mode:"LDAR 检测"});
PS("T-S2-14","西部管道分公司","购入电力","外购电力（电驱压缩机组）","kWh","elec",{ef:PETRO_GRID},3800000000,{evidence:"ELE-XB-2026-10",status:"通过",mode:"电网结算单"});
// 其他管道企业
PS("T-S1-81","其他管道企业","固定燃烧","天然气（燃驱压缩机组）","万Nm³","comb",PF.ng,86000,{evidence:"PL-MERGE-2026-NG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-82","其他管道企业","工艺放空","清管、维检修放空","万Nm³","vent",{vch4:0.92},1050,{evidence:"PL-MERGE-2026-VT",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-83","其他管道企业","设备逃逸","压气站","座","fug",{ef:28.5},58,{evidence:"PL-MERGE-2026-LDAR",status:"通过",mode:"所属企业汇总报送"});
PS("T-S2-15","其他管道企业","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},3600000000,{evidence:"PL-MERGE-2026-ELE",status:"通过",mode:"所属企业汇总报送"});
// 销售
PS("T-S1-84","华北销售分公司","固定燃烧","天然气（油库锅炉、站内设施）","万Nm³","comb",PF.ng,1560,{evidence:"NG-HB-2026-10",status:"通过",mode:"燃气账单导入"});
PS("T-S1-85","华北销售分公司","移动燃烧","柴油（自有配送车队）","t","comb",PF.diesel,11000,{evidence:"DS-HB-2026-10",status:"草稿",mode:"加油卡记录"});
PS("T-S1-86","华北销售分公司","设备逃逸","CNG/LNG 加气站","座","fug",{ef:0.62},140,{evidence:"LDAR-HB-2026",status:"通过",mode:"在册站数 × LDAR 核定因子"});
PS("T-S2-16","华北销售分公司","购入电力","外购电力（加油站、油库）","kWh","elec",{ef:PETRO_GRID},410000000,{evidence:"ELE-HB-2026-10",status:"通过",mode:"电费账单导入"});
PS("T-S2-17","华北销售分公司","购入电力","加油站分布式光伏（自发自用）","kWh","green",{},36000000,{evidence:"PV-HB-2026-10",status:"通过",mode:"光伏电表"});
PS("T-S1-87","其他销售企业","固定燃烧","天然气","万Nm³","comb",PF.ng,12000,{evidence:"MK-MERGE-2026-NG",status:"通过",mode:"所属企业汇总报送"});
PS("T-S1-88","其他销售企业","移动燃烧","柴油（自有配送车队）","t","comb",PF.diesel,86000,{evidence:"MK-MERGE-2026-DS",status:"通过",mode:"所属企业汇总报送"});
PS("T-S2-18","其他销售企业","购入电力","外购电力（加油站、油库）","kWh","elec",{ef:PETRO_GRID},3900000000,{evidence:"MK-MERGE-2026-ELE",status:"通过",mode:"所属企业汇总报送"});
// 工程技术服务
PS("T-S1-89","北辰钻探工程公司","移动燃烧","柴油（钻机、压裂车组）","t","comb",PF.diesel,780000,{evidence:"DS-ZT-2026-10",status:"通过",mode:"井队油料台账"});
PS("T-S1-90","北辰钻探工程公司","固定燃烧","天然气（燃气驱动钻机）","万Nm³","comb",PF.ng,18000,{evidence:"NG-ZT-2026-10",status:"待审核",mode:"井场计量"});
PS("T-S2-19","北辰钻探工程公司","购入电力","外购电力（电动钻机网电）","kWh","elec",{ef:PETRO_GRID},1450000000,{evidence:"ELE-ZT-2026-10",status:"通过",mode:"临时用电结算单"});
// 集团总部
PS("T-S1-91","集团总部","移动燃烧","公务车汽油","t","comb",PF.gasoline,1850,{evidence:"FUEL-HQ-2026-Q3",status:"通过",mode:"加油卡记录"});
PS("T-S1-92","集团总部","逸散排放","制冷剂（R410A 中央空调）","kg","gwp",{gwp:2088},1200,{evidence:"HVAC-HQ-2026",status:"通过",mode:"维保充注记录"});
PS("T-S2-20","集团总部","购入电力","外购电力","kWh","elec",{ef:PETRO_GRID},98000000,{evidence:"ELE-HQ-2026-10",status:"通过",mode:"电费账单导入"});
PS("T-S2-21","集团总部","购入热力","外购热力（市政供暖）","GJ","heat",{ef:PETRO_HEAT},260000,{evidence:"HEAT-HQ-2026",status:"待填报",mode:"供热结算单"});

PETRO_SOURCES.forEach(src=>{
  const e=petroEntity(src.org);
  src.scope=src.id.startsWith("T-S1")?"1":"2";
  src.seg=e.seg;
  src.owner=src.owner||e.owner;
  src.guide=src.guide||PETRO_SEGMENTS.find(s=>s.id===e.seg).guide;
  src.gas=["vent","fug","recCH4"].includes(src.method)?"CH₄":src.method==="flareCH4"?"CO₂ / CH₄":src.method==="gwp"?"HFCs":"CO₂";
});
function petroSource(id){return PETRO_SOURCES.find(s=>s.id===id);}
function petroFactorLabel(src) {
  const m=PETRO_METHODS[src.method];
  if(src.method==="comb")return m.label+" · NCV "+src.params.ncv+" · CC "+src.params.cc+" · OF "+src.params.of+"（"+src.params.ref+"）";
  if(src.method==="elec")return "全国电网平均排放因子 0.5703 tCO₂/MWh";
  if(src.method==="heat")return "热力缺省排放因子 0.11 tCO₂/GJ";
  if(src.method==="green")return "可再生电力 · 单独披露，不计入范围二";
  return m.label+" · "+m.formula;
}
// 供 offline-demo.js 使用
function petroDirectTasks() {
  return PETRO_SOURCES.map(src=>({id:src.id,org:src.org,name:src.name,unit:src.unit}));
}
function petroSeedEntries() {
  const out={};
  PETRO_SOURCES.forEach(src=>{
    out[src.id]={activity:src.status==="待填报"?"":src.activity,evidence:src.status==="待填报"?"":src.evidence,status:src.status,note:src.note||"",
      params:{...src.params},reviewNote:src.reviewNote||""};
  });
  return out;
}
