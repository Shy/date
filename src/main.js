import { createIcons, Briefcase, GraduationCap, MapPin, X, Star, Heart } from "lucide";
import profiles from "./data.json";
import "./style.css";

const icons = { Briefcase, GraduationCap, MapPin, X, Star, Heart };
createIcons({ icons });

const STACK_SIZE = 3;
const SWIPE_X = 100; // px past which a release counts as a swipe
const SWIPE_UP = 120;
const FLICK_VELOCITY = 0.5; // px/ms; a fast flick counts even if short
const ROTATION = 0.08; // deg per px of horizontal drag
const BEHIND_SCALE = 0.94;
const SPRING = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const deck = document.querySelector(".deck");
const template = document.getElementById("card-template");
const imageUrl = (n) => `${import.meta.env.BASE_URL}images/shy_${n}.jpg`;

// Warm the cache so incoming cards never flash blank
profiles.forEach((p) => (new Image().src = imageUrl(p.image)));

let nextProfile = 0;

function buildCard() {
  const profile = profiles[nextProfile];
  nextProfile = (nextProfile + 1) % profiles.length;
  const card = template.content.firstElementChild.cloneNode(true);
  card.style.backgroundImage = `url("${imageUrl(profile.image)}")`;
  card.querySelectorAll("[data-field]").forEach((el) => (el.textContent = profile[el.dataset.field]));
  createIcons({ icons, root: card });
  return card;
}

// Cards are stacked in DOM order: the first non-flying card is the top card
const stack = () => [...deck.querySelectorAll(".photo:not(.flying)")];
const topCard = () => stack()[0];

function fillDeck() {
  while (stack().length < STACK_SIZE) deck.append(buildCard());
  layoutStack(0);
}

// progress (0..1) is how far the top card has been dragged toward a swipe;
// the card behind grows into place as the top card leaves
function layoutStack(progress) {
  stack().forEach((card, i) => {
    if (i === 0) return;
    const depth = Math.max(0, i - progress);
    card.style.transform = `scale(${1 - (1 - BEHIND_SCALE) * Math.min(depth, 1)})`;
    card.style.zIndex = STACK_SIZE - i;
    card.inert = true;
  });
  const top = topCard();
  if (top) {
    top.style.zIndex = STACK_SIZE;
    top.inert = false;
  }
}

function setStamps(card, dx, dy) {
  const side = Math.min(1, Math.max(0, (Math.abs(dx) - 20) / (SWIPE_X - 20)));
  const up = Math.min(1, Math.max(0, (-dy - 30) / (SWIPE_UP - 30)));
  // Whichever direction dominates wins the stamp
  const superWins = up > side;
  card.querySelector(".stamp-like").style.opacity = !superWins && dx > 0 ? side : 0;
  card.querySelector(".stamp-nope").style.opacity = !superWins && dx < 0 ? side : 0;
  card.querySelector(".stamp-super").style.opacity = superWins ? up : 0;
}

function cardTransform(dx, dy, rotateSign) {
  return `translate(${dx}px, ${dy}px) rotate(${dx * ROTATION * rotateSign}deg)`;
}

