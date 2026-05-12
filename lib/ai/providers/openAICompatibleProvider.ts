import {
  AssetInput,
  GeneratedAsset,
  GeneratedScript,
  GeneratedStoryboard,
  ProjectContext
} from "@/lib/ai/types";

const ASSET_TYPES = ["role", "scene", "prop", "voice", "music"] as const;

type AssetType = (typeof ASSET_TYPES)[number];

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  timeoutMs: number;
};

export class AIProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderConfigurationError";
  }
}

export function isAIProviderConfigurationError(error: unknown) {
  return error instanceof AIProviderConfigurationError;
}

function getConfig(): ProviderConfig {
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();

  if (!apiKey) {
    throw new AIProviderConfigurationError("缺少 AI_API_KEY，无法调用 OpenAI 兼容文本模型");
  }
  if (!model) {
    throw new AIProviderConfigurationError("缺少 AI_MODEL，无法调用 OpenAI 兼容文本模型");
  }

  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model,
    temperature: Number(process.env.AI_TEMPERATURE || 0.7),
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000)
  };
}

function asText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.map((item) => asText(item)).filter(Boolean);
  return items.length ? items : fallback;
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function extractIdeaKeywords(idea: string) {
  const normalized = idea
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized
    .split(/一个|一位|一名|这个|那个|在|里|中|的|了|和|与|把|被|为|从|到|找回|寻找|丢失|失去|关于|故事|短片|创意|必须|需要/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  const keywords = new Set<string>();

  for (const part of parts) {
    keywords.add(part);
    if (/[\u4e00-\u9fff]/.test(part)) {
      for (let index = 0; index < part.length - 1; index += 1) {
        const slice = part.slice(index, index + 2);
        if (!/^(主人|角色|城市|生日|故事)$/.test(slice)) {
          keywords.add(slice);
        }
      }
    }
  }

  return [...keywords].filter((keyword) => keyword.length >= 2).slice(0, 16);
}

function assertContentMatchesIdea(content: string, idea: string) {
  const keywords = extractIdeaKeywords(idea);
  if (!keywords.length) {
    return;
  }

  const hitCount = keywords.filter((keyword) => content.includes(keyword)).length;
  if (hitCount < Math.min(2, keywords.length)) {
    throw new Error(`剧本没有回应用户创意关键词，请重写并显式包含这些核心元素：${keywords.slice(0, 6).join("、")}`);
  }
}

function parseDurationTarget(value?: string) {
  const match = value?.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) {
    return { min: 6, max: 10 };
  }

  const total = Math.max(20, Math.min(180, Number(match[2]) || 60));
  const perShot = Math.max(5, Math.min(12, Math.round(total / 6)));
  return { min: Math.max(4, perShot - 2), max: Math.min(15, perShot + 3) };
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("模型输出不是 JSON 对象");
  }

  return JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>;
}

