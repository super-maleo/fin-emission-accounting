# Deloitte 碳排放管理系统交接文档

交接日期：2026-11-19（Asia/Shanghai）。本文与交接 ZIP 中源码配套使用。当前交付是可交互原型，不是已完成安全加固和合规验证的生产系统。

## 1. 新 Agent 从这里开始

1. 解压交接包，阅读本文，再阅读 `workflow-ui.js`、`lca-workbench.js` 和 `build_demo.py`。
2. 在 `project/` 目录运行 `python3 -B server.py`，打开 http://127.0.0.1:5174/ 。需要 Python 3.9+，建议 3.11+；Python 仅使用标准库。
3. 本地首页实际返回 `Deloitte碳排放管理系统-交互增强版.html`。不要误把根目录 `index.html` 或旧版 HTML 当作最新完整界面。
4. 修改模块源码后运行 `python3 -B build_demo.py`，生成增强版 HTML；随后运行 `node public-carbon-site/build-public.mjs`，更新公开版 `dist/index.html`。
5. 对照公开站点检查，继续迭代当前项目。不要从零重做或覆盖 GitHub 的 main 分支。

## 2. 用户目标与明确偏好

- Deloitte 绿色品牌，白底、紧凑表格、浅绿色选中态；顶层导航保留首页、组织碳排放、产品碳排放、供应链碳排放、基础配置、帮助中心。
- 用户需要直接改代码、可演示的完整结果，不需要反复询问或仅给方案。
- 页面保持干净，去掉无价值描述；填报页以任务明细和输入为主，帮助放在小问号/感叹号点击后查看。
- 组织范围一、二、三在同一个任务入口填报，侧栏可收起；不能用大量菜单代替实际工作流。
- 供应商在供应链收集入口提交数据，经过审核后自动映射组织范围三相应任务；组织端不重复手填供应商数据。
- 恢复并保留桑基图，图表应与实际模型数据联动；点击详情不能是空弹窗。
- LCA 不是简单新增名称，必须有生命周期、边界、功能单位、阶段活动录入、排放计算和报告。
- 数据应贴近业务场景。目前使用虚构的江南流体装备、水泵、电动机、铜材和电工钢供应商演示数据，不能宣称是真实企业实测数据。

## 3. 当前交付和运行模式

| 模式 | 入口 | 保存方式 | 注意事项 |
| --- | --- | --- | --- |
| 本地服务版 | `python3 -B server.py` 后访问 `/` | 浏览器 localStorage + `/api/demo-state` 写入 SQLite | 仅绑定 127.0.0.1:5174，无身份认证 |
| 离线单文件 | 直接打开增强版 HTML | localStorage | 浏览器对 file 协议存储的支持有差异 |
| 公开静态版 | `public-carbon-site/dist/index.html` | 每个访客各自的 localStorage | 无共享数据库、无真实多用户协作 |

公开 URL：https://deloitte-carbon-management-maleo.pithymyna1.chatgpt.site

2026-11-18 发布后曾用未登录、隔离浏览器验证，HTTP 200，正确显示业务页面，无脚本异常。该记录不是对未来网络可用性的保证。

浏览器存储主键为 `deloitte-carbon-demo-v1`。公开版本禁用了 `/api/demo-state` 请求，不能把增强版 HTML 不经转换直接放到普通静态主机，否则会尝试请求不存在的 API。

数据库快照位于 `data/carbon.db`。原文件若存在，本包采用 SQLite backup API 一致性备份；不要在接手时直接覆盖另一个正在使用的数据库。数据库文件及截图可能含当前工作内容，转交前按团队数据管理要求处理。

## 4. 文件与架构

| 文件 | 职责 |
| --- | --- |
| `app.js` | 初始导航、页面渲染、基础表格、弹窗及底层 API 调用 |
| `styles.css` | 基础样式；增强版的部分附加样式位于构建脚本内 |
| `index.html` | 原始页面壳，供构建脚本替换脚本与样式，不是完整增强版入口 |
| `server.py` | Python HTTP 服务、SQLite 初始化、基础核算及 CRUD 接口 |
| `offline-demo.js` | 内嵌种子数据适配、浏览器存储、离线 API 与计算 |
| `interactive-demo.js` | 交互覆盖、保存队列及服务端 demo_state 同步 |
| `lca-workbench.js` | LCA 模型、五阶段活动、清单编辑、计算、导出及版本 |
| `scenario-data.js` | 接近业务的演示场景、报告和分析数据适配 |
| `workflow-ui.js` | 角色模拟、统一任务、审核、附件、供应商权限和版本链路 |
| `lifecycle-sankey.js` | 从 LCA 数据生成可点击的生命周期桑基图 |
| `build_demo.py` | 构建单文件；临时数据库生成种子，不读取当前业务库生成种子 |
| `Deloitte碳排放管理系统-交互增强版.html` | 最新可交互单文件产物，应由源码重新生成 |
| `Deloitte碳排放管理系统-交互演示.html` | 历史版本，仅供对照，不能替代增强版 |
| `public-carbon-site/build-public.mjs` | 复制增强版并禁用 HTTP 状态读写，产出静态版 |
| `public-carbon-site/.openai/hosting.json` | 已有 Sites 项目标识与静态目录配置 |
| `public-carbon-site/dist/index.html` | 已发布静态页面的本地副本 |
| `碳系统截图/` | 全部原始截图，作为布局和功能参考 |
| `SHA256SUMS.txt` | ZIP 内文件校验清单，位于包根目录 |

