
import { getStore } from "@netlify/blobs";

const store = getStore("math-traders-reviews");

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

async function getReviews() {
  const reviews = await store.get("published-reviews", {
    type: "json"
  });
  return Array.isArray(reviews) ? reviews : [];
}

export default async (request) => {
  try {
    // PUBLIC: Display all reviews
    if (request.method === "GET") {
      const reviews = await getReviews();
      return json({ reviews });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    // PUBLIC: Automatically publish student reviews
    if (request.method === "POST") {
      if (String(body.botField || "").trim()) {
        return json({ ok: true });
      }

      const name = String(body.name || "").trim().slice(0, 100);
      const course = String(body.course || "").trim().slice(0, 160);
      const review = String(body.review || "").trim().slice(0, 1200);
      const rating = Number(body.rating);

      if (
        !name ||
        !course ||
        !review ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return json({
          error: "Please complete all required fields and choose a rating from 1 to 5."
        }, 400);
      }

      const reviews = await getReviews();

      const item = {
        id: globalThis.crypto.randomUUID(),
        name,
        course,
        rating,
        review,
        date: new Date().toISOString()
      };

      reviews.unshift(item);

      await store.setJSON("published-reviews", reviews);

      return json({ ok: true, review: item }, 201);
    }

    // ADMIN: Delete a review
    if (request.method === "DELETE") {
      const password = process.env.ADMIN_PASSWORD || "";
      const authorization = request.headers.get("authorization") || "";

      if (
        !password ||
        authorization !== `Bearer ${password}`
      ) {
        return json({ error: "Unauthorized" }, 401);
      }

      const id = String(body.id || "").trim();

      if (!id) {
        return json({ error: "Review ID is required" }, 400);
      }

      const reviews = await getReviews();
      const updatedReviews = reviews.filter(
        item => String(item.id) !== id
      );

      if (updatedReviews.length === reviews.length) {
        return json({ error: "Review not found" }, 404);
      }

      await store.setJSON("published-reviews", updatedReviews);

      return json({ ok: true, message: "Review deleted successfully" });
    }

    return json({ error: "Method not allowed" }, 405);

  } catch (error) {
    return json({ error: "Server error" }, 500);
  }
};
