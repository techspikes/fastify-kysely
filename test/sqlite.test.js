import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import { SqliteDialect } from 'kysely'
import fastifyKysely from '../index.js'

function dialect () {
  // Each test gets a fresh in-memory SQLite database.
  return new SqliteDialect({ database: new Database(':memory:') })
}

test('connects to SQLite', async (t) => {
  // Create a new Fastify app for the SQLite connection check.
  const app = Fastify({ logger: false })

  // Ensure Fastify closes and the Kysely instance is destroyed after the test.
  t.after(() => app.close())

  // Register the plugin with the SQLite dialect.
  await app.register(fastifyKysely, { dialect: dialect() })

  // A tiny health endpoint proves that request.db can execute a SQL query.
  app.get('/health', async (req) => {
    // Execute a simple query through the database attached to the request.
    const result = await req.db
      .selectNoFrom((eb) => eb.val(1).as('one'))
      .executeTakeFirstOrThrow()

    // Return the first row so the test can assert the JSON response.
    return result
  })

  // Call the health endpoint through Fastify's HTTP injection API.
  const response = await app.inject({ method: 'GET', url: '/health' })

  // The endpoint should succeed.
  assert.equal(response.statusCode, 200)

  // SQLite should return the expected row from the SELECT query.
  assert.deepEqual(response.json(), { one: 1 })
})

test('performs CRUD against an items table', async (t) => {
  // Create a new Fastify app for the REST API CRUD test.
  const app = Fastify({ logger: false })

  // Close the app after all injected requests have completed.
  t.after(() => app.close())

  // Register the plugin so every route can access request.db.
  await app.register(fastifyKysely, { dialect: dialect() })

  // The REST handlers exercise create, read, update, and delete through request.db.
  app.post('/items', async (req, reply) => {
    // Create the items table on demand for this in-memory database.
    // This keeps the schema setup inside the same request-driven path as the CRUD test.
    await req.db.schema
      .createTable('items')
      .ifNotExists()
      .addColumn('name', 'varchar(255)')
      .addColumn('price', 'integer')
      .execute()

    // Insert the item sent by the REST request body.
    await req.db
      .insertInto('items')
      .values(req.body)
      .execute()

    // Read the inserted row back from SQLite.
    const item = await req.db
      .selectFrom('items')
      .select(['name', 'price'])
      .where('name', '=', req.body.name)
      .executeTakeFirst()

    // Return the created item with a REST-style 201 status code.
    return reply.code(201).send(item)
  })

  // Expose a read endpoint for one item by name.
  app.get('/items/:name', async (req, reply) => {
    // Look up the requested item in SQLite.
    const item = await req.db
      .selectFrom('items')
      .select(['name', 'price'])
      .where('name', '=', req.params.name)
      .executeTakeFirst()

    // Missing rows should behave like a normal REST 404 response.
    if (!item) {
      return reply.code(404).send()
    }

    // Return the found item as JSON.
    return item
  })

  // Expose an update endpoint for one item by name.
  app.patch('/items/:name', async (req, reply) => {
    // Apply the partial update from the request body.
    await req.db
      .updateTable('items')
      .set(req.body)
      .where('name', '=', req.params.name)
      .execute()

    // Fetch the row after the update so the API returns the current state.
    const item = await req.db
      .selectFrom('items')
      .select(['name', 'price'])
      .where('name', '=', req.params.name)
      .executeTakeFirst()

    // Return 404 if there was no row to update.
    if (!item) {
      return reply.code(404).send()
    }

    // Return the updated row.
    return item
  })

  // Expose a delete endpoint for one item by name.
  app.delete('/items/:name', async (req, reply) => {
    // Delete the requested row.
    await req.db
      .deleteFrom('items')
      .where('name', '=', req.params.name)
      .execute()

    // REST delete succeeds with an empty 204 response.
    return reply.code(204).send()
  })

  // Run the child tests in sequence because each CRUD step depends on the previous one.
  // Call the create handler through Fastify injection.
  await t.test('creates an item', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/items',
      payload: { name: 'apple', price: 100 }
    })

    // Creating the item should return the inserted row.
    assert.equal(response.statusCode, 201)
    assert.deepEqual(response.json(), { name: 'apple', price: 100 })
  })

  // Call the read handler through Fastify injection.
  await t.test('reads an item', async () => {
    const response = await app.inject({ method: 'GET', url: '/items/apple' })

    // Reading the item should return the same row.
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { name: 'apple', price: 100 })
  })

  // Call the update handler through Fastify injection.
  await t.test('updates an item', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/items/apple',
      payload: { price: 150 }
    })

    // Updating the item should return the new price.
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { name: 'apple', price: 150 })
  })

  // Call the delete handler through Fastify injection.
  await t.test('deletes an item', async () => {
    const deleteResponse = await app.inject({ method: 'DELETE', url: '/items/apple' })

    // Deleting the item should return an empty success response.
    assert.equal(deleteResponse.statusCode, 204)

    // Confirm deletion by reading through the public API rather than inspecting the database.
    const missingResponse = await app.inject({ method: 'GET', url: '/items/apple' })

    // Reading the deleted item should return not found.
    assert.equal(missingResponse.statusCode, 404)
  })
})