没有 npm 安装或前端打包依赖；公开版生成脚本需要支持标准 ESM 的 Node.js，建议 18+。浏览器需要 structuredClone 等现代能力。运行时 JS 依靠同一全局作用域和后加载覆盖函数，拆分 ES Modules 或调整加载顺序前须先补回归测试。

构建顺序：demoSeed → app.js（移除末尾 init）→ offline-demo → interactive-demo → lca-workbench → scenario-data → workflow-ui → lifecycle-sankey → startDemo。

启动顺序：读取本地状态 → 服务模式尝试加载服务端状态 → prepareDomainData → prepareScenarioData → prepareWorkflow → init。业务数据变更后应检查这些初始化逻辑不会覆盖已有状态。

## 5. 已实现的核心工作流

### 组织与供应链

- 统一任务页汇集范围一、二、三，支持筛选、填报明细、保存草稿、提交及审核。
- 草稿不计入排放；提交后锁定编辑，管理者可以批准或填写原因退回。
- 供应商模拟身份有自己的可见数据范围，不允许批准自己的任务。当前角色切换只是 UI 模拟，不是安全权限。
- 供应商收集数据审核通过后进入组织范围三核算；版本更新保留已批准结果和历史记录。
- 上传凭证以 base64 附着于演示状态，单文件限制约 3MB；有浏览器存储容量限制。
- 组织分析、范围三类别及报告入口可用于演示。标准选项与因子仅是原型配置，需专业复核。

关键函数：`workflowTasks`、`openUnifiedTask`、`saveUnifiedTask`、`reviewUnifiedTask`、`supplierAccess`、`submitSupplierTask`、`reviewSupplierTask`、`showSupplierVersions`。

### 产品 LCA

- 五阶段包含原材料、制造、运输、使用及报废相关活动；边界控制阶段纳入范围。
- 支持模型基本信息、功能单位/参考流、阶段活动量、单位、因子、分配与凭证，具体字段以工作台源码为准。
- 阶段排放、总量、贡献与桑基图联动；可以查看活动明细、保存模型版本并导出。
- 演示模型包括 P150 循环水泵和 IE3 1.5kW 三相异步电动机。

关键函数：`editLcaModel`、`saveLcaModel`、`editLcaLine`、`saveLcaLine`、`lineEmission`、`lcaTotals`、`recordLcaVersion`、`exportLca`、`lifecycleSankey`。

## 6. API 与数据模型

- GET `/api/demo-state` / POST `/api/demo-state`，整体 JSON 状态快照，POST 请求体为 `{"state": ...}`。只有单条 id=1，不具备并发控制。
- GET `/api/bootstrap`，读取基础库。
- GET `/api/calculate?standard=GHG_PROTOCOL&org=...&period=...`，基础排放计算。
- GET `/api/table/<table>`，基础表读取；具体映射以服务源码为准。
- POST `/api/records`、`/api/factors`、`/api/sources`、`/api/gwp`、`/api/substances`、`/api/formulas`、`/api/reports`。
- DELETE `/api/<resource>/<id>`，资源白名单在 `server.py` 中定义。

基础 SQLite 表包含 standards、scope3_categories、emission_factors、emission_sources、gwp_library、emission_substances、formulas、collection_records、reports；增强工作流主要存在 demo_state JSON 中，并非逐项写入上述关系表。不要假定基础 SQL 表能完整重建浏览器内所有模型和工作流。

## 7. GitHub 与公开部署交接

GitHub 仓库：https://github.com/super-maleo/fin-emission-accounting

当前碳管理交付分支：`codex/deloitte-carbon-system`。

