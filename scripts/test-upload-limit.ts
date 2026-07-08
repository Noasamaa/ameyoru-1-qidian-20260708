// Structure smoke-check (static grep), NOT a behavioral test.
// 仅对源码文本做正则断言,确认上传大小限制(20MB / bodySizeLimit)相关代码存在;不执行任何业务逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const qrAction = readFileSync(join(root, "src/server/actions/qr.ts"), "utf8");
const imageUpload = readFileSync(join(root, "src/lib/image-upload.ts"), "utf8");
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
const profilePage = readFileSync(
  join(root, "src/app/(authed)/profile/page.tsx"),
  "utf8"
);

assert.match(qrAction, /MAX_BYTES\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
assert.match(qrAction, /readImageUpload/);
assert.match(imageUpload, /不能超过 20MB/);
assert.match(nextConfig, /bodySizeLimit:\s*"45mb"/);
assert.match(profilePage, /最大 20MB/);

console.log("upload image limit is 20MB");
