import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify"; // Import types from Fastify

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

declare module "fastify" {
    interface FastifyInstance {
        someSupport(): string; // Declare the method signature that 'someSupport' will have
    }
}

export default fp(async function (
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.decorate("someSupport", function () {
        return "hugs";
    });
});
