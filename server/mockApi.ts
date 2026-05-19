import express from "express";
import { calculatePortfolio, calculateSingleTarget } from "./engine.js";
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
} from "./seed.js";
import type {
  CoverageMode,
  EnterpriseDetail,
  Holding,
  PortfolioRecord,
  SecurityQueryCard,
} from "../src/types.js";

function getEnterpriseDetail(enterpriseId: string): EnterpriseDetail | null {
  const enterprise = enterpriseSeed.find((item) => item.enterpriseId === enterpriseId);
  const emissions = emissionSeed.find((item) => item.enterpriseId === enterpriseId);
  const financials = financialSeed.find((item) => item.enterpriseId === enterpriseId);
  const evidence = evidenceSeed.find((item) => item.enterpriseId === enterpriseId);

  if (!enterprise || !emissions || !financials || !evidence) {
    return null;
  }

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
      return (
        enterprise.enterpriseName.toLowerCase().includes(normalized) ||
        enterprise.securityCode.toLowerCase().includes(normalized)
      );
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
      };
    }) as SecurityQueryCard[];
}

function getPortfolios(): PortfolioRecord[] {
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

function getProductDetail(productId: string) {
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

function calculatePortfolioResult(portfolioId: string, mode: CoverageMode) {
  const holdings = holdingsSeed.filter((holding) => holding.portfolioId === portfolioId) as Holding[];
  const detailMap = new Map(
    holdings
      .map((holding) => getEnterpriseDetail(holding.enterpriseId))
      .filter(Boolean)
      .map((detail) => [detail!.enterpriseId, detail!]),
  );
  const portfolioName =
    holdingsSeed.find((holding) => holding.portfolioId === portfolioId)?.portfolioName ?? "模拟组合";
  const result = calculatePortfolio(portfolioId, portfolioName, holdings, detailMap, mode);
  return {
    ...result,
    rationale: [
      `${mode === "strict" ? "严格口径" : "最大覆盖"}模式已启用。`,
      "已按证券层排放值和分母优先级完成融资排放归因。",
      "结果可回溯到规则、因子与映射版本。",
    ],
  };
}

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", runtime: "edgeone-pages" });
});

app.get("/api/user/dashboard", (_req, res) => {
  res.json({
    favoriteProducts: productSeed.filter((item) => item.isFavorite).map((item) => ({
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
    })),
    history: [
      { historyId: "HIS-001", objectType: "产品", name: "绿色转型精选混合", code: "PROD-001", queriedAt: "2026-03-24 14:10", isFavorite: true },
      { historyId: "HIS-002", objectType: "证券", name: "新能源电池龙头", code: "300750.SZ", queriedAt: "2026-03-24 11:48", isFavorite: true },
      { historyId: "HIS-003", objectType: "证券", name: "区域公用事业集团", code: "600900.SH", queriedAt: "2026-03-24 10:32", isFavorite: false },
      { historyId: "HIS-004", objectType: "产品", name: "保险理财低碳收益一号", code: "PROD-002", queriedAt: "2026-03-23 16:18", isFavorite: true },
    ],
    ruleVersion: "rule-2026.03",
    dataDate: "2026-03-24",
  });
});

app.get("/api/query/securities", (req, res) => {
  res.json(searchSecurities(String(req.query.q ?? "")));
});

app.get("/api/query/products", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  res.json(productSeed.filter((item) => !q || item.productName.toLowerCase().includes(q) || item.productId.toLowerCase().includes(q)));
});

app.post("/api/user/favorites", (_req, res) => {
  res.json({ status: "accepted", message: "已加入关注列表。" });
});

app.get("/api/products/:id/detail", (req, res) => {
  const detail = getProductDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(detail);
});

app.get("/api/portfolios", (_req, res) => {
  res.json(getPortfolios());
});

app.post("/api/portfolios/draft", (_req, res) => {
  res.json({ draftId: "DRAFT-001", status: "created", message: "组合草稿已创建。" });
});

app.post("/api/portfolios/import", (_req, res) => {
  res.json({
    columns: ["证券代码", "证券名称", "资产类别", "持仓比例", "持仓金额", "敞口金额"],
    mappedFields: ["securityCode", "securityName", "assetCategory", "positionWeight", "holdingAmount", "exposureAmount"],
    rowCount: 5,
    validationErrors: ["第 4 行证券代码已自动映射为企业主键。", "第 5 行缺少持仓比例，已用持仓金额补算。"],
  });
});

app.post("/api/portfolios/:id/calculate", (req, res) => {
  res.json({
    taskId: `TASK-CALC-${Date.now()}`,
    portfolioId: req.params.id,
    mode: req.body.mode ?? "strict",
    status: "queued",
    message: "组合核算任务已加入队列。",
  });
});

app.get("/api/portfolios/:id/result", (req, res) => {
  res.json(calculatePortfolioResult(req.params.id, (req.query.mode as CoverageMode) ?? "strict"));
});

app.get("/api/cockpit/overview", (_req, res) => {
  res.json(cockpitSeed.overview);
});

app.get("/api/cockpit/top10", (_req, res) => {
  res.json(cockpitSeed.top10);
});

app.get("/api/admin/data-sources", (_req, res) => {
  res.json(dataSourceSeed);
});

app.get("/api/admin/ingestion-tasks", (_req, res) => {
  res.json(taskSeed);
});

app.get("/api/admin/raw-files", (_req, res) => {
  res.json(rawFileSeed);
});

app.get("/api/admin/review-queue", (_req, res) => {
  res.json(reviewQueueSeed);
});

app.post("/api/admin/review-queue/:id/approve", (req, res) => {
  res.json({ reviewId: req.params.id, action: "approve", status: "accepted" });
});

app.post("/api/admin/review-queue/:id/reject", (req, res) => {
  res.json({ reviewId: req.params.id, action: "reject", status: "accepted" });
});

app.get("/api/admin/knowledge-base/:domain", (req, res) => {
  res.json(knowledgeBaseSeed.filter((row) => req.params.domain === "all" || row.domain === req.params.domain));
});

app.get("/api/admin/rules/current", (_req, res) => {
  res.json({
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
  });
});

app.get("/api/admin/rules/versions", (_req, res) => {
  res.json(ruleVersionSeed);
});

app.get("/api/entities/:id/calculation", (req, res) => {
  const detail = getEnterpriseDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ message: "Security not found" });
    return;
  }
  const result = calculateSingleTarget(
    detail,
    (req.query.assetCategory as Holding["assetCategory"]) ?? "股票",
    Number(req.query.exposureAmount ?? 10000000),
    (req.query.mode as CoverageMode) ?? "strict",
  );
  if (!result) {
    res.status(422).json({ message: "当前严格口径模式下，该证券暂无可纳入数据。" });
    return;
  }
  res.json(result);
});

export default app;
