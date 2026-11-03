import { test, expect, type Page } from "@playwright/test";

// Run ONLY against an isolated Supabase test project with Turnstile test keys.
// No mock authentication, mock REST responses, or synthetic realtime delivery.
test.skip(
  !process.env.LIVE_E2E,
  "Set LIVE_E2E=1 after configuring a separate Supabase test project.",
);
async function authenticated(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const key = Object.keys(localStorage).find((k) =>
        /^sb-.*-auth-token$/.test(k),
      );
      const session = key
        ? JSON.parse(localStorage.getItem(key) || "null")
        : null;
      const response = await fetch(`/api${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, method, body },
  );
}
async function join(page: Page, name: string) {
  await page.goto("/join");
  await page
    .getByRole("button", { name: "Join anonymously" })
    .click({ timeout: 30000 });
  await page.getByLabel("Your public nickname").fill(name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Fresh graduate" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Tech & Software" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Enter the lounge" }).click();
  await expect(
    page.getByRole("heading", { name: "The Unemployment Lounge" }),
  ).toBeVisible();
  return (await authenticated(page, "/me")).data;
}
test("two real anonymous sessions: onboarding, persistence, rooms, consent, realtime DMs, blocking", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  const suffix = Date.now().toString(36);
  const nameA = `E2E_A_${suffix}`,
    nameB = `E2E_B_${suffix}`;
  try {
    const profileA = await join(pa, nameA);
    const profileB = await join(pb, nameB);
    expect(profileA.id).not.toBe(profileB.id);
    const publicText = `Small win ${suffix}: testing real conversations.`;
    await pa
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(publicText);
    await pa.getByRole("button", { name: "Send message" }).click();
    await expect(pb.getByText(publicText, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await pb.reload();
    await expect(pb.getByText(publicText, { exact: true })).toBeVisible();
    await pb.getByRole("link", { name: "Design & Creative" }).click();
    await expect(
      pb.getByRole("heading", { name: "Design & Creative" }),
    ).toBeVisible();
    expect(
      (
        await authenticated(pa, "/dm-requests", "POST", {
          recipient_id: profileB.id,
        })
      ).status,
    ).toBe(403);
    await pb.goto("/app/settings");
    await pb
      .getByRole("checkbox", {
        name: "Allow private chat requests",
        exact: true,
      })
      .check();
    await pb
      .getByRole("button", { name: "Save profile & preferences" })
      .click();
    await expect(pb.getByText("Your corner, updated.")).toBeVisible();
    await pb.goto("/app/lounge");
    await pb
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(`Hello from ${nameB}`);
    await pb.getByRole("button", { name: "Send message" }).click();
    await expect(
      pa.getByText(`Hello from ${nameB}`, { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await pa.getByRole("button", { name: nameB, exact: true }).click();
    await pa.getByRole("button", { name: "Request chat", exact: true }).click();
    await pb.goto("/app/messages");
    await pb.getByRole("button", { name: "Accept", exact: true }).click();
    await pb.getByRole("link", { name: new RegExp(nameA) }).click();
    await pa.goto("/app/messages");
    await pa.getByRole("link", { name: new RegExp(nameB) }).click();
    const privateText = `Approved private hello ${suffix}`;
    await pa
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(privateText);
    await pa.getByRole("button", { name: "Send message" }).click();
    await expect(pb.getByText(privateText, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await pb.setViewportSize({ width: 390, height: 844 });
    expect(
      await pb.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await pb.screenshot({ path: "test-results/live-private-mobile.png" });
    await pb
      .getByRole("button", { name: "Private conversation options" })
      .click();
    await pb.getByRole("button", { name: "Block user", exact: true }).click();
    const conversationId = new URL(pa.url()).pathname.split("/").at(-1);
    expect(
      (
        await authenticated(
          pa,
          `/conversations/${conversationId}/messages`,
          "POST",
          { content: `blocked ${suffix}`, client_id: crypto.randomUUID() },
        )
      ).status,
    ).toBe(403);
  } finally {
    for (const page of [pa, pb]) {
      const result = await authenticated(page, "/me", "DELETE").catch(
        () => null,
      );
      if (result && result.status !== 200)
        console.warn(
          "Test account cleanup needs attention; DELETE /api/me returned",
          result.status,
        );
    }
    await a.close();
    await b.close();
  }
});
