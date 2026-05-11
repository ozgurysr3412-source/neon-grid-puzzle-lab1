export class Haptics {
  constructor() {
    this.enabled = true;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  isEnabled() {
    return this.enabled;
  }

  toggleEnabled() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  pulse(pattern) {
    if (!this.enabled) {
      return;
    }
    if (!("vibrate" in navigator)) {
      return;
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported environments.
    }
  }

  place() {
    this.pulse(8);
  }

  pickup() {
    this.pulse(5);
  }

  clear() {
    this.pulse([10, 18, 14]);
  }

  combo() {
    this.pulse([14, 20, 18]);
  }

  gameOver() {
    this.pulse([24, 34, 24]);
  }

  invalid() {
    this.pulse(12);
  }
}
