"use client";

import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Clapperboard,
  Database,
  Film,
  Layers3,
  Radar,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import type { ComponentType } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type Step = {
  title: string;
  text: string;
  icon: IconComponent;
};

type Capability = {
  title: string;
  text: string;
  icon: IconComponent;
};

type Metric = {
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    title: "剧本创作",
    text: "从灵感输入到结构化剧本，自动整理人物、节奏、对白和分场说明。",
    icon: Sparkles,
  },
  {
    title: "资产编排",
    text: "统一管理角色、场景、道具、音频和风格资产，确保素材可追踪、可复用、可交付。",
    icon: Database,
  },
  {
    title: "分镜拆解",
    text: "自动拆分镜号、时长、视角、台词、画面内容和运镜方案，形成可执行分镜表。",
    icon: Blocks,
  },
  {
    title: "视频生成",
    text: "基于分镜批量生成竖屏视频片段，任务进度、生成状态和结果文件实时同步。",
    icon: Film,
  },
  {
    title: "剪辑交付",
    text: "完成成片合成、预览、导出与版本记录，让内容生产进入标准化交付流程。",
    icon: Layers3,
  },
];

const capabilities: Capability[] = [
  {
    title: "审查门禁",
    text: "在视频生成前完成合规、剧情、衔接和可执行性检查，降低返工成本。",
    icon: ShieldCheck,
  },
  {
    title: "项目中台",
    text: "项目、剧本、资产、分镜、生成任务和审查结果统一沉淀，方便长期运营。",
    icon: Radar,
  },
  {
    title: "多模型引擎",
    text: "串联文本、图像、视频和成片导出链路，支撑完整的内容生产闭环。",
    icon: Zap,
  },
];

const metrics: Metric[] = [
  {
    title: "审查可控",
    text: "门禁、权限、风控一体化",
  },
  {
    title: "进度可追踪",
    text: "项目、任务、资产全链路",
  },
  {
    title: "成片可交付",
    text: "导出、记录、版本齐备",
  },
];

