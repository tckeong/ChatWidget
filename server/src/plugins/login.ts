import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

async function loginPlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.post("/login", async (request, reply) => {
        const userData = request.body as {
            id: string;
        };

        if (!userData) {
            return reply.status(400).send({
                message: "User ID is required.",
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
        });

        return reply.status(200).send({
            message: "Login successful",
            status: "success",
            jwt: jwt,
        });
    });

    fastify.get("/user/:userId", async (request, reply) => {
        const { userId } = request.params as { userId: string };
        if (!userId) {
            return reply.status(400).send({
                message: "User ID is required.",
                status: "error",
            });
        }

        const userMap = {
            "1": "Alice",
            "2": "Bob",
        };

        return reply.status(200).send({
            id: userId,
            name: userMap[userId as keyof typeof userMap] || "Unknown User",
        });
    });

    fastify.get("/business/:businessId", async (request, reply) => {
        const { businessId } = request.params as { businessId: string };

        if (!businessId) {
            return reply.status(400).send({
                message: "Business ID is required.",
                status: "error",
            });
        }

        const businessMap = {
            "1": "Tech Solutions",
        };

        return reply.status(200).send({
            id: businessId,
            name:
                businessMap[businessId as keyof typeof businessMap] ||
                "Unknown Business",
        });
    });
}

export default fp(loginPlugin);
