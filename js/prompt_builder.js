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
 * @param {object} promptData.contextualData - Contextual form data (e.g., clientStatus, meetingAction, etc.).
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

  let baseSystemPrompt = `
You are an LLM assistant for ${companyInfo.name}.
Your goal is to help ${writerName} from APEXAI write effective ${outputType === "email" ? "emails" : "short messages"}.

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

General Instructions:
1.  Carefully review all fixed company information and the user's specific requirements.
2.  Generate content that fulfills the task, incorporating relevant company details naturally and only where appropriate.
3.  Adhere to the desired tone: ${companyInfo.tone.toLowerCase()}.
4.  Regarding length: ${lengthInstruction}
5.  Ensure the output is tailored to the user's input, the selected situation, and all additional context provided.
6.  If the user's requirements are vague, make reasonable assumptions based on the company context and the specific task.
7.  The output should be ONLY the generated ${outputType === "email" ? "email" : "message(s)"}, ready to be copied and pasted. Do not include any of these instructions or preamble in the response.
8.  **Output Format**: The entire ${outputType === "email" ? "email body" : "message content"} must be plain text. Do not use any Markdown formatting (no bold, italics, Markdown links, lists, or headers). If a URL is necessary, write it out directly (e.g., https://www.example.com).
`;

  if (outputType === "message_sequence") {
    baseSystemPrompt += `
Instructions for Message Sequence:
- Generate a sequence of ${numMessagesForSequence} short, distinct messages.
- Each message MUST start with a label: "MESSAGE 1:", "MESSAGE 2:", etc., on its own line.
- After each complete message (including its label and content), if it is NOT the last message in the sequence, add a new line containing only "---" to act as a separator.
  Example for ${numMessagesForSequence} messages:
  MESSAGE 1:
  [Content of message 1]
  ${numMessagesForSequence > 1 ? "---\nMESSAGE 2:\n[Content of message 2]" : ""}
  ${numMessagesForSequence > 2 ? "---\nMESSAGE 3:\n[Content of message 3]" : ""}
  (Ensure the "---" separator is used correctly between messages if more than one.)
- Keep messages concise and suitable for informal chat platforms (Discord, WhatsApp, Slack).
`;
  }

  let taskSpecificInstructions = "";

  if (selectedSituation === "meeting-request") {
    const {
      clientStatus,
      meetingAction,
      meetingPurpose, // for schedule
      meetingDuration, // for schedule
      availability, // for schedule
      meetingIdentifier, // for cancel, reschedule, reminder, join_request
      cancellationReason, // for cancel
      originalMeetingTime, // for reschedule
      rescheduleReason, // for reschedule
      newAvailability, // for reschedule
      meetingTime, // for reminder
      reminderKeyPoints, // for reminder
      joinReason, // for join_request
    } = contextualData;

    taskSpecificInstructions += `\nTask: Meeting Request - Action: ${meetingAction}\n`;
    taskSpecificInstructions += `Client Status: ${clientStatus || "Not specified"}.\n`;

    if (clientStatus === "existing") {
      taskSpecificInstructions += `- For EXISTING clients: Be concise, direct. No general company intro. Focus on the meeting action. Maintain a professional, familiar tone.\n`;
    } else {
      taskSpecificInstructions += `- For NEW/PROSPECT clients: Subtly weave in ${companyInfo.name}'s relevance if it directly relates to the meeting's purpose, but keep it brief. Primary focus is the meeting action.\n`;
    }

    switch (meetingAction) {
      case "schedule":
        taskSpecificInstructions += `Objective: Schedule a new meeting.
- Purpose: ${meetingPurpose || "User will provide in core message."}
- Proposed Duration: ${meetingDuration || "Not specified."}
- Writer's Availability: ${availability || "User may specify or ask recipient."}
- Clearly state the purpose, suggest agenda if appropriate, and offer flexible timing. Respect recipient's time.`;
        break;
      case "cancel":
        taskSpecificInstructions += `Objective: Cancel an existing meeting.
- Meeting to Cancel (Topic/Identifier): ${meetingIdentifier || "User will provide in core message."}
- Reason for Cancellation: ${cancellationReason || "Not specified, be polite and general if so."}
- Write a polite cancellation. If no reason is provided, offer a general apology for any inconvenience. Consider if offering to reschedule is appropriate (user prompt might indicate this).`;
        break;
      case "reschedule":
        taskSpecificInstructions += `Objective: Reschedule an existing meeting.
- Meeting to Reschedule (Topic/Identifier): ${meetingIdentifier || "User will provide in core message."}
- Original Meeting Time: ${originalMeetingTime || "Not specified."}
- Reason for Rescheduling: ${rescheduleReason || "Not specified, be polite."}
- Writer's New Availability / Proposed Times: ${newAvailability || "Ask for recipient's availability or state flexibility."}
- Politely request to reschedule. Explain briefly if a reason is provided. Offer new times or ask for their availability.`;
        break;
      case "reminder":
        taskSpecificInstructions += `Objective: Send a reminder for an upcoming meeting.
- Meeting (Topic/Identifier): ${meetingIdentifier || "User will provide in core message."}
- Meeting Date & Time: ${meetingTime || "User will provide in core message."}
- Key Points/Agenda to Remind: ${reminderKeyPoints || "None specified, just a general reminder."}
- Send a friendly reminder. Confirm date/time. Briefly mention key points if provided.`;
        break;
      case "join_request":
        taskSpecificInstructions += `Objective: Request to join an ongoing or upcoming meeting.
- Meeting (Topic/Identifier): ${meetingIdentifier || "User will provide in core message."}
- Reason for Wanting to Join: ${joinReason || "User will provide in core message."}
- Write a concise request to join. Clearly state the reason. If for an ongoing meeting, imply urgency and politeness.`;
        break;
      default:
        taskSpecificInstructions += `Objective: General meeting request (action not specified, use default behavior).
- The user wants to arrange a meeting. Use the user's core message for purpose and details.
- ${situationTemplates["meeting-request"]}`;
    }
  } else {
    taskSpecificInstructions = `
Task:
The user wants to write an ${outputType} for a "${selectedSituation.replace(/-/g, " ")}" context.
The general template/guideline for this task is: "${situationTemplates[selectedSituation]}"
Adapt this guideline for ${outputType === "message_sequence" ? "a short message sequence" : "an email"}.
`;
  }

  return baseSystemPrompt + taskSpecificInstructions;
}
