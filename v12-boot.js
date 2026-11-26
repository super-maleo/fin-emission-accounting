// v12：页面路由、外壳、样式。最后加载。

const V12_PAGES = {
  "首页|首页总览":()=>home(),
  "组织碳排放|组织碳看板":()=>v12OrgDashboard(),
  "组织碳排放|碳目标管理|目标设置":()=>v12TargetSetup(),
  "组织碳排放|碳目标管理|目标跟踪":()=>v12TargetTrack(),
  "组织碳排放|填报与审核|填报任务":()=>v12TaskList(),
  "组织碳排放|填报与审核|审核任务":()=>v12ReviewList(),
  "组织碳排放|盘查准备|核算边界":()=>v12BoundaryPage(),
  "组织碳排放|碳核算|碳台账":()=>v12Ledger(),
  "组织碳排放|碳核算|数据校验":()=>v12CheckPage(),
  "组织碳排放|碳盘查报告":()=>v12OrgReport()
};
Object.assign(V12_PAGES,V12_PAGES_EXTRA);
// 沿用既有实现的页面：映射到原菜单位置后调用原渲染
const V12_LEGACY = {
  "组织碳排放|盘查准备|排放源":{top:"组织碳排放",group:"盘查准备",page:"排放源"},
  "基础配置|因子库管理|公共因子库":{top:"基础配置",group:"因子库管理",page:"公共因子库"},
  "基础配置|因子库管理|兜底因子库":{top:"基础配置",group:"因子库管理",page:"兜底因子库"},
  "基础配置|系统设置|字典单位":{top:"基础配置",group:"系统设置",page:"字典单位"},
  "帮助中心|常见问题":{top:"帮助中心",group:"常见问题",page:"常见问题"},
  "帮助中心|用户手册":{top:"帮助中心",group:"用户手册",page:"用户手册"},
  "帮助中心|行业标准参考":{top:"帮助中心",group:"行业标准参考",page:"行业标准参考"}
};
const V12_LEGACY_MENUS = {
  "组织碳排放":{"组织碳看板":[],"碳目标管理":["目标设定","目标分解","目标跟踪"],"数据填报":["填报任务","审核队列"],"凭证管理":[],"盘查准备":["组织架构","核算边界","排放源","能源转供"],"核算分析":["行业核算明细","排放清单","重复计算剔除","数据交叉核对","异常数据"],"报告中心":["组织排放报告","范围三专项报告"]},
  "基础配置":{"因子库管理":["公共因子库","企业私域因子库","兜底因子库","供应链因子导入","因子智能匹配"],"指标模板配置":["填报因子","填报指标","填报模板","碳排放公式"],"系统设置":["组织权限","用户角色","审批流程","字典单位"]},
  "供应链碳排放":{"供应链看板":[],"供应商管理":[],"供应商协同任务":[],"供应链因子中心":[],"供应链分析与报告":[]},
  "产品碳排放":{"产品碳足迹看板":[],"LCA建模与核算":["模型库","PCR 库","建模说明","系统边界/算法说明"],"产品数据管理":["产品信息","BOM/物料清单","零部件碳排数据","额外活动因子库"],"产品碳足迹分析":["分布概览","数据质量评估清单"],"产品报告中心":["数据质量分析报告","碳足迹评价报告"],"碳足迹认证管理":[]},
  "帮助中心":{"常见问题":[],"用户手册":[],"行业标准参考":[]}
};
const v12RenderLegacy = render;
function v12RunLegacy(target) {
  const saved={...state},savedMenus={};
  Object.keys(V12_LEGACY_MENUS).forEach(k=>{savedMenus[k]=MENUS[k];MENUS[k]=V12_LEGACY_MENUS[k];});
  const savedRole=currentRole;
  Object.assign(state,target);
  try{v12RenderLegacy();}catch(error){console.error(error);}
  Object.assign(state,saved);
  Object.keys(savedMenus).forEach(k=>MENUS[k]=savedMenus[k]);
  currentRole=savedRole;
  const content=document.getElementById("content");
  const crumb=content.querySelector(".breadcrumb");
  if(crumb)crumb.textContent=[state.top,state.group,state.page!==state.group?state.page:""].filter(Boolean).join(" / ");
}
render = function () {
  const content=document.getElementById("content");
  const k3=state.top+"|"+state.group+"|"+state.page,k2=state.top+"|"+state.group;
  const fn=V12_PAGES[k3]||V12_PAGES[k2];
  const legacy=V12_LEGACY[k3]||V12_LEGACY[k2];
  if(fn) {
    if(!backendState.ready){content.innerHTML='<div class="emptyState">正在加载数据…</div>';v12Chrome();return;}
    if(backendState.ready)try{yearArchive();}catch{}
    let html="";
    try{html=withYearCalculation(fn);}catch(error){console.error(error);html=v12Empty("页面加载失败："+v12H(error.message));}
    const yearScoped=["首页","组织碳排放","供应链碳排放"].includes(state.top);
    if(isHistoryYear()&&yearScoped)html=historyBanner()+html;
    content.innerHTML=html;
  } else if(legacy) {
    v12RunLegacy(legacy);
  } else {
    content.innerHTML=v12Empty("页面不存在");
  }
  v12Chrome();
  try{applyPagers();}catch(error){console.error(error);}
  v12AfterRender();
};
function v12AfterRender() {
  const content=document.getElementById("content");
  content.querySelectorAll(".v12Scroll table").forEach(t=>t.setAttribute("data-nopage",""));
}
// 年度切换后保持当前页
setReportYear = (function(base){return function(value){base(value);};})(setReportYear);

