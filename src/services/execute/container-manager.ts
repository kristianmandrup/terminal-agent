/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Duplex } from "node:stream";

import Dockerode, { ExecStartOptions } from "dockerode";
import { config } from "dotenv";
import { pack } from "tar-fs";

// Load environment variables from .env file
config();

export interface BuildArguments {
  [key: string]: string;
}

export interface ContainerConfig {
  imageName: string;
  buildArgs: BuildArguments;
  dockerfileDir: string;
  socketPath?: string;
}

export class DockerContainerManager {
  private docker: Dockerode;
  private imageName: string;
  private buildArgs: BuildArguments;
  private dockerfileDir: string;
  private userContainers: Record<string, Record<string, string>> = {};

  private startOptions = {
    command: { hijack: true, stdin: true },
    terminalSession: { hijack: true, stdin: false, Tty: true },
  };

  constructor(config: ContainerConfig) {
    this.imageName = config.imageName;
    this.buildArgs = config.buildArgs;
    this.dockerfileDir = config.dockerfileDir;
    const socketPath =
      config.socketPath ||
      process.env.DOCKER_SOCKET_PATH ||
      "/var/run/docker.sock";
    this.docker = new Dockerode({ socketPath });
  }

  private async buildImage() {
    const buildArgumentsFormatted: any = {};
    for (const [key, value] of Object.entries(this.buildArgs)) {
      buildArgumentsFormatted[key] = value;
    }

    const tarStream = pack(this.dockerfileDir);

    return new Promise<void>((resolve, reject) => {
      this.docker.buildImage(
        tarStream,
        {
          t: this.imageName,
          buildargs: buildArgumentsFormatted,
        },
        (error, response) => {
          if (error) return reject(error);

          response?.pipe(process.stdout, { end: true });

          response?.on("end", () => resolve());
        }
      );
    });
  }

  protected async createAndSetContainer(userId: string, sessionId: string) {
    const container = await this.docker.createContainer({
      Image: this.imageName,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ["/bin/bash"], // or any other default command
    });
    this.userContainers[userId][sessionId] = container.id;
    return container.id;
  }

  protected async getOrCreateContainer(userId: string, sessionId: string) {
    let userRegistry = this.userContainers[userId];
    if (!userRegistry) {
      userRegistry = {};
      this.userContainers[userId] = userRegistry;
    }
    const containerId =
      userRegistry[sessionId] ||
      (await this.createAndSetContainer(userId, sessionId));
    return this.docker.getContainer(containerId);
  }

  public async buildContainer(userId: string, sessionId: string) {
    await this.buildImage();
    return this.getOrCreateContainer(userId, sessionId);
  }

  // This code structure allows you to easily manage multiple terminal sessions on the same underlying container.
  // Each session will execute independently but share the same file system and container state.
  public async createTerminalSession(
    userId: string,
    sessionId: string,
    command: string
  ) {
    return await this.executeCommand(userId, command, sessionId, true);
  }

  protected async getExecObject(
    userId: string,
    sessionId: string,
    command: string
  ) {
    const container = await this.getOrCreateContainer(userId, sessionId);
    const execOptions = {
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    };
    return await container.exec(execOptions);
  }

  public async executeCommand(
    userId: string,
    sessionId: string,
    command: string,
    terminalSession = false
  ) {
    const execObject = await this.getExecObject(userId, sessionId, command);
    const startOptions = terminalSession
      ? this.startOptions.terminalSession
      : this.startOptions.command;
    return this.execToPromisedStream(execObject, startOptions);
  }

  protected async execToPromisedStream(
    execObject: Dockerode.Exec,
    startOptions: ExecStartOptions
  ) {
    return await execObject.start(startOptions);
  }

  protected async execToPromisedString(
    execObject: Dockerode.Exec,
    startOptions: ExecStartOptions
  ) {
    return new Promise<string>((resolve, reject) => {
      execObject.start(startOptions, (error: any, stream?: Duplex) => {
        if (error) {
          return reject(error);
        }
        if (!stream) return;
        let output = "";
        stream.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });

        stream.on("end", () => {
          resolve(output);
        });

        stream.on("error", (error) => {
          reject(error);
        });
      });
    });
  }
}
