import { createIcons, Briefcase, GraduationCap, MapPin, X, Star, Heart } from "lucide";
import profiles from "./data.json";
import "./style.css";

createIcons({ icons: { Briefcase, GraduationCap, MapPin, X, Star, Heart } });

const SWIPE_X = 80;
const SWIPE_Y = 72;
const imageUrl = (n) => `${import.meta.env.BASE_URL}images/shy_${n}.jpg`;

const photo = document.querySelector(".photo");
const fields = ["job", "company", "location"].map((id) => document.getElementById(id));

// Warm the cache so the next card never flashes blank
profiles.forEach((p) => (new Image().src = imageUrl(p.image)));

let index = 0;
render(profiles[index]);

function render(profile) {
  fields.forEach((el) => (el.textContent = profile[el.id]));
  photo.style.backgroundImage = `url("${imageUrl(profile.image)}")`;
}

function setStamp(stamp) {
  photo.classList.toggle("like", stamp === "like");
  photo.classList.toggle("super_like", stamp === "super_like");
}

// Faster flicks fade faster, clamped between 150 and 400ms
const fadeDuration = (velocity) => Math.min(400, Math.max(150, 250 / (velocity + 0.4)));

function throwCard({ x, y, rotate, duration }) {
  photo.style.transitionDuration = `${duration}ms`;
  photo.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  photo.style.opacity = 0;
  nextCard(duration);
}

function nextCard(duration) {
  setTimeout(() => {
    index = (index + 1) % profiles.length;
    render(profiles[index]);
    photo.style.transform = "";
    setTimeout(() => {
      photo.classList.remove("like", "super_like", "moving");
      photo.style.opacity = 1;
    }, duration);
  }, duration);
}

// Drag handling via Pointer Events (mouse, touch, pen)
let drag = null;

photo.addEventListener("pointerdown", (e) => {
  photo.setPointerCapture(e.pointerId);
  drag = { startX: e.clientX, startY: e.clientY, startT: e.timeStamp, dx: 0, dy: 0 };
  photo.classList.add("moving");
});

photo.addEventListener("pointermove", (e) => {
  if (!drag) return;
  drag.dx = e.clientX - drag.startX;
  drag.dy = e.clientY - drag.startY;
  const { dx, dy } = drag;
  // Swiping either direction is a like. Nope is not an option.
  if (Math.abs(dx) > SWIPE_X) setStamp("like");
  else if (dy < -SWIPE_Y) setStamp("super_like");
  else setStamp(null);
  photo.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * dy * 4e-4}deg)`;
});

function endDrag(e) {
  if (!drag) return;
  const { dx, dy, startT } = drag;
  drag = null;
  const velocity = Math.hypot(dx, dy) / Math.max(1, e.timeStamp - startT);
  const duration = fadeDuration(velocity);

  if (Math.abs(dx) > SWIPE_X) {
    const mult = Math.max(1.4, velocity);
    throwCard({ x: dx * 1.4 * mult, y: dy * mult, rotate: dx * dy * 4e-4 * mult, duration });
  } else if (dy < -SWIPE_Y) {
    throwCard({ x: 0, y: dy * Math.max(2, velocity), rotate: 0, duration });
  } else {
    photo.classList.remove("moving");
    setStamp(null);
    photo.style.transform = "";
  }
}

photo.addEventListener("pointerup", endDrag);
photo.addEventListener("pointercancel", endDrag);

// Buttons
document.querySelectorAll("[data-reaction]").forEach((btn) =>
  btn.addEventListener("click", () => react(btn.dataset.reaction)),
);

function react(reaction) {
  const duration = Math.random() * 300 + 300;
  let x = Math.random() * 300 + 100;
  let y = Math.random() * 400 - 200;
  let rotate = x * y * 4e-4;

  if (reaction === "super_like") {
    setStamp("super_like");
    x = rotate = 0;
    y = -Math.abs(y) * 3;
  } else {
    // A "nope" was surely a misclick, so it counts as a like
    setStamp("like");
    if (reaction === "dislike") x *= -1;
  }
  throwCard({ x, y, rotate, duration: duration * 0.8 });
}
