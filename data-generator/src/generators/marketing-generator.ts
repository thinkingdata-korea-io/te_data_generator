import { faker } from '@faker-js/faker';
import { User } from '../types';
import { randomChoice, weightedRandom } from '../utils/random';

/**
 * 마케팅 어트리뷰션 데이터 생성기
 *
 * install 이벤트, adjust_ad_revenue 이벤트, te_ads_object 유저 속성의 값을 생성합니다.
 * 스키마는 고정되어 있으며, 이 클래스는 값만 생성합니다.
 *
 * @see docs/marketing_attribution_spec.md
 * @see src/schemas/marketing-schema.ts
 */

/**
 * 광고 매체 (media_source)
 */
const MEDIA_SOURCES = [
  { name: 'google', weight: 0.35 },
  { name: 'facebook', weight: 0.25 },
  { name: 'apple_search_ads', weight: 0.15 },
  { name: 'tiktok', weight: 0.10 },
  { name: 'unity_ads', weight: 0.05 },
  { name: 'ironsource', weight: 0.05 },
  { name: 'organic', weight: 0.05 }
];

/**
 * 광고 네트워크 이름 (network_name)
 */
const NETWORK_NAMES: Record<string, string> = {
  'google': 'Google Ads',
  'facebook': 'Facebook Ads',
  'apple_search_ads': 'Apple Search Ads',
  'tiktok': 'TikTok Ads',
  'unity_ads': 'Unity Ads',
  'ironsource': 'IronSource',
  'organic': 'Organic'
};

/**
 * 광고 수익 네트워크 (ad_revenue_network)
 */
const AD_REVENUE_NETWORKS = [
  { name: 'admob', weight: 0.4 },
  { name: 'unity_ads', weight: 0.3 },
  { name: 'ironsource', weight: 0.2 },
  { name: 'applovin', weight: 0.1 }
];

/**
 * 광고 유닛 타입 (ad_revenue_unit)
 */
const AD_UNIT_TYPES = [
  { name: 'rewarded_video', weight: 0.5 },
  { name: 'interstitial', weight: 0.3 },
  { name: 'banner', weight: 0.15 },
  { name: 'native', weight: 0.05 }
];

/**
 * 광고 대행사 (agency)
 */
const AGENCIES = [
  'Adways', 'DMC Media', 'Nasmedia', 'Cheil Worldwide',
  'Innocean', 'Dentsu', 'McKinsey Digital', 'Accenture Interactive'
];

/**
 * 광고 게재 위치 (placement)
 */
const PLACEMENTS = [
  'youtube_instream', 'facebook_feed', 'instagram_story',
  'tiktok_feed', 'apple_search', 'unity_rewarded',
  'google_display_network', 'audience_network'
];

/**
 * 마케팅 어트리뷰션 데이터 생성기
 */
export class MarketingGenerator {
  private industry: string;
  private appName: string;
  private appId: string;

  constructor(industry: string, appName?: string) {
    this.industry = industry;
    this.appName = appName || this.generateAppName(industry);
    this.appId = this.generateAppId(this.appName);
  }

  /**
   * 산업 기반 앱 이름 생성
   */
  private generateAppName(industry: string): string {
    const industryLower = industry.toLowerCase();

    if (industryLower.includes('게임') || industryLower.includes('game')) {
      return randomChoice([
        'Epic Adventure', 'Racing Master', 'Strategy Empire',
        'Fantasy Quest', 'Battle Arena', 'Speed Racer'
      ]);
    }

    if (industryLower.includes('쇼핑') || industryLower.includes('commerce')) {
      return randomChoice([
        'ShopMart', 'StyleHub', 'FashionNow',
        'QuickBuy', 'TrendStore', 'MegaMall'
      ]);
    }

    if (industryLower.includes('금융') || industryLower.includes('finance')) {
      return randomChoice([
        'MoneyPlus', 'FinanceHub', 'WealthManager',
        'QuickPay', 'BankEasy', 'InvestNow'
      ]);
    }

    return 'MyApp';
  }

  /**
   * Bundle ID / Package name 생성
   */
  private generateAppId(appName: string): string {
    const slug = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `com.company.${slug}`;
  }

  /**
   * 캠페인 이름 생성 (산업/시나리오 기반)
   */
  private generateCampaignName(): string {
    const campaigns = [
      'launch_campaign_2024',
      'user_acquisition_q1',
      'seasonal_promotion',
      'new_feature_launch',
      'retention_campaign',
      'lookalike_audience',
      'tier1_expansion',
      'whale_targeting'
    ];

    return randomChoice(campaigns);
  }

  /**
   * 광고 그룹 이름 생성
   */
  private generateAdGroupName(): string {
    const adGroups = [
      'tier1_countries',
      'tier2_countries',
      'high_value_users',
      'lookalike_whales',
      'retargeting_churned',
      'broad_audience',
      'age_18_34',
      'gaming_enthusiasts'
    ];

    return randomChoice(adGroups);
  }

  /**
   * 광고 소재 이름 생성
   */
  private generateAdName(): string {
    const adNames = [
      'hero_banner_v2',
      'video_ad_30sec',
      'gameplay_showcase',
      'feature_highlight',
      'discount_banner',
      'social_proof_ad',
      'testimonial_video',
      'product_carousel'
    ];

    return randomChoice(adNames);
  }

