const stageConfig = {
  script: {
    title: "剧本创作 · 输入创意，智能生成完整剧本",
    checklist: [
      "梳理核心梗、故事梗概与一句话卖点",
      "补全人物小传并统一字段",
      "完成分集正文与段末视听钩子",
    ],
    reply: "已进入剧本创作阶段。作为你的AI漫剧导师，我会先帮你搭建剧情骨架，再逐步细化人物与冲突，稳步推进创作节奏喵~",
  },
  asset: {
    title: "资产打造 · 角色、场景、配乐可管理可复用",
    checklist: ["确认角色档案与服装道具清单", "补全场景风格和配乐素材库", "生成资产完整性检查报告"],
    reply: "已切换到资产打造阶段。作为专业AI漫剧制作者，建议你先锁定主角色形象和场景风格，再进行批量扩展喵~",
  },
  storyboard: {
    title: "分镜落地 · 镜头结构清晰，转场衔接自然",
    checklist: ["设置镜头景别、角度和运镜方式", "为每段生成台词、语气和时长", "自动产出转场提示词并给出示意"],
    reply: "已进入分镜阶段。我会按 3-8 镜头结构输出，兼顾叙事与节奏，帮助你保持专业导演级镜头语言喵~",
  },
  video: {
    title: "视频生成 · 低清预览后再生成高质量成片",
    checklist: ["先出关键帧或低清预览验证方向", "通过后自动合成配音、字幕与配乐", "支持按分镜重生并保留 diff"],
    reply: "已切换到视频生成阶段。建议你先做低清预览，确认后再生成高清版本，降低返工成本喵~",
  },
  edit: {
    title: "剪辑精修 · 拼接、调序、音量和导出一站完成",
    checklist: ["拖动调整镜头顺序与时长", "替换 BGM、调音量并检查音画同步", "导出完整视频或分镜分段"],
    reply: "已进入剪辑精修阶段，可直接进行拼接与导出，确保你交付的成片质量与效率喵~",
  },
};

const featureHint = {
  transition: "已打开转场衔接生成面板（演示交互）。",
};

const stageTitle = document.getElementById("stageTitle");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const saveBtn = document.getElementById("saveBtn");
const previewBtn = document.getElementById("previewBtn");
const riskBtn = document.getElementById("riskBtn");
const processBtn = document.getElementById("processBtn");
const stepItems = document.querySelectorAll(".step-item");
const featureCards = document.querySelectorAll(".mini-feature-card");
const toast = document.getElementById("toast");
const versionBtn = document.getElementById("versionBtn");
const versionMenu = document.getElementById("versionMenu");
const previewModal = document.getElementById("previewModal");
const previewModalClose = document.getElementById("previewModalClose");
const exportBtn = document.getElementById("exportBtn");
const modelDropdownBtn = document.getElementById("modelDropdownBtn");
const templateDropdownBtn = document.getElementById("templateDropdownBtn");
const modelDropdownMenu = document.getElementById("modelDropdownMenu");
const templateDropdownMenu = document.getElementById("templateDropdownMenu");
const dropdownWraps = document.querySelectorAll(".dropdown-wrap");
const prechatPanel = document.getElementById("prechatPanel");
const chatWorkspace = document.getElementById("chatWorkspace");
const startWorkBtn = document.getElementById("startWorkBtn");
const todoTaskList = document.getElementById("todoTaskList");
const todoCalendarTitle = document.getElementById("todoCalendarTitle");
const todoCalendarGrid = document.getElementById("todoCalendarGrid");
const canvasPlaceholder = document.getElementById("canvasPlaceholder");
const scriptNotebook = document.getElementById("scriptNotebook");
const assetNotebook = document.getElementById("assetNotebook");
const storyboardNotebook = document.getElementById("storyboardNotebook");
const videoNotebook = document.getElementById("videoNotebook");
const assetLibraryPanel = document.getElementById("assetLibraryPanel");
const assetLibraryBackBtn = document.getElementById("assetLibraryBackBtn");
const assetTabs = document.querySelectorAll(".asset-tab");
const assetCards = document.querySelectorAll(".asset-card");
const backpackDock = document.getElementById("backpackDock");
const backpackToggleBtn = document.getElementById("backpackToggleBtn");
const backpackPanel = document.getElementById("backpackPanel");
const backpackList = document.getElementById("backpackList");
const backpackCount = document.getElementById("backpackCount");
const editSuitePanel = document.getElementById("editSuitePanel");
const editPreviewVideo = document.getElementById("editPreviewVideo");
const editTimelineTrack = document.querySelector(".edit-timeline-track");
const editTimelineProgress = document.getElementById("editTimelineProgress");
const editCutTrack = document.getElementById("editCutTrack");
const editTimelineTime = document.getElementById("editTimelineTime");
const editDeleteBtn = document.getElementById("editDeleteBtn");
const editTransitionBtn = document.getElementById("editTransitionBtn");
const editRegenBtn = document.getElementById("editRegenBtn");
const videoTransitionGroup = document.getElementById("videoTransitionGroup");
const videoTransitionCurrent = document.getElementById("videoTransitionCurrent");

const modeBtnC = document.getElementById("modeBtnC");
const modeBtnB = document.getElementById("modeBtnB");
const stepNav = document.getElementById("stepNav");
const rightPane = document.getElementById("rightPane");
const leftPane = document.getElementById("leftPane");
const dragMe = document.getElementById("dragMe");
const chatHistoryResizer = document.getElementById("chatHistoryResizer");
const leftPaneHeader = document.querySelector(".left-pane-header");
const chatInputWrap = document.querySelector(".chat-input-wrap");
const traeInputContainer = document.querySelector(".trae-input-container");
const traeInputFooter = document.querySelector(".trae-input-footer");
const titleWrap = document.querySelector(".title-wrap");
const brandLogo = document.getElementById("brandLogo");

const helperDrawer = document.getElementById("helperDrawer");
const drawerToggle = document.getElementById("drawerToggle");
const tabBtns = document.querySelectorAll(".tab-btn");
const drawerPanels = document.querySelectorAll(".drawer-panel");
const agentAvatarSrc = "./assets/images/avatar/miaodao.png";
const agentDisplayName = "喵导";
const fictionalSeriesTasks = [
  { title: "《全民反诈守护》", episode: "EP01", deliveryDate: "2026-04-23" },
  { title: "《陌生链接不乱点》", episode: "EP02", deliveryDate: "2026-04-24" },
  { title: "《扫码领红包陷阱》", episode: "EP03", deliveryDate: "2026-04-26" },
  { title: "《二维码前停一下》", episode: "EP04", deliveryDate: "2026-04-28" },
  { title: "《反诈口诀刻心里》", episode: "EP05", deliveryDate: "2026-05-01" },
];

