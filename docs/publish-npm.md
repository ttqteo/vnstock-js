# Publish vnstock-js lên npm

## Trước khi publish

```bash
# Build
npm run build

# Chạy tests
npm test --maxWorkers=2

# Kiểm tra những gì sẽ publish
npm pack --dry-run
```

## Login npm (lần đầu)

```bash
npm login
```

## Publish stable

```bash
npm publish
```

Người dùng cài bằng:

```bash
npm install vnstock-js
```

## Sau khi publish

```bash
# Kiểm tra trên npm
npm info vnstock-js

# Tag và push
git tag v1.0.0
git push && git push --tags

# Deprecate version cũ (nếu cần)
npm deprecate vnstock-js@"<1.0.0" "Vui lòng nâng cấp: npm install vnstock-js"
```

## Cập nhật version sau này

```bash
# Patch: sửa lỗi (1.0.0 -> 1.0.1)
npm version patch

# Minor: thêm tính năng (1.0.0 -> 1.1.0)
npm version minor

# Major: breaking changes (1.0.0 -> 2.0.0)
npm version major

# Rồi build + publish
npm run build && npm publish
git push && git push --tags
```

## Publish beta (nếu cần test trước)

```bash
# Đổi version: 1.1.0-beta.1
# Rồi:
npm publish --tag beta
```

Người dùng cài bằng:

```bash
npm install vnstock-js@beta
```

`npm install vnstock-js` vẫn cài stable, không bị ảnh hưởng.
