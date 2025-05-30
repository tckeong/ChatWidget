import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

async function loginPlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.post("/login", async (request, reply) => {
        const userData = request.body as {
            id: string;
            name: string;
        };

        if (!userData) {
            return reply.status(400).send({
                message: "User ID and Name is required.",
                status: "error",
            });
        }

        const user = await fastify.prisma.user.findUnique({
            where: {
                id: BigInt(userData.id),
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            return reply.status(404).send({
                message: "User not found.",
                status: "error",
            });
        }

        const jwt = fastify.jwt.sign({
            id: user.id.toString(),
            name: userData.name,
        });

        return reply.status(200).send({
            message: "Login successful",
            status: "success",
            jwt: jwt,
        });
    });
}

export default fp(loginPlugin);
