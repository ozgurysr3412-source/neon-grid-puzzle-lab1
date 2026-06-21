import assert from "node:assert/strict";
import { resolveClearMessagePolicy } from "../src/ui/clearMessagePolicy.js";

assert.deepEqual(
  resolveClearMessagePolicy({ lineCount: 1, comboChain: 1 }),
  { lineCount: 1, comboChain: 1, isCombo: false, showClear: true, showCombo: false },
  "A standalone single-line clear must show only CLEAR.",
);

assert.deepEqual(
  resolveClearMessagePolicy({ lineCount: 1, comboChain: 2 }),
  { lineCount: 1, comboChain: 2, isCombo: true, showClear: false, showCombo: true },
  "A chained clear must suppress CLEAR and show only COMBO as its primary message.",
);

assert.deepEqual(
  resolveClearMessagePolicy({ lineCount: 3, comboChain: 1 }),
  { lineCount: 3, comboChain: 2, isCombo: true, showClear: false, showCombo: true },
  "The existing multi-line combo floor must be preserved without a second CLEAR message.",
);

console.log("Stage 2 message policy checks passed.");
