export class DragDropController {
  constructor(state, ui, hooks = {}) {
    this.state = state;
    this.ui = ui;
    this.hooks = hooks;
    this.drag = null;
  }

  init() {
    this.ui.elements.pieceTray.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove, { passive: false });
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
    this.state.on("state", (snapshot) => {
      if (snapshot.status !== "playing" && this.drag) {
        this.abortDrag();
      }
    });
  }

  onPointerDown = (event) => {
    const card = event.target.closest(".piece-card");
    if (!card || !this.state.isInteractive()) {
      return;
    }

    const slotIndex = Number(card.dataset.slot);
    if (!Number.isInteger(slotIndex)) {
      return;
    }
    const piece = this.state.getPiece(slotIndex);
    if (!piece) {
      return;
    }

    const pieceGrid = card.querySelector(".piece-grid");
    if (!pieceGrid) {
      return;
    }
    const targetInGrid = event.target === pieceGrid || pieceGrid.contains(event.target);
    if (!targetInGrid) {
      return;
    }

    event.preventDefault();
    card.setPointerCapture?.(event.pointerId);
    card.classList.remove("piece-card--pickup-pop");
    requestAnimationFrame(() => {
      card.classList.add("piece-card--pickup-pop");
    });
    setTimeout(() => {
      card.classList.remove("piece-card--pickup-pop");
    }, 120);

    const anchor = this.ui.resolvePieceAnchor(pieceGrid, piece, event.clientX, event.clientY);
    const floatingCellSize = this.state.tuning.INPUT.DRAG_FLOAT_CELL_SIZE;
    const dragEl = this.ui.createFloatingPiece(piece, floatingCellSize);
    document.body.appendChild(dragEl);
    card.classList.add("piece-card--active");

    this.drag = {
      slotIndex,
      piece,
      pointerType: event.pointerType || "touch",
      anchor,
      floatingCellSize,
      grabOffsetX: (anchor.col + 0.5) * floatingCellSize,
      grabOffsetY: (anchor.row + 0.5) * floatingCellSize,
      dragEl,
      originCard: card,
      boardAnchor: null,
      preview: null,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      smoothedTouchOffsetY: this.state.tuning.INPUT.DRAG_TOUCH_AIM_OFFSET_Y,
      originVisibility: card.style.visibility || "",
      rafId: 0,
    };

    this.hooks.onDragStart?.({
      slotIndex,
      piece,
      pointerType: this.drag.pointerType,
    });
    this.ui.beginDragSession?.(slotIndex);
    card.classList.add("piece-card--dragging");
    card.style.visibility = "hidden";
    this.scheduleDragFrame();
  };

  onPointerMove = (event) => {
    if (!this.drag) {
      return;
    }
    event.preventDefault();
    this.drag.lastClientX = event.clientX;
    this.drag.lastClientY = event.clientY;
    this.scheduleDragFrame();
  };

  onPointerUp = (event) => {
    if (!this.drag) {
      return;
    }

    if (event) {
      this.drag.lastClientX = event.clientX;
      this.drag.lastClientY = event.clientY;
      const controlPoint = this.getControlPoint(event.clientX, event.clientY);
      this.updatePreviewFromPoint(controlPoint.x, controlPoint.y);
    }

    let placed = false;
    if (this.drag.boardAnchor && this.drag.preview?.valid) {
      placed = this.state.placePiece(
        this.drag.slotIndex,
        this.drag.boardAnchor.row,
        this.drag.boardAnchor.col,
      );
    }

    if (!placed) {
      this.ui.playInvalidDropFeedback(this.drag.originCard);
      this.hooks.onInvalidDrop?.({
        slotIndex: this.drag.slotIndex,
        piece: this.drag.piece,
      });
    } else {
      this.hooks.onDropSuccess?.({
        slotIndex: this.drag.slotIndex,
        piece: this.drag.piece,
      });
    }

    this.abortDrag();
  };

  onPointerCancel = () => {
    this.abortDrag();
  };

  scheduleDragFrame() {
    if (!this.drag || this.drag.rafId) {
      return;
    }
    this.drag.rafId = requestAnimationFrame(() => {
      if (!this.drag) {
        return;
      }
      this.drag.rafId = 0;
      const controlPoint = this.getControlPoint(this.drag.lastClientX, this.drag.lastClientY);
      const isTouch = this.drag.pointerType === "touch";
      const lift = this.state.tuning.INPUT.DRAG_LIFT_PX;
      const x = controlPoint.x - this.drag.grabOffsetX;
      const y = isTouch
        ? controlPoint.y - this.drag.grabOffsetY
        : controlPoint.y - this.drag.grabOffsetY - lift;

      this.ui.positionFloatingPiece(this.drag.dragEl, x, y);
      this.updatePreviewFromPoint(controlPoint.x, controlPoint.y);
    });
  }

  getControlPoint(clientX, clientY) {
    if (!this.drag || this.drag.pointerType !== "touch") {
      return { x: clientX, y: clientY };
    }

    const touchOffset = this.getTouchAimOffset(clientX, clientY);
    return {
      x: clientX,
      y: Math.max(6, clientY - touchOffset),
    };
  }

  getTouchAimOffset(clientX, clientY) {
    if (!this.drag) {
      return this.state.tuning.INPUT.DRAG_TOUCH_AIM_OFFSET_Y;
    }

    const inputTuning = this.state.tuning.INPUT;
    const baseOffset = inputTuning.DRAG_TOUCH_AIM_OFFSET_Y ?? 88;
    const boardExtra = inputTuning.DRAG_TOUCH_AIM_OFFSET_BOARD_EXTRA_Y ?? 10;
    const maxOffset = inputTuning.DRAG_TOUCH_AIM_OFFSET_MAX_Y ?? 108;
    const lerp = inputTuning.DRAG_TOUCH_AIM_LERP ?? 0.34;
    const proximity = inputTuning.DRAG_TOUCH_AIM_BOARD_PROXIMITY_PX ?? 56;

    let targetOffset = baseOffset;
    const boardRect = this.ui.elements.board?.getBoundingClientRect?.();
    if (boardRect) {
      const nearBoard =
        clientX >= boardRect.left - proximity &&
        clientX <= boardRect.right + proximity &&
        clientY >= boardRect.top - proximity &&
        clientY <= boardRect.bottom + proximity;
      if (nearBoard) {
        targetOffset = Math.min(maxOffset, baseOffset + boardExtra);
      }
    }

    if (!Number.isFinite(this.drag.smoothedTouchOffsetY)) {
      this.drag.smoothedTouchOffsetY = targetOffset;
      return targetOffset;
    }

    this.drag.smoothedTouchOffsetY += (targetOffset - this.drag.smoothedTouchOffsetY) * lerp;
    return this.drag.smoothedTouchOffsetY;
  }

  updatePreviewFromPoint(clientX, clientY) {
    if (!this.drag) {
      return;
    }
    const boardAnchor = this.ui.resolveBoardAnchor(clientX, clientY, this.drag.anchor);
    if (!boardAnchor) {
      this.drag.boardAnchor = null;
      this.drag.preview = null;
      this.ui.clearGhost();
      return;
    }

    const preview = this.state.getPlacementPreview(
      this.drag.slotIndex,
      boardAnchor.row,
      boardAnchor.col,
    );

    this.drag.boardAnchor = boardAnchor;
    this.drag.preview = preview;
    this.ui.showGhost(preview.cells, preview.valid);
  }

  abortDrag() {
    if (!this.drag) {
      return;
    }
    if (this.drag.rafId) {
      cancelAnimationFrame(this.drag.rafId);
    }
    this.drag.dragEl.remove();
    this.drag.originCard?.classList.remove("piece-card--active", "piece-card--dragging");
    if (this.drag.originCard) {
      this.drag.originCard.style.visibility = this.drag.originVisibility || "";
    }
    this.drag = null;
    this.ui.endDragSession?.();
    this.ui.clearGhost();
    const latest = this.state.getSnapshot?.();
    if (latest?.pieces && typeof this.ui.renderPieces === "function") {
      this.ui.renderPieces(latest.pieces);
    }
  }
}
