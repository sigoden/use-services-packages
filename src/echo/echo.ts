import { ServiceOption, InitOption } from "use-services";

export type Option<A> = ServiceOption<A, A>;

export async function init<A>(option: InitOption<A, A>): Promise<A> {
  return option.args;
}
