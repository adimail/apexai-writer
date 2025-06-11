/**
 * Calls the specified LLM provider to generate content.
 * Supports streaming for Google Gemini.
 *
 * @param {string} provider - The LLM provider ('openai' or 'google').
 * @param {string} model - The model version to use.
 * @param {string} apiKey - The API key for the provider.
 * @param {string} systemPrompt - The system prompt/instructions for the LLM.
 * @param {string} userPrompt - The user's core prompt/message.
 * @param {object} [contextualData={}] - Additional key-value data for context.
 * @param {function(string): void} [onChunkReceived] - Optional callback for streaming responses.
 *        Receives text chunks as they arrive.
 * @returns {Promise<string>} A promise that resolves to the full generated text.
 */
export async function callLlmProvider(
  provider,
  model,
  apiKey,
  systemPrompt,
  userPrompt,
  contextualData = {},
  onChunkReceived,
) {
  if (!apiKey) {
    throw new Error(
      `API Key for ${provider} is missing. Please set it in Settings.`,
    );
  }

  let finalUserPrompt = userPrompt;
  const contextualDataString = Object.entries(contextualData)
    .map(([key, value]) =>
      value
        ? `${key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}: ${value}`
        : "",
    )
    .filter(Boolean)
    .join("\n");

  if (contextualDataString) {
    finalUserPrompt = `User's Core Message Context:\n${userPrompt}\n\nAdditional Context for this Message Type:\n${contextualDataString}`;
  }

  console.log("Calling LLM Provider:", {
    provider,
    model,
    apiKeyPresent: !!apiKey,
    streamingEnabled: typeof onChunkReceived === "function",
  });

  if (provider === "google") {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const requestBody = {
      contents: [{ role: "user", parts: [{ text: finalUserPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 10,
      },
    };

    if (systemPrompt) {
      requestBody.system_instruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Google API Error: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = `Google API Error: ${response.status} - ${errorJson.error?.message || errorBody}`;
        } catch (e) {
          errorMessage = `Google API Error: ${response.status} ${response.statusText}. Response: ${errorBody}`;
        }
        console.error("Google API Error details:", errorBody);
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Response body is null, cannot stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponseText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let position;
        while ((position = buffer.indexOf("\n")) >= 0) {
          const line = buffer.substring(0, position).trim();
          buffer = buffer.substring(position + 1);

          if (line.startsWith("data:")) {
            const jsonData = line.substring(5).trim();
            if (jsonData) {
              try {
                const parsedJson = JSON.parse(jsonData);
                const textChunk =
                  parsedJson?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (textChunk) {
                  if (typeof onChunkReceived === "function") {
                    onChunkReceived(textChunk);
                  }
                  fullResponseText += textChunk;
                }
              } catch (e) {
                console.warn(
                  "Error parsing JSON from stream line:",
                  e,
                  "Data:",
                  jsonData,
                );
              }
            }
          }
        }
      }
      return fullResponseText;
    } catch (error) {
      console.error("Error calling Google Gemini API:", error);
      throw error;
    }
  } else if (provider === "openai") {
    console.log(
      "OpenAI provider selected. Using simulation with potential streaming.",
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    let simulatedResponse;
    if (systemPrompt.includes("MESSAGE 1:") && systemPrompt.includes("---")) {
      const numMessages =
        systemPrompt.match(/Generate a sequence of (\d+) short/)?.[1] || 2;
      simulatedResponse = "";
      for (let i = 1; i <= numMessages; i++) {
        simulatedResponse += `MESSAGE ${i}:\nThis is simulated message ${i} of ${numMessages} for your request about "${userPrompt.substring(0, 30)}...". It's short and sweet for chat.\n`;
        if (i < numMessages) {
          simulatedResponse += "---\n";
        }
      }
    } else {
      simulatedResponse = `This is a simulated OpenAI (${model}) email response for your request about "${userPrompt.substring(0, 50)}...".\n\n`;
      simulatedResponse += `The model would elaborate based on the system prompt and user context. This simulation demonstrates how streaming might appear. Each word appears sequentially.`;
    }

    if (typeof onChunkReceived === "function") {
      const words = simulatedResponse.split(/(\s+|\n---\n)/);
      for (const word of words) {
        if (word) {
          onChunkReceived(word);
          await new Promise((resolve) =>
            setTimeout(resolve, 30 + Math.random() * 50),
          );
        }
      }
      return simulatedResponse;
    } else {
      return simulatedResponse;
    }
  } else {
    console.warn(
      `Provider '${provider}' not recognized or not implemented for streaming. Using generic simulation.`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const simulatedResponse = `Simulated response for ${provider} - ${model}.\nUser prompt: ${userPrompt.substring(0, 100)}...`;
    if (typeof onChunkReceived === "function") {
      onChunkReceived(
        simulatedResponse.substring(0, simulatedResponse.length / 2),
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      onChunkReceived(
        simulatedResponse.substring(simulatedResponse.length / 2),
      );
    }
    return simulatedResponse;
  }
}

/**
 * This function is a placeholder for making actual non-streaming API calls.
 * The primary logic for Gemini (streaming) is now within callLlmProvider.
 * For OpenAI, a similar streaming or non-streaming implementation would go into callLlmProvider.
 */
async function makeActualApiCall(provider, model, apiKey, messages) {
  console.log("DEPRECATED PATH (makeActualApiCall) - Simulation:", {
    provider,
    model,
    messages,
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  let simulatedResponse =
    "This is a simulated LLM response from makeActualApiCall (mostly deprecated).\n\n";
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    simulatedResponse += `Received user message: "${messages[messages.length - 1].content.substring(0, 150)}..."\n`;
  }
  simulatedResponse += `Provider: ${provider}, Model: ${model}.\n`;

  if (provider === "openai") {
    return simulatedResponse;
  } else if (provider === "google") {
    console.warn(
      "makeActualApiCall for Google is simulated; streaming is primary in callLlmProvider.",
    );
    return simulatedResponse;
  }
  return simulatedResponse;
}
