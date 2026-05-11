import fs from "node:fs/promises";

const DEFAULT_URL =
  "https://raw.githubusercontent.com/Jigisha-p/A-B-Testing-Mobile-Game---Cookie-Cat/master/Data/cookie_cats.csv";

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t) + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-(absX ** 2));
  return sign * y;
}

function zTest(x1, n1, x2, n2) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * ((1 / n1) + (1 / n2)));
  const z = (p1 - p2) / se;
  const p = 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
  return { p1, p2, diff: p1 - p2, z, p };
}

async function loadCsv(pathOrUrl) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    return response.text();
  }
  return fs.readFile(pathOrUrl, "utf8");
}

const target = process.argv[2] ?? DEFAULT_URL;
const csv = await loadCsv(target);
const rows = csv.trim().split(/\r?\n/);
const header = rows[0].split(",");
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

let n30 = 0;
let n40 = 0;
let r1_30 = 0;
let r1_40 = 0;
let r7_30 = 0;
let r7_40 = 0;

for (let i = 1; i < rows.length; i += 1) {
  const cols = rows[i].split(",");
  const version = cols[idx.version];
  const r1 = cols[idx.retention_1] === "TRUE";
  const r7 = cols[idx.retention_7] === "TRUE";

  if (version === "gate_30") {
    n30 += 1;
    if (r1) {
      r1_30 += 1;
    }
    if (r7) {
      r7_30 += 1;
    }
  } else if (version === "gate_40") {
    n40 += 1;
    if (r1) {
      r1_40 += 1;
    }
    if (r7) {
      r7_40 += 1;
    }
  }
}

const d1 = zTest(r1_30, n30, r1_40, n40);
const d7 = zTest(r7_30, n30, r7_40, n40);

console.log(
  JSON.stringify(
    {
      sample: { gate_30: n30, gate_40: n40 },
      retention_d1: {
        gate_30: Number(d1.p1.toFixed(6)),
        gate_40: Number(d1.p2.toFixed(6)),
        absolute_diff: Number(d1.diff.toFixed(6)),
        relative_lift_vs_gate40: Number(((d1.diff / d1.p2) * 100).toFixed(3)),
        z: Number(d1.z.toFixed(4)),
        p_value: Number(d1.p.toFixed(6)),
      },
      retention_d7: {
        gate_30: Number(d7.p1.toFixed(6)),
        gate_40: Number(d7.p2.toFixed(6)),
        absolute_diff: Number(d7.diff.toFixed(6)),
        relative_lift_vs_gate40: Number(((d7.diff / d7.p2) * 100).toFixed(3)),
        z: Number(d7.z.toFixed(4)),
        p_value: Number(d7.p.toFixed(6)),
      },
    },
    null,
    2,
  ),
);
