import type { FastifyPluginAsync } from 'fastify'
import type { Dialect, Kysely, KyselyConfig, KyselyPlugin } from 'kysely'

export interface FastifyKyselyOptions {
  /**
   * Kysely dialect (e.g. PostgresDialect, MysqlDialect, SqliteDialect).
   * Bring your own driver - Kysely itself is a peer dependency.
   */
  dialect: Dialect

  /**
   * Optional Kysely plugins (e.g. CamelCasePlugin).
   */
  plugins?: KyselyPlugin[]

  /**
   * Query logging. Accepts any value accepted by KyselyConfig['log'].
   */
  log?: KyselyConfig['log']
}

export interface KyselyDatabase {}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Kysely database instance attached by fastify-kysely.
     *
     * Extend `KyselyDatabase` via module augmentation to get full type safety
     * across route handlers with no casts.
     */
    db: Kysely<KyselyDatabase>
  }
}

declare const fastifyKysely: FastifyPluginAsync<FastifyKyselyOptions>

export default fastifyKysely
