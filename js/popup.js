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
  userName: "",
  isFocusOutputMode: false,
};

const mainView = document.getElementById("mainView");
const settingsView = document.getElementById("settingsView");
const resetOutputBtn = document.getElementById("resetOutputBtn"); // New

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
  await loadSettings();

  if (!isAiModelConfigured() && !appState.isFocusOutputMode) {
    // Don't switch if already in focus mode (e.g. popup reopened)
    appState.currentView = "settings";
    if (settingsGlobalStatusP && appState.currentView === "settings") {
      settingsGlobalStatusP.textContent =
        "Please configure LLM Provider, Model, and API Key to use the extension.";
      settingsGlobalStatusP.className = "settings-status error";
    }
  }

  renderCurrentView(); // This will also call renderFocusMode if needed
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
          userName: storedSettings.userName || "",
          isFocusOutputMode: storedSettings.isFocusOutputMode || false, // Load focus mode state
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
    userName: appState.userName,
    isFocusOutputMode: appState.isFocusOutputMode, // Save focus mode state
  };
  chrome.storage.local.set({ appSettingsV2: settingsToSave }, () => {
    console.log("App settings saved (v2):", settingsToSave);
    updateCurrentModelDisplay();
    validateMainForm();
  });
}

function renderFocusMode() {
  if (appState.isFocusOutputMode) {
    mainView.classList.add("focus-output-mode");
    if (settingsBtn) settingsBtn.style.display = "none";
    // Ensure output section is visible if we are in focus mode and it has content or is loading
    if (
      outputTextDiv.innerHTML.trim() !== "" ||
      outputSectionDiv.classList.contains("error")
    ) {
      outputSectionDiv.classList.add("show");
    }
  } else {
    mainView.classList.remove("focus-output-mode");
    if (settingsBtn) settingsBtn.style.display = "";
    // Output section visibility will be handled by its content/error state
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
    mainView.style.display = "flex"; // Changed to flex for focus mode layout
    settingsView.style.display = "none";
    settingsBtn.title = "Open Settings";
    if (settingsGlobalStatusP) {
      settingsGlobalStatusP.textContent = "";
      settingsGlobalStatusP.className = "settings-status";
    }
    renderFocusMode(); // Apply focus mode if active
  } else {
    // Settings view
    mainView.style.display = "none";
    settingsView.style.display = "block";
    settingsBtn.title = "Back to Main View";
    populateSettingsForm();
    if (
      !isAiModelConfigured() &&
      settingsGlobalStatusP &&
      !settingsGlobalStatusP.textContent
    ) {
      settingsGlobalStatusP.textContent =
        "Please configure LLM Provider, Model, and API Key to use the extension.";
      settingsGlobalStatusP.className = "settings-status error";
    }
  }
  // Adjust settings button icon based on current view
  if (appState.currentView === "main" && !appState.isFocusOutputMode) {
    settingsBtn.textContent = "⚙️";
  } else if (appState.currentView === "settings") {
    settingsBtn.textContent = ""; // Or a back arrow/done text
  } // In focus mode, settingsBtn is hidden by renderFocusMode
}

function switchToView(viewName) {
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
    if (appState.currentView === "settings") {
      populateSettingsForm();
    }
    appState.currentView = "settings";
    renderCurrentView();
    return;
  }

  appState.currentView = viewName;
  saveAppSettings();
  renderCurrentView();
}

