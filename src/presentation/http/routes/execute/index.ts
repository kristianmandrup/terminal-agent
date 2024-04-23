/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import Dockerode from "dockerode";
import { z } from "zod";

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
      command: z.string(),
    }),
    summary: "Execute a terminal command",
  },
});

const docker = new Dockerode();
const userContainers: Record<string, string> = {};

export type TExecuteCommand = { userId: string; command: string };

async function handleExecStream(execStream: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Listen for 'data' events on the stream and push each chunk into the 'chunks' array
    execStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Listen for the 'end' event, indicating that the stream has finished
    execStream.on("end", () => {
      // Concatenate all the chunks into a single buffer
      const buffer = Buffer.concat(chunks);
      // Convert the buffer to a string
      const data = buffer.toString("utf8");
      // Resolve the Promise with the data
      resolve(data);
    });

    // Listen for errors on the stream
    execStream.on("error", (error: Error) => {
      // Reject the Promise with the error
      reject(error);
    });
  });
}

export async function executeCommandRoute({
  command,
  userId,
}: TExecuteCommand): Promise<RouterExecuteCommandResult> {
  try {
    let containerId = userContainers[userId];
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
      userContainers[userId] = containerId;
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

    // Publish a message to the Redis channel associated with the session ID
    // redisClient.publish(sessionId, JSON.stringify(update));

    const data = await handleExecStream(execStream);
    return { status: 200, body: data };
  } catch (error: any) {
    return { status: 500, body: { message: error.message } };
  }
}
