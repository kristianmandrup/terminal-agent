import { IFunctionCall } from "./openai/message-handler";

export interface IAction {
  name: string;
  arguments: any;
}

export class Action implements IAction {
  name: string;
  arguments: any;

  constructor(name: string, parameters: any) {
    this.name = name;
    this.arguments = parameters;
  }

  static createFrom(function_: IFunctionCall) {
    return new Action(function_.name, JSON.parse(function_.arguments));
  }
}
