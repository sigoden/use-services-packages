# WechatPub

```ts
import * as WechatPub from "@use-services/wechatpub";

const options = {
  wechatpub: {
    init: WechatPub.init,
    args: {
      appId: "",
      secret: "",
    },
  } as WechatPub.Option<WechatPub.Service>,
}
```