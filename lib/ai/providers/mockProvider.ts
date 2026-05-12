type ProjectContext = {
  title?: string;
  type?: string;
  aspectRatio?: string;
  durationTarget?: string;
  stylePreset?: string;
};

type AssetInput = {
  name: string;
  assetType: string;
};

type StoryboardInput = {
  id?: string;
  shotNo: number;
  sceneName: string;
  visualDescription: string;
  dialogue?: string;
  durationSeconds: number;
};

const fanzhaImages = {
  livingRoom: "/assets/fanzha/场景1.jpg",
  xiaodai: "/assets/fanzha/角色1.jpg",
  scamFox: "/assets/fanzha/角色2.jpg",
  milkTeaShop: "/assets/fanzha/场景2.jpg"
};

const fanzhaVideos = [
  "/assets/fanzha/分镜1.mp4",
  "/assets/fanzha/分镜2.mp4",
  "/assets/fanzha/分镜3.mp4",
  "/assets/fanzha/分镜4.mp4"
];

const fallbackImages = [fanzhaImages.livingRoom, fanzhaImages.xiaodai, fanzhaImages.scamFox, fanzhaImages.milkTeaShop];

const defaultIdea =
  "呆萌小男孩小呆连续遇到红包链接和扫码领红包骗局，在关键一秒识破套路，记住陌生链接不乱点，不明二维码不扫描。";

const scriptBody = `主题定位：
以儿童和家庭反诈教育为核心，用轻松漫画风短视频展示“陌生红包链接”“扫码领福利”“不明二维码诱导”等常见骗局，让观众在简单故事中学会：不乱点链接、不随便扫码、不轻信免费福利、遇到可疑情况及时停止操作。

主要角色：
1. 小呆：穿蓝色小熊卫衣的小男孩，性格呆萌、好奇，容易被红包和福利吸引，但关键时刻能清醒判断，主动拒绝风险操作。
2. 诈骗精：狐狸形象，穿紫色马甲，表情狡猾夸张，躲在广告牌后诱导小呆扫码，代表生活中常见的网络诈骗和扫码陷阱。

剧情结构：
开端：晚上，小呆坐在暖黄色客厅里刷手机。手机突然“叮”一声亮起，屏幕弹出一个红包图标，提示他点击领取。小呆眼睛发亮，伸手准备点开链接。
就在指尖快碰到屏幕时，手机弹出蓝色盾牌气泡。小呆一愣，立刻收回手，清醒地摇头说：“不对！陌生链接不乱点！”

发展：小呆锁屏起身出门。画面从暖黄客厅滑动转场到街道，整体色调逐渐转冷。小呆路过街角奶茶店，被门口的广告牌吸引。
广告牌上写着“扫码领红包，秒到账”。这时，诈骗精从广告牌后探出头，露出坏笑，诱导小呆：“用手机扫一下，红包秒到账～”
小呆微微停顿，下意识重复：“用手机扫一下……”

转折：小呆掏出手机，对准广告牌上的二维码。镜头切到手机屏幕特写，二维码即将被识别。
就在这一刻，小呆瞳孔一缩，突然意识到不对。画面急速拉远并轻微晃动，小呆猛地收回手机，按下锁屏键，挺直背脊，眼神变得坚定。

高潮：小呆大声喊道：“停！不明二维码不扫描！”
诈骗精瞬间崩溃，双手抱头大喊：“啊——我的业绩！”随后像泄了气一样蔫成毛球，从画面一侧滚出。
小呆摆摆手，大步离开，成功避开扫码陷阱。

结尾：镜头仰拍小呆离开的背影，并缓缓上摇到天空。彩色标语从天而降，正能量音乐进入高潮。
旁白响起：“反诈口诀刻心里，守住钱袋笑嘻嘻！”
画面定格在反诈标语上：陌生链接不乱点，不明二维码不扫描，反诈口诀刻心里，守住钱袋笑嘻嘻。

关键对白：
小呆：“不对！陌生链接不乱点！”
诈骗精：“用手机扫一下，红包秒到账～”
小呆：“用手机扫一下……”
小呆：“停！不明二维码不扫描！”
诈骗精：“啊——我的业绩！”
旁白：“反诈口诀刻心里，守住钱袋笑嘻嘻！”`;

