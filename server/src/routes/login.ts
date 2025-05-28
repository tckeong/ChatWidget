import {
    FastifyInstance,
    FastifyRequest,
    FastifyReply,
    FastifyPluginOptions,
} from "fastify";

import { User } from "../app";

module.exports = async function (
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    fastify.post(
        "/login",
        async function (request: FastifyRequest, reply: FastifyReply) {
            const { username, password } = request.body as {
                username: string;
                password: string;
            };

            // const user = await validateUser(username, password);
            const user: User = {
                id: "1",
                username: username,
                role: "user",
            };

            if (!user) {
                return reply
                    .status(401)
                    .send({ message: "Invalid credentials" });
            }

            const token = fastify.jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role,
            });

            reply
                .setCookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                })
                .header("Authorization", `Bearer ${token}`)
                .send({
                    message: "Login successful",
                });
        }
    );
};
