import { Sequelize, Options } from "sequelize";
import { ServiceOption, InitOption, STOP_KEY } from "use-services";

export type Args<K> = {
  database: string;
  username: string;
  password: string;
  options?: Options;
  load: (sql: Sequelize) => Promise<K>,
};

export type Option<K, S extends Service> = ServiceOption<Args<K>, S & K>;

export async function init<K, S extends Service>(
  option: InitOption<Args<K>, S> 
): Promise<S & K> {
  const { database, username, password, options } = option.args;
  const srv = new (option.ctor || Service)(database, username, password, options);
  await srv.authenticate();
  const models = await option.args.load(srv);
  Object.assign(srv, models);
  return srv as S & K;
}

export class Service extends Sequelize {
  public [STOP_KEY]() {
    return this.close();
  }
}
