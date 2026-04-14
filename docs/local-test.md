# Local Testing

Hướng dẫn chạy `vnstock-js` từ mã nguồn local — không cần publish lên npm — để test thay đổi trước khi release.

## 1. Dùng SDK từ dự án khác (npm link)

Khi bạn đang dev `vnstock-js` và muốn test trong app khác (vd `vnstock-js-docs`):

```bash
# Trong repo vnstock-js
cd d:/path/to/vnstock-js
npm run build
npm link

# Trong repo app consumer
cd d:/path/to/other-app
npm link vnstock-js
```

Giờ `other-app` dùng code `vnstock-js` local (symlink). Mỗi lần sửa SDK, chỉ cần `npm run build` lại — không cần `npm link` lại.

Gỡ link khi xong:

```bash
cd d:/path/to/other-app
npm unlink vnstock-js
# Nếu unlink global:
npm unlink -g vnstock-js
```

## 2. Dùng CLI global (vnstock command)

Cài CLI toàn cục trỏ về code local:

```bash
cd d:/path/to/vnstock-js
npm run build
npm link
```

Giờ lệnh `vnstock` toàn cục chạy code local:

```bash
vnstock -v           # 1.3.1
vnstock quote VCB
vnstock history VCB --range 7d
vnstock search "ngân hàng"
vnstock symbols --exchange HOSE --limit 20
```

Gỡ CLI khi xong:

```bash
npm unlink -g vnstock-js
```

## 3. Watch mode cho dev fast

Thay vì chạy `npm run build` mỗi lần sửa, mở 2 terminal:

```bash
# Terminal 1 — auto rebuild khi lưu file
npm run dev

# Terminal 2 — chạy command sau mỗi save
vnstock quote VCB
```

## 4. Mô phỏng install từ npm (npm pack)

Muốn test đúng như user sẽ install từ registry:

```bash
cd d:/path/to/vnstock-js
npm run build
npm pack
# Sinh ra vnstock-js-1.3.1.tgz

# Cài từ tarball (ở repo khác hoặc project test riêng)
cd d:/some-test-project
npm install ../vnstock-js/vnstock-js-1.3.1.tgz

# Hoặc cài global:
npm install -g ../vnstock-js/vnstock-js-1.3.1.tgz
```

Cách này bao gồm đúng các file trong `package.json` `files` array — nếu thiếu `bin/`, `dist/` hoặc asset nào, sẽ lộ ra ở đây.

## 5. Chạy test suite

```bash
npm test                    # tất cả tests
npx jest __tests__/cli/     # chỉ tests CLI
npx jest --coverage         # có report coverage
```

## 6. Test realtime thủ công (giờ giao dịch VN)

Trong giờ giao dịch (09:00-11:30, 13:00-14:45 VN):

```bash
# Capture fixture mới
npx ts-node scripts/capture-realtime.ts VCB,FPT,MBB 45

# Smoke test realtime client
npx ts-node scripts/smoke-realtime.ts VCB,FPT,MBB,VNM,ACB 60
```

Smoke exit code 0 = receive ≥ 5 quotes/symbol trong 60s.

## 7. Debug CLI command trực tiếp (không cần link)

```bash
cd d:/path/to/vnstock-js
npm run build
node bin/vnstock quote VCB
```

Nhanh nhất khi chỉ test 1 lần, không cần link global.

## Common issues

### "Cannot find module '../../dist/cli/index.js'"

Bạn chưa build. Chạy `npm run build` trước.

### `npm link` không tạo command `vnstock`

Check `package.json` có `"bin": { "vnstock": "bin/vnstock" }` không. Check file `bin/vnstock` có tồn tại và có shebang `#!/usr/bin/env node`.

Trên Windows, npm link tạo `.cmd` wrapper tự động. Nếu chưa có, thử `npm unlink -g vnstock-js && npm link` lại.

### Thay đổi code nhưng `vnstock` vẫn chạy code cũ

Bạn chưa rebuild. `npm run build` hoặc chạy `npm run dev` trong terminal khác để auto rebuild.
