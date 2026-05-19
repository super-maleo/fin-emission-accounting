import cors from "cors";
import express from "express";
import { calculatePortfolio, calculateSingleTarget } from "./engine.js";
import {
  addFavorites,
  createPortfolioDraft,
  getCockpitOverview,
  getCockpitTop10,
  getDataSources,
  getEnterpriseDetail,
  getEntityEvidence,
  getEntitySummary,
  getHoldings,
  getImportPreview,
  getIngestionTasks,
  getKnowledgeBase,
  getPortfolioName,
  getPortfolios,
  getProductDetail,
  getProductSummary,
  getRawFileQueue,
  getReviewQueue,
  getRuleVersions,
  getRulesInfo,
  getUserDashboard,
  getUserHistory,
  initializeDatabase,
  searchProducts,
  searchSecurities,
} from "./db.js";
import type { CoverageMode } from "../src/types.js";

initializeDatabase();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/user/dashboard", (_req, res) => {
  res.json(getUserDashboard());
});

app.get("/api/user/history", (_req, res) => {
  res.json(getUserHistory());
});

app.post("/api/user/favorites", (_req, res) => {
  res.json(addFavorites());
});

app.get("/api/query/securities", (req, res) => {
  const q = String(req.query.q ?? "");
  res.json(searchSecurities(q));
});

app.get("/api/query/products", (req, res) => {
  const q = String(req.query.q ?? "");
  res.json(searchProducts(q));
});

app.get("/api/entities/:id/summary", (req, res) => {
  const summary = getEntitySummary(req.params.id);
  if (!summary) {
    res.status(404).json({ message: "Security not found" });
    return;
  }
  res.json(summary);
});

app.get("/api/entities/:id/evidence", (req, res) => {
  const evidence = getEntityEvidence(req.params.id);
  if (!evidence) {
    res.status(404).json({ message: "Security not found" });
    return;
  }
  res.json(evidence);
});

app.get("/api/entities/:id/calculation", (req, res) => {
  const detail = getEnterpriseDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ message: "Security not found" });
    return;
  }

  const mode = (req.query.mode as CoverageMode) ?? "strict";
  const assetCategory = (req.query.assetCategory as "股票" | "企业债" | "对公贷款") ?? "股票";
  const exposureAmount = Number(req.query.exposureAmount ?? 10000000);
  const result = calculateSingleTarget(detail, assetCategory, exposureAmount, mode);

  if (!result) {
    res.status(422).json({ message: "当前严格口径模式下，该证券暂无可纳入数据。" });
    return;
  }

  res.json(result);
});

app.get("/api/products/:id/summary", (req, res) => {
  const summary = getProductSummary(req.params.id);
  if (!summary) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(summary);
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
  res.json(createPortfolioDraft());
});

app.post("/api/portfolios/import", (_req, res) => {
  res.json(getImportPreview());
});

app.post("/api/portfolios/:id/calculate", (req, res) => {
  const mode = String(req.body.mode ?? "strict");
  res.json({
    taskId: `TASK-CALC-${Date.now()}`,
    portfolioId: req.params.id,
    mode,
    status: "queued",
    message: "组合核算任务已加入队列。",
  });
});

app.get("/api/portfolios/:id/result", (req, res) => {
  const mode = (req.query.mode as CoverageMode) ?? "strict";
  const holdings = getHoldings(req.params.id);
  const detailMap = new Map(
    holdings
      .map((holding) => getEnterpriseDetail(holding.enterpriseId))
      .filter(Boolean)
      .map((detail) => [detail!.enterpriseId, detail!]),
  );
  const portfolioName = getPortfolioName(req.params.id);
  const result = calculatePortfolio(req.params.id, portfolioName, holdings, detailMap, mode);

  res.json({
    ...result,
    rationale: [
      `${mode === "strict" ? "严格口径" : "最大覆盖"}模式已启用。`,
      "已按证券层排放值和分母优先级完成融资排放归因。",
      "结果可回溯到规则、因子与映射版本。",
    ],
  });
});

app.get("/api/cockpit/overview", (_req, res) => {
  res.json(getCockpitOverview());
});

app.get("/api/cockpit/top10", (_req, res) => {
  res.json(getCockpitTop10());
});

app.get("/api/admin/data-sources", (_req, res) => {
  res.json(getDataSources());
});

app.get("/api/admin/ingestion-tasks", (_req, res) => {
  res.json(getIngestionTasks());
});

app.get("/api/admin/raw-files", (_req, res) => {
  res.json(getRawFileQueue());
});

app.get("/api/admin/review-queue", (_req, res) => {
  res.json(getReviewQueue());
});

app.post("/api/admin/review-queue/:id/approve", (req, res) => {
  res.json({
    reviewId: req.params.id,
    action: "approve",
    publishNote: req.body.publishNote ?? "",
    status: "accepted",
  });
});

app.post("/api/admin/review-queue/:id/reject", (req, res) => {
  res.json({
    reviewId: req.params.id,
    action: "reject",
    status: "accepted",
  });
});

app.get("/api/admin/knowledge-base/:domain", (req, res) => {
  res.json(getKnowledgeBase(req.params.domain));
});

app.get("/api/admin/rules/current", (_req, res) => {
  res.json(getRulesInfo());
});

app.get("/api/admin/rules/versions", (_req, res) => {
  res.json(getRuleVersions());
});

export default app;
