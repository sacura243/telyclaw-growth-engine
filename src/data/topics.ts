import type { TopicSeed } from '../lib/types'

/**
 * Topic library.
 *
 * Every angle ships 3 versions per language, because the brief asks for
 * "每个角度生成至少 3 条不同版本的 X Post". Version 0 is the full argument,
 * version 1 is a different entry point to the same claim, version 2 is the
 * short form that survives a 280-character cut.
 */
export const TOPICS: TopicSeed[] = [
  {
    id: 'agent-memory',
    nameZh: 'Agent 记忆与上下文工程',
    nameEn: 'Agent memory & context engineering',
    blurb: '长上下文之后，大家开始认真处理"记住什么、忘掉什么"。',
    keywords: ['memory', 'context window', 'compaction', 'recall', 'retrieval', 'rag', 'long-term memory', 'forget'],
    relevance: 0.88,
    relevanceWhy: 'TelyClaw 的用户都在造 agent，记忆是他们的头号工程难题；我们能以"内容运营的记忆层"切入。',
    curve: [0.55, 0.7, 0.85, 1.05, 1.3, 1.9, 2.45],
    baseVolume: 8,
    brandAsset: 'TelyClaw 的「品牌记忆」：把历史爆款、语气、禁用词沉淀成可检索资产。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '这个赛道已经有主流叙事（"上下文越大越好"），反着说才有传播位。',
        templates: {
          en: [
            'Context window is not memory. You can hand an agent 200k tokens and it will still forget what the user told it on turn 9.\n\n{data}\n\nThe teams winning here are not the ones with the biggest window. They are the ones with a deletion policy.',
            'Every "agent memory" product is a vector database with a cron job and a pricing page.\n\n{data}\n\nThat is not an insult. It is a warning: if your memory layer cannot forget, you built a slower context window.',
            'Memory is a write problem, not a read problem. Everyone optimises recall. Almost nobody decides what to throw away.\n\n{data}',
          ],
          zh: [
            '上下文窗口不是记忆。你给 agent 20 万 token，它照样会忘了用户在第 9 轮说过的话。\n\n{data}\n\n真正跑赢的团队不是窗口最大的，是敢删东西的。',
            '现在所有「Agent 记忆」产品，本质都是向量库 + 定时任务 + 一张定价页。\n\n{data}\n\n这不是骂人，是提醒：记忆层如果不能遗忘，你只是造了个更慢的上下文窗口。',
            '记忆是写入问题，不是读取问题。所有人都在优化召回，几乎没人决定该扔掉什么。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '把抽象话题落到可复制的工程动作，适合做收藏型内容。',
        templates: {
          en: [
            'How we cut agent latency 38% without touching the model:\n\n1. moved memory writes off the hot path\n2. batched recall into one call per turn\n3. capped retrieved memories at 3, ranked by recency x usage\n\n{data}\n\nStep 3 was worth more than 1 and 2 combined.',
            'A memory system has 4 jobs. Most teams only build the third one:\n\n1. capture\n2. compress\n3. retrieve\n4. expire\n\n{data}\n\n#4 is where the quality actually lives.',
            'The eval that changed our memory design: we asked the agent what it knew about a user after 40 turns.\n\nIt recited the last 6. Nothing older survived compression.\n\n{data}',
          ],
          zh: [
            '不换模型，把 agent 延迟砍掉 38% 的三步：\n\n1. 记忆写入移出主链路\n2. 每轮召回合并成一次调用\n3. 召回上限压到 3 条，按「新旧 × 使用频次」排序\n\n{data}\n\n第 3 步的价值大于前两步之和。',
            '记忆系统有四件事，大部分团队只做了第三件：\n\n1. 采集\n2. 压缩\n3. 召回\n4. 过期\n\n{data}\n\n质量其实全在第 4 件上。',
            '改变我们记忆设计的那次测试：跑满 40 轮之后问 agent 还记得用户什么。\n\n它背出了最近 6 轮。更早的都在压缩时没了。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把公共话题翻译成 TelyClaw 的能力，且不硬广。',
        templates: {
          en: [
            'The same failure shows up in content ops: a brand writes 300 posts and remembers none of them.\n\n{data}\n\nWe treat past posts the way a good agent treats memory — retrieve 3, reuse the pattern, drop the rest.',
            'If your agent needs memory, your social team needs it too. Same three questions:\n\nwhat do we keep, what do we compress, what do we retire?\n\n{data}',
            'Every content team already has a memory layer. It is called a Google Doc nobody opens.\n\n{data}\n\nThe job is not storing history. It is making it retrievable at the moment of writing.',
          ],
          zh: [
            '内容运营踩的是同一个坑：一个品牌写了 300 条帖子，一条都没被记住。\n\n{data}\n\n我们处理历史内容的方式，和一个好 agent 处理记忆一样——召回 3 条，复用模式，其余丢掉。',
            '如果你的 agent 需要记忆，你的社交团队也需要。同样是三个问题：\n\n留什么、压什么、退什么？\n\n{data}',
            '每个内容团队都已经有一层记忆了，叫「没人打开的共享文档」。\n\n{data}\n\n要做的不是存历史，是让它在写作那一刻能被调出来。',
          ],
        },
      },
    ],
  },
  {
    id: 'vibe-coding',
    nameZh: 'Vibe Coding 与 AI 生成代码',
    nameEn: 'Vibe coding',
    blurb: '写代码不再是瓶颈，读代码成了瓶颈。',
    keywords: ['vibe coding', 'generated code', 'code review', 'no-code', 'prototype', 'diff', 'generated pr'],
    relevance: 0.74,
    relevanceWhy: '受众高度重合，但话题已进入饱和期，跟风容易被淹没。',
    curve: [0.85, 1.05, 1.4, 1.85, 1.65, 1.15, 0.85],
    baseVolume: 11,
    brandAsset: 'TelyClaw 自己就是用 vibe coding 造出来的，有第一手素材。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '话题热度在下滑，硬跟只会重复别人的话。用"瓶颈转移"的角度切。',
        templates: {
          en: [
            'Vibe coding did not remove the bottleneck. It moved it.\n\nWriting code: 20 minutes. Reading the diff: 3 hours.\n\n{data}\n\nThe skill that matters now is knowing which 20% of the diff is load-bearing.',
            'Hot take: the constraint on AI-generated code is not quality. It is review capacity.\n\n{data}\n\nWe are about to find out that senior engineers were always the bottleneck, and that was fine.',
            'Nobody talks about the new job: reading code you did not write and did not want to write.\n\n{data}',
          ],
          zh: [
            'Vibe coding 没有消灭瓶颈，它只是把瓶颈挪了个位置。\n\n写代码 20 分钟，读 diff 3 小时。\n\n{data}\n\n现在真正稀缺的能力，是判断这堆 diff 里哪 20% 是承重的。',
            '一个不太受欢迎的观点：AI 生成代码的约束不是质量，是评审产能。\n\n{data}\n\n我们很快会发现，高级工程师一直是瓶颈，而且这没什么不好。',
            '没人聊这个新工种：读那些你没写、也不想写的代码。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '用真实工时分布说话，比观点更难被反驳。',
        templates: {
          en: [
            'Shipped an internal tool in 4 hours with vibe coding. Here is where the 4 hours went:\n\n- 25 min: prompt + plan\n- 40 min: generation\n- 2h 10min: reading and deleting code I did not need\n- 45 min: wiring auth\n\n{data}\n\nThe deletion was the work.',
            'We replaced 3 no-code subscriptions with one generated app. Cost went from $147/mo to $0, maintenance went from zero to mine.\n\n{data}\n\nThat trade is worth it only if you will actually maintain it.',
            'Rule we now enforce on every generated PR: no more than 200 lines. Above that, review quality collapses and nobody admits it.\n\n{data}',
          ],
          zh: [
            '用 vibe coding 四小时上线了一个内部工具。四小时是这么花的：\n\n- 25 分钟：写需求 + 拆步骤\n- 40 分钟：生成\n- 2 小时 10 分：读代码、删掉我不需要的部分\n- 45 分钟：接权限\n\n{data}\n\n删代码才是真正的工作。',
            '我们用生成的一个应用替掉了三个 no-code 订阅。成本从每月 147 美元变成 0，维护成本从 0 变成我的。\n\n{data}\n\n这笔交易只有在你真的会去维护时才划算。',
            '现在每个生成的 PR 我们都卡一条：不超过 200 行。超过之后评审质量会塌，而且没人承认。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把"AI 生成 + 人工把关"的结构迁移到内容侧，正好是 TelyClaw 的产品形状。',
        templates: {
          en: [
            'We built TelyClaw the same way: AI drafts everything, a human owns the last 20%.\n\n{data}\n\nThe draft is cheap. The judgment is the product.',
            'Every AI content tool promises to write for you. The useful ones do the opposite: they write the first 80% so you can spend your attention on the 20% that decides whether it works.\n\n{data}',
            'The parallel nobody draws: vibe coding and AI content fail the same way — output looks finished before it is checked.\n\n{data}',
          ],
          zh: [
            'TelyClaw 就是这么造出来的：AI 起草全部，人负责最后 20%。\n\n{data}\n\n草稿是廉价的，判断力才是产品。',
            '所有 AI 内容工具都承诺替你写。真正有用的那些做的是相反的事：写完前 80%，让你把注意力全放在决定成败的 20% 上。\n\n{data}',
            '没人画的这条平行线：vibe coding 和 AI 内容死于同一种方式——产出看起来完成了，其实还没被检查过。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'mcp-ecosystem',
    nameZh: 'MCP 工具生态',
    nameEn: 'MCP & tool calling',
    blurb: '协议已经不是问题，权限、注册表、工具质量才是。',
    keywords: ['mcp', 'tool calling', 'mcp server', 'auth scoping', 'registry', 'endpoint', 'tool surface'],
    relevance: 0.81,
    relevanceWhy: 'MCP 是"产品被 agent 看见"的入口，和 TelyClaw 的分发命题直接相关。',
    curve: [0.45, 0.6, 0.8, 1.0, 1.35, 1.75, 2.15],
    baseVolume: 7,
    brandAsset: 'TelyClaw 未来可以暴露 MCP endpoint，让 agent 直接调用品牌内容资产。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '生态在爆发早期，此时下判断的传播成本最低。',
        templates: {
          en: [
            'MCP was never the hard part. Auth scoping is.\n\nWe run 11 MCP servers in production. The protocol took a weekend. Deciding which tool can touch which customer record took three weeks.\n\n{data}',
            'Every SaaS will ship an MCP endpoint in 2026. The ones that do not will be invisible to agents — and being invisible to agents is the new SEO problem.\n\n{data}',
            'The MCP server nobody writes: a good one for your own product.\n\n{data}',
          ],
          zh: [
            'MCP 从来不是难点，权限范围才是。\n\n我们在生产环境跑 11 个 MCP server。协议一个周末就搞定了，决定"哪个工具能碰哪条客户数据"花了三周。\n\n{data}',
            '2026 年每个 SaaS 都会发一个 MCP endpoint。不发的，会在 agent 眼里不存在——而在 agent 眼里不存在，是新的 SEO 问题。\n\n{data}',
            '所有人都没写的那个 MCP server：给你自己产品用的那个。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '带数字的对照实验最容易引发讨论和引用。',
        templates: {
          en: [
            'We A/B tested tool surface size on the same task:\n\n- 14 general tools: 61% completion\n- 3 focused tools: 83% completion\n\n{data}\n\nFewer, better tools beat a bigger toolbox. Every time.',
            'Our tool registry grew 6x in a month after MCP. Onboarding time grew with it: a new engineer needs 2 days to know which tool to call.\n\n{data}\n\nTool sprawl is a documentation problem until it becomes a quality problem.',
            'What actually broke in production: not the protocol, the retries. An agent retried a write tool 4 times and created 4 records.\n\n{data}\n\nIdempotency is not optional for agent-facing tools.',
          ],
          zh: [
            '同一个任务，我们对比了工具数量：\n\n- 14 个通用工具：完成率 61%\n- 3 个专用工具：完成率 83%\n\n{data}\n\n更少但更好的工具，每次都赢。',
            '上了 MCP 之后我们的工具目录一个月涨了 6 倍。新人上手时间跟着涨：现在要两天才知道该调哪个工具。\n\n{data}\n\n工具泛滥先是文档问题，然后变成质量问题。',
            '生产环境真正炸的不是协议，是重试。一个 agent 把写操作重试了 4 次，创建了 4 条记录。\n\n{data}\n\n面向 agent 的工具，幂等不是可选项。',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把 MCP 讨论拉回"分发"，这是 TelyClaw 的母题。',
        templates: {
          en: [
            'MCP is a distribution channel, not a feature.\n\n{data}\n\nIf an agent cannot call your product, your product does not exist in the agent economy. Same logic applies to your content.',
            'Every channel has the same shape: get discovered, get called, get trusted. MCP is the first two. Trust is still a human writing your copy.\n\n{data}',
            'We will spend 2026 shipping endpoints so agents can find us, and the same year learning that being found is not the same as being chosen.\n\n{data}',
          ],
          zh: [
            'MCP 是分发渠道，不是功能。\n\n{data}\n\nagent 调不到你的产品，你的产品在 agent 经济里就不存在。内容也一样。',
            '所有渠道的形状都一样：被发现、被调用、被信任。MCP 解决前两个，第三个还是靠人写的那段话。\n\n{data}',
            '2026 我们会花一整年发 endpoint 让 agent 找到我们，然后用同一年学会：被找到不等于被选中。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'growth-automation',
    nameZh: 'AI 自动化增长与冷启动',
    nameEn: 'AI growth automation & cold start',
    blurb: '零预算冷启动、自动化边界、人味儿的价值。量小但在加速。',
    keywords: ['cold start', 'growth', 'automation', 'signups', 'plg', 'loop', 'channel', 'funnel'],
    relevance: 0.96,
    relevanceWhy: '这是 TelyClaw 的母题本身，任何角度都能自然带出产品。',
    curve: [0.18, 0.22, 0.3, 0.5, 0.9, 1.65, 2.7],
    baseVolume: 4,
    brandAsset: 'TelyClaw 的定位就是"增长团队的 AI 同事"，话题即产品。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '量小、增速高，属于早期信号；此时定调，后面所有讨论都会引用你。',
        templates: {
          en: [
            'We automated 80% of our content ops and engagement went down.\n\nTurns out people can tell. The 20% we kept human was doing all the work.\n\n{data}\n\nAutomate the boring 80%, never the human 20%.',
            'If your growth stack has 9 tools and no thesis, you do not have growth. You have a tooling hobby.\n\n{data}',
            'Unpopular: most "AI growth" is just spam with better grammar.\n\n{data}\n\nThe tell is whether it can survive a reply.',
          ],
          zh: [
            '我们把 80% 的内容运营自动化了，互动反而掉了。\n\n人是看得出来的。真正起作用的是我们留下的那 20%。\n\n{data}\n\n自动化应该干掉无聊的 80%，永远别碰有人味儿的 20%。',
            '如果你的增长栈有 9 个工具却没有一个论点，你做的不是增长，是工具收藏。\n\n{data}',
            '不太好听：大部分「AI 增长」只是语法更好的垃圾邮件。\n\n{data}\n\n判断标准是它能不能接住一条回复。',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '零预算冷启动是长尾搜索话题，拆解型内容生命周期最长。',
        templates: {
          en: [
            'Cold start, $0 budget, 14 days. What actually moved:\n\n- 40 hand-written replies to people already complaining about the problem -> 6 signups, 2 paying\n- 1 teardown post -> 31 signups, 0 paying\n- 1 launch post -> 400 visits, 3 signups\n\n{data}\n\nQualified beats volume. Every time.',
            'The growth loop that finally worked, in one line: free tool -> shared output -> signup. It took 3 iterations because the first two had no shareable artifact.\n\n{data}',
            'We killed 6 of 9 channels after 30 days. The three that survived were the two we were embarrassed by and one we started as a joke.\n\n{data}',
          ],
          zh: [
            '零预算冷启动，14 天，真正有效的只有三件事：\n\n- 40 条手写回复，回给正在抱怨这个问题的人 → 6 个注册，2 个付费\n- 1 篇拆解长贴 → 31 个注册，0 付费\n- 1 条发布贴 → 400 次访问，3 个注册\n\n{data}\n\n精准永远打赢规模。',
            '终于跑通的那个增长环，一句话：免费工具 → 可分享的产出 → 注册。迭代了三次，因为前两版的产出没法分享。\n\n{data}',
            '30 天后我们砍掉了 9 个渠道里的 6 个。活下来的三个，两个是我们不好意思提的，一个当初是开玩笑做的。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把方法论直接落成 TelyClaw 的工作流，转化路径最短。',
        templates: {
          en: [
            'This is the exact loop TelyClaw runs: watch the accounts your buyers already read -> detect what is accelerating -> draft an angle only you can take -> human approves -> publish -> measure qualified engagement.\n\n{data}\n\nThe loop is boring. The compounding is not.',
            'Most content tools optimise for output. Output is not the constraint. Knowing which 3 of 40 topics deserve a post is the constraint.\n\n{data}',
            'The reason we built the ranking before the writer: a bad angle written perfectly still loses.\n\n{data}',
          ],
          zh: [
            'TelyClaw 跑的就是这个环：盯住你客户已经在读的账号 → 发现正在加速的话题 → 起草只有你能写的角度 → 人审核 → 发布 → 量 Qualified Engagement。\n\n{data}\n\n这个环很无聊，但复利不无聊。',
            '大部分内容工具优化的是产量。产量从来不是约束，从 40 个话题里挑出该写的那 3 个才是。\n\n{data}',
            '我们先做排序再做写作，原因很简单：角度错了，写得再好也是输。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'ai-pricing',
    nameZh: 'AI 产品定价与单位经济',
    nameEn: 'AI pricing & unit economics',
    blurb: '按席位定价在失效，credits 与用量计费回潮。',
    keywords: ['pricing', 'margin', 'credits', 'usage-based', 'unit economics', 'churn', 'per-seat'],
    relevance: 0.83,
    relevanceWhy: '目标客户都是 AI 产品创始人，定价是他们每周都在算的题。',
    curve: [0.9, 1.0, 0.95, 1.05, 1.0, 1.1, 0.95],
    baseVolume: 5,
    brandAsset: 'TelyClaw 可以出「内容成本 per qualified lead」的对照表。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '稳定话题，观点型内容比教程型更容易破圈。',
        templates: {
          en: [
            'Per-seat pricing breaks the moment one seat does the work of five people.\n\n{data}\n\nUsage-based is not coming back because it is better for you. It is coming back because per-seat stopped mapping to value.',
            'One runaway agent loop can cost more than a month of that customer revenue. If your pricing has no ceiling, your margin has no floor.\n\n{data}',
            'Your pricing page is a product surface. Most AI companies treat it like a legal document.\n\n{data}',
          ],
          zh: [
            '一个席位干五个人的活的那天，按席位定价就崩了。\n\n{data}\n\n用量计费回归，不是因为对你更有利，是因为席位不再对应价值。',
            '一个失控的 agent 循环，成本可能超过这个客户一个月的收入。定价没有上限，毛利就没有下限。\n\n{data}',
            '定价页是产品界面。大部分 AI 公司把它当法律文件写。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '带毛利率数字的复盘，收藏率高、可信度高。',
        templates: {
          en: [
            'Margin math from a real migration:\n\n$20/mo flat, heavy users -> 31% gross margin\ncredits, same users -> 68% gross margin\nsignups -12%, revenue +40%\n\n{data}\n\nThe 12% we lost were the users who were already unprofitable.',
            'We grandfather existing users for 12 months instead of raising prices. Cost: ~$8k. Estimated churn avoided: 3 accounts worth $41k ARR.\n\n{data}\n\nGrandfathering is cheaper than the story a price hike generates.',
            'The metric that changed our pricing: cost per successful task, not cost per token. Tokens made us optimise the wrong thing for two quarters.\n\n{data}',
          ],
          zh: [
            '一次真实迁移的毛利账：\n\n$20/月 包月，重度用户 → 毛利率 31%\n改成 credits，同样的用户 → 毛利率 68%\n注册 -12%，收入 +40%\n\n{data}\n\n掉的那 12%，本来就不赚钱。',
            '我们选择给老用户锁价 12 个月而不是直接涨。成本约 8 千美元，估算避免的流失是 3 个客户、4.1 万美元年费。\n\n{data}\n\n锁价比涨价引发的故事便宜。',
            '改变我们定价的那个指标：每个成功任务成本，不是每 token 成本。看 token 让我们两个季度都在优化错的东西。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把"单位经济"从产品延伸到获客成本，是 TelyClaw 的天然论点。',
        templates: {
          en: [
            'Everyone models inference cost per user. Almost nobody models cost per qualified conversation.\n\n{data}\n\nIf a $0.30 post produces one qualified reply, the CAC math changes completely.',
            'AI made content cheap, which made attention expensive. The pricing question for every content tool is now: are you selling volume or selection?\n\n{data}',
            'The unit that matters is not a post. It is a conversation with someone who could buy. Price against that and the whole tool stack reorganises.\n\n{data}',
          ],
          zh: [
            '所有人都在算每用户的推理成本，几乎没人在算「每次有效对话的成本」。\n\n{data}\n\n一条三毛钱的帖子换来一个精准回复，获客成本的账就完全不一样了。',
            'AI 让内容变便宜，于是注意力变贵。所有内容工具现在的定价问题都是：你卖的是产量，还是筛选？\n\n{data}',
            '该计价的最小单位不是一条帖子，是一次可能成交的对话。按这个计价，整个工具栈都会重排。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'open-weights',
    nameZh: '开源权重模型与自部署',
    nameEn: 'Open weights & self-hosting',
    blurb: '上一波热度在退，讨论重心从"能不能用"转向"合不合规"。',
    keywords: ['open weights', 'self-host', 'self-hosting', 'benchmark', 'compliance', 'deployment', 'local model'],
    relevance: 0.42,
    relevanceWhy: '与内容增长命题关联弱，强行参与只会稀释品牌调性。',
    curve: [0.7, 1.0, 1.6, 2.2, 1.4, 0.8, 0.55],
    baseVolume: 6,
    brandAsset: '无直接资产，建议只做转发或一句话评论。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '话题在退潮，适合低投入的一句话评论，不适合长文。',
        templates: {
          en: [
            'Open weights won the compliance argument, not the quality argument. Those are different markets and people keep mixing them up.\n\n{data}',
            'Self-hosting only pays off past a volume threshold. Below it you are not saving money, you are buying a hobby with a GPU bill.\n\n{data}',
            'The leaderboard is a marketing artifact. Your eval set is the only ranking that survives contact with users.\n\n{data}',
          ],
          zh: [
            '开源权重赢的是合规，不是质量。这是两个市场，大家一直在混着谈。\n\n{data}',
            '自部署只有过了某个量才划算。没到那个量，你不是在省钱，是在用显卡账单买一个爱好。\n\n{data}',
            '榜单是营销物料。只有你自己的 eval set 能活到跟真实用户接触之后。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '有数据支撑，但目标受众窄。',
        templates: {
          en: [
            'We benchmarked 4 open models on our own eval set. The public leaderboard order was wrong for our use case — by 11 points on the top two.\n\n{data}\n\nYour eval set is the only leaderboard that matters.',
            'Cost of self-hosting, honestly: 2xA100 reserved = $1,900/mo. Equivalent API spend at our volume = $2,400/mo. We broke even on month 7, after 4 months of engineering.\n\n{data}',
            'Local deployment stopped being a technical decision. It is a procurement checkbox — enterprises ask for it in the first call, before they ask about accuracy.\n\n{data}',
          ],
          zh: [
            '我们用自家 eval set 测了 4 个开源模型。公开榜单的排序在我们的场景里是错的，前两名差了 11 分。\n\n{data}\n\n只有你自己的 eval set 才算榜单。',
            '自部署的诚实成本：2 张 A100 预留实例每月 1,900 美元。同体量的 API 支出是每月 2,400 美元。第 7 个月打平，前面还投了 4 个月工程。\n\n{data}',
            '本地部署已经不是技术决策了，是采购清单上的一项。企业客户第一通电话就问，比问准确率还早。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '关联度低，只做类比，不做主张。',
        templates: {
          en: [
            'Self-hosting only pays off past a volume threshold. Content works the same way: below a certain cadence you are just buying a hobby.\n\n{data}',
            'The open-weights debate is really about control. So is every content decision: who decides what the brand says, a template or a person?\n\n{data}',
            'We keep learning the same lesson in different categories: the cheap option is only cheap if you count the labour.\n\n{data}',
          ],
          zh: [
            '自部署只有在过了某个量之后才划算。内容也一样，节奏不到某个线，你只是在买个爱好。\n\n{data}',
            '开源权重的争论本质是控制权。内容决策也是：谁说这句话，模板还是人？\n\n{data}',
            '我们在不同品类里反复学同一课：便宜方案只有在算上人力之后才便宜。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'eval-trust',
    nameZh: 'AI 输出可信度与 Eval',
    nameEn: 'Evals & trust',
    blurb: '引用、置信度、人类兜底——可信度正在变成产品功能。',
    keywords: ['eval', 'trust', 'citation', 'hallucination', 'override', 'confidence', 'accuracy'],
    relevance: 0.69,
    relevanceWhy: '和 TelyClaw 的 Human-in-the-loop 设计同源，可讲但非核心。',
    curve: [0.4, 0.5, 0.62, 0.8, 1.0, 1.22, 1.45],
    baseVolume: 5,
    brandAsset: 'TelyClaw 的审批流本身就是"人类兜底"的案例。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '中等热度、稳步上升，观点位还没被占满。',
        templates: {
          en: [
            'We added citations to every AI answer. Trust went up. Usage went down 9%.\n\nPeople did not want receipts. They wanted the answer.\n\n{data}',
            'The failure mode nobody tests: confidently wrong on questions the user cannot verify.\n\n{data}',
            'Your eval set is 6 weeks old. It is now scoring 12 points too high. Eval rot is the quietest way to ship a regression.\n\n{data}',
          ],
          zh: [
            '我们给每个 AI 回答加了引用。信任度上去了，使用率掉了 9%。\n\n用户不想要收据，他们想要答案。\n\n{data}',
            '没人测的那种失败：在用户无法验证的问题上，自信地答错。\n\n{data}',
            '你的 eval set 已经六周没更新了，现在它给出的分数虚高 12 分。eval 腐烂是最安静的线上退化方式。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '方法论型内容，适合建立专业度。',
        templates: {
          en: [
            'Cheapest eval harness we ever built: log every human override.\n\nSix weeks of overrides became a 400-case eval set that actually reflects how the product is used.\n\n{data}',
            'Trust is partly a latency problem. A 4-second answer with a spinner feels less reliable than a 1-second one, even at identical accuracy.\n\n{data}',
            'We shipped a confidence score and users ignored it. Then we changed it from 92% to "high confidence, 3 sources" and they started using it.\n\n{data}',
          ],
          zh: [
            '我们做过最便宜的 eval：把所有人工修改都记下来。\n\n六周的修改记录，变成 400 条真实场景的测试集。\n\n{data}',
            '信任有一部分是延迟问题。同样准确率下，转圈 4 秒的回答就是比 1 秒的不可信。\n\n{data}',
            '我们上线了置信度分数，用户完全不看。后来把「92%」改成「高置信，3 个来源」，他们开始用了。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '直接对应 TelyClaw 的审批与护栏设计。',
        templates: {
          en: [
            'Every AI content tool has the same trust problem: who is accountable for the post?\n\nOur answer is boring. A human approves. Every time.\n\n{data}',
            'Guardrails are not features. They are the reason a brand can let a machine touch its voice at all.\n\n{data}',
            'The most useful thing we built is not the writer. It is the button that says no.\n\n{data}',
          ],
          zh: [
            '所有 AI 内容工具都有同一个信任问题：这条帖子出事谁负责？\n\n我们的答案很无聊：人来审批。每一条。\n\n{data}',
            '护栏不是功能，是品牌敢让机器碰自己声音的前提。\n\n{data}',
            '我们做过最有用的东西不是写作器，是那个说"不"的按钮。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'build-in-public',
    nameZh: '创始人分发与 Build in Public',
    nameEn: 'Founder-led distribution',
    blurb: '创始人自己写，比五个人的内容团队更有效。',
    keywords: ['build in public', 'founder', 'distribution', 'audience', 'consistency', 'revenue', 'signup'],
    relevance: 0.9,
    relevanceWhy: 'TelyClaw 的用户就是"创始人即渠道"的践行者。',
    curve: [0.8, 0.86, 0.9, 0.95, 1.0, 1.02, 1.06],
    baseVolume: 6,
    brandAsset: 'TelyClaw 可以出「创始人内容 SOP」。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '稳定话题，靠判断力取胜而非时效。',
        templates: {
          en: [
            'Founder-led distribution beats a 5-person content team when the founder actually ships.\n\n{data}\n\nThe unfair advantage is not writing skill. It is being in the room where the decisions happen.',
            'Build in public works because it is the only channel where the product is the content.\n\n{data}',
            'Most founders do not have a content problem. They have a "nothing interesting happened this week" problem.\n\n{data}',
          ],
          zh: [
            '创始人自己下场分发，效果打赢五人内容团队——前提是他真的在做产品。\n\n{data}\n\n不公平优势不是文笔，是他在决策现场。',
            'Build in public 有效，是因为它是唯一一个「产品即内容」的渠道。\n\n{data}',
            '大部分创始人没有内容问题，他们的问题是「这周什么都没发生」。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '具体数字 + 反直觉结论，转发率高。',
        templates: {
          en: [
            'The post that got us 400 signups was a failure postmortem. Not the launch. Not the funding announcement.\n\n{data}\n\nPeople share honesty because it is scarce.',
            'Consistency beat virality for us: 40 mediocre weekly posts outperformed 2 hits by 3x on signups.\n\n{data}',
            'We tracked where every paying customer came from for 6 months. 61% from posts that took under 20 minutes to write.\n\n{data}',
          ],
          zh: [
            '给我们带来 400 个注册的那条帖子，是一次失败复盘。不是发布，不是融资。\n\n{data}\n\n人们转发真诚，是因为它稀缺。',
            '一致性打赢了爆款：40 条平庸的周更，在注册量上是 2 条爆款的 3 倍。\n\n{data}',
            '我们记了 6 个月每个付费客户的来源。61% 来自那些写了不到 20 分钟的帖子。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '把"创始人分发"变成产品卖点。',
        templates: {
          en: [
            'TelyClaw is not a ghostwriter. It is the thing that makes a founder able to post 5x/week without sounding like a content calendar.\n\n{data}',
            'A founder will not use a tool that writes in someone else voice. That is the whole product constraint.\n\n{data}',
            'The best content from a founder sounds like a DM, not a blog post. Everything we build optimises for that.\n\n{data}',
          ],
          zh: [
            'TelyClaw 不是代笔。它是让创始人能一周发五条、又不像内容日历的东西。\n\n{data}',
            '创始人不会用一个用别人语气说话的工具。这就是产品的全部约束。\n\n{data}',
            '创始人最好的内容读起来像私信，不像博客。我们做的一切都在往这个方向靠。\n\n{data}',
          ],
        },
      },
    ],
  },
  {
    id: 'agent-commerce',
    nameZh: 'Agent 支付与商业化',
    nameEn: 'Agent commerce',
    blurb: 'agent 还不会付钱，这是 agent 商业化的真正卡点。量极小、增速极高。',
    keywords: ['agent payment', 'checkout', 'spend limit', 'procurement', 'budget', 'commerce', 'receipts'],
    relevance: 0.58,
    relevanceWhy: '话题新颖度高但与当前产品阶段有距离，适合观察不适合主攻。',
    curve: [0.08, 0.12, 0.2, 0.32, 0.62, 1.15, 1.95],
    baseVolume: 3,
    brandAsset: '暂无，可做趋势观察输出。',
    angles: [
      {
        kind: 'hot-take',
        labelZh: '反共识观点',
        labelEn: 'Hot take',
        rationale: '极早期信号，量小但加速度最高，适合占位。',
        templates: {
          en: [
            'Agents cannot pay for things yet. That is the entire bottleneck for agent commerce, and nobody is fixing it because it is not a model problem.\n\n{data}',
            'We gave an agent a $50 budget and a card. It spent $47 on a subscription we did not need in 9 minutes.\n\n{data}\n\nAgent payments need spend limits and receipts, not better checkout.',
            'The first agent commerce product will be procurement, not shopping. Boring category, real budgets.\n\n{data}',
          ],
          zh: [
            'agent 还不会付钱。这就是 agent 商业化的全部卡点，而且没人修，因为它不是模型问题。\n\n{data}',
            '我们给了 agent 50 美元预算和一张卡。它 9 分钟花掉 47 块，买了个我们不需要的订阅。\n\n{data}\n\nagent 支付需要的是额度上限和收据，不是更好的结账流程。',
            '第一个跑起来的 agent 商业产品会是采购，不是购物。无聊的品类，真实的预算。\n\n{data}',
          ],
        },
      },
      {
        kind: 'teardown',
        labelZh: '拆解复盘',
        labelEn: 'Teardown',
        rationale: '用实验讲故事，短小好传播。',
        templates: {
          en: [
            'Ran an agent with a real card for a week. Three findings:\n\n1. it bought the same thing twice\n2. it never checked the receipt\n3. it ignored the budget after the first hour\n\n{data}',
            'We built a spend limit that actually held: per-transaction cap + daily cap + a human ping above $20. The ping is what made it usable.\n\n{data}',
            'Agent checkout fails at the same place every time: the confirm screen. Agents can fill forms, they cannot read intent.\n\n{data}',
          ],
          zh: [
            '让 agent 拿真卡跑了一周，三个发现：\n\n1. 同一件东西买了两次\n2. 从来不核对收据\n3. 一小时后就不看预算了\n\n{data}',
            '我们做了一个真的守得住的额度：单笔上限 + 每日上限 + 超过 20 美元就叫人。真正让它可用的是最后那条。\n\n{data}',
            'agent 结账每次都死在同一个地方：确认页。agent 会填表，但读不懂意图。\n\n{data}',
          ],
        },
      },
      {
        kind: 'product-angle',
        labelZh: '产品视角',
        labelEn: 'Product angle',
        rationale: '关联度低，只做类比，不做主张。',
        templates: {
          en: [
            'The first real agent commerce product will be procurement, not shopping. Boring category, real budgets.\n\n{data}\n\nSame reason B2B content beats consumer content on qualified engagement.',
            'Every agent workflow ends at a human approval step today. That is not a limitation, it is the product.\n\n{data}',
            'Autonomy is a budget question before it is a capability question. Same as content: how much can it spend before someone looks?\n\n{data}',
          ],
          zh: [
            '第一个真正跑起来的 agent 商业产品会是采购，不是购物。无聊的品类，真实的预算。\n\n{data}\n\n这也是 B2B 内容在有效互动上打赢 C 端内容的原因。',
            '今天每个 agent 工作流最后都停在一个「人来批」的环节。那不是缺陷，那就是产品。\n\n{data}',
            '自主性首先是预算问题，然后才是能力问题。内容也一样：它能花多少，才需要有人看一眼？\n\n{data}',
          ],
        },
      },
    ],
  },
]

export const TOPIC_BY_ID: Record<string, TopicSeed> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t]),
)
