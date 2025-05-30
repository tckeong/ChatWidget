import {
    PrismaClient,
    ConversationType,
    ParticipantRole,
    MessageContentType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting database seeding...");

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log("🧹 Cleaning existing data...");

    await prisma.attachment.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.business.deleteMany({});
    await prisma.user.deleteMany({});

    // Create 2 Businesses
    console.log("🏢 Creating businesses...");
    const business = await prisma.business.create({
        data: {
            id: 1n,
        },
    });

    // Create Users
    console.log("👥 Creating users...");

    // Agent user
    const agentUser = await prisma.user.create({
        data: {
            id: 1n,
        },
    });

    // Customer user
    const customerUser = await prisma.user.create({
        data: {
            id: 2n,
        },
    });

    // Create a demo DIRECT conversation
    console.log("💬 Creating demo direct conversation...");
    const directConversation = await prisma.conversation.create({
        data: {
            id: 1n,
            businessId: business.id,
            type: ConversationType.DIRECT,
            createdAt: new Date("2024-03-15T10:00:00Z"),
            updatedAt: new Date("2024-03-15T10:30:00Z"),
        },
    });

    // Create participants for the conversation
    console.log("👥 Adding participants to conversation...");

    // Customer participant
    await prisma.participant.create({
        data: {
            conversationId: directConversation.id,
            userId: customerUser.id,
            role: ParticipantRole.CUSTOMER,
            joinedAt: new Date("2024-03-15T10:00:00Z"),
        },
    });

    // Agent participant
    await prisma.participant.create({
        data: {
            conversationId: directConversation.id,
            userId: agentUser.id,
            role: ParticipantRole.AGENT,
            joinedAt: new Date("2024-03-15T10:02:00Z"),
        },
    });

    // Create demo messages for direct conversation
    console.log("💬 Creating demo messages...");

    // Customer's initial message
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hey! I noticed you were online. Could you help me with a quick question about my recent order?",
            createdAt: new Date("2024-03-15T10:00:00Z"),
        },
    });

    // Agent's response
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Of course! I'd be happy to help. What's your question about the order?",
            createdAt: new Date("2024-03-15T10:01:00Z"),
            readAt: new Date("2024-03-15T10:01:30Z"),
        },
    });

    // Customer's follow-up
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "I ordered a laptop last week but haven't received any shipping updates. The order status still shows 'Processing'.",
            createdAt: new Date("2024-03-15T10:02:00Z"),
        },
    });

    // Agent's diagnostic response
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Let me check that for you right away. Can you provide your order number?",
            createdAt: new Date("2024-03-15T10:03:00Z"),
            readAt: new Date("2024-03-15T10:03:15Z"),
        },
    });

    // Customer provides order number
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Sure! It's #ORD-2024-5678",
            createdAt: new Date("2024-03-15T10:04:00Z"),
        },
    });

    // Agent's resolution
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Found it! I see the issue - there was a delay from our supplier. Your laptop actually shipped yesterday and you should receive tracking info within the next hour. It should arrive by Friday.",
            createdAt: new Date("2024-03-15T10:06:00Z"),
            readAt: new Date("2024-03-15T10:06:30Z"),
        },
    });

    // Customer's appreciation
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "That's great news! Thanks for checking on that so quickly. Really appreciate the personal attention.",
            createdAt: new Date("2024-03-15T10:07:00Z"),
        },
    });

    // Agent's final message
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "You're very welcome! Feel free to reach out directly if you have any other questions. Enjoy your new laptop! 💻",
            createdAt: new Date("2024-03-15T10:08:00Z"),
        },
    });

    console.log("✅ Seeding completed successfully!");
    console.log("\n📊 Created:");
    console.log(`   • 2 Businesses (ID: 1, 2)`);
    console.log(`   • 2 Users (ID: 1=Agent, 2=Customer)`);
    console.log(`   • 1 DIRECT Conversation`);
    console.log(`   • 8 Messages with realistic direct chat flow`);
    console.log("\n💬 Conversation Type:");
    console.log(`   • Direct: Business 1 - Personal customer service chat`);
}

main()
    .catch((e) => {
        console.error("❌ Error during seeding:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
