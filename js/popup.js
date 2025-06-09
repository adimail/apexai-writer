import {
  modelConfigs,
  apexAiCompanyInfo,
  getSituationTemplates,
} from "./config.js";
import { renderContextualInputs, getContextualFormData } from "./ui.js";
import { callLlmProvider } from "./llm.js";

let appState = {
  currentView: "main",
  selectedProvider: null,
  selectedModel: null,
  apiKeys: {
    openai: null,
    google: null,
  },
  selectedSituation: "",
};

const mainView = document.getElementById("mainView");
const settingsView = document.getElementById("settingsView");

const settingsBtn = document.getElementById("settingsBtn");
const currentModelDisplay = document.getElementById("currentModelDisplay");

const userPromptTextarea = document.getElementById("userPrompt");
const situationBtns = document.querySelectorAll(".situation-btn");
const contextualInputsContainer = document.getElementById(
  "contextualInputsContainer",
);
const generateBtn = document.getElementById("generateBtn");
const outputSectionDiv = document.getElementById("outputSection");
const outputTextDiv = document.getElementById("outputText");
const copyBtn = document.getElementById("copyBtn");

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

document.addEventListener("DOMContentLoaded", initializeApp);

function isAiModelConfigured() {
  return !!(
    appState.selectedProvider &&
    appState.selectedModel &&
    appState.apiKeys[appState.selectedProvider]
  );
}

async function initializeApp() {
  await loadSettings();

  if (!isAiModelConfigured()) {
    appState.currentView = "settings";
    if (settingsGlobalStatusP && appState.currentView === "settings") {
      settingsGlobalStatusP.textContent =
        "Please configure LLM Provider, Model, and API Key to use the extension.";
      settingsGlobalStatusP.className = "settings-status error";
    }
  }

  renderCurrentView();
  setupEventListeners();
  updateCurrentModelDisplay();
  validateMainForm();
  populateFixedCompanyInfo();
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["appSettingsV2"], (result) => {
      if (result.appSettingsV2) {
        const storedSettings = result.appSettingsV2;
        const initialView =
          storedSettings.currentView === "settings" ||
          storedSettings.currentView === "main"
            ? storedSettings.currentView
            : "main";

        appState = {
          ...appState,
          selectedProvider: storedSettings.selectedProvider || null,
          selectedModel: storedSettings.selectedModel || null,
          apiKeys: {
            openai: storedSettings.apiKeys?.openai || null,
            google: storedSettings.apiKeys?.google || null,
          },
          currentView: initialView,
        };
        console.log(
          "Loaded settings from storage (v2). Initial view:",
          initialView,
        );
      } else {
        console.log("No settings (v2) found in storage, using defaults.");
      }
      resolve();
    });
  });
}

function saveAppSettings() {
  const settingsToSave = {
    currentView: appState.currentView,
    selectedProvider: appState.selectedProvider,
    selectedModel: appState.selectedModel,
    apiKeys: appState.apiKeys,
  };
  chrome.storage.local.set({ appSettingsV2: settingsToSave }, () => {
    console.log("App settings saved (v2):", settingsToSave);
    updateCurrentModelDisplay();
    validateMainForm();
  });
}

function renderCurrentView() {
  if (appState.currentView === "main") {
    mainView.style.display = "block";
    settingsView.style.display = "none";
    settingsBtn.textContent = "⚙️";
    settingsBtn.title = "Open Settings";
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent = "";
      settingsGlobalStatusP.className = "settings-status";
    }
  } else {
    mainView.style.display = "none";
    settingsView.style.display = "block";
    settingsBtn.textContent = ""; // Consider an icon like "Back" or "Done" if space allows
    settingsBtn.title = "Back to Main View"; // More descriptive title
    populateSettingsForm();
    if (
      !isAiModelConfigured() &&
      settingsGlobalStatusP &&
      !settingsGlobalStatusP.textContent // Only set if not already showing a message
    ) {
      settingsGlobalStatusP.textContent =
        "Please configure LLM Provider, Model, and API Key to use the extension.";
      settingsGlobalStatusP.className = "settings-status error";
    }
  }
}

function switchToView(viewName) {
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = ""; // Clear previous global status messages
    settingsGlobalStatusP.className = "settings-status";
  }

  // Prevent switching to main view if LLM is not configured
  if (viewName === "main" && !isAiModelConfigured()) {
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent =
        "LLM not configured. Please complete settings to proceed.";
      settingsGlobalStatusP.className = "settings-status error";
    }
    // Ensure settings form is populated if user tries to leave settings prematurely
    if (appState.currentView === "settings") {
      populateSettingsForm();
    }
    // Do not switch view, keep user in settings
    appState.currentView = "settings"; // Force stay in settings
    renderCurrentView(); // Re-render to ensure settings view is shown
    return;
  }

  appState.currentView = viewName;
  saveAppSettings(); // Save the new view state
  renderCurrentView(); // Render the switched view
}

