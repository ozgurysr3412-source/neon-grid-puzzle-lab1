export const JOURNEY_SCREEN_PARTIAL_HTML = `
<div class="overlay journey-overlay" id="journey-overlay">
  <div class="journey-screen" id="journey-screen">
    <header class="journey-header">
      <button id="journey-back-btn" class="journey-back-btn" type="button" aria-label="Back">
        <span class="journey-back-icon" aria-hidden="true">&larr;</span>
      </button>
      <h2 class="journey-title">Journey</h2>
      <div class="journey-progress" id="journey-progress" aria-label="Journey progress">
        <span class="journey-progress__crown" aria-hidden="true">♛</span>
        <span class="journey-progress__value" id="journey-progress-value">1 / 100</span>
      </div>
    </header>

    <section class="journey-map-wrap">
      <div id="journey-level-map" class="journey-level-map" aria-label="Journey level map"></div>
    </section>

    <div class="journey-start-wrap">
      <button id="journey-start-btn" class="journey-start-btn" type="button" aria-label="Start selected level">
        <span id="journey-start-label" class="journey-start-label">Level 1</span>
      </button>
    </div>
  </div>
</div>
`.trim();

export function mountJourneyScreenPartial(rootId = "journey-screen-root") {
  const root = document.getElementById(rootId);
  if (!root || root.querySelector("#journey-overlay")) {
    return;
  }
  root.insertAdjacentHTML("afterbegin", JOURNEY_SCREEN_PARTIAL_HTML);
}
