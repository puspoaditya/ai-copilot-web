import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tables = new Set([
  "affiliates",
  "affiliate_sessions",
  "affiliate_otps",
  "affiliate_clicks",
  "checkout_orders",
  "affiliate_commissions",
  "affiliate_payouts",
  "affiliate_debits",
  "licenses",
]);
const key = "integration-midtrans-key";
const identifier = (value) => {
  if (!/^[a-z_]+$/.test(value)) throw Error("Invalid test identifier");
  return '"' + value + '"';
};
export async function startHarness({ enabled = true, migrated = true } = {}) {
  const db = new PGlite(),
    payments = new Map(),
    emails = [];
  let failLicense = false;
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create table licenses(key text primary key,email text,status text,plan text,stripe_customer_id text,stripe_subscription_id text,created_at timestamptz default now());",
  );
  if (migrated)
    await db.exec(
      fs.readFileSync(
        path.join(root, "supabase/migrations/202610130001_affiliates.sql"),
        "utf8",
      ),
    );
  const mock = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    try {
      const url = new URL(req.url, "http://localhost"),
        text = await new Promise((resolve) => {
          let data = "";
          req.on("data", (d) => (data += d));
          req.on("end", () => resolve(data));
        }),
        body = text ? JSON.parse(text) : null;
      if (url.pathname === "/provider/snap") {
        const p = body.transaction_details;
        payments.set(p.order_id, {
          order_id: p.order_id,
          gross_amount: String(p.gross_amount) + ".00",
          transaction_status: "pending",
          fraud_status: "accept",
        });
        return send(201, { token: "snap-" + p.order_id });
      }
      if (url.pathname.startsWith("/provider/status/"))
        return send(
          200,
          payments.get(decodeURIComponent(url.pathname.split("/").at(-1))),
        );
      if (url.pathname === "/provider/emails") {
        if (failLicense && body.subject.includes("License Key")) {
          failLicense = false;
          return send(500, {
            name: "application_error",
            message: "Isolated delivery failure",
          });
        }
        emails.push(body);
        return send(200, { id: "test-email-" + emails.length });
      }
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        const func = url.pathname.split("/").at(-1);
        if (!/^affiliate_[a-z_]+$/.test(func))
          throw Error("Invalid test function");
        const entries = Object.entries(body || {}),
          args = entries
            .map(([k], i) => identifier(k) + "=> $" + (i + 1))
            .join(",");
        const result = await db.query(
          `select public.${identifier(func)}(${args}) as result`,
          entries.map(([, v]) => v),
        );
        return send(200, result.rows[0].result);
      }
      const table = url.pathname.split("/").at(-1);
      if (!tables.has(table))
        return send(404, { message: "Unknown test table", code: "PGRST205" });
      const values = [],
        filters = [];
      const parameter = (value) => {
        values.push(value);
        return "$" + values.length;
      };
      for (const [column, filter] of url.searchParams) {
        if (["select", "order", "limit", "on_conflict"].includes(column))
          continue;
        const split = filter.indexOf("."),
          op = filter.slice(0, split),
          value = filter.slice(split + 1);
        if (!["eq", "gt", "neq"].includes(op))
          throw Error("Unsupported test filter");
        filters.push(
          identifier(column) +
            { eq: "=", gt: ">", neq: "<>" }[op] +
            parameter(value),
        );
      }
      const where = filters.length ? " where " + filters.join(" and ") : "";
      let rows = [];
      if (req.method === "GET") {
        const selected = (url.searchParams.get("select") || "*")
          .split(",")
          .map((c) => (c === "*" ? "*" : identifier(c)))
          .join(",");
        const order = url.searchParams.get("order");
        const ordering = order
          ? " order by " +
            identifier(order.split(".")[0]) +
            (order.endsWith(".desc") ? " desc" : " asc")
          : "";
        rows = (
          await db.query(
            `select ${selected} from ${identifier(table)}${where}${ordering}`,
            values,
          )
        ).rows;
      } else if (req.method === "POST") {
        const entries = Object.entries(body),
          columns = entries.map(([k]) => identifier(k)).join(","),
          params = entries.map(([, v]) => parameter(v)).join(",");
        const conflict = (req.headers.prefer || "").includes(
          "resolution=ignore-duplicates",
        )
          ? " on conflict do nothing"
          : "";
        rows = (
          await db.query(
            `insert into ${identifier(table)}(${columns}) values(${params})${conflict} returning *`,
            values,
          )
        ).rows;
      } else if (req.method === "PATCH") {
        const updates = Object.entries(body)
          .map(([k, v]) => identifier(k) + "=" + parameter(v))
          .join(",");
        rows = (
          await db.query(
            `update ${identifier(table)} set ${updates}${where} returning *`,
            values,
          )
        ).rows;
      } else if (req.method === "DELETE")
        await db.query(`delete from ${identifier(table)}${where}`, values);
      if (req.headers.accept?.includes("vnd.pgrst.object")) {
        if (rows.length !== 1)
          return send(406, {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
            details: rows.length + " rows",
          });
        return send(200, rows[0]);
      }
      if (
        req.method === "GET" ||
        (req.headers.prefer || "").includes("return=representation")
      )
        return send(200, rows);
      return send(204);
    } catch (error) {
      console.error("Integration fixture:", error.message);
      send(400, { message: error.message, code: error.code || "TEST_ERROR" });
    }
  });
  await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
  const provider = "http://127.0.0.1:" + mock.address().port,
    origin = "http://127.0.0.1:3451";
  const next = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3451",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_OPTIONS:
          "--import=" + path.join(root, "tests/affiliate-fetch-fixture.mjs"),
        AFFILIATE_TEST_PROVIDER_ORIGIN: provider,
        AFFILIATE_ENABLED: String(enabled),
        NEXT_PUBLIC_SUPABASE_URL: provider,
        SUPABASE_SERVICE_ROLE_KEY: "isolated-supabase-key",
        AFFILIATE_AUTH_SECRET: "isolated-secret",
        MIDTRANS_SERVER_KEY: key,
        RESEND_API_KEY: "re_isolated",
        ADMIN_PASSWORD: "isolated-admin",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  next.stderr.on("data", (d) => {
    logs += d.toString();
    process.stderr.write(d);
  });
  await new Promise((resolve, reject) => {
    next.stdout.on("data", (d) => {
      if (d.toString().includes("Ready")) resolve();
    });
    next.once("exit", (c) => reject(Error("Next.js exited " + c + " " + logs)));
  });
  return {
    db,
    payments,
    emails,
    origin,
    failNextLicense: () => {
      failLicense = true;
    },
    close: async () => {
      if (next.exitCode === null && next.signalCode === null) {
        const stopped = new Promise((resolve) => next.once("exit", resolve));
        next.kill();
        await stopped;
      }
      await new Promise((resolve) => mock.close(resolve));
      await db.close();
    },
  };
}
function cookies(response) {
  return response.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
}
export async function runAPI(h) {
  const { db, payments, emails, origin } = h;
  const request = async (url, body, cookie = "", method = "POST") => {
    const response = await fetch(origin + url, {
      method,
      headers: { "content-type": "application/json", origin, cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await response.text();
    return {
      status: response.status,
      data: text ? JSON.parse(text) : null,
      cookie: cookies(response),
      headers: response.headers,
    };
  };
  const dashboard = async (cookie) =>
    (await request("/api/affiliate", undefined, cookie, "GET")).data;
  const notify = async (orderId, claimed = "settlement", signature = true) => {
    const amount = payments.get(orderId).gross_amount;
    return request("/api/notification", {
      order_id: orderId,
      status_code: "200",
      gross_amount: amount,
      signature_key: signature
        ? createHash("sha512")
            .update(orderId + "200" + amount + key)
            .digest("hex")
        : "forged",
      transaction_status: claimed,
      customer_details: { email: "forged@example.test" },
    });
  };
  assert.equal((await dashboard("")).account, null);
  assert.equal(
    (
      await request("/api/affiliate", {
        action: "request_code",
        name: "Partner QA",
        email: "partner@example.test",
      })
    ).status,
    200,
  );
  const otp = emails.at(-1).html.match(/>(\d{6})</)[1];
  assert.equal(
    (
      await request("/api/affiliate", {
        action: "request_code",
        name: "Partner QA",
        email: "partner@example.test",
      })
    ).status,
    429,
  );
  const login = await request("/api/affiliate", {
    action: "verify_code",
    email: "partner@example.test",
    code: otp,
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  const session = login.cookie,
    account = (await dashboard(session)).account;
  assert.equal(
    (
      await request("/api/affiliate", {
        action: "verify_code",
        email: "partner@example.test",
        code: otp,
      })
    ).status,
    401,
  );
  const click = await request("/r/" + account.code, undefined, "", "GET");
  assert.equal(click.status, 302);
  assert.match(click.headers.get("set-cookie"), /HttpOnly/);
  assert.equal(click.headers.get("cache-control"), "private, no-store");
  const referral = click.cookie;
  await request("/r/" + account.code, undefined, referral, "GET");
  assert.equal((await dashboard(session)).stats.clicks, 1);
  assert.equal(
    (await request("/r/not-valid", undefined, referral, "GET")).cookie,
    "",
  );
  assert.equal(
    (
      await request(
        "/api/create-checkout",
        { email: "buyer@example.test", plan: "free" },
        referral,
      )
    ).status,
    400,
  );
  const checkout = await request(
    "/api/create-checkout",
    { email: "buyer@example.test", plan: "monthly", amount: 1 },
    referral,
  );
  assert.equal(checkout.status, 200);
  const order = checkout.data.orderId;
  assert.equal(payments.get(order).gross_amount, "179000.00");
  assert.equal((await notify(order, "settlement", false)).status, 400);
  assert.equal((await notify(order)).status, 200);
  assert.equal(
    (await dashboard(session)).stats.sales,
    0,
    "Forged settlement must not create earnings while provider says pending",
  );
  payments.get(order).transaction_status = "settlement";
  assert.equal((await notify(order)).status, 200);
  assert.equal((await notify(order)).status, 200);
  assert.equal((await dashboard(session)).stats.hold, 53700);
  assert.equal(
    (await db.query("select count(*)::int as n from licenses")).rows[0].n,
    1,
  );
  assert.equal(
    (await db.query("select email from licenses")).rows[0].email,
    "buyer@example.test",
    "Unsigned webhook email is ignored",
  );
  const self = await request(
    "/api/create-checkout",
    { email: "partner@example.test", plan: "monthly" },
    referral,
  );
  assert.equal(
    (
      await db.query("select affiliate_id from checkout_orders where id=$1", [
        self.data.orderId,
      ])
    ).rows[0].affiliate_id,
    null,
  );
  const forged = referral.replace(account.code, "abcdef123456");
  const noRef = await request(
    "/api/create-checkout",
    { email: "other@example.test", plan: "monthly" },
    forged,
  );
  assert.equal(
    (
      await db.query("select affiliate_id from checkout_orders where id=$1", [
        noRef.data.orderId,
      ])
    ).rows[0].affiliate_id,
    null,
  );
  const annual = await request(
    "/api/create-checkout",
    { email: "annual@example.test", plan: "yearly" },
    referral,
  );
  payments.get(annual.data.orderId).transaction_status = "settlement";
  h.failNextLicense();
  assert.equal((await notify(annual.data.orderId)).status, 503);
  assert.equal((await notify(annual.data.orderId)).status, 200);
  assert.equal((await dashboard(session)).stats.sales, 2);
  const bank = {
    action: "withdraw",
    bank: "BCA",
    account_number: "1234567890",
    account_name: "Partner QA",
  };
  assert.equal((await request("/api/affiliate", bank)).status, 401);
  assert.equal((await request("/api/affiliate", bank, session)).status, 400);
  await db.exec(
    "update affiliate_commissions set ready_at=now()-interval '1 day'",
  );
  const payout = await request("/api/affiliate", bank, session);
  assert.equal(payout.status, 200);
  assert.equal((await request("/api/affiliate", bank, session)).status, 400);
  assert.equal(
    (await request("/api/admin/affiliate", { password: "wrong" })).status,
    401,
  );
  const admin = await request("/api/admin/affiliate", {
    password: "isolated-admin",
  });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.payouts[0].amount, 503400);
  assert.equal(
    (
      await request(
        "/api/admin/affiliate",
        {
          password: "isolated-admin",
          id: payout.data.id,
          action: "rejected",
          reference: "Rekening belum sesuai",
        },
        "",
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal((await dashboard(session)).stats.available, 503400);
  const again = await request("/api/affiliate", bank, session);
  assert.equal(
    (
      await request(
        "/api/admin/affiliate",
        {
          password: "isolated-admin",
          id: again.data.id,
          action: "paid",
          reference: "BANK-QA-001",
        },
        "",
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/api/admin/affiliate",
        {
          password: "isolated-admin",
          id: again.data.id,
          action: "paid",
          reference: "BANK-QA-002",
        },
        "",
        "PATCH",
      )
    ).status,
    409,
  );
  payments.get(annual.data.orderId).transaction_status = "refund";
  assert.equal((await notify(annual.data.orderId)).status, 200);
  assert.equal((await dashboard(session)).stats.debt, 449700);
  const cross = await fetch(origin + "/api/affiliate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.test",
      cookie: session,
    },
    body: JSON.stringify(bank),
  });
  assert.equal(cross.status, 403);
  assert.equal(
    (await request("/api/affiliate", { action: "logout" }, session)).status,
    200,
  );
  assert.equal((await dashboard(session)).account, null);
  console.log(
    "Integration passed: email OTP, referral attribution, checkout, authoritative payment state, idempotency, email retry, payout review, refund adjustment, session and origin controls. No live provider calls.",
  );
}
export async function runDisabledCompatibility() {
  const h = await startHarness({ enabled: false, migrated: false });
  try {
    const send = async (route, body) => {
      const response = await fetch(h.origin + route, {
        method: "POST",
        headers: { "content-type": "application/json", origin: h.origin },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    };
    const portal = await fetch(h.origin + "/api/affiliate");
    assert.equal((await portal.json()).enabled, false);
    assert.equal(
      (
        await send("/api/affiliate", {
          action: "request_code",
          email: "disabled@example.test",
          name: "Test",
        })
      ).status,
      503,
    );
    const checkout = await send("/api/create-checkout", {
      email: "legacy@example.test",
      plan: "monthly",
    });
    assert.equal(checkout.status, 200);
    const id = checkout.data.orderId,
      amount = "179000.00";
    const notification = await send("/api/notification", {
      order_id: id,
      status_code: "200",
      gross_amount: amount,
      signature_key: createHash("sha512")
        .update(id + "200" + amount + key)
        .digest("hex"),
      transaction_status: "settlement",
      customer_details: { email: "legacy@example.test" },
    });
    assert.equal(notification.status, 200);
    assert.equal(
      (await h.db.query("select count(*)::int as n from licenses")).rows[0].n,
      1,
    );
    console.log(
      "Compatibility passed: disabled affiliate mode preserves checkout and legacy license fulfillment without the new schema.",
    );
  } finally {
    await h.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const h = await startHarness();
  try {
    await runAPI(h);
  } finally {
    await h.close();
  }
  await runDisabledCompatibility();
}
