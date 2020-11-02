import { Config } from "use-services";

export type Service<S> = S;

export async function init<A>(config: Config, args: A): Promise<Service<A>> {
  return args;
}