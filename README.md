# MTKruto Server

- [Introduction](#introduction)
  - [What is MTKruto Server?](#what-is-mtkruto-server)
  - [Is this a replacement for Bot API?](#is-this-a-replacement-for-bot-api)
  - [Why not just use Bot API?](#why-not-just-use-bot-api)
- [Installation](#installation)
  - [Prebuilt Binaries](#prebuilt-binaries)
  - [Building from Source](#building-from-source)
- [CLI Arguments](#cli-arguments)
- [Running](#running)
- [Viewing Statistics](#viewing-statistics)
- [Bots](#bots)
- [Users](#users)
- [Requests](#requests)
- [Responses](#responses)
- [Methods](#methods)
- [Telegram API Functions](#telegram-api-functions)
- [Receiving Updates](#receiving-updates)
  - [Polling](#polling)
  - [Webhooks](#webhooks)
- [Client Libraries](#client-libraries)
  - [TypeScript/JavaScript](#typescriptjavascript)
- [Contributing](#contributing)
- [Support](#support)
- [Legal](#legal)

## Introduction

### What is MTKruto Server?

MTKruto Server is a server for running Telegram clients (whether they are bots
or user accounts) with ability to interact with them remotely through its HTTP
interface.

### Is this a replacement for Bot API?

Not at all. Although some small details might look relevant, everything is
fundamentally different from Bot API.

There is no backwards compatibility with the Bot API.

### Why not just use Bot API?

Bot API is always a good choice for most projects. Although, one might need
MTKruto Server if they would like to:

- Interact with user accounts, since Bot API does not support this.
- Interact with the Telegram MTProto API directly through an HTTP interface,
  since Bot API does not support this.
- Interact with user accounts from resource-constrained environments (e.g.,
  serverless functions), since it is not possible to do it directly with
  Telegram clients.
- Interact with the same user account from different hosts without facing
  issues, since doing so directly with Telegram clients requires logging in each
  time, or would otherwise result in errors like AUTH_KEY_DUPLICATED.

## Installation

### Prebuilt Binaries

To download a prebuilt binary, visit
[here](https://github.com/MTKruto/server/actions/workflows/ci.yml), open the
most recent successful run, and you will see appropriate download links for each
operating system in the Artifacts section.

### Building from Source

To build from source, you need to have [Deno](https://deno.land) installed.
After making sure that it is properly installed, clone the repository
recursively:

```shell
git clone --depth 1 --recursive https://github.com/MTKruto/server
cd server
```

And build using the following command:

```shell
deno task build
```

The output executable will be in the same directory you run the command from.

## CLI Arguments

| Name       | Required | Description                               | Default |
| ---------- | -------- | ----------------------------------------- | ------- |
| --api-id   | Yes      | Telegram app API ID                       | N/A     |
| --api-hash | Yes      | Telegram app API hash                     | N/A     |
| --port     | No       | TCP port to accept connecions from        | 8000    |
| --workers  | No       | Number of workers to use                  | 1       |
| --stats    | No       | The path to make the stats available from | /stats  |
| --add-user | No       | Add a user account                        | N/A     |

## Running

The only required CLI arguments to be able to start the server are --api-id and
--api-hash:

```shell
mtkruto-server --api-id 123456 --api-hash 0123456789abcdef
```

## Viewing Statistics

Statistics are accessible from the configured path, which defaults to /stats.

## Bots

The endpoint to make requests on behalf of bots is:

```shell
http(s)://hostname:port/bot<BOT_TOKEN>
```

So, if a bot’s token is 123456:0123456789abcdef and it is needed to be consumed
on an instance of MTKruto Server that is hosted at <https://api.example.com>,
the endpoint is:

```shell
https://api.example.com/bot123456:0123456789abcdef
```

> [!TIP]
>
> If a bot was previously used with a Bot API server, it is recommended that the
> [logOut](https://core.telegram.org/bots/api#logout) method is called before
> proceeding.

## Users

To add a user client, navigate to the path of the installation, and run with the
`--add-user` flag:

```shell
mtkruto-server --add-user --api-id 123456 --api-hash 0123456789abcdef
```

This will ask you the necessary information to authorize as a user, and after a
successful authorization, the endpoint to remotely interact with the client is
printed.

## Requests

> [!NOTE]
>
> In the above examples, some details like required HTTP headers are omitted to
> focus on what matters most.

All requests are made up of a list of order-sensitive JSON-encoded arguments.
The server accepts requests from GET requests that utilize URL search
parameters, or POST requests with application/json or multipart/form-data
content.

Here is an example get request that invokes a method named exampleMethod with
string and number arguments:

```http
GET /:client-id/exampleMethod/?1337&"Hello, world!"
```

Here is the same request, but with the POST method:

```http
POST /:client-id/exampleMethod
Content-Type: application/json

[1337, "Hello, world!"]
```

> [!WARNING]
>
> The Content-Type header is required for POST requests.

For convenience, in GET requests, if at least one URL search parameter is given
a value, an object will be appended to the end of the argument list that will be
populated with the keys and values of the named parameters. So, this:

```http
GET /:client-id/exampleMethod?1&foo=false&bar=true
```

is the same as this:

```http
POST /:client-id/exampleMethod
Content-Type: application/json

[1,  { "foo": false, "bar": true }]
```

> [!NOTE]
>
> You cannot have more than a value for a specific search parameter.

## Responses

All responses are JSON-encoded. Note that by being JSON-encoded, it doesn’t
necessarily mean they are a JSON object. They could be null, a number, or even a
string.

If the response code was 200, you can be sure that the body is the result of the
called method. Otherwise, the body will be an error message. For convenience, an
`x-error-type` value will be set in non-internal errors, to help in identifying
what type of error it is.

## Methods

A list of available methods, along with links to the documentation of each one
of them, can be found [here](https://mtkru.to).

If you’re not already familiar with the structure of the documentation (e.g.,
you are coming from outside of MTKruto), keep these points in mind:

- Required arguments must be provided in the exact order, and they don’t have to
  be labeled in case if you are making GET requests.
- Optional parameters (those that are marked with `?` in the documentation) must
  all be in an object at the end of the argument list with their respective
  keys.

## Telegram API Functions

To invoke Telegram API functions directly, use the special method `invoke`. It
accepts a single argument, which is an object that describes a Telegram API
request.

Here is an example payload which makes a ping request:

```json
{
  "_": "ping",
  "ping_id": {
    "_": "bigint",
    "value": "123456"
  }
}
```

Which can be called like:

```http
POST /:client-id/invoke
Content-Type: application/json

{
  "_": "ping",
  "ping_id": {
    "_": "bigint",
    "value": "123456"
  }
}
```

As you may have already inferred, the TL objects are described in JSON as
follows:

- All objects have a `_` key that must corresponds to the name of the TL object
  as written in TL schema files, unless otherwise noted below.
- The remaining keys of the object have the same names as the parameter names as
  written in TL schema files.
- Flags are the same name as written in TL schema files, too, and their values
  are expected to be booleans.
- Strings and numbers (`int` in TL schema files) are kept as they are.

BigInts (`long` in TL schema files) are described with an object that has its
`_` key assigned to the constant value `"bigint"`, and its `value` key assigned
to a string representation of the integer. So, if 123456 is a long, it is
described as follows:

```json
{
  "_": "bigint",
  "value": "12456"
}
```

Raw bytes (`bytes` in TL schema files) are described with an object that has its
`_` key assigned to the constant value `"bytes"`, and its `value` key assigned
to a Base64 representation of the raw bytes. So, if you have `0x524F4A`, it is
described as follows:

```json
{
  "_": "bytes",
  "value": "Uk9K"
}
```

Results of the functions invokations are in the same format.

## Receiving Updates

You can receive updates by either long polling or setting a webhook. Note that
you cannot receive updates via both at the same time.

### Polling

To poll for updates, use the special method `getUpdates`. It accepts an optional
`timeout` argument which will close the connection if there are no new updates
for `timeout` seconds.

```http
POST /:client-id/getUpdates
```

On success, it returns an array of [Update](https://mtkru.to/types/Update)
objects.

### Webhooks

> [!WARNING]
>
> Support for webhooks is experimental.

To set a webhook, use the special method `setWebhook`.

```http
POST /:client-id/setWebhook

["https://example.com/webhook"]
```

Received updates will then be sent to the specified URL using POST requests.

To remove it anytime, call the special method `deleteWebhook`.

```http
GET /:client-id/deleteWebhook
```

## Client Libraries

Anyone is welcome to build client libraries for the API. The official client
implementation that resides in [client/](./client/) can be taken as a reference.

### TypeScript/JavaScript

This is a client implementation that is maintained as part of the project.
Homepage: <https://github.com/MTKruto/server/tree/main/client/>

## Contributing

Useful contributions of any kind is warmly accepted, so feel free to make pull
requests!

## Support

Join [our chat](https://mtkruto.t.me) if you had any questions.

## Legal

MTKruto Server is released under the GNU Affero General Public License version
3, or at your option, any later version. Refer to [COPYING](./COPYING) for the
full license text.