- 本地提交 `cde8977`。远端上传提交 `c9166fef778e749c57f532d92e8419b2a47db215`，此前验证 14 个交付文件内容一致。
- 远端 main 为更早的 Vite/TypeScript 财务碳项目，应保留。远端分支基于 main 创建并经网页上传，本地与远端提交历史不同，不能直接强推。
- 本机 Git CLI 没有可用 GitHub 登录凭据，先前通过用户已登录 Chrome 上传；浏览器登录不等于命令行已认证。
- `public-carbon-site/` 与原始截图之前未纳入根仓库提交；本包包含其必要内容，但不包含任何 `.git/`。
- 交接包不是 Git clone，接手时应先克隆远端、核对差异再拷入需要的文件，避免覆盖远端其他内容。

Sites 项目保持以下值，不要为后续更新重新创建站点：

```json
{
  "project_id": "appgprj_6afd48b257b0819184a23e26946b81bd",
  "static": {"directory": "dist"}
}
```

- audience：public。
- 已发布版本 ID：`appgprj_6afd48b257b0819184a23e26946b81bd~appgver_e998c810ca6c8191867a6e5af97120c3`。
- 已发布源提交：`ee49b160989b5618b9baa14e01f479d3c7b8181d`。
- 已成功部署 ID：`appgdep_6afd494bca388191996a38c2ac9a4e1c`。
- 当前静态输出可以迁移到其他 HTTPS 静态主机；无需此 Sites 标识即可运行页面。
- 更新既有 Sites 需用户账号拥有站点权限。新 agent 应读取其当前环境 Sites 技能，通过 get_site 与重新获取短期源码凭据更新，不使用旧 token。
- 原流程为准备静态输出 → 同步精确源码并打包 → save_site_version → deploy_site_version → 检查终态 succeeded。后续以当前技能和工具契约为准。
- 本包不含 token、cookie、Chrome 用户目录或任何短期上传凭据。站点 ID 和部署 ID 不是登录凭据。

## 8. 验证记录与继续执行清单

此前本地回归记录覆盖 40 个路由、首页、统一范围一二三任务、批准退回、附件、供应商版本历史、供应商隔离、范围三报告、桑基图、侧栏收起及持久化，无捕获脚本异常。这是历史记录，本包未附完整自动化测试工程，不能作为本次接手后的测试结论。

建议每次修改后至少验证：

1. 新浏览器打开首页，已有 localStorage 浏览器打开首页，均无控制台异常。
2. 填报人修改范围一/二任务，保存与提交；管理者批准/退回后状态和计算正确。
3. 供应商修改材料数据并附凭证，未批准不覆盖已批准值，批准后组织范围三同步，无重复计量。
4. 各供应商可见数据边界、审核按钮及历史版本正确。
5. 新建 LCA 模型，录入五阶段活动，修改边界和参考流，总量、阶段占比和桑基图一致。
6. 报告导出和明细可打开，刷新可恢复；公开页面不请求 `/api/demo-state`。
7. 窄屏无关键控件遮挡，帮助可展开，侧栏可收起。

### 尚需工程化，不能误称已完成

- 无真实登录、服务端 RBAC、租户隔离或审批权限校验；前端角色限制可绕过。
- 本地服务器用于单机演示，静态文件处理、输入校验、上传/下载、错误处理与日志需安全审计。不要将其直接绑定公网生产使用。
- 整体 JSON 覆盖保存会出现并发丢失；没有业务对象级版本控制、事务审核和持久审计日志。
- 静态站的供应商联动是在同一浏览器演示状态中模拟，不支持不同访客账号的真实协作。
- 排放单位、换算、因子出处、适用年份/地区、GWP 版本、分配和避免重复计量须经专业校核；不能宣称 ISO 认证或合规结论。
- 报告是演示输出，不是经第三方核证报告。真实报告模板、文件类型与签章流程须补充验收。
- 附件不宜长期放 localStorage；生产需对象存储、病毒扫描、访问控制及审计。
- 页面仍有部分旧实现与覆盖层并存，后续重构应小步并保留回归，避免直接删除看似重复的代码。

## 9. 可直接交给新 Agent 的指令

> 请接手此交接包中的 Deloitte 碳排放管理系统。先阅读 HANDOVER.md 并检查 project/ 源码。用户要求保留当前导航与绿色样式，重点保持简洁的统一范围一二三填报、供应商收集审核到组织范围三的自动联动、完整 LCA 生命周期录入和可点击桑基图。直接实施并验证，不要只给方案。当前公开版是浏览器本地数据原型，不能声称已有真实多用户后台。修改模块后重建增强版及公开 dist，使用既有 Sites 项目更新发布，保留 GitHub main，禁止未经确认强推历史。先核对当前状态再继续用户的新需求。
