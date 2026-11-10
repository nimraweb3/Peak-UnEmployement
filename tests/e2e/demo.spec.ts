import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.skip(!process.env.DEMO_E2E, "Requires the isolated local demo");
test("demo identities, persisted chat, reactions, consent and blocking", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const river = await browser.newContext(),
    jules = await browser.newContext();
  const a = await river.newPage(),
    b = await jules.newPage();
  const origin = "http://127.0.0.1:5175";
  const call = async (
    page: typeof a,
    path: string,
    method = "GET",
    body?: unknown,
  ) =>
    page.evaluate(
      async ({ path, method, body }) => {
        const r = await fetch("/api" + path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { path, method, body },
    );
  try {
    await a.goto(origin);
    await call(a, "/demo/session", "POST", {
      id: "10000000-0000-4000-8000-000000000001",
    });
    await a.goto(origin + "/app/lounge");
    await expect(a.getByLabel("Message", { exact: true })).toBeVisible();
    await b.goto(origin);
    await call(b, "/demo/session", "POST", {
      id: "10000000-0000-4000-8000-000000000002",
    });
    await b.goto(origin + "/app/lounge");
    await expect(b.getByLabel("Message", { exact: true })).toBeVisible();
    const me = (await call(a, "/me")).data,
      other = (await call(b, "/me")).data;
    const rooms = (await call(a, "/rooms")).data;
    const room = rooms.find((r: { slug: string }) => r.slug === "lounge").id;
    const draft = "Emoji check " + Date.now();
    const text = draft + "😀";
    await a.getByLabel("Message", { exact: true }).fill(draft);
    await a.getByRole("button", { name: "Add emoji", exact: true }).click();
    await a.getByRole("button", { name: "Smile", exact: true }).click();
    await expect(a.getByLabel("Message", { exact: true })).toHaveValue(text);
    await a.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(a.getByText(text, { exact: true })).toBeVisible();
    await a.reload();
    await expect(a.getByText(text, { exact: true })).toBeVisible();
    const message = (
      await call(a, "/rooms/" + room + "/messages")
    ).data.items.find((m: { content: string }) => m.content === text);
    expect(
      (
        await call(b, "/messages/" + message.id + "/reactions", "POST", {
          emoji: "💜",
        })
      ).status,
    ).toBe(200);
    const reacted = (
      await call(a, "/rooms/" + room + "/messages")
    ).data.items.find((m: { id: string }) => m.id === message.id);
    expect(reacted.reactions).toContainEqual({
      user_id: other.id,
      emoji: "💜",
    });
    await call(a, "/blocks/" + other.id, "DELETE");
    await call(b, "/blocks/" + me.id, "DELETE");
    let requests = (await call(a, "/dm-requests")).data;
    if (!requests.length) {
      expect(
        (await call(a, "/dm-requests", "POST", { recipient_id: other.id }))
          .status,
      ).toBe(201);
      requests = (await call(a, "/dm-requests")).data;
    }
    const request = requests[0];
    if (request.status === "pending") {
      const sender = request.sender_id === me.id ? a : b;
      const recipient = request.sender_id === me.id ? b : a;
      expect(
        (
          await call(sender, "/dm-requests/" + request.id, "PATCH", {
            status: "accepted",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await call(recipient, "/dm-requests/" + request.id, "PATCH", {
            status: "accepted",
          })
        ).status,
      ).toBe(200);
    }
    const conversations = (await call(a, "/conversations")).data;
    expect(conversations.length).toBeGreaterThan(0);
    const conversation = conversations[0].id;
    expect(
      (
        await call(a, "/conversations/" + conversation + "/messages", "POST", {
          content: "Private demo " + Date.now(),
          client_id: crypto.randomUUID(),
        })
      ).status,
    ).toBe(201);
    expect((await call(b, "/blocks", "POST", { user_id: me.id })).status).toBe(
      200,
    );
    expect(
      (
        await call(a, "/conversations/" + conversation + "/messages", "POST", {
          content: "Blocked message",
          client_id: crypto.randomUUID(),
        })
      ).status,
    ).toBe(400);
    await call(b, "/blocks/" + me.id, "DELETE");
    await a.goto(origin + "/app/settings");
    await expect(
      a.getByText("This is a local demo identity.", { exact: false }),
    ).toBeVisible();
    await a.goto(origin + "/");
    await expect(a.getByLabel("Message", { exact: true })).toBeVisible();
    await a.setViewportSize({ width: 1440, height: 1000 });
    await a.screenshot({
      path: "docs/screenshots/community-demo-desktop.png",
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page: a })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await a.setViewportSize({ width: 390, height: 844 });
    expect(
      await a.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await a.screenshot({
      path: "docs/screenshots/community-demo-mobile.png",
      fullPage: true,
    });
  } finally {
    await river.close();
    await jules.close();
  }
});
