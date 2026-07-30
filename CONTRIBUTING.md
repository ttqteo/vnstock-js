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

# Chạy unit tests (không cần mạng)
npm run test:unit
```

Yêu cầu: Node.js >= 18, npm >= 8.

## Các lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `npm run test:unit` | Unit tests, toàn bộ đều mock — không gọi mạng, chạy ~13s |
| `npm run test:integration` | Gọi API thật của VCI và các nguồn hàng hoá |
| `npm run lint` | ESLint. Phải sạch lỗi trước khi tạo PR |
| `npm run lint:fix` | Tự sửa những lỗi sửa được |
| `npm run format` | Prettier cho file bạn đang sửa |
| `npm run typecheck` | Kiểm tra kiểu, không xuất file |
| `npm run build` | Clean + biên dịch sang `dist/` |

### Unit test và integration test

Test gọi API thật được tách riêng sau biến môi trường `INTEGRATION=1`, nên mặc định
chúng bị skip. Lý do: khi VCI rate-limit, đổi response, hoặc thị trường đóng cửa,
PR của bạn không bị đỏ oan.

CI chỉ chạy unit test. Integration test chạy theo lịch hàng ngày trên repo chính,
và tự mở issue nếu API nguồn thay đổi.

Nếu bạn sửa phần gọi API, hãy chạy thêm `npm run test:integration` ở máy local và
ghi kết quả vào phần mô tả PR.

Khi viết test mới có gọi mạng, đặt trong `__tests__/integration/` và đặt sau cổng:

```typescript
const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Tên module (integration — INTEGRATION=1)", () => {
  // ...
});
```

**Quan trọng:** đừng để test gọi mạng chung file với `jest.mock("axios")`. Jest
hoist lệnh mock lên đầu file, nên nó sẽ mock luôn cả test integration — test có vẻ
chạy nhưng thật ra đang gọi mock rỗng. Đó là lý do phần integration nằm ở thư mục
riêng.

### Về code style

Codebase có từ trước khi Prettier được đưa vào, nên phần lớn file chưa đúng định
dạng chuẩn. Vì vậy `prettier/prettier` để ở mức cảnh báo, không phải lỗi.

Đừng chạy `npm run format` cho cả repo — sẽ tạo diff khổng lồ và gây xung đột cho
người khác. Chỉ format file bạn thực sự sửa.

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

### 4. Kiểm tra trước khi gửi

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
```

Cả bốn lệnh phải sạch. Đây đúng là những gì CI sẽ chạy trên PR của bạn, trên Node
18, 20 và 22.

Hook `pre-commit` sẽ tự chạy ESLint trên các file bạn staged, và `commit-msg` kiểm
tra định dạng commit message.

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

## Quy tắc ứng xử

Dự án tuân theo [Quy tắc ứng xử](CODE_OF_CONDUCT.md). Khi tham gia, bạn đồng ý
tuân thủ các quy tắc này.

## Hỗ trợ

- Báo lỗi / đề xuất: https://github.com/ttqteo/vnstock-js/issues
- Câu hỏi sử dụng: https://github.com/ttqteo/vnstock-js/discussions
- Liên hệ: [hồ sơ GitHub ttqteo](https://github.com/ttqteo)
