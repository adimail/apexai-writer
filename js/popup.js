import {
  modelConfigs,
  apexAiCompanyInfo,
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
};

const mainView = document.getElementById("mainView");
const settingsView = document.getElementById("settingsView");
const resetOutputBtn = document.getElementById("resetOutputBtn");

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
  const loadedSettings = await loadDecryptedSettings();

  if (loadedSettings) {
    appState = {
      ...appState,
      ...loadedSettings,
      apiKeys: {
        openai: loadedSettings.apiKeys?.openai || null,
        google: loadedSettings.apiKeys?.google || null,
      },
    };

    console.log(
      "Loaded settings from secure storage. Previous view (before reset):",
      loadedSettings.currentView,
    );
  } else {
    console.log("No settings found in secure storage, using defaults.");
  }

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

  console.log(
    "Initializing popup. Effective start view:",
    appState.currentView,
  );

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
    if (
      outputTextDiv.innerHTML.trim() !== "" ||
      outputSectionDiv.classList.contains("error")
    ) {
      outputSectionDiv.classList.add("show");
    }
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
    if (appState.currentView === "settings") {
      populateSettingsForm();
    }

    renderCurrentView();
    return;
  }

  appState.currentView = viewName;
  await persistAppState();
  renderCurrentView();
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

      outputTextDiv.innerHTML = "";
      outputSectionDiv.classList.remove("show", "error");

      await persistAppState();
      renderFocusMode();

      generateBtn.disabled = false;
      generateBtn.innerHTML = "Generate Message";

      validateMainForm();
      renderCurrentView();
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

  appState.isFocusOutputMode = true;
  await persistAppState();
  renderFocusMode();

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
      throw new Error(
        `API Key for ${appState.selectedProvider} is missing. Please configure it in Settings.`,
      );
    }

    const handleStreamChunk = (chunk) => {
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
    displayOutput(fullResponse || accumulatedResponse, false);
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
    displayOutput(errorMessage, true);
  }
}

function displayOutput(content, isError = false) {
  outputTextDiv.innerHTML = "";
  outputTextDiv.textContent = content;
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
