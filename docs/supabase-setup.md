# 把 Worklog 接到你自己的 Supabase

Worklog 现在默认把数据存在 Supabase（Postgres + Auth + Realtime），浏览器只保留登录凭证和主题偏好。下面是从零开始的完整步骤，大约 5 分钟。

> 你注册的「Supabase 账号」和「Supabase 项目」是两回事。如果还没有项目，先做第 1 步。

---

## 1. 创建项目

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 点 **New project**，选一个组织。
3. 填写：
   - **Name**：`worklog`
   - **Database Password**：自己生成一个强密码并保存好（本项目用不到直连数据库，但重装/迁移时会要）。
   - **Region**：选离你最近的，例如 `Southeast Asia (Singapore)`。
4. 创建后等 1–2 分钟，项目状态变成 **Active**。

### 地区怎么选

这个项目的请求路径是：

```
浏览器 ──加载 HTML/JS──> Vercel
   └──── REST / Auth / Realtime WebSocket ────> Supabase（浏览器直连）
```

Worklog 是纯静态 SPA，Vercel 只负责托管文件，**不会转发 Supabase 请求**。所以：

- 按**使用者 / 浏览器所在地区**选，不是按 Vercel 的 region 选；
- 在中国大陆使用时，首选 **Asia-Pacific → Singapore**（或 Tokyo，看哪个延迟低）；
- Supabase 项目创建后**不能改地区**，想换只能新建项目再迁移；
- 如果账号确实只能选 Americas，选 **East US (North Virginia)** 也能用，只是多几百毫秒延迟，日常打卡不受影响。

### 创建时的三个选项

| 选项                                             | 建议    | 原因                                                         |
| ------------------------------------------------ | ------- | ------------------------------------------------------------ |
| **Enable Data API**                              | ✅ 勾选 | 前端通过 PostgREST 读写 `worklog_sessions`，关掉就不能同步   |
| **Grant API access to new tables automatically** | ⬜ 不勾 | 迁移 SQL 已经显式 `grant` 给 `authenticated`，不需要默认放开 |
| **Enable RLS on new tables automatically**       | ✅ 勾选 | 纵深防御；迁移 SQL 也会显式开启 RLS，不冲突                  |

> 数据库密码只在 Dashboard / CLI 直连时使用，SQL Editor 不需要它，这个项目也不需要把它填进任何前端文件。

## 2. 建表、RLS、实时同步（一条 SQL）

1. 左侧菜单打开 **SQL Editor**。
2. 点 **New query**。
3. 把本仓库里的 [`supabase/migrations/0001_worklog_cloud.sql`](../supabase/migrations/0001_worklog_cloud.sql) 整段复制进去。
4. 点 **Run**（或 `Ctrl/Cmd + Enter`）。

执行成功后会得到：

| 对象                      | 作用                                                      |
| ------------------------- | --------------------------------------------------------- |
| `public.worklog_sessions` | 每条工时记录一行；`end_ms IS NULL` 表示正在计时           |
| `public.worklog_profiles` | 每个用户的每日目标设置                                    |
| RLS 策略                  | 用户只能读写 `auth.uid() = user_id` 的行                  |
| 部分唯一索引              | 每个用户同时最多只有一段进行中的计时                      |
| 触发器                    | 新用户注册时自动创建 profile；更新时自动维护 `updated_at` |
| Realtime publication      | 多设备、多标签页实时同步                                  |

这个脚本是幂等的，重复执行不会报错。

## 3. 打开邮箱登录

1. 左侧 **Authentication** → **Sign In / Providers**（旧版叫 **Providers**）。
2. 确认 **Email** 是启用的。
3. **本地开发建议**：关闭 **Confirm email**（邮箱验证）。
   - 关闭后，注册完立即登录，最省事。
   - 保持开启也可以：注册后去邮箱点验证链接，会跳回 `Site URL`，客户端会自动完成登录。

## 4. 配置 Site URL（邮箱验证 / 后续找回密码需要）

**Authentication** → **URL Configuration**：

- **Site URL**：`http://localhost:5173`
- **Redirect URLs** 里加上：`http://localhost:5173/**`

以后部署到正式域名时，把这两个值改成线上地址。

## 5. 拿 API 凭证

新版 Dashboard 的入口：

- **Project URL**：左侧 **Integrations → Data API**（或点顶部绿色的 **Connect** 按钮）；形如 `https://abcdefghijklmnop.supabase.co`
- **publishable / anon key**：左侧 **Settings → API Keys** → **Publishable key** → 点复制；形如 `sb_publishable_...`（旧项目也可能是 `eyJ...` 的 anon key）

这两个值都是给浏览器用的，填进前端没问题，真正的权限由 RLS 控制。
**绝对不要**把 **Secret key** / `service_role` key 放进前端或发给我 —— 它会绕过 RLS。

在项目根目录创建 `.env.local`（可以从 `.env.example` 复制）：

```bash
cp .env.example .env.local
```

填入：

