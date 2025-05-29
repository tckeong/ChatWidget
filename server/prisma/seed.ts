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
    const business1 = await prisma.business.create({
        data: {
            id: 1n,
        },
    });

    const business2 = await prisma.business.create({
        data: {
            id: 2n,
        },
    });

    // Create Users
    console.log("👥 Creating users...");

    // Customer user
    const customerUser = await prisma.user.create({
        data: {
            id: 1n,
        },
    });

    // Agent user
    const agentUser = await prisma.user.create({
        data: {
            id: 2n,
        },
    });

    // Owner user (for demo purposes)
    const ownerUser = await prisma.user.create({
        data: {
            id: 3n,
        },
    });

    // Create a demo conversation
    console.log("💬 Creating demo conversation...");
    const demoConversation = await prisma.conversation.create({
        data: {
            id: 1n,
            businessId: business1.id,
            type: ConversationType.SUPPORT_ROOM,
            createdAt: new Date("2024-03-15T10:00:00Z"),
            updatedAt: new Date("2024-03-15T14:30:00Z"),
        },
    });

    // Create participants for the conversation
    console.log("👥 Adding participants to conversation...");

    // Customer participant
    await prisma.participant.create({
        data: {
            conversationId: demoConversation.id,
            userId: customerUser.id,
            role: ParticipantRole.CUSTOMER,
            joinedAt: new Date("2024-03-15T10:00:00Z"),
        },
    });

    // Agent participant
    await prisma.participant.create({
        data: {
            conversationId: demoConversation.id,
            userId: agentUser.id,
            role: ParticipantRole.AGENT,
            joinedAt: new Date("2024-03-15T10:05:00Z"),
        },
    });

    // Owner participant
    await prisma.participant.create({
        data: {
            conversationId: demoConversation.id,
            userId: ownerUser.id,
            role: ParticipantRole.OWNER,
            joinedAt: new Date("2024-03-15T11:30:00Z"),
        },
    });

    // Create demo messages
    console.log("💬 Creating demo messages...");

    // Customer's initial message
    const message1 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hi! I'm having trouble with my recent order. The software installation keeps failing with error code 500.",
            createdAt: new Date("2024-03-15T10:00:00Z"),
        },
    });

    // Agent's response
    const message2 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hello! I'm sorry to hear about the installation issue. Error code 500 typically indicates a server connection problem. Can you please tell me which version of the software you're trying to install?",
            createdAt: new Date("2024-03-15T10:05:00Z"),
            readAt: new Date("2024-03-15T10:06:00Z"),
        },
    });

    // Customer's follow-up
    const message3 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "I'm trying to install version 3.2.1. I've tried the installation twice already with the same result.",
            createdAt: new Date("2024-03-15T10:08:00Z"),
        },
    });

    // Agent's diagnostic response
    const message4 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Thank you for that information. Let me check our server status for v3.2.1. In the meantime, can you please try running the installer as administrator?",
            createdAt: new Date("2024-03-15T10:12:00Z"),
            readAt: new Date("2024-03-15T10:13:00Z"),
        },
    });

    // Customer sends a screenshot
    const message5 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.IMAGE,
            body: "Here's a screenshot of the error I'm getting:",
            fileUrl: "https://example.com/uploads/error-screenshot-500.png",
            mimeType: "image/png",
            createdAt: new Date("2024-03-15T10:20:00Z"),
        },
    });

    // Create attachment for the image message
    await prisma.attachment.create({
        data: {
            messageId: message5.id,
            url: "https://example.com/uploads/error-screenshot-500.png",
            mimeType: "image/png",
            width: 1920,
            height: 1080,
            sizeBytes: 245760, // ~240KB
        },
    });

    // Owner joins the conversation
    const message6 = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: ownerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hi there, this is the business owner. I can see we're having some server issues today. We'll have this resolved within the hour and I'll personally follow up with you.",
            createdAt: new Date("2024-03-15T11:30:00Z"),
        },
    });

    // System message about resolution
    const systemMessage = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: null, // System message
            contentType: MessageContentType.TEXT,
            body: "🔧 System Update: Server maintenance completed. Installation issues have been resolved.",
            createdAt: new Date("2024-03-15T13:00:00Z"),
        },
    });

    // Final resolution message from agent
    const finalMessage = await prisma.message.create({
        data: {
            conversationId: demoConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hi! The server issues have been resolved. Please try the installation again now. If you encounter any further issues, don't hesitate to reach out.",
            createdAt: new Date("2024-03-15T14:30:00Z"),
        },
    });

    // Create an additional direct conversation for more variety
    console.log("💬 Creating additional direct conversation...");
    const directConversation = await prisma.conversation.create({
        data: {
            id: 2n,
            businessId: business2.id,
            type: ConversationType.DIRECT,
            createdAt: new Date("2024-03-20T09:00:00Z"),
            updatedAt: new Date("2024-03-20T09:15:00Z"),
        },
    });

    // Add participants to direct conversation
    await prisma.participant.create({
        data: {
            conversationId: directConversation.id,
            userId: customerUser.id,
            role: ParticipantRole.CUSTOMER,
            joinedAt: new Date("2024-03-20T09:00:00Z"),
        },
    });

    await prisma.participant.create({
        data: {
            conversationId: directConversation.id,
            userId: agentUser.id,
            role: ParticipantRole.AGENT,
            joinedAt: new Date("2024-03-20T09:02:00Z"),
        },
    });

    // Add a couple messages to the direct conversation
    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Hi! I'm interested in your services. Do you offer monthly packages?",
            createdAt: new Date("2024-03-20T09:00:00Z"),
        },
    });

    await prisma.message.create({
        data: {
            conversationId: directConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Absolutely! We offer comprehensive packages starting from $299/month. Would you like me to send you more information?",
            createdAt: new Date("2024-03-20T09:05:00Z"),
            readAt: new Date("2024-03-20T09:06:00Z"),
        },
    });

    // Create a community conversation
    console.log("💬 Creating community conversation...");
    const communityConversation = await prisma.conversation.create({
        data: {
            id: 3n,
            businessId: business1.id,
            type: ConversationType.COMMUNITY,
            createdAt: new Date("2024-03-18T08:00:00Z"),
            updatedAt: new Date("2024-03-18T12:00:00Z"),
        },
    });

    // Add all users to community conversation
    await prisma.participant.create({
        data: {
            conversationId: communityConversation.id,
            userId: customerUser.id,
            role: ParticipantRole.CUSTOMER,
            joinedAt: new Date("2024-03-18T08:00:00Z"),
        },
    });

    await prisma.participant.create({
        data: {
            conversationId: communityConversation.id,
            userId: agentUser.id,
            role: ParticipantRole.AGENT,
            joinedAt: new Date("2024-03-18T08:30:00Z"),
        },
    });

    await prisma.participant.create({
        data: {
            conversationId: communityConversation.id,
            userId: ownerUser.id,
            role: ParticipantRole.OWNER,
            joinedAt: new Date("2024-03-18T09:00:00Z"),
        },
    });

    // Add community messages
    await prisma.message.create({
        data: {
            conversationId: communityConversation.id,
            senderId: customerUser.id,
            contentType: MessageContentType.TEXT,
            body: "Welcome to the community! Looking forward to connecting with everyone here.",
            createdAt: new Date("2024-03-18T08:00:00Z"),
        },
    });

    await prisma.message.create({
        data: {
            conversationId: communityConversation.id,
            senderId: agentUser.id,
            contentType: MessageContentType.TEXT,
            body: "Thanks for joining! Feel free to ask questions or share feedback anytime.",
            createdAt: new Date("2024-03-18T08:30:00Z"),
        },
    });

    // Add a file message example
    await prisma.message.create({
        data: {
            conversationId: communityConversation.id,
            senderId: ownerUser.id,
            contentType: MessageContentType.FILE,
            body: "Here's our latest product roadmap document:",
            fileUrl: "https://example.com/uploads/roadmap-2024.pdf",
            mimeType: "application/pdf",
            createdAt: new Date("2024-03-18T10:00:00Z"),
        },
    });

    console.log("✅ Seeding completed successfully!");
    console.log("\n📊 Created:");
    console.log(`   • 2 Businesses (ID: 1, 2)`);
    console.log(`   • 3 Users (ID: 1=Customer, 2=Agent, 3=Owner)`);
    console.log(`   • 3 Conversations (Support Room, Direct, Community)`);
    console.log(`   • 12 Messages with realistic conversation flows`);
    console.log(`   • 1 Image attachment`);
    console.log("\n💬 Conversation Types:");
    console.log(`   • Support Room: Business 1 - Customer support scenario`);
    console.log(`   • Direct: Business 2 - Sales inquiry`);
    console.log(`   • Community: Business 1 - Community discussion`);
}

main()
    .catch((e) => {
        console.error("❌ Error during seeding:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
