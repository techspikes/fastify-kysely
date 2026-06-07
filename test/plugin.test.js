import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import { Kysely, SqliteDialect } from 'kysely'
import fastifyKysely from '../index.js'

function dialect () {
  // Use an in-memory database so plugin registration can be tested without I/O.
  return new SqliteDialect({ database: new Database(':memory:') })
}

test('request.db is a Kysely instance', async (t) => {
  // Create an isolated Fastify app for this registration test.
  const app = Fastify({ logger: false })

  // Close the app after the test so the plugin can destroy its Kysely instance.
  t.after(() => app.close())

  // Register the plugin with the SQLite dialect used only by this test.
  await app.register(fastifyKysely, { dialect: dialect() })

  // Capture the decorated value from inside a real Fastify request lifecycle.
  let captured

  // The plugin should decorate every request with the shared Kysely instance.
  app.get('/', async (req) => {
    // Store request.db so the assertion can run after injection completes.
    captured = req.db

    // Return a minimal response because the test only cares about decoration.
    return null
  })

  // Trigger the route through Fastify injection.
  await app.inject({ method: 'GET', url: '/' })

  // The decorated request property should be the Kysely instance created by the plugin.
  assert.ok(captured instanceof Kysely)
})

test('throws when registered twice', async () => {
  // Fastify should reject duplicate decoration of the request object.
  await assert.rejects(async () => {
    // Create a fresh app so duplicate registration is the only failure source.
    const app = Fastify({ logger: false })

    // The first registration adds the request decorator.
    await app.register(fastifyKysely, { dialect: dialect() })

    // The second registration attempts to add the same decorator again.
    await app.register(fastifyKysely, { dialect: dialect() })

    // Boot the app to force Fastify to process plugin registration.
    await app.ready()
  }, /decorator 'db' has already been added/)
})
