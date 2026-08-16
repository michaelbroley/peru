/**
 * Chaska sprite player — REFERENCE IMPLEMENTATION.
 *
 * This is a design reference, not production code. It shows the intended
 * timing, layering and interaction contract. Recreate it using whatever your
 * codebase already uses (React, Vue, SwiftUI, Compose, Lottie-adjacent, etc.).
 *
 * Usage:
 *   <script src="chaska-player.js"></script>
 *   <chaska-llama state="idle" scale="2"></chaska-llama>
 *
 * Attributes:
 *   state  — animation id from chaska-manifest.json (default "idle")
 *   scale  — integer display multiplier (default 2 → 80 css px)
 *   base   — path to the sprites folder (default "./sprites")
 *   paused — presence freezes on the current frame (the "llama off" state)
 */
class ChaskaLlama extends HTMLElement {
  static FRAME = 40;
  static CELL = 160; // 40 * 4, the exported cell size

  // mirror of chaska-manifest.json rows: [frames, fps]
  static ANIMS = {
    ladybee:[8,8], maido:[8,7], dress:[8,7], eat:[8,6], flag:[6,8], ruins:[6,5],
    nazca:[8,8], rainbow:[8,6], boat:[6,5], amazon:[8,7], inti:[8,8],
    wave:[6,8], dance:[8,10], idle:[8,4], run:[6,12], trip:[8,10], tap:[6,10]
  };

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<div part="sprite" style="
      image-rendering:pixelated;
      background-repeat:no-repeat;
      cursor:pointer;
    "></div>`;
    this.el = this.shadowRoot.firstElementChild;
    this.frame = 0;
    this.acc = 0;
    this.last = 0;
    this.override = null;      // tap reaction plays over the current state
    this.overrideUntil = 0;
    this.addEventListener('click', () => this.poke());
    this.apply();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  disconnectedCallback() { cancelAnimationFrame(this.raf); }
  static get observedAttributes() { return ['state', 'scale', 'base', 'paused']; }
  attributeChangedCallback() { if (this.el) this.apply(); }

  get state()  { return this.getAttribute('state') || 'idle'; }
  get scale()  { return parseInt(this.getAttribute('scale') || '2', 10); }
  get base()   { return this.getAttribute('base') || './sprites'; }
  get paused() { return this.hasAttribute('paused'); }

  /** Cheeky spit — plays once over whatever is running, then hands back. */
  poke() {
    this.override = 'tap';
    this.overrideUntil = performance.now() + 600;
    this.frame = 0;
    this.acc = 0;
  }

  current() {
    if (this.override && performance.now() < this.overrideUntil) return this.override;
    this.override = null;
    return this.state;
  }

  apply() {
    const id = this.current();
    const [frames] = ChaskaLlama.ANIMS[id] || ChaskaLlama.ANIMS.idle;
    const size = ChaskaLlama.FRAME * this.scale;
    const s = this.el.style;
    s.width = size + 'px';
    s.height = size + 'px';
    s.backgroundImage = `url("${this.base}/chaska-${id}-4x.png")`;
    s.backgroundSize = `${frames * size}px ${size}px`;
    s.backgroundPosition = `-${this.frame * size}px 0`;
  }

  loop(ts) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = ts;
    const dt = ts - this.last;
    this.last = ts;
    if (this.paused && !this.override) return;

    const id = this.current();
    const [frames, fps] = ChaskaLlama.ANIMS[id] || ChaskaLlama.ANIMS.idle;
    this.acc += dt;
    const hold = 1000 / fps;
    while (this.acc >= hold) {
      this.acc -= hold;
      this.frame = (this.frame + 1) % frames;
    }
    this.apply();
  }
}

customElements.define('chaska-llama', ChaskaLlama);
