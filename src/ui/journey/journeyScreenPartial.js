export const JOURNEY_SCREEN_PARTIAL_HTML = `
<div class="overlay journey-overlay" id="journey-overlay">
  <div class="journey-screen" id="journey-screen">
    <header class="journey-header">
      <button id="journey-back-btn" class="journey-back-btn" type="button" aria-label="Back">
        <span class="journey-back-icon" aria-hidden="true">&larr;</span>
      </button>
      <h2 class="journey-title">Journey</h2>
      <div class="journey-header-spacer" aria-hidden="true"></div>
    </header>

    <section class="journey-hero">
      <div class="journey-chest-wrap" aria-hidden="true">
        <img src="./assets/ui/journey/chest-glow-rays.webp" class="journey-chest-glow" alt="" />
        <img src="./assets/ui/journey/chest-gold.webp" class="journey-chest-image" alt="" />
      </div>
      <p class="journey-hero-note">Complete all 100 levels to unlock!</p>
    </section>

    <section class="journey-map-wrap">
      <img src="./assets/ui/journey/trophy-silhouette-bg.webp" class="journey-trophy" alt="" aria-hidden="true" />
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
