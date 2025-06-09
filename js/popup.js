import {
  modelConfigs,
  companyInfo,
  getSituationTemplates,
} from "./config.js";
import { renderContextualInputs, getContextualFormData } from "./ui.js";
import { callLlmProvider } from "./llm.js";
import {
  saveEncryptedSettings,
  loadDecryptedSettings,
} from "./secure_storage.js";

let appState = {
  currentView: "main",
  selectedProvider: null,
  selectedModel: null,
  apiKeys: {
    openai: null,
    google: null,
  },
  userName: "",
  isFocusOutputMode: false,
  outputType: "email",
  numMessagesForSequence: 2,
  generateButtonBaseText: "Generate Email",
  rawLastLlmResponse: "",
};

const mainView = document.getElementById("mainView");
const settingsView = document.getElementById("settingsView");
const resetOutputBtn = document.getElementById("resetOutputBtn");

const settingsBtn = document.getElementById("settingsBtn");
const currentModelDisplay = document.getElementById("currentModelDisplay");

const userPromptTextarea = document.getElementById("userPrompt");
const outputTypeSelect = document.getElementById("outputTypeSelect");
const numMessagesGroup = document.getElementById("numMessagesGroup");
const numMessagesSelect = document.getElementById("numMessagesSelect");
const situationLabel = document.getElementById("situationLabel");
const situationBtns = document.querySelectorAll(".situation-btn");
const contextualInputsContainer = document.getElementById(
  "contextualInputsContainer",
);
const generateBtn = document.getElementById("generateBtn");
const outputSectionDiv = document.getElementById("outputSection");
const outputTextDiv = document.getElementById("outputText");
const copyBtn = document.getElementById("copyBtn");
const selectInputBoxBtn = document.getElementById("selectInputBoxBtn");

const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsModelProviderSelect = document.getElementById(
  "settingsModelProvider",
);
const settingsModelVersionSelect = document.getElementById(
  "settingsModelVersion",
);

const settingsApiKeySectionOpenAI = document.getElementById(
  "settingsApiKeySectionOpenAI",
);
const settingsApiKeyInputOpenAI = document.getElementById(
  "settingsApiKeyOpenAI",
);
const apiKeyStatusOpenAI = document.getElementById("apiKeyStatusOpenAI");

const settingsApiKeySectionGoogle = document.getElementById(
  "settingsApiKeySectionGoogle",
);
const settingsApiKeyInputGoogle = document.getElementById(
  "settingsApiKeyGoogle",
);
const apiKeyStatusGoogle = document.getElementById("apiKeyStatusGoogle");
const fixedCompanyInfoList = document.getElementById("fixedCompanyInfoList");
const settingsGlobalStatusP = document.getElementById("settingsGlobalStatus");
const settingsUserNameInput = document.getElementById("settingsUserName");

document.addEventListener("DOMContentLoaded", initializeApp);

function isAiModelConfigured() {
  return !!(
    appState.selectedProvider &&
    appState.selectedModel &&
    appState.apiKeys[appState.selectedProvider]
  );
}

async function initializeApp() {
  const loadedSettings = await loadDecryptedSettings();

  if (loadedSettings) {
    appState = {
      ...appState,
      ...loadedSettings,
      apiKeys: {
        openai: loadedSettings.apiKeys?.openai || null,
        google: loadedSettings.apiKeys?.google || null,
      },
      outputType: loadedSettings.outputType || "email",
      numMessagesForSequence: loadedSettings.numMessagesForSequence || 2,
    };
  }
  appState.generateButtonBaseText =
    appState.outputType === "email" ? "Generate Email" : "Generate Messages";
  generateBtn.textContent = appState.generateButtonBaseText;

  appState.currentView = "main";
  appState.isFocusOutputMode = false;

  if (!isAiModelConfigured()) {
    appState.currentView = "settings";
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent =
        "Please configure LLM Provider, Model, and API Key to use the extension.";
      settingsGlobalStatusP.className = "settings-status error";
    }
  }

  outputTypeSelect.value = appState.outputType;
  numMessagesSelect.value = appState.numMessagesForSequence.toString();
  updateOutputTypeUI();

  renderCurrentView();
  setupEventListeners();
  updateCurrentModelDisplay();
  validateMainForm();
  populateFixedCompanyInfo();
}

