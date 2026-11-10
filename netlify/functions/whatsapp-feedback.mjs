
import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

const store = getStore("math-traders-whatsapp-feedback");

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

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

function authorized(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";
  return verifyAdminToken(token);
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // PUBLIC: List gallery photos
    if (request.method === "GET" && !id) {
      const { blobs } = await store.list({ prefix: "photos/" });

      const photos = await Promise.all(
        blobs.map(async (blob) => {
          const info = await store.getMetadata(blob.key);
          return {
            id: blob.key.slice("photos/".length),
            contentType: info?.metadata?.contentType || "image/jpeg",
            uploadedAt: info?.metadata?.uploadedAt || ""
          };
        })
      );

      photos.sort((a, b) =>
        b.uploadedAt.localeCompare(a.uploadedAt)
      );

      return json({ photos });
    }

    // PUBLIC: Display one photo
    if (request.method === "GET" && id) {
      if (!/^[a-f0-9-]{36}$/i.test(id)) {
        return json({ error: "Invalid photo ID" }, 400);
      }

      const result = await store.getWithMetadata(
        `photos/${id}`,
        { type: "arrayBuffer" }
      );

      if (!result) return json({ error: "Photo not found" }, 404);

      return new Response(result.data, {
        headers: {
          "Content-Type": result.metadata.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    // ADMIN: Upload photo
    if (request.method === "POST") {
      if (!authorized(request)) {
        return json({ error: "Unauthorized" }, 401);
      }

      const form = await request.formData();
      const file = form.get("photo");

      if (!file || typeof file.arrayBuffer !== "function") {
        return json({ error: "Please select a photo" }, 400);
      }

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowed.includes(file.type)) {
        return json({ error: "Only JPG, PNG and WebP photos are allowed" }, 400);
      }

      if (file.size > 4 * 1024 * 1024) {
        return json({ error: "Photo must be smaller than 4 MB" }, 400);
      }

      const id = randomUUID();

      await store.set(`photos/${id}`, await file.arrayBuffer(), {
        metadata: {
          contentType: file.type,
          uploadedAt: new Date().toISOString()
        }
      });

      return json({ ok: true, id }, 201);
    }

    // ADMIN: Delete photo
    if (request.method === "DELETE") {
      if (!authorized(request)) {
        return json({ error: "Unauthorized" }, 401);
      }

      const body = await request.json();
      const photoId = String(body.id || "");

      if (!/^[a-f0-9-]{36}$/i.test(photoId)) {
        return json({ error: "Invalid photo ID" }, 400);
      }

      const key = `photos/${photoId}`;
      const existing = await store.getMetadata(key);

      if (!existing) {
        return json({ error: "Photo not found" }, 404);
      }

      await store.delete(key);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);

  } catch (error) {
    return json({ error: "Server error" }, 500);
  }
};
