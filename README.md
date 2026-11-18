# Worklog · 工时记录

一个只保存在本机的工时记录小工具：工作开始时按一下，结束时再按一下，然后在月历里看这个月每天干了多久。

没有账号、没有后端，数据全部留在浏览器的 `localStorage` 里。

## 功能

- **一键打卡**：开始 / 结束一段工作；刷新、关掉页面都不会丢掉正在进行的计时。
- **今日视图**：本次计时、今日合计、本周、本月、日均，以及目标进度环；按 `空格` 快速开始 / 结束。
- **月度视图**：整月热力图，一眼看出哪天忙；点某一天查看当天记录，也可以直接补录。
- **记录管理**：手动补录、编辑、删除；结束时间早于开始时间时按次日计算；与已有记录重叠会被拒绝。
- **跨零点**：一段 22:30–01:10 的工作会按实际时间拆分到两天，月统计不会算错。
- **忘关提醒**：一段计时持续超过 16 小时会提示，可「结束于现在」或「作废」。
- **备份**：导出 JSON（含设置）或 CSV，导入 JSON 时按 id 去重合并。
- 深色 / 浅色主题，桌面与手机都有对应布局。

## 技术栈

React 19 + TypeScript + Vite，状态管理用 Zustand（`persist` 中间件落盘），样式用 SCSS Modules，日期计算用 dayjs。

## 本地开发

需要 Node.js ≥ 22 和 pnpm。

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # 类型检查 + 生产构建，产物在 dist/
pnpm preview    # 预览构建产物
pnpm lint       # oxlint
pnpm format     # prettier 格式化
```

## 工程化

- **Prettier + oxlint**：格式与静态检查。
- **husky + lint-staged**：提交前自动格式化和修复暂存的文件。
- **commitlint**：提交信息遵循 Conventional Commits，例如 `feat: add monthly heatmap`。

## 目录结构

```
src/
  components/   计时环、月历、会话列表、弹窗、Toast 等通用组件
  views/        今日 / 月度 / 记录三个页面
  store/        Zustand：工时数据（持久化）、弹窗状态、Toast
  lib/          时间格式化、跨天拆分与月统计、JSON/CSV 备份
  styles/       主题变量与全局样式
```

## 数据说明

- 只存原始区间 `{ id, start, end }`（epoch 毫秒），日统计、月统计都由区间实时推导，不存累计值。
- 存储 key 为 `worklog.store.v1`。清理浏览器数据、换浏览器或换设备前，请先在「记录」页导出 JSON。
- 日历按本地时区划分日期，跨零点的记录会在两天各占一部分。

## 尚未包含

- 多设备同步 / 账号体系（目前是纯前端本地应用）。
- 薪资、项目、标签等扩展字段。
