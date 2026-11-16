import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const PASSWORD_SHA256 = "cfc9c2c625e1a9bb1c63c5b3b3c154373418c7f5ffd9432c2080b4d709999514";

function passwordMatches(password: string) {
  const fromEnv = process.env.DESK_PASSWORD;
  const expected = createHash("sha256")
    .update(fromEnv && fromEnv.length > 0 ? fromEnv : "")
    .digest();
  const actual = createHash("sha256").update(password).digest();
  if (fromEnv && fromEnv.length > 0) return timingSafeEqual(expected, actual);
  const fallback = Buffer.from(PASSWORD_SHA256, "hex");
  return timingSafeEqual(fallback, actual);
}

export function unlockDeskPassword(password: string) {
  if (!passwordMatches(password)) return { ok: false as const };
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const sig = createHmac("sha256", PASSWORD_SHA256).update(String(exp)).digest("hex");
  return { ok: true as const, ticket: `${exp}.${sig}` };
}

export function deskTicketValid(ticket: string) {
  const [exp, sig] = ticket.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = createHmac("sha256", PASSWORD_SHA256).update(exp).digest("hex");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
