import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { userSessions } from "~/domain";

import { execute, TExecuteCommand } from "../../../../services/execute/service";

// import { redisPool } from "~/presentation/redis";

export type RouterExecuteCommandResult = ServerInferResponses<
  (typeof executeRouterContract)["executeCommand"]
>;

export type RouterExecuteCommandBody = ServerInferResponseBody<
  (typeof executeRouterContract)["executeCommand"]
>;

const c = initContract();

export const executeRouterContract = c.router({
  executeCommand: {
    method: "POST",
    path: "/execute",
    responses: {
      200: z.string(),
      500: z.object({
        message: z.string(),
      }),
    },
    body: z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
      }),
      sessionId: z.string(),
      command: z.string(),
    }),
    summary: "Execute a terminal command",
  },
});

export async function executeCommandRoute(
  cmd: TExecuteCommand
): Promise<RouterExecuteCommandResult> {
  const { sessionId } = cmd;
  if (!userSessions.has(sessionId)) {
    return { status: 400, body: { message: "Invalid sessionId" } };
  }
  try {
    const output = await execute(cmd);
    return { status: 200, body: output };
  } catch (error: any) {
    return { status: 400, body: { message: error.message } };
  }
}
