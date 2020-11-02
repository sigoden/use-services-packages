import { Config } from "use-services";
import * as template from "lodash.template";

export type Service<T> = { [k in keyof T]: Factory };

export interface Args {
  [k: string]: ErrorParams;
}

export async function init(config: Config, args: Args): Promise<Service<Args>> {
  return Object.keys(args).reduce((acc, cur) => {
    acc[cur] = new Factory(cur, args[cur])
    return acc;
  }, {})
}

export interface ErrorParams {
  message: string;
  status: number;
}

export interface CallArgs {
  [k: string]: any;
  extra?: any;
}

export class HttpErr extends Error {
  public readonly status: number;
  public readonly args: CallArgs;
  constructor(msg: string, f: Factory, args: CallArgs) {
    super(msg);
    this.name = f.code;
    this.status = f.status;
    this.args = args;
  }
}

export class Factory {
  public readonly status: number;
  public readonly code: string;
  private createMessage: (args: CallArgs) => string;
  constructor(code: string, params: ErrorParams) {
    this.code = code;
    this.status = params.status;
    this.createMessage = (args: CallArgs) => {
      try {
        return template(params.message)(args);
      } catch (err) {
        return `cannot complete template<${params.message}> with args<${JSON.stringify(args)}>`;
      }
    };
  }
  public json(args: CallArgs) {
    return {
      code: this.code,
      message: this.createMessage(args),
      extra: (args && args.extra) ? args.extra : undefined,
    };
  }
  public toError(args?: CallArgs) {
    return new HttpErr(this.createMessage(args), this, args);
  }
}
