import type { Driver } from '../types';

// DRIVER_MASTER — 半月(16日間)実績ベースのモックデータ
// 実運用ではスプレッドシート/外部APIと連携される想定
export const DRIVER_MASTER: Driver[] = [
  // --- 管理者（役員） 全体 ---
  {
    id: 'ADM-001',
    name: '赤羽',
    role: 'マネージャー',
    unitPrice: 0,
    area: '本社',
    type: '役員',
    baseSalary: 400_000,
    actualSales: 0,
    actualOutsource: 0,
    actualExpense: 0,
    segment: '全体',
  },
  {
    id: 'ADM-002',
    name: '小川',
    role: 'ディレクター',
    unitPrice: 0,
    area: '本社',
    type: '役員',
    baseSalary: 250_000,
    actualSales: 0,
    actualOutsource: 0,
    actualExpense: 0,
    segment: '全体',
  },
  {
    id: 'ADM-003',
    name: '三田',
    role: 'ディレクター',
    unitPrice: 0,
    area: '本社',
    type: '役員',
    baseSalary: 200_000,
    actualSales: 0,
    actualOutsource: 0,
    actualExpense: 0,
    segment: '全体',
  },

  // --- ヤマト宅配 フルコミドライバー（11名） ---
  { id: 'DRV-001', name: '佐藤健一', role: '一等級', unitPrice: 158, area: '世田谷', type: 'フルコミ', baseSalary: 0, actualSales: 282_230, actualOutsource: 258_570, actualExpense: 1_700, segment: 'ヤマト', subSegment: 'k-dash' },
  { id: 'DRV-002', name: '鈴木大輔', role: '一等級', unitPrice: 155, area: '目黒', type: 'フルコミ', baseSalary: 0, actualSales: 250_500, actualOutsource: 229_500, actualExpense: 1_450, segment: 'ヤマト', subSegment: 'fate' },
  { id: 'DRV-003', name: '高橋誠', role: '二等級', unitPrice: 153, area: '大田', type: 'フルコミ', baseSalary: 0, actualSales: 242_150, actualOutsource: 221_850, actualExpense: 1_350, segment: 'ヤマト', subSegment: 'k-dash' },
  { id: 'DRV-004', name: '田中亮', role: '二等級', unitPrice: 150, area: '品川', type: 'フルコミ', baseSalary: 0, actualSales: 233_800, actualOutsource: 214_200, actualExpense: 1_300, segment: 'ヤマト', subSegment: 'fate' },
  { id: 'DRV-005', name: '伊藤和也', role: '二等級', unitPrice: 156, area: '渋谷', type: 'フルコミ', baseSalary: 0, actualSales: 230_460, actualOutsource: 211_140, actualExpense: 1_200, segment: 'ヤマト', subSegment: 'k-dash' },
  { id: 'DRV-006', name: '渡辺翔太', role: '三等級', unitPrice: 153, area: '杉並', type: 'フルコミ', baseSalary: 0, actualSales: 224_114, actualOutsource: 205_326, actualExpense: 1_150, segment: 'ヤマト', subSegment: 'fate' },
  { id: 'DRV-007', name: '山本一輝', role: '三等級', unitPrice: 152, area: '中野', type: 'フルコミ', baseSalary: 0, actualSales: 217_100, actualOutsource: 198_900, actualExpense: 1_100, segment: 'ヤマト', subSegment: 'k-dash' },
  { id: 'DRV-008', name: '中村拓真', role: '三等級', unitPrice: 153, area: '練馬', type: 'フルコミ', baseSalary: 0, actualSales: 208_750, actualOutsource: 191_250, actualExpense: 1_050, segment: 'ヤマト', subSegment: 'fate' },
  { id: 'DRV-009', name: '小林秀樹', role: '四等級', unitPrice: 160, area: '板橋', type: 'フルコミ', baseSalary: 0, actualSales: 200_400, actualOutsource: 183_600, actualExpense: 1_000, segment: 'ヤマト', subSegment: 'k-dash' },
  { id: 'DRV-010', name: '加藤隆', role: '四等級', unitPrice: 153, area: '北', type: 'フルコミ', baseSalary: 0, actualSales: 192_050, actualOutsource: 175_950, actualExpense: 950, segment: 'ヤマト', subSegment: 'fate' },
  { id: 'DRV-011', name: '吉田翼', role: '研修生', unitPrice: 150, area: '足立', type: 'アルバイト', baseSalary: 0, actualSales: 183_700, actualOutsource: 168_300, actualExpense: 900, segment: 'ヤマト', subSegment: 'k-dash' },

  // --- 企業配・スポット案件ドライバー（6名） ---
  { id: 'DRV-101', name: '岡田美咲', role: '三等級', unitPrice: 7_000, area: '吉祥寺', type: 'フルコミ', baseSalary: 0, actualSales: 150_000, actualOutsource: 105_000, actualExpense: 0, segment: '企業配', subSegment: '吉祥寺' },
  { id: 'DRV-102', name: '松本大地', role: '三等級', unitPrice: 8_000, area: '立川', type: 'フルコミ', baseSalary: 0, actualSales: 150_000, actualOutsource: 120_000, actualExpense: 0, segment: '企業配', subSegment: '立川' },
  { id: 'DRV-103', name: '石井健太', role: '三等級', unitPrice: 14_572, area: '豊洲', type: 'フルコミ', baseSalary: 0, actualSales: 85_715, actualOutsource: 72_858, actualExpense: 0, segment: '企業配', subSegment: '豊洲' },
  { id: 'DRV-104', name: '西村圭吾', role: '二等級', unitPrice: 20_000, area: '澤田様案件', type: 'フルコミ', baseSalary: 0, actualSales: 60_000, actualOutsource: 40_002, actualExpense: 0, segment: '企業配', subSegment: 'たいやき' },
  { id: 'DRV-105', name: '木村悠人', role: '三等級', unitPrice: 12_503, area: '日比谷', type: '経費会社持ち', baseSalary: 0, actualSales: 62_000, actualOutsource: 50_003, actualExpense: 7_000, segment: '企業配', subSegment: '日比谷' },
  { id: 'DRV-106', name: '林悠真', role: '三等級', unitPrice: 10_000, area: '東武', type: '経費会社持ち', baseSalary: 0, actualSales: 50_000, actualOutsource: 40_000, actualExpense: 5_688, segment: '企業配', subSegment: '東武' },
];