function HomeFutureBackdrop() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = new THREE.WebGLRenderer({
      antialias: !prefersReducedMotion.matches,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "home-future-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.019);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260);
    camera.position.set(0, 0, 38);

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const material = new THREE.ShaderMaterial({
      transparent: false,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv - 0.5;
          p.x *= uResolution.x / uResolution.y;

          vec2 mouse = uMouse * vec2(0.28, 0.22);
          float distCenter = length(p + mouse * 0.42);
          float vignette = smoothstep(0.96, 0.28, length(p));

          float coreGlow = smoothstep(0.62, 0.0, distCenter);
          float warmHalo = smoothstep(0.48, 0.0, length(p - vec2(-0.16 + mouse.x * 0.12, 0.05 - mouse.y * 0.08)));
          float coolHalo = smoothstep(0.54, 0.0, length(p - vec2(0.28 + mouse.x * 0.16, -0.12 + mouse.y * 0.06)));

          float ribbonA = 0.5 + 0.5 * sin((uv.x * 6.0 + uTime * 0.16) + uv.y * 2.4);
          float ribbonB = 0.5 + 0.5 * sin((uv.y * 5.0 - uTime * 0.12) - uv.x * 1.8);
          float flow = smoothstep(0.18, 0.82, ribbonA * 0.6 + ribbonB * 0.4);
          float beam = smoothstep(0.62, 0.28, abs(p.y + 0.11 * sin(uTime * 0.18 + p.x * 2.2 + mouse.x)));
          float scan = 0.5 + 0.5 * sin((uv.y + uTime * 0.08) * 520.0);
          float glitter = smoothstep(0.985, 1.0, noise(uv * uResolution * 0.016 + uTime * 0.05));

          vec3 base = vec3(0.02, 0.03, 0.05);
          vec3 orange = vec3(1.0, 0.46, 0.11);
          vec3 amber = vec3(1.0, 0.74, 0.44);
          vec3 blue = vec3(0.08, 0.24, 0.52);
          vec3 violet = vec3(0.34, 0.19, 0.58);

          vec3 color = base;
          color += orange * (coreGlow * 0.34 + flow * 0.12 + warmHalo * 0.24);
          color += amber * (coreGlow * 0.12 + glitter * 0.14);
          color += blue * (beam * 0.18 + coolHalo * 0.14);
          color += violet * (0.08 + 0.08 * flow);
          color += vec3(0.05) * scan * 0.06;

          float noiseMix = noise(uv * uResolution * 0.002 + uTime * 0.03);
          color += vec3(noiseMix * 0.02);
          color *= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const background = new THREE.Mesh(geometry, material);
    background.position.z = -92;
    scene.add(background);

    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({
        color: 0xff7a1a,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: 0xffc58a,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: 0x4a73ff,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ];

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(12, 0.18, 10, 260), ringMaterials[0]);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(18, 0.1, 8, 320), ringMaterials[1]);
    const ringC = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.08, 8, 200), ringMaterials[2]);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(5.5, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffb15b,
        wireframe: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    ringA.rotation.x = Math.PI / 2.4;
    ringA.rotation.y = Math.PI / 6;
    ringB.rotation.x = Math.PI / 3.3;
    ringB.rotation.z = Math.PI / 5;
    ringC.rotation.x = Math.PI / 4.2;
    ringC.rotation.y = -Math.PI / 7;
    core.rotation.x = Math.PI / 6;
    core.rotation.y = -Math.PI / 9;

    ringGroup.add(ringA, ringB, ringC, core);

    const frameGroup = new THREE.Group();
    scene.add(frameGroup);

    const outerFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(44, 26, 44)),
      new THREE.LineBasicMaterial({
        color: 0x7dd3ff,
        transparent: true,
        opacity: 0.012,
        blending: THREE.AdditiveBlending,
      }),
    );

    const innerFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 14, 24)),
      new THREE.LineBasicMaterial({
        color: 0xff7a1a,
        transparent: true,
        opacity: 0.028,
        blending: THREE.AdditiveBlending,
      }),
    );

    frameGroup.add(outerFrame, innerFrame);

    const createPoints = (count: number, spread: number, depth: number, palette: THREE.ColorRepresentation[], size: number, opacity: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();

      for (let index = 0; index < count; index += 1) {
        const i3 = index * 3;
        positions[i3 + 0] = (Math.random() - 0.5) * spread;
        positions[i3 + 1] = (Math.random() - 0.5) * spread * 0.62;
        positions[i3 + 2] = -Math.random() * depth - Math.random() * 12;

        color.set(palette[index % palette.length]);
        const intensity = 0.6 + Math.random() * 0.4;
        colors[i3 + 0] = color.r * intensity;
        colors[i3 + 1] = color.g * intensity;
        colors[i3 + 2] = color.b * intensity;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Points(geometry, material);
    };

    const createEdgeParticles = (count: number, side: -1 | 1) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();
      const palette: THREE.ColorRepresentation[] = side < 0 ? [0xffb15b, 0x7dd3ff, 0xffffff] : [0xff7a1a, 0xffd4a0, 0x89c5ff];

      for (let index = 0; index < count; index += 1) {
        const i3 = index * 3;
        const band = 18 + Math.random() * 24;
        positions[i3 + 0] = side * band;
        positions[i3 + 1] = (Math.random() - 0.5) * 48;
        positions[i3 + 2] = -6 - Math.random() * 64;

        color.set(palette[index % palette.length]);
        const intensity = 0.58 + Math.random() * 0.42;
        colors[i3 + 0] = color.r * intensity;
        colors[i3 + 1] = color.g * intensity;
        colors[i3 + 2] = color.b * intensity;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: side < 0 ? 0.32 : 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(geometry, material);
      particles.position.x = side < 0 ? -2 : 2;
      return particles;
    };

    const deepField = createPoints(
      prefersReducedMotion.matches ? 180 : 360,
      92,
      120,
      [0xffffff, 0xffb15b, 0x7dd3ff],
      0.12,
      0.76,
    );
    const midField = createPoints(
      prefersReducedMotion.matches ? 72 : 148,
      46,
      64,
      [0xff7a1a, 0xffd4a0, 0x89c5ff],
      0.22,
      0.92,
    );
    const leftEdgeField = createEdgeParticles(prefersReducedMotion.matches ? 72 : 190, -1);
    const rightEdgeField = createEdgeParticles(prefersReducedMotion.matches ? 72 : 190, 1);

    scene.add(deepField, midField, leftEdgeField, rightEdgeField);

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const distance = Math.abs(camera.position.z - background.position.z);
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const planeHeight = 2 * Math.tan(vFov / 2) * distance;
      const planeWidth = planeHeight * camera.aspect;
      background.scale.set(planeWidth, planeHeight, 1);
      background.material.uniforms.uResolution.value.set(width, height);
    };

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);

    const handlePointerMove = (event: PointerEvent) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      pointerTarget.x = (event.clientX / width) * 2 - 1;
      pointerTarget.y = -((event.clientY / height) * 2 - 1);
    };

    const handlePointerLeave = () => {
      pointerTarget.set(0, 0);
    };

    const clock = new THREE.Clock();
    let frame = 0;
    let active = !prefersReducedMotion.matches;

    const renderOnce = () => {
      const elapsed = clock.getElapsedTime();
      background.material.uniforms.uTime.value = elapsed;
      background.material.uniforms.uMouse.value.copy(pointer);
      renderer.render(scene, camera);
    };

    const animate = () => {
      if (!active) return;

      const elapsed = clock.getElapsedTime();
      pointer.x += (pointerTarget.x - pointer.x) * 0.04;
      pointer.y += (pointerTarget.y - pointer.y) * 0.04;

      background.material.uniforms.uTime.value = elapsed;
      background.material.uniforms.uMouse.value.copy(pointer);
      background.rotation.z = elapsed * 0.015;

      ringGroup.rotation.x = 0.42 + pointer.y * 0.08;
      ringGroup.rotation.y = elapsed * 0.18 + pointer.x * 0.28;
      ringGroup.rotation.z = Math.sin(elapsed * 0.24) * 0.04;
      ringGroup.position.y = Math.sin(elapsed * 0.38) * 0.85;
      ringGroup.position.x = pointer.x * 2.8;

      frameGroup.rotation.y = -elapsed * 0.06 + pointer.x * 0.12;
      frameGroup.rotation.x = 0.06 + pointer.y * 0.06;

      deepField.rotation.y = elapsed * 0.018;
      deepField.rotation.x = elapsed * 0.008;
      midField.rotation.y = -elapsed * 0.03;
      midField.rotation.x = elapsed * 0.012;
      leftEdgeField.rotation.y = -0.13 + elapsed * 0.02;
      leftEdgeField.rotation.z = Math.sin(elapsed * 0.18) * 0.028;
      leftEdgeField.position.y = Math.sin(elapsed * 0.28) * 0.9;
      rightEdgeField.rotation.y = 0.13 - elapsed * 0.022;
      rightEdgeField.rotation.z = Math.cos(elapsed * 0.16) * 0.028;
      rightEdgeField.position.y = Math.cos(elapsed * 0.24) * 0.9;

      camera.position.x += (pointer.x * 2.2 - camera.position.x) * 0.035;
      camera.position.y += (pointer.y * 1.45 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      resize();
      if (prefersReducedMotion.matches) {
        active = false;
        renderOnce();
        return;
      }

      active = true;
      frame = window.requestAnimationFrame(animate);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        active = false;
        cancelAnimationFrame(frame);
        return;
      }

      if (!prefersReducedMotion.matches) {
        restart();
      } else {
        renderOnce();
      }
    };

    window.addEventListener("resize", restart);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", restart);
    }

    restart();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", restart);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (typeof prefersReducedMotion.removeEventListener === "function") {
        prefersReducedMotion.removeEventListener("change", restart);
      }

      geometry.dispose();
      material.dispose();
      ringMaterials.forEach((item) => item.dispose());
      ringA.geometry.dispose();
      ringB.geometry.dispose();
      ringC.geometry.dispose();
      core.geometry.dispose();
      outerFrame.geometry.dispose();
      innerFrame.geometry.dispose();
      (outerFrame.material as THREE.Material).dispose();
      (innerFrame.material as THREE.Material).dispose();
      deepField.geometry.dispose();
      deepField.material.dispose();
      midField.geometry.dispose();
      midField.material.dispose();
      leftEdgeField.geometry.dispose();
      leftEdgeField.material.dispose();
      rightEdgeField.geometry.dispose();
      rightEdgeField.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="home-future-backdrop" aria-hidden>
      <div ref={mountRef} className="home-future-backdrop__mount" />
      <div className="home-future-overlay home-future-overlay--mesh" />
      <div className="home-future-overlay home-future-overlay--glow" />
      <div className="home-future-overlay home-future-overlay--celestial-feather" />
      <div className="home-future-overlay home-future-overlay--edge-dust" />
      <div className="home-future-overlay home-future-overlay--scanlines" />
      <div className="home-future-overlay home-future-overlay--noise" />
      <div className="home-future-overlay home-future-overlay--vignette" />
    </div>
  );
}

