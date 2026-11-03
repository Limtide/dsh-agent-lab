# dsh-agent-lab · Agent 回归实验台

把一次真实会话录成**运行（run）**，再和另一次运行**并排对比**：工具选择、参数、结果、成败与用量到底变了什么。从同一个任务**重放**一次（换模型或改提示词，在隔离副本里真实重跑），把结果聚合成**任务 × 变体矩阵**，最后给任务加**断言**，用退出码把回归门禁接进 CI。

这是「给 agent 配置做 pytest」的完整第一程：v0.1 看清两次运行的差异，v0.2 有意识地跑第二次，v0.3 把多次运行摆成矩阵，v0.4 把「通过」变成可执行的断言。

## 它解决什么

- 换了模型、effort、提示词或插件版本，同一个任务的行为变了吗？
- 两次跑同一个流程，一次成功一次失败，差异出在哪一步？
- 插件作者收到「它乱改文件」的反馈，怎么把现场留下来对照？

现有工具只能看录像；这个插件把多次运行的轨迹摆在一起、标出差异、按任务聚合成矩阵，并能用断言给它们设门禁。

## 使用

侧栏打开 **回归实验台** 图标。顶部有两个页签：**对比** 与 **矩阵**。

### 对比

1. **从会话导入** —— 选择一个已有会话（含正在进行的），录制成运行。
2. **重放**（v0.2）—— 在运行下拉菜单里点重放图标：任务提示词、模型与推理强度都可以改；插件会复制基线工作区并在副本里真实重跑，完成后自动成为对照 B。
3. 或者直接再录一次（或选择库里已有的两次运行）。
4. 页面自动把 **基线 A** 与 **对照 B** 并排对齐：

- **顶部指标**：行为相似度、工具调用数、失败数、Token、耗时、步骤，各自带 A→B 增量与变好/变差着色；
- **配置指纹**：模型、effort、工具 schema 数、工具 schema 哈希、系统提示词哈希、沙箱与审批策略；
- **任务**：两次运行的用户提示词（不同会显式提醒）；
- **对齐轨迹**：可点击的逐行对比。状态分为 一致 / 参数漂移 / 结果变化 / 成败翻转 / 缺失 / 新增，插入或丢失一次调用不会让后面全部错位；
- **展开一行**：左右两侧完整参数与结果并排显示，并列出发生变化的参数键；
- **仅差异**：只看不一致的行；轨迹顶部的色条是整段行为的缩略图。

运行库与断言库分别保存在 `$DSH_HOME/agent-lab/runs/*.json` 与 `$DSH_HOME/agent-lab/checks/*.json`，可直接阅读、可版本化。

## 重放（v0.2）

点一次重放，Host 会：

1. 把基线运行的工作目录复制到 `$DSH_HOME/agent-lab/replays/<job>/workspace`；
2. 用基线记录的 agent preset（若已不存在则回退默认）在该副本里创建新会话；
3. 选择你指定的 provider / model / effort，并把会话强制为 `workspace-write` + 审批 `never`；
4. 提交任务提示词，等这一轮 `turn/end` 后把新会话录成运行，并写入 `replay` 元数据（基线、是否改过提示词、副本路径、结束原因）。

安全与代价：

- 会**真实调用模型和执行工具**，消耗 Token；默认 20 分钟上限，超时会取消并保存已产生的轨迹。
- 工具只能写副本；越界写会被沙箱拒绝并记成失败调用。副本不会自动删除。
- 复制的是**重放时刻**的目录内容，不是基线运行时的历史快照；副本是完整复制（含 `.git`、`node_modules`），大仓库会慢。
- 同一时刻只允许一个重放。任务状态只在内存里，进程重启后任务丢失，但已完成的运行已经落盘。
- 重放会话会出现在会话列表里，可以直接打开看完整对话。

## 矩阵（v0.3）

切到 **矩阵** 页签：

- **行**是任务：按归一化后的任务提示词分组，任务键形如 `task-1a2b3c4d5e6f`；
- **列**是变体：provider / model / reasoningEffort；
- **单元格**：通过率、平均工具调用数、平均 Token。点开可看这个组合的每一次运行、断言结果，并挑两次设为 A/B 回到对比页。

没有断言的单元格按「这一轮正常结束」判定通过；有断言时，必须「正常结束 + 所有断言通过」。空单元格可以直接「重放这个变体」：任务提示词与工作区来自该任务最近一次**导入**的运行（没有导入运行时退回最近一次重放），模型预填为该列变体。

## 断言与门禁（v0.4）

断言挂在**任务**上（`$DSH_HOME/agent-lab/checks/<task-key>.json`），同一任务的所有运行共用一套；矩阵通过率与 CLI 门禁使用同一份判定。

内置检查始终生效：**这一轮必须正常结束**（`turn-completed`）。在此之上可以加：

