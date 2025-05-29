import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

async function loginPlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.post("/login", async (request, reply) => {
        const { username } = request.body as {
            username: string;
        };

        if (!username) {
            return reply.status(400).send({
                message: "Username is required.",
                status: "error",
            });
        }

        return reply.status(200).send({
            message: "Login endpoint is not implemented yet.",
            status: "success",
        });
    });
}

export default fp(loginPlugin);
