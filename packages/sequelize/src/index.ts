import { Sequelize, Options } from "sequelize";
import { ServiceOption, InitOption, STOP_KEY } from "use-services";

export type Args = {
  database: string;
  username: string;
  password: string;
  options?: Options;
  setup: (sql: Sequelize) => Promise<void>;
};

export type Option<S extends Service> = ServiceOption<Args, S>;

export class Service extends Sequelize {
  public [STOP_KEY]() {
    return this.close();
  }
}

export async function init<S extends Service>(
  option: InitOption<Args, S>
): Promise<S> {
  const { database, username, password, options } = option.args;
  const srv = new (option.ctor || Service)(
    database,
    username,
    password,
    options
  );
  await srv.authenticate();
  await option.args.setup(srv);
  return srv as S;
}