function setupEventListeners() {
  settingsBtn.addEventListener("click", () => {
    if (appState.isFocusOutputMode) return; // Prevent settings if in focus mode
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

  if (settingsUserNameInput) {
    settingsUserNameInput.addEventListener("change", (e) => {
      appState.userName = e.target.value.trim();
      saveAppSettings();
    });
  }

  // Event listener for the new Reset View button
  if (resetOutputBtn) {
    resetOutputBtn.addEventListener("click", () => {
      appState.isFocusOutputMode = false;
      saveAppSettings(); // Save the change in mode
      renderFocusMode(); // Revert UI from focus mode

      outputTextDiv.innerHTML = ""; // Clear output content
      outputSectionDiv.classList.remove("show", "error"); // Hide output section

      // Reset generate button (it becomes visible again)
      generateBtn.disabled = false; // Default, validateMainForm will adjust
      generateBtn.innerHTML = "Generate Message";

      validateMainForm(); // Re-evaluate form and generate button state
      renderCurrentView(); // Re-render to ensure settings button text is correct
    });
  }
}

// ... ( _populateModelVersionsForProvider, populateSettingsForm, populateFixedCompanyInfo ) ...
// ... ( handleSettingsProviderChange, handleSettingsModelChange, saveApiKey, clearApiKey ) ...
// ... ( updateCurrentModelDisplay, validateMainForm ) ...
// These functions remain largely the same as your previous version. I'll include them for completeness if they had minor changes.

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
  appState.selectedModel = null;
  _populateModelVersionsForProvider(provider);
  settingsModelVersionSelect.value = "";
  settingsApiKeySectionOpenAI.style.display =
    provider === "openai" ? "block" : "none";
  settingsApiKeySectionGoogle.style.display =
    provider === "google" ? "block" : "none";
  saveAppSettings();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = "";
    settingsGlobalStatusP.className = "settings-status";
  }
}

function handleSettingsModelChange() {
  appState.selectedModel = settingsModelVersionSelect.value;
  saveAppSettings();
  if (settingsGlobalStatusP) {
    settingsGlobalStatusP.textContent = "";
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
    inputEl.value = "********";
    saveAppSettings();
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
}

function clearApiKey(provider) {
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
  saveAppSettings();

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
      displayOutput(
        "Error: LLM Model is not configured. Please go to Settings to configure it.",
        true,
      );
    }
    return;
  }

  appState.isFocusOutputMode = true;
  saveAppSettings(); // Save the change in mode
  renderFocusMode(); // Apply UI changes for focus mode

  // Show loading state in the output area
  outputTextDiv.innerHTML =
    '<div class="spinner"></div><p class="loading-text">Generating message...</p>';
  outputSectionDiv.classList.add("show");
  outputSectionDiv.classList.remove("error");
  let accumulatedResponse = "";

  const situationTemplates = getSituationTemplates();
  const contextualData = getContextualFormData(contextualInputsContainer);

  try {
    const writerName = appState.userName ? appState.userName : "an employee";
    const systemPrompt = `
You are an LLM assistant for ${apexAiCompanyInfo.name}.
Your goal is to help employees write effective messages.
The message is being written by ${writerName} from APEXAI.

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
    if (!apiKey) {
      throw new Error(`API Key for ${appState.selectedProvider} is missing.`);
    }

    const handleStreamChunk = (chunk) => {
      // Clear spinner on first chunk
      if (outputTextDiv.querySelector(".spinner")) {
        outputTextDiv.innerHTML = "";
      }
      outputTextDiv.textContent += chunk;
      accumulatedResponse += chunk;
      if (outputSectionDiv.classList.contains("show")) {
        outputSectionDiv.scrollTop = outputSectionDiv.scrollHeight;
      }
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
    // If not streaming or if streaming finished, ensure spinner is gone and display full response
    // displayOutput will handle clearing the spinner if it's still there (e.g., non-streaming case)
    displayOutput(fullResponse || accumulatedResponse, false); // Use accumulated if fullResponse is empty from stream
  } catch (error) {
    console.error("Error generating message:", error);
    displayOutput(
      `Error generating message: ${error.message}. Check console for details.`,
      true,
    );
  } finally {
    // No need to manage generateBtn state here as it's hidden in focus mode.
    // The reset button will handle restoring its state.
  }
}

function displayOutput(content, isError = false) {
  outputTextDiv.innerHTML = ""; // Clear any previous content or spinner
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
