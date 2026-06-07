import Fastify, { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import { Kysely, sql, type Dialect, type KyselyPlugin } from 'kysely'
import { expect, test } from 'tstyche'
import fastifyKysely, {
  type FastifyKyselyOptions,
  type KyselyDatabase,
} from '@techspikes/fastify-kysely'

test('exports a Fastify plugin', () => {
  expect(fastifyKysely).type.toBeAssignableTo<
    FastifyPluginAsync<FastifyKyselyOptions>
  >()
})

test('accepts Kysely options', () => {
  const options: FastifyKyselyOptions = {
    dialect: {} as Dialect,
  }

  expect(options.plugins).type.toBe<KyselyPlugin[] | undefined>()
  expect(fastifyKysely).type.toBeCallableWith(Fastify(), options)
})

test('decorates FastifyRequest with db', () => {
  expect<FastifyRequest['db']>().type.toBe<Kysely<KyselyDatabase>>()
  expect(sql`SELECT 1`.execute).type.toBeCallableWith({} as FastifyRequest['db'])
})
