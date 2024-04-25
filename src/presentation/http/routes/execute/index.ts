/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import Dockerode from "dockerode";
import { z } from "zod";

import { redisClient } from "~/presentation/redis";

import { userSessions } from "../..";
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

export type ContainerId = string;

export type UserRegistry = {
  [key: string]: ContainerId;
};

const userContainers: Record<string, UserRegistry> = {};

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
    let userRegistry = userContainers[userId];
    if (!userRegistry) {
      userRegistry = {};
      userContainers[userId] = userRegistry;
    }
    let containerId = userRegistry[sessionId];

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
      userContainers[userId][sessionId] = containerId;
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
      const output = await handleExecStream(execStream);
      const data = {
        command,
        output,
      };
      const stringData = JSON.stringify(data);
      const key = `terminal:${sessionId}:stdout`;
      // Publish a message to the Redis channel associated with the session ID
      await redisClient.publish(key, stringData);
      await redisClient.append(key, stringData);
      return { status: 200, body: output };
    } catch (error: any) {
      const key = `terminal:${sessionId}:stderr`;
      const data = {
        command,
        error,
      };
      const stringData = JSON.stringify(data);
      await redisClient.publish(key, stringData);
      await redisClient.append(key, stringData);
      return { status: 400, body: { message: `${error}` } };
    }
  } catch (error: any) {
    return { status: 500, body: { message: error.message } };
  }
}
