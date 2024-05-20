import { IActionHandler } from ".";
import { Action } from "./action";

export type IFunction = (arguments_: any) => Promise<any>;

export class MainHandler implements IActionHandler {
  registry: Record<string, IFunction> = {};

  register(name: string, function_: IFunction) {
    this.registry[name] = function_;
  }

  async handle(action: Action) {
    const { name } = action;
    const function_ = this.registry[name];
    if (!function_) return;
    await function_(action.arguments);
  }
}
