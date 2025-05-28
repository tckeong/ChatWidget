import { type FastifyInstance } from "fastify/types/instance";
import { FastifyPluginOptions } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyRedis from "@fastify/redis";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

import chatPlugin from "./plugins/chat";

import jwtValidate from "./plugins/jwtValidate";
import { PrismaClient } from "@prisma/client";

const path = require("node:path");
const AutoLoad = require("@fastify/autoload");

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
    fastify.register(jwtValidate);
    fastify.register(chatPlugin);

    // This loads all plugins defined in routes
    // define your routes in one of these
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, "routes"),
        options: Object.assign({}, opts),
    });
};

module.exports.options = options;