let currentTemplate = "通用模版";
let latestRiskReport = [];
let askPromptActive = false;
let currentStageKey = "script";
const inputIntroText = "你是专业的AI漫剧制作者，我是喵导（AI漫剧导师），请告诉我你的创作目标";
const stageChatHistory = Object.keys(stageConfig).reduce((acc, key) => {
  acc[key] = [];
  return acc;
}, {});

const dropdownHostMap = new Map();
let dropdownBackdrop = null;
let activeDropdown = null;
let defaultInputHeight = 0;
let defaultResizerTop = 0;
let defaultWrapBottom = 0;
let defaultFooterBottom = 0;
let hasDefaultSplitBaseline = false;
let audioContext = null;
const aiMessageQueue = [];
let isAiMessageDispatching = false;
let hasChatStarted = false;
let selectedTodoTask = "";
let isAssetLibraryOpen = false;
let selectedVideoTransition = "Match Cut";
const backpackByStage = Object.keys(stageConfig).reduce((acc, key) => {
  acc[key] = [];
  return acc;
}, {});
const canvasProgressByStage = Object.keys(stageConfig).reduce((acc, key) => {
  acc[key] = { view: "empty", updatedAt: "" };
  return acc;
}, {});
const WORKSPACE_SNAPSHOT_KEY = "aimanju.workspace.snapshot.v1";
let autoCutPoints = [
  { id: 1, ratio: 0.13, transition: false },
  { id: 2, ratio: 0.32, transition: false },
  { id: 3, ratio: 0.55, transition: false },
  { id: 4, ratio: 0.78, transition: false },
  { id: 5, ratio: 0.91, transition: false },
];
let selectedRangePoints = [];
let selectedAutoCutId = null;
const stageVisitState = Object.keys(stageConfig).reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

function getAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

function playAiMessageSfx() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(860, now);
  oscillator.frequency.exponentialRampToValueAtTime(640, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function appendMessageNode(entry, shouldAnimate = false) {
  if (!chatMessages) return;
  if (!stageChatHistory[currentStageKey]) stageChatHistory[currentStageKey] = [];
  stageChatHistory[currentStageKey].push(entry);
  const node = createMessageNode(entry);
  if (shouldAnimate) node.classList.add("is-pop-in");
  chatMessages.appendChild(node);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function drainAiMessageQueue() {
  if (isAiMessageDispatching) return;
  const next = aiMessageQueue.shift();
  if (!next) return;
  isAiMessageDispatching = true;
  window.setTimeout(() => {
    appendMessageNode(next.entry, true);
    playAiMessageSfx();
    isAiMessageDispatching = false;
    drainAiMessageQueue();
  }, next.delayMs);
}

function normalizeModelLabel(label) {
  return (label || "")
    .replace(/\s*[（(][^()（）]*[)）]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function updatePreviewButtonVisibility() {
  if (!previewBtn) return;
  const allDone = Object.values(stageVisitState).every(Boolean);
  previewBtn.style.display = allDone ? "inline-flex" : "none";
}

const stageCheckConfig = {
  script: {
    story: { score: 86, status: "pass", note: "剧情主线完整，冲突明确。" },
    shot: { score: 72, status: "warn", note: "镜头衔接有轻微跳切，建议补转场。" },
    asset: { score: 74, status: "warn", note: "角色资产信息仍需补全，建议进入资产阶段修正。" },
  },
  asset: {
    story: { score: 88, status: "pass", note: "剧情约束已承接至资产层。" },
    shot: { score: 78, status: "warn", note: "少量镜头风格漂移，建议统一。" },
    asset: { score: 83, status: "pass", note: "角色与场景核心资产完整。" },
  },
  storyboard: {
    story: { score: 100, status: "pass", note: "开发期临时放行：分镜默认满分。" },
    shot: { score: 100, status: "pass", note: "开发期临时放行：分镜默认满分。" },
    asset: { score: 100, status: "pass", note: "开发期临时放行：分镜默认满分。" },
  },
  video: {
    story: { score: 87, status: "pass", note: "剧情表达一致。" },
    shot: { score: 75, status: "warn", note: "个别片段节奏偏快。" },
    asset: { score: 85, status: "pass", note: "资产一致性稳定。" },
  },
  edit: {
    story: { score: 90, status: "pass", note: "叙事完成度高。" },
    shot: { score: 82, status: "pass", note: "衔接自然。" },
    asset: { score: 88, status: "pass", note: "成片资产稳定。" },
  },
};

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-show");
  }, 1800);
}

function initBrandLogo() {
  if (!brandLogo || !titleWrap) return;
  titleWrap.classList.add("is-logo-loading");
  const fallbackSrc = "./assets/images/logo/logo-latest.png";

  const onReady = () => {
    brandLogo.classList.add("is-ready");
    titleWrap.classList.remove("is-logo-loading");
  };

  const onError = () => {
    brandLogo.srcset = "";
    brandLogo.src = fallbackSrc;
    onReady();
  };

  if (brandLogo.complete && brandLogo.naturalWidth > 0) {
    onReady();
    return;
  }

  brandLogo.addEventListener("load", onReady, { once: true });
  brandLogo.addEventListener("error", onError, { once: true });
}

function resolveLineHeightPx(element) {
  const style = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize) || 14;
  const rawLineHeight = style.lineHeight;
  if (rawLineHeight.endsWith("px")) return Number.parseFloat(rawLineHeight) || fontSize * 1.5;
  if (rawLineHeight === "normal") return fontSize * 1.5;
  const lineScale = Number.parseFloat(rawLineHeight);
  return Number.isFinite(lineScale) ? fontSize * lineScale : fontSize * 1.5;
}

function syncInputIntroText() {
  if (!chatInput) return;
  const placeholder = chatInput.getAttribute("placeholder") || "";
  if (!placeholder.startsWith(inputIntroText)) {
    chatInput.setAttribute("placeholder", `${inputIntroText}\n${placeholder}`);
  }
}

