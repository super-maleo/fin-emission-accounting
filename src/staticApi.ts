import { calculatePortfolio } from "../server/engine";
import {
  cockpitSeed,
  dataSourceSeed,
  emissionSeed,
  enterpriseSeed,
  evidenceSeed,
  financialSeed,
  holdingsSeed,
  knowledgeBaseSeed,
  productSeed,
  rawFileSeed,
  reviewQueueSeed,
  ruleVersionSeed,
  taskSeed,
} from "../server/seed";
import type {
  CoverageMode,
  EnterpriseDetail,
  Holding,
  ImportPreview,
  PortfolioRecord,
  ProductCardSummary,
  ProductDetailDrawer,
  ProductSearchResult,
  QueryHistoryItem,
  RulesInfo,
  SecurityQueryCard,
  UserDashboardResponse,
} from "./types";

const history: QueryHistoryItem[] = [
  { historyId: "HIS-001", objectType: "产品", name: "绿色转型精选混合", code: "PROD-001", queriedAt: "2026-03-24 14:10", isFavorite: true },
  { historyId: "HIS-002", objectType: "证券", name: "新能源电池龙头", code: "300750.SZ", queriedAt: "2026-03-24 11:48", isFavorite: true },
  { historyId: "HIS-003", objectType: "证券", name: "区域公用事业集团", code: "600900.SH", queriedAt: "2026-03-24 10:32", isFavorite: false },
  { historyId: "HIS-004", objectType: "产品", name: "保险理财低碳收益一号", code: "PROD-002", queriedAt: "2026-03-23 16:18", isFavorite: true },
];

function productSummary(item: (typeof productSeed)[number]): ProductCardSummary {
  return {
    productId: item.productId,
    productName: item.productName,
    productType: item.productType,
    managerName: item.managerName,
    lastCalculatedAt: item.lastCalculatedAt,
    totalFinancedEmission: item.totalFinancedEmission,
    financedEmissionIntensity: item.financedEmissionIntensity,
    disclosureCoverage: item.disclosureCoverage,
    status: item.status,
    isFavorite: item.isFavorite,
  };
}

function enterpriseDetail(enterpriseId: string): EnterpriseDetail | null {
  const enterprise = enterpriseSeed.find((item) => item.enterpriseId === enterpriseId);
  const emissions = emissionSeed.find((item) => item.enterpriseId === enterpriseId);
  const financials = financialSeed.find((item) => item.enterpriseId === enterpriseId);
  const evidence = evidenceSeed.find((item) => item.enterpriseId === enterpriseId);

  if (!enterprise || !emissions || !financials || !evidence) return null;

  return {
    ...enterprise,
    isHighCarbon: Boolean(enterprise.isHighCarbon),
    isStateOwned: Boolean(enterprise.isStateOwned),
    emissions,
    financials,
    evidence: {
      dataBasis: [evidence.dataBasis],
      methodBasis: [evidence.methodBasis],
      factorBasis: [evidence.factorBasis],
      qualityBasis: [evidence.qualityBasis],
    },
  } as EnterpriseDetail;
}

function searchSecurities(query: string): SecurityQueryCard[] {
  const normalized = query.trim().toLowerCase();
  return enterpriseSeed
    .filter((enterprise) => {
      if (!normalized) return true;
      return enterprise.enterpriseName.toLowerCase().includes(normalized) || enterprise.securityCode.toLowerCase().includes(normalized);
    })
    .map((enterprise) => {
      const emissions = emissionSeed.find((item) => item.enterpriseId === enterprise.enterpriseId);
      const financials = financialSeed.find((item) => item.enterpriseId === enterprise.enterpriseId);
      const revenue = financials?.revenue ?? 1;
      return {
        enterpriseId: enterprise.enterpriseId,
        securityCode: enterprise.securityCode,
        enterpriseName: enterprise.enterpriseName,
        industry: enterprise.industryLevel1,
        scope12: emissions?.scope12 ?? 0,
        intensity: ((emissions?.scope12 ?? 0) / revenue) * 1_000_000,
        sourceType: emissions?.sourceType ?? "行业默认值",
        qualityScore: emissions?.qualityScore ?? 5,
      } as SecurityQueryCard;
    });
}

function searchProducts(query: string): ProductSearchResult[] {
  const normalized = query.trim().toLowerCase();
  return productSeed
    .filter((item) => !normalized || item.productName.toLowerCase().includes(normalized) || item.productId.toLowerCase().includes(normalized))
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productType: item.productType,
      managerName: item.managerName,
      status: item.status,
    }));
}

function portfolios(): PortfolioRecord[] {
  const grouped = new Map<string, PortfolioRecord>();
  holdingsSeed.forEach((holding) => {
    const current = grouped.get(holding.portfolioId);
    grouped.set(holding.portfolioId, {
      portfolioId: holding.portfolioId,
      portfolioName: holding.portfolioName,
      lastUpdated: holding.holdingDate,
      holdingCount: (current?.holdingCount ?? 0) + 1,
      lastCalculationStatus: "已完成",
    });
  });
  return Array.from(grouped.values());
}

