import path from "node:path";

import { userSessions } from "~/domain";
import { generateSessionId } from "~/presentation/http/routes/session/generator";
import { redisClient } from "~/presentation/redis";

import { ContainerConfig, DockerContainerManager } from "./container-manager";
import { handleExecStream } from "./stream-handler";

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

export const execute = async (arguments_: TExecuteCommand) => {
  const { command, user } = arguments_;
  const sessionId = arguments_.sessionId || generateSessionId();
  userSessions.add(sessionId);

  const config: ContainerConfig = {
    imageName: "automated-terminal",
    buildArgs: {
      GIT_USER_NAME: user.id,
      GIT_USER_EMAIL: user.email,
    },
    dockerfileDir: path.resolve("./path-to-your-dockerfile"),
  };

  try {
    const manager = new DockerContainerManager(config);
    await manager.buildContainer(user.id, sessionId);

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
    return output;
  } catch (error: any) {
    const key = `terminal:${sessionId}:stderr`;
    const data = {
      command,
      error,
    };
    const stringData = JSON.stringify(data);
    await redisClient.publish(key, stringData);
    await redisClient.append(key, stringData);
    throw error;
  }
};