function syncInputContainerHeightToWrap() {
  if (!chatInputWrap || !traeInputContainer) return;
  const wrapStyle = window.getComputedStyle(chatInputWrap);
  const paddingTop = Number.parseFloat(wrapStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(wrapStyle.paddingBottom) || 0;
  const innerHeight = Math.max(0, chatInputWrap.clientHeight - paddingTop - paddingBottom);
  traeInputContainer.style.height = `${Math.round(innerHeight)}px`;

  if (!chatInput || !traeInputFooter) return;
  const lineHeightPx = resolveLineHeightPx(chatInput);
  const minTextHeight = Math.ceil(lineHeightPx * 3);
  const blankLineGap = Number.parseFloat(chatInput.style.marginBottom) || Math.ceil(lineHeightPx);
  const footerHeight = Math.ceil(traeInputFooter.getBoundingClientRect().height || 32);
  const textAreaHeight = Math.max(minTextHeight, innerHeight - footerHeight - blankLineGap);
  chatInput.style.height = `${Math.round(textAreaHeight)}px`;
}

function updateInputLayoutMetrics() {
  if (!chatInput || !chatInputWrap) return;
  const lineHeightPx = resolveLineHeightPx(chatInput);
  const textLines = 3;
  const textBlockHeight = Math.ceil(textLines * lineHeightPx);
  const blankLineGap = Math.ceil(lineHeightPx);
  const footerHeight = Math.ceil(traeInputFooter?.getBoundingClientRect().height || 32);
  const boxStyle = window.getComputedStyle(traeInputContainer || chatInputWrap);
  const padTop = Number.parseFloat(boxStyle.paddingTop) || 0;
  const padBottom = Number.parseFloat(boxStyle.paddingBottom) || 0;
  const minWrapHeight = Math.ceil(padTop + textBlockHeight + blankLineGap + footerHeight + padBottom);

  chatInput.style.minHeight = `${textBlockHeight}px`;
  chatInput.style.marginBottom = `${blankLineGap}px`;
  chatInputWrap.style.minHeight = `${minWrapHeight}px`;
  chatInputWrap.style.setProperty("--input-line-height-px", `${lineHeightPx}px`);
  syncInputContainerHeightToWrap();
}

function captureSplitBaseline(force = false) {
  if (!chatInputWrap || !chatHistoryResizer || !traeInputFooter) return;
  if (hasDefaultSplitBaseline && !force) return;
  defaultInputHeight = Math.round(chatInputWrap.getBoundingClientRect().height);
  defaultResizerTop = Math.round(chatHistoryResizer.getBoundingClientRect().top);
  defaultWrapBottom = Math.round(chatInputWrap.getBoundingClientRect().bottom);
  defaultFooterBottom = Math.round(traeInputFooter.getBoundingClientRect().bottom);
  hasDefaultSplitBaseline = true;
}

function validateSplitState() {
  if (!chatInputWrap || !chatHistoryResizer || !traeInputFooter) return;
  const resizerTop = Math.round(chatHistoryResizer.getBoundingClientRect().top);
  if (defaultResizerTop > 0 && resizerTop > defaultResizerTop) {
    applyChatSplitLayout(defaultResizerTop);
  }

  syncInputContainerHeightToWrap();
  const wrapBottom = Math.round(chatInputWrap.getBoundingClientRect().bottom);
  const footerBottom = Math.round(traeInputFooter.getBoundingClientRect().bottom);
  const wrapDrift = Math.abs(wrapBottom - defaultWrapBottom);
  const footerDrift = Math.abs(footerBottom - defaultFooterBottom);
  if (wrapDrift > 1 || footerDrift > 1) {
    syncInputContainerHeightToWrap();
  }
}

function getPageMaxZIndex() {
  let maxZ = 0;
  document.querySelectorAll("*").forEach((el) => {
    const z = window.getComputedStyle(el).zIndex;
    const parsed = Number.parseInt(z, 10);
    if (Number.isFinite(parsed)) maxZ = Math.max(maxZ, parsed);
  });
  return maxZ;
}

function placeDropdownMenu(triggerBtn, menu) {
  const rect = triggerBtn.getBoundingClientRect();
  const spacing = 8;
  const menuRect = menu.getBoundingClientRect();
  let top = rect.top - menuRect.height - spacing;
  if (top < spacing) top = Math.min(window.innerHeight - menuRect.height - spacing, rect.bottom + spacing);
  let left = rect.left;
  left = Math.max(spacing, Math.min(left, window.innerWidth - menuRect.width - spacing));
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.bottom = "auto";
}

function closeDropdownMenu() {
  if (activeDropdown) activeDropdown.triggerBtn.setAttribute("aria-expanded", "false");
  const menus = [modelDropdownMenu, templateDropdownMenu].filter(Boolean);
  menus.forEach((menu) => {
    menu.classList.remove("is-portal-open");
    menu.style.removeProperty("position");
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menu.style.removeProperty("bottom");
    menu.style.removeProperty("z-index");
    menu.style.removeProperty("display");
    const host = dropdownHostMap.get(menu);
    if (host && menu.parentElement !== host) host.appendChild(menu);
  });
  if (dropdownBackdrop) dropdownBackdrop.classList.remove("is-show");
  activeDropdown = null;
}

function openDropdownMenu(triggerBtn, menu) {
  if (!triggerBtn || !menu) return;
  if (activeDropdown && activeDropdown.menu === menu) {
    closeDropdownMenu();
    return;
  }
  closeDropdownMenu();

  const maxZ = getPageMaxZIndex();
  const menuZ = maxZ + 1;
  const maskZ = menuZ - 1;

  if (!dropdownBackdrop) {
    dropdownBackdrop = document.createElement("div");
    dropdownBackdrop.className = "dropdown-backdrop";
    dropdownBackdrop.addEventListener("click", closeDropdownMenu);
    document.body.appendChild(dropdownBackdrop);
  }

  const host = triggerBtn.closest(".dropdown-wrap");
  if (host) dropdownHostMap.set(menu, host);
  if (menu.parentElement !== document.body) document.body.appendChild(menu);

  dropdownBackdrop.style.zIndex = String(maskZ);
  dropdownBackdrop.classList.add("is-show");

  menu.classList.add("is-portal-open");
  menu.style.position = "fixed";
  menu.style.zIndex = String(menuZ);
  menu.style.display = "flex";
  placeDropdownMenu(triggerBtn, menu);

  triggerBtn.setAttribute("aria-expanded", "true");
  activeDropdown = { triggerBtn, menu };
}

function setStepLocked(stepKey, locked) {
  const step = document.querySelector(`.step-item[data-step="${stepKey}"]`);
  if (!step) return;
  step.classList.toggle("is-locked", locked);
  if (locked) step.setAttribute("disabled", "");
  else step.removeAttribute("disabled");
}

function updateProcessStrip(stageKey) {
  if (!processBtn) return;
  const checks = stageCheckConfig[stageKey] || stageCheckConfig.script;
  const config = [
    { key: "story", label: "剧情连贯" },
    { key: "shot", label: "镜头衔接" },
    { key: "asset", label: "资产完整" },
  ];

  latestRiskReport = [];
  const lines = [];
  let hasBlock = false;
  let hasWarn = false;

  config.forEach(({ key, label }) => {
    const item = checks[key];
    const statusLabel = item.status === "pass" ? "通过" : item.status === "warn" ? "警告" : "阻塞";
    lines.push(`${label} ${item.score}（${statusLabel}）`);
    latestRiskReport.push(`${label}(${item.score})：${item.note}`);
    if (item.status === "block") hasBlock = true;
    if (item.status === "warn") hasWarn = true;
  });

  processBtn.setAttribute("data-tooltip", lines.join("\n"));
  if (hasBlock) processBtn.className = "audit-status audit-fail";
  else if (hasWarn) processBtn.className = "audit-status audit-warn";
  else processBtn.className = "audit-status audit-pass";

  if (riskBtn) {
    if (hasBlock) {
      riskBtn.className = "audit-status audit-fail";
      riskBtn.innerHTML = '<span class="status-dot"></span>合规阻塞';
      riskBtn.setAttribute("data-tooltip", "存在阻塞问题，请先修复后再进入下一步");
    } else if (hasWarn) {
      riskBtn.className = "audit-status audit-warn";
      riskBtn.innerHTML = '<span class="status-dot"></span>合规警告';
      riskBtn.setAttribute("data-tooltip", "存在敏感词，请修改");
    } else {
      riskBtn.className = "audit-status audit-pass";
      riskBtn.innerHTML = '<span class="status-dot"></span>合规通过';
      riskBtn.setAttribute("data-tooltip", "当前版本合规通过");
    }
  }

  const stageOrder = ["script", "asset", "storyboard", "video", "edit"];
  const idx = stageOrder.indexOf(stageKey);
  const next = stageOrder[idx + 1];
  if (next) {
    setStepLocked(next, hasBlock);
  }
}

function injectAskPrompt() {
  if (!chatMessages || askPromptActive || currentStageKey !== "script") return;
  askPromptActive = true;
  const row = document.createElement("div");
  row.className = "msg-row msg-row-ai";
  row.innerHTML = `
    <img class="agent-avatar" src="${agentAvatarSrc}" alt="${agentDisplayName} 头像" loading="lazy" decoding="async" />
    <div class="msg msg-ai ask-message">
      <p class="agent-name">${agentDisplayName}</p>
      <p>请先确认当前漫剧需求是否有修改：</p>
      <div class="chat-ask-grid">
        <button class="ask-card" type="button" data-change="none">没有修改</button>
        <button class="ask-card" type="button" data-change="changed">有修改（请填写）</button>
      </div>
      <input class="ask-custom-input" type="text" placeholder="如有修改，请填写当前漫剧需求调整内容" disabled />
      <button class="ask-confirm-btn" type="button" disabled>确认需求</button>
    </div>
  `;
  const wrap = row.querySelector(".ask-message");
  row.classList.add("is-pop-in");
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const cards = wrap.querySelectorAll(".ask-card");
  const customInput = wrap.querySelector(".ask-custom-input");
  const confirmBtn = wrap.querySelector(".ask-confirm-btn");
  let selectedChange = "";

  const refreshConfirmState = () => {
    const hasText = Boolean(customInput.value.trim());
    if (selectedChange === "changed") {
      customInput.disabled = false;
      confirmBtn.disabled = !hasText;
      return;
    }
    customInput.disabled = true;
    if (selectedChange !== "changed") customInput.value = "";
    confirmBtn.disabled = selectedChange !== "none";
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((el) => el.classList.remove("is-selected"));
      card.classList.add("is-selected");
      selectedChange = card.getAttribute("data-change") || "";
      refreshConfirmState();
    });
  });

  customInput.addEventListener("input", refreshConfirmState);
  confirmBtn.addEventListener("click", () => {
    const custom = customInput.value.trim();
    const confirmedText =
      selectedChange === "changed" ? `已确认需求：有修改 / ${custom}` : "已确认需求：当前漫剧需求无修改";
    appendMessage(confirmedText, "user");
    if (chatInput) chatInput.value = selectedChange === "changed" ? custom : "当前漫剧需求无修改";
    row.remove();
    askPromptActive = false;
    showToast("需求确认完成，可继续生成");
  });
}

