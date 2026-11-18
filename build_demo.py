import json
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
css = (ROOT / "styles.css").read_text() + """
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