(function v12Style(){
  const css=`
.v12Hello{margin:4px 0 16px}.v12Hello h1{margin:0 0 4px;font-size:22px}.v12Hello p{margin:0;color:var(--sub);font-size:13px}
.v12HomeGrid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;margin-bottom:16px;align-items:stretch}.v12HomeGrid.one{grid-template-columns:1fr}
.v12HomeGrid>.panel{display:flex;flex-direction:column}
.panelHead h3 small{font-weight:400;color:var(--sub);font-size:12px;margin-left:4px}.panelTools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.v12Goals{display:grid;gap:10px}.v12Goal{display:grid;gap:8px;text-align:left;border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px 14px;cursor:pointer;font:inherit}
.v12Goal:hover{border-color:#B9DB86}.v12Goal .h{display:flex;justify-content:space-between;align-items:center;gap:8px}.v12Goal .h b{font-size:14px}
.v12Goal .bar{position:relative;height:10px;background:#EEF2F6;border-radius:5px}.v12Goal .bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#86BC25,#26890D)}
.v12Goal .bar em{position:absolute;top:-4px;width:2px;height:18px;background:#D92D20}.v12Goal .f{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--sub);flex-wrap:wrap}
.v12Counts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.v12Counts.wide{grid-template-columns:repeat(5,1fr);margin-bottom:14px}
.v12Counts>div,.v12Counts>button{border:1px solid var(--line);border-radius:8px;padding:10px;text-align:center;background:#fff;font:inherit;cursor:default}.v12Counts>button{cursor:pointer}
.v12Counts b{display:block;font-size:22px;line-height:1.2}.v12Counts span{font-size:12px;color:var(--sub)}.v12Counts .warn b{color:#B54708}.v12Counts .bad b{color:#D92D20}.v12Counts .ok b{color:#26890D}
.v12Counts>button.active{border-color:#86BC25;background:#F6FAEF}
.v12EtsMini{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}.v12EtsMini .days{background:#F6FAEF;border-radius:8px;padding:14px;display:flex;gap:8px;align-items:center}
.v12EtsMini .days b{font-size:34px;color:#26890D}.v12EtsMini .days span{font-size:12px;color:var(--sub);line-height:1.5}
.v12EtsMini dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0}.v12EtsMini dt{font-size:12px;color:var(--sub)}.v12EtsMini dd{margin:2px 0 0;font-weight:700}
.v12EtsMini .st{grid-column:1/-1;display:flex;gap:10px;align-items:center}.v12EtsMini .st small{color:var(--sub);font-size:12px}
.v12OrgProg{display:grid;gap:10px}.v12OrgProg>div{display:grid;grid-template-columns:1fr 160px 40px;gap:10px;align-items:center}.v12OrgProg small{display:block;color:var(--sub);font-size:12px}
.v12Prog{display:inline-block;height:8px;border-radius:4px;background:#EEF2F6;overflow:hidden;min-width:80px;width:100%;vertical-align:middle}.v12Prog i{display:block;height:100%;background:#86BC25}.v12Prog.bad i{background:#F97066}
.v12ProgT{font-size:12px;color:var(--sub);margin-left:6px}.v12Inline{display:flex;gap:8px;align-items:center}.v12Inline .v12Prog{width:90px;min-width:90px}
.v12Grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:16px}.v12Grid2.a{grid-template-columns:minmax(0,0.9fr) minmax(0,1.3fr)}
.v12Grid2>.panel{margin:0;display:flex;flex-direction:column}.v12Grid2>.panel>.panelHead+*{margin-top:auto}.v12Grid2>.panel>:last-child{margin-bottom:auto}.v12Grid2.a2{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}.v12Grid2>.panel .v12Legend.cols{align-content:start;flex:none}.v12TrendTable{margin-top:12px}.v12FillTop{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}.v12FillTop .d{display:flex;gap:8px;align-items:center;background:#F6F8F3;border-radius:8px;padding:10px 14px}.v12FillTop .d b{font-size:30px;color:#26890D}.v12FillTop .d span{font-size:12px;color:var(--sub)}.v12FillTop .p{display:grid;gap:4px}.v12FillTop .p b{font-size:18px}.v12FillTop .p>span{font-size:12px;color:var(--sub)}.v12HomeGrid:not(.one) .marketPanel .marketGrid{display:flex;flex-direction:column;flex:1;gap:12px}.v12HomeGrid:not(.one) .marketPanel .newsWindow{flex:1 1 0;min-height:110px;height:0;border-left:0;padding-left:0;border-top:1px solid var(--line);padding-top:10px}.v12GoalFoot{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;border-top:1px solid var(--line);padding-top:12px}.v12GoalFoot div{display:grid;gap:2px}.v12GoalFoot span{font-size:12px;color:var(--sub)}.v12GoalFoot b{font-size:16px}.v12Two table,.v12Grid2 table{min-width:0!important}.content>.panel{margin-bottom:16px}
.v12Two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}.v12Sub{margin:6px 0 8px;font-size:13px;color:#344054}
.v12PieWrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.v12PieWrap svg{flex:none}.v12PieWrap.vertical{flex-direction:column}
.v12Legend{list-style:none;margin:0;padding:0;flex:1;min-width:200px;display:grid;gap:6px}.v12Legend li{display:grid;grid-template-columns:12px 1fr auto 52px;gap:8px;align-items:center;font-size:12px}
.v12Legend li.click{cursor:pointer}.v12Legend li.click:hover span{color:#26890D}.v12Legend i{width:10px;height:10px;border-radius:2px}.v12Legend b{font-weight:600;color:#101828}.v12Legend em{font-style:normal;color:var(--sub);text-align:right}
.v12PieV{font-size:17px;font-weight:700;fill:#101828}.v12PieL{font-size:11px;fill:#667085}
.v12Bubble{width:100%;height:auto;display:block}.v12BubT{fill:#fff;font-weight:600;pointer-events:none}.v12BubV{fill:#fff;font-size:11px;pointer-events:none}
.v12Col,.v12Scatter{width:100%;height:auto;display:block}.v12Ax{font-size:11px;fill:#667085}.v12AxS{font-size:10px;fill:#98A2B3}.v12Val{font-size:11px;fill:#344054;font-weight:600}.v12Grid{stroke:#EEF2F6}.v12Base{stroke:#D0D5DD}
.v12TLine{fill:none;stroke:#D92D20;stroke-width:1.6;stroke-dasharray:5 4}.v12TMark{stroke:#D92D20;stroke-width:2.4}.v12Line2{fill:none;stroke:#2C6AA0;stroke-width:2}.v12Dot2{fill:#2C6AA0;stroke:#fff;stroke-width:1.5}
.v12RGrid{fill:none;stroke:#E5E7EB}.v12QL{font-size:11px;fill:#98A2B3}
.v12LegendRow{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:#475467;margin:6px 0 10px}.v12LegendRow i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.v12LegendRow i.line{height:0;border-top:2px dashed;border-radius:0;width:16px;vertical-align:3px;background:none!important}
.v12Seg{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}.v12Seg button{border:0;background:#fff;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;color:#475467}
.v12Seg button+button{border-left:1px solid var(--line)}.v12Seg button.active{background:#405124;color:#fff}
.v12Chg{font-style:normal;font-weight:700}.v12Legend.cols{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 18px;margin-top:6px}.v12More{margin-top:8px}
.v12Mini{height:30px!important;font-size:12px!important}
.v12S3{display:grid;gap:4px}.v12S3Row{display:grid;grid-template-columns:24px minmax(150px,1.2fr) minmax(60px,1fr) 86px 48px;gap:8px;align-items:center;border:0;background:none;padding:5px 4px;font:inherit;text-align:left;border-radius:6px;cursor:pointer}
.v12S3Row:hover{background:#F6FAEF}.v12S3Row.zero{cursor:default;opacity:.65}.v12S3Row .n{width:22px;height:22px;border-radius:50%;background:#EEF2F6;font-size:11px;display:grid;place-items:center;color:#475467}
.v12S3Row .l{font-size:13px}.v12S3Row .l small{margin-left:6px;color:#98A2B3;font-size:11px}.v12S3Row .t{height:8px;background:#EEF2F6;border-radius:4px;overflow:hidden}.v12S3Row .t i{display:block;height:100%;background:#2C6AA0}
.v12S3Row .v{text-align:right;font-weight:600;font-size:12px}.v12S3Row .v em{font-style:normal;color:#98A2B3;font-weight:400}.v12S3Row .p{text-align:right;color:var(--sub);font-size:12px}
.v12Tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:16px;flex-wrap:wrap}.v12Tabs button{border:0;background:none;padding:9px 14px;font:inherit;font-size:14px;color:#475467;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.v12Tabs button.active{color:#26890D;border-bottom-color:#26890D;font-weight:600}.v12Tabs em{font-style:normal;background:#F2F4F7;border-radius:10px;padding:0 7px;margin-left:6px;font-size:12px;color:#475467}
.v12Filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.v12Filter input{min-width:220px}
.v12GroupRow td{background:#F9FAFB!important;font-size:12px;color:#344054;padding-top:6px!important;padding-bottom:6px!important}
.v12ScopeProg{display:flex;gap:10px;align-items:center;margin:-4px 0 10px;font-size:12px;color:var(--sub)}.v12ScopeProg .v12Prog{width:220px}
.v12Ev{border:1px solid #DCE8CF;background:#F6FAEF;border-radius:12px;padding:2px 8px;font-size:12px;color:#26890D;cursor:pointer}
.v12FlowDef{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.v12FlowDef>div{display:grid;grid-template-columns:28px 1fr;gap:0 8px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:10px 12px;min-width:180px;flex:1}
.v12FlowDef i{grid-row:1/3;width:26px;height:26px;border-radius:50%;background:#26890D;color:#fff;font-style:normal;display:grid;place-items:center;font-size:12px}.v12FlowDef small{color:var(--sub);font-size:12px}.v12FlowDef>span{color:#98A2B3;font-size:18px}
ol.v12Mini.Flow{display:flex;gap:2px;list-style:none;margin:0;padding:0}ol.v12Mini.Flow li{font-size:11px;padding:2px 6px;background:#F2F4F7;color:#98A2B3;border-radius:3px;white-space:nowrap}
ol.v12Mini.Flow li.done{background:#E8F2DA;color:#26890D}ol.v12Mini.Flow li.now{background:#FFFAEB;color:#B54708;font-weight:600}
.v12Steps{display:flex;list-style:none;margin:0 0 16px;padding:0;gap:0;counter-reset:s}.v12Steps li{flex:1;display:flex;align-items:center;gap:10px;padding:12px 14px 12px 26px;background:#F2F4F7;position:relative;cursor:pointer;
  clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%,16px 50%);margin-right:-10px}
.v12Steps li:first-child{clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%);padding-left:16px;border-radius:8px 0 0 8px}
.v12Steps li i{flex:none;width:26px;height:26px;border-radius:50%;background:#fff;color:#667085;font-style:normal;display:grid;place-items:center;font-weight:700;font-size:13px;border:1px solid #D0D5DD}
.v12Steps li b{display:block;font-size:13px;color:#344054}.v12Steps li small{display:block;font-size:11px;color:#98A2B3}
.v12Steps li.done{background:#E8F2DA}.v12Steps li.done i{background:#26890D;color:#fff;border-color:#26890D}.v12Steps li.now{background:#405124}.v12Steps li.now b{color:#fff}.v12Steps li.now small{color:#D9E8C3}.v12Steps li.now i{background:#86BC25;color:#fff;border-color:#86BC25}
.v12StepNav{display:flex;justify-content:space-between;margin:4px 0 20px}
.v12Radio{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.v12Radio label{border:1px solid var(--line);border-radius:8px;padding:14px;display:grid;gap:6px;cursor:pointer}.v12Radio label.on{border-color:#86BC25;background:#F6FAEF}
.v12Radio input{justify-self:start}.v12Radio small{color:var(--sub);font-size:12px;line-height:1.6}
.v12Impact{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.v12Impact div{border:1px dashed var(--line);border-radius:8px;padding:10px 14px;display:flex;gap:8px;align-items:baseline}.v12Impact div.on{border-color:#86BC25}
.v12Impact b{font-size:22px}.v12Impact span,.v12Impact small{color:var(--sub);font-size:12px}
.v12Facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 18px;margin-bottom:12px}.v12Facts>div{display:grid;gap:2px}.v12Facts span{font-size:12px;color:var(--sub)}.v12Facts b{font-size:13px;font-weight:600}
.v12OpBound{display:grid;grid-template-columns:1fr 1fr;gap:12px}.v12OpBound>div{border:1px solid var(--line);border-radius:8px;padding:12px;display:grid;gap:6px}.v12OpBound small{color:var(--sub);font-size:12px}.v12OpBound .status{justify-self:start}
.v12Indent{color:#98A2B3;margin-left:10px}.v12Actions{display:flex;justify-content:flex-end;margin-top:12px}
.v12BaseBar{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px}.v12BaseBar>div{background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 14px;display:grid;gap:2px}
.v12BaseBar span,.v12BaseBar small{font-size:12px;color:var(--sub)}.v12BaseBar b{font-size:20px}
tr.active td{background:#F6FAEF}.linkBtn.strong{font-weight:600;color:#1F2937}.v12Check{display:flex!important;gap:8px;align-items:center;flex-direction:row!important}
.v12PathT th.mark{color:#26890D}.v12PathT td,.v12PathT th{white-space:nowrap;font-size:12px}
.v12TrackCards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px}.v12Track{background:#fff;border:1px solid var(--line);border-top:4px solid #26890D;border-radius:8px;padding:14px 16px;display:grid;grid-template-columns:118px 1fr;gap:10px 16px}
.v12Track.bad{border-top-color:#D92D20}.v12Track .h{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center}.v12Track .h b{font-size:15px}
.v12Track dl{margin:0;display:grid;gap:6px;align-content:center}.v12Track dl>div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dashed #EEF2F6;padding-bottom:4px}.v12Track dt{font-size:12px;color:var(--sub)}.v12Track dd{margin:0;font-weight:700;font-size:13px}
.v12UnitSum{display:flex;gap:18px;font-size:13px;margin-bottom:10px;color:#475467;flex-wrap:wrap}
.clickRow{cursor:pointer}.clickRow:hover td{background:#F6FAEF}.v12Code{min-width:180px;font-size:11px;background:#F8FAF5;border:1px solid #E5E7EB;border-radius:4px;padding:1px 5px;white-space:normal;display:inline-block;max-width:260px}
.v12Scroll{max-height:56vh;overflow:auto}
/* Word 版报告 */
.wdWrap{background:#E9ECEF;border-radius:8px;padding:24px 0;margin-bottom:24px}
.wdDoc{max-width:860px;margin:0 auto;color:#111;font-family:"SimSun","Songti SC","Times New Roman",serif;line-height:1.85;font-size:14px;background:none;border:0;padding:0}
.wdPage{background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);padding:72px 80px;margin:0 auto 20px;min-height:400px;position:relative}
.wdCover{min-height:1060px;display:flex;flex-direction:column}.wdLogo{font-family:Arial,sans-serif;font-weight:700;color:#26890D;font-size:18px}.wdLogo small{display:block;font-size:10px;letter-spacing:2px;color:#86BC25}
.wdCoverMid{margin:180px 0 80px;text-align:center}.wdTitle{font-family:"SimHei","Heiti SC",sans-serif;font-size:30px;line-height:1.6;margin:0}.wdEn{font-family:Arial;color:#555;margin-top:12px}.wdSubT{margin-top:6px}
.wdMeta{width:76%;margin:0 auto;border-collapse:collapse;font-size:14px}.wdMeta th{background:none!important;text-align:right;font-weight:400;padding:6px 10px;width:30%;color:#333;white-space:nowrap}.wdMeta td{border-bottom:1px solid #333;padding:6px 10px}
.wdOrg{margin-top:auto;text-align:center;font-weight:700;line-height:2}
.wdTocTitle{text-align:center;font-family:"SimHei",sans-serif;font-size:22px;border:0!important}.wdToc{list-style:none;padding:0;margin:20px 0}.wdToc>li{margin:6px 0}.wdToc a{color:#111;text-decoration:none;border-bottom:1px dotted #999}.wdToc ol{list-style:none;padding-left:2em;margin:2px 0;color:#444;font-size:13px}
.wdSec h2{font-family:"SimHei","Heiti SC",sans-serif;font-size:20px;margin:0 0 16px;padding-bottom:6px;border-bottom:2px solid #86BC25}
.wdSec h3{font-family:"SimHei","Heiti SC",sans-serif;font-size:16px;margin:20px 0 8px}.wdSec h4{font-size:14px;margin:14px 0 6px}
.wdSec p{text-indent:2em;margin:6px 0;text-align:justify}.wdSec p.wdNote{text-indent:0;font-size:12px;color:#555}.wdSec ul{margin:6px 0 6px 2em;padding:0}
.wdTable{width:100%;min-width:0!important;table-layout:auto;word-break:break-word;border-collapse:collapse;margin:10px 0 14px;font-size:12.5px;font-family:Arial,"Microsoft YaHei",sans-serif}.wdTable caption{font-weight:700;margin-bottom:6px;font-size:13px}
.wdTable th,.wdTable td{border:1px solid #9AA0A6;padding:5px 8px;text-align:left;vertical-align:top}.wdTable th{background:#E8F2DA;text-align:center}.wdTable tr.sub td{background:#F6F8F3;font-weight:700}.wdTable tr.total td{font-weight:700;background:#FAFAFA}
.wdFig{margin:12px 0;text-align:center}.wdFig svg{max-width:100%;height:auto}.wdFig figcaption{font-size:12px;color:#555;margin-top:4px}.wdFig .v12PieWrap{justify-content:center}
.wdSign{display:flex;justify-content:space-between;margin-top:30px}.wdSign p{text-indent:0}
.wdKpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.wdKpis>div{border:1px solid #ccc;padding:8px;text-align:center}.wdKpis span{display:block;font-size:12px;color:#555}.wdKpis b{font-size:18px}
.wdPrinting .wdPage{box-shadow:none;margin:0}
@media(max-width:1100px){.v12HomeGrid,.v12Grid2,.v12Grid2.a,.v12Two{grid-template-columns:1fr}.v12BaseBar{grid-template-columns:repeat(2,1fr)}.v12Radio,.v12Impact{grid-template-columns:1fr}}
@media(max-width:700px){.wdPage{padding:32px 20px}.v12Counts.wide{grid-template-columns:repeat(3,1fr)}.v12Steps{flex-direction:column}.v12Steps li{clip-path:none!important;margin:0 0 4px;border-radius:6px}}
`;
  document.head.insertAdjacentHTML("beforeend","<style id=\"v12css\">"+css+"</style>");
})();
