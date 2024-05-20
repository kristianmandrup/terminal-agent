import { Action } from "../action";

export interface IFunctionCall {
  name: string;
  arguments: string;
}

export interface IFunction {
  function: IFunctionCall;
}

export interface AIMessage {
  tool_calls?: IFunction[];
}

export interface IActionHandler {
  handle(action: Action): Promise<void>;
}

export class OpenAIMessageHandler {
  main: IActionHandler;

  constructor(main: IActionHandler) {
    this.main = main;
  }

  getFunctionsFromMessage(message: any): IFunctionCall[] | undefined {
    return (message as AIMessage).tool_calls?.map((tc) => tc.function);
  }

  async handleFunction(function_: IFunctionCall) {
    const action = Action.createFrom(function_);
    await this.handle(action);
  }

  async handle(action: Action) {
    await this.main.handle(action);
  }

  async handleMessage(message: any) {
    const functions = this.getFunctionsFromMessage(message);
    if (!functions) return;
    for (const function_ of functions) {
      await this.handleFunction(function_);
    }
  }
}
