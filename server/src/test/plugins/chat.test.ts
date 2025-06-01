import test from "node:test";
import assert from "node:assert";
import { build } from "../helper";

test("test send messages", async (t) => {
    const app = await build(t);

    const mockJwt = app.jwt.sign({
        id: "1",
    });

    const res = await app.inject({
        url: "/messages",
        method: "POST",
        headers: {
            authorization: `Bearer ${mockJwt}`,
        },
        body: {
            conversationId: "1",
            message: "Hello, I need help with my order.",
        },
    });

    assert.strictEqual(res.statusCode, 201);
});

test("test send messages without JWT", async (t) => {
    const app = await build(t);

    const res = await app.inject({
        url: "/messages",
        method: "POST",
        body: {
            conversationId: "1",
            message: "Hello, I need help with my order.",
        },
    });

    assert.strictEqual(res.statusCode, 401);
});