async function persistAppState() {
  const settingsToSave = {
    currentView: appState.currentView,
    selectedProvider: appState.selectedProvider,
    selectedModel: appState.selectedModel,
    apiKeys: appState.apiKeys,
    userName: appState.userName,
    isFocusOutputMode: appState.isFocusOutputMode,
    outputType: appState.outputType,
    numMessagesForSequence: appState.numMessagesForSequence,
  };

  try {
    await saveEncryptedSettings(settingsToSave);
  } catch (error) {
    console.error("Failed to save settings securely:", error);
  }

  updateCurrentModelDisplay();
  validateMainForm();
}

function renderFocusMode() {
  if (appState.isFocusOutputMode) {
    mainView.classList.add("focus-output-mode");
    if (settingsBtn) settingsBtn.style.display = "none";
  } else {
    mainView.classList.remove("focus-output-mode");
    if (settingsBtn) settingsBtn.style.display = "";
    if (
      outputTextDiv.textContent.trim() === "" &&
      !outputSectionDiv.classList.contains("error")
    ) {
      outputSectionDiv.classList.remove("show");
    }
  }
}

function renderCurrentView() {
  if (appState.currentView === "main") {
    mainView.style.display = "flex";
    settingsView.style.display = "none";
    if (settingsBtn) settingsBtn.title = "Open Settings";
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent = "";
      settingsGlobalStatusP.className = "settings-status";
    }
    renderFocusMode();
  } else {
    mainView.style.display = "none";
    settingsView.style.display = "block";
    if (settingsBtn) settingsBtn.title = "Back to Main View";
    populateSettingsForm();
  }

  if (settingsBtn) {
    if (appState.currentView === "main" && !appState.isFocusOutputMode) {
      settingsBtn.textContent = "⚙️";
    } else if (appState.currentView === "settings") {
      settingsBtn.textContent = "";
    }
  }
}

async function switchToView(viewName) {
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = "";
    settingsGlobalStatusP.className = "settings-status";
  }

  if (
    viewName === "main" &&
    !isAiModelConfigured() &&
    !appState.isFocusOutputMode
  ) {
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent =
        "LLM not configured. Please complete settings to proceed.";
      settingsGlobalStatusP.className = "settings-status error";
    }
    appState.currentView = "settings";
    populateSettingsForm();
    renderCurrentView();
    return;
  }

  appState.currentView = viewName;
  await persistAppState();
  renderCurrentView();
}

function updateOutputTypeUI() {
  const selectedOutputType = appState.outputType;
  if (selectedOutputType === "email") {
    situationLabel.textContent = "Email Type";
    numMessagesGroup.style.display = "none";
    appState.generateButtonBaseText = "Generate Email";
  } else {
    // message_sequence
    situationLabel.textContent = "Message Sequence Context";
    numMessagesGroup.style.display = "block";
    appState.generateButtonBaseText = "Generate Messages";
  }
  if (!generateBtn.disabled || generateBtn.innerHTML.includes("spinner")) {
    // Only update if not currently loading
    if (!generateBtn.innerHTML.includes("spinner")) {
      generateBtn.textContent = appState.generateButtonBaseText;
    }
  }
  validateMainForm();
}

