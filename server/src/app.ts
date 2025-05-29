import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyRedis from "@fastify/redis";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

import chatPlugin from "./plugins/chat";
import loginPlugin from "./plugins/login";

import jwtValidate from "./plugins/jwtValidate";
import { PrismaClient } from "@prisma/client";

// Pass --options via CLI arguments in command to enable these options.
const options = {};

export interface User {
    id: string;
    username: string;
    role: string;
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { id: string; username: string; role: string };
        user: User;
    }
}

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

const prisma = new PrismaClient();

module.exports = async function (
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    // Place here your custom code!
    fastify.decorate("prisma", prisma);

    fastify.register(fastifyRedis, {
        url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    fastify.register(fastifyWebsocket, {
        options: {
            clientTracking: true,
        },
    });
    fastify.register(fastifyRateLimit, {
        max: 20,
        timeWindow: "5 seconds",
    });
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || "supersecretkey",
    });
    fastify.register(fastifyCookie);
    fastify.register(loginPlugin);
    fastify.register(jwtValidate);
    fastify.register(chatPlugin);
};

module.exports.options = options;
