import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeRequire = createRequire(import.meta.url);
function loadTs(file) {
  const name = path.resolve(__dirname, "..", file),
    m = new Module(name);
  m.filename = name;
  m.paths = Module._nodeModulePaths(path.dirname(name));
  m.require = (request) =>
    request === "./affiliate-policy"
      ? loadTs("lib/affiliate-policy.ts")
      : nodeRequire(request);
  m._compile(
    ts.transpileModule(fs.readFileSync(name, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    name,
  );
  return m.exports;
}
process.env.AFFILIATE_AUTH_SECRET = "isolated-test-secret";
const security = loadTs("lib/affiliate-security.ts");
let db;
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const rpc = async (name, args) =>
  (
    await one(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    )
  ).result;
const account = async (email = "partner@example.test") =>
  (
    await one("insert into affiliates(email,name) values($1,$2) returning id", [
      email,
      "Mitra Test",
    ])
  ).id;
async function order(
  id,
  affiliateId,
  amount = 179000,
  email = "buyer@example.test",
) {
  await db.query(
    "insert into checkout_orders(id,email,plan,amount,affiliate_id) values($1,$2,$3,$4,$5)",
    [id, email, amount === 1499000 ? "yearly" : "monthly", amount, affiliateId],
  );
}
async function settle(id, affiliateId, amount = 179000) {
  await order(id, affiliateId, amount);
  return rpc("affiliate_record_payment", [id, amount, "paid"]);
}
const mature = () =>
  db.exec("update affiliate_commissions set ready_at=now()-interval '1 day'");
const withdraw = (id) =>
  rpc("affiliate_request_payout", [id, "BCA", "1234567890", "Mitra Test"]);
before(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create table licenses(key text primary key,email text,status text,plan text,stripe_customer_id text,stripe_subscription_id text,created_at timestamptz default now());",
  );
  await db.exec(
    fs.readFileSync(
      path.join(
        __dirname,
        "../supabase/migrations/202610130001_affiliates.sql",
      ),
      "utf8",
    ),
  );
});
after(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec(
    "truncate affiliates,affiliate_otps,affiliate_auth_requests,affiliate_sessions,licenses restart identity cascade",
  );
});

