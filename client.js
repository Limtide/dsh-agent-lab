window.__ModuleLoader__.load({
  id: 'dsh-agent-lab',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const NS = 'agent-lab'
    const API = '/agent-lab/api/'

    const ZH = {
      panel: '回归实验台',
      title: 'Agent 回归实验台',
      subtitle: '把两次运行放在一起，看工具选择、参数、结果和用量到底变了什么。',
      refresh: '刷新',
      import: '从会话导入',
      close: '关闭',
      cancel: '取消',
      retry: '重试',
      delete: '删除',
      confirmDelete: '确认删除',
      emptyTitle: '还没有运行记录',
      emptyBody: '把一次真实会话录成运行，就能拿它当基线，再用另一次运行对照。',
      emptyStep1: '点击「从会话导入」选择一次会话',
      emptyStep2: '录制它的工具轨迹、配置指纹与用量',
      emptyStep3: '再录第二次，页面会并排标出差异',
      needTwo: '再录一次运行，才能和当前这次对照。',
      onlyOne: '只有一次运行',
      pickA: '基线 A',
      pickB: '对照 B',
      pickRun: '选择一次运行',
      swap: '交换 A / B',
      runs: '次运行',
      calls: '次调用',
      loading: '正在读取运行记录…',
      loadingCompare: '正在对齐轨迹…',
      error: '读取失败',
      score: '行为相似度',
      scoreHint: '启发式指标，请以原始轨迹为准',
      identical: '两次运行的轨迹完全一致',
      drift: '轨迹存在差异',
      task: '任务',
      taskSame: '任务相同',
      taskDiff: '两次运行的任务不同，对比仅供参考',
      taskEmpty: '（没有记录到任务提示）',
      config: '配置指纹',
      changed: '有变化',
      configSame: '一致',
      filterAll: '全部',
      filterDiff: '仅差异',
      columnA: '基线 A',
      columnB: '对照 B',
      columnStatus: '对齐',
      legend: '图例',
      same: '一致',
      args: '参数漂移',
      result: '结果变化',
      flip: '成败翻转',
      onlyA: '缺失',
      onlyB: '新增',
      missingRow: '本次运行没有这个调用',
      extraRow: '基线里没有这个调用',
      noResult: '（无结果）',
      errorLabel: '失败',
      okLabel: '成功',
      argsLabel: '参数',
      resultLabel: '结果',
      changedFields: '差异字段',
      detailHint: '点击一行展开参数与结果的并排细节',
      footnote: '运行记录只保存在本机；对比只读会话日志，重放会复制工作区并在副本里真实执行。',
      metricToolCalls: '工具调用',
      metricFailures: '失败调用',
      metricTokens: 'Token 总量',
      metricDuration: '耗时',
      metricSteps: '步骤',
      metricInput: '输入',
      metricOutput: '输出',
      tokensUnit: 'tokens',
      importTitle: '从会话导入一次运行',
      importSubtitle: '选择一次已有会话，把它的轨迹与用量录成可对比的运行。',
      importSearch: '搜索工作区或会话 ID',
      importEmpty: '没有找到会话',
      importNoMatch: '没有匹配的会话',
      capturing: '正在录制…',
      capture: '录制',
      live: '进行中',
      events: '事件',
      noRunsYet: '运行库为空',
      workspaceUnknown: '未知工作区',
      stepPrefix: '第',
      turnPrefix: '轮',
      storeDir: '运行库',
      trendBetter: '更好',
      trendWorse: '更差',
      trendSame: '持平',
      compareSelf: '基线 A 与对照 B 是同一次运行。',
      verdictLead: '对照 B 相对基线 A：',
      metricsFlat: '用量指标基本持平，差异只在轨迹细节里。',
      diffCount: '处差异',
      matchedCount: '处一致',
      orderNote: '顺序按工具序列对齐，插入/缺失不会让后续全部错位。',
      replay: '重放',
      replayTag: '重放',
      replayTitle: '重放这次运行',
      replaySubtitle: '在同一任务上换模型或提示词再跑一次，结束后自动生成对照运行。',
      replayTask: '任务提示词',
      replayModel: '模型',
      replayEffort: '推理强度',
      replayEffortDefault: '模型默认',
      replayWorkspace: '工作区',
      replayCopyNote: '会把基线工作目录复制到临时目录，工具只能改动副本；越界操作自动拒绝，不会等待人工审批。',
      replayCostNote: '重放会真实调用模型并消耗 Token。',
      replayStart: '开始重放',
      replayPhasePreparing: '正在复制工作区…',
      replayPhaseStarting: '正在创建会话…',
      replayPhaseRunning: '模型正在执行任务…',
      replayPhaseFinishing: '正在收尾并保存运行…',
      replayCancel: '取消重放',
      replayCancelling: '正在取消…',
      replayCancelled: '已取消；已产生的轨迹已保存为运行。',
      replayTimeout: '超过 20 分钟，已取消并把已产生的轨迹保存为运行。',
      replayFailed: '重放失败',
      replayDone: '重放完成，已选中基线 A 与新的对照 B。',
      replayTools: '工具调用',
      replaySteps: '步骤',
      replayElapsed: '耗时',
      replayOpen: '打开这次重放',
      replayRetry: '再试一次',
      replayNoCatalog: '读不到模型目录，将沿用基线模型。',
      replayPromptEmpty: '任务提示词不能为空。',
      tabCompare: '对比',
      tabMatrix: '矩阵',
      matrixHint: '行是任务，列是变体；单元格是该组合的通过率、平均调用数与 Token。没有断言的单元格按「这一轮正常结束」判定。',
      matrixRows: '个任务',
      matrixTaskColumn: '任务',
      matrixEmpty: '还没有可聚合的运行',
      matrixEmptyBody: '先从会话导入一次运行，或对某个任务重放一个变体。',
      matrixPass: '通过',
      matrixRunVariant: '重放这个变体',
      matrixCellHint: '点击查看这个单元格的运行与断言结果',
      matrixEditChecks: '断言',
      matrixCheckCount: '项断言',
      matrixNoChecks: '无断言',
      matrixChecksBroken: '断言文件损坏',
      cellTitle: '变体运行',
      cellPickA: '设为 A',
      cellPickB: '设为 B',
      cellCompare: '对比 A / B',
      cellReplay: '重放这个变体',
      cellResults: '断言结果',
      cellFail: '未通过',
      checksTitle: '任务断言',
      checksSubtitle: '同一任务的所有运行共用这套断言；矩阵通过率与 CI 门禁都用它判定。',
      checksBuiltIn: '这一轮正常结束',
      checksBuiltInHint: '内置检查，始终生效',
      checksEmpty: '还没有断言。当前只检查这一轮是否正常结束。',
      checksAdd: '添加断言',
      checksType: '断言类型',
      checksSave: '保存',
      checksSaved: '断言已保存。',
      checksInvalid: '请补全断言参数。',
      checksRemove: '移除',
      checkNoTool: '不使用工具',
      checkFileContains: '文件包含文本',
      checkFinalContains: '最终回复包含',
      checkMaxToolCalls: '工具调用上限',
      checkMaxTokens: 'Token 上限',
      checkMaxFailures: '失败调用上限',
      checkPath: '相对工作区的路径',
      checkText: '要包含的文本',
      checkMax: '上限',
      checkNoToolHint: '要求这次运行没有调用任何工具。',
      replayDoneMatrix: '重放完成，矩阵已刷新。',
      checkToolCalled: '调用工具',
      checkToolNotCalled: '不调用工具',
      checkToolArgsContains: '工具参数包含',
      checkSandboxMode: '沙箱模式',
      checkApprovalPolicy: '审批策略',
      checkFileExists: '文件存在',
      checkFileNotExists: '文件不存在',
      checkFinalRegex: '最终回复匹配正则',
      checkName: '工具名',
      checkKey: '参数键（可选）',
      checkPattern: '正则',
      checkFlags: 'flags（可选 ims）',
      checkMode: '模式',
      checkPolicy: '策略',
      checksPreview: '用运行预览',
      checksPreviewAction: '运行预览',
      checksPreviewPass: '通过',
      checksPreviewFail: '未通过',
    }

    const EN = {
      panel: 'Regression Lab',
      title: 'Agent Regression Lab',
      subtitle: 'Put two runs side by side and see what changed in tool choice, arguments, outcomes, and usage.',
      refresh: 'Refresh',
      import: 'Import from session',
      close: 'Close',
      cancel: 'Cancel',
      retry: 'Retry',
      delete: 'Delete',
      confirmDelete: 'Confirm delete',
      emptyTitle: 'No runs recorded yet',
      emptyBody: 'Record a real session as a run, use it as the baseline, then compare another run against it.',
      emptyStep1: 'Choose “Import from session” and pick a session',
      emptyStep2: 'Record its tool trace, config fingerprint, and usage',
      emptyStep3: 'Record a second run and the page aligns both',
      needTwo: 'Record one more run to compare against this one.',
      onlyOne: 'Only one run',
      pickA: 'Baseline A',
      pickB: 'Candidate B',
      pickRun: 'Pick a run',
      swap: 'Swap A / B',
      runs: 'runs',
      calls: 'calls',
      loading: 'Reading runs…',
      loadingCompare: 'Aligning traces…',
      error: 'Could not read runs',
      score: 'Behavior similarity',
      scoreHint: 'A heuristic; read the raw trace',
      identical: 'Both runs follow the same trace',
      drift: 'The traces differ',
      task: 'Task',
      taskSame: 'Same task',
      taskDiff: 'The two runs answered different prompts; compare with care',
      taskEmpty: '(no task prompt recorded)',
      config: 'Config fingerprint',
      changed: 'changed',
      configSame: 'same',
      filterAll: 'All',
      filterDiff: 'Differences only',
      columnA: 'Baseline A',
      columnB: 'Candidate B',
      columnStatus: 'Aligned',
      legend: 'Legend',
      same: 'Same',
      args: 'Arg drift',
      result: 'Result drift',
      flip: 'Outcome flip',
      onlyA: 'Missing',
      onlyB: 'Extra',
      missingRow: 'This run never made this call',
      extraRow: 'The baseline never made this call',
      noResult: '(no result)',
      errorLabel: 'failed',
      okLabel: 'ok',
      argsLabel: 'Arguments',
      resultLabel: 'Result',
      changedFields: 'Changed fields',
      detailHint: 'Select a row to expand arguments and results side by side',
      footnote: 'Runs stay on this machine. Comparing only reads session logs; replay copies the workspace and really executes tools inside the copy.',
      metricToolCalls: 'Tool calls',
      metricFailures: 'Failed calls',
      metricTokens: 'Tokens',
      metricDuration: 'Duration',
      metricSteps: 'Steps',
      metricInput: 'input',
      metricOutput: 'output',
      tokensUnit: 'tokens',
      importTitle: 'Import a run from a session',
      importSubtitle: 'Pick an existing session and record its trace and usage as a comparable run.',
      importSearch: 'Search workspace or session id',
      importEmpty: 'No sessions found',
      importNoMatch: 'No matching sessions',
      capturing: 'Recording…',
      capture: 'Record',
      live: 'live',
      events: 'events',
      noRunsYet: 'The library is empty',
      workspaceUnknown: 'Unknown workspace',
      stepPrefix: 'step ',
      turnPrefix: 'turn ',
      storeDir: 'Library',
      trendBetter: 'better',
      trendWorse: 'worse',
      trendSame: 'same',
      compareSelf: 'Baseline A and candidate B are the same run.',
      verdictLead: 'Candidate B vs baseline A: ',
      metricsFlat: 'Usage is level; the difference is only in trace details.',
      diffCount: 'differences',
      matchedCount: 'matches',
      orderNote: 'Calls are aligned by sequence, so one inserted or dropped call does not shift everything after it.',
      replay: 'Replay',
      replayTag: 'replay',
      replayTitle: 'Replay this run',
      replaySubtitle: 'Run the same task again with another model or prompt, then compare the two runs.',
      replayTask: 'Task prompt',
      replayModel: 'Model',
      replayEffort: 'Reasoning effort',
      replayEffortDefault: 'Model default',
      replayWorkspace: 'Workspace',
      replayCopyNote: 'The baseline workspace is copied to a temporary directory, tools can only change that copy, and out-of-bounds actions are denied instead of waiting for approval.',
      replayCostNote: 'A replay makes real model calls and consumes tokens.',
      replayStart: 'Start replay',
      replayPhasePreparing: 'Copying the workspace…',
      replayPhaseStarting: 'Creating the session…',
      replayPhaseRunning: 'The model is working on the task…',
      replayPhaseFinishing: 'Saving the new run…',
      replayCancel: 'Cancel replay',
      replayCancelling: 'Cancelling…',
      replayCancelled: 'Cancelled. The partial trace was saved as a run.',
      replayTimeout: 'The replay exceeded 20 minutes; it was cancelled and its partial trace saved.',
      replayFailed: 'Replay failed',
      replayDone: 'Replay finished: baseline A and the new candidate B are selected.',
      replayTools: 'Tool calls',
      replaySteps: 'Steps',
      replayElapsed: 'Elapsed',
      replayOpen: 'Open this replay',
      replayRetry: 'Try again',
      replayNoCatalog: 'The model catalog is unavailable; the baseline model will be used.',
      replayPromptEmpty: 'The task prompt cannot be empty.',
      tabCompare: 'Compare',
      tabMatrix: 'Matrix',
      matrixHint: 'Rows are tasks, columns are variants; a cell shows pass rate, average tool calls, and tokens. Without checks, a run passes when its turn completes normally.',
      matrixRows: 'tasks',
      matrixTaskColumn: 'Task',
      matrixEmpty: 'No runs to aggregate yet',
      matrixEmptyBody: 'Import a run from a session, or replay a variant of a task.',
      matrixPass: 'passed',
      matrixRunVariant: 'Run this variant',
      matrixCellHint: 'Show the runs and check results in this cell',
      matrixEditChecks: 'Checks',
      matrixCheckCount: 'checks',
      matrixNoChecks: 'no checks',
      matrixChecksBroken: 'checks file is broken',
      cellTitle: 'Variant runs',
      cellPickA: 'Set A',
      cellPickB: 'Set B',
      cellCompare: 'Compare A / B',
      cellReplay: 'Run this variant',
      cellResults: 'Check results',
      cellFail: 'failed',
      checksTitle: 'Task checks',
      checksSubtitle: 'Every run of this task shares these checks; the matrix pass rate and the CI gate both use them.',
      checksBuiltIn: 'Turn completes normally',
      checksBuiltInHint: 'Built-in check, always applied',
      checksEmpty: 'No checks yet. Only normal turn completion is required.',
      checksAdd: 'Add check',
      checksType: 'Check type',
      checksSave: 'Save',
      checksSaved: 'Checks saved.',
      checksInvalid: 'Fill in every check parameter.',
      checksRemove: 'Remove',
      checkNoTool: 'No tools',
      checkFileContains: 'File contains text',
      checkFinalContains: 'Final reply contains',
      checkMaxToolCalls: 'Max tool calls',
      checkMaxTokens: 'Max tokens',
      checkMaxFailures: 'Max failed calls',
      checkPath: 'Path inside the workspace',
      checkText: 'Text to find',
      checkMax: 'Maximum',
      checkNoToolHint: 'Require that this run called no tool at all.',
      replayDoneMatrix: 'Replay finished; the matrix is refreshed.',
      checkToolCalled: 'Tool called',
      checkToolNotCalled: 'Tool not called',
      checkToolArgsContains: 'Tool arguments contain',
      checkSandboxMode: 'Sandbox mode',
      checkApprovalPolicy: 'Approval policy',
      checkFileExists: 'File exists',
      checkFileNotExists: 'File does not exist',
      checkFinalRegex: 'Final reply matches regex',
      checkName: 'Tool name',
      checkKey: 'Argument key (optional)',
      checkPattern: 'Pattern',
      checkFlags: 'Flags (optional: ims)',
      checkMode: 'Mode',
      checkPolicy: 'Policy',
      checksPreview: 'Preview with a run',
      checksPreviewAction: 'Run preview',
      checksPreviewPass: 'passed',
      checksPreviewFail: 'failed',
    }

    const STATUSES = ['same', 'args', 'result', 'flip', 'onlyA', 'onlyB']

    const CSS = `
.dal-root{width:100%;height:100%;min-height:0;display:flex;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55}
.dal-scroll{flex:1;min-width:0;min-height:0;overflow:auto;scrollbar-gutter:stable}
.dal-inner{max-width:1220px;margin:0 auto;padding:26px clamp(20px,3.4vw,40px) 56px;display:flex;flex-direction:column;gap:16px}
.dal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dal-head-main{display:flex;gap:12px;align-items:flex-start;min-width:0}
.dal-brand{width:38px;height:38px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);color:var(--dsw-alias-brand-primary)}
.dal-head h1{margin:0;font-size:20px;line-height:28px;font-weight:600;letter-spacing:-0.01em}
.dal-sub{margin:2px 0 0;font-size:12.5px;color:var(--dsw-alias-label-secondary);max-width:64ch}
.dal-actions{display:flex;gap:8px;align-items:center;flex:none}
.dal-btn{height:32px;padding:0 13px;border-radius:16px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:background .15s,border-color .15s}
.dal-btn:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);border-color:var(--dsw-alias-border-l2)}
.dal-btn:disabled{opacity:.5;cursor:default}
.dal-btn.primary{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dal-btn.primary:hover{background:var(--dsw-alias-button-primary-hover);border-color:var(--dsw-alias-button-primary-hover)}
.dal-btn.ghost{border-color:transparent}
.dal-btn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}
.dal-btn.sm{height:26px;padding:0 10px;font-size:12px;border-radius:13px}
.dal-icon-btn{width:26px;height:26px;border-radius:8px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}
.dal-icon-btn:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary)}

.dal-pickers{display:grid;grid-template-columns:minmax(0,1fr) 40px minmax(0,1fr);gap:10px;align-items:stretch}
.dal-picker-wrap{position:relative;min-width:0}
.dal-picker{width:100%;text-align:left;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:4px;min-height:74px;transition:border-color .15s}
.dal-picker:hover{border-color:var(--dsw-alias-border-l2)}
.dal-picker.open{border-color:var(--dsw-alias-brand-primary)}
.dal-picker-role{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dal-swatch{width:8px;height:8px;border-radius:3px;display:inline-block}
.dal-swatch.a{background:var(--dsw-alias-state-idle-primary)}
.dal-swatch.b{background:var(--dsw-alias-brand-primary)}
.dal-picker-title{font-size:13.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dal-picker-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;flex-wrap:wrap}
.dal-picker-empty{color:var(--dsw-alias-label-secondary);font-size:13px;padding:6px 0}
.dal-swap{align-self:center;justify-self:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
.dal-swap:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}

.dal-menu{position:absolute;z-index:40;top:calc(100% + 6px);left:0;right:0;max-height:340px;overflow:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;box-shadow:0 18px 44px rgba(0,0,0,.22);padding:6px}
.dal-menu-empty{padding:14px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12.5px}
.dal-menu-row{display:flex;gap:8px;align-items:flex-start;padding:8px 9px;border-radius:8px;cursor:pointer;position:relative}
.dal-menu-row:hover{background:var(--dsw-alias-bg-layer-2)}
.dal-menu-row.selected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)}
.dal-menu-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dal-menu-row-title{font-size:12.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dal-menu-row-sub{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dal-menu-row-actions{display:flex;gap:4px;align-items:center;flex:none}

.dal-banner{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;font-size:12.5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.dal-banner.warn{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent)}
.dal-banner.error{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);color:var(--dsw-alias-label-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}

.dal-overview{display:grid;grid-template-columns:minmax(210px,1.05fr) repeat(5,minmax(0,1fr));gap:10px}
.dal-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:11px 13px;min-width:0;display:flex;flex-direction:column;gap:5px}
.dal-card-label{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dal-score{font-size:32px;line-height:1;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.dal-score small{font-size:12px;font-weight:400;color:var(--dsw-alias-label-secondary);margin-left:4px}
.dal-bar{height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:6px}
.dal-bar i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .3s}
.dal-card-values{display:flex;align-items:baseline;gap:5px;font-variant-numeric:tabular-nums;font-size:14px;font-weight:600;min-width:0}
.dal-card-values .a{color:var(--dsw-alias-label-secondary);font-weight:500}
.dal-card-values .arrow{color:var(--dsw-alias-label-secondary);font-weight:400;font-size:11px}
.dal-card-values .b{white-space:nowrap}
.dal-delta{align-self:flex-start;font-size:10.5px;padding:0 7px;border-radius:999px;border:1px solid transparent;white-space:nowrap;font-variant-numeric:tabular-nums}
.dal-delta.better{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)}
.dal-delta.worse{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}
.dal-delta.flat{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l1)}
.dal-delta.neutral{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l1)}
.dal-score-counts{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.6;margin-top:2px}

.dal-chip-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dal-chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);white-space:nowrap;max-width:100%}
.dal-chip b{font-weight:600;color:var(--dsw-alias-label-primary)}
.dal-chip.changed{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 50%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);color:var(--dsw-alias-label-primary)}
.dal-chip .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}

.dal-verdict{font-size:12.5px;line-height:1.6;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent);border-radius:10px;padding:9px 12px}
.dal-task{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dal-task-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.dal-task-head h3{margin:0;font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dal-task-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.dal-task-col{padding:10px 12px;min-width:0;font-size:12.5px;white-space:pre-wrap;word-break:break-word;max-height:160px;overflow:auto}
.dal-task-col + .dal-task-col{border-left:1px solid var(--dsw-alias-border-l1)}
.dal-task-col.single{grid-column:1/-1}

.dal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dal-filters{display:flex;gap:6px;align-items:center}
.dal-filter{height:28px;padding:0 11px;border-radius:14px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.dal-filter:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent)}
.dal-filter.on{background:color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);color:var(--dsw-alias-label-primary)}
.dal-legend{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dal-legend span{display:inline-flex;align-items:center;gap:4px}
.dal-dot{width:8px;height:8px;border-radius:3px;display:inline-block;flex:none}

.dal-trace{border:1px solid var(--dsw-alias-border-l1);border-radius:13px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dal-strip{display:flex;gap:2px;padding:9px 12px 8px;background:var(--dsw-alias-bg-layer-2);flex-wrap:nowrap;overflow:hidden}
.dal-strip i{display:block;height:7px;border-radius:2px;flex:1 1 0;min-width:2px;max-width:14px;opacity:.9}
.dal-trace-head{display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);background:var(--dsw-alias-bg-layer-2);border-bottom:1px solid var(--dsw-alias-border-l1);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dal-trace-head>div{padding:6px 12px}
.dal-trace-head>div:nth-child(2){text-align:center;border-left:1px solid var(--dsw-alias-border-l1);border-right:1px solid var(--dsw-alias-border-l1)}
.dal-trace-head + .dal-row{border-top:0}
.dal-row{display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);border-top:1px solid var(--dsw-alias-border-l1);cursor:pointer;outline:none}
.dal-row:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 3.5%, transparent)}
.dal-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.dal-row.st-args{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 5%, transparent)}
.dal-row.st-flip{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 5%, transparent)}
.dal-row.st-onlyA,.dal-row.st-onlyB{background:color-mix(in srgb, var(--dsw-alias-label-secondary) 5%, transparent)}
.dal-row.st-result{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, transparent)}
.dal-cell{padding:8px 12px;min-width:0}
.dal-cell.b{border-left:1px solid var(--dsw-alias-border-l1)}
.dal-call{display:flex;align-items:baseline;gap:7px;min-width:0}
.dal-name{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:600;white-space:nowrap}
.dal-arg{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.dal-tag{font-size:10px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none}
.dal-tag.err{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}
.dal-absent{color:var(--dsw-alias-label-secondary);font-size:12px;opacity:.75}
.dal-mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 4px;border-left:1px solid var(--dsw-alias-border-l1);border-right:1px solid var(--dsw-alias-border-l1)}
.dal-mid small{font-size:9.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dal-pill{font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid;white-space:nowrap;line-height:1.5}
.st-same .dal-pill,.dal-pill.st-same{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)}
.st-args .dal-pill,.dal-pill.st-args{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 50%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)}
.st-result .dal-pill,.dal-pill.st-result{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)}
.st-flip .dal-pill,.dal-pill.st-flip{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}
.st-onlyA .dal-pill,.dal-pill.st-onlyA{color:var(--dsw-alias-state-idle-primary);border-color:var(--dsw-alias-border-l2);background:transparent}
.st-onlyB .dal-pill,.dal-pill.st-onlyB{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2);background:transparent}
.dal-strip i.st-same{background:var(--dsw-alias-state-success-primary)}
.dal-strip i.st-args{background:var(--dsw-alias-state-warn-primary)}
.dal-strip i.st-result{background:var(--dsw-alias-brand-primary)}
.dal-strip i.st-flip{background:var(--dsw-alias-state-error-primary)}
.dal-strip i.st-onlyA,.dal-strip i.st-onlyB{background:var(--dsw-alias-state-idle-primary);opacity:.45}

.dal-detail{grid-column:1/-1;border-top:1px dashed var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);padding:11px 12px 14px;display:flex;flex-direction:column;gap:10px;cursor:default}
.dal-changed{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dal-changed code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;padding:1px 6px;border-radius:5px;background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);color:var(--dsw-alias-label-primary)}
.dal-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dal-pane{min-width:0;display:flex;flex-direction:column;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base);padding:8px 9px}
.dal-pane-head{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);letter-spacing:.03em}
.dal-pane-head b{color:var(--dsw-alias-label-primary);font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.dal-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.dal-field>span{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
pre.dal-pre{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:7px 8px;max-height:200px;overflow:auto}
pre.dal-pre.empty{color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:11.5px}

.dal-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:34px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;background:var(--dsw-alias-bg-layer-1)}
.dal-empty-mark{width:52px;height:52px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}
.dal-empty h2{margin:0;font-size:16px;font-weight:600}
.dal-empty p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;max-width:52ch}
.dal-steps{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px}
.dal-steps span{font-size:11.5px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 10px;background:var(--dsw-alias-bg-base)}
.dal-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dal-note .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dal-loading{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12.5px;padding:30px 4px}
.dal-spinner{width:13px;height:13px;border-radius:50%;border:2px solid color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent);border-top-color:var(--dsw-alias-label-secondary);animation:dal-spin .7s linear infinite}
@keyframes dal-spin{to{transform:rotate(360deg)}}

.dal-backdrop{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:24px}
.dal-modal{width:min(720px,100%);max-height:min(660px,90vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:16px;box-shadow:0 28px 72px rgba(0,0,0,.3);overflow:hidden;color:var(--dsw-alias-label-primary)}
.dal-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 10px}
.dal-modal-head h2{margin:0;font-size:15.5px;font-weight:600}
.dal-modal-head p{margin:3px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dal-modal-body{padding:6px 18px 16px;display:flex;flex-direction:column;gap:10px;min-height:0;flex:1}
.dal-modal-body.scroll{overflow:auto}
.dal-input{width:100%;height:34px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 11px;font:inherit;font-size:12.5px;outline:none;box-sizing:border-box}
.dal-input:focus{border-color:var(--dsw-alias-brand-primary)}
.dal-session-list{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;overflow:auto;min-height:120px;flex:1;background:var(--dsw-alias-bg-base)}
.dal-session{width:100%;text-align:left;border:0;border-top:1px solid var(--dsw-alias-border-l1);background:transparent;color:inherit;font:inherit;padding:10px 12px;display:flex;gap:10px;align-items:center;cursor:pointer}
.dal-session:first-child{border-top:0}
.dal-session:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)}
.dal-session:disabled{cursor:default;opacity:.55}
.dal-session-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dal-session-title{font-size:12.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dal-session-sub{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dal-badge{font-size:10px;padding:0 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dal-badge.live{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent)}
.dal-badge.replay{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent)}
.dal-icon-btn.replay:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}
.dal-textarea{width:100%;min-height:118px;resize:vertical;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:9px 11px;font:inherit;font-size:12.5px;line-height:1.55;outline:none;box-sizing:border-box}
.dal-textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.dal-field-label{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin-bottom:4px}
.dal-select{width:100%;height:34px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 9px;font:inherit;font-size:12.5px;outline:none;box-sizing:border-box}
.dal-select:focus{border-color:var(--dsw-alias-brand-primary)}
.dal-form-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:10px}
.dal-hint{font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.dal-progress{display:flex;flex-direction:column;gap:10px;padding:2px 0}
.dal-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.dal-kv>div{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px;min-width:0}
.dal-kv b{display:block;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.4}
.dal-kv span{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dal-tabs{display:flex;gap:4px;padding:3px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1)}
.dal-tab{height:26px;padding:0 12px;border-radius:999px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.dal-tab:hover{color:var(--dsw-alias-label-primary)}
.dal-tab.on{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.dal-matrix{display:flex;flex-direction:column;gap:10px;min-width:0}
.dal-matrix-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dal-matrix-head h2{margin:0;font-size:14px;font-weight:600}
.dal-matrix-head .dal-hint{max-width:88ch;margin-top:2px}
.dal-matrix-scroll{overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:var(--dsw-alias-bg-layer-1)}
.dal-matrix-table{border-collapse:separate;border-spacing:0;min-width:100%}
.dal-matrix-table th,.dal-matrix-table td{padding:9px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;vertical-align:top}
.dal-matrix-table thead th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2);font-size:11px;letter-spacing:.04em;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dal-matrix-table tbody tr:last-child th,.dal-matrix-table tbody tr:last-child td{border-bottom:0}
.dal-matrix-table .corner,.dal-matrix-table tbody th{position:sticky;left:0;z-index:1;background:var(--dsw-alias-bg-layer-1);min-width:210px;max-width:280px}
.dal-matrix-table thead .corner{z-index:3;background:var(--dsw-alias-bg-layer-2)}
.dal-matrix-task-title{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dal-matrix-task-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.dal-matrix-task-meta code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}
.dal-matrix-task-meta .dal-link-btn{border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:10.5px;cursor:pointer;padding:0}
.dal-matrix-col b{display:block;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dal-matrix-col small{display:block;font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:1px}
.dal-mini{display:inline-block;margin-top:3px;font-size:9.5px;padding:0 5px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.dal-matrix-cell{display:flex;flex-direction:column;gap:1px;width:100%;min-width:128px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:7px 9px;text-align:left;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;cursor:pointer}
.dal-matrix-cell:hover{border-color:var(--dsw-alias-border-l2)}
.dal-matrix-cell b{font-size:17px;line-height:1.25;font-variant-numeric:tabular-nums}
.dal-matrix-cell span{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.dal-matrix-cell small{font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dal-matrix-cell.pass{border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent)}
.dal-matrix-cell.fail{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent)}
.dal-matrix-cell.mixed{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent)}
.dal-matrix-cell.empty{border-style:dashed;align-items:flex-start;opacity:.72}
.dal-matrix-cell.empty b{font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.dal-matrix-cell.empty:hover{opacity:1;border-color:var(--dsw-alias-brand-primary)}
.dal-badge.pass{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent)}
.dal-badge.fail{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}
.dal-checks{display:flex;flex-direction:column;gap:8px}
.dal-check-builtin{display:flex;gap:8px;align-items:center;border:1px dashed var(--dsw-alias-border-l2);border-radius:9px;padding:8px 10px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dal-check-row{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:9px 10px;display:flex;flex-direction:column;gap:8px}
.dal-check-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
.dal-check-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dal-check-field{display:flex;flex-direction:column;gap:3px;font-size:10.5px;color:var(--dsw-alias-label-secondary);min-width:0}
.dal-check-add{display:flex;gap:8px;align-items:center;padding-top:2px}
.dal-check-add .dal-select{flex:1;min-width:0}
.dal-preview{border-top:1px dashed var(--dsw-alias-border-l1);padding-top:9px;display:flex;flex-direction:column;gap:8px}
.dal-run-row{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:9px 10px;display:flex;flex-direction:column;gap:5px}
.dal-run-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.dal-run-head>div:first-child{display:flex;align-items:center;gap:8px;font-size:12px}
.dal-run-actions{display:flex;gap:6px}
.dal-run-meta{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);word-break:break-all}
.dal-details summary{cursor:pointer;font-size:11px;color:var(--dsw-alias-label-secondary);outline:none}
.dal-details summary:hover{color:var(--dsw-alias-label-primary)}
.dal-result{display:flex;gap:7px;align-items:baseline;font-size:11px;padding:3px 0 3px 4px;border-top:1px dashed var(--dsw-alias-border-l1)}
.dal-result:first-of-type{border-top:0}
.dal-result-mark{font-weight:700;flex:none}
.dal-result.ok .dal-result-mark{color:var(--dsw-alias-state-success-primary)}
.dal-result.bad .dal-result-mark{color:var(--dsw-alias-state-error-primary)}
.dal-result-type{flex:none;font-weight:550}
.dal-result-detail{color:var(--dsw-alias-label-secondary);min-width:0;word-break:break-word}
.dal-matrix-empty .dal-btn{margin-top:4px}
.dal-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:0 18px 16px}
.dal-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width: 1040px){
  .dal-overview{grid-template-columns:repeat(3,minmax(0,1fr))}
  .dal-pickers{grid-template-columns:1fr;gap:8px}
  .dal-swap{justify-self:flex-end;transform:rotate(90deg)}
  .dal-detail-grid{grid-template-columns:1fr}
}
@media (max-width: 720px){
  .dal-overview{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dal-trace-head,.dal-row{grid-template-columns:minmax(0,1fr) 74px minmax(0,1fr)}
  .dal-task-grid{grid-template-columns:1fr}
  .dal-task-col + .dal-task-col{border-left:0;border-top:1px solid var(--dsw-alias-border-l1)}
  .dal-form-row{grid-template-columns:1fr}
  .dal-check-fields{grid-template-columns:1fr}
  .dal-matrix-table .corner,.dal-matrix-table tbody th{min-width:160px}
}
`

    async function api(path, options) {
      const response = await fetch(API + path, {
        method: options?.method ?? 'GET',
        headers: options?.body === undefined ? undefined : { 'content-type': 'application/json' },
        body: options?.body,
        cache: 'no-store',
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok || payload?.ok === false) {
        const message = payload?.error ?? `HTTP ${response.status}`
        throw new Error(message)
      }
      return payload
    }

    const numberFormat = new Intl.NumberFormat()
    const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
    const timeFormat = new Intl.DateTimeFormat(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    function fmtInt(value) {
      return numberFormat.format(Math.round(Number(value) || 0))
    }

    function fmtCompact(value) {
      const number = Number(value) || 0
      return Math.abs(number) >= 10000 ? compactFormat.format(number) : fmtInt(number)
    }

    function fmtDelta(value) {
      const number = Number(value) || 0
      if (number === 0) return '0'
      const text = Math.abs(number) >= 10000 ? compactFormat.format(Math.abs(number)) : fmtInt(Math.abs(number))
      return `${number > 0 ? '+' : '−'}${text}`
    }

    function fmtMs(value) {
      const ms = Math.max(0, Number(value) || 0)
      if (ms < 1000) return `${Math.round(ms)}ms`
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }

    function fmtWhen(timestamp) {
      if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '—'
      try {
        return timeFormat.format(timestamp)
      } catch {
        return '—'
      }
    }

    function shortHash(value) {
      const text = typeof value === 'string' ? value : ''
      return text === '' ? '—' : text.slice(0, 8)
    }

    function workspaceName(cwd) {
      if (typeof cwd !== 'string' || cwd === '') return ''
      return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
    }

    function callSummary(call) {
      if (call === null || call === undefined) return ''
      const args = call.args
      if (args === null || typeof args !== 'object' || Array.isArray(args)) {
        return typeof call.argsRaw === 'string' ? call.argsRaw.replace(/\s+/gu, ' ').slice(0, 160) : ''
      }
      const preferred = ['command', 'path', 'file_path', 'filePath', 'query', 'url', 'pattern', 'description', 'name', 'id']
      for (const key of preferred) {
        if (typeof args[key] === 'string' && args[key].trim() !== '') {
          return `${key}: ${args[key].replace(/\s+/gu, ' ').trim().slice(0, 160)}`
        }
      }
      const firstKey = Object.keys(args)[0]
      if (firstKey === undefined) return ''
      const value = args[firstKey]
      const text = typeof value === 'string' ? value : JSON.stringify(value)
      return `${firstKey}: ${String(text ?? '').replace(/\s+/gu, ' ').slice(0, 160)}`
    }

    function argsText(call) {
      if (call === null || call === undefined) return ''
      if (call.args !== null && typeof call.args === 'object') return JSON.stringify(call.args, null, 2)
      if (typeof call.argsRaw === 'string' && call.argsRaw.trim() !== '') return call.argsRaw
      return ''
    }

    function resultText(call) {
      if (call === null || call === undefined) return ''
      return typeof call.resultText === 'string' ? call.resultText : ''
    }

    function deltaClass(metric) {
      const difference = metric.b - metric.a
      if (metric.better === 'neutral') return { cls: 'neutral' }
      if (difference === 0) return { cls: 'flat' }
      const improved = metric.better === 'lower' ? difference < 0 : difference > 0
      return { cls: improved ? 'better' : 'worse' }
    }

    function GlyphFlask({ size = 18 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M9 3h6M10.5 3v5.4L5.6 17.2A2.3 2.3 0 0 0 7.6 20.7h8.8a2.3 2.3 0 0 0 2-3.5L13.5 8.4V3' }),
        h('path', { d: 'M7.6 15.4h8.8' }),
        h('circle', { cx: 10.6, cy: 18, r: 0.75, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 13.4, cy: 16.9, r: 0.55, fill: 'currentColor', stroke: 'none', opacity: 0.75 }),
      )
    }

    function GlyphSwap({ size = 15 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M4 8h13M14 5l3 3-3 3' }),
        h('path', { d: 'M20 16H7M10 13l-3 3 3 3' }),
      )
    }

    function GlyphTrash({ size = 13 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7' }),
      )
    }

    function GlyphReplay({ size = 13 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M20 11a8 8 0 1 0-2.4 6.2' }),
        h('path', { d: 'M20 4v7h-7' }),
      )
    }

    function Spinner() {
      return h('span', { className: 'dal-spinner', 'aria-hidden': true })
    }

    function StatusPill({ status, t }) {
      return h('span', { className: `dal-pill st-${status}` }, t(status))
    }

    function PickerMenu({ runs, selectedId, otherId, onPick, onDelete, onReplay, pendingDelete, setPendingDelete, t }) {
      if (runs.length === 0) return h('div', { className: 'dal-menu' }, h('div', { className: 'dal-menu-empty' }, t('noRunsYet')))
      return h(
        'div',
        { className: 'dal-menu', role: 'listbox' },
        runs.map((run) =>
          h(
            'div',
            {
              key: run.id,
              role: 'option',
              'aria-selected': run.id === selectedId,
              tabIndex: 0,
              className: `dal-menu-row${run.id === selectedId ? ' selected' : ''}`,
              onClick: () => onPick(run.id),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPick(run.id)
                }
              },
            },
            h(
              'div',
              { className: 'dal-menu-row-main' },
              h('div', { className: 'dal-menu-row-title' }, run.title || run.prompt || run.id),
              h(
                'div',
                { className: 'dal-menu-row-sub' },
                `${run.model || '—'} · ${fmtWhen(run.capturedAt)} · ${fmtInt(run.stats?.toolCalls ?? 0)} ${t('calls')}`,
              ),
            ),
            run.id === otherId ? h('span', { className: 'dal-badge' }, 'A/B') : null,
            run.replay === undefined ? null : h('span', { className: 'dal-badge replay' }, t('replayTag')),
            h(
              'div',
              { className: 'dal-menu-row-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dal-icon-btn replay',
                  title: t('replay'),
                  'aria-label': t('replay'),
                  onClick: (event) => {
                    event.stopPropagation()
                    onReplay(run)
                  },
                },
                h(GlyphReplay, {}),
              ),
              pendingDelete === run.id
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dal-btn sm danger',
                      onClick: (event) => {
                        event.stopPropagation()
                        setPendingDelete(null)
                        onDelete(run.id)
                      },
                    },
                    t('confirmDelete'),
                  )
                : h(
                    'button',
                    {
                      type: 'button',
                      className: 'dal-icon-btn',
                      title: t('delete'),
                      'aria-label': t('delete'),
                      onClick: (event) => {
                        event.stopPropagation()
                        setPendingDelete(run.id)
                      },
                    },
                    h(GlyphTrash, {}),
                  ),
            ),
          ),
        ),
      )
    }

    function RunPicker({ role, label, run, runs, selectedId, otherId, onPick, onDelete, onReplay, pendingDelete, setPendingDelete, t }) {
      const [open, setOpen] = useState(false)
      const wrapper = useRef(null)

      useEffect(() => {
        if (!open) return undefined
        const onDocumentPointer = (event) => {
          if (wrapper.current !== null && !wrapper.current.contains(event.target)) setOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onDocumentPointer, true)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('pointerdown', onDocumentPointer, true)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])

      return h(
        'div',
        { className: 'dal-picker-wrap', ref: wrapper },
        h(
          'button',
          {
            type: 'button',
            className: `dal-picker${open ? ' open' : ''}`,
            'aria-haspopup': 'listbox',
            'aria-expanded': open,
            onClick: () => setOpen((value) => !value),
          },
          h(
            'span',
            { className: 'dal-picker-role' },
            h('span', { className: `dal-swatch ${role}` }),
            label,
          ),
          run === undefined
            ? h('span', { className: 'dal-picker-empty' }, t('pickRun'))
            : h(
                'span',
                { className: 'dal-picker-title' },
                run.title || run.prompt || run.id,
              ),
          run === undefined
            ? null
            : h(
                'span',
                { className: 'dal-picker-meta' },
                h('span', {}, run.model || '—'),
                h('span', {}, fmtInt(run.stats?.toolCalls ?? 0), ' ', t('calls')),
                h('span', {}, fmtWhen(run.capturedAt)),
              ),
        ),
        open
          ? h(PickerMenu, {
              runs,
              selectedId,
              otherId,
              onPick: (id) => {
                onPick(id)
                setOpen(false)
              },
              onDelete,
              onReplay: (candidate) => {
                setOpen(false)
                onReplay(candidate)
              },
              pendingDelete,
              setPendingDelete,
              t,
            })
          : null,
      )
    }

    function MetricCard({ icon, label, a, b, delta, format, t }) {
      const info = delta
      return h(
        'div',
        { className: 'dal-card' },
        h('div', { className: 'dal-card-label' }, label),
        h(
          'div',
          { className: 'dal-card-values' },
          h('span', { className: 'a' }, format(a)),
          h('span', { className: 'arrow' }, '→'),
          h('span', { className: 'b' }, format(b)),
        ),
        info === null
          ? null
          : h('span', { className: `dal-delta ${info.cls}` }, info.text),
      )
    }

    function TaskPanel({ diff, t }) {
      const same = diff.prompt.same
      return h(
        'div',
        { className: 'dal-task' },
        h(
          'div',
          { className: 'dal-task-head' },
          h('h3', {}, t('task')),
          h(
            'span',
            { className: 'dal-chip' },
            same ? t('taskSame') : t('taskDiff'),
          ),
        ),
        same
          ? h(
              'div',
              { className: 'dal-task-col single' },
              diff.prompt.a.trim() === '' ? t('taskEmpty') : diff.prompt.a,
            )
          : h(
              'div',
              { className: 'dal-task-grid' },
              h('div', { className: 'dal-task-col' }, diff.prompt.a.trim() === '' ? t('taskEmpty') : diff.prompt.a),
              h('div', { className: 'dal-task-col' }, diff.prompt.b.trim() === '' ? t('taskEmpty') : diff.prompt.b),
            ),
      )
    }

    function ConfigChips({ diff, t }) {
      const labels = {
        model: 'model',
        reasoningEffort: 'effort',
        toolCount: 'tools',
        toolsHash: 'tool schema',
        systemPromptHash: 'prompt',
        sandboxMode: 'sandbox',
        approvalPolicy: 'approval',
      }
      const rows = diff.config.filter((row) => labels[row.key] !== undefined)
      const changed = rows.filter((row) => !row.same)
      return h(
        'div',
        { className: 'dal-chip-row' },
        h('span', { className: 'dal-chip' }, t('config')),
        rows.map((row) => {
          let value
          if (row.key === 'toolsHash' || row.key === 'systemPromptHash') {
            value = h(
              'b',
              { className: 'mono' },
              row.same ? shortHash(row.a) : `${shortHash(row.a)}→${shortHash(row.b)}`,
            )
          } else if (row.key === 'toolCount') {
            value = h('b', {}, row.same ? String(row.a ?? '—') : `${row.a ?? '—'}→${row.b ?? '—'}`)
          } else {
            value = h('b', {}, `${row.a ?? '—'}${row.same ? '' : `→${row.b ?? '—'}`}`)
          }
          return h(
            'span',
            { key: row.key, className: `dal-chip${row.same ? '' : ' changed'}`, title: row.same ? t('configSame') : t('changed') },
            h('span', {}, labels[row.key]),
            value,
          )
        }),
        changed.length === 0 ? h('span', { className: 'dal-chip' }, t('configSame')) : null,
      )
    }

    function DetailPane({ side, call, changed, t }) {
      if (call === null) {
        return h(
          'div',
          { className: 'dal-pane' },
          h(
            'div',
            { className: 'dal-pane-head' },
            h('span', { className: `dal-dot st-${side === 'a' ? 'onlyB' : 'onlyA'}` }),
            side === 'a' ? t('columnA') : t('columnB'),
          ),
          h('div', { className: 'dal-absent' }, side === 'a' ? t('missingRow') : t('extraRow')),
        )
      }
      const args = argsText(call)
      const result = resultText(call)
      return h(
        'div',
        { className: 'dal-pane' },
        h(
          'div',
          { className: 'dal-pane-head' },
          h('span', { className: `dal-dot st-${call.isError ? 'flip' : 'same'}` }),
          side === 'a' ? t('columnA') : t('columnB'),
          h('b', {}, call.name),
          call.isError ? h('span', { className: 'dal-tag err' }, t('errorLabel')) : null,
        ),
        h(
          'div',
          { className: 'dal-field' },
          h(
            'span',
            {},
            t('argsLabel'),
            changed ? ` · ${t('changed')}` : '',
          ),
          args === '' ? h('pre', { className: 'dal-pre empty' }, '—') : h('pre', { className: 'dal-pre' }, args),
        ),
        h(
          'div',
          { className: 'dal-field' },
          h(
            'span',
            {},
            `${t('resultLabel')} · ${call.isError ? t('errorLabel') : t('okLabel')}${typeof call.durationMs === 'number' ? ` · ${fmtMs(call.durationMs)}` : ''}`,
          ),
          result === '' ? h('pre', { className: 'dal-pre empty' }, t('noResult')) : h('pre', { className: 'dal-pre' }, result),
        ),
      )
    }

    function TraceRow({ row, index, expanded, onToggle, t }) {
      const status = row.status
      const left = row.a
      const right = row.b
      const reference = right ?? left
      const changedKeys = row.changedKeys.map((entry) => entry.key)
      return h(
        'div',
        {
          className: `dal-row st-${status}`,
          role: 'button',
          tabIndex: 0,
          'aria-expanded': expanded,
          onClick: () => onToggle(index),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onToggle(index)
            }
          },
        },
        h(
          'div',
          { className: 'dal-cell a' },
          left === null
            ? h('span', { className: 'dal-absent' }, '—')
            : h(
                'div',
                { className: 'dal-call' },
                h('span', { className: 'dal-name' }, left.name),
                h('span', { className: 'dal-arg' }, callSummary(left)),
                left.isError ? h('span', { className: 'dal-tag err' }, t('errorLabel')) : null,
              ),
        ),
        h(
          'div',
          { className: 'dal-mid' },
          h(StatusPill, { status, t }),
          reference === null || reference === undefined
            ? null
            : h('small', {}, `T${reference.turn ?? '?'}·S${reference.step ?? '?'}`),
        ),
        h(
          'div',
          { className: 'dal-cell b' },
          right === null
            ? h('span', { className: 'dal-absent' }, '—')
            : h(
                'div',
                { className: 'dal-call' },
                h('span', { className: 'dal-name' }, right.name),
                h('span', { className: 'dal-arg' }, callSummary(right)),
                right.isError ? h('span', { className: 'dal-tag err' }, t('errorLabel')) : null,
              ),
        ),
        expanded
          ? h(
              'div',
              { className: 'dal-detail', onClick: (event) => event.stopPropagation() },
              changedKeys.length === 0
                ? null
                : h(
                    'div',
                    { className: 'dal-changed' },
                    h('span', {}, `${t('changedFields')}：`),
                    changedKeys.map((key) => h('code', { key }, key)),
                  ),
              h(
                'div',
                { className: 'dal-detail-grid' },
                h(DetailPane, { side: 'a', call: left, changed: changedKeys.length > 0, t }),
                h(DetailPane, { side: 'b', call: right, changed: changedKeys.length > 0, t }),
              ),
            )
          : null,
      )
    }

    function ImportDialog({ onClose, onCaptured, t }) {
      const [sessions, setSessions] = useState({ status: 'loading', items: [], error: null })
      const [query, setQuery] = useState('')
      const [busyId, setBusyId] = useState(null)
      const searchRef = useRef(null)

      useEffect(() => {
        let cancelled = false
        api('sessions')
          .then((payload) => {
            if (cancelled) return
            setSessions({ status: 'ready', items: payload.sessions ?? [], error: null })
          })
          .catch((error) => {
            if (cancelled) return
            setSessions({ status: 'error', items: [], error: error.message })
          })
        return () => {
          cancelled = true
        }
      }, [])

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        if (searchRef.current !== null) searchRef.current.focus()
        return () => document.removeEventListener('keydown', onKey)
      }, [onClose])

      const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (needle === '') return sessions.items
        return sessions.items.filter((session) => {
          const haystack = `${session.cwd ?? ''} ${session.id}`.toLowerCase()
          return haystack.includes(needle)
        })
      }, [query, sessions.items])

      const capture = async (sessionId) => {
        if (busyId !== null) return
        setBusyId(sessionId)
        try {
          const payload = await api('capture', { method: 'POST', body: JSON.stringify({ sessionId }) })
          onCaptured(payload.run)
        } catch (error) {
          setSessions((current) => ({ ...current, error: error.message }))
          setBusyId(null)
        }
      }

      return h(
        'div',
        {
          className: 'dal-backdrop',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'dal-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('importTitle') },
          h(
            'div',
            { className: 'dal-modal-head' },
            h(
              'div',
              {},
              h('h2', {}, t('importTitle')),
              h('p', {}, t('importSubtitle')),
            ),
            h(
              'button',
              { type: 'button', className: 'dal-icon-btn', onClick: onClose, 'aria-label': t('close') },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'dal-modal-body' },
            h('input', {
              className: 'dal-input',
              ref: searchRef,
              type: 'search',
              value: query,
              placeholder: t('importSearch'),
              'aria-label': t('importSearch'),
              onChange: (event) => setQuery(event.target.value),
            }),
            sessions.error === null
              ? null
              : h('div', { className: 'dal-banner error' }, sessions.error),
            h(
              'div',
              { className: 'dal-session-list' },
              sessions.status === 'loading'
                ? h(
                    'div',
                    { className: 'dal-loading' },
                    h(Spinner, {}),
                    t('loading'),
                  )
                : filtered.length === 0
                  ? h(
                      'div',
                      { className: 'dal-loading' },
                      sessions.items.length === 0 ? t('importEmpty') : t('importNoMatch'),
                    )
                  : filtered.map((session) =>
                      h(
                        'button',
                        {
                          key: session.id,
                          type: 'button',
                          className: 'dal-session',
                          disabled: busyId !== null,
                          onClick: () => capture(session.id),
                        },
                        h(
                          'div',
                          { className: 'dal-session-main' },
                          h(
                            'div',
                            { className: 'dal-session-title' },
                            workspaceName(session.cwd) || t('workspaceUnknown'),
                          ),
                          h(
                            'div',
                            { className: 'dal-session-sub' },
                            `${fmtWhen(session.createdAt)} · ${session.id.slice(0, 22)}${session.eventCount === undefined ? '' : ` · ${fmtInt(session.eventCount)} ${t('events')}`}`,
                          ),
                        ),
                        session.isLive ? h('span', { className: 'dal-badge live' }, t('live')) : null,
                        busyId === session.id
                          ? h(
                              'span',
                              { className: 'dal-picker-meta' },
                              h(Spinner, {}),
                              t('capturing'),
                            )
                          : h('span', { className: 'dal-badge' }, t('capture')),
                      ),
                    ),
            ),
          ),
          h(
            'div',
            { className: 'dal-modal-foot' },
            h('button', { type: 'button', className: 'dal-btn', onClick: onClose }, t('cancel')),
          ),
        ),
      )
    }

    const REPLAY_TERMINAL = new Set(['completed', 'cancelled', 'timeout', 'failed'])

    /** Flatten the Host model catalog into `<provider>\u241F<model>` choices. */
    function modelChoices(groups, baseRun, preferred) {
      const choices = []
      for (const group of Array.isArray(groups) ? groups : []) {
        for (const model of Array.isArray(group?.models) ? group.models : []) {
          choices.push({
            value: `${group.id}\u241F${model.id}`,
            provider: group.id,
            model: model.id,
            label: `${model.name || model.id} · ${group.name || group.id}`,
            efforts: Array.isArray(model.reasoning?.efforts) ? model.reasoning.efforts : [],
            defaultEffort: model.reasoning?.defaultEffort ?? '',
          })
        }
      }
      const add = (provider, model) => {
        if (typeof provider !== 'string' || provider === '' || typeof model !== 'string' || model === '') return
        if (choices.some((choice) => choice.provider === provider && choice.model === model)) return
        choices.unshift({
          value: `${provider}\u241F${model}`,
          provider,
          model,
          label: `${model} · ${provider}`,
          efforts: [],
          defaultEffort: '',
        })
      }
      add(preferred?.provider, preferred?.model)
      add(baseRun?.config?.provider, baseRun?.config?.model)
      return choices
    }

    function replayPhaseLabel(phase, t) {
      if (phase === 'preparing') return t('replayPhasePreparing')
      if (phase === 'starting') return t('replayPhaseStarting')
      if (phase === 'running') return t('replayPhaseRunning')
      if (phase === 'finishing') return t('replayPhaseFinishing')
      return t('replayPhaseDone')
    }

    function ReplayDialog({ baseRun, initialModel, onClose, onDone, t }) {
      const [catalog, setCatalog] = useState({ status: 'loading', groups: [], error: null })
      const [prompt, setPrompt] = useState(baseRun.prompt ?? '')
      const [choiceValue, setChoiceValue] = useState(() => {
        const provider = initialModel?.provider ?? baseRun.config?.provider ?? ''
        const model = initialModel?.model ?? baseRun.config?.model ?? ''
        return `${provider}\u241F${model}`
      })
      const [effort, setEffort] = useState(() => {
        if (initialModel !== null && initialModel !== undefined) {
          return typeof initialModel.reasoningEffort === 'string' ? initialModel.reasoningEffort : ''
        }
        if (typeof baseRun.config?.reasoningEffort === 'string') return baseRun.config.reasoningEffort
        return ''
      })
      const [job, setJob] = useState(null)
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(false)
      const doneRef = useRef(false)

      useEffect(() => {
        let cancelled = false
        api('models')
          .then((payload) => {
            if (cancelled) return
            setCatalog({ status: 'ready', groups: payload.groups ?? [], error: null })
          })
          .catch((loadError) => {
            if (cancelled) return
            setCatalog({ status: 'error', groups: [], error: loadError.message })
          })
        return () => {
          cancelled = true
        }
      }, [])

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [onClose])

      const choices = useMemo(
        () => modelChoices(catalog.groups, baseRun, initialModel),
        [catalog.groups, baseRun, initialModel],
      )
      const choice = choices.find((item) => item.value === choiceValue) ?? choices[0]

      const effortOptions = useMemo(() => {
        const list = [...(choice?.efforts ?? [])]
        if (effort !== '' && !list.some((item) => item.id === effort)) list.unshift({ id: effort, name: effort })
        return list
      }, [choice, effort])

      useEffect(() => {
        const id = job?.id
        if (id === undefined || REPLAY_TERMINAL.has(job.status)) return undefined
        const timer = setInterval(() => {
          api(`replay?id=${encodeURIComponent(id)}`)
            .then((payload) => setJob(payload.job))
            .catch((pollError) => setError(pollError.message))
        }, 1000)
        return () => clearInterval(timer)
      }, [job?.id, job?.status])

      useEffect(() => {
        if (doneRef.current) return
        if (job !== null && job.status === 'completed' && typeof job.runId === 'string') {
          doneRef.current = true
          onDone(job)
        }
      }, [job, onDone])

      const start = async () => {
        if (busy) return
        if (prompt.trim() === '') {
          setError(t('replayPromptEmpty'))
          return
        }
        setBusy(true)
        setError(null)
        try {
          const payload = await api('replay', {
            method: 'POST',
            body: JSON.stringify({
              baseRunId: baseRun.id,
              prompt,
              provider: choice?.provider,
              model: choice?.model,
              reasoningEffort: effort === '' ? undefined : effort,
            }),
          })
          setJob(payload.job)
        } catch (startError) {
          setError(startError.message)
        } finally {
          setBusy(false)
        }
      }

      const cancel = async () => {
        if (job === null || job.cancelRequested) return
        setBusy(true)
        try {
          const payload = await api('replay/cancel', { method: 'POST', body: JSON.stringify({ id: job.id }) })
          setJob(payload.job)
        } catch (cancelError) {
          setError(cancelError.message)
        } finally {
          setBusy(false)
        }
      }

      const running = job !== null && !REPLAY_TERMINAL.has(job.status)
      const elapsed = job === null ? 0 : Math.max(0, (job.finishedAt ?? Date.now()) - job.startedAt)

      let body
      if (job === null) {
        body = [
          h(
            'div',
            { key: 'prompt' },
            h('span', { className: 'dal-field-label' }, t('replayTask')),
            h('textarea', {
              className: 'dal-textarea',
              value: prompt,
              rows: 5,
              spellCheck: false,
              'aria-label': t('replayTask'),
              onChange: (event) => setPrompt(event.target.value),
            }),
          ),
          h(
            'div',
            { key: 'model', className: 'dal-form-row' },
            h(
              'label',
              {},
              h('span', { className: 'dal-field-label' }, t('replayModel')),
              h(
                'select',
                {
                  className: 'dal-select',
                  value: choice?.value ?? '',
                  onChange: (event) => {
                    const next = choices.find((item) => item.value === event.target.value)
                    setChoiceValue(event.target.value)
                    setEffort(next?.defaultEffort ?? '')
                  },
                },
                choices.map((item) => h('option', { key: item.value, value: item.value }, item.label)),
              ),
            ),
            effortOptions.length === 0
              ? null
              : h(
                  'label',
                  {},
                  h('span', { className: 'dal-field-label' }, t('replayEffort')),
                  h(
                    'select',
                    {
                      className: 'dal-select',
                      value: effort,
                      onChange: (event) => setEffort(event.target.value),
                    },
                    h('option', { value: '' }, t('replayEffortDefault')),
                    effortOptions.map((item) => h('option', { key: item.id, value: item.id }, item.name || item.id)),
                  ),
                ),
          ),
          h(
            'div',
            { key: 'copy', className: 'dal-hint' },
            `${t('replayWorkspace')} · ${baseRun.session?.cwd ?? t('workspaceUnknown')}`,
            h('br'),
            t('replayCopyNote'),
          ),
          catalog.status === 'error'
            ? h('div', { key: 'catalog', className: 'dal-banner warn' }, t('replayNoCatalog'))
            : null,
          h('div', { key: 'cost', className: 'dal-hint' }, t('replayCostNote')),
          error === null ? null : h('div', { key: 'error', className: 'dal-banner error' }, error),
        ].filter(Boolean)
      } else {
        body = h(
          'div',
          { className: 'dal-progress' },
          h('div', { className: 'dal-hint' }, replayPhaseLabel(job.phase, t)),
          h(
            'div',
            { className: 'dal-kv' },
            h('div', {}, h('b', {}, fmtInt(job.progress?.toolCalls ?? 0)), h('span', {}, t('replayTools'))),
            h('div', {}, h('b', {}, fmtInt(job.progress?.steps ?? 0)), h('span', {}, t('replaySteps'))),
            h('div', {}, h('b', {}, fmtMs(elapsed)), h('span', {}, t('replayElapsed'))),
          ),
          h(
            'div',
            { className: 'dal-hint' },
            `${t('replayModel')} · ${job.model.provider}/${job.model.model}${job.model.reasoningEffort === null ? '' : ` · ${job.model.reasoningEffort}`}`,
          ),
          job.workspaceDir === null ? null : h('div', { className: 'dal-hint mono' }, job.workspaceDir),
          running ? h('div', { className: 'dal-loading' }, h(Spinner, {}), replayPhaseLabel(job.phase, t)) : null,
          job.status === 'cancelled' ? h('div', { className: 'dal-banner warn' }, t('replayCancelled')) : null,
          job.status === 'timeout' ? h('div', { className: 'dal-banner warn' }, t('replayTimeout')) : null,
          job.status === 'failed'
            ? h('div', { className: 'dal-banner error' }, `${t('replayFailed')}：${job.error ?? ''}`)
            : null,
          error === null ? null : h('div', { className: 'dal-banner error' }, error),
        )
      }

      return h(
        'div',
        {
          className: 'dal-backdrop',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget && !running) onClose()
          },
        },
        h(
          'div',
          { className: 'dal-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('replayTitle') },
          h(
            'div',
            { className: 'dal-modal-head' },
            h(
              'div',
              {},
              h('h2', {}, t('replayTitle')),
              h('p', {}, t('replaySubtitle')),
            ),
            h(
              'button',
              { type: 'button', className: 'dal-icon-btn', onClick: onClose, 'aria-label': t('close') },
              '✕',
            ),
          ),
          h('div', { className: 'dal-modal-body' }, body),
          h(
            'div',
            { className: 'dal-modal-foot' },
            job === null
              ? h('button', { type: 'button', className: 'dal-btn', onClick: onClose, disabled: busy }, t('cancel'))
              : h('button', { type: 'button', className: 'dal-btn', onClick: onClose }, t('close')),
            job === null
              ? h(
                  'button',
                  { type: 'button', className: 'dal-btn primary', onClick: () => void start(), disabled: busy },
                  busy ? t('capturing') : t('replayStart'),
                )
              : running
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dal-btn danger',
                      onClick: () => void cancel(),
                      disabled: busy || job.cancelRequested,
                    },
                    job.cancelRequested ? t('replayCancelling') : t('replayCancel'),
                  )
                : job.runId !== null
                  ? h(
                      'button',
                      { type: 'button', className: 'dal-btn primary', onClick: () => onDone(job) },
                      t('replayOpen'),
                    )
                  : h(
                      'button',
                      {
                        type: 'button',
                        className: 'dal-btn',
                        onClick: () => {
                          setJob(null)
                          setError(null)
                        },
                      },
                      t('replayRetry'),
                    ),
          ),
        ),
      )
    }

    const CHECK_TYPE_KEYS = [
      ['no-tool', 'checkNoTool'],
      ['tool-called', 'checkToolCalled'],
      ['tool-not-called', 'checkToolNotCalled'],
      ['tool-args-contains', 'checkToolArgsContains'],
      ['file-contains', 'checkFileContains'],
      ['file-exists', 'checkFileExists'],
      ['file-not-exists', 'checkFileNotExists'],
      ['final-contains', 'checkFinalContains'],
      ['final-regex', 'checkFinalRegex'],
      ['max-tool-calls', 'checkMaxToolCalls'],
      ['max-total-tokens', 'checkMaxTokens'],
      ['max-failures', 'checkMaxFailures'],
      ['sandbox-mode-is', 'checkSandboxMode'],
      ['approval-policy-is', 'checkApprovalPolicy'],
    ]

    function checkLabel(type, t) {
      if (type === 'turn-completed') return t('checksBuiltIn')
      if (type === 'checks-error') return t('matrixChecksBroken')
      const entry = CHECK_TYPE_KEYS.find(([value]) => value === type)
      return entry === undefined ? String(type ?? '') : t(entry[1])
    }

    function emptyCheck(type) {
      if (type === 'tool-called' || type === 'tool-not-called') return { type, name: '' }
      if (type === 'tool-args-contains') return { type, name: '', text: '', key: '' }
      if (type === 'file-contains') return { type, path: '', text: '' }
      if (type === 'file-exists' || type === 'file-not-exists') return { type, path: '' }
      if (type === 'final-contains') return { type, text: '' }
      if (type === 'final-regex') return { type, pattern: '', flags: '' }
      if (type === 'max-tool-calls') return { type, max: 10 }
      if (type === 'max-total-tokens') return { type, max: 50000 }
      if (type === 'max-failures') return { type, max: 0 }
      if (type === 'sandbox-mode-is') return { type, mode: 'workspace-write' }
      if (type === 'approval-policy-is') return { type, policy: 'never' }
      return { type: 'no-tool' }
    }

    function cloneChecks(checks) {
      return JSON.parse(JSON.stringify(Array.isArray(checks) ? checks : []))
    }

    function validateChecks(checks, t) {
      for (const check of checks) {
        if (check.type === 'file-contains' && String(check.path ?? '').trim() === '') return t('checksInvalid')
        if (
          (check.type === 'file-contains' || check.type === 'final-contains') &&
          String(check.text ?? '').trim() === ''
        ) {
          return t('checksInvalid')
        }
        if (check.type.startsWith('max-') && !(Number.isSafeInteger(check.max) && check.max >= 0)) {
          return t('checksInvalid')
        }
        if (
          (check.type === 'tool-called' || check.type === 'tool-not-called' || check.type === 'tool-args-contains') &&
          String(check.name ?? '').trim() === ''
        ) {
          return t('checksInvalid')
        }
        if (check.type === 'tool-args-contains' && String(check.text ?? '').trim() === '') {
          return t('checksInvalid')
        }
        if (
          (check.type === 'file-exists' || check.type === 'file-not-exists') &&
          String(check.path ?? '').trim() === ''
        ) {
          return t('checksInvalid')
        }
        if (check.type === 'final-regex') {
          const pattern = String(check.pattern ?? '').trim()
          const flags = String(check.flags ?? '').trim()
          if (pattern === '' || !/^[ims]*$/u.test(flags)) return t('checksInvalid')
          try {
            new RegExp(pattern, flags)
          } catch {
            return t('checksInvalid')
          }
        }
      }
      return null
    }

    function cellTone(cell) {
      if (cell.passCount === cell.total) return 'pass'
      if (cell.passCount === 0) return 'fail'
      return 'mixed'
    }

    function passPercent(cell) {
      return cell.total === 0 ? 0 : Math.round((cell.passCount / cell.total) * 100)
    }

    function fmtAvg(value) {
      const number = Number(value) || 0
      return Number.isInteger(number) ? fmtInt(number) : number.toFixed(1)
    }

    /** Every distinct run of a task, newest first: preview candidates. */
    function taskRuns(task) {
      const seen = new Set()
      const runs = []
      for (const cell of Object.values(task?.cells ?? {})) {
        for (const run of Array.isArray(cell?.runs) ? cell.runs : []) {
          if (seen.has(run.id)) continue
          seen.add(run.id)
          runs.push(run)
        }
      }
      return runs.sort((left, right) => (right.capturedAt ?? 0) - (left.capturedAt ?? 0))
    }

    function ResultLine({ result, t }) {
      return h(
        'div',
        { className: `dal-result ${result.ok ? 'ok' : 'bad'}` },
        h('span', { className: 'dal-result-mark' }, result.ok ? '✓' : '✗'),
        h('span', { className: 'dal-result-type' }, checkLabel(result.type, t)),
        h('span', { className: 'dal-result-detail' }, result.detail ?? ''),
      )
    }

    function CellDialog({ task, column, cell, onClose, onCompare, onReplay, onEditChecks, t }) {
      const [aId, setAId] = useState(cell.runs.length > 1 ? cell.runs[1].id : null)
      const [bId, setBId] = useState(cell.runs[0]?.id ?? null)

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [onClose])

      const canCompare = aId !== null && bId !== null

      return h(
        'div',
        {
          className: 'dal-backdrop',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'dal-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('cellTitle') },
          h(
            'div',
            { className: 'dal-modal-head' },
            h(
              'div',
              {},
              h('h2', {}, task.title),
              h('p', {}, column.label),
            ),
            h(
              'button',
              { type: 'button', className: 'dal-icon-btn', onClick: onClose, 'aria-label': t('close') },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'dal-modal-body scroll' },
            h(
              'div',
              { className: 'dal-run-actions' },
              h('button', { type: 'button', className: 'dal-btn sm', onClick: onReplay }, t('cellReplay')),
              h('button', { type: 'button', className: 'dal-btn sm', onClick: onEditChecks }, t('matrixEditChecks')),
            ),
            cell.runs.map((run) =>
              h(
                'div',
                { key: run.id, className: 'dal-run-row' },
                h(
                  'div',
                  { className: 'dal-run-head' },
                  h(
                    'div',
                    {},
                    h('b', {}, fmtWhen(run.capturedAt)),
                    h(
                      'span',
                      { className: `dal-badge ${run.passed ? 'pass' : 'fail'}` },
                      run.passed ? t('matrixPass') : t('cellFail'),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'dal-run-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: `dal-btn sm${aId === run.id ? ' primary' : ''}`,
                        onClick: () => setAId(run.id),
                      },
                      t('cellPickA'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: `dal-btn sm${bId === run.id ? ' primary' : ''}`,
                        onClick: () => setBId(run.id),
                      },
                      t('cellPickB'),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'dal-run-meta' },
                  `${run.id} · ${fmtInt(run.toolCalls)} ${t('calls')} · ${fmtCompact(run.tokens)} tokens · ${fmtMs(run.durationMs)}`,
                ),
                run.results.length === 0
                  ? null
                  : h(
                      'details',
                      { className: 'dal-details' },
                      h(
                        'summary',
                        {},
                        `${t('cellResults')} · ${run.results.filter((result) => result.ok).length}/${run.results.length}`,
                      ),
                      run.results.map((result, index) => h(ResultLine, { key: index, result, t })),
                    ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dal-modal-foot' },
            h('button', { type: 'button', className: 'dal-btn', onClick: onClose }, t('close')),
            h(
              'button',
              {
                type: 'button',
                className: 'dal-btn primary',
                disabled: !canCompare,
                onClick: () => {
                  if (canCompare) onCompare(aId, bId)
                },
              },
              t('cellCompare'),
            ),
          ),
        ),
      )
    }

    function MatrixView({ refreshToken, onEditChecks, onReplayCell, onCompare, onImport, t }) {
      const [matrix, setMatrix] = useState({ status: 'loading', data: null, error: null })
      const [openCell, setOpenCell] = useState(null)
      const [retry, setRetry] = useState(0)

      useEffect(() => {
        let cancelled = false
        setMatrix({ status: 'loading', data: null, error: null })
        api('matrix')
          .then((payload) => {
            if (cancelled) return
            setMatrix({ status: 'ready', data: payload.matrix, error: null })
          })
          .catch((error) => {
            if (cancelled) return
            setMatrix({ status: 'error', data: null, error: error.message })
          })
        return () => {
          cancelled = true
        }
      }, [refreshToken, retry])

      let body
      if (matrix.status === 'loading') {
        body = h('div', { className: 'dal-loading' }, h(Spinner, {}), t('loading'))
      } else if (matrix.status === 'error') {
        body = h(
          'div',
          { className: 'dal-banner error' },
          h('span', {}, `${t('error')}：${matrix.error}`),
          h('button', { type: 'button', className: 'dal-btn sm', onClick: () => setRetry((value) => value + 1) }, t('retry')),
        )
      } else if (matrix.data.tasks.length === 0) {
        body = h(
          'div',
          { className: 'dal-empty dal-matrix-empty' },
          h('div', { className: 'dal-empty-mark' }, h(GlyphFlask, { size: 26 })),
          h('h2', {}, t('matrixEmpty')),
          h('p', {}, t('matrixEmptyBody')),
          h('button', { type: 'button', className: 'dal-btn primary', onClick: onImport }, t('import')),
        )
      } else {
        body = h(
          'div',
          { className: 'dal-matrix-scroll' },
          h(
            'table',
            { className: 'dal-matrix-table' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                h('th', { className: 'corner' }, t('matrixTaskColumn')),
                matrix.data.columns.map((column) =>
                  h(
                    'th',
                    { key: column.key },
                    h(
                      'div',
                      { className: 'dal-matrix-col' },
                      h('b', {}, column.model),
                      h('small', {}, column.provider),
                      column.effort === null ? null : h('span', { className: 'dal-mini' }, column.effort),
                      column.preset === 'default' ? null : h('span', { className: 'dal-mini' }, column.preset),
                    ),
                  ),
                ),
              ),
            ),
            h(
              'tbody',
              {},
              matrix.data.tasks.map((task) =>
                h(
                  'tr',
                  { key: task.key },
                  h(
                    'th',
                    {},
                    h('div', { className: 'dal-matrix-task-title', title: task.prompt }, task.title),
                    h(
                      'div',
                      { className: 'dal-matrix-task-meta' },
                      h('code', {}, task.key),
                      h(
                        'span',
                        {
                          className: `dal-badge${task.checksError === null ? '' : ' fail'}`,
                          title: task.checksError ?? '',
                        },
                        task.checksError !== null
                          ? t('matrixChecksBroken')
                          : task.checks.length === 0
                            ? t('matrixNoChecks')
                            : `${task.checks.length} ${t('matrixCheckCount')}`,
                      ),
                      h(
                        'button',
                        { type: 'button', className: 'dal-link-btn', onClick: () => onEditChecks(task) },
                        t('matrixEditChecks'),
                      ),
                    ),
                  ),
                  matrix.data.columns.map((column) => {
                    const cell = task.cells[column.key]
                    if (cell === undefined) {
                      return h(
                        'td',
                        { key: column.key },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dal-matrix-cell empty',
                            onClick: () => onReplayCell({ run: task.replayBase, model: column }),
                          },
                          h('b', {}, '＋'),
                          h('small', {}, t('matrixRunVariant')),
                        ),
                      )
                    }
                    return h(
                      'td',
                      { key: column.key },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: `dal-matrix-cell ${cellTone(cell)}`,
                          title: t('matrixCellHint'),
                          onClick: () => setOpenCell({ task, column, cell }),
                        },
                        h('b', {}, `${passPercent(cell)}%`),
                        h('span', {}, `${cell.passCount}/${cell.total} ${t('matrixPass')}`),
                        h('small', {}, `${fmtAvg(cell.avgToolCalls)} ${t('calls')} · ${fmtCompact(cell.avgTokens)} tokens`),
                      ),
                    )
                  }),
                ),
              ),
            ),
          ),
        )
      }

      return h(
        'section',
        { className: 'dal-matrix' },
        h(
          'div',
          { className: 'dal-matrix-head' },
          h(
            'div',
            {},
            h('h2', {}, t('tabMatrix')),
            h('p', { className: 'dal-hint' }, t('matrixHint')),
          ),
          matrix.data === null ? null : h('span', { className: 'dal-badge' }, `${matrix.data.tasks.length} ${t('matrixRows')}`),
        ),
        body,
        openCell === null
          ? null
          : h(CellDialog, {
              task: openCell.task,
              column: openCell.column,
              cell: openCell.cell,
              onClose: () => setOpenCell(null),
              onCompare: (a, b) => {
                setOpenCell(null)
                onCompare(a, b)
              },
              onReplay: () => onReplayCell({ run: openCell.task.replayBase, model: openCell.column }),
              onEditChecks: () => {
                const task = openCell.task
                setOpenCell(null)
                onEditChecks(task)
              },
              t,
            }),
      )
    }

    function ChecksDialog({ task, onClose, onSaved, t }) {
      const [checks, setChecks] = useState(() => cloneChecks(task.checks))
      const [addType, setAddType] = useState('no-tool')
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(false)
      const previewRuns = useMemo(() => taskRuns(task), [task])
      const [previewRunId, setPreviewRunId] = useState(() => previewRuns[0]?.id ?? null)
      const [preview, setPreview] = useState({ status: 'idle' })

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [onClose])

      const update = (index, patch) => {
        setPreview({ status: 'idle' })
        setChecks((current) => current.map((item, position) => (position === index ? { ...item, ...patch } : item)))
      }
      const remove = (index) => {
        setPreview({ status: 'idle' })
        setChecks((current) => current.filter((_, position) => position !== index))
      }

      const save = async () => {
        if (busy) return
        const message = validateChecks(checks, t)
        if (message !== null) {
          setError(message)
          return
        }
        setBusy(true)
        setError(null)
        try {
          await api('checks', { method: 'POST', body: JSON.stringify({ taskKey: task.key, checks }) })
          onSaved()
        } catch (saveError) {
          setError(saveError.message)
          setBusy(false)
        }
      }

      const runPreview = async () => {
        if (previewRunId === null || busy) return
        const message = validateChecks(checks, t)
        if (message !== null) {
          setError(message)
          return
        }
        setError(null)
        setPreview({ status: 'loading' })
        try {
          const payload = await api('checks/preview', {
            method: 'POST',
            body: JSON.stringify({ runId: previewRunId, checks }),
          })
          setPreview({
            status: 'ready',
            passed: payload.passed === true,
            results: Array.isArray(payload.results) ? payload.results : [],
          })
        } catch (previewError) {
          setPreview({ status: 'error', error: previewError.message })
        }
      }

      const field = (label, value, onChange, type = 'text') =>
        h(
          'label',
          { className: 'dal-check-field' },
          h('span', {}, label),
          h('input', { className: 'dal-input', type, value: value ?? '', onChange }),
        )

      const selectField = (label, value, options, onChange) =>
        h(
          'label',
          { className: 'dal-check-field' },
          h('span', {}, label),
          h(
            'select',
            { className: 'dal-select', value, onChange },
            options.map(([optionValue, optionLabel]) => h('option', { key: optionValue, value: optionValue }, optionLabel)),
          ),
        )

      const renderRow = (check, index) =>
        h(
          'div',
          { key: index, className: 'dal-check-row' },
          h(
            'div',
            { className: 'dal-check-head' },
            h('b', {}, checkLabel(check.type, t)),
            h(
              'button',
              {
                type: 'button',
                className: 'dal-icon-btn',
                title: t('checksRemove'),
                'aria-label': t('checksRemove'),
                onClick: () => remove(index),
              },
              '✕',
            ),
          ),
          check.type === 'no-tool' ? h('div', { className: 'dal-hint' }, t('checkNoToolHint')) : null,
          check.type === 'tool-called' || check.type === 'tool-not-called'
            ? field(t('checkName'), check.name, (event) => update(index, { name: event.target.value }))
            : null,
          check.type === 'tool-args-contains'
            ? h(
                'div',
                { className: 'dal-check-fields' },
                field(t('checkName'), check.name, (event) => update(index, { name: event.target.value })),
                field(t('checkKey'), check.key, (event) => update(index, { key: event.target.value })),
                field(t('checkText'), check.text, (event) => update(index, { text: event.target.value })),
              )
            : null,
          check.type === 'file-exists' || check.type === 'file-not-exists'
            ? field(t('checkPath'), check.path, (event) => update(index, { path: event.target.value }))
            : null,
          check.type === 'final-regex'
            ? h(
                'div',
                { className: 'dal-check-fields' },
                field(t('checkPattern'), check.pattern, (event) => update(index, { pattern: event.target.value })),
                field(t('checkFlags'), check.flags, (event) => update(index, { flags: event.target.value })),
              )
            : null,
          check.type === 'sandbox-mode-is'
            ? selectField(
                t('checkMode'),
                check.mode,
                [
                  ['read-only', 'read-only'],
                  ['workspace-write', 'workspace-write'],
                  ['danger-full-access', 'danger-full-access'],
                ],
                (event) => update(index, { mode: event.target.value }),
              )
            : null,
          check.type === 'approval-policy-is'
            ? selectField(
                t('checkPolicy'),
                check.policy,
                [
                  ['ask', 'ask'],
                  ['never', 'never'],
                ],
                (event) => update(index, { policy: event.target.value }),
              )
            : null,
          check.type === 'file-contains'
            ? h(
                'div',
                { className: 'dal-check-fields' },
                field(t('checkPath'), check.path, (event) => update(index, { path: event.target.value })),
                field(t('checkText'), check.text, (event) => update(index, { text: event.target.value })),
              )
            : null,
          check.type === 'final-contains'
            ? field(t('checkText'), check.text, (event) => update(index, { text: event.target.value }))
            : null,
          check.type.startsWith('max-')
            ? field(
                t('checkMax'),
                check.max,
                (event) => update(index, { max: event.target.value === '' ? '' : Number(event.target.value) }),
                'number',
              )
            : null,
        )

      return h(
        'div',
        {
          className: 'dal-backdrop',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'div',
          { className: 'dal-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('checksTitle') },
          h(
            'div',
            { className: 'dal-modal-head' },
            h(
              'div',
              {},
              h('h2', {}, t('checksTitle')),
              h('p', {}, t('checksSubtitle')),
            ),
            h(
              'button',
              { type: 'button', className: 'dal-icon-btn', onClick: onClose, 'aria-label': t('close') },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'dal-modal-body scroll' },
            task.checksError === null
              ? null
              : h('div', { className: 'dal-banner warn' }, `${t('matrixChecksBroken')}：${task.checksError}`),
            h(
              'div',
              { className: 'dal-check-builtin' },
              h('span', {}, '✓'),
              h('strong', {}, t('checksBuiltIn')),
              h('small', {}, `· ${t('checksBuiltInHint')}`),
            ),
            checks.length === 0
              ? h('div', { className: 'dal-hint' }, t('checksEmpty'))
              : h('div', { className: 'dal-checks' }, checks.map(renderRow)),
            h(
              'div',
              { className: 'dal-check-add' },
              h(
                'select',
                {
                  className: 'dal-select',
                  value: addType,
                  'aria-label': t('checksType'),
                  onChange: (event) => setAddType(event.target.value),
                },
                CHECK_TYPE_KEYS.map(([value, key]) => h('option', { key: value, value }, t(key))),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dal-btn sm',
                  onClick: () => {
                    setPreview({ status: 'idle' })
                    setChecks((current) => [...current, emptyCheck(addType)])
                  },
                },
                t('checksAdd'),
              ),
            ),
            previewRuns.length === 0
              ? null
              : h(
                  'div',
                  { className: 'dal-preview' },
                  h('div', { className: 'dal-check-head' }, h('b', {}, t('checksPreview'))),
                  h(
                    'div',
                    { className: 'dal-check-add' },
                    h(
                      'select',
                      {
                        className: 'dal-select',
                        value: previewRunId ?? '',
                        'aria-label': t('checksPreview'),
                        onChange: (event) => {
                          setPreview({ status: 'idle' })
                          setPreviewRunId(event.target.value)
                        },
                      },
                      previewRuns.map((run) =>
                        h(
                          'option',
                          { key: run.id, value: run.id },
                          `${fmtWhen(run.capturedAt)} · ${run.title || run.id}`,
                        ),
                      ),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dal-btn sm',
                        onClick: () => void runPreview(),
                        disabled: busy || preview.status === 'loading',
                      },
                      t('checksPreviewAction'),
                    ),
                  ),
                  preview.status === 'loading'
                    ? h('div', { className: 'dal-loading' }, h(Spinner, {}), t('loading'))
                    : null,
                  preview.status === 'error'
                    ? h('div', { className: 'dal-banner error' }, preview.error)
                    : null,
                  preview.status === 'ready'
                    ? h(
                        'div',
                        { className: 'dal-checks' },
                        h(
                          'span',
                          { className: `dal-badge ${preview.passed ? 'pass' : 'fail'}` },
                          preview.passed ? t('checksPreviewPass') : t('checksPreviewFail'),
                        ),
                        preview.results.map((result, index) => h(ResultLine, { key: index, result, t })),
                      )
                    : null,
                ),
            error === null ? null : h('div', { className: 'dal-banner error' }, error),
          ),
          h(
            'div',
            { className: 'dal-modal-foot' },
            h('button', { type: 'button', className: 'dal-btn', onClick: onClose, disabled: busy }, t('cancel')),
            h(
              'button',
              { type: 'button', className: 'dal-btn primary', onClick: () => void save(), disabled: busy },
              busy ? t('capturing') : t('checksSave'),
            ),
          ),
        ),
      )
    }

    function LabPage(props) {
      const { t } = props
      const [library, setLibrary] = useState({ status: 'loading', runs: [], dir: '', error: null })
      const [aId, setAId] = useState(null)
      const [bId, setBId] = useState(null)
      const [diff, setDiff] = useState({ status: 'idle' })
      const [importOpen, setImportOpen] = useState(false)
      const [filter, setFilter] = useState('all')
      const [expanded, setExpanded] = useState(-1)
      const [pendingDelete, setPendingDelete] = useState(null)
      const [reloadToken, setReloadToken] = useState(0)
      const [notice, setNotice] = useState(null)
      const [replayRequest, setReplayRequest] = useState(null)
      const [checksTask, setChecksTask] = useState(null)
      const [view, setView] = useState('compare')
      const [matrixToken, setMatrixToken] = useState(0)
      const bIdRef = useRef(null)
      bIdRef.current = bId

      const loadLibrary = useCallback(async (preferred) => {
        try {
          const payload = await api('state')
          const runs = payload.runs ?? []
          setLibrary({ status: 'ready', runs, dir: payload.dir ?? '', error: null })
          setAId((current) => {
            if (current !== null && runs.some((run) => run.id === current)) return current
            // Prefer a baseline recorded from the same task: the useful pair is
            // usually two runs of one task, not the two newest unrelated runs.
            const newest = runs[0]
            if (newest === undefined) return null
            const sameTask = runs.find(
              (run) => run.id !== newest.id && (run.prompt ?? '').trim() === (newest.prompt ?? '').trim(),
            )
            return sameTask?.id ?? runs[1]?.id ?? null
          })
          setBId((current) => {
            if (current !== null && runs.some((run) => run.id === current)) return current
            return runs[0]?.id ?? null
          })
          if (preferred !== undefined) setBId(preferred)
        } catch (error) {
          setLibrary({ status: 'error', runs: [], dir: '', error: error.message })
        }
      }, [])

      useEffect(() => {
        void loadLibrary()
      }, [loadLibrary])

      useEffect(() => {
        if (aId === null || bId === null) {
          setDiff({ status: 'idle' })
          return undefined
        }
        let cancelled = false
        setDiff({ status: 'loading' })
        setExpanded(-1)
        api(`compare?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
          .then((payload) => {
            if (cancelled) return
            setDiff({ status: 'ready', data: payload.diff })
          })
          .catch((error) => {
            if (cancelled) return
            setDiff({ status: 'error', error: error.message })
          })
        return () => {
          cancelled = true
        }
      }, [aId, bId, reloadToken])

      const runs = library.runs
      const runA = runs.find((run) => run.id === aId)
      const runB = runs.find((run) => run.id === bId)

      const swap = () => {
        const previousA = aId
        setAId(bId)
        setBId(previousA)
      }

      const deleteRun = async (id) => {
        setPendingDelete(null)
        try {
          await api('delete', { method: 'POST', body: JSON.stringify({ id }) })
          if (aId === id) setAId(null)
          if (bId === id) setBId(null)
          await loadLibrary()
          setNotice(null)
        } catch (error) {
          setNotice({ kind: 'error', text: error.message })
        }
      }

      const onCaptured = async (run) => {
        const previousB = bIdRef.current
        setImportOpen(false)
        try {
          const payload = await api('state')
          const next = payload.runs ?? []
          setLibrary({ status: 'ready', runs: next, dir: payload.dir ?? '', error: null })
          setAId(previousB !== null && previousB !== run.id ? previousB : (next.find((item) => item.id !== run.id)?.id ?? null))
          setBId(run.id)
          setExpanded(-1)
          setNotice(null)
          setMatrixToken((value) => value + 1)
        } catch (error) {
          setNotice({ kind: 'error', text: error.message })
        }
      }

      const openReplay = (run) => setReplayRequest({ run, model: null, from: 'compare' })

      const openReplayForCell = ({ run, model }) => {
        if (run === null || run === undefined) return
        setReplayRequest({ run, model, from: 'matrix' })
      }

      const onReplayDone = async (job) => {
        const fromMatrix = replayRequest?.from === 'matrix'
        setReplayRequest(null)
        try {
          const payload = await api('state')
          const next = payload.runs ?? []
          setLibrary({ status: 'ready', runs: next, dir: payload.dir ?? '', error: null })
          if (fromMatrix) {
            setMatrixToken((value) => value + 1)
            setNotice({ kind: '', text: t('replayDoneMatrix') })
            return
          }
          if (typeof job.baseRunId === 'string') setAId(job.baseRunId)
          if (typeof job.runId === 'string') setBId(job.runId)
          setExpanded(-1)
          setNotice({ kind: '', text: t('replayDone') })
        } catch (error) {
          setNotice({ kind: 'error', text: error.message })
        }
      }

      const data = diff.status === 'ready' ? diff.data : null
      const visibleRows = useMemo(() => {
        if (data === null) return []
        if (filter === 'diff') return data.aligned.filter((row) => row.status !== 'same')
        return data.aligned
      }, [data, filter])

      const tokens = (stats) => (stats?.inputTokens ?? 0) + (stats?.outputTokens ?? 0)
      const cards = data === null
        ? []
        : [
            {
              key: 'toolCalls',
              label: t('metricToolCalls'),
              a: data.metrics.find((metric) => metric.key === 'toolCalls')?.a ?? 0,
              b: data.metrics.find((metric) => metric.key === 'toolCalls')?.b ?? 0,
              metric: data.metrics.find((metric) => metric.key === 'toolCalls'),
              format: (value) => fmtInt(value),
            },
            {
              key: 'failures',
              label: t('metricFailures'),
              a: data.metrics.find((metric) => metric.key === 'failures')?.a ?? 0,
              b: data.metrics.find((metric) => metric.key === 'failures')?.b ?? 0,
              metric: data.metrics.find((metric) => metric.key === 'failures'),
              format: (value) => fmtInt(value),
            },
            {
              key: 'tokens',
              label: t('metricTokens'),
              a: tokens(data.a.stats),
              b: tokens(data.b.stats),
              metric: { a: tokens(data.a.stats), b: tokens(data.b.stats), better: 'lower' },
              format: (value) => fmtCompact(value),
            },
            {
              key: 'duration',
              label: t('metricDuration'),
              a: data.a.stats?.durationMs ?? 0,
              b: data.b.stats?.durationMs ?? 0,
              metric: { a: data.a.stats?.durationMs ?? 0, b: data.b.stats?.durationMs ?? 0, better: 'lower' },
              format: (value) => fmtMs(value),
            },
            {
              key: 'steps',
              label: t('metricSteps'),
              a: data.a.stats?.steps ?? 0,
              b: data.b.stats?.steps ?? 0,
              metric: { a: data.a.stats?.steps ?? 0, b: data.b.stats?.steps ?? 0, better: 'neutral' },
              format: (value) => fmtInt(value),
            },
          ]

      let body
      if (library.status === 'loading') {
        body = h('div', { className: 'dal-loading' }, h(Spinner, {}), t('loading'))
      } else if (library.status === 'error') {
        body = h(
          'div',
          { className: 'dal-banner error' },
          h('span', {}, `${t('error')}：${library.error}`),
          h(
            'button',
            { type: 'button', className: 'dal-btn sm', onClick: () => void loadLibrary() },
            t('retry'),
          ),
        )
      } else if (runs.length === 0) {
        body = h(
          'div',
          { className: 'dal-empty' },
          h('div', { className: 'dal-empty-mark' }, h(GlyphFlask, { size: 26 })),
          h('h2', {}, t('emptyTitle')),
          h('p', {}, t('emptyBody')),
          h(
            'div',
            { className: 'dal-steps' },
            h('span', {}, `1 · ${t('emptyStep1')}`),
            h('span', {}, `2 · ${t('emptyStep2')}`),
            h('span', {}, `3 · ${t('emptyStep3')}`),
          ),
          h(
            'button',
            { type: 'button', className: 'dal-btn primary', onClick: () => setImportOpen(true) },
            t('import'),
          ),
        )
      } else if (aId === null || bId === null) {
        body = h(
          'div',
          { className: 'dal-empty' },
          h('div', { className: 'dal-empty-mark' }, h(GlyphFlask, { size: 26 })),
          h('h2', {}, t('onlyOne')),
          h('p', {}, t('needTwo')),
          h(
            'button',
            { type: 'button', className: 'dal-btn primary', onClick: () => setImportOpen(true) },
            t('import'),
          ),
        )
      } else if (diff.status === 'loading' || diff.status === 'idle') {
        body = h('div', { className: 'dal-loading' }, h(Spinner, {}), t('loadingCompare'))
      } else if (diff.status === 'error') {
        body = h(
          'div',
          { className: 'dal-banner error' },
          h('span', {}, `${t('error')}：${diff.error}`),
          h(
            'button',
            { type: 'button', className: 'dal-btn sm', onClick: () => setReloadToken((value) => value + 1) },
            t('retry'),
          ),
        )
      } else if (data !== null) {
        const differenceCount = data.aligned.filter((row) => row.status !== 'same').length
        const sameCount = data.counts.same
        const verdictPieces = []
        const pushVerdict = (label, a, b, format) => {
          if (a === b) return
          const percent = a > 0 ? Math.round(((b - a) / a) * 100) : null
          const percentText = percent === null ? '' : `（${percent > 0 ? '+' : ''}${percent}%）`
          verdictPieces.push(`${label} ${format(a)}→${format(b)}${percentText}`)
        }
        pushVerdict(t('metricToolCalls'), cards[0].a, cards[0].b, fmtInt)
        pushVerdict(t('metricFailures'), cards[1].a, cards[1].b, fmtInt)
        pushVerdict(t('metricTokens'), cards[2].a, cards[2].b, fmtCompact)
        pushVerdict(t('metricDuration'), cards[3].a, cards[3].b, fmtMs)
        const verdict =
          differenceCount === 0
            ? t('identical')
            : `${verdictPieces.length === 0 ? t('metricsFlat') : t('verdictLead')}${verdictPieces.join(' · ')}`
        body = h(
          React.Fragment,
          {},
          aId === bId
            ? h('div', { className: 'dal-banner warn' }, t('compareSelf'))
            : null,
          h(
            'div',
            { className: 'dal-overview' },
            h(
              'div',
              { className: 'dal-card' },
              h('div', { className: 'dal-card-label' }, t('score')),
              h(
                'div',
                { className: 'dal-score' },
                String(data.score),
                h('small', {}, '/ 100'),
              ),
              h('div', { className: 'dal-bar' }, h('i', { style: { width: `${Math.max(2, data.score)}%` } })),
              h(
                'div',
                { className: 'dal-score-counts' },
                `${sameCount} ${t('matchedCount')}`,
                differenceCount > 0 ? ` · ${differenceCount} ${t('diffCount')}` : '',
              ),
            ),
            cards.map((card) => {
              const info = card.metric === undefined ? null : deltaClass(card.metric)
              const text = info === null ? null : `${fmtDelta(card.b - card.a)}`
              return h(MetricCard, {
                key: card.key,
                label: card.label,
                a: card.a,
                b: card.b,
                delta: info === null || info.cls === 'neutral' ? null : { cls: info.cls, text },
                format: card.format,
                t,
              })
            }),
          ),
          h('div', { className: 'dal-verdict' }, verdict),
          h(ConfigChips, { diff: data, t }),
          h(TaskPanel, { diff: data, t }),
          h(
            'div',
            { className: 'dal-toolbar' },
            h(
              'div',
              { className: 'dal-filters' },
              h(
                'button',
                {
                  type: 'button',
                  className: `dal-filter${filter === 'all' ? ' on' : ''}`,
                  onClick: () => setFilter('all'),
                },
                `${t('filterAll')} ${data.aligned.length}`,
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: `dal-filter${filter === 'diff' ? ' on' : ''}`,
                  onClick: () => setFilter('diff'),
                },
                `${t('filterDiff')} ${differenceCount}`,
              ),
            ),
            h(
              'div',
              { className: 'dal-legend' },
              STATUSES.map((status) =>
                h(
                  'span',
                  { key: status },
                  h('span', { className: 'dal-dot', style: { background: `var(--dsw-alias-${statusColor(status)})` } }),
                  t(status),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dal-trace' },
            h(
              'div',
              { className: 'dal-strip', 'aria-hidden': true },
              data.aligned.map((row, index) => h('i', { key: index, className: `st-${row.status}` })),
            ),
            h(
              'div',
              { className: 'dal-trace-head' },
              h('div', {}, t('columnA')),
              h('div', {}, t('columnStatus')),
              h('div', {}, t('columnB')),
            ),
            visibleRows.length === 0
              ? h(
                  'div',
                  { className: 'dal-loading' },
                  h(GlyphFlask, { size: 15 }),
                  t('identical'),
                )
              : visibleRows.map((row) => {
                  const index = data.aligned.indexOf(row)
                  return h(TraceRow, {
                    key: index,
                    row,
                    index,
                    expanded: expanded === index,
                    onToggle: (value) => setExpanded((current) => (current === value ? -1 : value)),
                    t,
                  })
                }),
          ),
          h('div', { className: 'dal-note' }, t('detailHint'), '·', t('orderNote')),
        )
      } else {
        body = null
      }

      if (view === 'matrix') {
        body = h(MatrixView, {
          refreshToken: matrixToken,
          onEditChecks: (task) => setChecksTask(task),
          onReplayCell: openReplayForCell,
          onCompare: (a, b) => {
            setAId(a)
            setBId(b)
            setView('compare')
            setExpanded(-1)
          },
          onImport: () => setImportOpen(true),
          t,
        })
      }

      return h(
        'div',
        { className: 'dal-root' },
        h('style', {}, CSS),
        h(
          'div',
          { className: 'dal-scroll' },
          h(
            'div',
            { className: 'dal-inner' },
            h(
              'header',
              { className: 'dal-head' },
              h(
                'div',
                { className: 'dal-head-main' },
                h('div', { className: 'dal-brand' }, h(GlyphFlask, { size: 22 })),
                h(
                  'div',
                  {},
                  h('h1', {}, t('title')),
                  h('p', { className: 'dal-sub' }, t('subtitle')),
                ),
              ),
              h(
                'div',
                { className: 'dal-actions' },
                h(
                  'div',
                  { className: 'dal-tabs' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: `dal-tab${view === 'compare' ? ' on' : ''}`,
                      onClick: () => setView('compare'),
                    },
                    t('tabCompare'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: `dal-tab${view === 'matrix' ? ' on' : ''}`,
                      onClick: () => setView('matrix'),
                    },
                    t('tabMatrix'),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dal-btn',
                    onClick: () => {
                      setReloadToken((value) => value + 1)
                      setMatrixToken((value) => value + 1)
                      void loadLibrary()
                    },
                    disabled: library.status === 'loading',
                  },
                  t('refresh'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dal-btn primary',
                    onClick: () => setImportOpen(true),
                  },
                  t('import'),
                ),
              ),
            ),
            notice === null ? null : h('div', { className: `dal-banner ${notice.kind}` }, notice.text),
            library.status === 'ready' && runs.length > 0 && view === 'compare'
              ? h(
                  'section',
                  { className: 'dal-pickers' },
                  h(RunPicker, {
                    role: 'a',
                    label: t('pickA'),
                    run: runA,
                    runs,
                    selectedId: aId,
                    otherId: bId,
                    onPick: setAId,
                    onDelete: deleteRun,
                    onReplay: openReplay,
                    pendingDelete,
                    setPendingDelete,
                    t,
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dal-swap',
                      title: t('swap'),
                      'aria-label': t('swap'),
                      onClick: swap,
                    },
                    h(GlyphSwap, {}),
                  ),
                  h(RunPicker, {
                    role: 'b',
                    label: t('pickB'),
                    run: runB,
                    runs,
                    selectedId: bId,
                    otherId: aId,
                    onPick: setBId,
                    onDelete: deleteRun,
                    onReplay: openReplay,
                    pendingDelete,
                    setPendingDelete,
                    t,
                  }),
                )
              : null,
            body,
            h(
              'div',
              { className: 'dal-note' },
              h('span', {}, t('footnote')),
              library.dir !== '' ? h('span', { className: 'mono' }, `${t('storeDir')} · ${library.dir}`) : null,
            ),
          ),
        ),
        importOpen ? h(ImportDialog, { onClose: () => setImportOpen(false), onCaptured, t }) : null,
        replayRequest === null
          ? null
          : h(ReplayDialog, {
              baseRun: replayRequest.run,
              initialModel: replayRequest.model,
              onClose: () => setReplayRequest(null),
              onDone: (job) => void onReplayDone(job),
              t,
            }),
        checksTask === null
          ? null
          : h(ChecksDialog, {
              task: checksTask,
              onClose: () => setChecksTask(null),
              onSaved: () => {
                setChecksTask(null)
                setMatrixToken((value) => value + 1)
                setNotice({ kind: '', text: t('checksSaved') })
              },
              t,
            }),
      )
    }

    function statusColor(status) {
      if (status === 'same') return 'state-success-primary'
      if (status === 'args') return 'state-warn-primary'
      if (status === 'result') return 'brand-primary'
      if (status === 'flip') return 'state-error-primary'
      return 'state-idle-primary'
    }

    function LabIcon({ size }) {
      const edge = typeof size === 'number' ? size : 18
      return h(GlyphFlask, { size: edge })
    }

    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, { zh: ZH, en: EN }),
        'agent-lab: dictionaries',
      )
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          { name: 'main', key: 'agent-lab', locale: NS, inject: () => ({}) },
          LabPage,
        ),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: 'agent-lab', order: 40, locale: NS, label: () => t('panel') },
          LabIcon,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
