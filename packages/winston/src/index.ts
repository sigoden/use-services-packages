import * as winston from "winston";
import { ServiceOption, InitOption, createInitFn } from "use-services";
const { combine } = winston.format;

export interface Args {
  console?: winston.transports.ConsoleTransportOptions;
  file?: winston.transports.FileTransportOptions;
  http?: winston.transports.HttpTransportOptions;
  level?: string;
  meta?: Record<string, any>;
  format?: Array<string | [string, ...any[]]>;
  serializeErrors?: { ErrType: typeof Error; serialize: (e: Error) => any }[];
  extraFormats?: Record<string, winston.Logform.FormatWrap>;
}

export type Option<S extends Service> = ServiceOption<Args, S>;

export class Service {
  public readonly loggers?: winston.Logger[];
  private args: Args;
  constructor(option: InitOption<Args, Service>) {
    const args = (this.args = option.args);
    this.loggers = [];
    this.args.serializeErrors = this.args.serializeErrors || [];
    const loggerOpts: winston.LoggerOptions = {
      level: this.args.level || "info",
      format: parseFormat(
        this.args.format || ["timestamp", "json"],
        this.args.extraFormats || {}
      ),
    };
    if (this.args.meta) {
      loggerOpts.defaultMeta = this.args.meta;
    }
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
    loggerOpts.transports = transports;
    this.loggers.push(winston.createLogger(loggerOpts));
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
      for (const serErr of this.args.serializeErrors) {
        if (message instanceof serErr.ErrType) {
          return serErr.serialize(message);
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

export const init = createInitFn(Service);

function isPlainObject(obj: any) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function parseFormat(
  format: Array<string | [string, ...any[]]>,
  extraFormats: Record<string, winston.Logform.FormatWrap>
) {
  try {
    const formatParts = [];
    for (const fm of format) {
      if (typeof fm === "string") {
        formatParts.push((extraFormats[fm] || winston.format[fm])());
      } else if (Array.isArray(fm)) {
        const [name, ...args] = fm;
        formatParts.push((extraFormats[name] || winston.format[name])(...args));
      }
    }
    return combine(...formatParts);
  } catch {
    throw new Error(`Invalid format '${JSON.stringify(format)}'`);
  }
}
