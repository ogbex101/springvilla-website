import { totp } from "../../tests/e2e/helpers";
console.log(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000) === "287082" ? "TOTP matches RFC 6238 vector" : "TOTP MISMATCH");
