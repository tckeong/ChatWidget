import { FastifyInstance } from "fastify";
import { TestContext } from "node:test"; // Import test and TestContext from node:test

// This file contains code that we reuse
// between our tests.

const { build: buildApplication } = require("fastify-cli/helper");
const path = require("node:path");
const AppPath = path.join(__dirname, "..", "app.js");

// Fill in this config with all the configurations
// needed for testing the application
function config() {
    return {
        skipOverride: true, // Register our application with fastify-plugin
    };
}

// automatically build and tear down our instance
export async function build(t: TestContext): Promise<FastifyInstance> {
    // you can set all the options supported by the fastify CLI command
    const argv = [AppPath];

    // fastify-plugin ensures that all decorators
    // are exposed for testing purposes, this is
    // different from the production setup
    const app = await buildApplication(argv, config());

    // close the app after we are done
    t.after(() => app.close());

    return app;
}

module.exports = {
    config,
    build,
};