function setupEventListeners() {
  settingsBtn.addEventListener("click", () => {
    switchToView(appState.currentView === "main" ? "settings" : "main");
  });
  closeSettingsBtn.addEventListener("click", () => switchToView("main"));

  userPromptTextarea.addEventListener("input", validateMainForm);
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

  settingsModelProviderSelect.addEventListener(
    "change",
    handleSettingsProviderChange,
  );
  settingsModelVersionSelect.addEventListener(
    "change",
    handleSettingsModelChange,
  );

  document.querySelectorAll(".save-key-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => saveApiKey(e.target.dataset.provider));
  });
  document.querySelectorAll(".clear-key-btn").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      clearApiKey(e.target.dataset.provider),
    );
  });
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
      // If selected model is no longer valid for the provider, reset it
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
}

function populateFixedCompanyInfo() {
  if (fixedCompanyInfoList) {
    fixedCompanyInfoList.innerHTML = ""; // Clear existing
    const infoToShow = {
      "Company Name": apexAiCompanyInfo.name,
      Industry: apexAiCompanyInfo.industry,
      Website: apexAiCompanyInfo.url,
      "Core Services": apexAiCompanyInfo.servicesSummary,
    };
    for (const [key, value] of Object.entries(infoToShow)) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${key}:</strong> ${value}`;
      fixedCompanyInfoList.appendChild(li);
    }
  }
}

function handleSettingsProviderChange() {
  const provider = settingsModelProviderSelect.value;
  appState.selectedProvider = provider;
  appState.selectedModel = null; // Reset model when provider changes
  _populateModelVersionsForProvider(provider);
  settingsModelVersionSelect.value = ""; // Clear selection
  settingsApiKeySectionOpenAI.style.display =
    provider === "openai" ? "block" : "none";
  settingsApiKeySectionGoogle.style.display =
    provider === "google" ? "block" : "none";
  saveAppSettings();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = ""; // Clear global status on change
    settingsGlobalStatusP.className = "settings-status";
  }
}

function handleSettingsModelChange() {
  appState.selectedModel = settingsModelVersionSelect.value;
  saveAppSettings();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = ""; // Clear global status on change
    settingsGlobalStatusP.className = "settings-status";
  }
}

function saveApiKey(provider) {
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
    inputEl.value = "********"; // Mask the key after saving
    saveAppSettings();
    // If all settings are now complete, clear any global warning
    if (isAiModelConfigured() && settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent = "";
      settingsGlobalStatusP.className = "settings-status";
    }
  } else if (!newKey) {
    statusEl.textContent = "API Key cannot be empty.";
    statusEl.className = "api-key-status error";
    return;
  } else {
    // Key was '********' or unchanged empty
    statusEl.textContent = appState.apiKeys[provider]
      ? "Key remains unchanged."
      : "No key entered.";
    statusEl.className = appState.apiKeys[provider]
      ? "api-key-status" // Neutral if key was already set and user entered '********'
      : "api-key-status error"; // Error if no key was set and user entered nothing
    return;
  }

  // Reset status message after a delay
  setTimeout(() => {
    statusEl.textContent = appState.apiKeys[provider]
      ? "Key is set."
      : "No key set.";
    statusEl.className = appState.apiKeys[provider]
      ? "api-key-status success"
      : "api-key-status";
  }, 2000);
}

function clearApiKey(provider) {
  const inputEl =
    provider === "openai"
      ? settingsApiKeyInputOpenAI
      : settingsApiKeyInputGoogle;
  const statusEl =
    provider === "openai" ? apiKeyStatusOpenAI : apiKeyStatusGoogle;

  appState.apiKeys[provider] = null;
  inputEl.value = ""; // Clear the input field
  statusEl.textContent = "API Key cleared.";
  statusEl.className = "api-key-status";
  saveAppSettings();

  // If clearing the key makes the configuration incomplete, show global warning
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
    currentModelDisplay.style.color = "#333"; // Default/good color
  } else {
    currentModelDisplay.textContent =
      "⚠️ LLM Model not configured. Please check Settings.";
    currentModelDisplay.style.color = "#dc3545"; // Error color
  }
}

function validateMainForm() {
  const isFormComplete =
    appState.selectedSituation && userPromptTextarea.value.trim() !== "";
  // Future: Add validation for required contextual inputs if any
  generateBtn.disabled = !(isAiModelConfigured() && isFormComplete);
}

async function generateMessage() {
  if (generateBtn.disabled || !isAiModelConfigured()) {
    if (!isAiModelConfigured()) {
      displayOutput(
        "Error: LLM Model is not configured. Please go to Settings to configure it.",
        true,
      );
      // Optionally, force switch to settings view
      // switchToView("settings");
    }
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<div class="spinner"></div> Generating...';
  outputSectionDiv.classList.remove("show", "error");
  outputTextDiv.textContent = ""; // Clear previous output for streaming
  let accumulatedResponse = ""; // To store the full response from stream

  const situationTemplates = getSituationTemplates();
  const contextualData = getContextualFormData(contextualInputsContainer);

  try {
    const systemPrompt = `
You are an LLM assistant for ${apexAiCompanyInfo.name}.
Your goal is to help employees write effective messages.

Company Information (Fixed - Do Not Deviate):
- Name: ${apexAiCompanyInfo.name}
- Industry: ${apexAiCompanyInfo.industry}
- Core Services: ${apexAiCompanyInfo.servicesSummary}
- Detailed Services: ${apexAiCompanyInfo.detailedServices.map((s) => `${s.name}: ${s.tech}`).join("; ")}
- Unique Value Proposition: "${apexAiCompanyInfo.uniqueValue}"
- Desired Tone: ${apexAiCompanyInfo.tone}
- Target Audience: ${apexAiCompanyInfo.targetAudience}
- Brand Keywords: ${apexAiCompanyInfo.brandVoiceKeywords}
- Website: ${apexAiCompanyInfo.url}
- Services Page: ${apexAiCompanyInfo.servicesPage}
- Projects Page: ${apexAiCompanyInfo.projectsPage}

Task:
The user wants to write a "${appState.selectedSituation.replace(/-/g, " ")}".
The general template/guideline for this task is: "${situationTemplates[appState.selectedSituation]}"

User's Core Message & Additional Context (if provided):
(This will be provided in the user message part of the prompt)

Instructions:
1.  Carefully review all the fixed company information and the user's specific requirements.
2.  Generate a message that fulfills the task, incorporating relevant company details naturally.
3.  Adhere to the desired tone: ${apexAiCompanyInfo.tone.toLowerCase()}.
4.  Ensure the message is tailored to the user's input, the selected situation, and any additional context provided by the user for this specific message type.
5.  If the user's requirements are vague, make reasonable assumptions based on the company context.
6.  The output should be ONLY the generated message, ready to be copied and pasted. Do not include any of these instructions or preamble in the response.
`;

    const apiKey = appState.apiKeys[appState.selectedProvider];
    // This check is technically redundant due to isAiModelConfigured, but good for safety.
    if (!apiKey) {
      throw new Error(`API Key for ${appState.selectedProvider} is missing.`);
    }

    // Define the onChunkReceived callback for streaming
    const handleStreamChunk = (chunk) => {
      outputTextDiv.textContent += chunk;
      accumulatedResponse += chunk;
      // Auto-scroll the output section to show new content
      if (outputSectionDiv.classList.contains("show")) {
        outputSectionDiv.scrollTop = outputSectionDiv.scrollHeight;
      }
    };

    // Make sure the output section is visible before streaming starts
    outputSectionDiv.classList.add("show");
    outputSectionDiv.classList.remove("error");

    // Call LLM provider with the streaming callback
    const fullResponse = await callLlmProvider(
      appState.selectedProvider,
      appState.selectedModel,
      apiKey,
      systemPrompt,
      userPromptTextarea.value,
      contextualData,
      handleStreamChunk, // Pass the callback here
    );

    // After streaming is complete, fullResponse contains the entire message.
    // displayOutput can be used to ensure final state and styling, though textContent is already set.
    // Using accumulatedResponse or fullResponse here should be equivalent if streaming was successful.
    displayOutput(fullResponse, false);
  } catch (error) {
    console.error("Error generating message:", error);
    // If an error occurs, display it. outputTextDiv might have partial content from streaming.
    // displayOutput will overwrite it with the error message.
    displayOutput(
      `Error generating message: ${error.message}. Check console for details.`,
      true,
    );
  } finally {
    generateBtn.textContent = "Generate Message";
    // Re-validate form, which will enable/disable button based on current state
    validateMainForm();
  }
}

function displayOutput(content, isError = false) {
  outputTextDiv.textContent = content; // Set the final content
  outputSectionDiv.classList.add("show");
  if (isError) {
    outputSectionDiv.classList.add("error");
  } else {
    outputSectionDiv.classList.remove("error");
  }
  outputSectionDiv.scrollTop = 0;
}

async function copyToClipboard() {
  if (!outputTextDiv.textContent) return;
  try {
    await navigator.clipboard.writeText(outputTextDiv.textContent);
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