function productDetail(productId: string): ProductDetailDrawer | null {
  const item = productSeed.find((product) => product.productId === productId);
  if (!item) return null;

  return {
    productId: item.productId,
    productName: item.productName,
    productType: item.productType,
    managerName: item.managerName,
    reportDate: item.lastCalculatedAt,
    totalFinancedEmission: item.totalFinancedEmission,
    financedEmissionIntensity: item.financedEmissionIntensity,
    investedAmountCoverage: item.investedAmountCoverage,
    disclosureCoverage: item.disclosureCoverage,
    topContributors: cockpitSeed.top10.slice(0, 3).map((row) => ({
      securityCode: enterpriseSeed.find((enterprise) => enterprise.enterpriseName === row.enterpriseName)?.securityCode ?? row.rank.toString(),
      enterpriseName: row.enterpriseName,
      financedEmission: row.scope12 * 0.08,
    })),
    rationale: item.rationale,
  };
}

function portfolioResult(portfolioId: string, mode: CoverageMode) {
  const holdings = holdingsSeed.filter((holding) => holding.portfolioId === portfolioId) as Holding[];
  const details = new Map(
    holdings
      .map((holding) => enterpriseDetail(holding.enterpriseId))
      .filter(Boolean)
      .map((detail) => [detail!.enterpriseId, detail!]),
  );
  const portfolioName = holdingsSeed.find((holding) => holding.portfolioId === portfolioId)?.portfolioName ?? "模拟组合";
  return {
    ...calculatePortfolio(portfolioId, portfolioName, holdings, details, mode),
    rationale: [
      `${mode === "strict" ? "严格口径" : "最大覆盖"}模式已启用。`,
      "已按证券层排放值和分母优先级完成融资排放归因。",
      "结果可回溯到规则、因子与映射版本。",
    ],
  };
}

function importPreview(): ImportPreview {
  return {
    columns: ["证券代码", "证券名称", "资产类别", "持仓比例", "持仓金额", "敞口金额"],
    mappedFields: ["securityCode", "securityName", "assetCategory", "positionWeight", "holdingAmount", "exposureAmount"],
    rowCount: 5,
    validationErrors: ["第 4 行证券代码已自动映射为企业主键。", "第 5 行缺少持仓比例，已用持仓金额补算。"],
  };
}

function rules(): RulesInfo {
  return {
    ruleVersion: "rule-2026.03",
    factorVersion: "factor-2026.03",
    mappingVersion: "map-2026.03",
    supportedAssets: ["股票", "企业债", "对公贷款"],
    coverageModes: ["strict", "maximize"],
    description: [
      "企业排放值优先级: 披露值 > 结构化公开值 > 模型估算值 > 行业默认值。",
      "归因分母优先级: EVIC > 市值+总债务-现金 > 市值+总债务 > 总权益+总债务 > 行业代理值。",
      "严格口径模式仅纳入披露值与结构化公开值。",
      "最大覆盖模式允许模型估算值与行业默认值补齐覆盖率。",
    ],
  };
}

export function staticApi<T>(url: string, init?: RequestInit): T {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  const method = (init?.method ?? "GET").toUpperCase();

  if (path === "/api/health") return { status: "ok", runtime: "static-github-pages" } as T;
  if (path === "/api/user/dashboard") {
    return {
      favoriteProducts: productSeed.filter((item) => item.isFavorite).map(productSummary),
      history,
      ruleVersion: "rule-2026.03",
      dataDate: "2026-03-24",
    } satisfies UserDashboardResponse as T;
  }
  if (path === "/api/query/securities") return searchSecurities(parsed.searchParams.get("q") ?? "") as T;
  if (path === "/api/query/products") return searchProducts(parsed.searchParams.get("q") ?? "") as T;
  if (path === "/api/user/favorites" && method === "POST") return { status: "accepted", message: "已加入关注列表。" } as T;

  const productMatch = path.match(/^\/api\/products\/([^/]+)\/detail$/);
  if (productMatch) return productDetail(productMatch[1]) as T;

  if (path === "/api/portfolios") return portfolios() as T;
  if (path === "/api/portfolios/draft" && method === "POST") return { draftId: "DRAFT-001", status: "created", message: "组合草稿已创建。" } as T;
  if (path === "/api/portfolios/import" && method === "POST") return importPreview() as T;

  const calculateMatch = path.match(/^\/api\/portfolios\/([^/]+)\/calculate$/);
  if (calculateMatch && method === "POST") {
    return { taskId: `TASK-CALC-${Date.now()}`, portfolioId: calculateMatch[1], status: "queued", message: "组合核算任务已加入队列。" } as T;
  }

  const resultMatch = path.match(/^\/api\/portfolios\/([^/]+)\/result$/);
  if (resultMatch) return portfolioResult(resultMatch[1], (parsed.searchParams.get("mode") as CoverageMode) ?? "strict") as T;

  if (path === "/api/cockpit/overview") return cockpitSeed.overview as T;
  if (path === "/api/cockpit/top10") return cockpitSeed.top10 as T;
  if (path === "/api/admin/data-sources") return dataSourceSeed as T;
  if (path === "/api/admin/ingestion-tasks") return taskSeed as T;
  if (path === "/api/admin/raw-files") return rawFileSeed as T;
  if (path === "/api/admin/review-queue") return reviewQueueSeed as T;
  if (/^\/api\/admin\/review-queue\/[^/]+\/(approve|reject)$/.test(path) && method === "POST") return { status: "accepted" } as T;

  const knowledgeMatch = path.match(/^\/api\/admin\/knowledge-base\/([^/]+)$/);
  if (knowledgeMatch) {
    const domain = decodeURIComponent(knowledgeMatch[1]);
    return knowledgeBaseSeed.filter((row) => domain === "all" || row.domain === domain) as T;
  }

  if (path === "/api/admin/rules/current") return rules() as T;
  if (path === "/api/admin/rules/versions") return ruleVersionSeed as T;

  throw new Error(`Static API route not implemented: ${path}`);
}