const storyboards = [
  {
    shotNo: 1,
    sceneName: "居家客厅 / 陌生红包链接",
    charactersJson: ["小呆"],
    visualDescription:
      "小呆在暖黄漫画风客厅刷手机，屏幕突然亮起红包图标。小呆眼睛发亮伸手准备点击，指尖悬停时手机弹出盾牌气泡，小呆一愣后猛地收回手。",
    dialogue: "小呆：不对！陌生链接不乱点！",
    cameraMovement: "俯拍缓推进入客厅氛围，快速推近手机屏幕，再切到小呆清醒摇头的表情",
    durationSeconds: 6,
    imagePrompt: "儿童反诈漫画风，暖黄色客厅，手机红包链接弹出，蓝色盾牌气泡，小呆及时停手",
    imageUrl: fanzhaImages.livingRoom,
    videoUrl: fanzhaVideos[0],
    status: "draft"
  },
  {
    shotNo: 2,
    sceneName: "客厅转街道 / 扫码诱导出现",
    charactersJson: ["小呆", "诈骗精"],
    visualDescription:
      "小呆锁屏起身，画面从客厅滑动转场到冷调街道和奶茶店。奶茶店门口广告牌吸引小呆注意，诈骗精从广告牌后探头坏笑，诱导小呆扫码领红包。",
    dialogue: "诈骗精：用手机扫一下，红包秒到账～ 小呆：用手机扫一下……",
    cameraMovement: "低角度跟拍小呆起身出门，滑动转场至奶茶店，镜头定格广告牌和诈骗精探头动作",
    durationSeconds: 11,
    imagePrompt: "儿童反诈漫画风，街角奶茶店，扫码领红包广告牌，狐狸诈骗精探头坏笑",
    imageUrl: fanzhaImages.milkTeaShop,
    videoUrl: fanzhaVideos[1],
    status: "draft"
  },
  {
    shotNo: 3,
    sceneName: "奶茶店门口 / 不明二维码识破",
    charactersJson: ["小呆", "诈骗精"],
    visualDescription:
      "小呆拿手机对准广告牌二维码，手机屏幕即将识别。小呆突然瞳孔一缩，猛地收回手机并锁屏，挺直背脊，坚定拒绝扫码。诈骗精当场崩溃。",
    dialogue: "小呆：停！不明二维码不扫描！ 诈骗精：啊——我的业绩！",
    cameraMovement: "手机屏幕特写对准二维码，随后急速拉远并轻微晃动，最后定格小呆锐利侧脸和诈骗精崩溃反应",
    durationSeconds: 10,
    imagePrompt: "儿童反诈漫画风，手机对准二维码，小呆突然警觉锁屏，狐狸诈骗精崩溃",
    imageUrl: fanzhaImages.milkTeaShop,
    videoUrl: fanzhaVideos[2],
    status: "draft"
  },
  {
    shotNo: 4,
    sceneName: "奶茶店外阳光下 / 反诈口诀收束",
    charactersJson: ["小呆", "诈骗精"],
    visualDescription:
      "小呆摆手大步离开，诈骗精像泄气一样蔫成毛球滚出画面。镜头上摇至天空，彩色反诈标语从天而降，完成正向收束。",
    dialogue: "旁白：反诈口诀刻心里，守住钱袋笑嘻嘻！",
    cameraMovement: "仰拍小呆背影慢推，切到诈骗精滚走，再上摇至天空，定格在反诈提醒画面",
    durationSeconds: 9,
    imagePrompt: "儿童反诈漫画风，奶茶店外阳光，小呆离开，诈骗精泄气滚走，彩色反诈标语",
    imageUrl: fanzhaImages.milkTeaShop,
    videoUrl: fanzhaVideos[3],
    status: "draft"
  }
];

function cleanIdea(idea: string) {
  return idea.trim() || defaultIdea;
}

function pick<T>(list: T[], index: number) {
  return list[index % list.length];
}