function setupEventListeners() {
  settingsBtn.addEventListener("click", async () => {
    if (appState.isFocusOutputMode) return;
    await switchToView(appState.currentView === "main" ? "settings" : "main");
  });
  closeSettingsBtn.addEventListener(
    "click",
    async () => await switchToView("main"),
  );

  userPromptTextarea.addEventListener("input", validateMainForm);

  outputTypeSelect.addEventListener("change", async (e) => {
    appState.outputType = e.target.value;
    if (appState.outputType === "message_sequence") {
      appState.numMessagesForSequence = parseInt(numMessagesSelect.value, 10);
    }
    updateOutputTypeUI();
    await persistAppState();
  });

  numMessagesSelect.addEventListener("change", async (e) => {
    appState.numMessagesForSequence = parseInt(e.target.value, 10);
    await persistAppState();
  });

  situationBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      situationBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      appState.selectedSituation = btn.dataset.situation;
      renderContextualInputs(
        appState.selectedSituation,
        contextualInputsContainer,
      );
      validateMainForm();
    });
  });
  generateBtn.addEventListener("click", generateMessage);
  copyBtn.addEventListener("click", copyToClipboard);
  selectInputBoxBtn.addEventListener("click", handleSelectInputBox);

  settingsModelProviderSelect.addEventListener(
    "change",
    handleSettingsProviderChange,
  );
  settingsModelVersionSelect.addEventListener(
    "change",
    handleSettingsModelChange,
  );

  document.querySelectorAll(".save-key-btn").forEach((btn) => {
    btn.addEventListener(
      "click",
      async (e) => await saveApiKey(e.target.dataset.provider),
    );
  });
  document.querySelectorAll(".clear-key-btn").forEach((btn) => {
    btn.addEventListener(
      "click",
      async (e) => await clearApiKey(e.target.dataset.provider),
    );
  });

  if (settingsUserNameInput) {
    settingsUserNameInput.addEventListener("change", async (e) => {
      appState.userName = e.target.value.trim();
      await persistAppState();
    });
  }

  if (resetOutputBtn) {
    resetOutputBtn.addEventListener("click", async () => {
      appState.isFocusOutputMode = false;
      appState.rawLastLlmResponse = "";

      outputTextDiv.innerHTML = "";
      outputSectionDiv.classList.remove("show", "error");
      if (selectInputBoxBtn) selectInputBoxBtn.style.display = "none";

      await persistAppState();
      renderFocusMode();

      generateBtn.disabled = false;
      generateBtn.innerHTML = appState.generateButtonBaseText;

      validateMainForm();
    });
  }
}

function _populateModelVersionsForProvider(provider) {
  settingsModelVersionSelect.innerHTML =
    '<option value="">Choose model version</option>';
  settingsModelVersionSelect.disabled = true;

  if (provider && modelConfigs[provider]) {
    settingsModelVersionSelect.disabled = false;
    modelConfigs[provider].forEach((model) => {
      const option = document.createElement("option");
      option.value = model.value;
      option.textContent = model.label;
      settingsModelVersionSelect.appendChild(option);
    });
  }
}

function populateSettingsForm() {
  settingsModelProviderSelect.value = appState.selectedProvider || "";
  _populateModelVersionsForProvider(appState.selectedProvider);

  if (appState.selectedProvider && appState.selectedModel) {
    const providerModels = modelConfigs[appState.selectedProvider] || [];
    if (providerModels.some((m) => m.value === appState.selectedModel)) {
      settingsModelVersionSelect.value = appState.selectedModel;
    } else {
      appState.selectedModel = null;
      settingsModelVersionSelect.value = "";
    }
  } else {
    settingsModelVersionSelect.value = "";
  }

  settingsApiKeySectionOpenAI.style.display =
    appState.selectedProvider === "openai" ? "block" : "none";
  settingsApiKeySectionGoogle.style.display =
    appState.selectedProvider === "google" ? "block" : "none";

  settingsApiKeyInputOpenAI.value = appState.apiKeys.openai ? "********" : "";
  apiKeyStatusOpenAI.textContent = appState.apiKeys.openai
    ? "Key is set."
    : "No key set.";
  apiKeyStatusOpenAI.className = appState.apiKeys.openai
    ? "api-key-status success"
    : "api-key-status";

  settingsApiKeyInputGoogle.value = appState.apiKeys.google ? "********" : "";
  apiKeyStatusGoogle.textContent = appState.apiKeys.google
    ? "Key is set."
    : "No key set.";
  apiKeyStatusGoogle.className = appState.apiKeys.google
    ? "api-key-status success"
    : "api-key-status";

  if (settingsUserNameInput) {
    settingsUserNameInput.value = appState.userName || "";
  }
}