| 断言 | 参数 | 含义 |
|---|---|---|
| `no-tool` | — | 这次运行没有调用任何工具 |
| `file-contains` | `path`, `text` | 运行工作区里的相对路径文件包含该文本 |
| `final-contains` | `text` | 最终回复包含该文本 |
| `max-tool-calls` | `max` | 工具调用数不超过上限 |
| `max-total-tokens` | `max` | 输入 + 输出 Token 不超过上限 |
| `max-failures` | `max` | 失败工具调用数不超过上限 |

`file-contains` 对重放运行读**副本目录**，对导入运行读会话当前工作目录；路径必须留在工作区内。

### CI 门禁

```pwsh
# 跑某一条运行（断言来自它所属任务）
node bin/agent-lab-check.mjs --run run-xxxxxxxx

# 或者跑某个任务某个变体的最新运行
node bin/agent-lab-check.mjs --task task-1a2b3c4d5e6f --variant deepseek-account/deepseek-flash@high

# 机器可读，适合 CI 日志
node bin/agent-lab-check.mjs --run run-xxxxxxxx --json
```

退出码：`0` 通过、`1` 断言失败、`2` 用法或存储错误。默认读 `$DSH_HOME/agent-lab/{runs,checks}`，可用 `--runs-dir` / `--checks-dir` 覆盖，`--checks <file>` 直接指定一份断言 JSON。

GitHub Actions 里可以直接：

```yaml
- name: agent regression gate
  run: node plugins/dsh-agent-lab/bin/agent-lab-check.mjs --run "${{ env.RUN_ID }}"
```

## 对比口径

比较的是**行为不变量**，不是模型文本：工具名、顺序、参数、成功/失败、结果内容。

- 参数与结果都做了归一化（工作目录替换为 `<cwd>`、换行统一、行尾空白清理），所以换工作区不会造成假差异。
- 序列对齐使用 Needleman–Wunsch（同名工具才能配对，名称不同会优先判为缺失/新增），避免「多一次调用，后面全红」。
- 「行为相似度」是 60% 轨迹对齐 + 25% Token 量 + 15% 失败数差异的启发式分数，**只用来看趋势**，报告里始终保留原始 diff。

## 明确不做（v0.4）

- 不做批量重放队列：矩阵不会一次跑满所有变体；空单元格逐个发起重放。
- 不保证模型输出可复现；比较的是行为不变量，不是逐字文本。
- 不做 worktree 隔离、外部工具夹具、CI 托管。
- 不递归录制子代理/工作流树。
- 运行记录、断言与临时副本只在本机；不含任何上传。

## 技术实现

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：同源 JSON API（`/agent-lab/api/*`）、会话读取、运行库/断言库读写、重放任务、矩阵聚合 |
| `lib/capture.mjs` | 会话事件 → 运行记录（提示词、配置指纹、轨迹、用量、活动耗时） |
| `lib/compare.mjs` | 归一化、序列对齐、差异分类、指标与相似度 |
| `lib/replay.mjs` | 重放计划、轮次完成判定、进度统计 |
| `lib/matrix.mjs` | 任务键、变体键、任务 × 变体聚合 |
| `lib/checks.mjs` | 断言规范化与求值（含内置 `turn-completed`、文件读取、路径约束） |
| `bin/agent-lab-check.mjs` | CI 门禁 CLI：读运行库与断言库，输出人读/JSON 结果和退出码 |
| `client.js` | 浏览器半：对比视图、矩阵、重放与断言对话框 |
| `test/compare.test.mjs` | 对齐与采集的单元测试 |
| `test/replay.test.mjs` | 重放计划与进度判定的单元测试 |
| `test/matrix.test.mjs` | 任务/变体键与矩阵聚合的单元测试 |
| `test/checks.test.mjs` | 断言规范化与六种断言求值的单元测试 |
| `test/check-cli.test.mjs` | CLI 退出码、任务/变体选择与文件断言的单元测试 |

数据来源：

- 活跃会话：`ctx.sessions.get(id).snapshotEvents()`
- 历史会话：`ctx.sessionPersistence.open(id, 'read').read(0, N)`
- 配置指纹：`request/header`（provider / model / effort / 工具 schema）与 `system/message`
- 用量：`assistant/message.usage`
- 活动耗时：`step/start` → `step/end` 求和（会话被中断两天后恢复，不会算成「工作了两天」）

## 开发

```pwsh
cd plugins/dsh-agent-lab
npm test
node bin/agent-lab-check.mjs --help
```

安装 / 更新（在本 profile 中）：

```text
plugin_manager install_bundle <插件目录的绝对路径>
```

Host 代码改动在下次 profile 重组（Plugin Manager 里关闭再开启该条目）或应用重启后生效；浏览器半改动刷新页面即可。

## 路线图

| 版本 | 内容 |
|---|---|
| v0.1 | 录制、并排对比、配置指纹、启发式相似度 |
| v0.2 | 夹具重放：复制工作区、换模型/提示词重跑，自动生成对照运行 |
| v0.3（本版） | 变体矩阵：行是任务、列是变体，单元格是通过率 / 调用数 / Token |
| v0.4（本版） | 断言与门禁：`no-tool`、`file-contains`、阈值回归，输出退出码给 CI |
