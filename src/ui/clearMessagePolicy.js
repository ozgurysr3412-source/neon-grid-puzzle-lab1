export function resolveClearMessagePolicy(payload = {}) {
  const lineCount = Math.max(1, Math.floor(Number(payload.lineCount) || 1));
  const scoringComboChain = Math.max(1, Math.floor(Number(payload.comboChain) || 1));
  const comboChain = scoringComboChain > 1
    ? scoringComboChain
    : (lineCount >= 2 ? 2 : 1);
  const isCombo = comboChain > 1;

  return {
    lineCount,
    comboChain,
    isCombo,
    showClear: !isCombo,
    showCombo: isCombo,
  };
}
