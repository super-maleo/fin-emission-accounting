import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Upload,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CockpitOverview,
  CoverageMode,
  DataSourceItem,
  DraftPortfolioResponse,
  ImportPreview,
  IndustryTop10Row,
  IngestionTask,
  KnowledgeBaseRow,
  PortfolioRecord,
  PortfolioResultResponse,
  ProductCardSummary,
  ProductDetailDrawer,
  ProductSearchResult,
  QueryHistoryItem,
  RawFileQueueItem,
  ReviewQueueItem,
  RuleVersionRecord,
  RulesInfo,
  SecurityQueryCard,
  UserDashboardResponse,
} from "./types";

type AccountMode = "user" | "admin";
type UserView = "dashboard" | "query" | "compose" | "cockpit";
type AdminView = "data" | "knowledge" | "review" | "rules";
type QueryMode = "security" | "product";
type ImportMode = "manual" | "excel" | "api";

const SOURCE_COLORS = ["#79b600", "#b8d957", "#d5e89b", "#8aa07b"];
const QUALITY_COLORS = ["#4d8d00", "#79b600", "#b8d957", "#d7e5bf", "#eef6dd"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function percent(value: number) {
  return `${formatNumber(value, 2)}%`;
}

function Panel(props: { title: string; children: React.ReactNode; extra?: React.ReactNode; tight?: boolean }) {
  return (
    <section className={props.tight ? "panel panel-tight" : "panel"}>
      <div className="panel-head">
        <h3>{props.title}</h3>
        {props.extra ? <div className="panel-extra">{props.extra}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function Metric(props: { label: string; value: string; sub?: string; tone?: "normal" | "warn" }) {
  return (
    <div className={`metric ${props.tone === "warn" ? "metric-warn" : ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      {props.sub ? <em>{props.sub}</em> : null}
    </div>
  );
}

function EmptyState(props: { icon?: React.ReactNode; title: string; text: string }) {
  return (
    <div className="empty-state">
      {props.icon ? <div className="empty-icon">{props.icon}</div> : null}
      <strong>{props.title}</strong>
      <span>{props.text}</span>
    </div>
  );
}

function StatusPill(props: { children: React.ReactNode; tone?: "ok" | "warn" | "neutral" }) {
  return <span className={`status-pill ${props.tone ?? "neutral"}`}>{props.children}</span>;
}

export default function App() {
  const [accountMode, setAccountMode] = useState<AccountMode>("user");
  const [userView, setUserView] = useState<UserView>("dashboard");
  const [adminView, setAdminView] = useState<AdminView>("data");
  const [mode, setMode] = useState<CoverageMode>("strict");
  const [queryMode, setQueryMode] = useState<QueryMode>("security");
  const [importMode, setImportMode] = useState<ImportMode>("manual");
  const [toast, setToast] = useState("");

  const [dashboard, setDashboard] = useState<UserDashboardResponse | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<ProductCardSummary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("PROD-001");
  const [productDetail, setProductDetail] = useState<ProductDetailDrawer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const [securityKeyword, setSecurityKeyword] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [securityResults, setSecurityResults] = useState<SecurityQueryCard[]>([]);
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [selectedSecurityIds, setSelectedSecurityIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [portfolios, setPortfolios] = useState<PortfolioRecord[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("PORT-001");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [draftResponse, setDraftResponse] = useState<DraftPortfolioResponse | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioResultResponse | null>(null);

  const [cockpitOverview, setCockpitOverview] = useState<CockpitOverview | null>(null);
  const [cockpitRows, setCockpitRows] = useState<IndustryTop10Row[]>([]);
  const [marketFilter, setMarketFilter] = useState("全部交易所");
  const [industryFilter, setIndustryFilter] = useState("全部行业");
  const [yearFilter, setYearFilter] = useState("2024");

  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [tasks, setTasks] = useState<IngestionTask[]>([]);
  const [rawFiles, setRawFiles] = useState<RawFileQueueItem[]>([]);
  const [knowledgeRows, setKnowledgeRows] = useState<KnowledgeBaseRow[]>([]);
  const [selectedKnowledgeRow, setSelectedKnowledgeRow] = useState<KnowledgeBaseRow | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewQueueItem[]>([]);
  const [rules, setRules] = useState<RulesInfo | null>(null);
  const [versions, setVersions] = useState<RuleVersionRecord[]>([]);
  const [knowledgeDomain, setKnowledgeDomain] = useState("all");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    fetchJson<UserDashboardResponse>("/api/user/dashboard").then((data) => {
      setDashboard(data);
      setFavoriteProducts(data.favoriteProducts);
      setHistory(data.history);
    });
    fetchJson<SecurityQueryCard[]>("/api/query/securities?q=").then((items) => {
      setSecurityResults(items);
      setSelectedSecurityIds(items.slice(0, 3).map((item) => item.enterpriseId));
    });
    fetchJson<ProductSearchResult[]>("/api/query/products?q=").then((items) => {
      setProductResults(items);
      setSelectedProductIds(items.slice(0, 1).map((item) => item.productId));
    });
    fetchJson<PortfolioRecord[]>("/api/portfolios").then(setPortfolios);
    fetchJson<CockpitOverview>("/api/cockpit/overview").then(setCockpitOverview);
    fetchJson<IndustryTop10Row[]>("/api/cockpit/top10").then(setCockpitRows);
    fetchJson<DataSourceItem[]>("/api/admin/data-sources").then(setDataSources);
    fetchJson<IngestionTask[]>("/api/admin/ingestion-tasks").then(setTasks);
    fetchJson<RawFileQueueItem[]>("/api/admin/raw-files").then(setRawFiles);
    fetchJson<ReviewQueueItem[]>("/api/admin/review-queue").then(setReviewRows);
    fetchJson<RulesInfo>("/api/admin/rules/current").then(setRules);
    fetchJson<RuleVersionRecord[]>("/api/admin/rules/versions").then(setVersions);
  }, []);

  useEffect(() => {
    fetchJson<ProductDetailDrawer>(`/api/products/${selectedProductId}/detail`).then(setProductDetail);
  }, [selectedProductId]);

  useEffect(() => {
    fetchJson<PortfolioResultResponse>(`/api/portfolios/${selectedPortfolioId}/result?mode=${mode}`).then(setPortfolioResult);
  }, [selectedPortfolioId, mode]);

  useEffect(() => {
    fetchJson<KnowledgeBaseRow[]>(`/api/admin/knowledge-base/${knowledgeDomain}`).then((rows) => {
      setKnowledgeRows(rows);
      setSelectedKnowledgeRow(rows[0] ?? null);
    });
  }, [knowledgeDomain]);

  async function runSecuritySearch() {
    const items = await fetchJson<SecurityQueryCard[]>(`/api/query/securities?q=${encodeURIComponent(securityKeyword)}`);
    setSecurityResults(items);
    setSelectedSecurityIds(items.slice(0, 4).map((item) => item.enterpriseId));
    notify(`已返回 ${items.length} 条证券结果`);
  }

  async function runProductSearch() {
    const items = await fetchJson<ProductSearchResult[]>(`/api/query/products?q=${encodeURIComponent(productKeyword)}`);
    setProductResults(items);
    setSelectedProductIds(items.slice(0, 2).map((item) => item.productId));
    notify(`已返回 ${items.length} 条产品结果`);
  }

  async function handleFavorite() {
    await fetchJson("/api/user/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ securities: selectedSecurityIds, products: selectedProductIds }),
    });
    notify("已加入关注，可在我的看板查看");
  }

  async function handleImportPreview() {
    setImportPreview(await fetchJson<ImportPreview>("/api/portfolios/import", { method: "POST" }));
    notify("组合文件校验完成");
  }

  async function handleDraft() {
    setDraftResponse(await fetchJson<DraftPortfolioResponse>("/api/portfolios/draft", { method: "POST" }));
    notify("组合草稿已创建");
  }

  async function handleCalculate() {
    await fetchJson(`/api/portfolios/${selectedPortfolioId}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setPortfolioResult(await fetchJson<PortfolioResultResponse>(`/api/portfolios/${selectedPortfolioId}/result?mode=${mode}`));
    notify("组合核算已完成，结果已刷新");
  }

  async function handleReviewAction(id: string, action: "approve" | "reject") {
    await fetchJson(`/api/admin/review-queue/${id}/${action}`, { method: "POST" });
    setReviewRows((rows) => rows.map((row) => (row.reviewId === id ? { ...row, status: action === "approve" ? "已通过" : "已驳回" } : row)));
    notify(action === "approve" ? "审核已通过并写入发布队列" : "已驳回并保留审计记录");
  }

  const selectedSecurityCards = useMemo(
    () => securityResults.filter((item) => selectedSecurityIds.includes(item.enterpriseId)),
    [securityResults, selectedSecurityIds],
  );

  const selectedProductCards = useMemo(
    () => productResults.filter((item) => selectedProductIds.includes(item.productId)),
    [productResults, selectedProductIds],
  );

  const industries = useMemo(() => ["全部行业", ...Array.from(new Set(cockpitRows.map((row) => row.industry)))], [cockpitRows]);

  const filteredCockpitRows = useMemo(() => {
    return cockpitRows.filter((item) => {
      const marketPass = marketFilter === "全部交易所" || (marketFilter === "A股" ? item.enterpriseName !== "区域公用事业集团" : true);
      const industryPass = industryFilter === "全部行业" || item.industry === industryFilter;
      return marketPass && industryPass;
    });
  }, [cockpitRows, industryFilter, marketFilter]);

  const cockpitIndustryBars = useMemo(() => {
    const bucket = new Map<string, { industry: string; intensity: number; emission: number; count: number }>();
    filteredCockpitRows.forEach((row) => {
      const current = bucket.get(row.industry) ?? { industry: row.industry, intensity: 0, emission: 0, count: 0 };
      current.intensity += row.intensity;
      current.emission += row.scope12;
      current.count += 1;
      bucket.set(row.industry, current);
    });
    return Array.from(bucket.values())
      .map((item) => ({ ...item, intensity: item.intensity / item.count }))
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 10);
  }, [filteredCockpitRows]);

  const portfolioChartRows = useMemo(() => {
    return (portfolioResult?.overview.topContributors ?? []).map((item) => ({
      name: item.enterpriseName,
      value: item.financedEmission,
    }));
  }, [portfolioResult]);

  const methodRows = useMemo(() => {
    return Object.entries(portfolioResult?.overview.methodDistribution ?? {}).map(([name, value]) => ({ name, value }));
  }, [portfolioResult]);

  const qualityRows = useMemo(() => {
    return Object.entries(portfolioResult?.overview.qualityDistribution ?? {}).map(([name, value]) => ({ name, value }));
  }, [portfolioResult]);

  const nav = accountMode === "user"
    ? [
        { key: "dashboard", label: "我的看板", icon: <Star size={16} /> },
        { key: "query", label: "我的查询", icon: <Search size={16} /> },
        { key: "compose", label: "组合创建", icon: <FileSpreadsheet size={16} /> },
        { key: "cockpit", label: "碳排驾驶舱", icon: <BarChart3 size={16} /> },
      ]
    : [
        { key: "data", label: "数据接入", icon: <Database size={16} /> },
        { key: "knowledge", label: "知识库运营", icon: <ShieldCheck size={16} /> },
        { key: "review", label: "审核发布", icon: <CheckCircle2 size={16} /> },
        { key: "rules", label: "规则版本", icon: <RefreshCw size={16} /> },
      ];

  const renderUserDashboard = () => (
    <div className={drawerOpen ? "page-grid with-drawer" : "page-grid"}>
      <div className="page-stack">
        <Panel
          title="我的看板"
          extra={
            <div className="toolbar-row compact">
              <input placeholder="搜索关注产品" value={productKeyword} onChange={(event) => setProductKeyword(event.target.value)} />
              <span className="meta-chip">数据日期 {dashboard?.dataDate ?? "-"}</span>
              <span className="meta-chip">规则 {dashboard?.ruleVersion ?? "-"}</span>
            </div>
          }
        >
          <div className="product-strip">
            {favoriteProducts.map((item) => (
              <button
                key={item.productId}
                className={selectedProductId === item.productId ? "product-card active" : "product-card"}
                onClick={() => {
                  setSelectedProductId(item.productId);
                  setDrawerOpen(true);
                }}
              >
                <div className="product-card-head">
                  <div>
                    <strong>{item.productName}</strong>
                    <span>{item.productType} · {item.managerName}</span>
                  </div>
                  <StatusPill tone={item.status.includes("完成") ? "ok" : "warn"}>{item.status}</StatusPill>
                </div>
                <div className="product-card-grid">
                  <Metric label="总融资排放" value={formatNumber(item.totalFinancedEmission)} sub="tCO2e" />
                  <Metric label="碳排强度" value={formatNumber(item.financedEmissionIntensity)} sub="tCO2e/百万元" />
                  <Metric label="披露覆盖率" value={percent(item.disclosureCoverage)} />
                  <Metric label="最近核算" value={item.lastCalculatedAt} />
                </div>
                <div className="card-actions">
                  <span>点击查看详情</span>
                  <ArrowRight size={15} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="历史查询列表">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>对象类型</th>
                  <th>名称/代码</th>
                  <th>查询时间</th>
                  <th>关注状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.historyId}>
                    <td>{item.objectType}</td>
                    <td className="align-left">
                      <strong>{item.name}</strong>
                      <div className="cell-sub">{item.code}</div>
                    </td>
                    <td>{item.queriedAt}</td>
                    <td>{item.isFavorite ? <StatusPill tone="ok">已关注</StatusPill> : <StatusPill>未关注</StatusPill>}</td>
                    <td>
                      <button className="table-action" onClick={() => notify("已打开最近查询")}>
                        <Eye size={14} /> 重新查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {drawerOpen ? (
        <aside className="drawer">
          <div className="drawer-panel">
            <div className="drawer-head">
              <div>
                <span>产品详情</span>
                <strong>{productDetail?.productName ?? "-"}</strong>
              </div>
              <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="收起详情">
                <X size={17} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="detail-top">
                <div><span>产品类型</span><strong>{productDetail?.productType ?? "-"}</strong></div>
                <div><span>管理人</span><strong>{productDetail?.managerName ?? "-"}</strong></div>
                <div><span>报告日期</span><strong>{productDetail?.reportDate ?? "-"}</strong></div>
              </div>
              <div className="detail-metrics">
                <Metric label="总融资排放" value={formatNumber(productDetail?.totalFinancedEmission ?? 0)} />
                <Metric label="融资排放强度" value={formatNumber(productDetail?.financedEmissionIntensity ?? 0)} />
                <Metric label="金额覆盖率" value={percent(productDetail?.investedAmountCoverage ?? 0)} />
                <Metric label="披露覆盖率" value={percent(productDetail?.disclosureCoverage ?? 0)} />
              </div>
              <div className="subsection-title">Top 持仓贡献</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(productDetail?.topContributors ?? []).map((item) => ({ name: item.enterpriseName, value: item.financedEmission }))} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="value" fill="#79b600" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="subsection-title">口径说明</div>
              <ul className="plain-list compact-list">
                {(productDetail?.rationale ?? []).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button className="primary-btn full-btn" onClick={() => notify("产品摘要已生成")}>
                <Download size={15} /> 下载产品摘要
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );

  const renderUserQuery = () => (
    <div className="page-stack">
      <Panel
        title="我的查询"
        extra={
          <div className="toolbar-row">
            <div className="segmented">
              <button className={queryMode === "security" ? "active" : ""} onClick={() => setQueryMode("security")}>证券查询</button>
              <button className={queryMode === "product" ? "active" : ""} onClick={() => setQueryMode("product")}>产品查询</button>
            </div>
            <input
              placeholder={queryMode === "security" ? "输入证券名称或代码" : "输入产品名称或代码"}
              value={queryMode === "security" ? securityKeyword : productKeyword}
              onChange={(event) => (queryMode === "security" ? setSecurityKeyword(event.target.value) : setProductKeyword(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void (queryMode === "security" ? runSecuritySearch() : runProductSearch());
              }}
            />
            <button className="primary-btn" onClick={() => void (queryMode === "security" ? runSecuritySearch() : runProductSearch())}>
              <Search size={15} /> 查询
            </button>
          </div>
        }
      >
        <div className="selector-list">
          {(queryMode === "security" ? securityResults : productResults).map((item) => {
            const id = "enterpriseId" in item ? item.enterpriseId : item.productId;
            const selected = queryMode === "security" ? selectedSecurityIds.includes(id) : selectedProductIds.includes(id);
            return (
              <button
                key={id}
                className={selected ? "selector-chip active" : "selector-chip"}
                onClick={() => {
                  if (queryMode === "security") {
                    setSelectedSecurityIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
                  } else {
                    setSelectedProductIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
                  }
                }}
              >
                {"enterpriseName" in item ? item.enterpriseName : item.productName}
              </button>
            );
          })}
        </div>
        <div className="query-actions end">
          <button className="ghost-btn" onClick={handleFavorite}><Star size={15} /> 批量加入关注</button>
          <button className="ghost-btn" onClick={() => notify("已添加到组合草稿")}><FileSpreadsheet size={15} /> 加入组合</button>
          <button className="primary-btn" onClick={() => notify("查询结果已导出")}><Download size={15} /> 批量导出</button>
        </div>
      </Panel>

      <Panel title="查询结果">
        {(queryMode === "security" && selectedSecurityCards.length === 0) || (queryMode === "product" && selectedProductCards.length === 0) ? (
          <EmptyState icon={<Search size={22} />} title="请选择查询对象" text="支持单个或多个证券/产品横向查看。" />
        ) : (
          <div className="horizontal-cards">
            {queryMode === "security"
              ? selectedSecurityCards.map((item) => (
                  <div key={item.enterpriseId} className="security-card">
                    <div className="security-card-title">
                      <div>
                        <strong>{item.enterpriseName}</strong>
                        <span>{item.securityCode} · {item.industry}</span>
                      </div>
                      <StatusPill tone={item.qualityScore <= 2 ? "ok" : item.qualityScore >= 4 ? "warn" : "neutral"}>质量 {item.qualityScore}</StatusPill>
                    </div>
                    <div className="security-kpis">
                      <Metric label="Scope 1+2" value={formatNumber(item.scope12, 0)} sub="tCO2e" />
                      <Metric label="碳排强度" value={formatNumber(item.intensity)} sub="tCO2e/百万元" />
                    </div>
                    <div className="security-card-body">
                      <div><label>数据来源</label><strong>{item.sourceType}</strong></div>
                      <div><label>当前口径</label><strong>{mode === "strict" ? "严格口径" : "最大覆盖"}</strong></div>
                    </div>
                    <div className="card-actions">
                      <button className="table-action" onClick={() => notify(`${item.enterpriseName} 已加入关注`)}><Star size={14} /> 关注</button>
                      <button className="table-action" onClick={() => notify(`${item.enterpriseName} 已加入组合草稿`)}><FileSpreadsheet size={14} /> 加入组合</button>
                    </div>
                  </div>
                ))
              : selectedProductCards.map((item) => (
                  <div key={item.productId} className="security-card">
                    <div className="security-card-title">
                      <div>
                        <strong>{item.productName}</strong>
                        <span>{item.productType} · {item.managerName}</span>
                      </div>
                      <StatusPill tone="ok">{item.status}</StatusPill>
                    </div>
                    <div className="security-card-body">
                      <div><label>产品编码</label><strong>{item.productId}</strong></div>
                      <div><label>结果状态</label><strong>{item.status}</strong></div>
                    </div>
                    <div className="card-actions">
                      <button className="table-action" onClick={() => notify(`${item.productName} 已加入关注`)}><Star size={14} /> 关注</button>
                      <button className="table-action" onClick={() => {
                        setSelectedProductId(item.productId);
                        setUserView("dashboard");
                        setDrawerOpen(true);
                      }}><Eye size={14} /> 查看详情</button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </Panel>

      <Panel title="结果说明">
        <div className="explain-grid">
          <div><strong>当前查询口径</strong><p>{mode === "strict" ? "严格口径仅纳入披露值与审核通过的结构化公开值。" : "最大覆盖允许模型估算值与行业默认因子补齐。"}</p></div>
          <div><strong>数据来源顺序</strong><p>披露值 &gt; 结构化公开值 &gt; 模型估算值 &gt; EEIO/行业默认值。</p></div>
          <div><strong>质量等级</strong><p>采用 PCAF 质量分层，1 为披露或高可信数据，5 为默认因子补齐。</p></div>
        </div>
      </Panel>
    </div>
  );

  const renderUserCompose = () => (
    <div className="page-stack">
      <Panel
        title="组合创建"
        extra={
          <div className="segmented">
            <button className={importMode === "manual" ? "active" : ""} onClick={() => setImportMode("manual")}>手工录入</button>
            <button className={importMode === "excel" ? "active" : ""} onClick={() => setImportMode("excel")}>Excel 导入</button>
            <button className={importMode === "api" ? "active" : ""} onClick={() => setImportMode("api")}>接口对接</button>
          </div>
        }
      >
        <div className="compose-grid">
          <div className="form-block">
            <div className="block-title">产品基本信息</div>
            <label>产品名称<input defaultValue="绿色转型精选混合" /></label>
            <label>产品类型<select defaultValue="公募基金"><option>公募基金</option><option>保险理财</option><option>资管计划</option></select></label>
            <label>管理人/机构<input defaultValue="示例资管" /></label>
            <label>截止日期<input type="date" defaultValue="2026-03-25" /></label>
            <label>币种<select defaultValue="CNY"><option>CNY</option></select></label>
          </div>
          <div className="form-block">
            <div className="block-title">{importMode === "manual" ? "持仓录入" : importMode === "excel" ? "Excel 文件导入" : "接口对接配置"}</div>
            {importMode === "manual" ? (
              <>
                <label>证券代码<input defaultValue="300750.SZ" /></label>
                <label>证券名称<input defaultValue="新能源电池龙头" /></label>
                <label>资产类别<select defaultValue="股票"><option>股票</option><option>企业债</option><option>对公贷款</option></select></label>
                <label>持仓比例<input defaultValue="18%" /></label>
                <label>持仓金额<input defaultValue="47200000" /></label>
                <label>敞口金额<input defaultValue="47200000" /></label>
              </>
            ) : importMode === "excel" ? (
              <div className="upload-box">
                <Upload size={26} />
                <strong>组合模板字段</strong>
                <span>证券代码、证券名称、资产类别、持仓比例、持仓金额、敞口金额</span>
                <button className="ghost-btn" onClick={handleImportPreview}>读取模拟模板</button>
              </div>
            ) : (
              <>
                <label>接口名称<input defaultValue="内部持仓系统 API" /></label>
                <label>同步频率<select defaultValue="每日"><option>每日</option><option>每周</option><option>手动</option></select></label>
                <label>字段映射模板<select defaultValue="基金持仓标准模板"><option>基金持仓标准模板</option><option>保险理财持仓模板</option></select></label>
              </>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="校验与映射"
        extra={
          <div className="query-actions">
            <button className="ghost-btn" onClick={handleDraft}><FileSpreadsheet size={15} /> 新建草稿</button>
            <button className="primary-btn" onClick={handleImportPreview}><CheckCircle2 size={15} /> 校验导入</button>
          </div>
        }
      >
        {draftResponse ? <div className="draft-banner">{draftResponse.message}</div> : null}
        {importPreview ? (
          <div className="mapping-grid">
            <div><span>识别列</span><strong>{importPreview.columns.join(" / ")}</strong></div>
            <div><span>映射字段</span><strong>{importPreview.mappedFields.join(" / ")}</strong></div>
            <div><span>导入行数</span><strong>{importPreview.rowCount}</strong></div>
            <div><span>校验提示</span><strong>{importPreview.validationErrors.join("；")}</strong></div>
          </div>
        ) : (
          <EmptyState icon={<FileSpreadsheet size={24} />} title="等待组合数据" text="校验后展示主键映射、字段缺失和错误行定位。" />
        )}
      </Panel>

      <Panel
        title="核算配置与结果"
        extra={<button className="primary-btn" onClick={handleCalculate}><RefreshCw size={15} /> 发起核算</button>}
      >
        <div className="config-row">
          <label>口径模式<select value={mode} onChange={(event) => setMode(event.target.value as CoverageMode)}><option value="strict">严格口径</option><option value="maximize">最大覆盖</option></select></label>
          <label>计算日期<input type="date" defaultValue="2026-03-25" /></label>
          <label>资产范围<select defaultValue="全部"><option>全部</option><option>股票</option><option>企业债</option><option>对公贷款</option></select></label>
          <label>选择组合<select value={selectedPortfolioId} onChange={(event) => setSelectedPortfolioId(event.target.value)}>{portfolios.map((item) => <option key={item.portfolioId} value={item.portfolioId}>{item.portfolioName}</option>)}</select></label>
        </div>
        <div className="result-layout">
          <div className="metric-row four">
            <Metric label="总融资排放" value={formatNumber(portfolioResult?.overview.totalFinancedEmission ?? 0)} />
            <Metric label="融资排放强度" value={formatNumber(portfolioResult?.overview.financedEmissionIntensity ?? 0)} />
            <Metric label="披露覆盖率" value={percent(portfolioResult?.overview.disclosureCoverage ?? 0)} />
            <Metric label="高碳行业暴露" value={percent(portfolioResult?.overview.highCarbonExposureShare ?? 0)} />
          </div>
          <div className="chart-duo">
            <div className="chart-box">
              <div className="chart-title">Top 持仓贡献</div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={portfolioChartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="value" fill="#79b600" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box">
              <div className="chart-title">方法与质量分布</div>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={methodRows.length ? methodRows : qualityRows} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82}>
                    {(methodRows.length ? methodRows : qualityRows).map((_, index) => <Cell key={index} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>证券代码</th><th>名称</th><th>资产类别</th><th>敞口金额</th><th>企业排放量</th><th>归因分母</th><th>融资排放</th><th>来源</th><th>质量</th></tr>
              </thead>
              <tbody>
                {(portfolioResult?.rows ?? []).map((row) => (
                  <tr key={row.holdingId}>
                    <td>{row.securityCode}</td>
                    <td>{row.enterpriseName}</td>
                    <td>{row.assetCategory}</td>
                    <td>{formatNumber(row.exposureAmount, 0)}</td>
                    <td>{formatNumber(row.enterpriseEmission, 0)}</td>
                    <td>{row.denominatorType}</td>
                    <td>{formatNumber(row.financedEmission)}</td>
                    <td>{row.sourceType}</td>
                    <td>{row.qualityScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );

  const renderUserCockpit = () => (
    <div className="page-stack">
      <Panel
        title="碳排驾驶舱"
        extra={
          <div className="toolbar-row">
            <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
              <option>全部交易所</option>
              <option>A股</option>
              <option>沪深300</option>
              <option>中证500</option>
            </select>
            <select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}>
              {industries.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
        }
      >
        <div className="metric-row five">
          <Metric label="总融资排放" value={formatNumber(cockpitOverview?.totalFinancedEmission ?? 0)} />
          <Metric label="总碳排强度" value={formatNumber(cockpitOverview?.totalEmissionIntensity ?? 0)} />
          <Metric label="已覆盖企业数" value={String(cockpitOverview?.coveredEnterpriseCount ?? 0)} />
          <Metric label="已披露企业数" value={String(cockpitOverview?.disclosedEnterpriseCount ?? 0)} />
          <Metric label="平均质量等级" value={formatNumber(cockpitOverview?.averageQualityScore ?? 0)} />
        </div>
      </Panel>

      <Panel title="分行业 TOP10">
        <div className="cockpit-chart-grid">
          <div className="chart-box wide">
            <div className="chart-title">行业碳排强度与规模联动</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cockpitIndustryBars}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="industry" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="intensity" name="平均碳排强度" fill="#79b600" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="count" name="企业数量" stroke="#4d8d00" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rank-panel">
            <div className="chart-title">行业碳排强度排行榜</div>
            {cockpitIndustryBars.map((item) => (
              <div key={item.industry} className="bar-row">
                <span className="bar-label">{item.industry}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(item.intensity / Math.max(cockpitIndustryBars[0]?.intensity ?? 1, 1), 1) * 100}%` }} /></div>
                <span className="bar-value">{formatNumber(item.intensity)}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="公开企业排行榜">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th><th>企业名称</th><th>行业</th><th>企业规模指标</th><th>Scope 1+2</th><th>碳排强度</th><th>数据来源</th><th>质量等级</th>
              </tr>
            </thead>
            <tbody>
              {filteredCockpitRows.map((item) => (
                <tr key={`${item.rank}-${item.enterpriseName}`}>
                  <td>{item.rank}</td>
                  <td className="align-left"><strong>{item.enterpriseName}</strong></td>
                  <td>{item.industry}</td>
                  <td>{formatNumber(item.scaleMetric, 0)}</td>
                  <td>{formatNumber(item.scope12, 0)}</td>
                  <td>{formatNumber(item.intensity)}</td>
                  <td>{item.sourceType}</td>
                  <td>{item.qualityScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  const renderAdmin = () => {
    if (adminView === "data") {
      return (
        <div className="page-stack">
          <Panel title="数据接入总览" extra={<button className="primary-btn" onClick={() => notify("已触发同步检查")}><RefreshCw size={15} /> 同步检查</button>}>
            <div className="admin-kpis">
              <Metric label="已配置数据源" value={String(dataSources.length)} />
              <Metric label="运行中任务" value={String(tasks.filter((task) => task.status.includes("运行")).length)} />
              <Metric label="待审核文件" value={String(rawFiles.reduce((sum, file) => sum + file.pendingReviews, 0))} tone="warn" />
              <Metric label="异常任务" value={String(tasks.filter((task) => task.errorMessage).length)} tone="warn" />
            </div>
          </Panel>
          <Panel title="数据源状态">
            <div className="table-wrap">
              <table>
                <thead><tr><th>来源</th><th>类型</th><th>频率</th><th>覆盖范围</th><th>接口状态</th><th>操作</th></tr></thead>
                <tbody>{dataSources.map((item) => <tr key={item.sourceId}><td className="align-left">{item.name}</td><td>{item.sourceType}</td><td>{item.updateFrequency}</td><td>{item.coverage}</td><td><StatusPill tone={item.status.includes("正常") ? "ok" : "warn"}>{item.status}</StatusPill></td><td><button className="table-action" onClick={() => notify(`${item.name} 已重跑`)}><RefreshCw size={14} /> 重跑</button></td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <Panel title="同步任务与原始文件">
            <div className="split-tables">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>任务</th><th>状态</th><th>最近运行</th><th>下次运行</th></tr></thead>
                  <tbody>{tasks.map((item) => <tr key={item.taskId}><td>{item.sourceName}</td><td>{item.status}</td><td>{item.lastRunAt}</td><td>{item.nextRunAt}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>文件名</th><th>类型</th><th>解析状态</th><th>待审核</th></tr></thead>
                  <tbody>{rawFiles.map((item) => <tr key={item.fileId}><td>{item.fileName}</td><td>{item.fileType}</td><td>{item.parseStatus}</td><td>{item.pendingReviews}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>
      );
    }

    if (adminView === "knowledge") {
      return (
        <div className="page-grid with-drawer">
          <Panel
            title="知识库运营"
            extra={<select value={knowledgeDomain} onChange={(event) => setKnowledgeDomain(event.target.value)}><option value="all">全部</option><option value="企业排放知识库">企业排放知识库</option><option value="财务/EVIC 知识库">财务/EVIC 知识库</option><option value="因子库">因子库</option></select>}
          >
            <div className="table-wrap">
              <table>
                <thead><tr><th>知识域</th><th>对象</th><th>标准化值</th><th>来源</th><th>质量</th><th>版本</th><th>审核状态</th></tr></thead>
                <tbody>{knowledgeRows.map((item) => <tr key={item.rowId} className={selectedKnowledgeRow?.rowId === item.rowId ? "row-active" : ""} onClick={() => setSelectedKnowledgeRow(item)}><td>{item.domain}</td><td className="align-left"><strong>{item.targetName}</strong><div className="cell-sub">{item.year}</div></td><td>{item.standardizedValue}</td><td>{item.sourceType}</td><td>{item.qualityScore}</td><td>{item.versionTag}</td><td>{item.reviewStatus}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <aside className="drawer">
            <div className="drawer-panel">
              <div className="drawer-head"><div><span>血缘与依据</span><strong>{selectedKnowledgeRow?.targetName ?? "请选择记录"}</strong></div></div>
              <div className="drawer-body">
                <Metric label="知识域" value={selectedKnowledgeRow?.domain ?? "-"} />
                <Metric label="版本" value={selectedKnowledgeRow?.versionTag ?? "-"} />
                <Metric label="审核状态" value={selectedKnowledgeRow?.reviewStatus ?? "-"} />
                <div className="subsection-title">数据血缘</div>
                <ul className="plain-list compact-list">{(selectedKnowledgeRow?.lineage ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </aside>
        </div>
      );
    }

    if (adminView === "review") {
      return (
        <Panel title="审核发布中心">
          <div className="review-board">
            {(["待审核抽取", "待确认估算", "待发布变更"] as const).map((queue) => (
              <div key={queue} className="review-column">
                <div className="review-column-head">{queue}</div>
                {reviewRows.filter((row) => row.queueType === queue).map((item) => (
                  <div key={item.reviewId} className="review-item">
                    <strong>{item.targetName}</strong>
                    <span>来源：{item.sourceName}</span>
                    <span>方法：{item.suggestedMethod}</span>
                    <span>因子：{item.suggestedFactor}</span>
                    <StatusPill tone={item.status.includes("已") ? "ok" : "warn"}>{item.status}</StatusPill>
                    <div className="card-actions">
                      <button className="table-action" onClick={() => void handleReviewAction(item.reviewId, "approve")}>通过</button>
                      <button className="table-action danger" onClick={() => void handleReviewAction(item.reviewId, "reject")}>驳回</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    return (
      <div className="page-stack">
        <Panel title="当前规则">
          <div className="rule-summary">
            <Metric label="规则版本" value={rules?.ruleVersion ?? "-"} />
            <Metric label="因子版本" value={rules?.factorVersion ?? "-"} />
            <Metric label="映射版本" value={rules?.mappingVersion ?? "-"} />
            <Metric label="资产类别" value={(rules?.supportedAssets ?? []).join(" / ")} />
          </div>
          <ul className="plain-list rule-list">{(rules?.description ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="版本列表">
          <div className="table-wrap">
            <table>
              <thead><tr><th>类型</th><th>名称</th><th>生效日期</th><th>状态</th><th>说明</th></tr></thead>
              <tbody>{versions.map((item) => <tr key={item.versionId}><td>{item.versionType}</td><td>{item.name}</td><td>{item.effectiveDate}</td><td><StatusPill tone={item.status.includes("当前") ? "ok" : "neutral"}>{item.status}</StatusPill></td><td>{item.notes}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-symbol">C</div>
          <div>
            <div className="brand-title">投融资碳核算平台</div>
            <div className="brand-subtitle">Financed Emissions Accounting</div>
          </div>
        </div>
        <div className="topbar-right">
          <select value={accountMode} onChange={(event) => setAccountMode(event.target.value as AccountMode)}>
            <option value="user">前台用户账号</option>
            <option value="admin">后台管理员账号</option>
          </select>
          <span className="account-badge">{accountMode === "user" ? <Star size={14} /> : <UserCog size={14} />}{accountMode === "user" ? "test" : "admin"}</span>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-mode">{accountMode === "user" ? "用户侧" : "管理侧"}</div>
          <div className="sidebar-group">
            {nav.map((item) => {
              const active = accountMode === "user" ? userView === item.key : adminView === item.key;
              return (
                <button
                  key={item.key}
                  className={active ? "side-link active" : "side-link"}
                  onClick={() => (accountMode === "user" ? setUserView(item.key as UserView) : setAdminView(item.key as AdminView))}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="main">
          {accountMode === "user" && userView === "dashboard" ? renderUserDashboard() : null}
          {accountMode === "user" && userView === "query" ? renderUserQuery() : null}
          {accountMode === "user" && userView === "compose" ? renderUserCompose() : null}
          {accountMode === "user" && userView === "cockpit" ? renderUserCockpit() : null}
          {accountMode === "admin" ? renderAdmin() : null}
        </main>
      </div>
      {toast ? <div className="toast"><CheckCircle2 size={16} />{toast}</div> : null}
    </div>
  );
}
