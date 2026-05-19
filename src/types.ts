export type CoverageMode = "strict" | "maximize";

export type ReviewStatus = "待审核" | "已确认" | "已驳回" | "已覆盖";

export type SourceType = "披露值" | "结构化公开值" | "模型估算值" | "行业默认值";

export type MethodType =
  | "DISCLOSED"
  | "STRUCTURED_DISCLOSURE"
  | "ACTIVITY_BASED"
  | "PRODUCT_BASED"
  | "REVENUE_INTENSITY"
  | "EEIO_DEFAULT";

export type AssetCategory = "股票" | "企业债" | "对公贷款";

export interface EnterpriseSummary {
  enterpriseId: string;
  securityCode: string;
  enterpriseName: string;
  listedExchange: string;
  region: string;
  industryLevel1: string;
  industryLevel2: string;
  isHighCarbon: boolean;
  isStateOwned: boolean;
  reportStatus: string;
}

export interface EvidenceBundle {
  dataBasis: string[];
  methodBasis: string[];
  factorBasis: string[];
  qualityBasis: string[];
}

export interface EnterpriseDetail extends EnterpriseSummary {
  emissions: {
    reportYear: number;
    scope1: number | null;
    scope2: number | null;
    scope12: number | null;
    sourceType: SourceType;
    sourceLink: string;
    captureDate: string;
    reviewStatus: ReviewStatus;
    methodType: MethodType;
    qualityScore: number;
    factorVersion: string;
    ruleVersion: string;
    mappingVersion: string;
  };
  financials: {
    revenue: number | null;
    totalAssets: number | null;
    totalEquity: number | null;
    totalDebt: number | null;
    marketCap: number | null;
    cash: number | null;
    evic: number | null;
    currency: string;
    valuationDate: string;
  };
  evidence: EvidenceBundle;
}

export interface SecurityQueryCard {
  enterpriseId: string;
  securityCode: string;
  enterpriseName: string;
  industry: string;
  scope12: number;
  intensity: number;
  sourceType: SourceType;
  qualityScore: number;
}

export interface ProductCardSummary {
  productId: string;
  productName: string;
  productType: string;
  managerName: string;
  lastCalculatedAt: string;
  totalFinancedEmission: number;
  financedEmissionIntensity: number;
  disclosureCoverage: number;
  status: string;
  isFavorite: boolean;
}

export interface ProductDetailDrawer {
  productId: string;
  productName: string;
  productType: string;
  managerName: string;
  reportDate: string;
  totalFinancedEmission: number;
  financedEmissionIntensity: number;
  investedAmountCoverage: number;
  disclosureCoverage: number;
  topContributors: Array<{
    securityCode: string;
    enterpriseName: string;
    financedEmission: number;
  }>;
  rationale: string[];
}

export interface QueryHistoryItem {
  historyId: string;
  objectType: "证券" | "产品";
  name: string;
  code: string;
  queriedAt: string;
  isFavorite: boolean;
}

export interface UserDashboardResponse {
  favoriteProducts: ProductCardSummary[];
  history: QueryHistoryItem[];
  ruleVersion: string;
  dataDate: string;
}

export interface ProductSearchResult {
  productId: string;
  productName: string;
  productType: string;
  managerName: string;
  status: string;
}

export interface EntitySummaryResponse {
  entity: {
    enterpriseId: string;
    enterpriseName: string;
    securityCode: string;
    industry: string;
    region: string;
    listedExchange: string;
    isHighCarbon: boolean;
    latestYear: number;
  };
  emissionCards: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  intensityCards: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  sourceQuality: {
    sourceType: SourceType;
    qualityScore: number;
    reviewStatus: ReviewStatus;
    captureDate: string;
  };
}

export interface SingleCalculationResult {
  resultValue: number;
  financedEmissionIntensity: number;
  denominatorValue: number;
  denominatorType: string;
  methodType: MethodType;
  sourceType: SourceType;
  qualityScore: number;
  ruleVersion: string;
  factorVersion: string;
  mappingVersion: string;
  traceId: string;
  explanation: string[];
}

