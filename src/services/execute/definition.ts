export const executeCommand = {
  name: "terminal:bash:execute:command",
  description: "Executes a bash command in a terminal session for the user",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
      sessionId: {
        type: "string",
        description: "The session id for the terminal to use",
      },
      user: {
        type: "object",
        description: "User object with info and credentials for the user",
        properties: {
          id: {
            type: "string",
            description:
              "Unique user identifier such as the full name or username. Used to configure git etc.",
          },
          email: {
            type: "string",
            description:
              "The unique email of the user. Used to configure git etc.",
          },
        },
        required: ["id", "email"],
      },
    },
  },
  required: ["command", "user", "sessionId"],
};