function createMessageNode({ text, role, stage }) {
  if (role === "user") {
    const msg = document.createElement("div");
    msg.className = "msg msg-user";
    const p = document.createElement("p");
    p.textContent = text;
    msg.appendChild(p);
    return msg;
  }

  const row = document.createElement("div");
  row.className = "msg-row msg-row-ai";
  const avatar = document.createElement("img");
  avatar.className = "agent-avatar";
  avatar.src = agentAvatarSrc;
  avatar.alt = `${agentDisplayName} 头像`;
  avatar.loading = "lazy";
  avatar.decoding = "async";

  const msg = document.createElement("div");
  msg.className = "msg msg-ai";
  msg.dataset.stage = stage;

  const meta = document.createElement("p");
  meta.className = "agent-name";
  meta.textContent = agentDisplayName;

  const p = document.createElement("p");
  p.textContent = text;

  msg.appendChild(meta);
  msg.appendChild(p);
  row.appendChild(avatar);
  row.appendChild(msg);
  return row;
}

function renderStageMessages(stageKey) {
  if (!chatMessages) return;
  chatMessages.innerHTML = "";
  const items = stageChatHistory[stageKey] || [];
  items.forEach((item) => chatMessages.appendChild(createMessageNode(item)));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function ensureStageBootstrapMessage(stageKey) {
  const config = stageConfig[stageKey];
  if (!config) return;
  if (!stageChatHistory[stageKey]) stageChatHistory[stageKey] = [];
  if (stageChatHistory[stageKey].length > 0) return;
  stageChatHistory[stageKey].push({
    text: config.reply,
    role: "ai",
    stage: stageKey,
  });
}

function hasScriptPreferenceConfirmed() {
  const scriptHistory = stageChatHistory.script || [];
  return scriptHistory.some((item) => item.role === "user" && item.text.startsWith("已确认需求："));
}

function appendMessage(text, role) {
  const entry = { text, role, stage: currentStageKey };
  if (role === "ai") {
    aiMessageQueue.push({
      entry,
      delayMs: 220 + Math.floor(Math.random() * 260),
    });
    drainAiMessageQueue();
    return;
  }
  appendMessageNode(entry);
}

function applyStageTheme(stageKey) {
  document.body?.setAttribute("data-stage", stageKey);
  chatMessages?.setAttribute("data-stage", stageKey);
}

function syncCanvasView() {
  const showPlaceholder = !hasChatStarted;
  const showLibrary = hasChatStarted && isAssetLibraryOpen;
  const showNotebook = hasChatStarted && !isAssetLibraryOpen && currentStageKey === "script";
  const showAssetNotebook = hasChatStarted && !isAssetLibraryOpen && currentStageKey === "asset";
  const showStoryboardNotebook = hasChatStarted && !isAssetLibraryOpen && currentStageKey === "storyboard";
  const showVideoNotebook = hasChatStarted && !isAssetLibraryOpen && currentStageKey === "video";
  const showEditSuite = hasChatStarted && !isAssetLibraryOpen && currentStageKey === "edit";
  canvasPlaceholder?.classList.toggle("is-hidden", !showPlaceholder);
  scriptNotebook?.classList.toggle("is-hidden", !showNotebook);
  assetNotebook?.classList.toggle("is-hidden", !showAssetNotebook);
  storyboardNotebook?.classList.toggle("is-hidden", !showStoryboardNotebook);
  videoNotebook?.classList.toggle("is-hidden", !showVideoNotebook);
  assetLibraryPanel?.classList.toggle("is-hidden", !showLibrary);
  editSuitePanel?.classList.toggle("is-hidden", !showEditSuite);
  backpackDock?.classList.toggle("is-hidden", !hasChatStarted);
  snapshotCurrentCanvasProgress();
}

function formatClock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateEditActionButtons() {
  const ready = selectedRangePoints.length === 2;
  if (editDeleteBtn) editDeleteBtn.disabled = !(ready || selectedAutoCutId !== null);
  if (editTransitionBtn) editTransitionBtn.disabled = selectedAutoCutId === null;
  if (editRegenBtn) editRegenBtn.disabled = !ready;
}

function getEditDuration() {
  const d = editPreviewVideo?.duration;
  return Number.isFinite(d) && d > 0 ? d : 5;
}

function renderCutMarkers() {
  if (!editCutTrack) return;
  const autoHtml = autoCutPoints
    .map(
      (point, idx) =>
        `<span class="cut-marker is-auto ${selectedAutoCutId === point.id ? "is-selected" : ""} ${
          point.transition ? "is-transition" : ""
        }" data-cut-kind="auto" data-cut-id="${point.id}" data-cut-idx="${idx + 1}" style="left:${Math.round(
          point.ratio * 100,
        )}%" title="拼接点 #${idx + 1}">✂</span>`,
    )
    .join("");

  let selectHtml = "";
  if (selectedRangePoints.length === 2) {
    const [start, end] = selectedRangePoints;
    const left = Math.round(start * 100);
    const width = Math.max(0, Math.round((end - start) * 100));
    selectHtml += `<span class="selection-range" style="left:${left}%;width:${width}%"></span>`;
  }
  selectHtml += selectedRangePoints
    .map((ratio, idx) => {
      const kind = idx === 0 ? "start" : "end";
      const label = idx === 0 ? "起点" : "终点";
      return `<span class="cut-marker is-select" data-cut-kind="${kind}" style="left:${Math.round(
        ratio * 100,
      )}%" title="${label}">●</span>`;
    })
    .join("");

  editCutTrack.innerHTML = `${autoHtml}${selectHtml}`;
  updateEditActionButtons();
}

function addTimelineRangePoint(ratio) {
  selectedAutoCutId = null;
  if (selectedRangePoints.length >= 2) {
    selectedRangePoints = [ratio];
  } else {
    selectedRangePoints.push(ratio);
  }
  if (selectedRangePoints.length === 2) {
    selectedRangePoints = [...selectedRangePoints].sort((a, b) => a - b);
  }
  renderCutMarkers();
}

function handleTimelineTrackClick(event) {
  const autoMarker = event.target.closest(".cut-marker.is-auto");
  if (autoMarker) {
    const cutId = Number.parseInt(autoMarker.getAttribute("data-cut-id") || "", 10);
    const idx = autoMarker.getAttribute("data-cut-idx") || "";
    selectedAutoCutId = Number.isFinite(cutId) ? cutId : null;
    selectedRangePoints = [];
    renderCutMarkers();
    showToast(`已选中拼接点 #${idx}`);
    return;
  }
  if (!editTimelineTrack) return;
  const rect = editTimelineTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  addTimelineRangePoint(ratio);
}

function setStage(stageKey) {
  const config = stageConfig[stageKey];
  if (!config) return;
  currentStageKey = stageKey;
  if (hasChatStarted) stageVisitState[stageKey] = true;
  updatePreviewButtonVisibility();
  applyStageTheme(stageKey);
  if (stageTitle) stageTitle.textContent = hasChatStarted ? config.title.slice(0, 4) : "喵导偷吃小鱼干中……";
  if (modelDropdownBtn) modelDropdownBtn.textContent = currentTemplate;
  updateProcessStrip(stageKey);
  syncCanvasView();
  renderBackpack();
  stepItems.forEach((item) => item.classList.toggle("is-active", item.dataset.step === stageKey));
  if (!hasChatStarted) return;
  ensureStageBootstrapMessage(stageKey);
  askPromptActive = false;
  renderStageMessages(stageKey);
  if (stageKey === "script" && !hasScriptPreferenceConfirmed()) injectAskPrompt();
}

function startChatWithTask() {
  if (hasChatStarted) return;
  if (!selectedTodoTask) {
    showToast("请先选择一个待完成任务，再点击开工");
    return;
  }
  hasChatStarted = true;
  isAssetLibraryOpen = false;
  document.body.classList.add("is-task-started");
  prechatPanel?.classList.add("is-hidden");
  chatWorkspace?.classList.remove("is-hidden");
  if (stageTitle) stageTitle.textContent = stageConfig[currentStageKey]?.title.slice(0, 4) || "剧本创作";
  if (chatMessages) chatMessages.innerHTML = "";
  askPromptActive = false;
  syncCanvasView();
  renderBackpack();

  stageChatHistory[currentStageKey] = [];
  appendMessage(stageConfig[currentStageKey].reply, "ai");
  if (currentStageKey === "script") {
    window.setTimeout(() => {
      if (!hasScriptPreferenceConfirmed()) injectAskPrompt();
    }, 620);
  }
  showToast(`已开工：${selectedTodoTask}`);
  updateInputLayoutMetrics();
  captureSplitBaseline(true);
}

function renderTodoTasks() {
  if (!todoTaskList) return;
  const sortedTasks = [...fictionalSeriesTasks].sort(
    (a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(),
  );
  todoTaskList.innerHTML = sortedTasks
    .map(
      (task) => `
      <button class="todo-task-item" type="button" data-task="${task.title}">
        <span class="todo-task-main">${task.title}</span>
        <span class="todo-task-meta">${task.episode} · 下次交付 ${task.deliveryDate}</span>
      </button>
    `,
    )
    .join("");

  todoTaskList.querySelectorAll(".todo-task-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      todoTaskList.querySelectorAll(".todo-task-item").forEach((el) => el.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedTodoTask = btn.getAttribute("data-task") || btn.textContent?.trim() || "";
      if (startWorkBtn) startWorkBtn.disabled = !selectedTodoTask;
    });
  });
}

