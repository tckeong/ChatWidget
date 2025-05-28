import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
module.exports = fp(async function (
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.register(require("@fastify/sensible"), opts);
});
