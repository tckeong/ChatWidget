import test from "node:test";
import assert from "node:assert";
import { build } from "../helper";

test("default login route", async (t) => {
    const app = await build(t);

    const res = await app.inject({
        url: "/login",
        method: "POST",
        body: {
            id: "1",
        },
    });

    assert.deepStrictEqual(JSON.parse(res.payload), {
        message: "Login successful",
        status: "success",
        jwt: app.jwt.sign({
            id: "1",
        }),
    });
});

test("get user by ID", async (t) => {
    const app = await build(t);

    const res = await app.inject({
        url: "/user/1",
    });
    assert.deepStrictEqual(JSON.parse(res.payload), {
        id: "1",
        name: "Alice",
    });

    const res2 = await app.inject({
        url: "/user/2",
    });

    assert.deepStrictEqual(JSON.parse(res2.payload), {
        id: "2",
        name: "Bob",
    });
});

test("get business by ID", async (t) => {
    const app = await build(t);

    const res = await app.inject({
        url: "/business/1",
    });
    assert.deepStrictEqual(JSON.parse(res.payload), {
        id: "1",
        name: "Tech Solutions",
    });
});
