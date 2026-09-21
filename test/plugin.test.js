import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { Kysely, PGliteDialect } from 'kysely'
import Fastify from 'fastify'
import fastifyKysely from '../index.js'

function dialect () {
  // Use an in-memory database so plugin registration can be tested without I/O.
  return new PGliteDialect({ pglite: new PGlite() })
}

test('request.db is a Kysely instance', async (t) => {
  // Create a new Fastify app for the registration test.
  const app = Fastify({ logger: false })

  // Close the app after the test so the plugin can destroy its Kysely instance.
  t.after(() => app.close())

  // Register the plugin with the PGlite dialect used only by this test.
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

test('throws when registered twice', async (t) => {
  // Create a new Fastify app for the duplicate registration check.
  const app = Fastify({ logger: false })

  // Close PGlite through the plugin's onClose hook even after boot fails.
  t.after(() => app.close())

  // Fastify should reject duplicate decoration of the request object.
  await assert.rejects(async () => {
    // The first registration adds the request decorator.
    await app.register(fastifyKysely, { dialect: dialect() })

    // The second registration attempts to add the same decorator again.
    await app.register(fastifyKysely, { dialect: dialect() })

    // Boot the app to force Fastify to process plugin registration.
    await app.ready()
  }, /decorator 'db' has already been added/)
})
