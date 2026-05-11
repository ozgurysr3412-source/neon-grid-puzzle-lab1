function buildPiece(id, rawCells, category, tone, weight = 1) {
  const xs = rawCells.map(([x]) => x);
  const ys = rawCells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const normalizedCells = rawCells.map(([x, y]) => ({ x: x - minX, y: y - minY }));
  const width = Math.max(...normalizedCells.map((cell) => cell.x)) + 1;
  const height = Math.max(...normalizedCells.map((cell) => cell.y)) + 1;
  return {
    id,
    category,
    tone,
    cells: normalizedCells,
    width,
    height,
    cellCount: normalizedCells.length,
    weight,
  };
}

export const PIECE_CATALOG = [
  // Small-piece balance:
  // dot and diagonals appear a bit less often than classic small shapes.
  buildPiece("dot", [[0, 0]], "small", 1, 0.58),
  buildPiece("domino_h", [[0, 0], [1, 0]], "small", 2),
  buildPiece("domino_v", [[0, 0], [0, 1]], "small", 3),
  buildPiece("diag2_up", [[0, 1], [1, 0]], "small", 4, 0.72),
  buildPiece("diag2_down", [[0, 0], [1, 1]], "small", 5, 0.72),
  buildPiece("tri_h", [[0, 0], [1, 0], [2, 0]], "small", 4),
  buildPiece("tri_v", [[0, 0], [0, 1], [0, 2]], "small", 5),
  buildPiece("diag3_up", [[0, 2], [1, 1], [2, 0]], "small", 3, 0.78),
  buildPiece("diag3_down", [[0, 0], [1, 1], [2, 2]], "small", 2, 0.78),
  buildPiece("tri_l", [[0, 0], [0, 1], [1, 1]], "small", 1),
  buildPiece("tri_j", [[1, 0], [0, 1], [1, 1]], "small", 2),
  buildPiece("square2", [[0, 0], [1, 0], [0, 1], [1, 1]], "medium", 3),
  buildPiece("line4_h", [[0, 0], [1, 0], [2, 0], [3, 0]], "medium", 4),
  buildPiece("line4_v", [[0, 0], [0, 1], [0, 2], [0, 3]], "medium", 5),
  buildPiece("l4", [[0, 0], [0, 1], [0, 2], [1, 2]], "medium", 1),
  buildPiece("j4", [[1, 0], [1, 1], [1, 2], [0, 2]], "medium", 2),
  buildPiece("tee4", [[0, 0], [1, 0], [2, 0], [1, 1]], "medium", 3),
  buildPiece("zig4", [[0, 0], [1, 0], [1, 1], [2, 1]], "medium", 4),
  buildPiece("zag4", [[1, 0], [2, 0], [0, 1], [1, 1]], "medium", 5),
  buildPiece("line5_h", [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], "large", 1),
  buildPiece("line5_v", [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], "large", 2),
  buildPiece("plus5", [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], "large", 3),
  buildPiece("l5", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], "large", 4),
  buildPiece("rect2x3", [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], "large", 5),
  buildPiece("rect3x2", [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], "large", 1),
  buildPiece("rect2x4", [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3]], "large", 4, 0.62),
  buildPiece("rect4x2", [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]], "large", 5, 0.62),
  buildPiece(
    "rect3x4",
    [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
      [0, 3], [1, 3], [2, 3],
    ],
    "large",
    3,
    0.24,
  ),
  buildPiece(
    "rect4x3",
    [
      [0, 0], [1, 0], [2, 0], [3, 0],
      [0, 1], [1, 1], [2, 1], [3, 1],
      [0, 2], [1, 2], [2, 2], [3, 2],
    ],
    "large",
    2,
    0.24,
  ),
  buildPiece(
    "block3",
    [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ],
    "large",
    2,
  ),
];
