// src/services/messageService.ts
// This file contains the typed service layer for message operations,
// abstracting database interactions via Prisma[cite: 7].

import {
    PrismaClient,
    Message,
    ParticipantRole,
    MessageContentType,
} from "@prisma/client";

// Define the structure for creating a message.
interface CreateMessageData {
    conversationId: bigint;
    senderId?: bigint; // Optional for system messages
    body?: string;
    contentType?: MessageContentType;
    fileUrl?: string;
    mimeType?: string;
    // attachments? Not handled directly in service for simplicity, but part of model
}

// Define the MessageService class to encapsulate database operations related to messages.
export class MessageService {
    constructor(private prisma: PrismaClient) {}

    // Creates a new message in the database.
    async createMessage(data: CreateMessageData): Promise<Message> {
        try {
            const newMessage = await this.prisma.message.create({
                data: {
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    body: data.body,
                    contentType: data.contentType || MessageContentType.TEXT,
                    fileUrl: data.fileUrl,
                    mimeType: data.mimeType,
                    // createdAt: new Date(), // Prisma handles @default(now())
                },
            });
            return newMessage;
        } catch (error) {
            console.error("Error creating message:", error);
            throw new Error("Failed to create message");
        }
    }

    // Retrieves messages for a specific conversation, with optional pagination.
    // Includes sender information for display.
    async getMessagesByConversation(
        conversationId: bigint,
        skip = 0,
        take = 50
    ) {
        try {
            const messages = await this.prisma.message.findMany({
                where: { conversationId: conversationId, deletedAt: null }, // Only get non-deleted messages
                orderBy: { createdAt: "asc" }, // Order by creation time [cite: 12]
                skip: skip,
                take: take,
                include: {
                    sender: {
                        select: {
                            id: true,
                            // In a real app, you'd fetch name/role from user profile service
                            // For now, mock name/role based on senderId
                        },
                    },
                },
            });

            // Augment messages with dummy sender names/roles for the frontend
            return messages.map((msg) => ({
                ...msg,
                sender: msg.sender
                    ? {
                          ...msg.sender,
                          name: `User ${msg.sender.id}`,
                          role:
                              msg.sender.id === 1n
                                  ? ParticipantRole.CUSTOMER
                                  : ParticipantRole.AGENT, // Simplified logic for demo
                      }
                    : null,
            }));
        } catch (error) {
            console.error(
                `Error fetching messages for conversation ${conversationId}:`,
                error
            );
            throw new Error("Failed to retrieve messages");
        }
    }

    // Marks a message as read.
    async markMessageAsRead(messageId: bigint): Promise<Message> {
        try {
            const updatedMessage = await this.prisma.message.update({
                where: { id: messageId },
                data: { readAt: new Date() },
            });
            return updatedMessage;
        } catch (error) {
            console.error(`Error marking message ${messageId} as read:`, error);
            throw new Error("Failed to mark message as read");
        }
    }

    // Soft-deletes a message by setting the deletedAt timestamp[cite: 13].
    // This is a bonus requirement[cite: 25].
    async softDeleteMessage(messageId: bigint): Promise<Message> {
        try {
            const deletedMessage = await this.prisma.message.update({
                where: { id: messageId },
                data: { deletedAt: new Date() },
            });
            return deletedMessage;
        } catch (error) {
            console.error(`Error soft-deleting message ${messageId}:`, error);
            throw new Error("Failed to soft-delete message");
        }
    }

    // Add more service methods as needed for other chat functionalities
    // (e.g., updateMessage, getUnreadMessages, handleAttachments, etc.)
}
