# Hướng dẫn đóng góp

Cảm ơn bạn quan tâm đến vnstock-js! Dưới đây là hướng dẫn để bắt đầu.

## Chuẩn bị môi trường

```bash
# Clone repo
git clone https://github.com/ttqteo/vnstock-js.git
cd vnstock-js

# Cài dependencies
npm install

# Build
npm run build

# Chạy tests
npm test
```

Yêu cầu: Node.js >= 16, npm >= 8.

## Cấu trúc dự án

```
src/
  core/           # Business logic (stock, commodity, realtime)
  indicators/     # Chỉ báo kỹ thuật (SMA, EMA, RSI)
  pipeline/       # Request pipeline (fetch, retry, transform)
  models/         # TypeScript interfaces
  shared/         # Constants, utilities
  simple.ts       # API đơn giản
  runtime.ts      # Vnstock class
  index.ts        # Exports
__tests__/        # Jest tests
```

## Quy trình đóng góp

### 1. Tạo issue trước

Trước khi code, mở [issue](https://github.com/ttqteo/vnstock-js/issues) mô tả thay đổi. Chờ phản hồi trước khi bắt tay vào.

### 2. Fork và tạo branch

```bash
git checkout -b feat/ten-tinh-nang
# hoặc
git checkout -b fix/ten-bug
```

### 3. Code

- Viết test trước, code sau (TDD)
- TypeScript strict mode
- Không thêm dependencies không cần thiết
- Giữ output chuẩn hóa: camelCase, giá chia 1000, ISO dates

### 4. Chạy tests và build

```bash
npm test
npm run build
```

Tất cả tests phải pass và build phải clean trước khi tạo PR.

### 5. Tạo Pull Request

```bash
git push origin feat/ten-tinh-nang
```

Sau đó tạo PR trên GitHub:

- Tiêu đề ngắn gọn: `feat: thêm MACD indicator` hoặc `fix: sửa lỗi parse realtime data`
- Mô tả thay đổi và lý do
- Link đến issue liên quan

## Quy ước commit

```
feat: thêm tính năng mới
fix: sửa lỗi
refactor: tái cấu trúc code
docs: cập nhật tài liệu
test: thêm/sửa tests
chore: cập nhật build, dependencies
```

## Quy ước code

- **Output format**: Array of Objects, camelCase fields, giá chia 1000, ISO dates
- **Pipeline**: Mọi API call đi qua `fetchWithRetry` → transform pipeline
- **Transform config**: Mỗi module có file config riêng trong `src/pipeline/transform/configs/`
- **Types**: Định nghĩa trong `src/models/normalized.ts`, export qua `VnstockTypes`
- **Tests**: Mỗi module có file test riêng trong `__tests__/`
- **Indicators**: Pure functions, không side effects, không phụ thuộc API

## Thêm indicator mới

```typescript
// src/indicators/macd.ts
import { QuoteHistory } from "../models/normalized";

export interface MacdResult {
  date: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function macd(
  data: QuoteHistory[],
  options: { fast?: number; slow?: number; signal?: number } = {}
): MacdResult[] {
  // Implementation...
}
```

Rồi export trong `src/indicators/index.ts` và `src/index.ts`.

## Thêm data source mới

1. Tạo fetch logic trong `src/core/`
2. Tạo transform config trong `src/pipeline/transform/configs/`
3. Tạo normalized interface trong `src/models/normalized.ts`
4. Thêm tests
5. Export qua `src/index.ts`

## Hỗ trợ

- Issues: https://github.com/ttqteo/vnstock-js/issues
- Email: ttqteo (GitHub profile)