// Throw the top card off-screen, then drop it and refill the stack
function flyOut(card, { dx, dy, vx = 0, vy = 0, rotateSign = 1, direction }) {
  card.classList.add("flying");
  card.inert = true;
  card.style.zIndex = STACK_SIZE + 1;
  stack().forEach((c) => (c.style.transition = `transform 350ms ${SPRING}`));
  layoutStack(0);
  fillDeck();

  const distance = Math.max(innerWidth, innerHeight) * 1.2;
  let toX, toY;
  if (direction === "up") {
    toX = dx + vx * 200;
    toY = -distance;
  } else {
    const sign = Math.sign(dx) || Math.sign(vx) || 1;
    toX = sign * distance;
    // Keep the throw angle consistent with the release velocity
    toY = dy + (Math.abs(vx) > 0.1 ? (vy / Math.abs(vx)) * (distance - Math.abs(dx)) : 0);
  }
  const speed = Math.max(Math.hypot(vx, vy), 1);
  const duration = reducedMotion ? 150 : Math.min(500, Math.max(250, 450 / speed));

  card
    .animate(
      [
        { transform: cardTransform(dx, dy, rotateSign) },
        { transform: cardTransform(toX, toY, rotateSign) },
      ],
      { duration, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" },
    )
    .finished.then(() => card.remove());
  // Animations pause in background tabs; don't let thrown cards pile up
  setTimeout(() => card.remove(), duration + 100);
}

function snapBack(card) {
  card.style.transition = `transform ${reducedMotion ? 0 : 450}ms ${SPRING}`;
  card.style.transform = "";
  card.querySelectorAll(".stamp").forEach((s) => {
    s.style.transition = "opacity 200ms";
    s.style.opacity = 0;
  });
  stack().slice(1).forEach((c) => (c.style.transition = `transform 450ms ${SPRING}`));
  layoutStack(0);
}

// Dragging
let drag = null;

deck.addEventListener("pointerdown", (e) => {
  const card = topCard();
  if (!card || !card.contains(e.target) || drag) return;
  card.setPointerCapture(e.pointerId);
  const rect = card.getBoundingClientRect();
  drag = {
    card,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    dx: 0,
    dy: 0,
    // Grabbing the bottom half tilts the card the other way, like holding a real card
    rotateSign: e.clientY > rect.top + rect.height / 2 ? -1 : 1,
    samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
  };
  card.style.transition = "none";
  card.querySelectorAll(".stamp").forEach((s) => (s.style.transition = "none"));
  stack().forEach((c) => (c.style.transition = "none"));
  card.classList.add("moving");
});

deck.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  drag.dx = e.clientX - drag.startX;
  drag.dy = e.clientY - drag.startY;
  drag.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  if (drag.samples.length > 5) drag.samples.shift();

  const { card, dx, dy, rotateSign } = drag;
  card.style.transform = cardTransform(dx, dy, rotateSign);
  setStamps(card, dx, dy);
  layoutStack(Math.min(1, Math.max(Math.abs(dx) / SWIPE_X, -dy / SWIPE_UP, 0)));
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const { card, dx, dy, rotateSign, samples } = drag;
  drag = null;
  card.classList.remove("moving");

  // Velocity from the last few samples, so a pause before release reads as slow
  const first = samples[0];
  const last = samples.at(-1);
  const dt = Math.max(1, last.t - first.t);
  const vx = (last.x - first.x) / dt;
  const vy = (last.y - first.y) / dt;

  const flickX = Math.abs(vx) > FLICK_VELOCITY && Math.sign(vx) === Math.sign(dx);
  const flickUp = vy < -FLICK_VELOCITY && dy < 0 && Math.abs(vy) > Math.abs(vx);

  if ((-dy > SWIPE_UP && -dy > Math.abs(dx)) || flickUp) {
    flyOut(card, { dx, dy, vx, vy, rotateSign, direction: "up" });
  } else if (Math.abs(dx) > SWIPE_X || flickX) {
    flyOut(card, { dx, dy, vx, vy, rotateSign, direction: "side" });
  } else {
    snapBack(card);
  }
}

deck.addEventListener("pointerup", endDrag);
deck.addEventListener("pointercancel", endDrag);

// Buttons
function react(reaction) {
  const card = topCard();
  if (!card || drag) return;

  if (reaction === "super_like") {
    card.querySelector(".stamp-super").style.opacity = 1;
    flyOut(card, { dx: 0, dy: 0, vx: 0, vy: -1.5, direction: "up" });
    return;
  }
  const nope = reaction === "dislike";
  card.querySelector(nope ? ".stamp-nope" : ".stamp-like").style.opacity = 1;
  const sign = nope ? -1 : 1;
  flyOut(card, { dx: 0, dy: 0, vx: sign * 1.5, vy: -0.3, direction: "side" });
}

document.querySelectorAll("[data-reaction]").forEach((btn) =>
  btn.addEventListener("click", () => {
    btn.animate([{ scale: 1 }, { scale: 0.85 }, { scale: 1 }], { duration: 250, easing: SPRING });
    react(btn.dataset.reaction);
  }),
);

addEventListener("keydown", (e) => {
  const key = { ArrowLeft: "dislike", ArrowRight: "like", ArrowUp: "super_like" }[e.key];
  if (key) react(key);
});

fillDeck();
