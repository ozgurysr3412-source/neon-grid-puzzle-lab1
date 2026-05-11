export function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function boardSize(board) {
  return board.length;
}

export function getPieceCellsAt(piece, anchorRow, anchorCol) {
  return piece.cells.map(({ x, y }) => ({
    row: anchorRow + y,
    col: anchorCol + x,
  }));
}

export function areCellsInsideBoard(board, cells) {
  const size = boardSize(board);
  return cells.every(({ row, col }) => row >= 0 && row < size && col >= 0 && col < size);
}

export function canPlacePiece(board, piece, anchorRow, anchorCol) {
  const cells = getPieceCellsAt(piece, anchorRow, anchorCol);
  if (!areCellsInsideBoard(board, cells)) {
    return false;
  }
  return cells.every(({ row, col }) => board[row][col] === 0);
}

export function placePiece(board, piece, anchorRow, anchorCol, tone = 1) {
  const cells = getPieceCellsAt(piece, anchorRow, anchorCol);
  cells.forEach(({ row, col }) => {
    board[row][col] = tone;
  });
  return cells;
}

export function detectFullLines(board) {
  const size = boardSize(board);
  const rows = [];
  const cols = [];

  for (let row = 0; row < size; row += 1) {
    if (board[row].every((value) => value !== 0)) {
      rows.push(row);
    }
  }

  for (let col = 0; col < size; col += 1) {
    let isFull = true;
    for (let row = 0; row < size; row += 1) {
      if (board[row][col] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      cols.push(col);
    }
  }

  return { rows, cols };
}

export function collectClearedCells(size, rows, cols) {
  const dedupe = new Set();
  rows.forEach((row) => {
    for (let col = 0; col < size; col += 1) {
      dedupe.add(`${row}:${col}`);
    }
  });
  cols.forEach((col) => {
    for (let row = 0; row < size; row += 1) {
      dedupe.add(`${row}:${col}`);
    }
  });
  return Array.from(dedupe).map((key) => {
    const [row, col] = key.split(":").map(Number);
    return { row, col };
  });
}

export function clearLines(board, rows, cols) {
  rows.forEach((row) => {
    for (let col = 0; col < board.length; col += 1) {
      board[row][col] = 0;
    }
  });
  cols.forEach((col) => {
    for (let row = 0; row < board.length; row += 1) {
      board[row][col] = 0;
    }
  });
}

export function hasAnyPlacementForPiece(board, piece) {
  const size = boardSize(board);
  const maxRow = size - piece.height;
  const maxCol = size - piece.width;
  for (let row = 0; row <= maxRow; row += 1) {
    for (let col = 0; col <= maxCol; col += 1) {
      if (canPlacePiece(board, piece, row, col)) {
        return true;
      }
    }
  }
  return false;
}

export function anyPieceFits(board, pieces) {
  return pieces.filter(Boolean).some((piece) => hasAnyPlacementForPiece(board, piece));
}

export function countPlaceablePieces(board, pieces) {
  return pieces.filter(Boolean).filter((piece) => hasAnyPlacementForPiece(board, piece)).length;
}

export function findFirstPlacementForPiece(board, piece) {
  const size = boardSize(board);
  const maxRow = size - piece.height;
  const maxCol = size - piece.width;
  for (let row = 0; row <= maxRow; row += 1) {
    for (let col = 0; col <= maxCol; col += 1) {
      if (canPlacePiece(board, piece, row, col)) {
        return { row, col };
      }
    }
  }
  return null;
}

export function boardFillRatio(board) {
  const total = board.length * board.length;
  let occupied = 0;
  board.forEach((row) => {
    row.forEach((value) => {
      if (value !== 0) {
        occupied += 1;
      }
    });
  });
  return occupied / total;
}

export function countNearCompleteLines(board, emptyTarget = 1) {
  const size = boardSize(board);
  let count = 0;

  for (let row = 0; row < size; row += 1) {
    let empty = 0;
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] === 0) {
        empty += 1;
      }
    }
    if (empty === emptyTarget) {
      count += 1;
    }
  }

  for (let col = 0; col < size; col += 1) {
    let empty = 0;
    for (let row = 0; row < size; row += 1) {
      if (board[row][col] === 0) {
        empty += 1;
      }
    }
    if (empty === emptyTarget) {
      count += 1;
    }
  }

  return count;
}