async function callChat(messages: ChatMessage[]) {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        response_format: { type: "json_object" },
        messages
      }),
      signal: controller.signal
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!response.ok) {
      throw new Error(data.error?.message || `AI 请求失败：HTTP ${response.status}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 响应缺少 message.content");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson<T>(
  taskName: string,
  messages: ChatMessage[],
  normalize: (value: Record<string, unknown>) => T
) {
  const firstRaw = await callChat(messages);

  try {
    return normalize(extractJson(firstRaw));
  } catch (firstError) {
    const repairRaw = await callChat([
      {
        role: "system",
        content:
          "你是 JSON 修复器。只返回一个合法 JSON 对象，不要输出解释、Markdown 或代码块。必须保留原始语义并补齐缺失字段。"
      },
      {
        role: "user",
        content: [
          `任务：${taskName}`,
          `校验错误：${firstError instanceof Error ? firstError.message : "未知错误"}`,
          "原始任务提示：",
          messages.map((message) => `${message.role}: ${message.content}`).join("\n\n"),
          "原始输出：",
          firstRaw
        ].join("\n")
      }
    ]);

    return normalize(extractJson(repairRaw));
  }
}

function projectBrief(project?: ProjectContext) {
  return [
    `项目名称：${project?.title || "未命名"}`,
    `作品类型：${project?.type || "短视频"}`,
    `画幅比例：${project?.aspectRatio || "9:16"}`,
    `目标时长：${project?.durationTarget || "30-60s"}`,
    `风格预设：${project?.stylePreset || "电影感国漫"}`
  ].join("\n");
}

function normalizeScript(value: Record<string, unknown>, idea: string, project?: ProjectContext): GeneratedScript {
  const title = asText(value.title, project?.title || "创意短片");
  const episodeTitle = asText(value.episodeTitle, "第一集");
  const logline = asText(value.logline, idea);
  const theme = asText(value.theme, `围绕“${idea}”展开人物选择、冲突升级和情绪收束。`);
  const plot = asObject(value.plot);
  const characters = Array.isArray(value.characters) ? value.characters.map(asObject).filter((item) => asText(item.name)) : [];
  const dialogues = Array.isArray(value.dialogues) ? value.dialogues.map(asObject).filter((item) => asText(item.line)) : [];
  const styleGuide = asStringArray(value.styleGuide, [project?.stylePreset || "画面风格统一，节奏清晰"]);

  if (!title || !logline || !characters.length) {
    throw new Error("剧本 JSON 缺少 title、logline 或 characters");
  }

  const characterLines = characters
    .slice(0, 6)
    .map((character, index) => {
      const name = asText(character.name, `角色${index + 1}`);
      const role = asText(character.role, "主要角色");
      const description = asText(character.description, "与核心创意强相关的人物。");
      const arc = asText(character.arc, "在故事推进中完成一次清晰变化。");
      return `${index + 1}. ${name}：${role}，${description}人物变化：${arc}`;
    })
    .join("\n");

  const dialogueLines = dialogues
    .slice(0, 8)
    .map((dialogue) => `${asText(dialogue.speaker, "角色")}：“${asText(dialogue.line)}”`)
    .join("\n");

  const scriptContent = `《${title}》${episodeTitle}

一句话卖点：
${logline}

主题定位：
${theme}

主要角色：
${characterLines}

剧情结构：
开端：${asText(plot.opening, "用一个强画面动作抛出主角目标和世界状态。")}

发展：${asText(plot.development, "主角尝试行动，外部阻力和内部犹豫同步升级。")}

转折：${asText(plot.turningPoint, "一个意外发现改写主角对问题的判断。")}

高潮：${asText(plot.climax, "主角做出关键选择，并用行动解决核心冲突。")}

结尾：${asText(plot.ending, "留下清晰情绪余韵，并完成主题表达。")}

关键对白：
${dialogueLines || "旁白：“真正的答案，藏在主角最后的选择里。”"}

风格约束：
${styleGuide.map((item) => `- ${item}`).join("\n")}`;

  assertContentMatchesIdea(scriptContent, idea);

  return {
    originalIdea: idea,
    scriptContent,
    version: 1,
    status: "generated"
  };
}

function normalizeAssets(value: Record<string, unknown>, scriptContent: string, project?: ProjectContext) {
  const rawAssets = Array.isArray(value.assets) ? value.assets.map(asObject) : [];
  const style = project?.stylePreset || "电影感国漫";
  const assets = rawAssets
    .map((asset): GeneratedAsset | null => {
      const assetType = asText(asset.assetType) as AssetType;
      if (!ASSET_TYPES.includes(assetType)) {
        return null;
      }

      const name = asText(asset.name);
      if (!name) {
        return null;
      }

      const description = asText(asset.description, `${name} 是从剧本中提取的${assetType}资产。`);
      return {
        assetType,
        name,
        description,
        prompt: asText(asset.prompt, `${style}，${name}，${description}，角色/场景设定清晰，适合动画生产`),
        imageUrl: null,
        audioUrl: null,
        metadataJson: asObject(asset.metadataJson),
        status: "ready"
      };
    })
    .filter((asset): asset is GeneratedAsset => Boolean(asset));

  const assetTypes = new Set(assets.map((asset) => asset.assetType));
  if (assets.length < 4 || !assetTypes.has("role") || !assetTypes.has("scene")) {
    throw new Error(`资产 JSON 不完整，无法覆盖角色和场景：${compactText(scriptContent, 120)}`);
  }

  return assets.slice(0, 12);
}

function normalizeStoryboards(
  value: Record<string, unknown>,
  scriptContent: string,
  assets: AssetInput[],
  project?: ProjectContext
) {
  const rawStoryboards = Array.isArray(value.storyboards) ? value.storyboards.map(asObject) : [];
  const { min, max } = parseDurationTarget(project?.durationTarget);
  const roleNames = assets.filter((asset) => asset.assetType === "role").map((asset) => asset.name);
  const storyboards = rawStoryboards
    .map((shot, index): GeneratedStoryboard | null => {
      const visualDescription = asText(shot.visualDescription);
      if (!visualDescription) {
        return null;
      }

      const characters = asStringArray(shot.charactersJson, roleNames.slice(0, 2));
      const duration = Math.max(min, Math.min(max, Number(shot.durationSeconds) || min));
      return {
        shotNo: Number(shot.shotNo) || index + 1,
        sceneName: asText(shot.sceneName, `镜头 ${index + 1}`),
        charactersJson: characters,
        visualDescription,
        dialogue: asText(shot.dialogue),
        cameraMovement: asText(shot.cameraMovement, "稳定推进，突出人物行动和情绪变化"),
        durationSeconds: duration,
        imagePrompt: asText(
          shot.imagePrompt,
          `${project?.stylePreset || "电影感国漫"}，${asText(shot.sceneName)}，${visualDescription}`
        ),
        imageUrl: null,
        videoUrl: null,
        status: "draft"
      };
    })
    .filter((shot): shot is GeneratedStoryboard => Boolean(shot))
    .slice(0, 12)
    .map((shot, index) => ({ ...shot, shotNo: index + 1 }));

  if (storyboards.length < 4) {
    throw new Error(`分镜 JSON 不足 4 条，无法承载剧本：${compactText(scriptContent, 120)}`);
  }

  return storyboards;
}

export const openAICompatibleProvider = {
  providerLabel() {
    const model = process.env.AI_MODEL?.trim() || "unknown-model";
    return `openai-compatible:${model}`;
  },

  async generateScript(input: { idea: string; project?: ProjectContext }) {
    const idea = input.idea.trim();
    return requestJson("生成剧本", [
      {
        role: "system",
        content:
          "你是中文动画短片编剧。必须根据用户创意生成全新内容，不要复用固定示例、反诈模板或任何与用户创意无关的情节。只返回 JSON 对象。"
      },
      {
        role: "user",
        content: `请根据以下信息生成剧本 JSON。

${projectBrief(input.project)}

用户创意：
${idea}

返回字段：
{
  "title": "片名，若项目名称与创意不一致，以创意为准",
  "episodeTitle": "第一集：具体集名",
  "logline": "一句话卖点",
  "theme": "主题定位",
  "characters": [{"name":"角色名","role":"角色功能","description":"外观、性格、动机","arc":"变化"}],
  "plot": {"opening":"开端","development":"发展","turningPoint":"转折","climax":"高潮","ending":"结尾"},
  "dialogues": [{"speaker":"说话人","line":"关键台词"}],
  "styleGuide": ["风格约束"]
}`
      }
    ], (value) => normalizeScript(value, idea, input.project));
  },

  async extractAssetsFromScript(input: { scriptContent: string; project?: ProjectContext }) {
    return requestJson("提取资产", [
      {
        role: "system",
        content:
          "你是动画制作资产拆解师。只从剧本内容提取资产，不要新增与剧本无关的固定示例。只返回 JSON 对象。"
      },
      {
        role: "user",
        content: `请从剧本中提取制作资产 JSON。

${projectBrief(input.project)}

剧本：
${input.scriptContent}

返回字段：
{
  "assets": [
    {
      "assetType": "role|scene|prop|voice|music",
      "name": "资产名称",
      "description": "用于制作的一句话描述",
      "prompt": "图像/声音生成提示词",
      "metadataJson": {"storyFunction":"剧情功能"}
    }
  ]
}

要求：至少包含 1 个 role、1 个 scene，并尽量包含 prop、voice、music。`
      }
    ], (value) => normalizeAssets(value, input.scriptContent, input.project));
  },

  async generateStoryboard(input: { scriptContent: string; assets: AssetInput[]; project?: ProjectContext }) {
    return requestJson("生成分镜", [
      {
        role: "system",
        content:
          "你是动画分镜导演。必须根据剧本和资产生成可执行镜头，不要复用固定示例或反诈分镜。只返回 JSON 对象。"
      },
      {
        role: "user",
        content: `请生成 4-12 条分镜 JSON。

${projectBrief(input.project)}

剧本：
${input.scriptContent}

资产：
${JSON.stringify(input.assets.map((asset) => ({ name: asset.name, assetType: asset.assetType })), null, 2)}

返回字段：
{
  "storyboards": [
    {
      "shotNo": 1,
      "sceneName": "场景/镜头名",
      "charactersJson": ["角色名"],
      "visualDescription": "画面描述",
      "dialogue": "台词或旁白，可为空",
      "cameraMovement": "运镜",
      "durationSeconds": 6,
      "imagePrompt": "图片生成提示词"
    }
  ]
}`
      }
    ], (value) => normalizeStoryboards(value, input.scriptContent, input.assets, input.project));
  }
};
