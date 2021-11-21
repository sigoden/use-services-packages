import { ServiceOption, InitOption } from "use-services";
import { template } from "lodash";

export type Service<A> = { [k in keyof A]: ErrorFactory<ExtractService<A[k]>> };
export type Option<A> = ServiceOption<A, Service<A>>;

type ExtractService<Type> = Type extends ErrorParams<infer K>
  ? K & CallArgs
  : CallArgs;

export async function init<A extends { [k: string]: ErrorParams<CallArgs> }>(
  option: InitOption<A, Service<A>>
): Promise<Service<A>> {
  return Object.keys(option.args).reduce((acc, cur) => {
    acc[cur] = new ErrorFactory(cur, option.args[cur]);
    return acc;
  }, {}) as Service<A>;
}

interface ErrorParams<K extends CallArgs> {
  message: string;
  status: number;
  args: K;
}

interface CallArgs {
  [k: string]: any;
  extra?: any;
}

export class HttpError<K extends CallArgs> extends Error {
  public readonly status: number;
  public readonly extra?: any;
  constructor(msg: string, code: string, status: number, extra?: any) {
    super(msg);
    this.name = code;
    this.status = status;
    this.extra = extra;
  }

  public toJSON() {
    return {
      code: this.name,
      message: this.message,
      extra: this.extra,
    };
  }
}

export class ErrorFactory<K extends CallArgs> {
  public readonly status: number;
  public readonly code: string;
  private createMessage: (args: K) => string;
  constructor(code: string, params: ErrorParams<K>) {
    this.code = code;
    this.status = params.status;
    this.createMessage = (args: K) => {
      try {
        return template(params.message)(args);
      } catch (err) {
        return `cannot complete template<${
          params.message
        }> with args<${JSON.stringify(args)}>`;
      }
    };
  }

  public toJson(args?: K) {
    return {
      code: this.code,
      message: this.createMessage(args),
      extra: this.extra(args),
    };
  }

  public toError(args?: K) {
    return new HttpError(
      this.createMessage(args),
      this.code,
      this.status,
      this.extra(args)
    );
  }

  extra(args: K) {
    return args && args.extra ? args.extra : undefined;
  }
}
