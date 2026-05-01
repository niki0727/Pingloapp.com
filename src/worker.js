const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const waitlistScript = `
<script>
(() => {
  const form = document.getElementById("waitlist-form");
  const status = document.getElementById("waitlist-status");
  if (!form || !status || form.dataset.pingloAutomatic === "true") return;

  form.dataset.pingloAutomatic = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = document.getElementById("waitlist-email").value.trim();
    const phone = document.getElementById("waitlist-phone").value.trim();
    const consent = document.getElementById("waitlist-consent").checked;

    if (!email && !phone) {
      status.textContent = "Add an email or phone number so we can contact you.";
      return;
    }

    if (!consent) {
      status.textContent = "Please confirm consent before joining the waitlist.";
      return;
    }

    status.textContent = "Adding you to the list...";

    fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, phone, consent })
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Something went wrong. Please try again.");
        }

        form.reset();
        status.textContent = "You’re on the list. We’ll contact you when Pinglo is ready.";
      })
      .catch((error) => {
        status.textContent = error.message;
      });
  }, { capture: true });
})();
</script>`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders
  });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return !phone || /^[+()\d\s.-]{7,24}$/.test(phone);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed." }, 405);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid request body." }, 400);
      }

      const email = clean(payload.email).toLowerCase();
      const phone = clean(payload.phone);
      const consent = payload.consent === true;

      if (!consent) {
        return json({ ok: false, error: "Consent is required." }, 400);
      }

      if (!email && !phone) {
        return json({ ok: false, error: "Add an email or phone number." }, 400);
      }

      if (!isValidEmail(email)) {
        return json({ ok: false, error: "Enter a valid email address." }, 400);
      }

      if (!isValidPhone(phone)) {
        return json({ ok: false, error: "Enter a valid phone number." }, 400);
      }

      await env.DB.prepare(
        `INSERT INTO waitlist_signups (email, phone, consent, source, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(email || null, phone || null, 1, "pingloapp.com", new Date().toISOString())
        .run();

      return json({ ok: true });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "Not found." }, 404);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return new HTMLRewriter()
        .on("title", {
          text(text) {
            text.replace(
              text.text
                .replace("Pinglo — Lost & Found Made Simple", "Pinglo Lost & Found Made Simple")
                .replace("Pinglo — History", "Pinglo History")
            );
          }
        })
        .on("body", {
          element(element) {
            element.append(waitlistScript, { html: true });
          }
        })
        .transform(assetResponse);
    }

    return assetResponse;
  }
};
