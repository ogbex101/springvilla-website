import type { Instrumentation } from "next";

/**
 * Records every unexpected server error (rendering, route handlers, server
 * actions, including failures before an action's own code runs) in the audit
 * log as "server.error", with the path and Next's error digest. No request
 * bodies, headers or cookies are stored.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/errors");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  await reportServerError(`request.${context.routeType}`, err, {
    path: request.path.split("?")[0].slice(0, 200),
    method: request.method,
    route: context.routePath,
    digest,
  });
};