export interface Holding {
  holdingId: string;
  portfolioId: string;
  productId: string;
  holdingDate: string;
  assetCategory: AssetCategory;
  enterpriseId: string;
  securityCode: string;
  quantity: number;
  fairValue: number;
  exposureAmount: number;
  organizationId: string;
}

export interface PortfolioRecord {
  portfolioId: string;
  portfolioName: string;
  lastUpdated: string;
  holdingCount: number;
  lastCalculationStatus: string;
}

export interface PortfolioOverview {
  portfolioId: string;
  portfolioName: string;
  mode: CoverageMode;
  totalFinancedEmission: number;
  financedEmissionIntensity: number;
  investedAmountCoverage: number;
  disclosureCoverage: number;
  averageQualityScore: number;
  highCarbonExposureShare: number;
  topContributors: Array<{
    securityCode: string;
    enterpriseName: string;
    financedEmission: number;
  }>;
  methodDistribution: Record<string, number>;
  qualityDistribution: Record<string, number>;
}

export interface PortfolioDetailRow {
  holdingId: string;
  securityCode: string;
  enterpriseName: string;
  assetCategory: AssetCategory;
  exposureAmount: number;
  enterpriseEmission: number;
  denominatorValue: number;
  denominatorType: string;
  financedEmission: number;
  financedEmissionIntensity: number;
  sourceType: SourceType;
  methodType: MethodType;
  qualityScore: number;
  explanation: string[];
}

export interface PortfolioResultResponse {
  overview: PortfolioOverview;
  rows: PortfolioDetailRow[];
  rationale: string[];
}

export interface ImportPreview {
  columns: string[];
  mappedFields: string[];
  rowCount: number;
  validationErrors: string[];
}

export interface DraftPortfolioResponse {
  draftId: string;
  status: string;
  message: string;
}

export interface CockpitOverview {
  totalFinancedEmission: number;
  totalEmissionIntensity: number;
  coveredEnterpriseCount: number;
  disclosedEnterpriseCount: number;
  averageQualityScore: number;
}

export interface IndustryTop10Row {
  rank: number;
  industry: string;
  enterpriseName: string;
  scaleMetric: number;
  scope12: number;
  intensity: number;
  sourceType: SourceType;
  qualityScore: number;
}

export interface DataSourceItem {
  sourceId: string;
  name: string;
  sourceType: string;
  updateFrequency: string;
  coverage: string;
  status: string;
}

export interface IngestionTask {
  taskId: string;
  taskType: string;
  sourceName: string;
  frequency: string;
  status: string;
  lastRunAt: string;
  nextRunAt: string;
  ownerRole: string;
  errorMessage: string | null;
}

export interface RawFileQueueItem {
  fileId: string;
  fileName: string;
  fileType: string;
  parseStatus: string;
  pendingReviews: number;
  sourceName: string;
}

export interface ReviewQueueItem {
  reviewId: string;
  queueType: "待审核抽取" | "待确认估算" | "待发布变更";
  targetName: string;
  sourceName: string;
  suggestedMethod: string;
  suggestedFactor: string;
  status: string;
}

export interface KnowledgeBaseRow {
  rowId: string;
  domain: string;
  targetName: string;
  year: string;
  standardizedValue: string;
  sourceType: string;
  qualityScore: string;
  versionTag: string;
  reviewStatus: string;
  lineage: string[];
}

export interface RuleVersionRecord {
  versionId: string;
  versionType: string;
  name: string;
  effectiveDate: string;
  status: string;
  notes: string;
}

export interface RulesInfo {
  ruleVersion: string;
  factorVersion: string;
  mappingVersion: string;
  supportedAssets: AssetCategory[];
  coverageModes: CoverageMode[];
  description: string[];
}
