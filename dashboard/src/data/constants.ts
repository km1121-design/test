// 4. 計算ロジック・アルゴリズム要件 — 規定値

/** 稼働日数 T（日/月） */
export const OPERATING_DAYS = 22;
/** 会社受取単価平均 P_in（円/個） */
export const COMPANY_UNIT_PRICE = 167;
/** ドライバー支払単価平均 P_out（円/個、150〜160円の加重平均） */
export const DRIVER_UNIT_PRICE = 153;
/** 1個あたりの会社マージン利益（円） */
export const MARGIN_PER_PACKAGE = COMPANY_UNIT_PRICE - DRIVER_UNIT_PRICE;

/** 企業配・月間ベース売上（定常案件計） */
export const ENTERPRISE_BASE_SALES = 1_500_000;

/** 管理者（役員）合計固定人件費（赤羽・小川・三田） */
export const ADMIN_BASE_COST = 850_000;

/** 固定車両管理諸経費（VEHICLE_EXPENSE_DETAILの合計） */
export const FIXED_EXPENSE_BASE = 771_038;

/** 月利黒字化目標 */
export const MONTHLY_PROFIT_GOAL = 1_000_000;

/** ヤマト宅配 目標稼働人数 */
export const YAMATO_TARGET_DRIVER_COUNT = 21;

/** 現在のヤマト稼働人数（DRIVER_MASTERのsubSegment保有者数と一致） */
export const YAMATO_CURRENT_DRIVER_COUNT = 11;

/** ヤマト正社員換算の1人1日あたり配完数目標 */
export const YAMATO_STAFF_TARGET_PACKAGES = 100;

/** 現状の1人1日あたり平均配完数（実績） */
export const YAMATO_CURRENT_AVG_PACKAGES = 122;

/** 採用広告ランニング費（Indeed・バイトル合計、月額） */
export const RECRUIT_AD_COST = 133_000;
