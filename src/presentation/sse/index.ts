import { randomBytes } from "node:crypto";

import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { FastifySSEPlugin } from "fastify-sse-v2";
import { createClient } from "redis";

const server = fastify();
await server.register(FastifySSEPlugin);

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

server.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
  for (let index = 0; index < 10; index++) {
    await sleep(2000);
    reply.sse({ id: String(index), data: "Some message" });
  }
});

// Create a Redis client
const redisClient = createClient();

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

// Fastify route to initiate terminal session
app.post("/terminal", async (request: FastifyRequest, reply: FastifyReply) => {
  // Generate a unique session ID for the client
  const sessionId = generateSessionId();

  // Send session ID to the client
  await reply.send({ sessionId });
});

export type TListenRequest = {
  sessionId: string;
};

const client = createClient();
client.on("error", (error: any) => console.log("Redis Client Error", error));
await client.connect();
const subscriber = client.duplicate();
await subscriber.connect();
const topic = "avc";
await subscriber.subscribe(topic, (message: string) => {
  console.log("Got message from topic:", topic);
  console.log(message); // 'message'
});

const message = "abc";
const publisher = client.duplicate();
await publisher.connect();
await publisher.publish(topic, message);

// SSE route to listen for terminal output updates
app.get(
  "/listenForChanges/:sessionId",
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as TListenRequest;

    // Subscribe to the channel associated with the session ID
    await redisClient.subscribe(sessionId, (message: string) => {
      console.log("Got message from topic:", sessionId);
      console.log(message); // 'message'
    });

    // Handle messages received on the channel
    redisClient.on("message", (channel: string, message: string) => {
      // Check if the message is received on the channel associated with the session ID
      if (channel === sessionId) {
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

// Start the server
const start = async () => {
  try {
    await app.listen(3000);
    console.log("Server is listening on port 3000");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

await start();
