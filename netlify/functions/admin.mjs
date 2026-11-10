import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export default async function (request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { password } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_TOKEN_SECRET;

    if (!adminPassword || !secret) {
      return json({ error: "Admin configuration missing" }, 500);
    }

    if (typeof password !== "string") {
      return json({ error: "Invalid password" }, 401);
    }

    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);

    const valid =
      a.length === b.length &&
      timingSafeEqual(a, b);

    if (!valid) {
      return json({ error: "Incorrect password" }, 401);
    }

    const payload = Buffer.from(
      JSON.stringify({
        role: "admin",
        exp: Date.now() + 8 * 60 * 60 * 1000
      })
    ).toString("base64url");

    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    return json({
      ok: true,
      token: `${payload}.${signature}`
    });

  } catch {
    return json({ error: "Invalid request" }, 400);
  }
}
