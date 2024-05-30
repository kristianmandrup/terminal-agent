import path from "node:path";

import { userSessions } from "~/domain";
import { generateSessionId } from "~/presentation/http/routes/session/generator";
import { redisClient } from "~/presentation/redis";

import { ContainerConfig, DockerContainerManager } from "./container-manager";
import { ExecStreamHandler } from "./stream-handler";

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
  newTerminalSession: boolean;
};

export const execute = async (arguments_: TExecuteCommand) => {
  const { command, user, newTerminalSession } = arguments_;
  const sessionId = arguments_.sessionId || generateSessionId();
  userSessions.add(sessionId);

  const config: ContainerConfig = {
    imageName: "automated-terminal",
    buildArgs: {
      GIT_USER_NAME: user.id,
      GIT_USER_EMAIL: user.email,
    },
    terminalType: "zsh",
    dockerfileDir: path.resolve("./Terminal.dockerfile"),
  };

  try {
    const manager = new DockerContainerManager(config);
    await manager.buildContainer(user.id, sessionId);

    const stream = await manager.executeCommand(
      user.id,
      sessionId,
      command,
      newTerminalSession
    );
    const execStreamHandler = new ExecStreamHandler();
    // output contains both text and html
    const output = await execStreamHandler.handle(stream);
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
