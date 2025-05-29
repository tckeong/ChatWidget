import { FastifyInstance } from "fastify";
import { User } from "../app";
import { MessageContentType } from "@prisma/client";

export interface ConnectedClient {
    socket: WebSocket;
    user: User;
    conversationId?: string;
}

export interface WebSocketMessage {
    type: "online" | "offline" | "is_typing" | "send_message" | "is_read";
    payload: {
        conversationId?: string;
        senderId?: string;
        messageIds?: string[];
    };
}

export class WebSocketService {
    constructor(
        private connectedClients: Map<string, ConnectedClient>,
        private readonly fastify: FastifyInstance
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

        this.broadcastToConversation(conversationId, {
            type: "online",
            payload: {
                user: client.user,
            },
        });
    }

    async handleOffline(clientId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        const conversationId = client.conversationId;

        this.broadcastToConversation(conversationId, {
            type: "left",
            payload: {
                user: client.user,
            },
        });

        client.socket.close();
        this.connectedClients.delete(clientId);
    }

    async handleTyping(clientId: string, conversationId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(conversationId, {
            type: "typing",
            payload: {
                conversationId,
                user: client.user,
            },
        });
    }

    async handleSendMessage(clientId: string, conversationId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(conversationId, {
            type: "sent",
            payload: {
                user: client.user,
            },
        });
    }

    async handleIsRead(
        clientId: string,
        conversationId: string,
        messageId: string[]
    ) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(conversationId, {
            type: "read",
            payload: {
                user: client.user,
                messageIds: messageId,
            },
        });
    }
}
