import fp from "fastify-plugin";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyRequest,
    FastifyReply,
} from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        authenticate(
            request: FastifyRequest,
            reply: FastifyReply
        ): Promise<void>;
    }
}

async function jwtAuthenticatePlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.decorate(
        "authenticate",
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                await request.jwtVerify();
            } catch (err) {
                reply.send(err);
            }
        }
    );
}

export default fp(jwtAuthenticatePlugin);
