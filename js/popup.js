import { modelConfigs, companyInfo, getSituationTemplates } from "./config.js";
import { renderContextualInputs, getContextualFormData } from "./ui.js";
import { callLlmProvider } from "./llm.js";
import {
  saveEncryptedSettings,
  loadDecryptedSettings,
} from "./secure_storage.js";
import {
  MESSAGE_LENGTH_OPTIONS,
  DEFAULT_MESSAGE_LENGTH_KEY,
  getel,
} from "./constants.js";
import { buildSystemPrompt } from "./prompt_builder.js";

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
  selectedSituation: null,
  lastRecipientName: "",
  lastRecipientCompany: "",
  preferredMessageLength: DEFAULT_MESSAGE_LENGTH_KEY,
  selectedMeetingAction: "schedule",
  contextualCache: {},
};

const mainView = getel("mainView");
const settingsView = getel("settingsView");
const inputControlsContainer = getel("inputControlsContainer");
const focusModeActionsContainer = getel("focusModeActionsContainer");
const reviseInputsBtn = getel("reviseInputsBtn");
const resetOutputBtn = getel("resetOutputBtn");

const settingsBtn = getel("settingsBtn");
const currentModelDisplay = getel("currentModelDisplay");

const userPromptTextarea = getel("userPrompt");
const outputTypeRadioGroup = getel("outputTypeRadioGroup");
const numMessagesGroup = getel("numMessagesGroup");
const numMessagesRadioGroup = getel("numMessagesRadioGroup");
const situationLabel = getel("situationLabel");
const situationBtns = document.querySelectorAll(".situation-btn");
const contextualInputsContainer = getel("contextualInputsContainer");
const generateBtn = getel("generateBtn");
const outputSectionDiv = getel("outputSection");
const outputTextDiv = getel("outputText");
const copyBtn = getel("copyBtn");
const selectInputBoxBtn = getel("selectInputBoxBtn");

const closeSettingsBtn = getel("closeSettingsBtn");
const settingsModelProviderSelect = getel("settingsModelProvider");
const settingsModelVersionSelect = getel("settingsModelVersion");

const settingsApiKeySectionOpenAI = getel("settingsApiKeySectionOpenAI");
const settingsApiKeyInputOpenAI = getel("settingsApiKeyOpenAI");
const apiKeyStatusOpenAI = getel("apiKeyStatusOpenAI");

const settingsApiKeySectionGoogle = getel("settingsApiKeySectionGoogle");
const settingsApiKeyInputGoogle = getel("settingsApiKeyGoogle");
const apiKeyStatusGoogle = getel("apiKeyStatusGoogle");
const fixedCompanyInfoList = getel("fixedCompanyInfoList");
const settingsGlobalStatusP = getel("settingsGlobalStatus");
const settingsUserNameInput = getel("settingsUserName");

const settingsMessageLengthSlider = getel("settingsMessageLength");
const messageLengthOutput = getel("messageLengthOutput");

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
      selectedSituation: loadedSettings.selectedSituation || null,
      lastRecipientName: loadedSettings.lastRecipientName || "",
      lastRecipientCompany: loadedSettings.lastRecipientCompany || "",
      preferredMessageLength:
        loadedSettings.preferredMessageLength || DEFAULT_MESSAGE_LENGTH_KEY,
      selectedMeetingAction: loadedSettings.selectedMeetingAction || "schedule",
      contextualCache: loadedSettings.contextualCache || {},
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

  const currentOutputTypeRadio = outputTypeRadioGroup.querySelector(
    `input[name="outputType"][value="${appState.outputType}"]`,
  );
  if (currentOutputTypeRadio) {
    currentOutputTypeRadio.checked = true;
  } else {
    const emailRadio = outputTypeRadioGroup.querySelector(
      'input[name="outputType"][value="email"]',
    );
    if (emailRadio) emailRadio.checked = true;
    appState.outputType = "email";
  }

  const currentNumMessagesRadio = numMessagesRadioGroup.querySelector(
    `input[name="numMessages"][value="${appState.numMessagesForSequence}"]`,
  );
  if (currentNumMessagesRadio) {
    currentNumMessagesRadio.checked = true;
  } else {
    const defaultNumRadio = numMessagesRadioGroup.querySelector(
      'input[name="numMessages"][value="2"]',
    );
    if (defaultNumRadio) defaultNumRadio.checked = true;
    appState.numMessagesForSequence = 2;
  }

  updateOutputTypeUI();

  if (appState.selectedSituation) {
    const activeBtn = document.querySelector(
      `.situation-btn[data-situation="${appState.selectedSituation}"]`,
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    renderContextualInputsWrapper();
  }

  if (settingsMessageLengthSlider && messageLengthOutput) {
    settingsMessageLengthSlider.value = appState.preferredMessageLength;
    messageLengthOutput.textContent =
      MESSAGE_LENGTH_OPTIONS[appState.preferredMessageLength]?.label ||
      MESSAGE_LENGTH_OPTIONS[DEFAULT_MESSAGE_LENGTH_KEY].label;
  }

  renderCurrentView();
  setupEventListeners();
  updateCurrentModelDisplay();
  validateMainForm();
  populateFixedCompanyInfo();
}

