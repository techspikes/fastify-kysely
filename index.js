import fp from 'fastify-plugin'
import { Kysely } from 'kysely'

async function fastifyKyselyPlugin (fastify, options) {
  const db = new Kysely(options)

  fastify.decorateRequest('db')

  fastify.addHook('onRequest', async (request) => {
    request.db = db
  })

  fastify.addHook('onClose', async () => {
    await db.destroy()
  })
}

const fastifyKysely = fp(fastifyKyselyPlugin, {
  fastify: '5.x',
  name: 'techspikes/fastify-kysely',
})

export default fastifyKysely
