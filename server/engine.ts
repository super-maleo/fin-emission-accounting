import type {
  CoverageMode,
  EnterpriseDetail,
  Holding,
  MethodType,
  PortfolioDetailRow,
  PortfolioOverview,
  SingleCalculationResult,
  SourceType,
} from "../src/types.js";

function buildTraceId(prefix: string, seed: string) {
  return `${prefix}-${seed}`;
}

function round(value: number, digits = 2) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function isSourceAllowed(mode: CoverageMode, sourceType: SourceType) {
  if (mode === "maximize") {
    return true;
  }

  return sourceType === "披露值" || sourceType === "结构化公开值";
}

export function resolveDenominator(detail: EnterpriseDetail): {
  denominatorValue: number;
  denominatorType: string;
  explanation: string;
} {
  const { evic, marketCap, totalDebt, totalEquity, cash } = detail.financials;

  if (evic && evic > 0) {
    return {
      denominatorValue: evic,
      denominatorType: "EVIC",
      explanation: "采用 EVIC 作为归因分母。",
    };
  }

  if (marketCap && totalDebt && cash !== null) {
    return {
      denominatorValue: marketCap + totalDebt - (cash ?? 0),
      denominatorType: "市值+总债务-现金",
      explanation: "EVIC 缺失，采用市值+总债务-现金近似值。",
    };
  }

  if (marketCap && totalDebt) {
    return {
      denominatorValue: marketCap + totalDebt,
      denominatorType: "市值+总债务",
      explanation: "EVIC 与现金缺失，采用市值+总债务近似值。",
    };
  }

  if (totalEquity && totalDebt) {
    return {
      denominatorValue: totalEquity + totalDebt,
      denominatorType: "总权益+总债务",
      explanation: "采用总权益+总债务作为行业代理分母。",
    };
  }

  return {
    denominatorValue: 1,
    denominatorType: "行业代理值",
    explanation: "核心财务分母不可得，退回行业代理值 1 进行占位。",
  };
}

export function calculateSingleTarget(
  detail: EnterpriseDetail,
  assetCategory: Holding["assetCategory"],
  exposureAmount: number,
  mode: CoverageMode,
): SingleCalculationResult | null {
  if (!isSourceAllowed(mode, detail.emissions.sourceType)) {
    return null;
  }

  const emission = detail.emissions.scope12 ?? 0;
  const { denominatorValue, denominatorType, explanation } = resolveDenominator(detail);
  const attributionRatio = denominatorValue > 0 ? exposureAmount / denominatorValue : 0;
  const financedEmission = round(emission * attributionRatio, 4);
  const financedEmissionIntensity =
    exposureAmount > 0 ? round((financedEmission / exposureAmount) * 1_000_000, 4) : 0;

  const assetExplanation: Record<Holding["assetCategory"], string> = {
    股票: "股票场景按公允价值/EVIC 归因。",
    企业债: "企业债场景按债权敞口/企业价值归因。",
    对公贷款: "对公贷款场景按贷款敞口/企业价值归因。",
  };

  return {
    resultValue: financedEmission,
    financedEmissionIntensity,
    denominatorValue: round(denominatorValue, 2),
    denominatorType,
    methodType: detail.emissions.methodType,
    sourceType: detail.emissions.sourceType,
    qualityScore: detail.emissions.qualityScore,
    ruleVersion: detail.emissions.ruleVersion,
    factorVersion: detail.emissions.factorVersion,
    mappingVersion: detail.emissions.mappingVersion,
    traceId: buildTraceId(detail.enterpriseId, `${assetCategory}-${mode}`),
    explanation: [
      assetExplanation[assetCategory],
      explanation,
      `排放值来源为${detail.emissions.sourceType}，方法标签为 ${detail.emissions.methodType}。`,
      `本次采用 ${mode === "strict" ? "严格口径模式" : "最大覆盖模式"}。`,
    ],
  };
}

