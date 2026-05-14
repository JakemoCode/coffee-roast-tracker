// Vercel serverless function that hosts the Apollo GraphQL API.
//
// The handler delegates to ApolloServer.executeHTTPGraphQLRequest — the
// portable, framework-agnostic Apollo entry point. Local dev still uses
// server/src/index.ts with startStandaloneServer; this file only runs in
// the Vercel runtime.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ApolloServer, type HeaderMap } from "@apollo/server";
import { typeDefs } from "../server/src/schema/typeDefs.js";
import { resolvers } from "../server/src/resolvers/index.js";
import { createContext, type Context } from "../server/src/context.js";

const server = new ApolloServer<Context>({ typeDefs, resolvers });

// `server.start()` is single-shot; cache the promise so warm invocations
// resolve immediately and concurrent cold starts share one boot.
let startPromise: Promise<void> | null = null;
function ensureStarted() {
  if (!startPromise) startPromise = server.start();
  return startPromise;
}

function buildHeaderMap(headers: VercelRequest["headers"]): HeaderMap {
  const map = new Map<string, string>() as HeaderMap;
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue;
    map.set(k.toLowerCase(), Array.isArray(v) ? v.join(", ") : v);
  }
  return map;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureStarted();

  // Body comes pre-parsed when the request is JSON. For GET, Apollo parses
  // the query string itself from search.
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  const httpResponse = await server.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: (req.method ?? "POST").toUpperCase(),
      headers: buildHeaderMap(req.headers),
      search: url.search,
      body: req.body,
    },
    context: async () => createContext({ req }),
  });

  res.status(httpResponse.status ?? 200);
  for (const [k, v] of httpResponse.headers) res.setHeader(k, v);

  if (httpResponse.body.kind === "complete") {
    res.send(httpResponse.body.string);
    return;
  }
  // Streamed response (deferred / multipart). Pipe chunks through.
  for await (const chunk of httpResponse.body.asyncIterator) {
    res.write(chunk);
  }
  res.end();
}
