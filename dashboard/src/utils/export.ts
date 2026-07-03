import type { SimulatorResult } from '../types';
import { formatYen, formatPercent, formatNumber } from './format';

export function buildSimulationReport(result: SimulatorResult): string {
  const lines = [
    '【Gooner運送事業部 黒字化シミュレーション結果】',
    `出力日時: ${new Date().toLocaleString('ja-JP')}`,
    '',
    '■ 設定条件',
    `・ヤマト稼働人数: ${formatNumber(result.yamatoDriverCount)}名`,
    `・1人1日あたり配完数: ${formatNumber(result.packagesPerDriverPerDay)}個`,
    `・企業配平均手数料率: ${formatPercent(result.enterpriseFeeRate)}`,
    `・管理者人件費削減率: ${formatPercent(result.adminCostReductionRate)}`,
    `・車両関連固定費削減額: ${formatYen(result.fixedCostReduction)}`,
    '',
    '■ 予測損益（月間）',
    `・ヤマト売上: ${formatYen(result.yamatoSales)}`,
    `・ヤマト外注費: ${formatYen(result.yamatoOutsource)}`,
    `・ヤマト部門粗利: ${formatYen(result.yamatoMargin)}`,
    `・企業配粗利: ${formatYen(result.enterpriseProfit)}`,
    `・管理者人件費: ${formatYen(result.adminCost)}`,
    `・固定諸経費: ${formatYen(result.fixedCost)}`,
    '',
    `■ 最終経常損益（月間予測）: ${formatYen(result.netProfit)}`,
    `・黒字化目標: ${formatYen(result.goal)}`,
    `・目標までのGAP: ${formatYen(result.gapToGoal)}`,
    `・目標達成率: ${result.progressPct.toFixed(1)}%`,
    `・目標達成に必要なヤマト稼働人数: ${result.driversNeededForGoal}名（あと${result.additionalDriversNeeded}名増員）`,
  ];
  return lines.join('\n');
}

export async function copyReportToClipboard(result: SimulatorResult): Promise<void> {
  const text = buildSimulationReport(result);
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
