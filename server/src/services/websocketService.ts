import { FastifyInstance } from "fastify";
import { User } from "../app";
import { MessageContentType } from "@prisma/client";
import { MessageService } from "./messageService";

export interface ConnectedClient {
    socket: WebSocket;
    user: User;
    conversationId?: string;
}

export interface WebSocketMessage {
    type: "online" | "offline" | "is_typing" | "send_message" | "is_read";
    payload: {
        conversationId?: string;
        body?: string;
        contentType?: MessageContentType;
        messageId?: string[];
    };
}

export class WebSocketService {
    constructor(
        private connectedClients: Map<string, ConnectedClient>,
        private readonly fastify: FastifyInstance,
        private readonly messageService: MessageService
    ) {}

    broadcastToConversation(conversationId: string, data: any) {
        this.connectedClients.forEach((client, clientId) => {
            if (
                client.conversationId === conversationId &&
                client.socket.readyState === 1
            ) {
                try {
                    client.socket.send(JSON.stringify(data));
                } catch (error) {
                    this.fastify.log.error(
                        `Error sending message to client ${clientId}:`,
                        error
                    );

                    this.connectedClients.delete(clientId);
                }
            }
        });
    }

    async handleOnline(clientId: string, conversationId: string) {
        const client = this.connectedClients.get(clientId);
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

        this.broadcastToConversation(conversationId, {
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

    async handleOffline(clientId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        const conversationId = client.conversationId;

        this.broadcastToConversation(conversationId, {
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

    async handleSendMessage(clientId: string, payload: any) {
        const client = this.connectedClients.get(clientId);
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
            const newMessage = await this.messageService.createMessage({
                conversationId: BigInt(client.conversationId),
                senderId: senderId,
                body: body,
                contentType: contentType || MessageContentType.TEXT,
            });

            await this.fastify.redis.publish(
                "chat-channel",
                JSON.stringify({
                    type: "new_message",
                    payload: {
                        ...newMessage,
                        conversationId: client.conversationId,
                        sender: {
                            id: senderId.toString(),
                            username:
                                client.user.username || `User ${senderId}`,
                            role: client.user.role || "CUSTOMER",
                        },
                    },
                })
            );

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
            this.fastify.log.error(
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
}
