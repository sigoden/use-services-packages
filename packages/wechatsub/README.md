# WechatPub

```ts
// in services.ts
import * as WechatSub from "@use-services/wechatpub";

const options = {
  wechatsub: {
    init: WechatSub.init,
    args: {
        token: "",
        appId: "",
        encodingAESKey: "",
    },
  } as WechatSub.Option<WechatSub.Service>,
}

// in handlersManage.ts
export const wxpubNotifyGet: Handler<apiInner.WxpubNotifyGetReq> = async (req, ctx) => {
  const { wechatsub } = srvs;
  if (!wechatsub.checkSignature(ctx.query)) {
    ctx.body = "";
    return;
  }
  ctx.body(ctx.query.echostr);
};

export const wxpubNotifyPost: Handler<apiInner.WxpubNotifyPostReq> = async (req, ctx) => {
  const { wechatsub, logger, sql, redis, wxpub } = srvs;
  let msg: IncomeMsg;
  if (!wechatsub.checkSignature(ctx.query)) {
    ctx.body = "";
    return;
  }
  try {
    msg = await wechatsub.parse(ctx.request.body, ctx.query);
  } catch (err) {
    ctx.body = "";
    return;
  }
  if (msg.MsgType === "event") {
    const msg_ = msg as IncomeMsgEvent;
    if (msg_.Event === "subscribe") {
        // TODO
    }
  }
  ctx.body = "success";
};

```
