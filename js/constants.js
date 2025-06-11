/**
 * @fileoverview Defines constants used throughout the extension, particularly for message generation.
 */

export const MESSAGE_LENGTH_OPTIONS = {
  0: {
    label: "Very Short",
    promptInstruction:
      "Ensure the response is extremely brief and concise, suitable for quick updates or acknowledgements. For emails, 1-2 short sentences. For messages, a few words to one short sentence.",
  },
  1: {
    label: "Short",
    promptInstruction:
      "Generate a short and to-the-point response. For emails, aim for 2-3 concise sentences. For messages, one or two brief sentences.",
  },
  2: {
    label: "Medium",
    promptInstruction:
      "Produce a standard, professionally balanced response in terms of length and detail. This is the default length.",
  },
  3: {
    label: "Long",
    promptInstruction:
      "Provide a slightly more detailed response, offering more context or explanation if necessary, but maintain professional conciseness. Avoid excessive length; aim for clarity and completeness without being verbose.",
  },
};

export const getel = (id) => document.getElementById(id);

export const DEFAULT_MESSAGE_LENGTH_KEY = "2";
