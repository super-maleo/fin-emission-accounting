import json
import re
import tempfile
from pathlib import Path

import server

ROOT = Path(__file__).resolve().parent
TABLES = {
    "standards": "standards", "categories": "scope3_categories",
    "factors": "emission_factors", "sources": "emission_sources",
    "gwp": "gwp_library", "substances": "emission_substances",
    "formulas": "formulas", "records": "collection_records", "reports": "reports",
}

with tempfile.TemporaryDirectory() as directory:
    server.DB_PATH = Path(directory) / "seed.db"
    server.init_db()
    with server.connect() as connection:
        seed = {key: server.get_table(connection, name) for key, name in TABLES.items()}

seed_json = json.dumps(seed, ensure_ascii=False, indent=2).replace("<", "\\u003c")
app = (ROOT / "app.js").read_text().rstrip().removesuffix("init();")
app = app.replace("SQLite / data/carbon.db", "演示数据").replace("SQLite", "演示存储")
# 统一圆角和阴影：基础样式中的大圆角卡片统一为 8px
base_css = re.sub(r"border-radius:\s*(1[0-9]|2[0-9])px", "border-radius:8px", (ROOT / "styles.css").read_text())
base_css = base_css.replace("--shadow:0 10px 26px rgba(16,24,40,.07)", "--shadow:0 1px 2px rgba(16,24,40,.04)")
css = base_css + """
.card{border-radius:8px;box-shadow:none;margin-bottom:14px}
.logo{letter-spacing:0}
.chartControls{display:flex;justify-content:flex-end;margin-bottom:8px}
.chartControls select,.modalForm select{height:34px;border:1px solid #d6dce2;border-radius:6px;padding:0 8px;background:white;max-width:100%}
.bar,.hbarFill,.flowPath{transition:height .5s,width .5s,stroke-width .5s}
.bar:hover,.hbarRow:hover,.flowPath:hover{filter:brightness(.9)}
.realSankey .flowPath{stroke-dasharray:12 4;animation:flowTravel 2s linear infinite}
@keyframes flowTravel{to{stroke-dashoffset:-32}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
.content{min-width:0}
.sidebar{flex-shrink:0}
.head .desc:empty{display:none}
.kpi .value{overflow-wrap:anywhere}
.modalBox{width:min(960px,94vw);max-height:90vh;overflow:auto}
.modalForm select{width:100%}
.lcaMeta{display:flex;flex-wrap:wrap;gap:14px;padding:14px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px;color:#475467}
.lcaStageTabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:20px}
.lcaStageTabs button{border:1px solid #d6dce2;background:white;border-radius:6px;padding:14px 10px;text-align:left;cursor:pointer;font-size:14px}
.lcaStageTabs button.active{border-color:#86bc25;background:#f0f8e7;color:#405124}
.lcaStageTabs small{display:block;margin-top:8px;font-size:12px}
.lcaStageHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px}
.lcaStageHead h3{margin:0}
.lcaFooter{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.lcaBoundaryStages{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px;align-items:center}
.lcaBoundaryStages label{display:flex;gap:4px;align-items:center}
.lcaContribution{display:grid;grid-template-columns:110px minmax(60px,1fr) 190px 70px;gap:16px;align-items:center;background:white;border:0;width:100%;padding:16px 0;text-align:left;cursor:pointer;border-bottom:1px solid #eef2f6}
.lcaContribution:hover{background:#f8fcf3}
.lcaTrack{height:16px;background:#f2f4f7;border-radius:3px;overflow:hidden}
.lcaTrack i{display:block;height:100%;min-width:2px;transition:width .4s}
.lcaReport{background:white;border-top:5px solid #86bc25;padding:28px;margin-bottom:18px}
.lcaReport dl{display:grid;grid-template-columns:120px 1fr;gap:12px;line-height:1.6}
.lcaReport dd{margin:0}.lcaReport dt{color:#667085}
.head select{height:36px;max-width:280px;border:1px solid #d6dce2;border-radius:6px;background:white;padding:0 8px}
.sidebar{width:196px;padding:12px 8px}
.sidebar .group-btn{font-size:13px;min-height:38px;padding:9px 8px;border-radius:5px;gap:8px}
.sidebar .sub{margin-left:21px;padding-left:7px}
.sidebar .sub button{font-size:12px;padding:7px 6px}
.navMark{font-size:17px;width:22px;flex-shrink:0;text-align:center}
.shellIcon{width:32px;height:32px;border:1px solid #e5e7eb;background:white;border-radius:5px;cursor:pointer;margin-right:14px;font-size:17px}
.topbar .logo{margin-right:14px}
.sidebarCollapsed .sidebar{width:58px;padding:12px 5px}
.sidebarCollapsed .sidebar .navLabel,.sidebarCollapsed .side-title,.sidebarCollapsed .sidebar .sub{display:none}
.sidebarCollapsed .sidebar .group-btn{justify-content:center}
#roleSelect{height:32px;border:1px solid #d6dce2;border-radius:5px;background:white;padding:0 8px}
.taskToolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:14px 0 18px}
.taskToolbar label{display:grid;gap:5px;font-size:12px;color:#667085}
.taskToolbar select,.taskToolbar input{height:36px;border:1px solid #d6dce2;border-radius:5px;padding:0 10px;background:white;color:#1f2937}
.taskSearch input{width:240px}
.taskToolbar>span{margin-left:auto;font-size:12px;color:#667085;padding-bottom:10px}
.taskTable{background:white;border:1px solid #e5e7eb;border-radius:6px}
.taskTable small{display:block;color:#667085;margin-top:5px;font-size:11px}
.taskTable strong{font-weight:600}
.taskContext{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:13px;color:#667085;margin:0 0 18px}
.reviewNote{background:#fff7e6;padding:12px;color:#936b15}
.calculationHelp{padding:12px 0;border-bottom:1px solid #e5e7eb;color:#667085;font-size:13px}
.calculationHelp summary{cursor:pointer;color:#405124}
.modalActions input{min-width:180px;padding:8px;border:1px solid #d6dce2;border-radius:5px}
.emptyState{padding:40px;text-align:center;color:#667085;background:white;border:1px solid #e5e7eb}
.lifecycleSankey{overflow:auto}
.lifecycleSankey svg{width:100%;min-width:920px;display:block}
.lifecycleSankey text{font-family:inherit;font-size:13px;fill:#344054}
.lifecycleSankey .sankeyValue{font-size:11px;fill:#667085}
.lifecycleSankey .sankeyColumn{font-weight:600;fill:#667085}
.lifecycleSankey .sankeyTotal{font-weight:700;fill:#101828;font-size:17px}
.sankeyItem{cursor:pointer}
.sankeyItem:hover path{stroke-opacity:.75}
.sankeyItem path{transition:stroke-opacity .2s}
@media(max-width:760px){
  .topbar{height:auto;padding:8px 12px;flex-wrap:wrap;position:relative}
  .nav{order:3;overflow:auto;flex-basis:100%;height:44px}
  .nav button{height:44px;white-space:nowrap}
  .right .pill{display:none}
  .main{display:block}
  .sidebar{width:100%;height:auto;position:static;padding:8px}
  .sidebar .sub{display:flex;flex-wrap:wrap;margin:4px 0;padding:0;border:0;max-width:340px}
  .sidebar .sub button{width:auto}
  .sidebar #side{display:flex;overflow:auto}
  .sidebar .group{flex-shrink:0}
  .content{padding:14px}
  .formGrid,.modalForm,.three,.timeline{grid-template-columns:1fr}
  .wide{grid-column:auto}
  .head{display:block}
  .head .actions{justify-content:flex-start;margin-top:12px}
  .home,.two,.twoEqual{grid-template-columns:1fr}
  .lcaStageTabs{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lcaContribution{grid-template-columns:80px 1fr;gap:8px}
  .lcaReport dl{grid-template-columns:1fr}
  .sidebar,.sidebarCollapsed .sidebar{width:100%;height:auto}
  .sidebarCollapsed .sidebar .navLabel{display:inline}
  .taskSearch input{width:200px}
}

/* role experience */
body[data-top="首页"] .sidebar{display:none}
.reportPreview{background:#fff;border:1px solid var(--line);border-top:5px solid var(--green);border-radius:8px;padding:26px 28px;margin-bottom:16px}
.reportCover .coverLogo{font-weight:900;font-size:22px}
.reportCover h2{margin:12px 0 4px;font-size:22px}.reportCover p{margin:0 0 16px;color:var(--sub)}
.reportFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 24px;margin:0 0 8px;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.reportFacts dt{color:var(--sub);font-size:12px}.reportFacts dd{margin:3px 0 0}
.reportPreview h3{font-size:15px;margin:20px 0 8px;border-left:3px solid var(--green);padding-left:8px}
.reportPreview table{width:100%;border-collapse:collapse}.reportPreview th,.reportPreview td{padding:8px;border-bottom:1px solid #EEF2F6;text-align:left;font-size:13px}
.reportPreview th{background:var(--greenSoft);color:#405124}
@media(max-width:760px){.reportFacts{grid-template-columns:1fr}.reportPreview{padding:18px}}
body:not([data-role="管理者"]) #content button[onclick*="editLcaModel"],body:not([data-role="管理者"]) #content button[onclick*="removeLcaLine"]{display:none}
.supplierProgress .flowSteps li:not(.now):not(.back){font-size:0;padding-right:14px}
.supplierProgress .flowSteps{flex-wrap:nowrap}
body[data-top="首页"] #sidebarToggle{visibility:hidden}
#identitySelect{height:30px;border:0;background:transparent;font-weight:700;color:#344054;max-width:180px}
.right .pill{gap:6px}
.welcome{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
.welcome h1{margin:0 0 6px;font-size:24px}
.welcome p{margin:0;color:var(--sub);font-size:13px}
.statRow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.statTile{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px;display:grid;gap:6px;min-width:0}
.statTile.clickable{cursor:pointer;transition:border-color .2s,box-shadow .2s}
.statTile.clickable:hover,.statTile.clickable:focus{border-color:#B9DB86;box-shadow:0 4px 14px rgba(77,127,23,.10);outline:0}
.statTile span{color:var(--sub);font-size:12px}
.statTile b{font-size:26px;line-height:1.1;font-weight:700;color:#101828;overflow-wrap:anywhere}
.statTile small{color:var(--sub);font-size:12px;overflow-wrap:anywhere}
.homeGrid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}
.homeGrid.even{grid-template-columns:repeat(2,minmax(0,1fr))}
.homeGrid>div{display:grid;gap:16px;min-width:0}
.panel{background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;min-width:0}
.panelHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.panelHead h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}
.panelHead h3 em{font-style:normal;background:var(--greenLight);color:var(--green3);border-radius:10px;padding:1px 8px;font-size:12px}
.linkBtn{border:0;background:none;color:var(--green3);cursor:pointer;font-size:13px}
.todoList,.feed,.supplierProgress{list-style:none;margin:0;padding:0}
.todoList li{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0;border-top:1px solid #EEF2F6}
.todoList li:first-child{border-top:0}
.todoMain{display:grid;gap:3px;min-width:0}
.todoMain b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.todoMain small{color:var(--sub);font-size:12px}
.todoMain em{font-style:normal;color:#936B15;font-size:12px;background:#FFF7E6;padding:3px 6px;border-radius:4px;justify-self:start}
.todoTag{display:inline-block;text-align:center;font-size:12px;padding:3px 6px;border-radius:4px;background:#F2F4F7;color:#475467;white-space:nowrap}
.todoTag.warn{background:#FFF4DE;color:#A66A00}.todoTag.bad{background:#FDECEC;color:var(--red)}.todoTag.ok{background:var(--greenLight);color:var(--green3)}
.todoEmpty{padding:18px 0;color:var(--sub);text-align:center;font-size:13px}
.feed li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:8px 0;border-top:1px solid #EEF2F6;font-size:13px}
.feed li:first-child{border-top:0}
.feed time{grid-row:span 2;color:var(--sub);font-size:12px;white-space:nowrap}
.feed span{color:var(--green3);font-size:12px}
.quickLinks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.quickLinks button{display:grid;grid-template-columns:28px 1fr;gap:2px 8px;text-align:left;border:1px solid var(--line);background:#fff;border-radius:6px;padding:10px;cursor:pointer}
.quickLinks button:hover{border-color:#B9DB86;background:var(--greenSoft)}
.quickLinks span{grid-row:span 2;font-size:18px;color:var(--green3);align-self:center;text-align:center}
.quickLinks b{font-size:13px;font-weight:600}.quickLinks small{color:var(--sub);font-size:12px}
.progressList,.meterList{display:grid;gap:4px}
.progressRow,.meterRow{display:grid;grid-template-columns:88px minmax(40px,1fr) 92px;gap:10px;align-items:center;border:0;background:none;padding:8px 4px;border-radius:5px;cursor:pointer;text-align:left;width:100%}
.meterRow{grid-template-columns:minmax(90px,170px) minmax(40px,1fr) 118px}
.progressRow:hover,.meterRow:hover{background:var(--greenSoft)}
.progressTrack,.meterTrack{height:8px;background:#EEF1F4;border-radius:4px;overflow:hidden}
.progressTrack i,.meterTrack i{display:block;height:100%;background:var(--green);border-radius:4px;transition:width .4s}
.progressValue,.meterValue{text-align:right;font-variant-numeric:tabular-nums;font-size:13px}
.progressValue small,.meterValue small,.meterLabel small{display:block;color:var(--sub);font-size:11px}
.meterLabel{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.flowSteps{display:flex;list-style:none;margin:6px 0 14px;padding:0;gap:0;counter-reset:step;flex-wrap:wrap}
.flowSteps li{display:flex;align-items:center;gap:6px;font-size:12px;color:#98A2B3;padding-right:22px;position:relative}
.flowSteps li:not(:last-child):after{content:"";position:absolute;right:6px;top:50%;width:10px;height:1px;background:#D0D5DD}
.flowSteps i{width:20px;height:20px;border-radius:50%;border:1px solid #D0D5DD;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;background:#fff}
.flowSteps li.done{color:var(--green3)}.flowSteps li.done i{background:var(--green);border-color:var(--green);color:#fff}
.flowSteps li.now{color:#101828;font-weight:600}.flowSteps li.now i{border-color:var(--green);color:var(--green3)}
.flowSteps li.back{color:var(--red);font-weight:600}.flowSteps li.back i{border-color:var(--red);color:var(--red)}
.calcPreview{margin:4px 0 8px;padding:10px 12px;background:var(--greenSoft);border:1px solid #E1EFCC;border-radius:6px;color:#405124;font-size:13px}
.supplierTask{background:#fff;border:1px solid var(--line);border-top:4px solid var(--green);border-radius:8px;padding:18px 20px;margin-bottom:16px}
.supplierTaskHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.supplierTaskHead h2{margin:8px 0 4px;font-size:20px}.supplierTaskHead p{margin:0 0 10px;color:var(--sub);font-size:13px}
.btn.big{height:40px;padding:0 20px;font-size:14px}
.factGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 0}
.factGrid div{background:#F9FAFB;border-radius:6px;padding:10px 12px}
.factGrid dt{color:var(--sub);font-size:12px}.factGrid dd{margin:4px 0 0;font-weight:600}
.bigFigure b{font-size:30px;font-weight:700}.bigFigure span{margin-left:8px;color:var(--sub)}
.muted{color:var(--sub);font-size:13px}
.segTabs{display:flex;gap:6px;margin:0 0 12px;flex-wrap:wrap}
.segTabs button{border:1px solid var(--line);background:#fff;border-radius:16px;padding:6px 14px;cursor:pointer;font-size:13px}
.segTabs button.active{background:var(--greenLight);border-color:#C7E39C;color:var(--green3);font-weight:600}
.segTabs em{font-style:normal;color:var(--sub);margin-left:2px}
.scopeStack{display:flex;height:10px;border-radius:5px;overflow:hidden;margin:-4px 0 16px;gap:2px}
.scopeStack i{cursor:pointer;min-width:3px}
.supplierProgress>li{display:grid;grid-template-columns:150px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #EEF2F6}
.supplierProgress>li:first-child{border-top:0}
.supplierProgress>li>div{display:grid;gap:3px}.supplierProgress small{color:var(--sub);font-size:12px}
.supplierProgress .flowSteps{margin:0}
.emptyCell{text-align:center;color:var(--sub);padding:28px}
.rowActions{white-space:nowrap}.rowActions .btn+.btn{margin-left:6px}
.taskTable td small{display:block}
@media(max-width:1100px){.homeGrid,.homeGrid.even{grid-template-columns:1fr}.supplierProgress>li{grid-template-columns:1fr}}
@media(max-width:760px){
  .statRow{grid-template-columns:repeat(2,minmax(0,1fr))}
  .factGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .supplierTaskHead{display:block}.supplierTaskHead .btn{margin-top:8px}
  .todoList li{grid-template-columns:54px minmax(0,1fr)}.todoList li .btn{grid-column:2;justify-self:start}
  .quickLinks{grid-template-columns:1fr}
  .meterRow{grid-template-columns:minmax(80px,120px) minmax(30px,1fr) 90px}
  #identitySelect{max-width:120px}
}

/* ===== home portal ===== */
.welcome.compact{align-items:center;margin-bottom:16px}
.welcome.compact h1{font-size:22px;margin:0 0 4px}
.homeTop{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(320px,1fr);gap:16px;margin-bottom:16px;align-items:stretch}
.carousel{position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--line);background:#fff;min-height:300px}
.slides{display:flex;height:100%;transition:transform .6s ease}
.slide{flex:0 0 100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);min-height:300px}
.slideText{padding:28px 28px 48px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:10px}
.slideKicker{font-size:12px;color:var(--green3);font-weight:600;letter-spacing:.04em}
.slideText h2{margin:0;font-size:22px;line-height:1.35;color:#101828}
.slideText p{margin:0 0 6px;color:var(--sub);font-size:13px;line-height:1.7}
.slideArt{position:relative;overflow:hidden}
.slideArt svg{position:absolute;inset:0;width:100%;height:100%}
.blade{animation:spin 6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{50%{fill-opacity:.32}}
.slideNav{position:absolute;left:28px;bottom:14px;display:flex;align-items:center;gap:8px}
.slideNav i{width:8px;height:8px;border-radius:4px;background:#D0D5DD;cursor:pointer;transition:width .3s,background .3s}
.slideNav i.on{width:22px;background:var(--green)}
.slideNav button{border:1px solid var(--line);background:#fff;border-radius:50%;width:24px;height:24px;line-height:20px;cursor:pointer;color:#475467;padding:0}
.taskWidget{display:flex;flex-direction:column;margin:0}
.taskCounts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.taskCounts button{border:1px solid var(--line);background:#fff;border-radius:6px;padding:8px 4px;cursor:pointer;display:grid;gap:2px;text-align:center}
.taskCounts button:hover{border-color:#B9DB86}
.taskCounts b{font-size:20px;line-height:1.2;color:#101828}.taskCounts span{font-size:12px;color:var(--sub)}
.taskCounts .warn b{color:#A66A00}.taskCounts .bad b{color:var(--red)}.taskCounts .ok b{color:var(--green3)}
.miniProgress{display:flex;align-items:center;gap:10px;margin:12px 0 8px}
.miniProgress span{flex:1;height:6px;background:#EEF1F4;border-radius:3px;overflow:hidden}
.miniProgress i{display:block;height:100%;background:var(--green)}
.miniProgress small{font-size:12px;color:var(--sub);white-space:nowrap}
.miniTabs{display:flex;gap:16px;border-bottom:1px solid var(--line);margin-bottom:4px}
.miniTabs button{border:0;background:none;padding:8px 0;border-bottom:2px solid transparent;cursor:pointer;color:#475467;font-size:13px}
.miniTabs button.active{border-bottom-color:var(--green);color:#101828;font-weight:600}
.miniTabs em{font-style:normal;color:var(--sub);font-size:12px}
.miniList{list-style:none;margin:0;padding:0}
.miniList li{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #F0F2F5}
.miniList li:last-child{border-bottom:0}
.miniList li>div{display:grid;gap:2px;min-width:0}
.miniList b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miniList small{font-size:12px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miniList .btn{height:28px;padding:0 10px;font-size:12px}
.moreLink{margin-top:6px;align-self:flex-start}
.supplierMini{display:grid;gap:4px;margin-bottom:6px}.supplierMini b{font-size:17px}.supplierMini small{color:var(--sub);font-size:12px}
.supplierMini .todoTag{justify-self:start}
.reviewNote.small{font-size:12px;padding:8px 10px;margin:0 0 8px}
.miniFacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}
.miniFacts div{background:#F9FAFB;border-radius:6px;padding:8px 10px}.miniFacts dt{font-size:12px;color:var(--sub)}.miniFacts dd{margin:2px 0 0;font-weight:600}
.btn.wide{width:100%;margin-top:auto}
.quickStrip{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.quickStrip button{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:1px solid var(--line);background:#fff;border-radius:18px;cursor:pointer;font-size:13px;color:#344054}
.quickStrip button:hover{border-color:#B9DB86;background:var(--greenSoft);color:var(--green3)}
.quickStrip span{color:var(--green3)}
.marketPanel{margin:0}
.demoBadge{font-size:12px;color:#A66A00;background:#FFF4DE;border-radius:4px;padding:2px 8px}
.marketGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:24px}
.quoteRow{display:flex;justify-content:space-between;align-items:flex-end}
.quoteRow small{display:block;font-size:12px;color:var(--sub)}
.quoteRow b{font-size:28px;font-weight:700;color:#101828;margin-right:4px}.quoteRow span{color:var(--sub);font-size:12px}
.quoteRow em{font-style:normal;font-size:13px;font-weight:600;padding:2px 8px;border-radius:4px}
.quoteRow em.up{color:#C0392B;background:#FDECEC}.quoteRow em.down{color:var(--green3);background:var(--greenLight)}
.spark{width:100%;height:86px;display:block;margin:10px 0}
.quoteFacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0}
.quoteFacts dt{font-size:11px;color:var(--sub)}.quoteFacts dd{margin:2px 0 0;font-weight:600;font-size:13px}
.newsWindow{height:190px;overflow:hidden;position:relative;border-left:1px solid var(--line);padding-left:20px;mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}
.newsScroll{list-style:none;margin:0;padding:0;animation:newsUp 30s linear infinite}
.newsWindow:hover .newsScroll{animation-play-state:paused}
@keyframes newsUp{to{transform:translateY(-50%)}}
.newsScroll button{display:flex;gap:10px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:9px 0;border-bottom:1px dashed #E4E7EC;cursor:pointer;font-size:13px;color:#344054}
.newsScroll button:hover{color:var(--green3)}
.newsTag{flex-shrink:0;font-size:11px;padding:1px 6px;border-radius:3px;background:var(--greenLight);color:var(--green3)}

/* ===== unified layout system ===== */
.main{background:linear-gradient(90deg,#fff 196px,var(--line) 196px,var(--line) 197px,transparent 197px)}
.sidebarCollapsed .main{background:linear-gradient(90deg,#fff 58px,var(--line) 58px,var(--line) 59px,transparent 59px)}
body[data-top="首页"] .main{background:none}
.content{padding:24px 28px 40px}
.breadcrumb{font-size:12px;color:#8A94A3;margin-bottom:6px}
.head{align-items:center;margin-bottom:16px;min-height:36px}
.head h1,.content h1{font-size:22px;font-weight:700;margin:0;line-height:1.3}
.head .actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.btn{height:34px;padding:0 14px;border-radius:6px;font-weight:600;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;line-height:1}
td .btn,.rowActions .btn{height:30px;padding:0 12px;font-size:12px}
td .btn+.btn{margin-left:6px}
.helpIcon{width:24px;height:24px;flex-shrink:0}
.content select,.content input:not([type=checkbox]):not([type=radio]):not([type=file]),.modalForm input,.modalForm select,.modalActions input,#roleSelect,.head select{height:34px;border:1px solid #D0D5DD;border-radius:6px;padding:0 10px;background:#fff;color:#1F2937;font-size:13px}
.content textarea,.modalForm textarea{border:1px solid #D0D5DD;border-radius:6px;padding:8px 10px;font-size:13px}
.content select:focus,.content input:focus,.modalForm input:focus,.modalForm select:focus,.content textarea:focus{outline:0;border-color:var(--green);box-shadow:0 0 0 3px rgba(134,188,37,.15)}
.lcaMeta{align-items:center;gap:16px;padding:0 0 16px;font-size:13px}
.lcaMeta label{display:inline-flex;align-items:center;gap:8px}
.taskToolbar{padding:0 0 16px}
.taskToolbar>span{padding-bottom:9px}
.card,.panel,.taskTable,.statTile,.kpi,.lcaReport,.reportPreview,.supplierTask,.emptyState{border-radius:8px;border:1px solid var(--line);box-shadow:none;background:#fff}
.card,.panel{padding:16px;margin-bottom:16px}
.homeGrid>div>.panel,.homeGrid>div>.card,.homeTop>.panel,.marketPanel{margin-bottom:0}
.card h3,.panelHead h3{font-size:15px;font-weight:600;margin:0;display:flex;align-items:center;gap:8px;color:#101828}
.card h3{margin-bottom:12px}
.card h3:before,.panelHead h3:before{content:"";width:3px;height:14px;border-radius:2px;background:var(--green)}
.panelHead{min-height:24px;margin-bottom:12px}
.card>.tableWrap{margin:0 -16px -16px;border-top:1px solid var(--line)}
.card>h3+.tableWrap{margin-top:0}
table{font-size:13px}
th,td{padding:10px 12px;vertical-align:middle}
th:first-child,td:first-child{padding-left:16px}th:last-child,td:last-child{padding-right:16px}
th{font-size:12px;font-weight:600;color:#405124;background:#F6FAEF}
tbody tr:hover td{background:#FAFCF7}
tbody tr:last-child td{border-bottom:0}
.panel .taskTable{margin:0 -16px -16px;border:0;border-top:1px solid var(--line);border-radius:0 0 8px 8px}
code{font-size:12px;background:#F2F4F7;padding:2px 6px;border-radius:4px}
.status.gray{background:#F2F4F7;color:#475467}
td.wrapCell{white-space:normal;min-width:180px;max-width:320px;line-height:1.6}
.taskTable{margin-bottom:16px;overflow:auto}
.statRow,.grid.kpis,.kpis{gap:16px;margin-bottom:16px}
.kpi{min-height:0;padding:14px 16px}
.kpi:after{display:none}
.kpi .label{font-size:12px;margin-bottom:6px}.kpi .value{font-size:26px;font-weight:700}.kpi .note{margin-top:6px}
.statTile b{font-weight:700}
.status,.todoTag{border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600;line-height:1.6}
.segTabs{margin-bottom:16px}
.taskContext{margin:0 0 16px}
.filters{gap:12px}
.lcaStageTabs{gap:12px;margin-bottom:16px}
.lcaStageTabs button{border-radius:8px}
.modalBox{border-radius:10px}
.modalBox h2{font-size:18px;margin:0 0 10px}
.modalActions{gap:8px;align-items:center}
@media(max-width:1100px){.homeTop{grid-template-columns:1fr}.marketGrid{grid-template-columns:1fr}.newsWindow{border-left:0;padding-left:0;border-top:1px solid var(--line);padding-top:8px}}
@media(max-width:760px){
  .content{padding:16px}
  .main,.sidebarCollapsed .main{background:none}
  .slide{grid-template-columns:1fr;min-height:0}
  .slideArt{height:140px;order:-1}
  .slideText{padding:18px 18px 44px}
  .slideNav{left:18px}
  .carousel{min-height:0}
  .taskCounts b{font-size:17px}
  .quoteFacts{grid-template-columns:repeat(2,1fr)}
  .card>.tableWrap{margin:0 -16px -16px}
}
/* 年度、目标、履约 */
#yearSelect{height:30px;border:1px solid #D0D5DD;border-radius:6px;padding:0 8px;background:#fff;color:#1F2937;font-size:13px;font-weight:600;margin-left:8px}
body.historyMode #yearSelect{border-color:#E9A23B;background:#FFF8EB;color:#8A5300}
.historyBanner{display:flex;align-items:center;gap:12px;background:#FFF8EB;border:1px solid #F5D9A8;border-radius:8px;padding:10px 14px;margin-bottom:16px}
.historyBanner div{flex:1;display:grid;gap:2px}.historyBanner small{color:#8A5300}
.goalStrip{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(320px,1fr);gap:16px;margin-bottom:16px}
.goalStrip>.panel{margin-bottom:0}
.goalList{display:grid;gap:8px}
.goalItem{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(80px,1fr) auto;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);background:#fff;border-radius:8px;padding:10px 12px;cursor:pointer;font:inherit;color:inherit}
.goalItem.static{cursor:default}
.goalItem:not(.static):hover{border-color:#B9DB86;background:var(--greenSoft)}
.goalItem span:first-child{display:grid;gap:2px;min-width:0}.goalItem small{color:var(--sub);font-size:12px}
.goalTrack{height:8px;border-radius:4px;background:#EEF1F4;overflow:hidden}.goalTrack i{display:block;height:100%;background:var(--green);border-radius:4px}
.etsMini .etsMiniBody{display:flex;gap:16px;align-items:center;margin-bottom:12px}
.countdown{display:flex;align-items:center;gap:8px;background:var(--greenSoft);border-radius:8px;padding:10px 14px}
.countdown b{font-size:30px;line-height:1;color:var(--green3)}.countdown span{font-size:12px;color:var(--sub);line-height:1.4}
.etsMini .miniFacts{flex:1;margin:0}
.okText{color:#26890D!important}.badText{color:#D92D20!important}
.targetCard .actions{display:flex;gap:8px}
.targetFacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 14px}
.targetFacts div{background:#F8FAF5;border-radius:6px;padding:10px 12px}.targetFacts .wide{grid-column:1/-1}
.targetFacts dt{font-size:12px;color:var(--sub)}.targetFacts dd{margin:4px 0 0;font-weight:600}
.pathTable td:first-child{font-weight:600;white-space:nowrap}
.trackChart{width:100%;height:auto;display:block;margin:4px 0}
.chartLegend{display:flex;gap:16px;font-size:12px;color:var(--sub);margin-bottom:8px}
.chartLegend i{display:inline-block;width:18px;height:0;border-top:2.5px solid #26890D;vertical-align:middle;margin-right:6px}
.chartLegend i.dash{border-top:2px dashed #98A2B3}
.yearCompare{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px}
.yearCompare div{display:grid;gap:4px;background:#F8FAF5;border-radius:6px;padding:10px 12px}.yearCompare span{font-size:12px;color:var(--sub)}.yearCompare b{font-size:18px}
.yearBars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
.yearBars button{display:grid;justify-items:center;gap:4px;border:1px solid transparent;background:none;border-radius:8px;padding:8px 4px;cursor:pointer;font:inherit}
.yearBars button.active{border-color:#C7E39C;background:var(--greenSoft)}
.yearBar{height:72px;width:28px;display:flex;align-items:flex-end;background:#F2F4F7;border-radius:4px;overflow:hidden}.yearBar i{display:block;width:100%;background:var(--green)}
.yearBars small{color:var(--sub)}
.etsSteps{margin:4px 0 14px}
.coverBar{height:10px;border-radius:5px;background:#EEF1F4;overflow:hidden;margin-bottom:8px}.coverBar span{display:block;height:100%;background:linear-gradient(90deg,#86BC25,#26890D)}
.planList{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.planList li{display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.planList small{grid-column:1;color:var(--sub);font-size:12px}.planList .btn{grid-row:1/3;grid-column:2}
.miniFacts.cols2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.muted.small,.small{font-size:12px}
.panel>.actions{display:flex;gap:8px;margin-top:10px}
@media(max-width:860px){
  .goalStrip{grid-template-columns:1fr}
  .targetFacts,.yearCompare{grid-template-columns:repeat(2,minmax(0,1fr))}
  .goalItem{grid-template-columns:1fr auto}.goalItem .goalTrack{grid-column:1/-1;grid-row:2}
  #yearSelect{margin-left:4px;max-width:96px}
  .historyBanner{flex-wrap:wrap}
}
"""
script = "\n".join([
    f"const demoSeed = {seed_json};",
    app,
    (ROOT / "offline-demo.js").read_text(),
    (ROOT / "interactive-demo.js").read_text(),
    (ROOT / "lca-workbench.js").read_text(),
    (ROOT / "scenario-data.js").read_text(),
    (ROOT / "workflow-ui.js").read_text(),
    (ROOT / "lifecycle-sankey.js").read_text(),
    (ROOT / "role-home.js").read_text(),
    (ROOT / "year-goal-ets.js").read_text(),
    """
async function startDemo() {
  if (location.protocol.startsWith("http")) {
    try {
      const response = await fetch("/api/demo-state");
      if (!response.ok) throw new Error("服务连接失败");
      const saved = await response.json();
      if (saved.state) {
        Object.assign(demo, saved.state);
        if (demo.supplierRows) supplyScope3Items.splice(0, supplyScope3Items.length, ...demo.supplierRows);
      }
    } catch (error) {
      console.error(error);
    }
  }
  prepareDomainData();
  prepareScenarioData();
  prepareWorkflow();
  init();
}
startDemo();
""",
])
assert "</script" not in script.lower()
html = (ROOT / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="styles.css" />', f"<style>\n{css}\n</style>")
html = html.replace('<script src="app.js"></script>', f"<script>\n{script}\n</script>")
html = html.replace("当前组织：", "演示 · ")
html = html.replace("<title>Deloitte 碳排放管理系统</title>", "<title>Deloitte 碳排放管理系统 · 交互增强版</title>")
target = ROOT / "Deloitte碳排放管理系统-交互增强版.html"
target.write_text(html)
print(target)
