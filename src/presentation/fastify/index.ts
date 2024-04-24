/* eslint-disable import/no-named-as-default */
import { randomBytes } from "node:crypto";

import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { FastifySSEPlugin } from "fastify-sse-v2";

import { redisClient } from "../redis";

const server = fastify();
await server.register(FastifySSEPlugin);

export type TListenRequest = {
  sessionId: string;
  channel: string;
};

// Function to generate a unique session ID
function generateSessionId(): string {
  // Generate a random byte array of the desired length (e.g., 16 bytes)
  const sessionIdBytes: Buffer = randomBytes(16);

  // Convert the byte array to a hexadecimal string
  const sessionId: string = sessionIdBytes.toString("hex");

  return sessionId;
}
// Create a Fastify instance
const app = fastify();

export const userSessions = new Set<string>([]);

// Fastify route to initiate terminal session
app.get(
  "/terminal/session",
  async (_request: FastifyRequest, reply: FastifyReply) => {
    // Generate a unique session ID for the client
    const sessionId = generateSessionId();
    userSessions.add(sessionId);
    // Send session ID to the client
    await reply.send({ sessionId });
  }
);

// SSE route to listen for terminal output updates
app.get(
  "terminal/:channel/:sessionId",
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId, channel } = request.params as TListenRequest;
    if (!userSessions.has(sessionId)) {
      await reply.status(400).send({ error: "Invalid sessionId" });
      return;
    }

    if (!["stdout", "stderr"].includes(channel)) {
      await reply.status(400).send({ error: "Invalid sessionId" });
      return;
    }

    // Subscribe to the channel associated with the session ID
    await redisClient.subscribe(
      `terminal:${sessionId}:${channel}`,
      (message: string) => {
        console.log("Got message from terminal:", sessionId);
        console.log(message); // 'message'
      }
    );

    // Handle messages received on the channel
    redisClient.on("message", (channel: string, message: string) => {
      // Check if the message is received on the channel associated with the session ID
      if (channel === `terminal:${sessionId}:${channel}`) {
        // Send the message as an SSE event to the client
        reply.sse({ data: JSON.parse(message) });
      }
    });

    // Handle client disconnection
    request.socket.on("close", () => {
      // Unsubscribe from the channel associated with the session ID
      redisClient
        .unsubscribe(sessionId)
        .then(() => {
          console.log(`Unsubscribed from channel ${sessionId}`);
        })
        .catch((error: any) => {
          console.error("Error unsubscribing from channel:", error);
        });
    });
  }
);

const port = Number(process.env.PORT || 3000);

// Start the server
const start = async () => {
  try {
    await app.listen({
      port,
    });
    console.log(`Server is listening on port ${port}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

await start();
