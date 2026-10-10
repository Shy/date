// Receives "It's a Match!" form posts from shy.date and emails them to MATCH_TO.

const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024; // email cap is 5 MiB after base64
const LIMITS = { name: 100, contact: 200, message: 1000, card: 200 };
// Keep in sync with src/match.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isPhone = (s) => /^\+?[\d\s().-]+$/.test(s) && s.replace(/\D/g, "").length >= 7;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/match") return json({ error: "Not found" }, 404);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
    if (!allowed.includes(request.headers.get("origin"))) return json({ error: "Forbidden" }, 403);

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Expected form data" }, 400);
    }

    // Honeypot: real people never see this field
    if (form.get("website")) return json({ ok: true });

    const field = (k) => String(form.get(k) ?? "").trim();
    const data = Object.fromEntries(Object.keys(LIMITS).map((k) => [k, field(k)]));
    if (!data.name || !data.contact) return json({ error: "Name and contact are required" }, 400);
    if (!EMAIL_RE.test(data.contact) && !isPhone(data.contact)) {
      return json({ error: "Enter an email address or phone number" }, 400);
    }
    for (const [k, max] of Object.entries(LIMITS)) {
      if (data[k].length > max) return json({ error: `${k} is too long` }, 400);
    }

    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return json({ error: "A photo is required" }, 400);
    if (!photo.type.startsWith("image/")) return json({ error: "Photo must be an image" }, 400);
    if (photo.size > MAX_PHOTO_BYTES) return json({ error: "Photo is too large" }, 400);
    const attachments = [
      {
        disposition: "attachment",
        filename: photo.name || "photo.jpg",
        type: photo.type,
        content: await photo.arrayBuffer(),
      },
    ];

    const rows = [
      ["Name", data.name],
      ["Contact", data.contact],
      ["Message", data.message || "(none)"],
      ["Liked card", data.card || "(unknown)"],
    ];

    try {
      await env.EMAIL.send({
        to: env.MATCH_TO,
        from: { name: "Shy.Date", email: env.FROM_ADDRESS },
        // Hitting reply goes straight to them when they left an email
        ...(EMAIL_RE.test(data.contact) && { replyTo: data.contact }),
        subject: `It's a match: ${data.name}`,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `<h2>It's a match!</h2><table cellpadding="6">${rows
          .map(([k, v]) => `<tr><th align="left">${k}</th><td>${escapeHtml(v)}</td></tr>`)
          .join("")}</table>`,
        attachments,
      });
    } catch (err) {
      console.error("send failed", err);
      return json({ error: "Couldn't send right now. Try again in a bit." }, 502);
    }

    return json({ ok: true });
  },
};
