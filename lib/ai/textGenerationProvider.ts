import { AssetInput, GeneratedAsset, GeneratedScript, GeneratedStoryboard, ProjectContext, ProviderResult } from "@/lib/ai/types";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import { openAICompatibleProvider } from "@/lib/ai/providers/openAICompatibleProvider";

type Operation<T> = () => Promise<T>;
type Fallback<T> = () => T;

function textProviderName() {
  return (process.env.AI_TEXT_PROVIDER || "openai-compatible").trim();
}

function fallbackMode() {
  return (process.env.AI_FALLBACK_MODE || "mock").trim().toLowerCase();
}

async function runWithFallback<T>(operation: Operation<T>, fallback: Fallback<T>): Promise<ProviderResult<T>> {
  const provider = textProviderName();
  if (provider === "mock" || provider === "dynamic-mock") {
    return { provider: "dynamic-mock", payload: fallback() };
  }

  if (provider !== "openai-compatible") {
    if (fallbackMode() === "error") {
      throw new Error(`不支持的 AI_TEXT_PROVIDER：${provider}`);
    }
    return { provider: "dynamic-mock-fallback", payload: fallback() };
  }

  try {
    return {
      provider: openAICompatibleProvider.providerLabel(),
      payload: await operation()
    };
  } catch (error) {
    if (fallbackMode() === "error") {
      throw error;
    }
    return { provider: "dynamic-mock-fallback", payload: fallback() };
  }
}

export const textGenerationProvider = {
  generateScript(input: { idea: string; project?: ProjectContext }): Promise<ProviderResult<GeneratedScript>> {
    return runWithFallback(
      () => openAICompatibleProvider.generateScript(input),
      () => mockProvider.generateScript(input)
    );
  },

  extractAssetsFromScript(input: {
    scriptContent: string;
    project?: ProjectContext;
  }): Promise<ProviderResult<GeneratedAsset[]>> {
    return runWithFallback(
      () => openAICompatibleProvider.extractAssetsFromScript(input),
      () => mockProvider.extractAssetsFromScript(input)
    );
  },

  generateStoryboard(input: {
    scriptContent: string;
    assets: AssetInput[];
    project?: ProjectContext;
  }): Promise<ProviderResult<GeneratedStoryboard[]>> {
    return runWithFallback(
      () => openAICompatibleProvider.generateStoryboard(input),
      () => mockProvider.generateStoryboard(input)
    );
  }
};
