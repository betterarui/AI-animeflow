import { AssetInput, GeneratedAsset, GeneratedScript, GeneratedStoryboard, ProjectContext, StoryboardInput } from "@/lib/ai/types";

const defaultIdea = "一个普通人在关键一天遇到意外机会，必须做出选择并完成成长。";

const namePool = ["阿澈", "小禾", "林遥", "星野", "安安", "墨白", "南栀", "小满", "晴川", "洛宁"];
const companionPool = ["岚岚", "圆圆", "启明", "阿蓝", "白露", "小舟", "可可", "青芽", "塔塔", "夏一"];
const obstaclePool = ["旧规则", "误解", "失控系统", "时间限制", "隐藏对手", "内心犹豫", "突发风暴", "家族约定"];

type PlotSection = {
  label: string;
  text: string;
};

function cleanIdea(idea?: string) {
  return idea?.trim() || defaultIdea;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

function compact(value: string, length: number) {
  const text = value.replace(/\s+/g, "").replace(/[《》「」“”"'，。！？、：；,.!?;:]/g, "");
  if (!text) {
    return "新故事";
  }
  return text.length > length ? text.slice(0, length) : text;
}

function hasLegacyDefault(project?: ProjectContext) {
  return !project?.title || (project.title.includes("反诈") && project.title.includes("守护"));
}

function inferTone(idea: string, project?: ProjectContext) {
  const source = `${idea} ${project?.stylePreset || ""}`;
  if (/科幻|星球|宇宙|机器人|赛博|未来/.test(source)) {
    return {
      genre: "科幻冒险",
      world: "霓虹与机械光交织的未来城市",
      prop: "发光核心装置",
      theme: "在技术和情感之间找到真正的方向"
    };
  }
  if (/魔法|奇幻|精灵|龙|异世界|森林/.test(source)) {
    return {
      genre: "奇幻成长",
      world: "被古老传说守护的奇幻小镇",
      prop: "会回应心愿的旧徽章",
      theme: "相信善意，也学会承担选择的代价"
    };
  }
  if (/悬疑|侦探|谜|案件|推理/.test(source)) {
    return {
      genre: "悬疑解谜",
      world: "雨夜灯牌闪烁的街区",
      prop: "留下线索的旧照片",
      theme: "在混乱线索中守住判断和信任"
    };
  }
  if (/治愈|家庭|朋友|校园|温暖|日常/.test(source)) {
    return {
      genre: "治愈日常",
      world: "阳光柔和的街角与小屋",
      prop: "写满约定的便签本",
      theme: "用一次小小行动修复关系"
    };
  }

  return {
    genre: project?.type === "education" ? "知识成长短片" : "成长冒险",
    world: "充满生活细节和戏剧张力的近未来城市",
    prop: "象征目标的关键物件",
    theme: "在压力中找到勇气，并把创意变成行动"
  };
}

function deriveTitle(idea: string, project?: ProjectContext) {
  if (!hasLegacyDefault(project)) {
    return project?.title || "创意短片";
  }

  const titleCore = compact(idea, 8);
  return `${titleCore}物语`;
}

function deriveRoleNames(idea: string) {
  const seed = hashText(idea);
  return {
    protagonist: pick(namePool, seed),
    companion: pick(companionPool, seed + 3),
    obstacle: pick(obstaclePool, seed + 7)
  };
}

function parseDurationTarget(value?: string) {
  const match = value?.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) {
    return 7;
  }
  const max = Number(match[2]) || 60;
  return Math.max(5, Math.min(12, Math.round(max / 6)));
}

function extractRoleNames(scriptContent: string) {
  const matches = [...scriptContent.matchAll(/^\d+\.\s*([^：:\n]+)[：:]/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  return matches.length ? matches.slice(0, 4) : ["主角", "伙伴"];
}

function extractPlotSections(scriptContent: string): PlotSection[] {
  const labels = ["开端", "发展", "转折", "高潮", "结尾"];
  return labels.map((label) => {
    const pattern = new RegExp(`${label}：([\\s\\S]*?)(?=\\n\\n(?:发展|转折|高潮|结尾|关键对白|风格约束)：|$)`);
    const text = scriptContent.match(pattern)?.[1]?.trim();
    return {
      label,
      text: text || `${label}围绕核心创意继续推进人物行动。`
    };
  });
}

function firstSentence(value: string, fallback: string) {
  const sentence = value.split(/[。！？\n]/).map((item) => item.trim()).find(Boolean);
  return sentence || fallback;
}

function roleAssetsFromScript(scriptContent: string, style: string): GeneratedAsset[] {
  const roleMatches = [...scriptContent.matchAll(/^\d+\.\s*([^：:\n]+)[：:]\s*([^\n]+)/gm)];
  const roles = roleMatches.length ? roleMatches.slice(0, 4) : [["", "主角", "围绕创意行动并完成成长。"]];

  return roles.map((match) => {
    const name = Array.isArray(match) ? match[1].trim() : "主角";
    const description = Array.isArray(match) ? match[2].trim() : "围绕创意行动并完成成长。";
    return {
      assetType: "role",
      name,
      description,
      prompt: `${style}，${name}，${description}，多角度角色设定图，表情和服装特征清晰`,
      imageUrl: null,
      audioUrl: null,
      metadataJson: { source: "script", storyFunction: "character" },
      status: "ready"
    };
  });
}

export const mockProvider = {
  generateScript(input: { idea: string; project?: ProjectContext }): GeneratedScript {
    const idea = cleanIdea(input.idea);
    const title = deriveTitle(idea, input.project);
    const tone = inferTone(idea, input.project);
    const roles = deriveRoleNames(idea);
    const style = input.project?.stylePreset || tone.genre;

    return {
      originalIdea: idea,
      scriptContent: `《${title}》第一集：创意被点亮的那一天

一句话卖点：
${idea}

主题定位：
这是一支${tone.genre}，把“${idea}”转化成有角色目标、可视化冲突和明确情绪收束的短片。故事核心是${tone.theme}。

主要角色：
1. ${roles.protagonist}：主角，外表带有${style}的鲜明识别点，对“${compact(idea, 12)}”抱有强烈执念，但一开始缺少行动信心。人物变化：从被局势推着走，到主动选择并承担结果。
2. ${roles.companion}：伙伴，观察敏锐，常用轻松方式提醒主角看见另一种可能。人物变化：从旁观支持，到在关键时刻和主角并肩完成行动。
3. ${roles.obstacle}：阻力来源，不一定是单一反派，而是围绕目标制造压力的规则、误会或外部危机。人物变化：让主角看清真正要解决的问题。

剧情结构：
开端：${roles.protagonist}出现在${tone.world}，正准备实践“${compact(idea, 18)}”。一个突然出现的异常信号打乱计划，也把主角推到选择面前。

发展：${roles.companion}加入行动，两人尝试用最直接的方法解决问题，却发现${roles.obstacle}不断放大误会。${tone.prop}第一次出现，暗示真正的答案不在表面。

转折：主角追查${tone.prop}的来源时，发现危机其实和自己最初忽略的细节有关。${roles.protagonist}意识到，如果继续按原计划推进，会失去故事中最重要的人或目标。

高潮：在时间压力下，${roles.protagonist}放弃轻松取胜的路径，选择公开承担责任。${roles.companion}配合完成关键动作，${roles.obstacle}被重新定义，冲突迎来正面解决。

结尾：${tone.world}恢复明亮，${roles.protagonist}收起${tone.prop}，把这次经历变成下一段旅程的起点。镜头停在主角坚定的表情上，留下继续创作的余味。

关键对白：
${roles.protagonist}：“我以为答案在前面，其实它一直在我不敢面对的地方。”
${roles.companion}：“那就别绕路了，我们一起把它点亮。”
${roles.protagonist}：“这一次，我来承担选择。”
旁白：“真正的创意，不只是闪光的一瞬间，而是把它完成的人。”

风格约束：
- ${style}，画面围绕用户创意设计，不套用固定案例。
- 画幅保持 ${input.project?.aspectRatio || "9:16"}，镜头节奏适配 ${input.project?.durationTarget || "30-60s"}。
- 角色、道具、场景必须服务于“${compact(idea, 20)}”，避免出现与创意无关的固定素材。`,
      version: 1,
      status: "generated"
    };
  },

  extractAssetsFromScript(input: { scriptContent: string; project?: ProjectContext }): GeneratedAsset[] {
    const style = input.project?.stylePreset || "动画短片";
    const title = input.scriptContent.match(/《([^》]+)》/)?.[1] || input.project?.title || "创意短片";
    const roleAssets = roleAssetsFromScript(input.scriptContent, style);
    const plotSections = extractPlotSections(input.scriptContent);
    const sceneA = firstSentence(plotSections[0]?.text || "", `${title}的开场主场景`);
    const sceneB = firstSentence(plotSections[3]?.text || "", `${title}的高潮行动场景`);

    const assets: GeneratedAsset[] = [
      ...roleAssets,
      {
        assetType: "scene",
        name: `${title}开场场景`,
        description: sceneA,
        prompt: `${style}，${title}开场场景，${sceneA}，空间层次清晰，适合竖屏动画`,
        imageUrl: null,
        audioUrl: null,
        metadataJson: { source: "script", storyFunction: "opening" },
        status: "ready"
      },
      {
        assetType: "scene",
        name: `${title}高潮场景`,
        description: sceneB,
        prompt: `${style}，${title}高潮场景，${sceneB}，情绪张力强，适合关键镜头`,
        imageUrl: null,
        audioUrl: null,
        metadataJson: { source: "script", storyFunction: "climax" },
        status: "ready"
      },
      {
        assetType: "prop",
        name: `${title}核心道具`,
        description: "推动剧情转折的关键物件，承载主角目标和情绪变化。",
        prompt: `${style}，${title}核心道具，具有故事象征意义，适合作为镜头特写`,
        imageUrl: null,
        audioUrl: null,
        metadataJson: { source: "script", storyFunction: "turning-point" },
        status: "ready"
      },
      {
        assetType: "voice",
        name: `${title}旁白声线`,
        description: "清晰、有情绪推进感的中文旁白，用于串联开端、转折和结尾。",
        prompt: "clear emotional Mandarin narration, animated short, warm but cinematic",
        imageUrl: null,
        audioUrl: null,
        metadataJson: { source: "script", storyFunction: "narration" },
        status: "ready"
      },
      {
        assetType: "music",
        name: `${title}主题配乐`,
        description: "从好奇铺垫到紧张推进，再到明亮收束的短片配乐。",
        prompt: "animated short soundtrack, curious opening, rising tension, hopeful ending",
        imageUrl: null,
        audioUrl: null,
        metadataJson: { source: "script", storyFunction: "music" },
        status: "ready"
      }
    ];

    return assets.slice(0, 12);
  },

  generateStoryboard(input: { scriptContent: string; assets: AssetInput[]; project?: ProjectContext }): GeneratedStoryboard[] {
    const style = input.project?.stylePreset || "动画短片";
    const roles = input.assets.filter((asset) => asset.assetType === "role").map((asset) => asset.name);
    const scenes = input.assets.filter((asset) => asset.assetType === "scene").map((asset) => asset.name);
    const plotSections = extractPlotSections(input.scriptContent);
    const duration = parseDurationTarget(input.project?.durationTarget);

    return plotSections.map((section, index) => {
      const sceneName = scenes[index % Math.max(1, scenes.length)] || `${section.label}场景`;
      const activeRoles = roles.length ? roles.slice(0, Math.min(2, roles.length)) : ["主角"];
      const visual = firstSentence(section.text, `${section.label}推进核心剧情。`);

      return {
        shotNo: index + 1,
        sceneName: `${sceneName} / ${section.label}`,
        charactersJson: activeRoles,
        visualDescription: visual,
        dialogue: section.label === "结尾" ? "旁白：真正的创意，是把闪光的一瞬间完成。" : "",
        cameraMovement:
          index === 0
            ? "缓慢推进建立环境，再切入主角动作"
            : index === plotSections.length - 1
              ? "跟随主角动作后上摇或拉远，形成情绪收束"
              : "中景跟拍人物行动，关键细节用快速特写强调",
        durationSeconds: duration,
        imagePrompt: `${style}，${sceneName}，${visual}，角色：${activeRoles.join("、")}，竖屏动画分镜，构图清晰`,
        imageUrl: null,
        videoUrl: null,
        status: "draft"
      };
    });
  },

  generateImage(input: { storyboards: StoryboardInput[] }) {
    return input.storyboards.map((shot) => ({
      storyboardId: shot.id,
      imageUrl: shot.imageUrl || null,
      status: shot.imageUrl ? "image_ready" : "image_prompt_ready"
    }));
  },

  generateVideo(_input?: { storyboards?: StoryboardInput[] }) {
    return [];
  },

  reviewStoryboard(input: { storyboards: StoryboardInput[] }) {
    const count = input.storyboards.length;
    const avgDuration = count
      ? input.storyboards.reduce((sum, shot) => sum + shot.durationSeconds, 0) / count
      : 0;
    const emptyVisual = input.storyboards.filter((shot) => !shot.visualDescription?.trim()).length;
    const emptyPrompt = input.storyboards.filter((shot) => !shot.imagePrompt?.trim()).length;
    const score = count < 4 ? 62 : emptyVisual || emptyPrompt ? 72 : avgDuration > 15 ? 78 : 90;
    const riskLevel = score >= 80 ? "low" : score >= 65 ? "medium" : "high";

    return {
      score,
      riskLevel,
      targetType: "storyboards",
      targetId: null,
      dimensions: {
        compliance: riskLevel === "high" ? 66 : 92,
        plotLogic: score,
        shotContinuity: Math.max(0, score - 2),
        consistency: Math.min(100, score + 1),
        executability: score
      },
      issuesJson:
        riskLevel === "low"
          ? ["分镜数量、画面描述、运镜和时长基本完整，可以进入图片或视频生成。"]
          : [
              count < 4 ? "分镜数量不足，建议至少覆盖开端、发展、转折和结尾。" : "部分镜头的信息密度或转场动机还可以更清晰。",
              emptyPrompt ? "存在缺少图片提示词的镜头，建议补齐可执行的视觉描述。" : "建议检查每条镜头是否都服务于用户创意。"
            ],
      suggestionsJson:
        riskLevel === "low"
          ? ["可进入视频生成，建议保持角色、场景和核心道具在镜头中的连续性。"]
          : [
              "补齐每条分镜的画面、角色、运镜和图片提示词。",
              "将单条镜头控制在 5-12 秒，避免节奏过慢。",
              "确保结尾能回应创意中的核心目标或情绪。"
            ]
    };
  },

  exportFinalVideo(input: { project?: ProjectContext; storyboards: StoryboardInput[]; format?: string }) {
    const format = input.format || "mp4";
    return {
      format,
      status: "queued",
      summary: `准备合成 ${input.storyboards.length} 个动态创意视频片段。`
    };
  }
};
