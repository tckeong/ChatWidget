import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { ParticipantRole, MessageContentType } from "@prisma/client";
import { MessageService } from "../services/messageService";
import { User } from "../app";

declare module "fastify" {
    interface FastifyRequest {
        user: User;
    }
}

interface Querystring {
    token?: string;
}

interface WebSocketMessage {
    type: "online" | "offline" | "is_typing";
    payload: {
        conversationId?: string;
        body?: string;
        contentType?: MessageContentType;
        [key: string]: any;
    };
}

interface ConnectedClient {
    socket: WebSocket;
    user: User;
    conversationId?: string;
}

async function chatPlugin(
    fastify: FastifyInstance,
    opts: FastifyPluginOptions
) {
    const messageService = new MessageService(fastify.prisma);
    const connectedClients = new Map<string, ConnectedClient>();

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

    // Subscribe to Redis for cross-node message broadcasting
    fastify.redis.subscribe("chat-channel", (err) => {
        if (err) {
            fastify.log.error(
                "Failed to subscribe to Redis chat channel:",
                err
            );
        } else {
            fastify.log.info("Successfully subscribed to Redis chat channel");
        }
    });

    // Handle Redis messages and broadcast to WebSocket clients
    fastify.redis.on("message", (channel: string, message: string) => {
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
    });

    // Helper function to broadcast messages to all clients in a conversation
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

    // Helper function to broadcast typing indicators
    function broadcastTypingIndicator(
        conversationId: string,
        user: User,
        isTyping: boolean
    ) {
        const typingData = {
            type: isTyping ? "user_typing" : "user_stopped_typing",
            payload: {
                conversationId,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
            },
        };

        connectedClients.forEach((client, clientId) => {
            if (
                client.conversationId === conversationId &&
                client.user.id !== user.id &&
                client.socket.readyState === 1
            ) {
                try {
                    client.socket.send(JSON.stringify(typingData));
                } catch (error) {
                    fastify.log.error(
                        `Error sending typing indicator to client ${clientId}:`,
                        error
                    );
                    connectedClients.delete(clientId);
                }
            }
        });
    }

    // REST endpoint for sending messages
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
            const authHeader = request.headers["authorization"];
            const token = authHeader?.split(" ")[1];

            if (!token) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

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

            try {
                // Store message in PostgreSQL via Prisma
                const newMessage = await messageService.createMessage({
                    conversationId: BigInt(conversationId),
                    senderId: senderId,
                    body: body,
                    contentType: contentType || MessageContentType.TEXT,
                });

                // Publish message to Redis for cross-node broadcast
                await fastify.redis.publish(
                    "chat-channel",
                    JSON.stringify({
                        type: "new_message",
                        payload: {
                            ...newMessage,
                            conversationId: conversationId,
                            sender: {
                                id: senderId.toString(),
                                username:
                                    userPayload.username || `User ${senderId}`,
                                role: userPayload.role || "CUSTOMER",
                            },
                        },
                    })
                );

                reply.status(201).send({
                    message: "Message sent successfully",
                    data: newMessage,
                });
            } catch (error) {
                fastify.log.error("Error sending message via REST:", error);
                reply.status(500).send({ message: "Failed to send message" });
            }
        },
    });

    // GET endpoint to retrieve conversation messages
    fastify.get("/conversations/:conversationId/messages", {
        preHandler: [fastify.authenticate],
        handler: async (
            request: FastifyRequest<{
                Params: { conversationId: string };
                Querystring: { limit?: string; offset?: string };
            }>,
            reply
        ) => {
            const { conversationId } = request.params;
            const limit = parseInt(request.query.limit || "50");
            const offset = parseInt(request.query.offset || "0");

            try {
                const messages = await messageService.getMessagesByConversation(
                    BigInt(conversationId),
                    limit,
                    offset
                );

                reply.send({
                    data: messages,
                    pagination: {
                        limit,
                        offset,
                        hasMore: messages.length === limit,
                    },
                });
            } catch (error) {
                fastify.log.error("Error retrieving messages:", error);
                reply
                    .status(500)
                    .send({ message: "Failed to retrieve messages" });
            }
        },
    });

    // WebSocket endpoint for real-time communication
    fastify.get<{ Querystring: Querystring }>(
        "/ws",
        {
            websocket: true,
            preHandler: fastify.authenticate,
        },
        (socket, request) => {
            const user = request.user;
            const clientId = `${user.id}_${Date.now()}_${Math.random()}`;

            // Store the connection
            connectedClients.set(clientId, {
                socket: socket,
                user: user,
            });

            fastify.log.info(
                `WebSocket client connected: ${user.username} (${clientId})`
            );

            // Send welcome message
            socket.send(
                JSON.stringify({
                    type: "connection_established",
                    payload: {
                        message: `Hello, ${user.username}! WebSocket connection established.`,
                        clientId: clientId,
                    },
                })
            );

            // Handle incoming WebSocket messages
            socket.on("message", async (rawMessage: Buffer) => {
                try {
                    const messageStr = rawMessage.toString();
                    const wsMessage: WebSocketMessage = JSON.parse(messageStr);

                    switch (wsMessage.type) {
                        case "online":
                            await handleJoinConversation(
                                clientId,
                                wsMessage.payload.conversationId!
                            );
                            break;

                        case "offline":
                            await handleLeaveConversation(clientId);
                            break;

                        case "is_typing":
                            await handleTypingIndicator(
                                clientId,
                                wsMessage.payload.conversationId!,
                                true
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

            // Handle WebSocket connection close
            socket.on("close", () => {
                fastify.log.info(
                    `WebSocket client disconnected: ${user.username} (${clientId})`
                );
                connectedClients.delete(clientId);
            });

            // Handle WebSocket errors
            socket.on("error", (error: Error) => {
                fastify.log.error(
                    `WebSocket error for client ${clientId}:`,
                    error
                );
                connectedClients.delete(clientId);
            });

            // WebSocket message handlers
            async function handleJoinConversation(
                clientId: string,
                conversationId: string
            ) {
                const client = connectedClients.get(clientId);
                if (!client) return;

                client.conversationId = conversationId;

                client.socket.send(
                    JSON.stringify({
                        type: "joined_conversation",
                        payload: {
                            conversationId,
                            message: `Joined conversation ${conversationId}`,
                        },
                    })
                );

                // Notify other users in the conversation
                broadcastToConversation(conversationId, {
                    type: "user_joined",
                    payload: {
                        conversationId,
                        user: {
                            id: client.user.id,
                            username: client.user.username,
                            role: client.user.role,
                        },
                    },
                });
            }

            async function handleLeaveConversation(clientId: string) {
                const client = connectedClients.get(clientId);
                if (!client || !client.conversationId) return;

                const conversationId = client.conversationId;

                // Notify other users in the conversation
                broadcastToConversation(conversationId, {
                    type: "user_left",
                    payload: {
                        conversationId,
                        user: {
                            id: client.user.id,
                            username: client.user.username,
                            role: client.user.role,
                        },
                    },
                });

                client.conversationId = undefined;

                client.socket.send(
                    JSON.stringify({
                        type: "left_conversation",
                        payload: {
                            conversationId,
                            message: `Left conversation ${conversationId}`,
                        },
                    })
                );
            }

            async function handleSendMessage(clientId: string, payload: any) {
                const client = connectedClients.get(clientId);
                if (!client || !client.conversationId) {
                    client?.socket.send(
                        JSON.stringify({
                            type: "error",
                            payload: {
                                message: "Must join a conversation first",
                            },
                        })
                    );
                    return;
                }

                const { body, contentType } = payload;
                const senderId = BigInt(client.user.id);

                try {
                    // Store message in database
                    const newMessage = await messageService.createMessage({
                        conversationId: BigInt(client.conversationId),
                        senderId: senderId,
                        body: body,
                        contentType: contentType || MessageContentType.TEXT,
                    });

                    // Publish to Redis for cross-node broadcast
                    await fastify.redis.publish(
                        "chat-channel",
                        JSON.stringify({
                            type: "new_message",
                            payload: {
                                ...newMessage,
                                conversationId: client.conversationId,
                                sender: {
                                    id: senderId.toString(),
                                    username:
                                        client.user.username ||
                                        `User ${senderId}`,
                                    role: client.user.role || "CUSTOMER",
                                },
                            },
                        })
                    );

                    // Send confirmation to sender
                    client.socket.send(
                        JSON.stringify({
                            type: "message_sent",
                            payload: {
                                messageId: newMessage.id.toString(),
                                conversationId: client.conversationId,
                            },
                        })
                    );
                } catch (error) {
                    fastify.log.error(
                        "Error sending message via WebSocket:",
                        error
                    );
                    client.socket.send(
                        JSON.stringify({
                            type: "error",
                            payload: { message: "Failed to send message" },
                        })
                    );
                }
            }

            async function handleTypingIndicator(
                clientId: string,
                conversationId: string,
                isTyping: boolean
            ) {
                const client = connectedClients.get(clientId);
                if (!client || client.conversationId !== conversationId) return;

                broadcastTypingIndicator(conversationId, client.user, isTyping);
            }
        }
    );
}

export default fp(chatPlugin);