export function calculatePortfolio(
  portfolioId: string,
  portfolioName: string,
  holdings: Holding[],
  details: Map<string, EnterpriseDetail>,
  mode: CoverageMode,
): { overview: PortfolioOverview; rows: PortfolioDetailRow[] } {
  const rows: PortfolioDetailRow[] = [];
  let totalExposure = 0;
  let coveredExposure = 0;
  let disclosedExposure = 0;
  let totalFinancedEmission = 0;
  let weightedQuality = 0;
  let highCarbonExposure = 0;
  const methodDistribution: Record<string, number> = {};
  const qualityDistribution: Record<string, number> = {};

  for (const holding of holdings) {
    totalExposure += holding.exposureAmount;
    const detail = details.get(holding.enterpriseId);
    if (!detail) {
      continue;
    }

    if (detail.isHighCarbon) {
      highCarbonExposure += holding.exposureAmount;
    }

    const result = calculateSingleTarget(detail, holding.assetCategory, holding.exposureAmount, mode);
    if (!result) {
      continue;
    }

    coveredExposure += holding.exposureAmount;
    if (detail.emissions.sourceType === "披露值" || detail.emissions.sourceType === "结构化公开值") {
      disclosedExposure += holding.exposureAmount;
    }

    totalFinancedEmission += result.resultValue;
    weightedQuality += result.qualityScore * holding.exposureAmount;
    methodDistribution[result.methodType] = (methodDistribution[result.methodType] ?? 0) + 1;
    qualityDistribution[String(result.qualityScore)] =
      (qualityDistribution[String(result.qualityScore)] ?? 0) + 1;

    rows.push({
      holdingId: holding.holdingId,
      securityCode: holding.securityCode,
      enterpriseName: detail.enterpriseName,
      assetCategory: holding.assetCategory,
      exposureAmount: holding.exposureAmount,
      enterpriseEmission: detail.emissions.scope12 ?? 0,
      denominatorValue: result.denominatorValue,
      denominatorType: result.denominatorType,
      financedEmission: result.resultValue,
      financedEmissionIntensity: result.financedEmissionIntensity,
      sourceType: result.sourceType,
      methodType: result.methodType,
      qualityScore: result.qualityScore,
      explanation: result.explanation,
    });
  }

  rows.sort((a, b) => b.financedEmission - a.financedEmission);

  const overview: PortfolioOverview = {
    portfolioId,
    portfolioName,
    mode,
    totalFinancedEmission: round(totalFinancedEmission, 2),
    financedEmissionIntensity:
      coveredExposure > 0 ? round((totalFinancedEmission / coveredExposure) * 1_000_000, 2) : 0,
    investedAmountCoverage: totalExposure > 0 ? round((coveredExposure / totalExposure) * 100, 2) : 0,
    disclosureCoverage: totalExposure > 0 ? round((disclosedExposure / totalExposure) * 100, 2) : 0,
    averageQualityScore: coveredExposure > 0 ? round(weightedQuality / coveredExposure, 2) : 0,
    highCarbonExposureShare: totalExposure > 0 ? round((highCarbonExposure / totalExposure) * 100, 2) : 0,
    topContributors: rows.slice(0, 10).map((row) => ({
      securityCode: row.securityCode,
      enterpriseName: row.enterpriseName,
      financedEmission: row.financedEmission,
    })),
    methodDistribution,
    qualityDistribution,
  };

  return { overview, rows };
}

export function buildMethodLabel(methodType: MethodType) {
  const labels: Record<MethodType, string> = {
    DISCLOSED: "企业披露值",
    STRUCTURED_DISCLOSURE: "公开结构化值",
    ACTIVITY_BASED: "活动数据估算",
    PRODUCT_BASED: "产品法估算",
    REVENUE_INTENSITY: "收入强度估算",
    EEIO_DEFAULT: "EEIO 行业缺省",
  };

  return labels[methodType];
}
