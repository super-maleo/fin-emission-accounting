// 公共排放因子库与兜底因子库。数据按来源、版本维护，并入因子智能匹配。

const FUEL_PARAMS = [
  // 名称, 低位发热量, 发热量单位, 单位热值含碳量 tC/TJ, 碳氧化率, 计量单位
  ["无烟煤",20.304,"GJ/t",27.49,0.94,"t"],["烟煤",19.570,"GJ/t",26.18,0.93,"t"],["褐煤",14.080,"GJ/t",28.00,0.96,"t"],
  ["洗精煤",26.344,"GJ/t",25.41,0.90,"t"],["其他洗煤",12.545,"GJ/t",25.41,0.90,"t"],["型煤",17.460,"GJ/t",33.60,0.90,"t"],
  ["焦炭",28.435,"GJ/t",29.42,0.93,"t"],["石油焦",32.500,"GJ/t",27.50,0.98,"t"],["原油",41.816,"GJ/t",20.08,0.98,"t"],
  ["燃料油",41.816,"GJ/t",21.10,0.98,"t"],["汽油",43.070,"GJ/t",18.90,0.98,"t"],["柴油",42.652,"GJ/t",20.20,0.98,"t"],
  ["一般煤油",43.070,"GJ/t",19.60,0.98,"t"],["液化石油气",50.179,"GJ/t",17.20,0.98,"t"],["液化天然气",51.440,"GJ/t",15.30,0.98,"t"],
  ["炼厂干气",45.998,"GJ/t",18.20,0.98,"t"],["天然气",389.31,"GJ/万Nm³",15.30,0.99,"万Nm³"],["焦炉煤气",179.81,"GJ/万Nm³",13.58,0.99,"万Nm³"],
  ["高炉煤气",33.00,"GJ/万Nm³",70.80,0.99,"万Nm³"],["转炉煤气",84.00,"GJ/万Nm³",49.60,0.99,"万Nm³"],["其他煤气",52.27,"GJ/万Nm³",12.20,0.99,"万Nm³"]
];
const GWP_TABLE = [
  // 气体, AR4, AR5, AR6, 常见用途
  ["CH₄（化石源）",25,28,29.8,"燃烧、逸散"],["N₂O",298,265,273,"燃烧、工业过程"],["HFC-23",14800,12400,14600,"副产物"],["HFC-32（R32）",675,677,771,"空调制冷剂"],
  ["HFC-125",3500,3170,3740,"混合制冷剂组分"],["HFC-134a（R134a）",1430,1300,1530,"冷水机组、汽车空调"],["HFC-143a",4470,4800,5810,"混合制冷剂组分"],
  ["HFC-152a",124,138,164,"发泡剂"],["HFC-227ea",3220,3350,3600,"气体灭火"],["HFC-245fa",1030,858,962,"发泡剂"],
  ["R410A",2088,1924,2256,"多联机、分体空调"],["R407C",1774,1624,1908,"空调制冷剂"],["R404A",3922,3943,4728,"冷库、冷链"],["R507A",3985,3985,4775,"低温冷冻"],
  ["HCFC-22（R22）",1810,1760,1960,"存量空调"],["SF₆",22800,23500,25200,"高压开关柜"],["NF₃",17200,16100,17400,"电子刻蚀"],["CF₄（PFC-14）",7390,6630,7380,"铝电解、刻蚀"]
];
const LIB_ROWS = [
  // 分类, 名称, 因子值(tCO₂e/单位), 单位, 范围, 地区, 年份, 来源, 关键词
  ["电力","全国电网平均排放因子",0.0005703,"kWh","2","全国",2022,"生态环境部《关于发布2022年度全国电网平均排放因子的通知》","外购电力 电网 用电"],
  ["电力","全国电网平均排放因子",0.000581,"kWh","2","全国",2021,"生态环境部 2022 年发布","外购电力 电网 用电"],
  ["电力","全国电力平均二氧化碳排放因子",0.0005366,"kWh","2","全国",2022,"生态环境部、国家统计局《2022年电力二氧化碳排放因子》","电力 产品 用电 LCA"],
  ["电力","全国电力平均二氧化碳排放因子",0.0005568,"kWh","2","全国",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","电力 用电"],
  ["电力","全国电力平均二氧化碳排放因子（不含市场化非化石电量）",0.0005942,"kWh","2","全国",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","电力 市场法 剩余组合"],
  ["电力","华北区域电力平均二氧化碳排放因子",0.000712,"kWh","2","华北",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","华北 电网 电力"],
  ["电力","东北区域电力平均二氧化碳排放因子",0.0006012,"kWh","2","东北",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","东北 电网 电力"],
  ["电力","华东区域电力平均二氧化碳排放因子",0.0005992,"kWh","2","华东",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","华东 浙江 江苏 上海 电网 电力"],
  ["电力","华中区域电力平均二氧化碳排放因子",0.0005354,"kWh","2","华中",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","华中 电网 电力"],
  ["电力","西北区域电力平均二氧化碳排放因子",0.0006671,"kWh","2","西北",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","西北 电网 电力"],
  ["电力","南方区域电力平均二氧化碳排放因子",0.0004367,"kWh","2","南方",2021,"生态环境部、国家统计局《2021年电力二氧化碳排放因子》","南方 广东 电网 电力"],
  ["电力","绿色电力（绿电交易电量）",0,"kWh","2","全国",2024,"GHG Protocol 范围二指南 · 市场法","绿电 绿证 可再生"],
  ["电力","分布式光伏自发自用",0,"kWh","2","全国",2024,"GHG Protocol 范围二指南","光伏 自发自用"],
  ["热力","外购热力缺省排放因子",0.11,"GJ","2","全国",2015,"《工业其他行业企业温室气体排放核算方法与报告指南（试行）》","热力 蒸汽 供热"],
  ["热力","外购蒸汽（饱和蒸汽 1.0 MPa）",0.3076,"t","2","全国",2015,"按焓值 2.796 GJ/t × 0.11 tCO₂/GJ","蒸汽 外购蒸汽"],
  ["热力","外购冷量（电制冷）",0.0000449,"MJ","2","全国",2022,"按 COP 3.5 × 全国电网因子折算","冷量 冷冻水"],
  ["移动源","车用汽油",0.0021354,"L","1","全国",2015,"国家核算指南 · 密度 0.73 kg/L","汽油 公务车 车辆"],
  ["移动源","车用柴油",0.0026006,"L","1","全国",2015,"国家核算指南 · 密度 0.84 kg/L","柴油 叉车 货车 发电机"],
  ["移动源","车用液化天然气（LNG）",0.0027566,"kg","1","全国",2015,"国家核算指南缺省参数","LNG 重卡"],
  ["移动源","车用压缩天然气（CNG）",0.0021622,"Nm³","1","全国",2015,"国家核算指南缺省参数","CNG 天然气汽车"],
  ["移动源","航空煤油",3.1500,"t","1","全国",2015,"国家核算指南缺省参数","航煤 公务机"],
  ["工业过程","石灰石（CaCO₃）分解",0.440,"t","1","全国",2015,"化学计量法 44/100","石灰石 碳酸钙 脱硫"],
  ["工业过程","白云石分解",0.477,"t","1","全国",2015,"化学计量法","白云石"],
  ["工业过程","纯碱（Na₂CO₃）使用",0.415,"t","1","全国",2015,"化学计量法 44/106","纯碱 碳酸钠"],
  ["工业过程","焊接保护气 CO₂ 使用",1.000,"t","1","全国",2015,"直接排放","焊接 二氧化碳 保护气"],
  ["工业过程","乙炔切割",3.385,"t","1","全国",2015,"化学计量法 88/26","乙炔 切割"],
  ["工业过程","脱硫石灰石（湿法脱硫）",0.440,"t","1","全国",2022,"《企业温室气体排放核算与报告指南 发电设施》","脱硫 石灰石 电厂"],
  ["原材料","粗钢（高炉-转炉长流程）",2.10,"t","3","全国",2023,"世界钢铁协会《2023 可持续发展指标》","钢 粗钢 钢材"],
  ["原材料","粗钢（电炉短流程）",0.68,"t","3","全国",2023,"世界钢铁协会《2023 可持续发展指标》","电炉钢 短流程 再生钢"],
  ["原材料","热轧板卷",2.25,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","热轧 钢板 钢材"],
  ["原材料","冷轧板",2.40,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","冷轧 钢板"],
  ["原材料","镀锌板",2.55,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","镀锌 钢板"],
  ["原材料","不锈钢 304",4.80,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","不锈钢 304"],
  ["原材料","球墨铸铁件",2.10,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","球铁 铸件"],
  ["原材料","铸钢件",2.30,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","铸钢 铸件"],
  ["原材料","再生铝",0.60,"t","3","全国",2022,"国际铝业协会","再生铝 铝"],
  ["原材料","铝型材",17.20,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","铝型材 挤压"],
  ["原材料","电解铜",3.80,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","铜 电解铜 阴极铜"],
  ["原材料","黄铜棒",3.20,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","黄铜"],
  ["原材料","锌锭",3.10,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","锌 镀锌"],
  ["原材料","电解镍",13.0,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","镍"],
  ["原材料","通用硅酸盐水泥 P.O 42.5",0.58,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","水泥"],
  ["原材料","商品混凝土 C30",0.30,"m³","3","全国",2022,"中国产品全生命周期温室气体排放系数库","混凝土"],
  ["原材料","平板玻璃",0.95,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","玻璃"],
  ["原材料","高密度聚乙烯 HDPE",1.95,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","PE 聚乙烯 塑料"],
  ["原材料","聚丙烯 PP",1.70,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","PP 聚丙烯 塑料"],
  ["原材料","聚氯乙烯 PVC",2.10,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","PVC 塑料"],
  ["原材料","尼龙 PA66",7.90,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","尼龙 PA66 工程塑料"],
  ["原材料","聚碳酸酯 PC",4.30,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","PC 工程塑料"],
  ["原材料","环氧树脂",6.00,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","环氧 绝缘 浸漆"],
  ["原材料","合成橡胶（丁腈）",2.90,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","橡胶 密封圈 丁腈"],
  ["原材料","白板纸",1.20,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","纸 包装"],
  ["原材料","木托盘",0.31,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库（不含生物碳）","木托 托盘 包装"],
  ["原材料","润滑油",1.20,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","润滑油 液压油"],
  ["原材料","溶剂型工业涂料",3.50,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","油漆 涂料"],
  ["原材料","水性工业涂料",2.40,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","水性漆 涂料"],
  ["原材料","自来水",0.000168,"t","3","全国",2022,"中国城镇供水行业平均","自来水 用水"],
  ["运输","公路货运（中型柴油货车）",0.000135,"t·km","3","全国",2022,"交通运输行业排放因子","公路运输 中型货车"],
  ["运输","公路货运（轻型柴油货车）",0.00021,"t·km","3","全国",2022,"交通运输行业排放因子","公路运输 轻卡"],
  ["运输","公路冷链运输",0.00012,"t·km","3","全国",2022,"交通运输行业排放因子","冷链 冷藏车"],
  ["运输","铁路货运（电力牵引）",0.0000085,"t·km","3","全国",2022,"交通运输行业排放因子","铁路 电力机车"],
  ["运输","沿海货运",0.0000088,"t·km","3","全国",2022,"交通运输行业排放因子","沿海 船舶 海运"],
  ["运输","远洋集装箱运输",0.0000082,"t·km","3","全球",2022,"GLEC Framework v3","远洋 海运 集装箱 出口"],
  ["运输","航空货运（国内）",0.00098,"t·km","3","全国",2022,"民航行业排放因子","航空 空运 货运"],
  ["运输","管道运输",0.000005,"t·km","3","全国",2022,"交通运输行业排放因子","管道"],
  ["差旅通勤","国内航空（经济舱）",0.000125,"人·km","3","全国",2022,"民航行业排放因子","航空 机票 差旅"],
  ["差旅通勤","国际航空（经济舱）",0.000105,"人·km","3","全球",2023,"DEFRA 2023","国际航班 差旅"],
  ["差旅通勤","高速铁路",0.000025,"人·km","3","全国",2022,"国铁集团能耗统计折算","高铁 动车 差旅"],
  ["差旅通勤","普速列车",0.000035,"人·km","3","全国",2022,"国铁集团能耗统计折算","火车 列车"],
  ["差旅通勤","长途客车",0.000038,"人·km","3","全国",2022,"交通运输行业排放因子","大巴 客车"],
  ["差旅通勤","城市公交",0.00008,"人·km","3","全国",2022,"交通运输行业排放因子","公交 通勤"],
  ["差旅通勤","城市轨道交通",0.000035,"人·km","3","全国",2022,"交通运输行业排放因子","地铁 轨道交通 通勤"],
  ["差旅通勤","纯电动乘用车",0.000064,"人·km","3","全国",2022,"0.12 kWh/km × 全国电力平均因子","电动车 新能源车 通勤"],
  ["差旅通勤","出租车 / 网约车",0.00017,"人·km","3","全国",2022,"交通运输行业排放因子","出租车 网约车"],
  ["差旅通勤","酒店住宿",0.0213,"间·夜","3","全国",2023,"Cornell Hotel Sustainability Benchmarking 2023（中国）","酒店 住宿 差旅"],
  ["废弃物","生活垃圾填埋",0.58,"t","3","全国",2019,"IPCC 2019 修订版","生活垃圾 填埋"],
  ["废弃物","生活垃圾焚烧",0.41,"t","3","全国",2019,"IPCC 2019 修订版","焚烧 生活垃圾"],
  ["废弃物","危险废物焚烧",1.10,"t","3","全国",2019,"IPCC 2019 修订版","危废 焚烧"],
  ["废弃物","废金属回收（处理过程）",0.12,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","废金属 回收"],
  ["废弃物","废纸回收",0.02,"t","3","全国",2022,"中国产品全生命周期温室气体排放系数库","废纸 回收"],
  ["废弃物","有机废弃物堆肥",0.17,"t","3","全国",2019,"IPCC 2019 修订版","堆肥 餐厨"],
  ["废弃物","工业废水处理",0.00045,"t","3","全国",2019,"IPCC 2019 修订版 · COD 法","废水 污水"],
  ["废弃物","生活污水处理",0.00023,"t","3","全国",2019,"IPCC 2019 修订版","生活污水"]
];
const EEIO_ROWS = [
  // 行业（国民经济行业分类）, 代码, tCO₂e/万元, 典型采购
  ["农林牧渔业","A",1.10,"农副产品"],["煤炭开采和洗选业","06",1.60,"原煤"],["石油和天然气开采业","07",1.30,"原油"],["黑色金属矿采选业","08",1.20,"铁矿石"],
  ["非金属矿采选业","10",1.40,"砂石"],["食品制造业","14",0.80,"食堂食材"],["纺织业","17",0.90,"劳保纺织品"],["纺织服装、服饰业","18",0.55,"工作服"],
  ["皮革、毛皮及其制品","19",0.60,"劳保鞋"],["木材加工和木制品业","20",0.85,"木箱、木托"],["家具制造业","21",0.70,"办公家具"],["造纸和纸制品业","22",1.42,"纸箱、包装"],
  ["印刷和记录媒介复制业","23",0.90,"印刷品、标签"],["文教、工美、体育用品","24",0.55,"办公用品"],["石油、煤炭及其他燃料加工业","25",2.40,"润滑油、燃料"],
  ["化学原料和化学制品制造业","26",2.20,"涂料、化学品"],["医药制造业","27",0.60,"医疗物资"],["化学纤维制造业","28",1.60,"纤维材料"],["橡胶和塑料制品业","29",1.18,"密封件、塑料件"],
  ["非金属矿物制品业","30",3.10,"耐火材料、玻璃"],["黑色金属冶炼和压延加工业","31",3.80,"钢材"],["有色金属冶炼和压延加工业","32",2.90,"铜材、铝材"],
  ["金属制品业","33",1.05,"紧固件、机加工外协、轴承"],["通用设备制造业","34",0.62,"泵阀、压缩机、轴承"],["专用设备制造业","35",0.78,"专用设备"],
  ["汽车制造业","36",0.62,"车辆、零部件"],["铁路、船舶、航空航天设备","37",0.68,"运输设备"],["电气机械和器材制造业","38",0.74,"电机、电缆、开关"],
  ["计算机、通信和其他电子设备","39",0.45,"电子元器件、计算机"],["仪器仪表制造业","40",0.38,"仪表、传感器"],["废弃资源综合利用业","42",0.90,"再生料"],
  ["金属制品、机械和设备修理业","43",0.50,"设备维修"],["电力、热力生产和供应业","44",6.80,"外购电力（支出法）"],["燃气生产和供应业","45",2.00,"燃气（支出法）"],
  ["水的生产和供应业","46",0.60,"自来水"],["建筑业","E",0.95,"厂房改造、安装工程"],["批发和零售业","F",0.18,"商贸采购"],["交通运输、仓储和邮政业","G",1.05,"物流服务"],
  ["住宿和餐饮业","H",0.35,"差旅住宿、餐饮"],["信息传输、软件和信息技术服务业","I",0.12,"软件、云服务"],["金融业","J",0.05,"金融服务"],["房地产业","K",0.15,"物业、租赁"],
  ["租赁和商务服务业","L",0.21,"咨询、会展、外包"],["科学研究和技术服务业","M",0.25,"检测认证、研发外包"],["水利、环境和公共设施管理业","N",0.60,"环保服务"],
  ["居民服务、修理和其他服务业","O",0.25,"保洁、维修"],["教育","P",0.15,"培训"],["卫生和社会工作","Q",0.22,"体检"],["文化、体育和娱乐业","R",0.20,"团建、宣传"]
];
const FACTOR_VERSION = {lib:"2026.10",updated:"2026-10-31",eeio:"CEADs 2018 投入产出表 · 2023 价格平减 · V3.2"};
function fuelFactor(row){return +(row[1]*row[3]*row[4]*44/12/1000).toFixed(4);}
let FACTOR_LIBRARY = null;
function factorLibrary() {
  if(FACTOR_LIBRARY)return FACTOR_LIBRARY;
  const list=[];
  let seq=0;const id=prefix=>prefix+"-"+String(++seq).padStart(3,"0");
  FUEL_PARAMS.forEach(row=>list.push({id:id("FC"),category:"固定燃烧",name:row[0],value:fuelFactor(row),unit:row[5],scope:"1",region:"全国",year:2015,gas:"CO₂",
    source:"《工业其他行业企业温室气体排放核算方法与报告指南（试行）》附录二",version:"2015",params:{ncv:row[1]+" "+row[2],cc:row[3]+" tC/TJ",of:(row[4]*100)+"%"},keys:row[0]+" 燃烧 锅炉 燃料"}));
  GWP_TABLE.forEach(row=>[["AR4",row[1]],["AR5",row[2]],["AR6",row[3]]].forEach(([ar,gwp])=>list.push({id:id("GW"),category:"逸散 / GWP",name:row[0]+" 逸散（"+ar+"）",value:+(gwp/1000).toFixed(5),unit:"kg",scope:"1",region:"全球",
    year:{AR4:2007,AR5:2014,AR6:2021}[ar],gas:row[0].split("（")[0],source:"IPCC "+ar+" GWP100 = "+gwp,version:ar,params:{gwp,use:row[4]},keys:row[0]+" 制冷剂 逸散 "+row[4]})));
  LIB_ROWS.forEach(row=>list.push({id:id({"电力":"EL","热力":"HT","移动源":"MB","工业过程":"PR","原材料":"MT","运输":"TR","差旅通勤":"BT","废弃物":"WS"}[row[0]]),category:row[0],name:row[1],
    value:row[0]==="原材料"&&row[3]==="t"?row[2]:row[2],unit:row[3],scope:row[4],region:row[5],year:row[6],gas:"CO₂e",source:row[7],version:String(row[6]),keys:row[1]+" "+row[8]}));
  EEIO_ROWS.forEach(row=>list.push({id:id("IO"),category:"支出法（EEIO）",name:row[0],value:row[2],unit:"万元",scope:"3",region:"全国",year:2023,gas:"CO₂e",
    source:FACTOR_VERSION.eeio,version:"V3.2",params:{code:row[1],use:row[3]},keys:row[0]+" 支出法 采购 "+row[3]}));
  FACTOR_DB.forEach(row=>{if(!list.some(item=>item.name===row.name&&item.year===row.year&&Math.abs(item.value-row.value)<1e-9))
    list.push({id:row.id,category:{"1":"固定燃烧","2":"电力","3":"原材料"}[row.scope]||"其他",name:row.name,value:row.value,unit:row.unit,scope:row.scope,region:row.region,year:row.year,gas:"CO₂e",source:row.source,version:String(row.year),keys:row.keys,core:true});});
  list.forEach(row=>{if(row.category==="原材料"&&row.unit==="t"&&row.value>0.05)row.note="cradle-to-gate";});
  FACTOR_LIBRARY=list;
  // 并入智能匹配候选
  list.filter(row=>!row.core).forEach(row=>{if(!FACTOR_DB.some(item=>item.id===row.id))FACTOR_DB.push({id:row.id,name:row.name,keys:row.keys,value:row.value,unit:row.unit,region:row.region,year:row.year,source:row.source,scope:row.scope});});
  return list;
}
const FACTOR_CATS = ["固定燃烧","移动源","电力","热力","工业过程","逸散 / GWP","原材料","运输","差旅通勤","废弃物","支出法（EEIO）"];
let libFilter = {cat:"",scope:"",region:"",q:""};
function setLibFilter(key,value){libFilter[key]=value;render();}
function factorValueText(value){return value===0?"0":Math.abs(value)>=1?(+value.toFixed(4)).toString():(+Number(value).toPrecision(4)).toString();}
function publicFactorPage() {
  const all=factorLibrary();
  const list=all.filter(row=>(!libFilter.cat||row.category===libFilter.cat)&&(!libFilter.scope||row.scope===libFilter.scope)&&(!libFilter.region||row.region===libFilter.region)&&
    (!libFilter.q||[row.id,row.name,row.source,row.keys].join(" ").toLowerCase().includes(libFilter.q.toLowerCase())));
  const regions=[...new Set(all.map(row=>row.region))];
  const count=cat=>all.filter(row=>row.category===cat).length;
  return pageHead("公共因子库",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"基础配置 / 因子库管理 / 公共因子库")+
    '<div class="statRow five">'+statTile("因子总数",String(all.length),"条 · 版本 "+FACTOR_VERSION.lib)+statTile("范围一",String(all.filter(r=>r.scope==="1").length),"燃料、过程、逸散")+
      statTile("范围二",String(all.filter(r=>r.scope==="2").length),"电力、热力")+statTile("范围三",String(all.filter(r=>r.scope==="3").length),"材料、运输、废弃物、支出法")+statTile("最近更新",FACTOR_VERSION.updated,"")+'</div>'+
    '<div class="catTabs"><button class="'+(!libFilter.cat?'active':'')+'" onclick="setLibFilter(\'cat\',\'\')">全部 <em>'+all.length+'</em></button>'+FACTOR_CATS.map(cat=>'<button class="'+(libFilter.cat===cat?'active':'')+'" onclick="setLibFilter(\'cat\',\''+cat+'\')">'+cat+' <em>'+count(cat)+'</em></button>').join("")+'</div>'+
    '<div class="taskToolbar"><label>范围<select onchange="setLibFilter(\'scope\',this.value)"><option value="">全部</option>'+["1","2","3"].map(s=>'<option value="'+s+'" '+(libFilter.scope===s?'selected':'')+'>范围'+["","一","二","三"][s]+'</option>').join("")+'</select></label>'+
      '<label>地区<select onchange="setLibFilter(\'region\',this.value)"><option value="">全部</option>'+regions.map(r=>'<option '+(libFilter.region===r?'selected':'')+'>'+r+'</option>').join("")+'</select></label>'+
      '<label class="taskSearch">查找<input id="libSearch" value="'+textHtml(libFilter.q)+'" placeholder="名称、编号、来源" onkeydown="if(event.key===\'Enter\')setLibFilter(\'q\',this.value)"></label><button class="btn" onclick="setLibFilter(\'q\',document.getElementById(\'libSearch\').value)">查询</button><span>'+list.length+' 条</span></div>'+
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>编号</th><th>分类</th><th>名称</th><th>因子值</th><th>单位</th><th>范围</th><th>地区</th><th>年份</th><th>来源</th><th></th></tr></thead><tbody>'+
      (list.length?list.map(row=>'<tr><td>'+row.id+'</td><td>'+textHtml(row.category)+'</td><td><strong>'+textHtml(row.name)+'</strong>'+(row.params?.use?'<small>'+textHtml(row.params.use)+'</small>':'')+'</td><td>'+factorValueText(row.value)+'</td><td>tCO₂e/'+textHtml(row.unit)+'</td><td>范围'+row.scope+'</td><td>'+textHtml(row.region)+'</td><td>'+row.year+'</td><td class="srcCell">'+textHtml(row.source)+'</td>'+
        '<td><button class="btn" onclick="openLibFactor(\''+row.id+'\')">详情</button></td></tr>').join(""):'<tr><td colspan="10" class="emptyCell">没有符合条件的因子</td></tr>')+
    '</tbody></table></div></section>';
}
function openLibFactor(id) {
  const row=factorLibrary().find(item=>item.id===id);if(!row)return;
  const used=workflowTasks().filter(task=>Math.abs(Number(task.factor)-row.value)<1e-9&&row.value>0);
  const params=row.params&&row.params.ncv?'<div><dt>低位发热量</dt><dd>'+row.params.ncv+'</dd></div><div><dt>单位热值含碳量</dt><dd>'+row.params.cc+'</dd></div><div><dt>碳氧化率</dt><dd>'+row.params.of+'</dd></div>'+
    '<div class="wide"><dt>计算式</dt><dd>EF = NCV × CC × OF × 44/12 = '+factorValueText(row.value)+' tCO₂/'+row.unit+'</dd></div>':row.params&&row.params.gwp?'<div><dt>GWP100</dt><dd>'+row.params.gwp+'</dd></div><div><dt>常见用途</dt><dd>'+textHtml(row.params.use)+'</dd></div>':
    row.params&&row.params.code?'<div><dt>行业代码</dt><dd>'+row.params.code+'</dd></div><div><dt>典型采购</dt><dd>'+textHtml(row.params.use)+'</dd></div>':'';
  openModal('<h2>'+textHtml(row.name)+'</h2><dl class="detailList">'+
    '<div><dt>编号</dt><dd>'+row.id+'</dd></div><div><dt>分类</dt><dd>'+textHtml(row.category)+'</dd></div><div><dt>因子值</dt><dd><b>'+factorValueText(row.value)+'</b> tCO₂e/'+textHtml(row.unit)+'</dd></div>'+
    '<div><dt>适用范围</dt><dd>范围'+["","一","二","三"][row.scope]+' · '+textHtml(row.region)+'</dd></div><div><dt>数据年份</dt><dd>'+row.year+'</dd></div><div><dt>版本</dt><dd>'+textHtml(row.version)+'</dd></div>'+
    '<div><dt>来源</dt><dd>'+textHtml(row.source)+'</dd></div>'+params+
    '<div><dt>在用排放源</dt><dd>'+(used.length?used.map(task=>textHtml(task.name)+'（'+task.id+'）').join("、"):'—')+'</dd></div></dl>'+
    '<div class="modalActions"><button class="btn primary" data-close-modal="1">关闭</button></div>');
}

// ---------- 兜底因子库 ----------
let fallbackTab = "eeio";
function fallbackFactorPage() {
  const lines=typeof procurementLines==="function"?procurementLines():[];
  const usedBy=name=>lines.filter(line=>line.tier>1&&line.factorRef&&line.factorRef.name&&(line.factorRef.name.includes(name)||name.includes(line.factorRef.name.replace(/（支出法）/,""))));
  const materials=factorLibrary().filter(row=>row.category==="原材料"||row.core&&row.scope==="3"&&row.unit!=="万元");
  const eeio=factorLibrary().filter(row=>row.category==="支出法（EEIO）");
  const tabs='<div class="catTabs"><button class="'+(fallbackTab==="eeio"?'active':'')+'" onclick="fallbackTab=\'eeio\';render()">支出法因子（按行业） <em>'+eeio.length+'</em></button>'+
    '<button class="'+(fallbackTab==="avg"?'active':'')+'" onclick="fallbackTab=\'avg\';render()">行业平均因子（按物料） <em>'+materials.length+'</em></button>'+
    '<button class="'+(fallbackTab==="rule"?'active':'')+'" onclick="fallbackTab=\'rule\';render()">适用规则</button></div>';
  const body=fallbackTab==="eeio"?
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>编号</th><th>行业</th><th>行业代码</th><th>因子（tCO₂e/万元）</th><th>典型采购</th><th>在用</th><th>来源</th></tr></thead><tbody>'+
      eeio.map(row=>{const used=lines.filter(line=>line.tier===3&&line.factorRef&&(line.factorRef.value===row.value));return '<tr><td>'+row.id+'</td><td><strong>'+textHtml(row.name)+'</strong></td><td>'+row.params.code+'</td><td>'+row.value.toFixed(2)+'</td><td>'+textHtml(row.params.use)+'</td><td>'+(used.length?used.length+' 条采购':'—')+'</td><td class="srcCell">'+textHtml(row.source)+'</td></tr>';}).join("")+'</tbody></table></div></section>':
    fallbackTab==="avg"?
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>编号</th><th>物料</th><th>因子</th><th>单位</th><th>边界</th><th>年份</th><th>来源</th></tr></thead><tbody>'+
      materials.map(row=>'<tr><td>'+row.id+'</td><td><strong>'+textHtml(row.name)+'</strong></td><td>'+factorValueText(row.value)+'</td><td>tCO₂e/'+textHtml(row.unit)+'</td><td>从摇篮到大门</td><td>'+row.year+'</td><td class="srcCell">'+textHtml(row.source)+'</td></tr>').join("")+'</tbody></table></div></section>':
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>数据等级</th><th>条件</th><th>计算方法</th><th>因子来源</th><th>不确定性</th></tr></thead><tbody>'+
      '<tr><td><span class="status ok">一级</span></td><td>供应商提交并经审核的产品碳足迹或工艺数据</td><td>采购量 × 供应商单位碳排</td><td>供应商协同任务</td><td>±5%</td></tr>'+
      '<tr><td><span class="status warn">二级</span></td><td>有采购实物量，无供应商一手数据</td><td>采购量 × 行业平均因子</td><td>行业平均因子（按物料）</td><td>±20%</td></tr>'+
      '<tr><td><span class="status bad">三级</span></td><td>仅有采购金额</td><td>采购金额（不含税，万元）× 支出法因子</td><td>支出法因子（按行业）</td><td>±50%</td></tr>'+
    '</tbody></table></div></section>';
  return pageHead("兜底因子库",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]]),"基础配置 / 因子库管理 / 兜底因子库")+
    '<div class="statRow">'+statTile("支出法因子",String(eeio.length),"个行业 · "+FACTOR_VERSION.eeio.split(" · ")[0])+statTile("行业平均因子",String(materials.length),"种物料")+
      statTile("在用兜底采购",String(lines.filter(line=>line.tier>1).length),"条采购台账")+statTile("兜底排放",fmt(lines.filter(line=>line.tier>1).reduce((sum,line)=>sum+(line.emission||0),0),0),"tCO₂e")+'</div>'+tabs+body;
}

MENUS["基础配置"]["因子库管理"]=["公共因子库","企业私域因子库","兜底因子库","供应链因子导入","因子智能匹配"];
const renderBeforeFactorLib = render;
render = function () {
  renderBeforeFactorLib();
  if(!backendState.ready)return;
  const content=document.getElementById("content");
  if(state.top==="基础配置"&&state.page==="公共因子库")content.innerHTML=publicFactorPage();
  else if(state.top==="基础配置"&&state.page==="兜底因子库")content.innerHTML=fallbackFactorPage();
};

// 采购台账：间接采购与服务按支出法匹配行业因子
factorLibrary();
function ioId(industry){const row=FACTOR_LIBRARY.find(item=>item.category==="支出法（EEIO）"&&item.name===industry);return row?row.id:"EF-S01";}
[
  ["PO-10","大庆石油管道防腐有限公司","管道防腐补口工程","C01",86000,"建筑业"],
  ["PO-11","华北油田技术服务公司","测井、录井技术服务","C01",168000,"石油和天然气开采业"],
  ["PO-12","渤海压裂服务有限公司","压裂酸化作业服务","C01",236000,"石油和天然气开采业"],
  ["PO-13","东方陶粒支撑剂有限公司","陶粒支撑剂","C01",48000,"非金属矿物制品业"],
  ["PO-14","西南防爆电气有限公司","防爆电机及开关","C01",36000,"电气机械和器材制造业"],
  ["PO-15","北方电缆集团","动力电缆、控制电缆","C01",29000,"电气机械和器材制造业"],
  ["PO-16","华控自动化有限公司","DCS / SIS 控制系统","C01",26000,"计算机、通信和其他电子设备"],
  ["PO-17","川北仪表有限公司","流量计、分析仪表","C01",18000,"仪器仪表制造业"],
  ["PO-18","东海防腐涂料有限公司","储罐防腐涂料","C01",22000,"化学原料和化学制品制造业"],
  ["PO-19","辽河化工助剂有限公司","破乳剂、降凝剂","C01",34000,"化学原料和化学制品制造业"],
  ["PO-20","中州耐火材料有限公司","加热炉耐火衬里","C01",12000,"非金属矿物制品业"],
  ["PO-21","北方劳保用品有限公司","防静电工作服、劳保鞋","C01",28000,"纺织服装、服饰业"],
  ["PO-22","京华印务有限公司","票据、标签印刷","C01",3200,"印刷和记录媒介复制业"],
  ["PO-23","渤海木业包装有限公司","润滑油木托盘","C01",4100,"木材加工和木制品业"],
  ["PO-24","晨光文具办公","办公用品","C01",5600,"文教、工美、体育用品"],
  ["PO-25","中油餐饮服务公司","员工食堂食材","C01",42000,"食品制造业"],
  ["PO-26","地方水务集团（合并）","生产及生活用水","C01",68000,"水的生产和供应业"],
  ["PO-27","云景信息技术有限公司","云服务、软件订阅","C01",38000,"信息传输、软件和信息技术服务业"],
  ["PO-28","国检认证检测中心","油品检测、计量检定","C01",16000,"科学研究和技术服务业"],
  ["PO-29","德勤咨询","管理咨询服务","C01",6800,"租赁和商务服务业"],
  ["PO-30","北辰物业服务公司","办公区物业、保洁","C01",31000,"居民服务、修理和其他服务业"],
  ["PO-31","华东石化设备检修公司","装置大检修外委","C01",92000,"金属制品、机械和设备修理业"],
  ["PO-32","滨海环境科技有限公司","危废处置、环保服务","C01",24000,"水利、环境和公共设施管理业"],
  ["PO-33","中石工程建设有限公司","乙烯改扩建 EPC 工程","C02",1680000,"建筑业"],
  ["PO-34","大连重型装备有限公司","加氢反应器","C02",126000,"通用设备制造业"],
  ["PO-35","沈阳透平机械有限公司","离心压缩机组","C02",98000,"专用设备制造业"],
  ["PO-36","重型汽车集团","油罐车、作业车辆","C02",64000,"汽车制造业"],
  ["PO-37","中科算力科技","服务器、存储","C02",21000,"计算机、通信和其他电子设备"],
  ["PO-38","中铁物流有限公司","成品油铁路运输","C04",420000,"交通运输、仓储和邮政业"],
  ["PO-39","华运危险品运输公司","LNG 槽车运输","C04",86000,"交通运输、仓储和邮政业"],
  ["PO-40","大连港油品码头公司","原油接卸、仓储","C04",52000,"交通运输、仓储和邮政业"]
].forEach(([id,supplier,item,category,spend,industry])=>{if(!PROCUREMENT.some(row=>row.id===id))PROCUREMENT.push({id,supplier,item,category,spend,eeio:ioId(industry)});});

// 企业私域因子库：实测与企业特定因子
function privateFactorList() {
  const list=[];let seq=0;const id=()=> "PF-"+String(++seq).padStart(3,"0");
  const yr=CURRENT_YEAR,prev=yr-1,months=(ets().monthly[yr]||[]).filter(row=>row.status==="已存证");
  const coalEf=row=>+(row.ncv*row.cc*0.98*44/12).toFixed(4);
  const prevRows=ets().monthly[prev]||[];
  const wavg=rows=>{const c=rows.reduce((s,r)=>s+r.coal,0);return c?+(rows.reduce((s,r)=>s+coalEf(r)*r.coal,0)/c).toFixed(4):0;};
  list.push({id:id(),cat:"固定燃烧",name:"入炉烟煤（"+prev+" 年加权实测）",value:wavg(prevRows),unit:"tCO₂/t",site:"滨海石化热电厂",basis:"GB/T 213 逐月检测 · 核查报告 "+(ets().cycles[prev]?.report?.verifyNo||""),valid:prev+" 年度",status:"已核查"});
  months.slice().reverse().forEach(row=>list.push({id:id(),cat:"固定燃烧",name:"入炉烟煤（"+yr+" 年 "+row.month+" 月实测）",value:coalEf(row),unit:"tCO₂/t",site:"滨海石化热电厂",
    basis:"低位发热量 "+row.ncv+" GJ/t × 单位热值含碳量 "+row.cc+" tC/GJ × 氧化率 0.98 · "+row.evidence,valid:yr+"-"+String(row.month).padStart(2,"0"),status:"已存证"}));
  const sums=etsSums(prevRows);
  if(sums.supply){const share=sums.supply*3.6/(sums.supply*3.6+sums.heat);
    list.push({id:id(),cat:"热电联产",name:"自产电力排放因子",value:+(sums.emission*share/sums.supply).toFixed(4),unit:"tCO₂/MWh",site:"滨海石化热电厂",basis:"热电联产按热量法分摊（"+prev+" 年核查数据）",valid:prev+" 年度",status:"已核查"});
    list.push({id:id(),cat:"热电联产",name:"自产蒸汽排放因子",value:+(sums.emission*(1-share)/sums.heat).toFixed(4),unit:"tCO₂/GJ",site:"滨海石化热电厂 → 滨海石化分公司",basis:"热电联产按热量法分摊（"+prev+" 年核查数据）",valid:prev+" 年度",status:"已核查"});}
  [["固定燃烧","炼厂干气（滨海石化 2026 年加权实测）",2.8922,"tCO₂/t","滨海石化分公司","月度组分分析 NCV 45.92 GJ/t × CC 0.01735 tC/GJ × OF 0.99",yr+" 年度","启用"],
   ["固定燃烧","炼厂干气（陇原石化 2026 年加权实测）",2.8935,"tCO₂/t","陇原石化分公司","月度组分分析 NCV 45.60 GJ/t × CC 0.01748 tC/GJ",yr+" 年度","启用"],
   ["固定燃烧","甲烷氢（天山石化乙烯装置副产）",2.7524,"tCO₂/t","天山石化分公司","组分分析 NCV 51.86 GJ/t × CC 0.01462 tC/GJ",yr+" 年度","启用"],
   ["工业过程","催化裂化焦炭含碳量（Ⅰ、Ⅱ套）",0.932,"tC/t","滨海石化分公司","待生剂 / 再生剂碳含量月度分析",yr+" 年度","启用"],
   ["工业过程","制氢原料天然气含碳量",0.742,"tC/t","滨海石化分公司","原料气色谱分析",yr+" 年度","启用"],
   ["火炬燃烧","高压火炬气非 CO₂ 含碳量",5.62,"tC/万Nm³","滨海石化分公司","火炬气组分季度分析",yr+" 年度","启用"],
   ["逸散","油井井口装置 CH₄ 逃逸因子",0.23,"tCH₄/(口·a)","松原油田分公司","2025 年 LDAR 检测 3,200 口抽样核定",yr+" 年度","启用"],
   ["逸散","压气站 CH₄ 逃逸因子",28.5,"tCH₄/(座·a)","西部管道分公司","2025 年 LDAR 检测 + 红外成像",yr+" 年度","启用"],
   ["工业过程","含 CO₂ 天然气原料气 CO₂ 体积分数",0.226,"比例","松原油田分公司","处理厂入口在线色谱",yr+" 年度","启用"],
   ["电力","加油站分布式光伏（自发自用）",0,"tCO₂/MWh","华北销售分公司","1,120 座加油站屋顶光伏 · 关口表计量",yr+" 年度","启用"]
  ].forEach(r=>list.push({id:id(),cat:r[0],name:r[1],value:r[2],unit:r[3],site:r[4],basis:r[5],valid:r[6],status:r[7]}));
  const backend=(backendState.data?.factors||[]).filter(f=>f.source_type==="企业私域因子库");
  backend.forEach(f=>list.push({id:"PF-B"+f.id,cat:"供应商导入",name:f.name,value:f.factor_value,unit:"tCO₂e/"+f.unit,site:"采购中心",basis:"供应链因子导入",valid:(f.year||yr)+" 年度",status:"启用"}));
  return list;
}
let privFilter={cat:"",q:""};
function privateFactorPage() {
  const all=privateFactorList(),cats=[...new Set(all.map(r=>r.cat))];
  const rows=all.filter(r=>(!privFilter.cat||r.cat===privFilter.cat)&&(!privFilter.q||[r.id,r.name,r.site,r.basis].join(" ").includes(privFilter.q)));
  return pageHead("企业私域因子库",exportMenu("exportPageTables",[["xlsx","Excel"],["csv","CSV"]])+'<button class="btn primary" onclick="openFactorModal(\'企业私域因子库\')">新增因子</button>',"基础配置 / 因子库管理 / 企业私域因子库")+
    '<div class="catTabs"><button class="'+(!privFilter.cat?'active':'')+'" onclick="privFilter.cat=\'\';render()">全部<em>'+all.length+'</em></button>'+cats.map(cat=>'<button class="'+(privFilter.cat===cat?'active':'')+'" onclick="privFilter.cat=\''+cat+'\';render()">'+cat+'<em>'+all.filter(r=>r.cat===cat).length+'</em></button>').join("")+'</div>'+
    '<div class="taskToolbar"><label class="taskSearch">查找<input id="privQ" value="'+textHtml(privFilter.q)+'" placeholder="名称、设施、依据" onkeydown="if(event.key===\'Enter\'){privFilter.q=this.value;render();}"></label><button class="btn" onclick="privFilter.q=document.getElementById(\'privQ\').value;render()">查询</button><span>'+rows.length+' 条</span></div>'+
    '<section class="panel"><div class="tableWrap"><table><thead><tr><th>编号</th><th>分类</th><th>因子名称</th><th>因子值</th><th>单位</th><th>适用设施</th><th>测定依据</th><th>有效期</th><th>状态</th></tr></thead><tbody>'+
    (rows.length?rows.map(r=>'<tr><td>'+r.id+'</td><td>'+r.cat+'</td><td><strong>'+textHtml(r.name)+'</strong></td><td>'+r.value+'</td><td>'+textHtml(r.unit)+'</td><td>'+textHtml(r.site)+'</td><td class="srcCell">'+textHtml(r.basis)+'</td><td>'+r.valid+'</td><td><span class="status '+(r.status==="启用"?'ok':r.status==="已核查"?'ok':'warn')+'">'+r.status+'</span></td></tr>').join(""):'<tr><td colspan="9" class="emptyCell">没有符合条件的因子</td></tr>')+
    '</tbody></table></div></section>';
}
const renderBeforePrivate = render;
render = function () {
  renderBeforePrivate();
  if(backendState.ready&&state.top==="基础配置"&&state.page==="企业私域因子库")document.getElementById("content").innerHTML=privateFactorPage();
};
