import { initContract, ServerInferResponses } from "@ts-rest/core";
import { z } from "zod";

import { userSessions } from "~/domain";

import { generateSessionId } from "./generator";

const c = initContract();

const success = z.object({
  sessionId: z.string(),
});

export type RouterInitiateSessionResult = ServerInferResponses<
  (typeof initiateSessionContract)["initiateSession"]
>;

// Contract definition for the route
export const initiateSessionContract = c.router({
  initiateSession: {
    method: "GET",
    path: "/terminal/session",
    summary: "Initiate a terminal session",
    responses: {
      200: success,
    },
  },
});

// Route handler function for initiating a terminal session
export function initiateSessionRoute(): RouterInitiateSessionResult {
  // Generate a unique session ID for the client
  const sessionId = generateSessionId();
  userSessions.add(sessionId);
  // Send session ID to the client
  return { status: 200, body: { sessionId } };
}
