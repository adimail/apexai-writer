/**
 * @fileoverview Responsible for building system prompts for the LLM.
 */

/**
 * Builds the system prompt for the LLM based on the application state and configuration.
 * @param {object} promptData - Object containing necessary data for prompt construction.
 * @param {string} promptData.outputType - 'email' or 'message_sequence'.
 * @param {string} promptData.selectedSituation - The key for the selected situation.
 * @param {number} promptData.numMessagesForSequence - Number of messages for a sequence.
 * @param {string} promptData.userName - The name of the user/writer.
 * @param {string} promptData.preferredMessageLengthKey - Key for preferred message length.
 * @param {object} promptData.companyInfo - The company information object.
 * @param {object} promptData.situationTemplates - The situation templates object.
 * @param {object} promptData.messageLengthOptions - The message length options object.
 * @param {object} promptData.contextualData - Contextual form data (e.g., clientStatus).
 * @param {string} promptData.defaultMessageLengthKey - The default key for message length if preferred is not found.
 * @returns {string} The constructed system prompt.
 */
export function buildSystemPrompt({
  outputType,
  selectedSituation,
  numMessagesForSequence,
  userName,
  preferredMessageLengthKey,
  companyInfo,
  situationTemplates,
  messageLengthOptions,
  contextualData,
  defaultMessageLengthKey,
}) {
  const writerName = userName ? userName : "an employee";
  const lengthInstruction =
    messageLengthOptions[preferredMessageLengthKey]?.promptInstruction ||
    messageLengthOptions[defaultMessageLengthKey].promptInstruction;

  let systemPrompt = "";

  if (outputType === "email") {
    systemPrompt = `
You are an LLM assistant for ${companyInfo.name}.
Your goal is to help employees write effective emails.
The email is being written by ${writerName} from APEXAI.

Company Information (Fixed - Do Not Deviate):
- Name: ${companyInfo.name}
- Industry: ${companyInfo.industry}
- Core Services: ${companyInfo.servicesSummary}
- Detailed Services: ${companyInfo.detailedServices.map((s) => `${s.name}: ${s.tech}`).join("; ")}
- Unique Value Proposition: "${companyInfo.uniqueValue}"
- Desired Tone: ${companyInfo.tone}
- Target Audience: ${companyInfo.targetAudience}
- Brand Keywords: ${companyInfo.brandVoiceKeywords}
- Website: ${companyInfo.url}
- Services Page: ${companyInfo.servicesPage}
- Projects Page: ${companyInfo.projectsPage}

Task:
The user wants to write an email for a "${selectedSituation.replace(/-/g, " ")}" context.
The general template/guideline for this task is: "${situationTemplates[selectedSituation]}"

User's Core Message & Additional Context (if provided):
(This will be provided in the user message part of the prompt)

Instructions:
1.  Carefully review all the fixed company information and the user's specific requirements.
2.  Generate an email that fulfills the task, incorporating relevant company details naturally.
3.  Adhere to the desired tone: ${companyInfo.tone.toLowerCase()}.
4.  Regarding length: ${lengthInstruction}
5.  Ensure the email is tailored to the user's input, the selected situation, and any additional context provided by the user for this specific message type.
6.  If the user's requirements are vague, make reasonable assumptions based on the company context.
7.  The output should be ONLY the generated email, ready to be copied and pasted. Do not include any of these instructions or preamble in the response.
8.  **Output Format**: The entire email body must be plain text. Do not use any Markdown formatting. This means:
    - No bold text (like \`**text**\` or \`__text__\`).
    - No italic text (like \`*text*\` or \`_text_\`).
    - No Markdown links (like \`[link text](URL)\`). If a URL is necessary, write it out directly (e.g., https://www.example.com).
    - No Markdown lists (using \`*\`, \`-\`, or numbered lists).
    - No Markdown headers (using \`#\`).
`;
    if (selectedSituation === "meeting-request") {
      const clientStatus = contextualData.clientStatus;

      if (clientStatus === "existing") {
        systemPrompt += `\nIMPORTANT: This meeting request is for an EXISTING client.
- Be very concise and direct.
- DO NOT include a general company overview or introduction of ${companyInfo.name}. The recipient already knows us.
- Focus solely on the meeting's purpose, proposed agenda (if any from user), and logistics.
- Maintain a professional and familiar tone suitable for an existing relationship.`;
      } else {
        // Default to new/prospect if clientStatus is not 'existing' or is undefined
        systemPrompt += `\nNOTE: This meeting request might be for a new contact or someone less familiar with ${companyInfo.name}.
- If appropriate and brief, you can subtly weave in what ${companyInfo.name} does if it directly relates to the meeting's purpose.
- However, the primary focus remains on the meeting request itself: purpose, agenda (if any from user), logistics.
- Avoid a lengthy company introduction. Keep any company mention extremely brief and highly relevant.`;
      }
    }
  } else {
    // outputType === 'message_sequence'
    const numMessages = numMessagesForSequence;
    systemPrompt = `
You are an LLM assistant for ${companyInfo.name}.
Your goal is to help ${writerName} write a sequence of effective short messages for platforms like Discord, WhatsApp, or Slack.

Company Information (Fixed - Do Not Deviate):
- Name: ${companyInfo.name}
- Industry: ${companyInfo.industry}
- Core Services (briefly, if relevant for short messages): ${companyInfo.servicesSummary}
- Unique Value Proposition (if adaptable to short form): "${companyInfo.uniqueValue}"
- Desired Tone: ${companyInfo.tone} (adapt for brevity on chat platforms)
- Website: ${companyInfo.url}

Task:
The user wants to write a sequence of short messages for a "${selectedSituation.replace(/-/g, " ")}" context.
The general email-focused guideline for this task is: "${situationTemplates[selectedSituation]}"

User's Core Message & Additional Context (if provided):
(This will be provided in the user message part of the prompt)

Instructions for Message Sequence:
1.  Generate a sequence of ${numMessages} short, distinct messages.
2.  Adapt the email-focused guideline and the user's core message into this sequence. Each message should be concise.
3.  Regarding length for each message in the sequence: ${lengthInstruction}
4.  Each message MUST start with a label: "MESSAGE 1:", "MESSAGE 2:", etc., on its own line.
5.  After each complete message (including its label and content), if it is NOT the last message in the sequence, add a new line containing only "---" to act as a separator.
    Example for ${numMessages} messages:
    MESSAGE 1:
    [Content of message 1]
    ${numMessages > 1 ? "---\nMESSAGE 2:\n[Content of message 2]" : ""}
    ${numMessages > 2 ? "---\nMESSAGE 3:\n[Content of message 3]" : ""}
    (Ensure the "---" separator is used correctly between messages if more than one.)
6.  Ensure the messages form a coherent flow.
7.  Incorporate relevant company details naturally and very briefly, only if appropriate for short messages.
8.  Adhere to the desired tone (${companyInfo.tone.toLowerCase()}), but keep messages concise and suitable for informal chat platforms.
9.  The output should ONLY be the generated messages with their labels and separators as specified. Do not include any of these instructions or preamble in the response.
10. **Output Format**: The content of each message must be plain text. Do not use any Markdown formatting. This means:
    - No bold text (like \`**text**\` or \`__text__\`).
    - No italic text (like \`*text*\` or \`_text_\`).
    - No Markdown links (like \`[link text](URL)\`). If a URL is necessary, write it out directly (e.g., https://www.example.com).
    - No Markdown lists (using \`*\`, \`-\`, or numbered lists).
`;
    if (selectedSituation === "meeting-request") {
      const clientStatus = contextualData.clientStatus;

      if (clientStatus === "existing") {
        systemPrompt += `\nIMPORTANT (for existing client messages):
- Keep messages extremely brief and to the point.
- No company introduction needed. The recipient already knows us.
- Focus on meeting purpose/logistics.`;
      } else {
        // Default to new/prospect if clientStatus is not 'existing' or is undefined
        systemPrompt += `\nNOTE (for new client messages):
- Messages should still be very brief.
- A very short mention of APEXAI's relevance can be included only if absolutely vital for context in a short message format.
- Focus on meeting purpose/logistics. Avoid company details unless critical.`;
      }
    }
  }
  return systemPrompt;
}
