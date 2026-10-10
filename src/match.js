// "It's a Match!" overlay shown after a like; posts to the Cloudflare Worker in /worker.

const ENDPOINT = "/api/match";
const tap = matchMedia("(pointer: fine)").matches ? "Click" : "Tap";
const MAX_PHOTO_EDGE = 1600; // px; keeps uploads well under the email size cap
// Keep in sync with worker/src/index.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isPhone = (s) => /^\+?[\d\s().-]+$/.test(s) && s.replace(/\D/g, "").length >= 7;

const overlay = document.getElementById("match");
const form = overlay.querySelector("form");
const status = overlay.querySelector(".match-status");
const sendButton = overlay.querySelector(".match-send");
const photoInput = form.elements.photo;
const yourPhoto = overlay.querySelector(".match-photo.you");
const shyPhoto = overlay.querySelector(".match-photo.shy");
const photoCaption = overlay.querySelector(".match-photo-caption");

let resizedPhoto = null;
let closeTimer;

export const isMatchOpen = () => !overlay.hidden;

export function openMatch(profile, imageUrl) {
  clearTimeout(closeTimer);
  shyPhoto.style.backgroundImage = `url("${imageUrl}")`;
  shyPhoto.classList.toggle("focused", Boolean(profile.matchFocus));
  shyPhoto.style.setProperty("--focus", profile.matchFocus ?? "");
  form.elements.card.value = `${profile.job} (photo ${profile.image})`;
  status.textContent = "";
  sendButton.disabled = false;
  overlay.hidden = false;
  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  overlay
    .querySelector(".match-title")
    .animate([{ scale: 0.6, opacity: 0 }, { scale: 1.08 }, { scale: 1, opacity: 1 }], {
      duration: 500,
      easing: "ease-out",
    });
  // Don't pop the keyboard on phones; desktop gets focus for typing straight away
  if (matchMedia("(pointer: fine)").matches) form.elements.name.focus();
}

function closeMatch() {
  overlay.hidden = true;
}

overlay.querySelector(".match-skip").addEventListener("click", closeMatch);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isMatchOpen()) closeMatch();
});

// Downscale to a JPEG in the browser so phone photos (often 5MB+) fit in an email
async function resize(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  resizedPhoto = null;
  yourPhoto.style.backgroundImage = "";
  yourPhoto.classList.remove("filled");
  photoCaption.textContent = "Your turn: add a photo of you";
  if (!file) return;
  try {
    resizedPhoto = await resize(file);
    yourPhoto.style.backgroundImage = `url("${URL.createObjectURL(resizedPhoto)}")`;
    yourPhoto.classList.add("filled");
    photoCaption.textContent = `${tap} your photo to change it`;
  } catch {
    status.textContent = "Couldn't read that photo. Try a different one?";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const contact = form.elements.contact.value.trim();
  if (!EMAIL_RE.test(contact) && !isPhone(contact)) {
    status.textContent = "Enter an email address or phone number.";
    form.elements.contact.focus();
    return;
  }
  // Fair's fair: they've seen Shy, so a photo is required
  if (!resizedPhoto) {
    status.textContent = `Add a photo of you first. ${tap} the camera.`;
    yourPhoto.animate(
      [{ translate: "0" }, { translate: "-6px" }, { translate: "6px" }, { translate: "-4px" }, { translate: "0" }],
      { duration: 350 },
    );
    photoInput.focus();
    return;
  }
  const body = new FormData(form);
  body.delete("photo");
  if (resizedPhoto) body.append("photo", resizedPhoto, "photo.jpg");

  sendButton.disabled = true;
  status.textContent = "Sending…";
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || "Something went wrong");
    status.textContent = "Sent! Shy will be in touch.";
    form.elements.message.value = "";
    closeTimer = setTimeout(closeMatch, 1800);
  } catch (err) {
    status.textContent = err.message === "Failed to fetch" ? "Couldn't connect. Try again?" : err.message;
    sendButton.disabled = false;
  }
});