function populateFixedCompanyInfo() {
  if (fixedCompanyInfoList) {
    fixedCompanyInfoList.innerHTML = "";
    const infoToShow = {
      "Company Name": companyInfo.name,
      Industry: companyInfo.industry,
      Website: companyInfo.url,
      "Core Services": companyInfo.servicesSummary,
    };
    for (const [key, value] of Object.entries(infoToShow)) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${key}:</strong> ${value}`;
      fixedCompanyInfoList.appendChild(li);
    }
  }
}

async function handleSettingsProviderChange() {
  const provider = settingsModelProviderSelect.value;
  appState.selectedProvider = provider;
  appState.selectedModel = null;
  _populateModelVersionsForProvider(provider);
  settingsModelVersionSelect.value = "";

  settingsApiKeySectionOpenAI.style.display =
    provider === "openai" ? "block" : "none";
  settingsApiKeySectionGoogle.style.display =
    provider === "google" ? "block" : "none";

  await persistAppState();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = "";
    settingsGlobalStatusP.className = "settings-status";
  }

  validateMainForm();
  updateCurrentModelDisplay();
}

async function handleSettingsModelChange() {
  appState.selectedModel = settingsModelVersionSelect.value;
  await persistAppState();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = "";
    settingsGlobalStatusP.className = "settings-status";
  }

  validateMainForm();
  updateCurrentModelDisplay();
}

async function saveApiKey(provider) {
  const inputEl =
    provider === "openai"
      ? settingsApiKeyInputOpenAI
      : settingsApiKeyInputGoogle;
  const statusEl =
    provider === "openai" ? apiKeyStatusOpenAI : apiKeyStatusGoogle;
  const newKey = inputEl.value.trim();

  if (newKey && newKey !== "********") {
    appState.apiKeys[provider] = newKey;
    statusEl.textContent = "API Key saved!";
    statusEl.className = "api-key-status success";
    inputEl.value = "********";
    await persistAppState();
    if (isAiModelConfigured() && settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent = "";
      settingsGlobalStatusP.className = "settings-status";
    }
  } else if (!newKey) {
    statusEl.textContent = "API Key cannot be empty.";
    statusEl.className = "api-key-status error";
    return;
  } else {
    statusEl.textContent = appState.apiKeys[provider]
      ? "Key remains unchanged."
      : "No key entered.";
    statusEl.className = appState.apiKeys[provider]
      ? "api-key-status"
      : "api-key-status error";
    return;
  }

  setTimeout(() => {
    statusEl.textContent = appState.apiKeys[provider]
      ? "Key is set."
      : "No key set.";
    statusEl.className = appState.apiKeys[provider]
      ? "api-key-status success"
      : "api-key-status";
  }, 2000);

  validateMainForm();
  updateCurrentModelDisplay();
}

async function clearApiKey(provider) {
  const inputEl =
    provider === "openai"
      ? settingsApiKeyInputOpenAI
      : settingsApiKeyInputGoogle;
  const statusEl =
    provider === "openai" ? apiKeyStatusOpenAI : apiKeyStatusGoogle;

  appState.apiKeys[provider] = null;
  inputEl.value = "";
  statusEl.textContent = "API Key cleared.";
  statusEl.className = "api-key-status";
  await persistAppState();

  if (
    !isAiModelConfigured() &&
    appState.currentView === "settings" &&
    settingsGlobalStatusP
  ) {
    settingsGlobalStatusP.textContent =
      "Please configure LLM Provider, Model, and API Key to use the extension.";
    settingsGlobalStatusP.className = "settings-status error";
  }
  setTimeout(() => {
    statusEl.textContent = "No key set.";
  }, 2000);

  validateMainForm();
  updateCurrentModelDisplay();
}

function updateCurrentModelDisplay() {
  if (isAiModelConfigured()) {
    const providerName =
      appState.selectedProvider.charAt(0).toUpperCase() +
      appState.selectedProvider.slice(1);
    const modelConfig = modelConfigs[appState.selectedProvider]?.find(
      (m) => m.value === appState.selectedModel,
    );
    const modelLabel = modelConfig ? modelConfig.label : appState.selectedModel;
    currentModelDisplay.textContent = `Using: ${providerName} - ${modelLabel}`;
    currentModelDisplay.style.color = "#333";
  } else {
    currentModelDisplay.textContent =
      "⚠️ LLM Model not configured. Please check Settings.";
    currentModelDisplay.style.color = "#dc3545";
  }
}

function validateMainForm() {
  const isFormComplete =
    appState.selectedSituation && userPromptTextarea.value.trim() !== "";
  generateBtn.disabled = !(isAiModelConfigured() && isFormComplete);
}

async function generateMessage() {
  if (generateBtn.disabled || !isAiModelConfigured()) {
    if (!isAiModelConfigured()) {
      appState.currentView = "settings";
      await persistAppState();
      renderCurrentView();
      if (settingsGlobalStatusP) {
        settingsGlobalStatusP.textContent =
          "LLM not configured. Please complete settings to generate messages.";
        settingsGlobalStatusP.className = "settings-status error";
      }
    }
    return;
  }

  if (selectInputBoxBtn) selectInputBoxBtn.style.display = "none";

  appState.isFocusOutputMode = true;
  await persistAppState();

  outputTextDiv.innerHTML = "";
  outputSectionDiv.classList.add("show");
  outputSectionDiv.classList.remove("error");

  renderFocusMode();

  generateBtn.disabled = true;
  generateBtn.innerHTML = `<div class="spinner"></div> Generating...`;

  let accumulatedResponse = "";
  appState.rawLastLlmResponse = ""; // Reset before new generation
  const situationTemplates = getSituationTemplates();
  const contextualData = getContextualFormData(contextualInputsContainer);
  const writerName = appState.userName ? appState.userName : "an employee";

  let systemPrompt = "";

  if (appState.outputType === "email") {
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
The user wants to write an email for a "${appState.selectedSituation.replace(/-/g, " ")}" context.
The general template/guideline for this task is: "${situationTemplates[appState.selectedSituation]}"

User's Core Message & Additional Context (if provided):
(This will be provided in the user message part of the prompt)

Instructions:
1.  Carefully review all the fixed company information and the user's specific requirements.
2.  Generate an email that fulfills the task, incorporating relevant company details naturally.
3.  Adhere to the desired tone: ${companyInfo.tone.toLowerCase()}.
4.  Ensure the email is tailored to the user's input, the selected situation, and any additional context provided by the user for this specific message type.
5.  If the user's requirements are vague, make reasonable assumptions based on the company context.
6.  The output should be ONLY the generated email, ready to be copied and pasted. Do not include any of these instructions or preamble in the response.
`;
  } else {
    // message_sequence
    const numMessages = appState.numMessagesForSequence;
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
The user wants to write a sequence of short messages for a "${appState.selectedSituation.replace(/-/g, " ")}" context.
The general email-focused guideline for this task is: "${situationTemplates[appState.selectedSituation]}"

User's Core Message & Additional Context (if provided):
(This will be provided in the user message part of the prompt)

Instructions for Message Sequence:
1.  Generate a sequence of ${numMessages} short, distinct messages.
2.  Adapt the email-focused guideline and the user's core message into this sequence. Each message should be concise.
3.  Each message MUST start with a label: "MESSAGE 1:", "MESSAGE 2:", etc., on its own line.
4.  After each complete message (including its label and content), if it is NOT the last message in the sequence, add a new line containing only "---" to act as a separator.
    Example for ${numMessages} messages:
    MESSAGE 1:
    [Content of message 1]
    ${numMessages > 1 ? "---\nMESSAGE 2:\n[Content of message 2]" : ""}
    ${numMessages > 2 ? "---\nMESSAGE 3:\n[Content of message 3]" : ""}
    (Ensure the "---" separator is used correctly between messages if more than one.)
5.  Ensure the messages form a coherent flow.
6.  Incorporate relevant company details naturally and very briefly, only if appropriate for short messages.
7.  Adhere to the desired tone (${companyInfo.tone.toLowerCase()}), but keep messages concise and suitable for informal chat platforms.
8.  The output should ONLY be the generated messages with their labels and separators as specified. Do not include any of these instructions or preamble in the response.
`;
  }

  try {
    const apiKey = appState.apiKeys[appState.selectedProvider];
    if (!apiKey) {
      throw new Error(
        `API Key for ${appState.selectedProvider} is missing. Please configure it in Settings.`,
      );
    }

    const handleStreamChunk = (chunk) => {
      // For message sequences, we want to build up the raw response first
      // and parse/display it once complete, or update display more carefully.
      // For now, let's just append to outputTextDiv for live feedback,
      // and the final parsing will happen on fullResponse.
      // This might look a bit messy during streaming for sequences, but good for now.
      outputTextDiv.textContent += chunk;
      accumulatedResponse += chunk;
      outputTextDiv.scrollTop = outputTextDiv.scrollHeight;
    };

    const fullResponse = await callLlmProvider(
      appState.selectedProvider,
      appState.selectedModel,
      apiKey,
      systemPrompt,
      userPromptTextarea.value,
      contextualData,
      handleStreamChunk,
    );
    appState.rawLastLlmResponse = fullResponse || accumulatedResponse; // Store the final raw response
    displayOutput(
      appState.rawLastLlmResponse || "No content generated.",
      false,
      appState.outputType,
    );
  } catch (error) {
    console.error("Error generating message:", error);
    let errorMessage = `Error generating message: ${error.message}.`;
    if (
      error.message.includes("API Key") &&
      error.message.includes("missing")
    ) {
      errorMessage += " Please check your API key in Settings.";
    } else {
      errorMessage += " Check console for details.";
    }
    displayOutput(errorMessage, true, appState.outputType);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = appState.generateButtonBaseText;
    validateMainForm();
  }
}

function displayOutput(rawContent, isError = false, outputType = "email") {
  const placeholderText = "No content generated.";
  const actualContent = rawContent !== placeholderText ? rawContent : "";
  appState.rawLastLlmResponse = actualContent; // Update with potentially cleaned content

  outputTextDiv.innerHTML = ""; // Clear previous content

  if (isError) {
    outputSectionDiv.classList.add("error");
    outputTextDiv.textContent = rawContent;
    if (selectInputBoxBtn) {
      selectInputBoxBtn.style.display = "none";
    }
  } else {
    outputSectionDiv.classList.remove("error");
    if (outputType === "message_sequence" && actualContent) {
      const parts = actualContent.split(/\n---\n/); // Split by the "---" separator line
      parts.forEach((part, index) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = "individual-message-block";

        const contentPre = document.createElement("pre");
        contentPre.textContent = part.trim(); // Trim each part
        messageDiv.appendChild(contentPre);

        outputTextDiv.appendChild(messageDiv);

        if (index < parts.length - 1) {
          const hr = document.createElement("hr");
          hr.className = "message-visual-separator";
          outputTextDiv.appendChild(hr);
        }
      });
    } else {
      // Email or fallback
      outputTextDiv.textContent = actualContent;
    }

    if (actualContent.trim() && selectInputBoxBtn) {
      selectInputBoxBtn.style.display = "inline-block";
    } else if (selectInputBoxBtn) {
      selectInputBoxBtn.style.display = "none";
    }
  }
  outputTextDiv.scrollTop = 0;
}

async function copyToClipboard() {
  const textToCopy = appState.rawLastLlmResponse; // Use the stored raw response
  if (!textToCopy) return;
  try {
    await navigator.clipboard.writeText(textToCopy);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy to Clipboard";
    }, 2000);
  } catch (err) {
    console.error("Failed to copy text: ", err);
    copyBtn.textContent = "Copy Failed";
    setTimeout(() => {
      copyBtn.textContent = "Copy to Clipboard";
    }, 2000);
  }
}

async function handleSelectInputBox() {
  const textToPaste = appState.rawLastLlmResponse; // Use the stored raw response
  const placeholderText = "No content generated.";
  if (!textToPaste || textToPaste === placeholderText) {
    console.warn("No actual text to paste for selection.");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || !tab.id) {
      console.error("Could not get active tab to select input box.");
      alert("Error: Could not identify the active tab.");
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["js/content_script.js"],
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error injecting content_script.js:",
            chrome.runtime.lastError.message,
          );
          alert(
            `Error: Cannot interact with this page. (${chrome.runtime.lastError.message})
This might be a protected page (e.g., Chrome Web Store, chrome:// pages).`,
          );
          return;
        }

        if (injectionResults && injectionResults.some((frame) => frame.error)) {
          console.error(
            "Error during script execution in one of the frames:",
            injectionResults,
          );
        }

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "startSelection",
            textToPaste: textToPaste,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Error sending 'startSelection' message to content script or no response:",
                chrome.runtime.lastError.message,
              );
            } else if (response && response.status === "selectionStarted") {
              console.log("Content script initiated input selection mode.");
              // window.close(); // Optionally close popup
            } else {
              console.log("Content script response:", response);
            }
          },
        );
      },
    );
  } catch (error) {
    console.error("Error in handleSelectInputBox:", error);
    alert(
      `An unexpected error occurred while trying to select input box: ${error.message}`,
    );
  }
}