test("signed referral expires at 30 days and cannot be extended, replaced, or forged", () => {
  const now = Date.now(),
    cookie = security.signReferral("123456abcdef", now);
  assert.equal(security.readReferral(cookie, now + 1), "123456abcdef");
  assert.equal(security.readReferral(cookie, now + 30 * 86400000), null);
  assert.equal(
    security.readReferral(
      cookie.replace("123456abcdef", "abcdef123456"),
      now + 1,
    ),
    null,
  );
  assert.equal(
    security.readReferral(
      cookie.replace(/\.\d+\./, ".9999999999999."),
      now + 1,
    ),
    null,
  );
  assert.equal(security.readReferral("123456abcdef", now), null);
  assert.equal(
    security.sameOrigin(
      new Request("https://intervai.my.id/api/affiliate", {
        headers: { origin: "https://attacker.test" },
      }),
    ),
    false,
  );
});
test("registration requires a correct, unexpired, one-use OTP and stores only a hashed session", async () => {
  const email = "member@example.test",
    hash = security.otpHash(email, "123456");
  await rpc("affiliate_issue_otp", [email, "Mitra", hash, "ip-one"]);
  assert.equal(
    await rpc("affiliate_verify_otp", [email, "wrong", "session-one"]),
    null,
  );
  assert.equal((await one("select count(*)::int as n from affiliates")).n, 0);
  const id = await rpc("affiliate_verify_otp", [email, hash, "session-one"]);
  assert.ok(id);
  assert.equal(
    (
      await one(
        "select affiliate_id from affiliate_sessions where token_hash=$1",
        ["session-one"],
      )
    ).affiliate_id,
    id,
  );
  assert.equal(
    await rpc("affiliate_verify_otp", [email, hash, "session-two"]),
    null,
  );
});
test("OTP five-attempt limit, expiry, email cooldown and IP rate limit are enforced in PostgreSQL", async () => {
  await rpc("affiliate_issue_otp", [
    "a@example.test",
    "Mitra",
    "hash",
    "shared-ip",
  ]);
  await assert.rejects(
    rpc("affiliate_issue_otp", ["a@example.test", "Mitra", "new", "shared-ip"]),
    /RATE_LIMIT/,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      await rpc("affiliate_verify_otp", ["a@example.test", "wrong", "s" + i]),
      null,
    );
  assert.equal(
    await rpc("affiliate_verify_otp", ["a@example.test", "hash", "correct"]),
    null,
  );
  await rpc("affiliate_issue_otp", [
    "b@example.test",
    "Mitra",
    "hash",
    "another-ip",
  ]);
  await db.exec(
    "update affiliate_otps set expires_at=now()-interval '1 second'",
  );
  assert.equal(
    await rpc("affiliate_verify_otp", ["b@example.test", "hash", "expired"]),
    null,
  );
  for (let i = 1; i < 10; i++)
    await rpc("affiliate_issue_otp", [
      `ip${i}@example.test`,
      "Mitra",
      "hash",
      "shared-ip",
    ]);
  await assert.rejects(
    rpc("affiliate_issue_otp", [
      "extra@example.test",
      "Mitra",
      "hash",
      "shared-ip",
    ]),
    /RATE_LIMIT/,
  );
});
test("30% commissions use server order amount; duplicate, out-of-order and unpaid notifications do not add earnings", async () => {
  const id = await account();
  await order("monthly", id);
  await rpc("affiliate_record_payment", ["monthly", 179000, "unpaid"]);
  assert.equal(
    (await one("select count(*)::int as n from affiliate_commissions")).n,
    0,
  );
  await assert.rejects(
    rpc("affiliate_record_payment", ["monthly", 179001, "paid"]),
    /AMOUNT_MISMATCH/,
  );
  await rpc("affiliate_record_payment", ["monthly", 179000, "paid"]);
  await rpc("affiliate_record_payment", ["monthly", 179000, "paid"]);
  await rpc("affiliate_record_payment", ["monthly", 179000, "unpaid"]);
  await settle("yearly", id, 1499000);
  const rows = (
    await db.query("select amount from affiliate_commissions order by amount")
  ).rows;
  assert.deepEqual(
    rows.map((r) => r.amount),
    [53700, 449700],
  );
  assert.equal(
    (await one("select status from checkout_orders where id=$1", ["monthly"]))
      .status,
    "paid",
  );
});
test("self referrals and blocked accounts do not earn commissions", async () => {
  const id = await account();
  await order("self", id, 179000, "partner@example.test");
  await rpc("affiliate_record_payment", ["self", 179000, "paid"]);
  await db.query("update affiliates set status='blocked' where id=$1", [id]);
  await settle("blocked", id);
  assert.equal(
    (await one("select count(*)::int as n from affiliate_commissions")).n,
    0,
  );
  await assert.rejects(withdraw(id), /ACCOUNT_BLOCKED/);
});
test("14-day hold, minimum Rp100000 and double withdrawals prevent overspending", async () => {
  const id = await account();
  await settle("m1", id);
  await settle("m2", id);
  await assert.rejects(withdraw(id), /MINIMUM_PAYOUT/);
  assert.equal((await rpc("affiliate_dashboard", [id])).stats.hold, 107400);
  await mature();
  const results = await Promise.allSettled([withdraw(id), withdraw(id)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const data = await rpc("affiliate_dashboard", [id]);
  assert.equal(data.stats.available, 0);
  assert.equal(data.stats.in_review, 107400);
});
test("rejecting a payout restores eligible commissions; resolving twice is rejected", async () => {
  const id = await account();
  await settle("year", id, 1499000);
  await mature();
  const pid = await withdraw(id);
  await rpc("affiliate_resolve_payout", [
    pid,
    "rejected",
    "Nomor rekening tidak sesuai",
  ]);
  assert.equal(
    (await rpc("affiliate_dashboard", [id])).stats.available,
    449700,
  );
  await assert.rejects(
    rpc("affiliate_resolve_payout", [pid, "paid", "transfer-1"]),
    /ALREADY_RESOLVED/,
  );
  const next = await withdraw(id);
  await rpc("affiliate_resolve_payout", [next, "paid", "BANK-TRANSFER-123"]);
  assert.equal((await rpc("affiliate_dashboard", [id])).stats.paid, 449700);
});
test("refund during payout review cancels the payout and restores other transactions", async () => {
  const id = await account();
  for (let n = 0; n < 3; n++) await settle("order" + n, id);
  await mature();
  const pid = await withdraw(id);
  await rpc("affiliate_record_payment", ["order0", 179000, "reversed"]);
  const data = await rpc("affiliate_dashboard", [id]);
  assert.equal(data.stats.available, 107400);
  assert.equal(data.stats.in_review, 0);
  assert.equal(
    (await one("select status from affiliate_payouts where id=$1", [pid]))
      .status,
    "rejected",
  );
  await rpc("affiliate_record_payment", ["order0", 179000, "paid"]);
  assert.equal(
    (
      await one("select status from affiliate_commissions where order_id=$1", [
        "order0",
      ])
    ).status,
    "void",
  );
});
test("refund after a paid payout creates a single debit and offsets the next payout", async () => {
  const id = await account();
  await settle("old", id, 1499000);
  await mature();
  const pid = await withdraw(id);
  await rpc("affiliate_resolve_payout", [pid, "paid", "BANK-1"]);
  await rpc("affiliate_record_payment", ["old", 1499000, "reversed"]);
  await rpc("affiliate_record_payment", ["old", 1499000, "reversed"]);
  assert.equal(
    (await one("select count(*)::int as n from affiliate_debits")).n,
    1,
  );
  assert.equal((await rpc("affiliate_dashboard", [id])).stats.debt, 449700);
  await settle("new1", id, 1499000);
  await mature();
  await assert.rejects(withdraw(id), /MINIMUM_PAYOUT/);
  await settle("new2", id, 1499000);
  await mature();
  const next = await withdraw(id);
  const payout = await one(
    "select amount,debit_amount from affiliate_payouts where id=$1",
    [next],
  );
  assert.deepEqual(payout, { amount: 449700, debit_amount: 449700 });
});
test("license preparation is idempotent and dashboard does not expose buyer emails or full bank numbers", async () => {
  const id = await account();
  await settle("license", id, 1499000);
  const first = await rpc("affiliate_prepare_license", ["license", "KEY-ONE"]);
  const second = await rpc("affiliate_prepare_license", ["license", "KEY-TWO"]);
  assert.equal(first.key, second.key);
  assert.equal((await one("select count(*)::int as n from licenses")).n, 1);
  await mature();
  await withdraw(id);
  const data = await rpc("affiliate_dashboard", [id]);
  assert.equal(data.payouts[0].account_last4, "7890");
  assert.equal(data.payouts[0].account_number, undefined);
  assert.equal(data.commissions[0].email, undefined);
  const other = await account("other@example.test");
  assert.equal((await rpc("affiliate_dashboard", [other])).stats.sales, 0);
});
test("anonymous/authenticated roles cannot read private tables or call privileged RPCs", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec("set role " + role);
    try {
      await assert.rejects(
        db.query("select * from affiliate_sessions"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select affiliate_admin_dashboard()"),
        /permission denied/,
      );
    } finally {
      await db.exec("reset role");
    }
  }
});
