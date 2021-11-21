# Dynconf

```ts

// in service.ts
import * as DynConf from "@use-services/dynconf";
import * as dynconf from "@/dynconf";

const options = {
  dynconf: {
    init: DynConf.init,
    args: dynconf,
    deps: ["redis"],
  } as DynConf.Option<typeof dynconf, DynConf.Service<typeof dynconf>>,
}


// in dynconf.ts

const dynconf = {
  minWithdrawAmount: 200000, // 最低提现额度
};

export = dynconf;


// usage
const { dynconf } = srvs;
const dync = await dynconf.load();
console.log(dync.minWithdrawAmount);

// usage in handlerManages
import { Handler, apiManage, okBody } from "@/type";
import srvs from "@/services";

export const loadDynconf: Handler<apiManage.LoadDynconfReq> = async (req, ctx) => {
  const dync = await srvs.dynconf.load();
  ctx.body = dync;
};

export const saveDynconf: Handler<apiManage.SaveDynconfReq> = async (req, ctx) => {
  await srvs.dynconf.save(req.body);
  ctx.body = okBody;
};
```

```jsona
  loadDynconf: { @endpoint({summary:"获取配置"})
    route: "GET /dynconf",
    req: {
    },
    res: {
      200: {
      }
    }
  },
  saveDynconf: { @endpoint({summary:"修改配置"})
    route: "POST /dynconf",
    req: {
      body: {
      }
    },
    res: {
      200: {
        msg: "OK"
      }
    }
  },
```