export const mockProvider = {
  generateScript(input: { idea: string; project?: ProjectContext }) {
    const idea = cleanIdea(input.idea);
    const title = input.project?.title || "全民反诈守护";
    const style = input.project?.stylePreset || "儿童反诈漫画短视频";

    return {
      originalIdea: idea,
      scriptContent: `《${title}》第一集：不明二维码不扫描

一句话卖点：
${idea}

${scriptBody}

风格约束：
${style}、暖黄客厅、街角奶茶店、呆萌主角、狐狸诈骗精、手机界面提示、红包图标、盾牌气泡、不明二维码、夸张表情、快速节奏、轻松反转、正向收束。
整体画面风格保持清新可爱、线条清晰、色彩明快。前半段客厅使用暖黄色调，营造日常安全感；转入街道和奶茶店后色调略微转冷，制造可疑氛围；识破骗局后回到明亮阳光色调，强化“反诈成功”的积极结尾。`,
      version: 1,
      status: "generated"
    };
  },

  extractAssetsFromScript(input: { scriptContent: string; project?: ProjectContext }) {
    const style = input.project?.stylePreset || "儿童反诈漫画短视频";
    return [
      {
        assetType: "role",
        name: "小呆",
        description: "穿蓝色小熊卫衣的小男孩，性格呆萌、好奇，容易被红包和福利吸引，但关键时刻能清醒判断并主动停止风险操作。",
        prompt: `${style}，小呆，蓝色小熊卫衣，呆萌小男孩，多角度角色设定图，清新可爱线条`,
        imageUrl: fanzhaImages.xiaodai,
        audioUrl: null,
        metadataJson: { consistencyKey: "role-xiaodai", warning: "陌生链接不乱点，不明二维码不扫描" },
        status: "ready"
      },
      {
        assetType: "role",
        name: "诈骗精",
        description: "狐狸形象，穿紫色马甲，表情狡猾夸张，躲在广告牌后诱导扫码，代表红包链接和二维码骗局。",
        prompt: `${style}，诈骗精，狐狸反派，紫色马甲，狡猾夸张表情，多角度角色设定图`,
        imageUrl: fanzhaImages.scamFox,
        audioUrl: null,
        metadataJson: { consistencyKey: "role-scam-fox", risk: "扫码领红包诱导" },
        status: "ready"
      },
      {
        assetType: "scene",
        name: "暖黄居家客厅",
        description: "晚上小呆刷手机的暖黄色客厅，茶几、沙发、手机亮屏和红包提示构成第一段陌生链接风险场景。",
        prompt: `${style}，暖黄色居家客厅，手机红包链接弹出，日常安全感，儿童反诈开场场景`,
        imageUrl: fanzhaImages.livingRoom,
        audioUrl: null,
        metadataJson: { lighting: "warm indoor", storyFunction: "陌生红包链接出现" },
        status: "ready"
      },
      {
        assetType: "scene",
        name: "街角奶茶店",
        description: "街角奶茶店门口摆着扫码领红包广告牌，是诈骗精诱导小呆扫描不明二维码的主要场景。",
        prompt: `${style}，街角奶茶店，扫码领红包广告牌，不明二维码，冷调可疑氛围`,
        imageUrl: fanzhaImages.milkTeaShop,
        audioUrl: null,
        metadataJson: { storyFunction: "扫码诱导与风险识别" },
        status: "ready"
      },
      {
        assetType: "prop",
        name: "红包链接与盾牌气泡",
        description: "手机弹出的红包图标和蓝色盾牌气泡，用来表现陌生链接诱惑与及时风险提醒。",
        prompt: `${style}，手机红包链接，蓝色盾牌气泡，网络安全提醒，陌生链接不乱点`,
        imageUrl: null,
        audioUrl: null,
        metadataJson: { warning: "陌生链接不乱点" },
        status: "ready"
      },
      {
        assetType: "prop",
        name: "扫码领红包广告牌",
        description: "奶茶店门口写着扫码领红包的广告牌，二维码诱导是本集骗局的关键道具。",
        prompt: `${style}，扫码领红包广告牌，不明二维码，街角奶茶店门口，儿童反诈关键道具`,
        imageUrl: null,
        audioUrl: null,
        metadataJson: { warning: "不明二维码不扫描" },
        status: "ready"
      },
      {
        assetType: "voice",
        name: "反诈口诀旁白",
        description: "清亮、轻松、有记忆点的儿童反诈旁白，用于收束口号：反诈口诀刻心里，守住钱袋笑嘻嘻。",
        prompt: "bright child-friendly anti-fraud narration, catchy public safety reminder",
        imageUrl: null,
        audioUrl: null,
        metadataJson: { mood: "positive", function: "anti-fraud reminder" },
        status: "ready"
      },
      {
        assetType: "music",
        name: "轻快反诈 BGM",
        description: "前半段轻松好奇，识破骗局时快速反转，结尾转为明亮正向的儿童反诈短视频配乐。",
        prompt: "upbeat cartoon public-safety music, playful suspense, positive ending, 100 bpm",
        imageUrl: null,
        audioUrl: null,
        metadataJson: { bpm: 100, mood: "playful and reassuring" },
        status: "ready"
      }
    ];
  },

  generateStoryboard(input: { scriptContent: string; assets: AssetInput[]; project?: ProjectContext }) {
    const roleNames = input.assets.filter((asset) => asset.assetType === "role").map((asset) => asset.name);
    const xiaodai = roleNames.find((name) => name.includes("小呆")) || "小呆";
    const scamFox = roleNames.find((name) => name.includes("诈骗精")) || "诈骗精";

    return storyboards.map((shot) => ({
      ...shot,
      charactersJson: shot.charactersJson.map((name) => (name === "小呆" ? xiaodai : name === "诈骗精" ? scamFox : name))
    }));
  },

  generateImage(input: { storyboards: StoryboardInput[] }) {
    return input.storyboards.map((shot, index) => ({
      storyboardId: shot.id,
      imageUrl: pick(fallbackImages, index),
      status: "image_ready"
    }));
  },

  generateVideo(input: { storyboards: StoryboardInput[] }) {
    return input.storyboards.map((shot, index) => ({
      storyboardId: shot.id,
      videoUrl: pick(fanzhaVideos, index),
      status: "video_ready"
    }));
  },

  reviewStoryboard(input: { storyboards: StoryboardInput[] }) {
    const count = input.storyboards.length;
    const avgDuration = count
      ? input.storyboards.reduce((sum, shot) => sum + shot.durationSeconds, 0) / count
      : 0;
    const emptyDialogue = input.storyboards.filter((shot) => !shot.dialogue?.trim()).length;
    const score = count < 4 ? 64 : emptyDialogue > 1 ? 72 : avgDuration > 14 ? 78 : 90;
    const riskLevel = score >= 80 ? "low" : score >= 65 ? "medium" : "high";

    return {
      score,
      riskLevel,
      targetType: "storyboards",
      targetId: null,
      dimensions: {
        compliance: riskLevel === "high" ? 65 : 94,
        plotLogic: score,
        shotContinuity: score - 1,
        consistency: score + 2,
        executability: score
      },
      issuesJson:
        riskLevel === "low"
          ? ["分镜顺序完整，陌生链接出现、扫码诱导、风险识破和口诀收束形成连续闭环。"]
          : [
              count < 4 ? "分镜数量不足，红包链接、扫码诱导、识破拒绝和安全提醒链路不够完整。" : "部分镜头转场动机需要更清晰。",
              emptyDialogue ? "存在缺少提示语的镜头，建议补充人物反应或反诈口诀。" : "可进一步强化不明二维码不扫描的动作节点。"
            ],
      suggestionsJson:
        riskLevel === "low"
          ? ["可进入视频生成，建议保持红包链接、盾牌气泡、不明二维码和反诈口诀的连续出现。"]
          : [
              "补齐陌生链接、扫码领红包、二维码识别和拒绝扫码四个关键提示。",
              "将每条分镜控制在 6-11 秒，保持儿童反诈短视频节奏。",
              "确保结尾明确给出可执行的反诈口诀。"
            ]
    };
  },

  exportFinalVideo(input: { project?: ProjectContext; storyboards: StoryboardInput[]; format?: string }) {
    const format = input.format || "mp4";
    return {
      fileUrl: `/assets/fanzha/成片.${format}`,
      format,
      status: "completed",
      summary: `已合成 ${input.storyboards.length} 个儿童反诈主题视频片段，包含陌生红包链接、扫码诱导、不明二维码识破和反诈口诀收束。`
    };
  }
};
