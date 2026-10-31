import { getStore } from "@netlify/blobs";

const store = getStore("math-traders-reviews");
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export default async (request) => {
  if (request.method === "GET") {
    try {
      const list = await store.get("published-reviews", { type: "json" });
      return json({ reviews: Array.isArray(list) ? list : [] });
    } catch {
      return json({ reviews: [] });
    }
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }

  // Honeypot spam field: silently accept but do not store bot submissions.
  if (String(body.botField || "").trim()) return json({ ok: true });

  const name = String(body.name || "").trim().slice(0, 100);
  const course = String(body.course || "").trim().slice(0, 160);
  const review = String(body.review || "").trim().slice(0, 1200);
  const rating = Number(body.rating);

  if (!name || !course || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: "Please complete the required fields and choose a rating from 1 to 5." }, 400);
  }

  const reviews = await store.get("published-reviews", { type: "json" }).catch(() => []);
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const item = {
    id: crypto.randomUUID(),
    name,
    course,
    rating,
    review,
    date: new Date().toISOString()
  };
  safeReviews.unshift(item);
  await store.setJSON("published-reviews", safeReviews);
  return json({ ok: true, review: item }, 201);
};
