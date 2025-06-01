import { FastifyInstance } from "fastify";
import { User } from "../app";

export interface ConnectedClient {
    socket: WebSocket;
    user: User;
    conversationId?: string;
}

export interface WebSocketMessage {
    type: "online" | "offline" | "is_typing" | "send_message" | "is_read";
    payload: {
        name?: string;
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

    // Broadcasts a message to all clients in a specific conversation through WebSocket connections.
    broadcastToConversation(
        conversationId: string,
        data: any,
        senderId: string
    ) {
        this.connectedClients.forEach((client, clientId) => {
            if (
                client.conversationId === conversationId &&
                client.socket.readyState === 1 &&
                client.user.id !== senderId
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

    // Handles a new WebSocket connection from a client.
    // Broadcasts an "online" message to the conversation.
    async handleOnline(clientId: string, conversationId: string, name: string) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        client.conversationId = conversationId;

        this.broadcastToConversation(
            conversationId,
            {
                type: "online",
                payload: {
                    user: client.user,
                    name: name,
                },
            },
            clientId
        );
    }

    // Handles a client going offline.
    // Broadcasts a "left" message to the conversation and closes the WebSocket connection.
    // Delete the client from the connected clients map.
    async handleOffline(clientId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        const conversationId = client.conversationId;

        this.broadcastToConversation(
            conversationId,
            {
                type: "left",
                payload: {
                    user: client.user,
                },
            },
            clientId
        );

        client.socket.close();
        this.connectedClients.delete(clientId);
    }

    // Handles a typing event from a client.
    async handleTyping(clientId: string, conversationId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(
            conversationId,
            {
                type: "typing",
                payload: {
                    conversationId,
                    user: client.user,
                },
            },
            clientId
        );
    }

    // Handles a message sent by a client.
    async handleSendMessage(clientId: string, conversationId: string) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(
            conversationId,
            {
                type: "sent",
                payload: {
                    user: client.user,
                },
            },
            clientId
        );
    }

    // Handles a read event for messages in a conversation.
    async handleIsRead(
        clientId: string,
        conversationId: string,
        messageId: string[]
    ) {
        const client = this.connectedClients.get(clientId);
        if (!client || !client.conversationId) return;

        this.broadcastToConversation(
            conversationId,
            {
                type: "read",
                payload: {
                    user: client.user,
                    messageIds: messageId,
                },
            },
            clientId
        );
    }
}