function renderTodoCalendar() {
  if (!todoCalendarGrid) return;
  const sorted = [...fictionalSeriesTasks].sort(
    (a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(),
  );
  const baseDate = sorted.length ? new Date(sorted[0].deliveryDate) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const deliveryDays = new Set(
    sorted
      .filter((task) => {
        const d = new Date(task.deliveryDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((task) => new Date(task.deliveryDate).getDate()),
  );

  if (todoCalendarTitle) {
    const monthText = String(month + 1).padStart(2, "0");
    todoCalendarTitle.textContent = `交付日历本 · ${year}-${monthText}`;
  }

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push('<span class="todo-day is-empty"></span>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cls = deliveryDays.has(day) ? "todo-day is-delivery" : "todo-day";
    cells.push(`<span class="${cls}">${day}</span>`);
  }
  todoCalendarGrid.innerHTML = cells.join("");
}

function activateAssetType(type) {
  assetTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.getAttribute("data-asset-type") === type);
  });
  assetCards.forEach((card) => {
    card.classList.toggle("is-hidden", card.getAttribute("data-asset-type") !== type);
  });
}

function renderBackpack() {
  const list = backpackByStage[currentStageKey] || [];
  if (backpackCount) backpackCount.textContent = String(list.length);
  if (!backpackList) return;
  if (!list.length) {
    backpackList.innerHTML = '<li class="backpack-empty">当前阶段还没有资产</li>';
    return;
  }
  backpackList.innerHTML = list
    .map((item) => `<li><span>${item.type}</span><strong>${item.name}</strong></li>`)
    .join("");
}

function addAssetToBackpack(card) {
  const type = card.getAttribute("data-asset-type") || "未分类";
  const name = card.querySelector("h4")?.textContent?.trim() || "未命名资产";
  const list = backpackByStage[currentStageKey] || [];
  if (list.some((item) => item.name === name && item.type === type)) {
    showToast("该资产已在当前阶段背包中");
    return;
  }
  list.push({ type, name, addedAt: new Date().toISOString() });
  backpackByStage[currentStageKey] = list;
  renderBackpack();
  showToast(`已加入背包：${name}`);
}

function snapshotCurrentCanvasProgress() {
  canvasProgressByStage[currentStageKey] = {
    view: isAssetLibraryOpen
      ? "asset-library"
      : currentStageKey === "script"
        ? "script-notebook"
        : currentStageKey === "asset"
          ? "asset-notebook"
          : currentStageKey === "storyboard"
            ? "storyboard-notebook"
            : currentStageKey === "video"
              ? "video-notebook"
              : currentStageKey === "edit"
                ? "edit-suite"
                : "default-canvas",
    updatedAt: new Date().toISOString(),
  };
}

function saveWorkspaceSnapshot() {
  const payload = {
    savedAt: new Date().toISOString(),
    currentStageKey,
    currentTemplate,
    selectedTodoTask,
    stageVisitState,
    stageChatHistory,
    backpackByStage,
    canvasProgressByStage,
  };
  window.localStorage.setItem(WORKSPACE_SNAPSHOT_KEY, JSON.stringify(payload));
}

function resetToHomePage() {
  Object.keys(stageVisitState).forEach((key) => {
    stageVisitState[key] = false;
  });
  hasChatStarted = false;
  isAssetLibraryOpen = false;
  document.body.classList.remove("is-task-started");
  prechatPanel?.classList.remove("is-hidden");
  chatWorkspace?.classList.add("is-hidden");
  backpackDock?.classList.add("is-hidden");
  backpackPanel?.classList.add("is-hidden");
  selectedTodoTask = "";
  if (startWorkBtn) startWorkBtn.disabled = true;
  todoTaskList?.querySelectorAll(".todo-task-item").forEach((el) => el.classList.remove("is-selected"));
  if (stageTitle) stageTitle.textContent = "喵导偷吃小鱼干中……";
  setStage("script");
}

function switchMode(mode) {
  if (!modeBtnC || !modeBtnB || !leftPane) return;
  const isBasic = mode === "C";
  modeBtnC.classList.toggle("is-active", isBasic);
  modeBtnB.classList.toggle("is-active", !isBasic);

  if (stepNav) stepNav.style.display = isBasic ? "none" : "flex";
  if (rightPane) rightPane.style.display = isBasic ? "none" : "flex";
  if (dragMe) dragMe.style.display = isBasic ? "none" : "block";

  if (isBasic) {
    leftPane.style.width = "100%";
    leftPane.style.maxWidth = "860px";
    leftPane.style.margin = "0 auto";
    leftPane.style.borderRight = "none";
    leftPane.style.borderRadius = "16px";
    leftPane.style.border = "1px solid rgba(255,255,255,0.08)";
    if (riskBtn) riskBtn.style.display = "none";
    showToast("已切换至 Basic (C端魔法模式)");
  } else {
    leftPane.style.width = "400px";
    leftPane.style.maxWidth = "none";
    leftPane.style.margin = "0";
    leftPane.style.border = "none";
    leftPane.style.borderRight = "1px solid rgba(255,255,255,0.08)";
    leftPane.style.borderRadius = "0";
    if (riskBtn) riskBtn.style.display = "flex";
    showToast("已切换至 Pro (B端向导模式)");
    syncLeftPaneWidthVar(400);
  }
}

let isChatSplitResizing = false;
let latestChatSplitY = 0;
let chatSplitRafId = 0;

function applyChatSplitLayout(pointerY) {
  if (!leftPane || !chatMessages || !chatInputWrap || !chatHistoryResizer) return;
  const paneRect = leftPane.getBoundingClientRect();
  const headerH = leftPaneHeader ? leftPaneHeader.offsetHeight : 0;
  const dividerH = chatHistoryResizer.offsetHeight || 6;
  const minInputH = Math.max(
    defaultInputHeight,
    Math.ceil(Number.parseFloat(window.getComputedStyle(chatInputWrap).minHeight) || 130),
  );

  const available = paneRect.height - headerH - dividerH;
  let newInputH = paneRect.bottom - pointerY;
  const maxInputH = available;
  if (newInputH < minInputH) newInputH = minInputH;
  if (newInputH > maxInputH) newInputH = maxInputH;

  chatMessages.style.removeProperty("height");
  chatMessages.style.removeProperty("flex");
  chatInputWrap.style.height = `${Math.round(newInputH)}px`;
  syncInputContainerHeightToWrap();
}

if (chatHistoryResizer && leftPane && chatMessages && chatInputWrap) {
  chatHistoryResizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isChatSplitResizing = true;
    latestChatSplitY = e.clientY;
    document.body.classList.add("is-resizing");
    chatHistoryResizer.classList.add("is-resizing");
  });

  document.addEventListener("mousemove", (e) => {
    if (!isChatSplitResizing) return;
    latestChatSplitY = e.clientY;
    if (chatSplitRafId) return;
    chatSplitRafId = window.requestAnimationFrame(() => {
      chatSplitRafId = 0;
      applyChatSplitLayout(latestChatSplitY);
    });
  });

  document.addEventListener("mouseup", () => {
    if (!isChatSplitResizing) return;
    isChatSplitResizing = false;
    if (chatSplitRafId) {
      window.cancelAnimationFrame(chatSplitRafId);
      chatSplitRafId = 0;
    }
    applyChatSplitLayout(latestChatSplitY);
    validateSplitState();
    document.body.classList.remove("is-resizing");
    chatHistoryResizer.classList.remove("is-resizing");
  });
}

