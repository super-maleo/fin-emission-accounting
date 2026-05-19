import { describe, expect, it } from "vitest";
import { calculatePortfolio, calculateSingleTarget } from "../server/engine";
import type { EnterpriseDetail, Holding } from "../src/types";

const disclosedEnterprise: EnterpriseDetail = {
  enterpriseId: "ENT-TEST-1",
  securityCode: "000001.SZ",
  enterpriseName: "测试披露企业",
  listedExchange: "SZSE",
  region: "深圳",
  industryLevel1: "制造业",
  industryLevel2: "电子",
  isHighCarbon: true,
  isStateOwned: false,
  reportStatus: "已披露",
  emissions: {
    reportYear: 2024,
    scope1: 800000,
    scope2: 200000,
    scope12: 1000000,
    sourceType: "披露值",
    sourceLink: "https://example.com",
    captureDate: "2026-03-01",
    reviewStatus: "已确认",
    methodType: "DISCLOSED",
    qualityScore: 1,
    factorVersion: "factor-2026.03",
    ruleVersion: "rule-2026.03",
    mappingVersion: "map-2026.03",
  },
  financials: {
    revenue: 100000000,
    totalAssets: 600000000,
    totalEquity: 250000000,
    totalDebt: 180000000,
    marketCap: 800000000,
    cash: 50000000,
    evic: 930000000,
    currency: "CNY",
    valuationDate: "2025-12-31",
  },
  evidence: {
    dataBasis: [],
    methodBasis: [],
    factorBasis: [],
    qualityBasis: [],
  },
};

const estimatedEnterprise: EnterpriseDetail = {
  ...disclosedEnterprise,
  enterpriseId: "ENT-TEST-2",
  enterpriseName: "测试估算企业",
  isHighCarbon: false,
  emissions: {
    ...disclosedEnterprise.emissions,
    sourceType: "模型估算值",
    methodType: "REVENUE_INTENSITY",
    qualityScore: 4,
  },
};

const holdings: Holding[] = [
  {
    holdingId: "H1",
    portfolioId: "P1",
    productId: "PR1",
    holdingDate: "2026-03-20",
    assetCategory: "股票",
    enterpriseId: "ENT-TEST-1",
    securityCode: "000001.SZ",
    quantity: 1,
    fairValue: 10000000,
    exposureAmount: 10000000,
    organizationId: "ORG-1",
  },
  {
    holdingId: "H2",
    portfolioId: "P1",
    productId: "PR1",
    holdingDate: "2026-03-20",
    assetCategory: "对公贷款",
    enterpriseId: "ENT-TEST-2",
    securityCode: "000002.SZ",
    quantity: 1,
    fairValue: 20000000,
    exposureAmount: 20000000,
    organizationId: "ORG-1",
  },
];

describe("engine", () => {
  it("uses disclosed values in strict mode", () => {
    const result = calculateSingleTarget(disclosedEnterprise, "股票", 10000000, "strict");
    expect(result).not.toBeNull();
    expect(result?.sourceType).toBe("披露值");
    expect(result?.denominatorType).toBe("EVIC");
  });

  it("excludes estimated values in strict mode", () => {
    const result = calculateSingleTarget(estimatedEnterprise, "股票", 10000000, "strict");
    expect(result).toBeNull();
  });

  it("includes estimated values in maximize mode", () => {
    const result = calculateSingleTarget(estimatedEnterprise, "对公贷款", 10000000, "maximize");
    expect(result).not.toBeNull();
    expect(result?.methodType).toBe("REVENUE_INTENSITY");
  });

  it("aggregates portfolio coverage by mode", () => {
    const detailMap = new Map([
      [disclosedEnterprise.enterpriseId, disclosedEnterprise],
      [estimatedEnterprise.enterpriseId, estimatedEnterprise],
    ]);

    const strictPortfolio = calculatePortfolio("P1", "测试组合", holdings, detailMap, "strict");
    const maximizePortfolio = calculatePortfolio("P1", "测试组合", holdings, detailMap, "maximize");

    expect(strictPortfolio.rows).toHaveLength(1);
    expect(maximizePortfolio.rows).toHaveLength(2);
    expect(strictPortfolio.overview.investedAmountCoverage).toBeLessThan(
      maximizePortfolio.overview.investedAmountCoverage,
    );
  });
});
