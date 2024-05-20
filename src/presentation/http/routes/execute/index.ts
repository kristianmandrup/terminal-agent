import path from "node:path";

import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { redisClient } from "~/presentation/redis";

import { userSessions } from "../..";
import { ContainerConfig, DockerContainerManager } from "./container-manager";
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

export type ContainerId = string;

export type UserRegistry = {
  [key: string]: ContainerId;
};

export type TExecuteCommand = {
  user: {
    id: string;
    email: string;
  };
  sessionId: string;
  command: string;
};

export async function executeCommandRoute(
  cmd: TExecuteCommand
): Promise<RouterExecuteCommandResult> {
  try {
    const { command, user, sessionId } = cmd;
    if (!userSessions.has(sessionId)) {
      return { status: 400, body: { message: "Invalid sessionId" } };
    }
    const config: ContainerConfig = {
      imageName: "automated-terminal",
      buildArgs: {
        GIT_USER_NAME: user.id,
        GIT_USER_EMAIL: user.email,
      },
      dockerfileDir: path.resolve("./path-to-your-dockerfile"),
    };

    const manager = new DockerContainerManager(config);
    await manager.buildContainer(user.id, sessionId);

    try {
      const stream = await manager.executeCommand(user.id, sessionId, command);
      const output = await handleExecStream(stream);
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
