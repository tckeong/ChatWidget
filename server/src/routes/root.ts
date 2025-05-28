import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';

module.exports = async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get('/', async function (request: FastifyRequest, reply: FastifyReply) {
    return { root: true }
  })
}