```dotenv
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的-publishable-或-anon-key
```

也可以把变量名写成 `VITE_SUPABASE_PUBLISHABLE_KEY`，代码两个名字都认。
改完 `.env.local` 需要重启 `pnpm dev`。

## 6. 检查清单

在继续之前快速确认：

- [ ] SQL Editor 里执行脚本没有报错
- [ ] Table Editor 里能看到 `worklog_sessions` 和 `worklog_profiles`
- [ ] Database → Replication 里能看到这两张表
- [ ] Authentication → Sign In / Providers → Email 已启用
- [ ] `.env.local` 里两个变量都有值（没有引号、没有多余空格）
- [ ] 改完 `.env.local` 后重启了 `pnpm dev`

## 7. 运行

```bash
pnpm install
pnpm dev
```

打开 http://localhost:5173：

1. 第一次会看到登录页，点「创建账号」。
2. 注册 / 登录后，页面会从云端拉取记录。
3. 开始打卡。换一台设备、用同一个邮箱登录，就能看到同一份数据；两个标签页同时打开也会实时同步。

## 8. 旧数据迁移（可选）

旧版本把记录存在浏览器 `localStorage`（key：`worklog.store.v1`）。新版本不再把它当作数据源，但提供了两条迁移路径：

**方式 A：一键导入（推荐）**

登录后进入「记录」页 → 数据与备份，如果检测到旧数据，会出现 **「导入本机旧数据（N）」** 按钮。点它确认即可，按 `id` 去重，本机旧数据不会被删除。

**方式 B：JSON 导入**

1. 在**旧版本**的「记录」页点 **导出 JSON**。
2. 在新版本登录后，进入「记录」页点 **导入 JSON**。
3. 导入会按 `id` 去重，重复记录自动跳过。

两种方式都不会修改数据库结构。

## 9. 部署到 Vercel（可选）

1. 在 Vercel 项目 → **Settings → Environment Variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`（旧项目也可以叫 `VITE_SUPABASE_ANON_KEY`，代码两个名字都认）
     两个环境都加上（Production / Preview），然后重新部署。Vite 会在构建时把这些值写进静态文件；`VITE_` 变量本来就是公开的。
2. 去 Supabase → **Authentication → URL Configuration**：
   - **Site URL** 改成你的线上地址，例如 `https://worklog.talyra42.top`；
   - **Redirect URLs** 加上 `https://worklog.talyra42.top/**`；
   - 本地开发地址 `http://localhost:5173/**` 也可以保留。
3. **不需要**在 Vercel 配 rewrite 或 serverless 代理。Supabase 请求由浏览器直连，代理反而会让 Realtime WebSocket 变复杂；也不要把 `service_role` / secret key 放到 `VITE_` 变量里。
4. 预览部署（preview）如果也要登录，把对应的 `https://*.vercel.app` 域名加进 Redirect URLs，或者固定用生产域名 `https://worklog.talyra42.top` 测试。

---

## 数据与安全

- **云端是唯一数据源**：登录后从 `worklog_sessions` 拉取；浏览器不再持久化工时记录。
- **RLS**：没有登录、或者用别人的 token，都读不到任何行。
- **登录凭证**：Supabase JS 会把 session token 放在浏览器 `localStorage`（key 以 `sb-` 开头），这是登录态，不是工时数据。
- **主题偏好**：本地 `worklog.themeMode`，默认跟随系统，可切换浅色 / 深色；不上传云端。
- **删除账号**：在 Supabase Dashboard → Authentication → Users 删除用户，数据库里的记录会通过 `on delete cascade` 一起删除。
- **并发修改**：两台设备同时修改同一条记录时，以最后一次写入为准（last-write-wins）；随后的 Realtime 推送会统一两边的画面。

## 常见问题

**页面一直停在「需要配置 Supabase」**

`.env.local` 没创建、变量名拼错，或者改完没有重启 dev server。

**注册后没有直接登录**

项目开启了 **Confirm email**。去邮箱点验证链接；或者在 Authentication → Sign In / Providers → Email 里关掉该选项后重新注册（已注册的邮箱需要先删掉旧用户，或者直接用验证链接）。

**登录报 `Invalid login credentials`**

邮箱或密码不对；如果刚开启邮箱验证，也可能还没验证。可以在 Authentication → Users 里确认用户状态。

**多设备不同步**

1. 确认两个设备登录的是**同一个邮箱**。
2. 确认 SQL 脚本里的 Realtime 部分执行成功：Database → Replication 里能看到 `worklog_sessions` / `worklog_profiles`。
3. 页面重新聚焦时会自动拉一次，实时通道断线也会自动重连。

**想完全重置数据**

在 SQL Editor 执行：

```sql
delete from public.worklog_sessions;
```

只会删除当前项目所有用户的工时记录（本地开发够用）；生产环境请按用户删。

**免费项目一段时间不用会暂停**

Supabase 免费计划长期无请求会 pause，去 Dashboard 点 **Restore project** 即可。
