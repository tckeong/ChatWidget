import { test, beforeEach, afterEach } from "tap";
import Fastify, { FastifyInstance } from "fastify";
import loginPlugin from "../../plugins/login";

// Mock Prisma client
const mockPrismaUser = {
    findUnique: jest.fn(),
};

// Mock JWT
const mockJwt = {
    sign: jest.fn(),
};

let app: FastifyInstance;

beforeEach(async () => {
    app = Fastify();

    // Register JWT mock
    app.decorate("jwt", mockJwt);

    // Register Prisma mock
    app.decorate("prisma", {
        user: mockPrismaUser,
    });

    // Register the plugin
    await app.register(loginPlugin);

    // Reset mocks
    jest.clearAllMocks();
});

afterEach(async () => {
    await app.close();
});

test("POST /login - successful login", async (t) => {
    // Mock user found in database
    mockPrismaUser.findUnique.mockResolvedValue({
        id: BigInt("123"),
    });

    // Mock JWT sign
    mockJwt.sign.mockReturnValue("mock-jwt-token");

    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {
            id: "123",
        },
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.message, "Login successful");
    t.equal(body.status, "success");
    t.equal(body.jwt, "mock-jwt-token");

    // Verify Prisma was called correctly
    t.ok(
        mockPrismaUser.findUnique.calledWith({
            where: { id: BigInt("123") },
            select: { id: true },
        })
    );

    // Verify JWT was signed correctly
    t.ok(mockJwt.sign.calledWith({ id: "123" }));
});

test("POST /login - user not found", async (t) => {
    // Mock user not found
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {
            id: "999",
        },
    });

    t.equal(response.statusCode, 404);

    const body = JSON.parse(response.body);
    t.equal(body.message, "User not found.");
    t.equal(body.status, "error");
    t.notOk(body.jwt);
});

test("POST /login - missing user data", async (t) => {
    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: null,
    });

    t.equal(response.statusCode, 400);

    const body = JSON.parse(response.body);
    t.equal(body.message, "User ID is required.");
    t.equal(body.status, "error");
});

test("POST /login - empty user data", async (t) => {
    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {},
    });

    t.equal(response.statusCode, 400);

    const body = JSON.parse(response.body);
    t.equal(body.message, "User ID is required.");
    t.equal(body.status, "error");
});

test("POST /login - database error", async (t) => {
    // Mock database error
    mockPrismaUser.findUnique.mockRejectedValue(
        new Error("Database connection failed")
    );

    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {
            id: "123",
        },
    });

    // Should return 500 for unhandled errors
    t.equal(response.statusCode, 500);
});

test("GET /user/:userId - existing user Alice", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/user/1",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, "1");
    t.equal(body.name, "Alice");
});

test("GET /user/:userId - existing user Bob", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/user/2",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, "2");
    t.equal(body.name, "Bob");
});

test("GET /user/:userId - unknown user", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/user/999",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, "999");
    t.equal(body.name, "Unknown User");
});

test("GET /user/:userId - missing userId parameter", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/user/",
    });

    // Should return 404 for invalid route
    t.equal(response.statusCode, 404);
});

test("GET /business/:businessId - existing business", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/business/1",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, "1");
    t.equal(body.name, "Tech Solutions");
});

test("GET /business/:businessId - unknown business", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/business/999",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, "999");
    t.equal(body.name, "Unknown Business");
});

test("GET /business/:businessId - missing businessId parameter", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/business/",
    });

    // Should return 404 for invalid route
    t.equal(response.statusCode, 404);
});

// Edge case tests
test("POST /login - very large user ID", async (t) => {
    const largeId = "999999999999999999";

    mockPrismaUser.findUnique.mockResolvedValue({
        id: BigInt(largeId),
    });

    mockJwt.sign.mockReturnValue("mock-jwt-token");

    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {
            id: largeId,
        },
    });

    t.equal(response.statusCode, 200);

    // Verify BigInt conversion worked correctly
    t.ok(
        mockPrismaUser.findUnique.calledWith({
            where: { id: BigInt(largeId) },
            select: { id: true },
        })
    );
});

test("POST /login - invalid JSON payload", async (t) => {
    const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: "invalid-json",
        headers: {
            "content-type": "application/json",
        },
    });

    // Should return 400 for invalid JSON
    t.equal(response.statusCode, 400);
});

test("GET endpoints - special characters in parameters", async (t) => {
    const response = await app.inject({
        method: "GET",
        url: "/user/%20test%20",
    });

    t.equal(response.statusCode, 200);

    const body = JSON.parse(response.body);
    t.equal(body.id, " test ");
    t.equal(body.name, "Unknown User");
});
