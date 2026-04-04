const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stage = document.getElementById("tiltStage");
const floatingWindows = document.querySelectorAll(".floating-window");
const tiltCards = document.querySelectorAll("[data-tilt-card]");
const hedgehogQuote = document.getElementById("hedgehogQuote");
const playUrl = "https://play.google.com/store/apps/details?id=ai.agent1c.hitomi";
const hedgehogLines = [
  "Browser ready, fren.",
  "Need a quick page peek?",
  "Wallet watch is on.",
  "Tiny window, big helper.",
  "I can check onchain stuff.",
  "Terminal path is optional.",
  "Need me to open a tab?",
  "Still here if you need me."
];

const pointer = { x: 0.5, y: 0.5 };
let width = 0;
let height = 0;
let particles = [];
let animationId = 0;
let dragActive = false;
let hedgehogBubbleTimer = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seedParticles();
}

function seedParticles() {
  const count = Math.min(150, Math.max(80, Math.round((width * height) / 14000)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    size: Math.random() * 2 + 0.75,
    hue: Math.random() > 0.24 ? 190 : 42,
    alpha: Math.random() * 0.45 + 0.12
  }));
}

function flowField(x, y, t) {
  const nx = x / width - 0.5;
  const ny = y / height - 0.5;
  const angle = Math.sin(nx * 6 + t * 0.0005) + Math.cos(ny * 8 - t * 0.00045);
  return {
    fx: Math.cos(angle * Math.PI) * 0.18,
    fy: Math.sin(angle * Math.PI) * 0.18
  };
}

function drawFrame(time) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "screen";

  for (const p of particles) {
    const prevX = p.x;
    const prevY = p.y;
    const field = flowField(p.x, p.y, time);
    const pullX = (pointer.x * width - p.x) * 0.00018;
    const pullY = (pointer.y * height - p.y) * 0.00018;

    p.vx += field.fx + pullX;
    p.vy += field.fy + pullY;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;

    ctx.strokeStyle = p.hue === 190 ? `rgba(95, 227, 255, ${p.alpha})` : `rgba(255, 181, 108, ${p.alpha * 0.78})`;
    ctx.lineWidth = p.size * 0.6;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.fillStyle = p.hue === 190 ? `rgba(216, 255, 101, ${p.alpha * 0.55})` : `rgba(255, 255, 255, ${p.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  animationId = requestAnimationFrame(drawFrame);
}

function bindTilt() {
  if (!stage || reduceMotion) return;

  stage.addEventListener("pointermove", (event) => {
    if (dragActive) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 12;
    const rotateX = (0.5 - y) * 10;
    stage.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  stage.addEventListener("pointerleave", () => {
    if (dragActive) return;
    stage.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

function bindReveal() {
  const nodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.16 });

  nodes.forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
    observer.observe(node);
  });
}

function bindPointer() {
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / width;
    pointer.y = event.clientY / height;
  }, { passive: true });
}

function bindPlayLinks() {
  document.querySelectorAll(`a[href="${playUrl}"]`).forEach((link) => {
    link.setAttribute("aria-label", "Open Hitomi on Google Play");
  });
}

function bindFloatingWindows() {
  if (!floatingWindows.length) return;

  floatingWindows.forEach((panel) => {
    const state = { x: 0, y: 0, rotate: 0 };
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startStateX = 0;
    let startStateY = 0;
    let startRotate = 0;

    const apply = () => {
      panel.style.setProperty("--drag-x", `${state.x}px`);
      panel.style.setProperty("--drag-y", `${state.y}px`);
      panel.style.setProperty("--drag-rotate", `${state.rotate}deg`);
    };

    const release = () => {
      dragging = false;
      pointerId = null;
      dragActive = false;
      panel.classList.remove("is-dragging");
      stage.style.transform = "rotateX(0deg) rotateY(0deg)";
    };

    panel.addEventListener("pointerdown", (event) => {
      dragging = true;
      dragActive = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startStateX = state.x;
      startStateY = state.y;
      startRotate = state.rotate;
      panel.classList.add("is-dragging");
      panel.setPointerCapture(pointerId);
      event.preventDefault();
    });

    panel.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      state.x = Math.max(-58, Math.min(58, startStateX + dx));
      state.y = Math.max(-48, Math.min(48, startStateY + dy));
      state.rotate = Math.max(-14, Math.min(14, startRotate + dx * 0.08));
      apply();
      event.preventDefault();
    });

    panel.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointerId) return;
      release();
    });

    panel.addEventListener("pointercancel", release);
    panel.addEventListener("lostpointercapture", release);
    apply();
  });
}

function bindTiltCards() {
  if (!tiltCards.length || reduceMotion) return;

  tiltCards.forEach((card) => {
    const reset = () => {
      card.style.setProperty("--card-rotate-x", "0deg");
      card.style.setProperty("--card-rotate-y", "0deg");
    };

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 10;
      const rotateX = (0.5 - y) * 10;
      card.style.setProperty("--card-rotate-x", `${rotateX}deg`);
      card.style.setProperty("--card-rotate-y", `${rotateY}deg`);
    });

    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
    reset();
  });
}

function bindHedgehogQuote() {
  if (!hedgehogQuote) return;

  const textNode = hedgehogQuote.querySelector(".hedgehog-quote-text");
  if (!textNode) return;

  const scheduleNext = (minMs, maxMs) => {
    window.clearTimeout(hedgehogBubbleTimer);
    const delay = reduceMotion ? maxMs : Math.round(minMs + Math.random() * (maxMs - minMs));
    hedgehogBubbleTimer = window.setTimeout(showBubble, delay);
  };

  const showBubble = () => {
    const line = hedgehogLines[Math.floor(Math.random() * hedgehogLines.length)];
    textNode.textContent = line;
    hedgehogQuote.classList.add("is-visible");

    window.setTimeout(() => {
      hedgehogQuote.classList.remove("is-visible");
      scheduleNext(4800, 9600);
    }, reduceMotion ? 2400 : 3200);
  };

  scheduleNext(700, 1300);
}

resizeCanvas();
bindTilt();
bindReveal();
bindPointer();
bindPlayLinks();
bindFloatingWindows();
bindTiltCards();
bindHedgehogQuote();

if (!reduceMotion) {
  animationId = requestAnimationFrame(drawFrame);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationId);
  window.clearTimeout(hedgehogBubbleTimer);
});
