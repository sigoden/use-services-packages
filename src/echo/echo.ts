import { Config } from "use-services";

export async function init<T>(config: Config, args: T): Promise<T> {
  return args;
}