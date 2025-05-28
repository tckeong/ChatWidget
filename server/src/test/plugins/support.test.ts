import { test, TestContext } from 'node:test'; // Import test and TestContext from node:test
import assert from 'node:assert'; // Import assert module for assertions

import Fastify, { FastifyInstance } from 'fastify'; // Import Fastify and the FastifyInstance type
import support from '../../plugins/support';

// This test verifies that the 'someSupport' decorator works correctly
// when the plugin is registered with a Fastify instance.
test('support works standalone', async (t: TestContext) => {
  // Create a new Fastify instance
  const fastify: FastifyInstance = Fastify();

  // Register the Support plugin with the Fastify instance
  fastify.register(support);

  // Wait for the Fastify instance and its plugins to be ready
  await fastify.ready();

  // Assert that the 'someSupport' decorator exists and returns the expected value
  assert.equal(fastify.someSupport(), 'hugs');

  // t.after() is automatically handled by node:test for async tests
  // Fastify instance will be closed after the test completes.
});

// The commented-out section in the original JavaScript was for Fastify v2
// using a callback-based ready() method and potentially a different test runner
// (like tap with t.plan()). For node:test and modern Fastify, async/await is preferred.
// If explicit cleanup is needed, you would use t.after() here too.