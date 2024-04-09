# TypeScript/JavaScript MTKruto Server Client

This is a TypeScript/JavaScript client for MTKruto Server that is mostly
compatible with [MTKruto](https://mtkru.to)’s
[`Client`](https://jsr.io/@mtkruto/mtkruto/doc/~/Client) class.*

It can run almost anywhere JavaScript runs, including serverless platforms like
Deno Deploy, Cloudflare Workers, and more.

---

<sub>*Only the
[`invoke()`](https://jsr.io/@mtkruto/mtkruto/doc/~/Client#property_invoke)
method is not backwards-compatible, which is for good—it _significantly_ reduces
the bundle size. All of its functionality is persisted.</sub>