async function persistAppState() {
  if (appState.selectedSituation) {
    const currentContextData = getContextualFormData(contextualInputsContainer);
    appState.contextualCache = { ...currentContextData };
  }

  const settingsToSave = {
    currentView: appState.currentView,
    selectedProvider: appState.selectedProvider,
    selectedModel: appState.selectedModel,
    apiKeys: appState.apiKeys,
    userName: appState.userName,
    isFocusOutputMode: appState.isFocusOutputMode,
    outputType: appState.outputType,
    numMessagesForSequence: appState.numMessagesForSequence,
    selectedSituation: appState.selectedSituation,
    lastRecipientName: appState.lastRecipientName,
    lastRecipientCompany: appState.lastRecipientCompany,
    preferredMessageLength: appState.preferredMessageLength,
    selectedMeetingAction: appState.selectedMeetingAction,
    contextualCache: appState.contextualCache,
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
    if (inputControlsContainer) inputControlsContainer.style.display = "none";
    outputSectionDiv.classList.add("show");
    if (focusModeActionsContainer)
      focusModeActionsContainer.style.display = "flex";
    if (settingsBtn) settingsBtn.style.display = "none";
  } else {
    mainView.classList.remove("focus-output-mode");
    if (inputControlsContainer) inputControlsContainer.style.display = "flex";
    if (focusModeActionsContainer)
      focusModeActionsContainer.style.display = "none";
    if (settingsBtn) settingsBtn.style.display = "";

    if (
      outputTextDiv.innerHTML.trim() === "" &&
      !outputSectionDiv.classList.contains("error")
    ) {
      outputSectionDiv.classList.remove("show");
    } else {
      outputSectionDiv.classList.add("show");
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
    } else if (appState.isFocusOutputMode) {
      settingsBtn.style.display = "none";
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
    situationLabel.textContent = "Message Sequence Context";
    numMessagesGroup.style.display = "block";
    appState.generateButtonBaseText = "Generate Messages";
  }
  if (!generateBtn.disabled || generateBtn.innerHTML.includes("spinner")) {
    if (!generateBtn.innerHTML.includes("spinner")) {
      generateBtn.textContent = appState.generateButtonBaseText;
    }
  }
  validateMainForm();
}

// Wrapper function to call renderContextualInputs and manage related state
function renderContextualInputsWrapper() {
  if (appState.selectedSituation) {
    renderContextualInputs(
      appState.selectedSituation,
      contextualInputsContainer,
      appState,
      handleContextualInputChange,
      handleMeetingActionChange,
    );
  } else {
    contextualInputsContainer.innerHTML = "";
  }
  validateMainForm();
}

// Callback for general contextual input changes
async function handleContextualInputChange(event) {
  const target = event.target;
  const key = target.dataset.key;

  if (key === "recipientName") {
    appState.lastRecipientName = target.value;
  } else if (key === "recipientCompany") {
    appState.lastRecipientCompany = target.value;
  }

  await persistAppState();
  validateMainForm();
}

// Callback for meeting action select change
async function handleMeetingActionChange(newAction) {
  appState.selectedMeetingAction = newAction;

  renderContextualInputsWrapper();

  await persistAppState();
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

  outputTypeRadioGroup.addEventListener("change", async (e) => {
    if (e.target.type === "radio" && e.target.name === "outputType") {
      appState.outputType = e.target.value;
      updateOutputTypeUI();
      await persistAppState();
    }
  });

  numMessagesRadioGroup.addEventListener("change", async (e) => {
    if (e.target.type === "radio" && e.target.name === "numMessages") {
      appState.numMessagesForSequence = parseInt(e.target.value, 10);
      await persistAppState();
    }
  });

  situationBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      situationBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      appState.selectedSituation = btn.dataset.situation;

      if (appState.selectedSituation !== "meeting-request") {
        appState.selectedMeetingAction = "schedule";
      }
      appState.contextualCache = {};
      renderContextualInputsWrapper();
      await persistAppState();
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

  if (settingsMessageLengthSlider && messageLengthOutput) {
    settingsMessageLengthSlider.addEventListener("input", async (e) => {
      const lengthKey = e.target.value;
      appState.preferredMessageLength = lengthKey;
      messageLengthOutput.textContent =
        MESSAGE_LENGTH_OPTIONS[lengthKey]?.label ||
        MESSAGE_LENGTH_OPTIONS[DEFAULT_MESSAGE_LENGTH_KEY].label;
      await persistAppState();
    });
  }

  if (reviseInputsBtn) {
    reviseInputsBtn.addEventListener("click", async () => {
      appState.isFocusOutputMode = false;
      await persistAppState();
      renderFocusMode();
      generateBtn.innerHTML = appState.generateButtonBaseText;
      validateMainForm();
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
  let isFormComplete =
    appState.selectedSituation && userPromptTextarea.value.trim() !== "";

  if (appState.selectedSituation === "meeting-request") {
    const contextualData = getContextualFormData(contextualInputsContainer);
    if (!contextualData.clientStatus) {
      isFormComplete = false;
    }
  }

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

  outputTextDiv.innerHTML = "";
  outputSectionDiv.classList.add("show");
  outputSectionDiv.classList.remove("error");

  renderFocusMode();

  generateBtn.disabled = true;
  generateBtn.innerHTML = `<div class="spinner"></div> Generating...`;

  let accumulatedResponse = "";
  appState.rawLastLlmResponse = "";

  const situationTemplates = getSituationTemplates();
  const contextualData = getContextualFormData(contextualInputsContainer);

  for (const key in contextualData) {
    if (typeof contextualData[key] === "string") {
      contextualData[key] = contextualData[key].trim();
    }
  }

  const systemPrompt = buildSystemPrompt({
    outputType: appState.outputType,
    selectedSituation: appState.selectedSituation,
    numMessagesForSequence: appState.numMessagesForSequence,
    userName: appState.userName,
    preferredMessageLengthKey: appState.preferredMessageLength,
    companyInfo: companyInfo,
    situationTemplates: situationTemplates,
    messageLengthOptions: MESSAGE_LENGTH_OPTIONS,
    contextualData: contextualData,
    defaultMessageLengthKey: DEFAULT_MESSAGE_LENGTH_KEY,
  });

  try {
    const apiKey = appState.apiKeys[appState.selectedProvider];
    if (!apiKey) {
      throw new Error(
        `API Key for ${appState.selectedProvider} is missing. Please configure it in Settings.`,
      );
    }

    const handleStreamChunk = (chunk) => {
      const plainTextChunk = chunk
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1");

      outputTextDiv.textContent += plainTextChunk;
      accumulatedResponse += chunk;
      outputTextDiv.scrollTop = outputTextDiv.scrollHeight;
    };

    const fullResponse = await callLlmProvider(
      appState.selectedProvider,
      appState.selectedModel,
      apiKey,
      systemPrompt,
      userPromptTextarea.value.trim(),
      contextualData,
      handleStreamChunk,
    );

    appState.rawLastLlmResponse = fullResponse || accumulatedResponse;

    let finalCleanedResponse = appState.rawLastLlmResponse;
    if (finalCleanedResponse) {
      finalCleanedResponse = finalCleanedResponse
        .replace(/\*\*(.*?)\*\*/gs, "$1")
        .replace(/\*(.*?)\*/gs, "$1")
        .replace(/__(.*?)__/gs, "$1")
        .replace(/_(.*?)_/gs, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/gs, "$1 ($2)");
    }

    displayOutput(
      finalCleanedResponse || "No content generated.",
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
    } else if (error.message.includes("Google API Error")) {
      errorMessage = error.message;
    } else {
      errorMessage += " Check console for details.";
    }
    displayOutput(errorMessage, true, appState.outputType);
    appState.rawLastLlmResponse = errorMessage;
  } finally {
    await persistAppState();
    generateBtn.disabled = false;
    generateBtn.innerHTML = appState.generateButtonBaseText;
    validateMainForm();
  }
}

function displayOutput(rawContent, isError = false, outputType = "email") {
  const placeholderText = "No content generated.";

  const actualContent =
    rawContent && rawContent !== placeholderText ? rawContent : "";

  outputTextDiv.innerHTML = "";

  if (isError) {
    outputSectionDiv.classList.add("error");
    outputTextDiv.textContent = actualContent;
    if (selectInputBoxBtn) {
      selectInputBoxBtn.style.display = "none";
    }
  } else {
    outputSectionDiv.classList.remove("error");
    if (outputType === "message_sequence" && actualContent) {
      const parts = actualContent.split(/\n---\n/);
      const messageContents = parts
        .map((part) => part.replace(/^MESSAGE \d+:\s*\n?/i, "").trim())
        .filter((content) => content.length > 0);

      messageContents.forEach((content, index) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = "individual-message-block";

        const contentPre = document.createElement("pre");
        contentPre.textContent = content;
        messageDiv.appendChild(contentPre);

        outputTextDiv.appendChild(messageDiv);

        if (index < messageContents.length - 1) {
          const hr = document.createElement("hr");
          hr.className = "message-visual-separator";
          outputTextDiv.appendChild(hr);
        }
      });
    } else {
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
  let textToCopy = appState.rawLastLlmResponse;
  const placeholderText = "No content generated.";

  const isLikelyErrorMessage = outputSectionDiv.classList.contains("error");

  if (
    appState.outputType === "message_sequence" &&
    textToCopy &&
    textToCopy !== placeholderText &&
    !isLikelyErrorMessage
  ) {
    const parts = textToCopy.split(/\n---\n/);
    const cleanedMessages = parts
      .map((part) => part.replace(/^MESSAGE \d+:\s*\n?/i, "").trim())
      .filter((content) => content.length > 0);
    textToCopy = cleanedMessages.join("\n\n");
  } else if (textToCopy === placeholderText || !textToCopy) {
    return;
  }

  if (textToCopy) {
    textToCopy = textToCopy
      .replace(/\*\*(.*?)\*\*/gs, "$1")
      .replace(/\*(.*?)\*/gs, "$1")
      .replace(/__(.*?)__/gs, "$1")
      .replace(/_(.*?)_/gs, "$1")
      .replace(/\[(.*?)\]\((.*?)\)/gs, "$1 ($2)");
  }

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
  let textToPaste = appState.rawLastLlmResponse;
  const placeholderText = "No content generated.";
  const isLikelyErrorMessage = outputSectionDiv.classList.contains("error");

  if (
    appState.outputType === "message_sequence" &&
    textToPaste &&
    textToPaste !== placeholderText &&
    !isLikelyErrorMessage
  ) {
    const parts = textToPaste.split(/\n---\n/);
    const cleanedMessages = parts
      .map((part) => part.replace(/^MESSAGE \d+:\s*\n?/i, "").trim())
      .filter((content) => content.length > 0);
    textToPaste = cleanedMessages.join("\n\n");
  } else if (
    textToPaste === placeholderText ||
    !textToPaste ||
    isLikelyErrorMessage
  ) {
    console.warn(
      "No actual text to paste for selection or text is an error message.",
    );
    return;
  }

  if (textToPaste) {
    textToPaste = textToPaste
      .replace(/\*\*(.*?)\*\*/gs, "$1")
      .replace(/\*(.*?)\*/gs, "$1")
      .replace(/__(.*?)__/gs, "$1")
      .replace(/_(.*?)_/gs, "$1")
      .replace(/\[(.*?)\]\((.*?)\)/gs, "$1 ($2)");
  }

  if (!textToPaste) {
    console.warn("Text became empty after cleaning, nothing to paste.");
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
            injectionResults.find((frame) => frame.error).error,
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
            } else {
              console.log(
                "Content script response (or no response/unexpected response):",
                response,
              );
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
