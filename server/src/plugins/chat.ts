import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { MessageContentType } from "@prisma/client";
import { ConversationService } from "../services/conversationService";
import { User } from "../app";
import { ConnectedClient } from "../services/websocketService";
import {
    WebSocketMessage,
    WebSocketService,
} from "../services/websocketService";

declare module "fastify" {
    interface FastifyRequest {
        user: User;
    }
}

interface Querystring {
    token?: string;
    conversationId?: string;
}

async function chatPlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    const connectedClients = new Map<string, ConnectedClient>();
    const webSocketService = new WebSocketService(connectedClients, fastify);
    const conversationService = new ConversationService(fastify.prisma);

    // CORS preflight setup
    fastify.options("/*", async (request, reply) => {
        reply.header(
            "Access-Control-Allow-Origin",
            process.env.CORS_ORIGIN || "*"
        );
        reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        reply.header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );
        return reply.send();
    });

    // Apply CORS to all routes
    fastify.addHook("onSend", (request, reply, payload, done) => {
        reply.header(
            "Access-Control-Allow-Origin",
            process.env.CORS_ORIGIN || "*"
        );
        done();
    });

    fastify.redis["subscriber"].subscribe("chat-channel", (err) => {
        if (err) {
            fastify.log.error(
                "Failed to subscribe to Redis chat channel:",
                err
            );
        } else {
            fastify.log.info("Successfully subscribed to Redis chat channel");
        }
    });

    fastify.redis["subscriber"].on(
        "message",
        (channel: string, message: string) => {
            if (channel === "chat-channel") {
                try {
                    const data = JSON.parse(message);
                    broadcastToConversation(
                        data.payload.conversationId?.toString(),
                        data
                    );
                } catch (error) {
                    fastify.log.error("Error parsing Redis message:", error);
                }
            }
        }
    );

    function broadcastToConversation(conversationId: string, data: any) {
        connectedClients.forEach((client, clientId) => {
            if (
                client.conversationId === conversationId &&
                client.socket.readyState === 1
            ) {
                try {
                    client.socket.send(JSON.stringify(data));
                } catch (error) {
                    fastify.log.error(
                        `Error sending message to client ${clientId}:`,
                        error
                    );
                    // Remove disconnected client
                    connectedClients.delete(clientId);
                }
            }
        });
    }

    fastify.post("/messages", {
        preHandler: [fastify.rateLimit(), fastify.authenticate],
        handler: async (
            request: FastifyRequest<{
                Body: {
                    conversationId: string;
                    body: string;
                    contentType?: MessageContentType;
                };
            }>,
            reply
        ) => {
            const userPayload = request.user;
            if (!userPayload || typeof userPayload === "string") {
                return reply
                    .status(401)
                    .send({ message: "Invalid or expired token" });
            }

            if (!userPayload.id) {
                return reply
                    .status(401)
                    .send({ message: "User ID missing in token" });
            }
            const senderId = BigInt(userPayload.id);
            const { conversationId, body, contentType } = request.body;

            const newMessage = await conversationService.createMessage({
                conversationId: BigInt(conversationId),
                senderId: senderId,
                body: body,
                contentType: contentType || MessageContentType.TEXT,
            });

            await fastify.redis["publisher"].publish(
                "chat-channel",
                JSON.stringify(
                    {
                        type: "new_message",
                        payload: newMessage,
                    },
                    (key, value) => {
                        return typeof value === "bigint"
                            ? value.toString()
                            : value;
                    }
                )
            );
            try {
                reply.status(201).send({
                    message: "Message sent successfully",
                    data: {
                        user: userPayload,
                        body: body,
                    },
                });
            } catch (error) {
                fastify.log.error("Error sending message via REST:", error);
                reply.status(500).send({ message: "Failed to send message" });
            }
        },
    });

    fastify.get("/conversations/:userId/:businessId", {
        preHandler: [fastify.authenticate],
        handler: async (
            request: FastifyRequest<{
                Params: { userId: string; businessId: string };
            }>,
            reply
        ) => {
            const { userId, businessId } = request.params;

            try {
                const conversations =
                    await conversationService.getConversationsById(
                        BigInt(userId),
                        BigInt(businessId)
                    );

                const messages = await conversationService.getMessageHistory(
                    BigInt(conversations[0].id)
                );

                reply.send(
                    JSON.stringify(
                        {
                            user: request.user,
                            conversations: conversations,
                            messages: messages,
                        },
                        (key, value) => {
                            return typeof value === "bigint"
                                ? value.toString()
                                : value;
                        }
                    )
                );
            } catch (error) {
                fastify.log.error("Error retrieving messages:", error);
                reply
                    .status(500)
                    .send({ message: "Failed to retrieve messages" });
            }
        },
    });

    fastify.get<{ Querystring: Querystring }>(
        "/ws",
        {
            websocket: true,
        },
        (socket, request) => {
            const user = fastify.jwt.decode(request.query.token || "") as User;
            const clientId = `${user.id}_${Date.now()}_${Math.round(
                Math.random() * 1000
            )}`;

            connectedClients.set(clientId, {
                socket: socket,
                user: user,
                conversationId: request.query.conversationId,
            });

            fastify.log.info(`WebSocket client connected: (${clientId})`);

            socket.send(
                JSON.stringify({
                    type: "established",
                    payload: {
                        message: `Hello, ${clientId}! WebSocket connection established.`,
                        clientId: clientId,
                    },
                })
            );

            socket.on("message", async (rawMessage: Buffer) => {
                try {
                    const messageStr = rawMessage.toString();
                    const wsMessage: WebSocketMessage = JSON.parse(messageStr);

                    switch (wsMessage.type) {
                        case "online":
                            await webSocketService.handleOnline(
                                clientId,
                                wsMessage.payload.conversationId!,
                                wsMessage.payload.name!
                            );
                            break;

                        case "offline":
                            await webSocketService.handleOffline(clientId);
                            break;

                        case "is_typing":
                            await webSocketService.handleTyping(
                                clientId,
                                wsMessage.payload.conversationId!
                            );
                            break;

                        case "send_message":
                            await webSocketService.handleSendMessage(
                                clientId,
                                wsMessage.payload.conversationId!
                            );
                            break;

                        case "is_read":
                            await webSocketService.handleIsRead(
                                clientId,
                                wsMessage.payload.conversationId!,
                                wsMessage.payload.messageIds!
                            );

                            conversationService.markMessagesAsRead(
                                wsMessage.payload.messageIds!.map((id) =>
                                    BigInt(id)
                                ),
                                BigInt(wsMessage.payload.conversationId!),
                                BigInt(user.id)
                            );
                            break;

                        default:
                            socket.send(
                                JSON.stringify({
                                    type: "error",
                                    payload: {
                                        message: "Unknown message type",
                                    },
                                })
                            );
                    }
                } catch (error) {
                    fastify.log.error(
                        "Error processing WebSocket message:",
                        error
                    );
                    socket.send(
                        JSON.stringify({
                            type: "error",
                            payload: { message: "Invalid message format" },
                        })
                    );
                }
            });

            socket.on("close", () => {
                fastify.log.info(
                    `WebSocket client disconnected: (${clientId})`
                );
                connectedClients.delete(clientId);
            });

            socket.on("error", (error: Error) => {
                fastify.log.error(
                    `WebSocket error for client ${clientId}:`,
                    error
                );
                connectedClients.delete(clientId);
            });
        }
    );
}

export default fp(chatPlugin);
