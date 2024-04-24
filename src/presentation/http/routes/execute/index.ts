/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import Dockerode from "dockerode";
import { z } from "zod";

import { userSessions } from "~/presentation/fastify";
import { redisClient } from "~/presentation/redis";

import { handleExecStream } from "./stream-handler";

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
      userId: z.string(),
      sessionId: z.string(),
      command: z.string(),
    }),
    summary: "Execute a terminal command",
  },
});

const userContainers: Record<string, string> = {};

export type TExecuteCommand = {
  userId: string;
  sessionId: string;
  command: string;
};

export async function executeCommandRoute({
  command,
  userId,
  sessionId,
}: TExecuteCommand): Promise<RouterExecuteCommandResult> {
  try {
    if (!userSessions.has(sessionId)) {
      return { status: 400, body: { message: "Invalid sessionId" } };
    }

    // We can use the user for auth, in terms of what container the user gets and what they are permitted to do
    console.log(`Retrieving container for ${userId} for session ${sessionId}`);

    const docker = new Dockerode();
    let containerId = userContainers[sessionId];
    if (!containerId) {
      const container = await docker.createContainer({
        Image: "automated-terminal",
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ["/bin/bash"], // or any other default command
      });
      containerId = container.id;
      userContainers[sessionId] = containerId;
    }

    const container = docker.getContainer(containerId);
    const execOptions = {
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    };
    const execObject = await container.exec(execOptions);

    // Start the execution with proper options
    const execStartOptions = {
      hijack: true,
      stdin: false,
      Tty: true,
    };
    const execStream = await execObject.start(execStartOptions);

    try {
      const data = await handleExecStream(execStream);
      const key = `terminal:${sessionId}:stdout`;
      // Publish a message to the Redis channel associated with the session ID
      await redisClient.publish(key, JSON.stringify(data));
      await redisClient.append(key, JSON.stringify(data));
      return { status: 200, body: data };
    } catch (error: any) {
      const key = `terminal:${sessionId}:stderr`;
      await redisClient.publish(key, JSON.stringify(error));
      await redisClient.append(key, JSON.stringify(error));
      return { status: 400, body: { message: `Error ${error}` } };
    }
  } catch (error: any) {
    return { status: 500, body: { message: error.message } };
  }
}
