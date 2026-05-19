import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  cockpitSeed,
  dataSourceSeed,
  emissionSeed,
  enterpriseSeed,
  evidenceSeed,
  financialSeed,
  historySeed,
  holdingsSeed,
  knowledgeBaseSeed,
  productSeed,
  rawFileSeed,
  reviewQueueSeed,
  ruleVersionSeed,
  taskSeed,
} from "./seed.js";
import type {
  CockpitOverview,
  DataSourceItem,
  DraftPortfolioResponse,
  EnterpriseDetail,
  EnterpriseSummary,
  EntitySummaryResponse,
  Holding,
  ImportPreview,
  IngestionTask,
  IndustryTop10Row,
  KnowledgeBaseRow,
  PortfolioRecord,
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
} from "../src/types.js";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "platform.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS enterprises (
      enterprise_id TEXT PRIMARY KEY,
      security_code TEXT NOT NULL,
      enterprise_name TEXT NOT NULL,
      listed_exchange TEXT NOT NULL,
      region TEXT NOT NULL,
      industry_level_1 TEXT NOT NULL,
      industry_level_2 TEXT NOT NULL,
      is_high_carbon INTEGER NOT NULL,
      is_state_owned INTEGER NOT NULL,
      report_status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emissions (
      enterprise_id TEXT PRIMARY KEY,
      report_year INTEGER NOT NULL,
      scope1 REAL,
      scope2 REAL,
      scope12 REAL,
      source_type TEXT NOT NULL,
      source_link TEXT NOT NULL,
      capture_date TEXT NOT NULL,
      review_status TEXT NOT NULL,
      method_type TEXT NOT NULL,
      quality_score INTEGER NOT NULL,
      factor_version TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      mapping_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financials (
      enterprise_id TEXT PRIMARY KEY,
      revenue REAL,
      total_assets REAL,
      total_equity REAL,
      total_debt REAL,
      market_cap REAL,
      cash REAL,
      evic REAL,
      currency TEXT NOT NULL,
      valuation_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evidence (
      enterprise_id TEXT PRIMARY KEY,
      data_basis TEXT NOT NULL,
      method_basis TEXT NOT NULL,
      factor_basis TEXT NOT NULL,
      quality_basis TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holdings (
      holding_id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL,
      portfolio_name TEXT NOT NULL,
      product_id TEXT NOT NULL,
      holding_date TEXT NOT NULL,
      asset_category TEXT NOT NULL,
      enterprise_id TEXT NOT NULL,
      security_code TEXT NOT NULL,
      quantity REAL NOT NULL,
      fair_value REAL NOT NULL,
      exposure_amount REAL NOT NULL,
      organization_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      frequency TEXT NOT NULL,
      status TEXT NOT NULL,
      last_run_at TEXT NOT NULL,
      next_run_at TEXT NOT NULL,
      owner_role TEXT NOT NULL,
      error_message TEXT
    );
  `);
}

function seedTable(table: string, rows: Record<string, unknown>[]) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const columnMap: Record<string, string> = {
    industryLevel1: "industry_level_1",
    industryLevel2: "industry_level_2",
    scope12: "scope12",
  };

  const toSnake = (value: string) =>
    columnMap[value] ?? value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  const columns = Object.keys(rows[0]).map(toSnake);
  const placeholders = columns.map((column) => `@${column}`).join(", ");
  const statement = db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );

  const insertMany = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) {
      const normalized = Object.fromEntries(
        Object.entries(item).map(([key, value]) => [toSnake(key), value]),
      );
      statement.run(normalized);
    }
  });

  insertMany(rows);
}

export function initializeDatabase() {
  createSchema();
  seedTable("enterprises", enterpriseSeed);
  seedTable("emissions", emissionSeed);
  seedTable("financials", financialSeed);
  seedTable("evidence", evidenceSeed);
  seedTable("holdings", holdingsSeed);
  seedTable("tasks", taskSeed);
}

function round(value: number, digits = 2) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

export function getEnterprises(): EnterpriseSummary[] {
  const rows = db
    .prepare(
      `
      SELECT
        enterprise_id as enterpriseId,
        security_code as securityCode,
        enterprise_name as enterpriseName,
        listed_exchange as listedExchange,
        region,
        industry_level_1 as industryLevel1,
        industry_level_2 as industryLevel2,
        is_high_carbon as isHighCarbon,
        is_state_owned as isStateOwned,
        report_status as reportStatus
      FROM enterprises
      ORDER BY enterprise_name
    `,
    )
    .all() as EnterpriseSummary[];

  return rows.map((row) => ({
    ...row,
    isHighCarbon: Boolean(row.isHighCarbon),
    isStateOwned: Boolean(row.isStateOwned),
  }));
}

export function getEnterpriseDetail(enterpriseId: string): EnterpriseDetail | null {
  const row = db
    .prepare(
      `
      SELECT
        e.enterprise_id as enterpriseId,
        e.security_code as securityCode,
        e.enterprise_name as enterpriseName,
        e.listed_exchange as listedExchange,
        e.region,
        e.industry_level_1 as industryLevel1,
        e.industry_level_2 as industryLevel2,
        e.is_high_carbon as isHighCarbon,
        e.is_state_owned as isStateOwned,
        e.report_status as reportStatus,
        m.report_year as reportYear,
        m.scope1,
        m.scope2,
        m.scope12,
        m.source_type as sourceType,
        m.source_link as sourceLink,
        m.capture_date as captureDate,
        m.review_status as reviewStatus,
        m.method_type as methodType,
        m.quality_score as qualityScore,
        m.factor_version as factorVersion,
        m.rule_version as ruleVersion,
        m.mapping_version as mappingVersion,
        f.revenue,
        f.total_assets as totalAssets,
        f.total_equity as totalEquity,
        f.total_debt as totalDebt,
        f.market_cap as marketCap,
        f.cash,
        f.evic,
        f.currency,
        f.valuation_date as valuationDate,
        ev.data_basis as dataBasis,
        ev.method_basis as methodBasis,
        ev.factor_basis as factorBasis,
        ev.quality_basis as qualityBasis
      FROM enterprises e
      JOIN emissions m ON e.enterprise_id = m.enterprise_id
      JOIN financials f ON e.enterprise_id = f.enterprise_id
      JOIN evidence ev ON e.enterprise_id = ev.enterprise_id
      WHERE e.enterprise_id = ?
    `,
    )
    .get(enterpriseId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    enterpriseId: row.enterpriseId as string,
    securityCode: row.securityCode as string,
    enterpriseName: row.enterpriseName as string,
    listedExchange: row.listedExchange as string,
    region: row.region as string,
    industryLevel1: row.industryLevel1 as string,
    industryLevel2: row.industryLevel2 as string,
    isHighCarbon: Boolean(row.isHighCarbon),
    isStateOwned: Boolean(row.isStateOwned),
    reportStatus: row.reportStatus as string,
    emissions: {
      reportYear: row.reportYear as number,
      scope1: row.scope1 as number | null,
      scope2: row.scope2 as number | null,
      scope12: row.scope12 as number | null,
      sourceType: row.sourceType as EnterpriseDetail["emissions"]["sourceType"],
      sourceLink: row.sourceLink as string,
      captureDate: row.captureDate as string,
      reviewStatus: row.reviewStatus as EnterpriseDetail["emissions"]["reviewStatus"],
      methodType: row.methodType as EnterpriseDetail["emissions"]["methodType"],
      qualityScore: row.qualityScore as number,
      factorVersion: row.factorVersion as string,
      ruleVersion: row.ruleVersion as string,
      mappingVersion: row.mappingVersion as string,
    },
    financials: {
      revenue: row.revenue as number | null,
      totalAssets: row.totalAssets as number | null,
      totalEquity: row.totalEquity as number | null,
      totalDebt: row.totalDebt as number | null,
      marketCap: row.marketCap as number | null,
      cash: row.cash as number | null,
      evic: row.evic as number | null,
      currency: row.currency as string,
      valuationDate: row.valuationDate as string,
    },
    evidence: {
      dataBasis: [row.dataBasis as string],
      methodBasis: [row.methodBasis as string],
      factorBasis: [row.factorBasis as string],
      qualityBasis: [row.qualityBasis as string],
    },
  };
}

export function getEntitySummary(enterpriseId: string): EntitySummaryResponse | null {
  const detail = getEnterpriseDetail(enterpriseId);
  if (!detail) {
    return null;
  }

  const revenueIntensity =
    detail.financials.revenue && detail.financials.revenue > 0
      ? ((detail.emissions.scope12 ?? 0) / detail.financials.revenue) * 1_000_000
      : 0;
  const evicIntensity =
    detail.financials.evic && detail.financials.evic > 0
      ? ((detail.emissions.scope12 ?? 0) / detail.financials.evic) * 1_000_000
      : 0;

  return {
    entity: {
      enterpriseId: detail.enterpriseId,
      enterpriseName: detail.enterpriseName,
      securityCode: detail.securityCode,
      industry: `${detail.industryLevel1} / ${detail.industryLevel2}`,
      region: detail.region,
      listedExchange: detail.listedExchange,
      isHighCarbon: detail.isHighCarbon,
      latestYear: detail.emissions.reportYear,
    },
    emissionCards: [
      { label: "Scope 1", value: detail.emissions.scope1 ?? 0, unit: "tCO2e" },
      { label: "Scope 2", value: detail.emissions.scope2 ?? 0, unit: "tCO2e" },
      { label: "Scope 1+2", value: detail.emissions.scope12 ?? 0, unit: "tCO2e" },
    ],
    intensityCards: [
      { label: "收入口径强度", value: round(revenueIntensity), unit: "tCO2e/百万元收入" },
      { label: "EVIC 口径强度", value: round(evicIntensity), unit: "tCO2e/百万元EVIC" },
    ],
    sourceQuality: {
      sourceType: detail.emissions.sourceType,
      qualityScore: detail.emissions.qualityScore,
      reviewStatus: detail.emissions.reviewStatus,
      captureDate: detail.emissions.captureDate,
    },
  };
}

export function getEntityEvidence(enterpriseId: string) {
  return getEnterpriseDetail(enterpriseId)?.evidence ?? null;
}

export function searchSecurities(query: string): SecurityQueryCard[] {
  const normalized = query.trim().toLowerCase();
  return getEnterprises()
    .map((item) => {
      const detail = getEnterpriseDetail(item.enterpriseId);
      const scope12 = detail?.emissions.scope12 ?? 0;
      const intensity =
        detail?.financials.evic && detail.financials.evic > 0
          ? round((scope12 / detail.financials.evic) * 1_000_000)
          : 0;

      return {
        enterpriseId: item.enterpriseId,
        securityCode: item.securityCode,
        enterpriseName: item.enterpriseName,
        industry: `${item.industryLevel1} / ${item.industryLevel2}`,
        scope12,
        intensity,
        sourceType: detail?.emissions.sourceType ?? "行业默认值",
        qualityScore: detail?.emissions.qualityScore ?? 5,
      };
    })
    .filter((item) => {
      if (!normalized) {
        return true;
      }
      return (
        item.enterpriseName.toLowerCase().includes(normalized) ||
        item.securityCode.toLowerCase().includes(normalized)
      );
    });
}

export function getHoldings(portfolioId: string): Holding[] {
  return db
    .prepare(
      `
      SELECT
        holding_id as holdingId,
        portfolio_id as portfolioId,
        product_id as productId,
        holding_date as holdingDate,
        asset_category as assetCategory,
        enterprise_id as enterpriseId,
        security_code as securityCode,
        quantity,
        fair_value as fairValue,
        exposure_amount as exposureAmount,
        organization_id as organizationId
      FROM holdings
      WHERE portfolio_id = ?
      ORDER BY holding_id
    `,
    )
    .all(portfolioId) as Holding[];
}

export function getPortfolioName(portfolioId: string) {
  const row = db
    .prepare("SELECT portfolio_name as portfolioName FROM holdings WHERE portfolio_id = ? LIMIT 1")
    .get(portfolioId) as { portfolioName: string } | undefined;
  return row?.portfolioName ?? portfolioId;
}

export function getPortfolios(): PortfolioRecord[] {
  const rows = db
    .prepare(
      `
      SELECT
        portfolio_id as portfolioId,
        portfolio_name as portfolioName,
        MAX(holding_date) as lastUpdated,
        COUNT(*) as holdingCount
      FROM holdings
      GROUP BY portfolio_id, portfolio_name
      ORDER BY portfolio_id
    `,
    )
    .all() as Array<PortfolioRecord & { holdingCount: number }>;

  return rows.map((row) => ({
    portfolioId: row.portfolioId,
    portfolioName: row.portfolioName,
    lastUpdated: row.lastUpdated,
    holdingCount: row.holdingCount,
    lastCalculationStatus: "已完成",
  }));
}

export function getUserDashboard(): UserDashboardResponse {
  return {
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
    history: historySeed,
    ruleVersion: "rule-2026.03",
    dataDate: "2026-03-24",
  };
}

export function getUserHistory(): QueryHistoryItem[] {
  return historySeed;
}

export function searchProducts(query: string): ProductSearchResult[] {
  const normalized = query.trim().toLowerCase();
  return productSeed
    .filter((item) => {
      if (!normalized) {
        return true;
      }
      return (
        item.productName.toLowerCase().includes(normalized) ||
        item.productId.toLowerCase().includes(normalized)
      );
    })
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productType: item.productType,
      managerName: item.managerName,
      status: item.status,
    }));
}

export function getProductSummary(productId: string): ProductCardSummary | null {
  const item = productSeed.find((product) => product.productId === productId);
  if (!item) {
    return null;
  }

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

export function getProductDetail(productId: string): ProductDetailDrawer | null {
  const item = productSeed.find((product) => product.productId === productId);
  if (!item) {
    return null;
  }

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

export function addFavorites() {
  return {
    status: "accepted",
    message: "已加入关注列表。",
  };
}

export function createPortfolioDraft(): DraftPortfolioResponse {
  return {
    draftId: "DRAFT-001",
    status: "created",
    message: "组合草稿已创建。",
  };
}

export function getImportPreview(): ImportPreview {
  return {
    columns: ["证券代码", "证券名称", "资产类别", "持仓比例", "持仓金额", "敞口金额"],
    mappedFields: ["securityCode", "securityName", "assetCategory", "positionWeight", "holdingAmount", "exposureAmount"],
    rowCount: 5,
    validationErrors: ["第 4 行证券代码已自动映射为企业主键。", "第 5 行缺少持仓比例，已用持仓金额补算。"],
  };
}

export function getCockpitOverview(): CockpitOverview {
  return cockpitSeed.overview;
}

export function getCockpitTop10(): IndustryTop10Row[] {
  return cockpitSeed.top10;
}

export function getDataSources(): DataSourceItem[] {
  return dataSourceSeed;
}

export function getIngestionTasks(): IngestionTask[] {
  return taskSeed;
}

export function getRawFileQueue(): RawFileQueueItem[] {
  return rawFileSeed;
}

export function getReviewQueue(): ReviewQueueItem[] {
  return reviewQueueSeed;
}

export function getKnowledgeBase(domain: string): KnowledgeBaseRow[] {
  return knowledgeBaseSeed.filter((row) => domain === "all" || row.domain === domain);
}

export function getRuleVersions(): RuleVersionRecord[] {
  return ruleVersionSeed;
}

export function getRulesInfo(): RulesInfo {
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