let isResizing = false;
if (dragMe && leftPane) {
  dragMe.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isResizing = true;
    document.body.classList.add("is-resizing");
    document.body.style.cursor = "col-resize";
    dragMe.classList.add("is-resizing");
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    let newWidth = e.clientX;
    const minWidth = 300;
    const header = document.querySelector(".global-header");
    const actions = document.querySelector(".header-actions");
    const rootStyles = getComputedStyle(document.documentElement);
    const mainResizerWidth = Number.parseInt(rootStyles.getPropertyValue("--main-resizer-width"), 10) || 6;

    // 计算 nav 保持完整按钮所需最小宽度
    const navGap = stepNav ? Number.parseInt(getComputedStyle(stepNav).gap || "8", 10) || 8 : 8;
    const navButtonsWidth = Array.from(stepItems).reduce((sum, btn) => sum + btn.getBoundingClientRect().width, 0);
    const navMinWidth = navButtonsWidth + navGap * Math.max(0, stepItems.length - 1);

    // 左栏最大宽度：保证 nav 右侧仍能贴着 header-actions 左侧
    let maxWidth = 800;
    if (header && actions) {
      const availableForLeftCol = header.clientWidth - actions.getBoundingClientRect().width - navMinWidth - mainResizerWidth;
      maxWidth = Math.max(minWidth, Math.floor(availableForLeftCol));
    }

    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    leftPane.style.width = `${newWidth}px`;
    syncLeftPaneWidthVar(newWidth);
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove("is-resizing");
    document.body.style.cursor = "";
    dragMe.classList.remove("is-resizing");
  });
}

