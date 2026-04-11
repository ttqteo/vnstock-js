# Planning Playbook

Hướng dẫn workflow cho internal planning docs của `vnstock-js` — specs, backlog, design notes.

**TL;DR:** Specs sống trên orphan branch `roadmap`, truy cập qua sibling git worktree. Master và các dev branch không bao giờ thấy `docs/superpowers/`.

---

## 1. Kiến trúc

```
/Users/ttqteo/Workspaces/dev/
├── vnstock-js/                    ← main checkout (master / dev-v*)
│   ├── src/                       ← source code
│   ├── __tests__/
│   ├── package.json
│   └── docs/                      ← KHÔNG có superpowers/
│       ├── idea.md
│       └── publish-npm.md
│
└── vnstock-js-roadmap/            ← sibling worktree, branch: roadmap
    └── docs/superpowers/
        ├── PLAYBOOK.md            ← file này
        ├── BACKLOG.md             ← roadmap candidates v1.4+
        └── specs/
            └── YYYY-MM-DD-<topic>-design.md
```

Hai thư mục **cùng tồn tại trên disk** — không phải branch switch. Git worktree cho phép check out nhiều branch vào các thư mục khác nhau cùng lúc.

## 2. Branches trên git

| Branch | Loại | Parent | Chứa gì |
|---|---|---|---|
| `master` | normal | - | Source code release |
| `dev-vX.Y.Z` | normal | master | Source code đang phát triển |
| `roadmap` | **orphan** | không có | Chỉ `docs/superpowers/`, history độc lập |

`roadmap` là orphan branch — root commit không có parent, không share history với `master`. Điều này đảm bảo không bao giờ có rủi ro merge lẫn nhau.

## 3. Setup trên máy mới

Clone repo rồi thêm worktree cho `roadmap`:

```bash
git clone https://github.com/ttqteo/vnstock-js.git
cd vnstock-js
git fetch origin roadmap
git worktree add ../vnstock-js-roadmap roadmap
```

Kiểm tra:
```bash
git worktree list
# /Users/.../vnstock-js          <sha> [dev-v1.3.0]
# /Users/.../vnstock-js-roadmap  <sha> [roadmap]
```

## 4. Workflow hàng ngày

### 4.1 Viết code
```bash
cd /Users/ttqteo/Workspaces/dev/vnstock-js
# chỉnh src/, chạy test, commit như bình thường
git add src/... && git commit -m "feat: ..."
```

### 4.2 Viết / cập nhật spec hoặc backlog
```bash
cd /Users/ttqteo/Workspaces/dev/vnstock-js-roadmap
# chỉnh docs/superpowers/...
git add docs/superpowers/... && git commit -m "docs(spec): ..."
```

Hai commit này rơi vào 2 branch khác nhau (`dev-v1.3.0` và `roadmap`), hoàn toàn độc lập.

### 4.3 Claude đọc code khi viết spec

Khi AI assistant cần đọc source code trong lúc viết spec ở worktree roadmap, dùng **absolute path** tới worktree chính:

```
Read: /Users/ttqteo/Workspaces/dev/vnstock-js/src/realtime/index.ts
Write: /Users/ttqteo/Workspaces/dev/vnstock-js-roadmap/docs/superpowers/specs/...
```

Cả hai folder đều tồn tại đồng thời trên disk, không cần switch branch.

## 5. Push / sync giữa máy

`roadmap` là branch bình thường khi nói đến remote:

```bash
# lần đầu
cd ../vnstock-js-roadmap
git push -u origin roadmap

# sau đó
git push    # push branch roadmap
git pull    # pull branch roadmap
```

Trên máy khác, setup như mục 3.

## 6. Merge dev → master

**Không cần xử lý đặc biệt.** Vì `docs/superpowers/` không tồn tại trên bất kỳ dev branch nào, merge dev → master ra diff sạch, không lẫn planning docs.

```bash
git checkout master
git merge --squash dev-v1.3.0
git commit -m "release: v1.3.0"
```

## 7. Promoting backlog → spec

Khi bắt đầu brainstorm cho version mới:

1. Vào worktree roadmap: `cd ../vnstock-js-roadmap`
2. Đọc `docs/superpowers/BACKLOG.md`, chọn candidates cho version tới
3. Chạy brainstorming skill → output spec vào `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
4. Commit lên branch `roadmap`
5. Update `BACKLOG.md`: đánh dấu candidate đó là "in progress" hoặc xoá khỏi backlog

## 8. Tạo roadmap branch từ đầu (nếu cần dựng lại)

Trường hợp bạn mất branch `roadmap` hoặc muốn clone vào repo khác cùng pattern:

```bash
# Từ main checkout
git worktree add --detach /tmp/roadmap-init HEAD
cd /tmp/roadmap-init
git checkout --orphan roadmap
git rm -rf .
mkdir -p docs/superpowers
# copy nội dung planning từ nguồn khác vào docs/superpowers/
git add docs/superpowers
git commit -m "init: roadmap branch"
cd -
git worktree remove /tmp/roadmap-init
git worktree add ../<repo>-roadmap roadmap
```

## 9. Tại sao chọn pattern này

**Đã cân nhắc các phương án:**

| Phương án | Ưu | Nhược |
|---|---|---|
| Gitignore `docs/superpowers/` trên dev, force-add | Đơn giản | File đã tracked vẫn theo lên master khi merge, dễ quên |
| Repo riêng cho planning | Cực sạch | Quản lý 2 repo, overhead cao |
| Branch riêng **không** orphan | Sync history | Rủi ro merge lẫn, lịch sử lẫn với code |
| **Orphan branch + worktree** ✓ | Sạch, single source, vẫn versioned, không rủi ro merge | Cần nhớ 2 path (đã lưu vào AI memory) |

Orphan + worktree thắng vì cho phép **cùng tồn tại trên git** nhưng **hoàn toàn tách biệt về nội dung**, và worktree giải quyết vấn đề "đọc cùng lúc cả code và spec" mà không phải switch branch.

## 10. Nguyên tắc

- **Không bao giờ** tạo file trong `docs/superpowers/` từ main checkout (`vnstock-js/`). Luôn làm từ `vnstock-js-roadmap/`.
- **Không bao giờ** merge `roadmap` vào bất kỳ branch nào khác.
- **Không bao giờ** merge bất kỳ branch nào vào `roadmap`.
- Specs là living documents — cập nhật khi requirement thay đổi, đừng để stale.
- Backlog là candidates, không phải commitments — review mỗi khi bắt đầu version mới.
