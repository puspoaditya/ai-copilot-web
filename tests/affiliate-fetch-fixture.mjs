// Loaded only by the isolated integration harness, never imported by the application.
const origin = process.env.AFFILIATE_TEST_PROVIDER_ORIGIN;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || ""))
  throw new Error("Integration fixture requires a localhost provider");
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  let target = url.href;
  if (url.hostname === "app.midtrans.com") target = origin + "/provider/snap";
  else if (url.hostname === "api.midtrans.com")
    target = origin + "/provider/status/" + url.pathname.split("/")[2];
  else if (url.hostname === "api.resend.com")
    target = origin + "/provider/emails";
  else if (
    url.hostname === "build-check.invalid" ||
    url.hostname.endsWith(".supabase.co")
  )
    target = origin + url.pathname + url.search;
  else if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
    throw new Error(
      "External network blocked by affiliate integration fixture",
    );
  return nativeFetch(
    input instanceof Request ? new Request(target, input) : target,
    options,
  );
};
