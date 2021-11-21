import * as winston from "winston";
import { ServiceOption, InitOption } from "use-services";
const { combine, json, timestamp } = winston.format;

export interface Args {
  console?: winston.transports.ConsoleTransportOptions;
  file?: winston.transports.FileTransportOptions;
  http?: winston.transports.HttpTransportOptions;
  formatErrors?: { ErrType: typeof Error; format: (e: Error) => any }[];
  level?: string;
  format?: winston.Logform.Format;
}

export type Option<S extends Service> = ServiceOption<Args, S>;

export async function init<S extends Service>(
  option: InitOption<Args, S>
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  return srv as S;
}

export class Service {
  public readonly loggers?: winston.Logger[];
  private args: Args;
  constructor(option: InitOption<Args, Service>) {
    const args = (this.args = option.args);
    this.loggers = [];
    this.args.formatErrors = this.args.formatErrors || [];
    const level = this.args.level || "info";
    const format = this.args.format || combine(timestamp(), json());
    const defaultMeta = { service: option.app };
    const transports = [];
    const consoleOptions = args.console || { level: "info" };
    if (consoleOptions) {
      transports.push(new winston.transports.Console(args.console));
    }
    if (args.http) {
      transports.push(new winston.transports.Http(args.http));
    }
    if (args.file) {
      transports.push(new winston.transports.File(args.file));
    }
    this.loggers.push(
      winston.createLogger({
        defaultMeta,
        format,
        level,
        transports,
      })
    );
  }
  public log(
    kind: "info" | "debug" | "warn" | "error",
    message: any,
    extra: any
  ): void {
    const data = { ...this.wrapMessage(message), ...this.wrapExtra(extra) };
    this.loggers.forEach((logger) => logger[kind](data));
  }
  public info(message: string, extra: any = {}): void {
    this.log("info", message, extra);
  }
  public debug(message: string, extra: any = {}): void {
    this.log("debug", message, extra);
  }
  public warn(message: string, extra: any = {}): void {
    this.log("warn", message, extra);
  }
  public error(message: Error | string, extra: any = {}): void {
    this.log("error", message, extra);
  }

  private wrapMessage(message: Error | string) {
    if (message instanceof Error) {
      for (const f of this.args.formatErrors) {
        if (message instanceof f.ErrType) {
          return f.format(message);
        }
      }
      return {
        message: message.message,
        stack: message.stack,
        class: message.name,
      };
    }
    return { message };
  }

  private wrapExtra(extra: any) {
    return isPlainObject(extra) ? extra : { extra };
  }
}

function isPlainObject(obj: any) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
