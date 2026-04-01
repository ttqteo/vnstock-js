# Publish vnstock-js lên npm

## Trước khi publish

```bash
# Build
npm run build

# Chạy tests
npm test

# Kiểm tra những gì sẽ publish
npm pack --dry-run
```

## Publish

### Lần đầu (chưa login npm)

```bash
npm login
```

### Publish beta

```bash
npm publish --tag beta
```

Người dùng cài bằng:

```bash
npm install vnstock-js@beta
```

### Publish stable (khi sẵn sàng)

1. Đổi version trong `package.json` thành `1.0.0`
2. Build lại: `npm run build`
3. Publish:

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

# Commit version
git add package.json
git commit -m "chore: publish v1.0.0-beta.1"
git tag v1.0.0-beta.1
git push && git push --tags
```

## Cập nhật version sau này

```bash
# Patch (1.0.1)
npm version patch

# Minor (1.1.0)
npm version minor

# Major (2.0.0)
npm version major

# Rồi build + publish
npm run build && npm publish
```
