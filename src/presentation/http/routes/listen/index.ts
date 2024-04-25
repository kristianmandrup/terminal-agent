// route.ts

import type { ServerInferRequest, ServerInferResponses } from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { redisClient } from "~/presentation/redis";

import { userSessions } from "../..";

const c = initContract();

// Define the schema for the request parameters
const listenRequestObject = z.object({
  sessionId: z.string(),
  channel: z.enum(["stdout", "stderr"]),
});

type TListenRequest = z.ZodSchema<{
  sessionId: string;
  channel: "stdout" | "stderr";
}>;

// Define the response types
export type RouterListenTerminalResult = ServerInferResponses<
  (typeof listenTerminalContract)["listenTerminal"]
>;

export type RouterListenTerminalParameters = ServerInferRequest<
  (typeof listenTerminalContract)["listenTerminal"]
>;

const success = z.object({
  data: z.string(),
});

const error = z.object({
  message: z.string(),
});

// Contract definition for the route
export const listenTerminalContract = c.router({
  listenTerminal: {
    method: "GET",
    path: "/terminal/listen/:channel/:sessionId",
    pathParams: listenRequestObject as TListenRequest,
    summary: "Listen for terminal output updates via SSE",
    responses: {
      200: success,
      400: error,
    },
  },
});

export const sendSSE = (reply: FastifyReply, data: string) => {
  reply.raw.write(`data: ${data}\n\n`);
};

// Route handler function for listening for terminal output updates via SSE
export async function listenTerminalRoute(
  { params }: FastifyRequest<{ Params: RouterListenTerminalParameters }>,

  reply: FastifyReply
): Promise<RouterListenTerminalResult> {
  const { sessionId, channel } = params.params;

  // Check if the sessionId is valid
  if (!userSessions.has(sessionId)) {
    return { status: 400, body: { message: "Invalid sessionId" } };
  }

  const sessionKey = `terminal:${sessionId}:${channel}`;

  // Subscribe to the channel associated with the session ID
  await redisClient.subscribe(sessionKey, () => {
    console.info(`subscribed to ${sessionKey}`);
  });

  // Handle messages received on the channel
  redisClient.on("message", (channel: string, message: string) => {
    // Check if the message is received on the correct channel
    if (channel === sessionKey) {
      // Send the message as an SSE event to the client
      // This approach constructs an SSE events manually and sends it over the HTTP response
      // stream via reply.raw.write. Make sure to follow the SSE format,
      // which requires sending each event as a string prefixed with "data:", followed by the
      // event data, and ending with a double newline ("\n\n").
      sendSSE(reply, message);
    }
  });

  // Handle client disconnection
  const onClose = () => {
    // Unsubscribe from the channel associated with the session ID
    redisClient
      .unsubscribe(`terminal:${sessionId}:${channel}`)
      .then(() => {
        console.log(
          `Unsubscribed from channel terminal:${sessionId}:${channel}`
        );
      })
      .catch((error: any) => {
        console.error("Error unsubscribing from channel:", error);
      });
  };
  reply.raw.on("close", onClose);
  reply.raw.once("end", onClose);

  return { status: 200, body: { data: `listening to ${channel}` } };
}
