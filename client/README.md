# MTKruto Server Client for JavaScript

This is a JavaScript client for MTKruto Server that is mostly compatible with [MTKruto](https://mtkru.to)’s [`Client`](https://jsr.io/@mtkruto/mtkruto/doc/~/Client) class.*

It can run almost anywhere JavaScript runs, including serverless platforms like Deno Deploy, Cloudflare Workers, and more.

## Migrating from MTKruto

### `connect()` and `authorize()`

The `Client` class of this module does not have these methods, since it is neither required to make a connection initially, nor to authorize.

### Telegram API Calls

Before

```ts
const pong = await client.api.ping({ ping_id: 1234n };

// Result:
// Pong class { ... }
```

After

```ts
const pong = await client.invoke({
  _: "ping",
  ping_id: {
    _: "bigint",
    value: "1234",
  },
});

// Result:
// { _: "pong", ... }
```

---

<sub>*Only the [`invoke()`](https://jsr.io/@mtkruto/mtkruto/doc/~/Client#property_invoke) method is not backwards-compatible, which is for good—it _significantly_ reduces the bundle size. All of its functionality is persisted.</sub>