function syncLeftPaneWidthVar(width) {
  document.documentElement.style.setProperty("--left-pane-width", `${Math.round(width)}px`);
}

if (leftPane) {
  syncLeftPaneWidthVar(leftPane.getBoundingClientRect().width);
}

if (drawerToggle && helperDrawer) {
  drawerToggle.addEventListener("click", () => helperDrawer.classList.toggle("is-closed"));
}

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const targetId = btn.getAttribute("data-target");
    drawerPanels.forEach((panel) => panel.classList.toggle("is-active", panel.id === targetId));
  });
});

stepItems.forEach((item) => {
  item.addEventListener("click", () => {
    setStage(item.dataset.step);
    const label = item.querySelector(".step-name")?.textContent?.trim() || "当前步骤";
    showToast(`已切换到「${label}」`);
  });
});

renderTodoTasks();
renderTodoCalendar();

if (startWorkBtn) {
  startWorkBtn.addEventListener("click", startChatWithTask);
}

if (sendBtn && chatInput) {
  sendBtn.addEventListener("click", () => {
    const text = chatInput.value.trim();
    if (!text) {
      showToast("请先输入创意内容");
      return;
    }
    appendMessage(text, "user");
    chatInput.value = "";
    const model = modelDropdownBtn?.textContent?.trim() || "通用模版";
    const type = currentTemplate;
    const currentStep = document.querySelector(".step-item.is-active .step-name")?.textContent?.trim() || "当前步骤";
    appendMessage(`收到，你当前在「${currentStep}」。喵导将使用「${model} / ${type}」以导师协作方式为你输出专业草稿喵~`, "ai");
  });
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      sendBtn?.click();
    }
  });
}

if (previewBtn && previewModal) {
  previewBtn.addEventListener("click", () => {
    previewModal.classList.add("is-show");
  });
}
if (saveBtn) saveBtn.addEventListener("click", () => showToast("当前版本已保存（演示）"));

featureCards.forEach((card) => {
  card.addEventListener("click", () => showToast(featureHint[card.dataset.feature] || "卡片交互触发"));
});

if (modelDropdownBtn && modelDropdownMenu) {
  modelDropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdownMenu(modelDropdownBtn, modelDropdownMenu);
  });

  modelDropdownMenu.querySelectorAll(".dropdown-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-template");
      if (val) {
        currentTemplate = val;
        if (modelDropdownBtn) modelDropdownBtn.textContent = val;
        showToast(`通用模版已切换为：${val}`);
      }
      closeDropdownMenu();
    });
  });
}

if (templateDropdownBtn) {
  templateDropdownBtn.addEventListener("click", () => {
    if (!hasChatStarted) {
      showToast("请先开工后再进入素材库");
      return;
    }
    isAssetLibraryOpen = true;
    syncCanvasView();
    showToast("已进入素材库");
  });
}

if (assetLibraryBackBtn) {
  assetLibraryBackBtn.addEventListener("click", () => {
    isAssetLibraryOpen = false;
    syncCanvasView();
    showToast("已返回画布");
  });
}

assetTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const type = tab.getAttribute("data-asset-type");
    if (!type) return;
    activateAssetType(type);
  });
});

assetCards.forEach((card) => {
  const addBtn = card.querySelector(".add-asset-btn");
  if (!addBtn) return;
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addAssetToBackpack(card);
  });
});

