
import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";

const store = getStore("math-traders-admin-content");

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

const defaultCourses = [
  {
    title: "Commodity Futures",
    subtitle: "Math-based commodity futures trading",
    details: "Gold, GoldM, Goldten, Goldguinea, Goldpetal, Silver, Silverm, Silvermic, Silver100"
  },
  {
    title: "NIFTY 50 Option Buying",
    subtitle: "Excel-powered probability models",
    details: "Swing Trading Only"
  },
  {
    title: "Option Selling",
    subtitle: "System-based option selling",
    details: "NIFTY 50 Option Selling"
  }
];

const defaultTopics = [
  "Stock Market Basics",
  "Trading Types",
  "Trading Strategy",
  "Option Basics",
  "Commodity Basics",
  "Money Management",
  "Risk Management",
  "Trading Psychology",
  "Wealth Creation",
  "Order Placing",
  "System Based Trading",
  "Trading Tips",
  "Rollover",
  "Doubt Clearing"
];

function verifyAdminToken(token) {
  try {
    const secret = process.env.ADMIN_TOKEN_SECRET;
    if (!secret || !token) return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return false;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return data.role === "admin" && data.exp > Date.now();
  } catch {
    return false;
  }
}

async function getContent() {
  const saved = await store.get("content", { type: "json" });

  return {
    courses: Array.isArray(saved?.courses)
      ? saved.courses
      : defaultCourses,
    topics: Array.isArray(saved?.topics)
      ? saved.topics
      : defaultTopics
  };
}

export default async function (request) {
  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!verifyAdminToken(token)) {
      return json({ error: "Unauthorized. Please login again." }, 401);
    }

    if (request.method === "GET") {
      return json(await getContent());
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON request" }, 400);
    }

    const current = await getContent();

    if (Array.isArray(body.courses)) {
      if (
        body.courses.length !== 3 ||
        body.courses.some(course =>
          typeof course.title !== "string" ||
          typeof course.subtitle !== "string" ||
          typeof course.details !== "string"
        )
      ) {
        return json({ error: "Please provide all three valid courses." }, 400);
      }

      current.courses = body.courses.map(course => ({
        title: course.title.trim().slice(0, 100),
        subtitle: course.subtitle.trim().slice(0, 180),
        details: course.details.trim().slice(0, 1000)
      }));
    }

    if (Array.isArray(body.topics)) {
      if (
        body.topics.length > 100 ||
        body.topics.some(topic => typeof topic !== "string")
      ) {
        return json({ error: "Invalid course topics." }, 400);
      }

      current.topics = body.topics
        .map(topic => topic.trim().slice(0, 150))
        .filter(Boolean);
    }

    if (!Array.isArray(body.courses) && !Array.isArray(body.topics)) {
      return json({ error: "No valid content supplied." }, 400);
    }

    await store.setJSON("content", current);

    return json({ ok: true, message: "Content saved successfully." });
  } catch (error) {
    return json({ error: "Server error. Please try again." }, 500);
  }
}
