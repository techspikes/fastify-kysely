# fastify-kysely

[![Node.js CI](https://github.com/techspikes/fastify-kysely/actions/workflows/ci.yml/badge.svg)](https://github.com/techspikes/fastify-kysely/actions/workflows/ci.yml)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

Fastify plugin that attaches a shared Kysely database instance to every request as
`request.db`.

It is intended for Fastify applications that use Kysely directly in route
handlers, hooks, or other request-scoped code without manually wiring the
database instance through each route.

## Install

```sh
npm i @techspikes/fastify-kysely
```

Install Kysely, Fastify, and the driver for your database as well.

```sh
npm i fastify kysely
```

For example, SQLite users can install `better-sqlite3`, while PostgreSQL users
can install `pg`.

### Compatibility

| Plugin version | Fastify version | Kysely version |
| -------------- | --------------- | -------------- |
| `^0.1.x` | `^5.x` | `^0.29.x` |

## Usage

Import `@techspikes/fastify-kysely` and register it as any other plugin.

```js
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import { SqliteDialect } from 'kysely'
import fastifyKysely from '@techspikes/fastify-kysely'

const fastify = Fastify()

await fastify.register(fastifyKysely, {
  dialect: new SqliteDialect({
    database: new Database('db.sqlite'),
  }),
})

fastify.get('/items/:name', async (request, reply) => {
  const item = await request.db
    .selectFrom('items')
    .select(['name', 'price'])
    .where('name', '=', request.params.name)
    .executeTakeFirst()

  if (!item) {
    return reply.code(404).send()
  }

  return item
})

await fastify.listen({ port: 3000 })
```

The plugin creates one Kysely instance when it is registered, assigns it to
`request.db` for every request, and destroys it when Fastify closes.

### Options

The plugin options are passed directly to `new Kysely(options)`.

* `dialect`: Kysely dialect such as `PostgresDialect`, `MysqlDialect`, or
  `SqliteDialect`. Required.
* `plugins`: Optional Kysely plugins such as `CamelCasePlugin`.
* `log`: Optional Kysely query logging configuration.

```ts
import type { Dialect, KyselyConfig, KyselyPlugin } from 'kysely'

interface FastifyKyselyOptions {
  dialect: Dialect
  plugins?: KyselyPlugin[]
  log?: KyselyConfig['log']
}
```

## Runtime behavior

* Creates a single `Kysely` instance during plugin registration.
* Decorates each Fastify request with `request.db`.
* Reuses the same Kysely instance for all requests in the Fastify app.
* Calls `db.destroy()` from Fastify's `onClose` hook.
* Throws if the plugin is registered twice in the same encapsulation scope,
  because `request.db` is already decorated.

## Exports

The default export is the Fastify plugin.

```js
import fastifyKysely from '@techspikes/fastify-kysely'
```

TypeScript users can also import the option and schema extension types.

```ts
import type { FastifyKyselyOptions, KyselyDatabase } from '@techspikes/fastify-kysely'
```

## TypeScript

The package includes TypeScript declarations. Extend `KyselyDatabase` to
describe your schema.

```ts
import '@techspikes/fastify-kysely'

declare module '@techspikes/fastify-kysely' {
  interface KyselyDatabase {
    items: {
      name: string
      price: number
    }
  }
}
```

After augmentation, `request.db` is typed as `Kysely<KyselyDatabase>`.

```ts
fastify.get('/items/:name', async (request) => {
  return request.db
    .selectFrom('items')
    .select(['name', 'price'])
    .where('name', '=', request.params.name)
    .executeTakeFirst()
})
```

## Development

```sh
npm run lint
npm test
```

If `better-sqlite3` needs to rebuild its native binding:

```sh
npm run rebuild:sqlite
```

## License

Licensed under [MIT](./LICENSE).
