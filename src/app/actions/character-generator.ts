"use server";

import { z } from "zod";
import { OpenAI } from "openai";
import { auth } from "@/server/auth";

// Define the response type
export type CharacterGenerationResponse = {
  success: boolean;
  character?: {
    name: string;
    tagline: string;
    description: string;
    greeting: string;
  };
  error?: string;
};

// Utility: detect dev mode
const isDev = process.env.NODE_ENV === "development";

// Utility: shared system prompt (same as before)
const systemPrompt = `You are a creative character generator.
... <omitted for brevity, use your full prompt here> ...
Ensure the JSON is properly closed with all matching braces`;

// --- Main Action ---
export async function generateCharacterDetails(
  prompt: string
): Promise<CharacterGenerationResponse> {
  console.log("[SERVER] generateCharacterDetails called with prompt:", prompt);

  try {
    // Auth check
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "You must be logged in to generate characters" };
    }

    if (!prompt.trim()) {
      return { success: false, error: "Prompt is required" };
    }

    // DEV: Use Ollama local
    if (isDev) {
      try {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        // Change to the model you have downloaded
        const ollamaModel = process.env.OLLAMA_MODEL || "llama3";
        const ollamaApiUrl = `${ollamaUrl}/api/chat`;

        const res = await fetch(ollamaApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Create a character based on this prompt: "${prompt}"` }
            ],
            options: {
              temperature: 0.7,
              num_ctx: 4096,
            },
          }),
        });

        const data = await res.json();
        // If Ollama supports "message.content" (mimicking OpenAI), adjust as needed.
        let content = data.message?.content || data?.choices?.[0]?.message?.content || data?.response;

        if (!content) {
          throw new Error("No content returned from Ollama");
        }

        // Parse the JSON in the same way as before
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to extract JSON object");
        const parsedResponse = JSON.parse(jsonMatch[0]);

        if (!parsedResponse.name || !parsedResponse.tagline ||
            !parsedResponse.description || !parsedResponse.greeting) {
          return { success: false, error: "Invalid response structure from Ollama" };
        }

        return { success: true, character: parsedResponse };
      } catch (err) {
        console.error("[SERVER] Ollama error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    // PROD: Use OpenAI/OpenRouter as before
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENAI_MODEL || "mistralai/mistral-nemo";

    if (!apiKey) {
      return { success: false, error: "AI service is not properly configured" };
    }

    const openai = new OpenAI({ apiKey, baseURL: baseUrl });

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a character based on this prompt: "${prompt}"` }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message.content;

    // Parse OpenAI response (same as before)
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to extract JSON object");
    const parsedResponse = JSON.parse(jsonMatch[0]);

    if (!parsedResponse.name || !parsedResponse.tagline ||
        !parsedResponse.description || !parsedResponse.greeting) {
      return { success: false, error: "Invalid response structure from AI service" };
    }

    return { success: true, character: parsedResponse };

  } catch (error) {
    console.error("[SERVER] Character generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