export default function HomeCinematicPage() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;

    const updateScroll = () => {
      document.documentElement.style.setProperty("--home-scroll", `${window.scrollY}px`);
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.documentElement.style.setProperty("--home-scroll", "0px");
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const heroTargets = [
        ".home-hero-badge",
        ".home-title-line",
        ".home-hero-copy",
        ".home-hero-actions",
        ".home-hero-stat",
        ".home-panel",
      ];

      if (!reducedMotion) {
        gsap.set(heroTargets, {
          opacity: 0,
          y: 26,
          filter: "blur(10px)",
          transformPerspective: 1200,
        });

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .to(".home-hero-badge", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7 })
          .to(".home-title-line", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.09 }, "-=0.35")
          .to(".home-hero-copy", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.75 }, "-=0.45")
          .to(".home-hero-actions", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7 }, "-=0.4")
          .to(".home-hero-stat", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.65, stagger: 0.1 }, "-=0.35")
          .to(".home-panel", { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.95 }, "-=0.45");

        gsap.utils.toArray<HTMLElement>(".home-scroll-card").forEach((element) => {
          gsap.fromTo(
            element,
            { opacity: 0, y: 34, rotateX: 12, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              rotateX: 0,
              scale: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 84%",
                end: "bottom 72%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });

        gsap.to(".home-future-overlay--glow", {
          yPercent: -10,
          scale: 1.04,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });

        gsap.to(".home-future-overlay--mesh", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      } else {
        gsap.set(heroTargets, { opacity: 1, y: 0, filter: "none" });
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className="home-future-stage min-h-screen text-white">
      <HomeFutureBackdrop />

      <div className="home-future-shell relative z-10">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/images/logo/logo-latest.png" alt="AnimeFlow" className="brand-logo" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="home-button home-button--secondary px-4 py-2 text-sm font-semibold">
              登录
            </Link>
            <Link href="/register" className="home-button home-button--primary px-4 py-2 text-sm font-semibold">
              注册
            </Link>
          </nav>
        </header>

        <section className="home-hero mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pb-10 pt-4 lg:grid-cols-[1fr_520px] lg:items-center">
          <div className="py-8">
            <div className="home-hero-badge inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/76">
              <Sparkles size={14} className="text-orange-400" />
              AI 影视生产平台
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] md:text-6xl">
              <span className="home-title-line block">从灵感到成片的</span>
              <span className="home-title-line home-title-line--accent block">电影级 AI 内容工厂</span>
            </h1>

            <p className="home-hero-copy mt-5 max-w-2xl text-lg leading-8 text-white/68">
              AnimeFlow 将剧本创作、资产管理、分镜设计、内容审查、视频生成和剪辑导出纳入同一条可追踪的生产链路。
            </p>

            <div className="home-hero-actions mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="home-button home-button--primary inline-flex items-center gap-2 px-5 py-3 font-semibold">
                开始创作
                <ArrowRight size={18} />
              </Link>
              <Link href="/dashboard" className="home-button home-button--secondary inline-flex items-center gap-2 px-5 py-3 font-semibold">
                进入工作台
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { title: "快链路", text: "从灵感到任务编排", icon: Zap },
                { title: "可管控", text: "权限与用量可配置", icon: ShieldCheck },
                { title: "有质感", text: "叙事、光影、节奏统一", icon: Film },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="home-hero-stat flex items-center gap-3 px-4 py-3">
                    <Icon size={16} className="shrink-0 text-orange-400" />
                    <div>
                      <strong className="block text-sm font-semibold text-white">{item.title}</strong>
                      <span className="block text-sm text-white/56">{item.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-panel overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-white/45">Production Workspace</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">专业级 AI 内容生产工作台</h2>
                  <p className="mt-1 text-sm text-white/60">剧本、资产、分镜、审查、生成、导出全流程串联</p>
                </div>
                <Clapperboard className="text-orange-400" size={28} />
              </div>
            </div>

            <div className="grid gap-4 p-5">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article key={step.title} className="home-step-card home-scroll-card grid grid-cols-[56px_1fr] gap-4 p-4">
                    <div className="home-step-index flex h-14 w-14 items-center justify-center">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="home-step-icon">
                          <Icon size={14} />
                        </span>
                        <h3 className="text-base font-semibold text-white">{step.title}</h3>
                      </div>
                      <p className="text-sm leading-6 text-white/62">{step.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 pb-14 md:grid-cols-3">
          {capabilities.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="home-feature-card home-scroll-card p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-card bg-white/6 text-orange-400">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/64">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="border-t border-white/10 bg-white/4">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-8 md:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.title} className="home-metric home-scroll-card flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="shrink-0 text-orange-400" size={22} />
                <div>
                  <span className="block font-semibold text-white">{item.title}</span>
                  <span className="block text-sm text-white/56">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