if (backpackToggleBtn) {
  backpackToggleBtn.addEventListener("click", () => {
    backpackPanel?.classList.toggle("is-hidden");
    renderBackpack();
  });
}

if (returnHomeBtn) {
  returnHomeBtn.addEventListener("click", () => {
    snapshotCurrentCanvasProgress();
    saveWorkspaceSnapshot();
    resetToHomePage();
    showToast("已保存进度并返回主页面");
  });
}

if (editPreviewVideo) {
  const syncVideoProgress = () => {
    const duration = editPreviewVideo.duration || 0;
    const current = editPreviewVideo.currentTime || 0;
    const ratio = duration > 0 ? Math.min(1, current / duration) : 0;
    if (editTimelineProgress) editTimelineProgress.style.width = `${Math.round(ratio * 100)}%`;
    if (editTimelineTime) editTimelineTime.textContent = `${formatClock(current)} / ${formatClock(duration)}`;
  };
  editPreviewVideo.addEventListener("timeupdate", syncVideoProgress);
  editPreviewVideo.addEventListener("loadedmetadata", syncVideoProgress);
  editPreviewVideo.addEventListener("ended", syncVideoProgress);
}

if (editTimelineTrack) {
  editTimelineTrack.addEventListener("click", handleTimelineTrackClick);
}

if (editDeleteBtn) {
  editDeleteBtn.addEventListener("click", () => {
    if (selectedAutoCutId !== null) {
      autoCutPoints = autoCutPoints.filter((point) => point.id !== selectedAutoCutId);
      selectedAutoCutId = null;
      renderCutMarkers();
      showToast("已删除选中的拼接点");
      return;
    }
    if (selectedRangePoints.length !== 2) return;
    const duration = getEditDuration();
    const start = formatClock(selectedRangePoints[0] * duration);
    const end = formatClock(selectedRangePoints[1] * duration);
    showToast(`已删除片段 ${start} - ${end}（演示）`);
    selectedRangePoints = [];
    renderCutMarkers();
  });
}

if (editRegenBtn) {
  editRegenBtn.addEventListener("click", () => {
    if (selectedRangePoints.length !== 2) return;
    const duration = getEditDuration();
    const start = formatClock(selectedRangePoints[0] * duration);
    const end = formatClock(selectedRangePoints[1] * duration);
    showToast(`已重生片段 ${start} - ${end}（演示）`);
    selectedRangePoints = [];
    renderCutMarkers();
  });
}

if (editTransitionBtn) {
  editTransitionBtn.addEventListener("click", () => {
    if (selectedAutoCutId === null) return;
    autoCutPoints = autoCutPoints.map((point) =>
      point.id === selectedAutoCutId ? { ...point, transition: true } : point,
    );
    renderCutMarkers();
    showToast("已为该拼接点增加转场衔接");
  });
}

if (videoTransitionGroup) {
  videoTransitionGroup.querySelectorAll(".transition-choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-transition");
      if (!next) return;
      selectedVideoTransition = next;
      videoTransitionGroup.querySelectorAll(".transition-choice-btn").forEach((el) => {
        el.classList.toggle("is-active", el === btn);
      });
      if (videoTransitionCurrent) videoTransitionCurrent.textContent = next;
      showToast(`视频转场已切换为：${next}`);
    });
  });
}

document.addEventListener("click", () => {
  closeDropdownMenu();
  versionBtn?.parentElement?.classList.remove("is-open");
});

window.addEventListener("resize", () => {
  updateInputLayoutMetrics();
  captureSplitBaseline(true);
  validateSplitState();
  if (activeDropdown) placeDropdownMenu(activeDropdown.triggerBtn, activeDropdown.menu);
});

if (versionBtn && versionMenu) {
  versionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    versionBtn.parentElement?.classList.toggle("is-open");
  });
  versionMenu.querySelectorAll(".status-menu-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const version = btn.getAttribute("data-version") || "历史版本";
      showToast(`已回滚到：${version}`);
      versionBtn.parentElement?.classList.remove("is-open");
    });
  });
}

if (previewModal && previewModalClose) {
  previewModalClose.addEventListener("click", () => previewModal.classList.remove("is-show"));
  previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) previewModal.classList.remove("is-show");
  });
}

if (exportBtn) {
  exportBtn.addEventListener("click", () => showToast("已开始导出成片（演示）"));
}

if (modeBtnC) modeBtnC.addEventListener("click", () => switchMode("C"));
if (modeBtnB) modeBtnB.addEventListener("click", () => switchMode("B"));

document.addEventListener("keydown", (e) => {
  const isCmdOrCtrl = e.ctrlKey || e.metaKey;
  if (e.key === "/" && document.activeElement !== chatInput) {
    e.preventDefault();
    chatInput?.focus();
  }
  if (!isCmdOrCtrl) return;
  if (e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveBtn?.click();
  }
  if (e.key.toLowerCase() === "b") {
    e.preventDefault();
    modeBtnC?.click();
  }
  if (e.key.toLowerCase() === "p") {
    e.preventDefault();
    modeBtnB?.click();
  }
  if (["1", "2", "3", "4", "5"].includes(e.key)) {
    e.preventDefault();
    const index = Number(e.key) - 1;
    const item = stepItems[index];
    if (item && !item.hasAttribute("disabled")) item.click();
    else showToast(`步骤 0${index + 1} 尚未解锁`);
  }
});

syncInputIntroText();
updatePreviewButtonVisibility();
updateInputLayoutMetrics();
captureSplitBaseline(true);
initBrandLogo();

if (chatInput) {
  chatInput.addEventListener("focus", () => {
    validateSplitState();
  });
}

if (typeof ResizeObserver !== "undefined") {
  const inputLayoutObserver = new ResizeObserver(() => {
    updateInputLayoutMetrics();
    if (activeDropdown) placeDropdownMenu(activeDropdown.triggerBtn, activeDropdown.menu);
  });
  if (chatInput) inputLayoutObserver.observe(chatInput);
  if (chatInputWrap) inputLayoutObserver.observe(chatInputWrap);
  inputLayoutObserver.observe(document.documentElement);
}

setStage("script");
if (templateDropdownBtn) templateDropdownBtn.textContent = "素材库";
if (modelDropdownBtn) modelDropdownBtn.textContent = currentTemplate;
syncCanvasView();
activateAssetType("剧本");
renderBackpack();
renderCutMarkers();
if (videoTransitionCurrent) videoTransitionCurrent.textContent = selectedVideoTransition;
