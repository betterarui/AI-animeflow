import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const media = {
  livingRoom: "/assets/fanzha/场景1.jpg",
  xiaodai: "/assets/fanzha/角色1.jpg",
  scamFox: "/assets/fanzha/角色2.jpg",
  milkTeaShop: "/assets/fanzha/场景2.jpg",
  videos: [
    "/assets/fanzha/分镜1.mp4",
    "/assets/fanzha/分镜2.mp4",
    "/assets/fanzha/分镜3.mp4",
    "/assets/fanzha/分镜4.mp4"
  ],
  finalVideo: "/assets/fanzha/成片.mp4"
};

const originalIdea =
  "呆萌小男孩小呆连续遇到红包链接和扫码领红包骗局，在关键一秒识破套路，记住陌生链接不乱点，不明二维码不扫描。";

const projectDefaults = {
  title: "全民反诈守护",
  description: originalIdea,
  type: "education",
  aspectRatio: "9:16",
  durationTarget: "30-60s",
  stylePreset: "儿童反诈漫画短视频",
  creationMode: "AI 协作",
  currentStep: "edit",
  status: "exported"
};

const scriptContent = `《全民反诈守护》第一集：不明二维码不扫描

一句话卖点：
呆萌小男孩小呆连续遇到“红包链接”和“扫码领红包”骗局，在关键一秒识破诈骗精套路，记住“陌生链接不乱点，不明二维码不扫描”。

主题定位：
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
旁白：“反诈口诀刻心里，守住钱袋笑嘻嘻！”

风格约束：
儿童反诈、漫画短视频、暖黄客厅、街角奶茶店、呆萌主角、狐狸诈骗精、手机界面提示、红包图标、盾牌气泡、不明二维码、夸张表情、快速节奏、轻松反转、正向收束。`;

const assets = [
  {
    assetType: "role",
    name: "小呆",
    description: "穿蓝色小熊卫衣的小男孩，性格呆萌、好奇，容易被红包和福利吸引，但关键时刻能清醒判断并主动拒绝风险操作。",
    prompt: "儿童反诈漫画短视频，小呆，蓝色小熊卫衣，呆萌小男孩，多角度角色设定图",
    imageUrl: media.xiaodai,
    metadataJson: { consistencyKey: "role-xiaodai", warning: "陌生链接不乱点，不明二维码不扫描" },
    status: "ready"
  },
  {
    assetType: "role",
    name: "诈骗精",
    description: "狐狸形象，穿紫色马甲，表情狡猾夸张，躲在广告牌后诱导小呆扫码，代表常见网络诈骗和扫码陷阱。",
    prompt: "儿童反诈漫画短视频，诈骗精，狐狸反派，紫色马甲，狡猾表情，多角度角色设定图",
    imageUrl: media.scamFox,
    metadataJson: { consistencyKey: "role-scam-fox", risk: "扫码领红包诱导" },
    status: "ready"
  },
  {
    assetType: "scene",
    name: "暖黄居家客厅",
    description: "晚上小呆刷手机的暖黄色客厅，茶几、沙发、手机亮屏和红包提示构成第一段陌生链接风险场景。",
    prompt: "儿童反诈漫画短视频，暖黄色居家客厅，手机红包链接弹出，蓝色盾牌气泡",
    imageUrl: media.livingRoom,
    metadataJson: { storyFunction: "陌生红包链接出现" },
    status: "ready"
  },
  {
    assetType: "scene",
    name: "街角奶茶店",
    description: "街角奶茶店门口摆着扫码领红包广告牌，是诈骗精诱导小呆扫描不明二维码的主要场景。",
    prompt: "儿童反诈漫画短视频，街角奶茶店，扫码领红包广告牌，不明二维码",
    imageUrl: media.milkTeaShop,
    metadataJson: { storyFunction: "扫码诱导与风险识别" },
    status: "ready"
  },
  {
    assetType: "prop",
    name: "红包链接与盾牌气泡",
    description: "手机弹出的红包图标和蓝色盾牌气泡，用来表现陌生链接诱惑与及时风险提醒。",
    prompt: "手机红包链接，蓝色盾牌气泡，陌生链接不乱点",
    imageUrl: null,
    metadataJson: { warning: "陌生链接不乱点" },
    status: "ready"
  },
  {
    assetType: "prop",
    name: "扫码领红包广告牌",
    description: "奶茶店门口写着扫码领红包的广告牌，二维码诱导是本集骗局的关键道具。",
    prompt: "扫码领红包广告牌，不明二维码，街角奶茶店门口",
    imageUrl: null,
    metadataJson: { warning: "不明二维码不扫描" },
    status: "ready"
  }
];

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
    imageUrl: media.livingRoom,
    videoUrl: media.videos[0],
    status: "video_ready"
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
    imageUrl: media.milkTeaShop,
    videoUrl: media.videos[1],
    status: "video_ready"
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
    imageUrl: media.milkTeaShop,
    videoUrl: media.videos[2],
    status: "video_ready"
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
    imageUrl: media.milkTeaShop,
    videoUrl: media.videos[3],
    status: "video_ready"
  }
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@animeflow.local" },
    create: {
      email: "demo@animeflow.local",
      passwordHash: "7b0378359d83a373bb2cd0af647d518c39ee29e67864620c921d40672221e257",
      nickname: "AnimeFlow 创作者"
    },
    update: {}
  });

  const legacyRainTitle = "\u96e8\u591c\u8ffd\u51f6";
  await prisma.project.deleteMany({ where: { title: legacyRainTitle } });
  await prisma.project.deleteMany({ where: { userId: user.id, title: projectDefaults.title } });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      ...projectDefaults,
      script: {
        create: {
          originalIdea,
          scriptContent,
          version: 1,
          status: "generated"
        }
      },
      assets: { create: assets },
      storyboards: { create: storyboards },
      reviewReports: {
        create: {
          targetType: "storyboards",
          score: 90,
          riskLevel: "low",
          issuesJson: ["分镜顺序完整，陌生链接出现、扫码诱导、风险识破和口诀收束形成连续闭环。"],
          suggestionsJson: ["可进入视频生成，建议保持红包链接、盾牌气泡、不明二维码和反诈口诀的连续出现。"]
        }
      },
      exports: {
        create: {
          fileUrl: media.finalVideo,
          format: "mp4",
          status: "completed"
        }
      }
    }
  });

  console.log(`fanzha demo project ready: ${project.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
