import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getGameTips(score: number, mode: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `玩家正在玩一个名为 SumStack 的数学求和游戏。
      当前得分: ${score}
      模式: ${mode}
      请为玩家提供一条非常简短的、鼓励性的中文建议或有趣的数学小知识。只需一句话。`,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching tips:", error);
    return "Keep summing! You're doing great.";
  }
}
