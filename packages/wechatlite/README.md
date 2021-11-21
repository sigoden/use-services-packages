# WechatLite

```ts
import * as WechatLite from "@use-services/wechatlite";

const options = {
  wechatlite: {
    init: WechatLite.init,
    args: {
      appId: "",
      secret: "",
      token: "",
      encodingAESKey: "",
    },
  } as WechatLite.Option<WechatLite.Service>,
}
```