import {
    PrismaClient,
    ParticipantRole,
    MessageContentType,
    Prisma,
} from "@prisma/client";

interface CreateMessageInput {
    conversationId: bigint;
    senderId?: bigint;
    body?: string;
    contentType?: MessageContentType;
    fileUrl?: string;
    mimeType?: string;
    attachments?: CreateAttachmentInput[];
}

interface CreateAttachmentInput {
    url: string;
    mimeType: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
}

interface UpdateMessageStatusInput {
    messageId: bigint;
    readAt?: Date;
    editedAt?: Date;
    deletedAt?: Date;
}

interface MessageHistoryOptions {
    includeDeleted?: boolean;
    senderId?: bigint;
    beforeDate?: Date;
    afterDate?: Date;
}

export class ConversationService {
    constructor(private prisma: PrismaClient) {}

    async getConversationsById(userId: bigint, businessId: bigint) {
        try {
            const conversations = await this.prisma.conversation.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                        },
                    },
                    businessId,
                },
                include: {
                    participants: {
                        select: {
                            userId: true,
                            role: true,
                        },
                    },
                },
            });

            return conversations;
        } catch (error) {
            throw new Error(
                `Failed to retrieve conversations: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    async getAllStaffByBusinessId(
        businessId: bigint
    ): Promise<{ id: bigint }[]> {
        try {
            const participants = await this.prisma.participant.findMany({
                where: {
                    conversation: {
                        businessId,
                    },
                    role: ParticipantRole.AGENT,
                },
                select: {
                    user: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

            return participants.map((p) => ({
                id: p.user.id,
            }));
        } catch (error) {
            throw new Error(
                `Failed to retrieve staff members: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    async createMessage(
        input: CreateMessageInput,
        tx?: Prisma.TransactionClient
    ) {
        const client = tx || this.prisma;
        const {
            conversationId,
            senderId,
            body,
            contentType = MessageContentType.TEXT,
            fileUrl,
            mimeType,
            attachments,
        } = input;

        try {
            // Verify sender is a participant (if senderId is provided)
            if (senderId) {
                const participant = await client.participant.findUnique({
                    where: {
                        conversationId_userId: {
                            conversationId,
                            userId: senderId,
                        },
                    },
                });

                if (!participant) {
                    throw new Error(
                        "Sender is not a participant in this conversation"
                    );
                }
            }

            const message = await client.message.create({
                data: {
                    conversationId,
                    senderId,
                    body,
                    contentType,
                    fileUrl,
                    mimeType,
                    attachments: attachments?.length
                        ? {
                              create: attachments,
                          }
                        : undefined,
                },
                include: {
                    attachments: true,
                    sender: {
                        select: {
                            id: true,
                            // Add other user fields you need
                        },
                    },
                },
            });

            // Update conversation's updatedAt timestamp
            await client.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            });

            return message;
        } catch (error) {
            throw new Error(
                `Failed to create message: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Retrieves all message history for a conversation
     */
    async getMessageHistory(
        conversationId: bigint,
        options: MessageHistoryOptions = {}
    ) {
        const {
            includeDeleted = false,
            senderId,
            beforeDate,
            afterDate,
        } = options;

        try {
            const whereClause: Prisma.MessageWhereInput = {
                conversationId,
                ...(senderId && { senderId }),
                ...(beforeDate && { createdAt: { lt: beforeDate } }),
                ...(afterDate && { createdAt: { gt: afterDate } }),
                ...(!includeDeleted && { deletedAt: null }),
            };

            const messages = await this.prisma.message.findMany({
                where: whereClause,
                include: {
                    attachments: true,
                    sender: {
                        select: {
                            id: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "asc", // Changed to ascending to get chronological order
                },
            });

            console.log(
                `Retrieved ${messages.length} messages for conversation ${conversationId}`
            );

            return {
                messages,
                totalCount: messages.length,
            };
        } catch (error) {
            throw new Error(
                `Failed to retrieve message history: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Updates message status (read, edited, deleted timestamps)
     */
    async updateMessageStatus(input: UpdateMessageStatusInput) {
        const { messageId, readAt, editedAt, deletedAt } = input;

        try {
            const updateData: Prisma.MessageUpdateInput = {};

            if (readAt !== undefined) updateData.readAt = readAt;
            if (editedAt !== undefined) updateData.editedAt = editedAt;
            if (deletedAt !== undefined) updateData.deletedAt = deletedAt;

            return await this.prisma.message.update({
                where: { id: messageId },
                data: updateData,
                include: {
                    attachments: true,
                    sender: {
                        select: {
                            id: true,
                            // Add other user fields you need
                        },
                    },
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new Error("Message not found");
            }
            throw new Error(
                `Failed to update message status: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Soft deletes a message by setting deletedAt timestamp
     */
    async softDeleteMessage(messageId: bigint, deletedBy?: bigint) {
        try {
            return await this.updateMessageStatus({
                messageId,
                deletedAt: new Date(),
            });
        } catch (error) {
            throw new Error(
                `Failed to delete message: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    async markMessagesAsRead(
        messageIds: bigint[],
        conversationId: bigint,
        userId: bigint
    ): Promise<{ updatedCount: number }> {
        try {
            if (messageIds.length === 0) {
                return { updatedCount: 0 };
            }

            const result = await this.prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    conversationId,
                    senderId: { not: userId }, // Don't mark own messages as read
                    readAt: null,
                    deletedAt: null,
                },
                data: {
                    readAt: new Date(),
                },
            });

            return { updatedCount: result.count };
        } catch (error) {
            throw new Error(
                `Failed to mark messages as read: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }
}