  /**
   * te_ads_object 유저 속성 생성
   * (사용자의 최초 유입 광고 정보)
   */
  generateUserAttribution(): Record<string, any> {
    const mediaSource = weightedRandom(
      MEDIA_SOURCES.map(m => m.name),
      MEDIA_SOURCES.map(m => m.weight)
    );

    // Flat 구조로 변환 (te_ads_object.property_name)
    return {
      'te_ads_object.media_source': mediaSource,
      'te_ads_object.campaign_name': this.generateCampaignName(),
      'te_ads_object.ad_group_name': this.generateAdGroupName(),
      'te_ads_object.ad_name': this.generateAdName()
    };
  }

  /**
   * 공통 마케팅 속성 생성 (DRY 원칙)
   * install과 ad_revenue에서 공통으로 사용
   */
  private generateBaseMarketingProperties(user: User, timestamp: Date): {
    basic: Record<string, any>;
    teAdsObject: Record<string, any>;
    campaignInfo: { mediaSource: string; campaignName: string; adGroupName: string; adName: string };
  } {
    const mediaSource = weightedRandom(
      MEDIA_SOURCES.map(m => m.name),
      MEDIA_SOURCES.map(m => m.weight)
    );
    const campaignName = this.generateCampaignName();
    const adGroupName = this.generateAdGroupName();
    const adName = this.generateAdName();

    return {
      basic: {
        app_id: this.appId,
        app_name: this.appName,
        app_version: '1.0.0',
        campaign_name: campaignName,
        country: user.countryCode,
        created_at_milli: timestamp.getTime().toString(),
        network_name: NETWORK_NAMES[mediaSource] || 'Unknown',
        os_name: user.os.toLowerCase(),
        publisher_parameters: JSON.stringify({}),
        ta_account_id: user.account_id,
        ta_distinct_id: user.distinct_id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      teAdsObject: {
        'te_ads_object.ad_account_id': `acc_${faker.string.alphanumeric(10)}`,
        'te_ads_object.ad_group_id': `adg_${faker.string.alphanumeric(10)}`,
        'te_ads_object.ad_group_name': adGroupName,
        'te_ads_object.ad_id': `ad_${faker.string.alphanumeric(10)}`,
        'te_ads_object.ad_name': adName,
        'te_ads_object.agency': randomChoice(AGENCIES),
        'te_ads_object.app_id': this.appId,
        'te_ads_object.app_name': this.appName,
        'te_ads_object.campaign_id': `cmp_${faker.string.alphanumeric(10)}`,
        'te_ads_object.campaign_name': campaignName,
        'te_ads_object.clicks': faker.number.int({ min: 100, max: 10000 }),
        'te_ads_object.conversions': faker.number.int({ min: 10, max: 500 }),
        'te_ads_object.cost': faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
        'te_ads_object.country': user.countryCode,
        'te_ads_object.currency': 'USD',
        'te_ads_object.impressions': faker.number.int({ min: 1000, max: 100000 }),
        'te_ads_object.installs': faker.number.int({ min: 10, max: 1000 }),
        'te_ads_object.media_source': mediaSource,
        'te_ads_object.placement': randomChoice(PLACEMENTS),
        'te_ads_object.platform': user.os.toLowerCase(),
        'te_ads_object.revenue': faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })
      },
      campaignInfo: { mediaSource, campaignName, adGroupName, adName }
    };
  }

  /**
   * install 이벤트 속성 생성
   */
  generateInstallEvent(user: User, timestamp: Date): Record<string, any> {
    const { basic, teAdsObject, campaignInfo } = this.generateBaseMarketingProperties(user, timestamp);

    return {
      ...basic,
      activity_kind: 'install',
      adgroup_name: campaignInfo.adGroupName,
      creative_name: campaignInfo.adName,
      ...teAdsObject
    };
  }

  /**
   * adjust_ad_revenue 이벤트 속성 생성
   */
  generateAdRevenueEvent(user: User, timestamp: Date): Record<string, any> {
    const { basic, teAdsObject, campaignInfo } = this.generateBaseMarketingProperties(user, timestamp);

    const adRevenueNetwork = weightedRandom(
      AD_REVENUE_NETWORKS.map(n => n.name),
      AD_REVENUE_NETWORKS.map(n => n.weight)
    );
    const adUnitType = weightedRandom(
      AD_UNIT_TYPES.map(u => u.name),
      AD_UNIT_TYPES.map(u => u.weight)
    );

    return {
      ...basic,
      activity_kind: 'ad_revenue',
      adgroup_name: campaignInfo.adGroupName,
      creative_name: campaignInfo.adName,
      ...teAdsObject,
      // Ad Revenue 전용 속성
      ad_revenue_network: adRevenueNetwork,
      ad_revenue_unit: `${adUnitType}_${faker.string.alphanumeric(6)}`,
      currency: 'USD',
      memberid: user.account_id,
      revenue: this.generateAdRevenue(adUnitType)
    };
  }

  /**
   * 광고 유닛 타입별 수익 생성
   */
  private generateAdRevenue(unitType: string): number {
    // 유닛 타입별로 현실적인 수익 범위
    const revenueRanges: Record<string, { min: number; max: number }> = {
      'rewarded_video': { min: 0.01, max: 0.10 },
      'interstitial': { min: 0.005, max: 0.05 },
      'banner': { min: 0.001, max: 0.01 },
      'native': { min: 0.005, max: 0.03 }
    };

    const range = revenueRanges[unitType] || { min: 0.001, max: 0.05 };
    return faker.number.float({
      min: range.min,
      max: range.max,
      fractionDigits: 4
    });
  }
}

/**
 * 마케팅 생성기 인스턴스 생성 헬퍼
 */
export function createMarketingGenerator(industry: string, appName?: string): MarketingGenerator {
  return new MarketingGenerator(industry, appName);
}
