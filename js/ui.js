import { companyInfo } from "./config.js";

function createFormGroup(labelText, inputElement, helpText = null) {
  const group = document.createElement("div");
  group.className = "form-group contextual-input-group";

  if (labelText) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (
      inputElement.id ||
      (inputElement.classList && inputElement.classList.contains("radio-group"))
    ) {
      if (inputElement.id && !inputElement.classList.contains("radio-group")) {
        label.htmlFor = inputElement.id;
      }
    }
    group.appendChild(label);
  }
  group.appendChild(inputElement);

  if (helpText) {
    const helpTextEl = document.createElement("p");
    helpTextEl.className = "input-help-text";
    helpTextEl.textContent = helpText;
    group.appendChild(helpTextEl);
  }
  return group;
}

function createTextInput(id, placeholder, dataKey, value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.placeholder = placeholder;
  input.dataset.key = dataKey;
  input.value = value;
  return input;
}

function createTextarea(id, placeholder, dataKey, rows = 2, value = "") {
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.dataset.key = dataKey;
  textarea.rows = rows;
  textarea.value = value;
  return textarea;
}

function createSelect(
  id,
  options,
  dataKey,
  defaultOptionText = "Select an option",
  selectedValue = "",
) {
  const select = document.createElement("select");
  select.id = id;
  select.dataset.key = dataKey;

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = defaultOptionText;
  select.appendChild(defaultOpt);

  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.text;
    select.appendChild(optionEl);
  });
  select.value = selectedValue;
  return select;
}

function createDateInput(id, dataKey, value = "") {
  const input = document.createElement("input");
  input.type = "date";
  input.id = id;
  input.dataset.key = dataKey;
  input.value = value;
  return input;
}

function createRadioGroup(name, options, dataKey, initialValue = null) {
  const groupContainer = document.createElement("div");
  groupContainer.className = "radio-group";
  groupContainer.dataset.key = dataKey;

  options.forEach((opt) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "radio-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.id = `${name}_${opt.value.replace(/\s+/g, "-")}`;
    radio.value = opt.value;

    if (initialValue === opt.value) {
      radio.checked = true;
    }

    const label = document.createElement("label");
    label.htmlFor = radio.id;
    label.textContent = opt.text;

    optionDiv.appendChild(radio);
    optionDiv.appendChild(label);
    groupContainer.appendChild(optionDiv);
  });
  return groupContainer;
}

const meetingActions = [
  { value: "schedule", text: "Schedule a new meeting" },
  { value: "cancel", text: "Cancel an existing meeting" },
  { value: "reschedule", text: "Reschedule an existing meeting" },
  { value: "reminder", text: "Send reminder for an upcoming meeting" },
  { value: "join_request", text: "Ask to join an ongoing meeting" },
];

function _renderMeetingActionSpecificFields(
  action,
  container,
  appState,
  onInputChangeCallback,
) {
  container.innerHTML = "";

  let fields = [];
  switch (action) {
    case "schedule": {
      fields = [
        createFormGroup(
          "Purpose of the new meeting",
          createTextarea(
            "meetingPurpose",
            "e.g., Discuss potential collaboration on Project Phoenix, Explore AI integration opportunities",
            "meetingPurpose",
            2,
            appState.contextualCache?.meetingPurpose || "",
          ),
        ),
        createFormGroup(
          "Proposed Duration",
          createSelect(
            "meetingDuration",
            [
              { value: "15min", text: "15 minutes" },
              { value: "30min", text: "30 minutes" },
              { value: "45min", text: "45 minutes" },
              { value: "60min", text: "1 hour" },
            ],
            "meetingDuration",
            "Select duration",
            appState.contextualCache?.meetingDuration || "",
          ),
        ),
        createFormGroup(
          "Your General Availability",
          createTextInput(
            "meetingAvailability",
            "e.g., Tue/Thu mornings next week; Any day after 3 PM",
            "availability",
            appState.contextualCache?.availability || "",
          ),
        ),
      ];
      break;
    }
    case "cancel": {
      fields = [
        createFormGroup(
          "Topic/Subject of meeting to cancel",
          createTextInput(
            "meetingIdentifierCancel",
            "e.g., Project X sync; Follow-up discussion",
            "meetingIdentifier",
            appState.contextualCache?.meetingIdentifier || "",
          ),
        ),
        createFormGroup(
          "Reason for cancellation (optional)",
          createTextarea(
            "cancellationReason",
            "e.g., Unforeseen conflict, Need to postpone discussion",
            "cancellationReason",
            2,
            appState.contextualCache?.cancellationReason || "",
          ),
        ),
      ];
      break;
    }
    case "reschedule": {
      fields = [
        createFormGroup(
          "Topic/Subject of meeting to reschedule",
          createTextInput(
            "meetingIdentifierReschedule",
            "e.g., Project Y kickoff; Strategy session",
            "meetingIdentifier",
            appState.contextualCache?.meetingIdentifier || "",
          ),
        ),
        createFormGroup(
          "Original meeting time (optional)",
          createTextInput(
            "originalMeetingTime",
            "e.g., Tomorrow 2 PM; Last Tuesday at 10 AM",
            "originalMeetingTime",
            appState.contextualCache?.originalMeetingTime || "",
          ),
        ),
        createFormGroup(
          "Reason for rescheduling (optional)",
          createTextarea(
            "rescheduleReason",
            "e.g., Scheduling conflict, Need more preparation time",
            "rescheduleReason",
            2,
            appState.contextualCache?.rescheduleReason || "",
          ),
        ),
        createFormGroup(
          "Your new availability / proposed times",
          createTextarea(
            "newAvailability",
            "e.g., Available next Mon/Wed afternoons; Propose next Fri 11 AM or 3 PM",
            "newAvailability",
            2,
            appState.contextualCache?.newAvailability || "",
          ),
        ),
      ];
      break;
    }
    case "reminder": {
      fields = [
        createFormGroup(
          "Topic/Subject of meeting",
          createTextInput(
            "meetingIdentifierReminder",
            "e.g., Catch-up on Q3 goals; Demo of new feature",
            "meetingIdentifier",
            appState.contextualCache?.meetingIdentifier || "",
          ),
        ),
        createFormGroup(
          "Meeting date & time",
          createTextInput(
            "meetingTimeReminder",
            "e.g., Tomorrow at 10 AM PST; Wed, July 24th, 2:00 PM CET",
            "meetingTime",
            appState.contextualCache?.meetingTime || "",
          ),
        ),
        createFormGroup(
          "Key points/agenda to remind (optional)",
          createTextarea(
            "reminderKeyPoints",
            "e.g., We'll discuss A, B, and C; Please come prepared with X",
            "reminderKeyPoints",
            2,
            appState.contextualCache?.reminderKeyPoints || "",
          ),
        ),
      ];
      break;
    }
    case "join_request": {
      fields = [
        createFormGroup(
          "Topic/Subject of ongoing meeting (if known)",
          createTextInput(
            "meetingIdentifierJoin",
            "e.g., Daily stand-up; Client onboarding call",
            "meetingIdentifier",
            appState.contextualCache?.meetingIdentifier || "",
          ),
        ),
        createFormGroup(
          "Reason for wanting to join",
          createTextarea(
            "joinReason",
            "e.g., I have a quick update on the X issue; I can provide context on Y",
            "joinReason",
            2,
            appState.contextualCache?.joinReason || "",
          ),
        ),
      ];
      break;
    }
  }

  fields.forEach((field) => container.appendChild(field));

  container.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", onInputChangeCallback);
    el.addEventListener("change", onInputChangeCallback);
  });
}

export function renderContextualInputs(
  situation,
  containerElement,
  appState,
  onInputChangeCallback,
  onMeetingActionChangeCallback,
) {
  containerElement.innerHTML = "";

  const recipientNameInput = createTextInput(
    "contextualRecipientName",
    "e.g., Priya Sharma",
    "recipientName",
    appState.lastRecipientName,
  );
  recipientNameInput.addEventListener("input", onInputChangeCallback);

  const recipientCompanyInput = createTextInput(
    "contextualRecipientCompany",
    "e.g., Innovatech Solutions",
    "recipientCompany",
    appState.lastRecipientCompany,
  );
  recipientCompanyInput.addEventListener("input", onInputChangeCallback);

  const commonFields = [
    createFormGroup("Recipient Name", recipientNameInput),
    createFormGroup("Recipient Company Name", recipientCompanyInput),
  ];

  let situationSpecificElements = [];

  switch (situation) {
    case "cold-email": {
      situationSpecificElements = [
        createFormGroup(
          "Recipient Company Industry/Domain",
          createTextInput(
            "coldEmailIndustry",
            "e.g., Fintech, Renewable Energy",
            "recipientIndustry",
            appState.contextualCache?.recipientIndustry || "",
          ),
        ),
        createFormGroup(
          "Specific Pain Point to Address",
          createTextarea(
            "coldEmailPainPoint",
            "e.g., Streamlining data analytics pipeline...",
            "painPoint",
            2,
            appState.contextualCache?.painPoint || "",
          ),
        ),
        createFormGroup(
          "Desired Outcome",
          createSelect(
            "coldEmailOutcome",
            [
              { value: "schedule-call", text: "Schedule a call" },
              { value: "get-demo", text: "Get a demo" },
              { value: "share-info", text: "Share information" },
            ],
            "desiredOutcome",
            "Select desired outcome",
            appState.contextualCache?.desiredOutcome || "",
          ),
        ),
      ];
      break;
    }
    case "followup": {
      situationSpecificElements = [
        createFormGroup(
          "Previous Interaction Date",
          createDateInput(
            "followupDate",
            "previousInteractionDate",
            appState.contextualCache?.previousInteractionDate || "",
          ),
        ),
        createFormGroup(
          "Key Point from Previous Interaction",
          createTextarea(
            "followupKeyPoint",
            "e.g., Discussed their need for custom AI models...",
            "previousKeyPoint",
            2,
            appState.contextualCache?.previousKeyPoint || "",
          ),
        ),
        createFormGroup(
          "New Value/Information to Offer",
          createTextarea(
            "followupNewValue",
            "e.g., Our new whitepaper on MLOps best practices...",
            "newValue",
            2,
            appState.contextualCache?.newValue || "",
          ),
        ),
      ];
      break;
    }
    case "pitch-agency": {
      situationSpecificElements = [
        createFormGroup(
          "Client's Main Challenge/Goal",
          createTextarea(
            "pitchClientChallenge",
            "e.g., Enhancing user experience on their platform...",
            "clientChallenge",
            2,
            appState.contextualCache?.clientChallenge || "",
          ),
        ),
        createFormGroup(
          "Specific APEXAI Service to Highlight",
          createSelect(
            "pitchServiceHighlight",
            companyInfo.detailedServices.map((s) => ({
              value: s.id,
              text: s.name,
            })),
            "specificService",
            "Select a service",
            appState.contextualCache?.specificService || "",
          ),
        ),
      ];
      break;
    }
    case "proposal": {
      situationSpecificElements = [
        createFormGroup(
          "Project Scope Summary",
          createTextarea(
            "proposalScope",
            "Briefly outline the proposed project...",
            "projectScope",
            3,
            appState.contextualCache?.projectScope || "",
          ),
        ),
        createFormGroup(
          "Key Client Objectives (1-3)",
          createTextarea(
            "proposalObjectives",
            "e.g., Develop a predictive maintenance system, Improve customer retention by 15%...",
            "keyObjectives",
            3,
            appState.contextualCache?.keyObjectives || "",
          ),
        ),
      ];
      break;
    }
    case "meeting-request": {
      const clientStatusRadio = createRadioGroup(
        "meetingClientStatusRadio",
        [
          { value: "new", text: "New Client / Prospect" },
          { value: "existing", text: "Existing Client" },
        ],
        "clientStatus",
        appState.contextualCache?.clientStatus || null,
      );
      clientStatusRadio
        .querySelectorAll("input[type='radio']")
        .forEach((radio) =>
          radio.addEventListener("change", onInputChangeCallback),
        );

      const meetingActionSelect = createSelect(
        "meetingActionSelect",
        meetingActions,
        "meetingAction",
        "Select meeting action",
        appState.selectedMeetingAction || "schedule",
      );

      const actionSpecificFieldsContainer = document.createElement("div");
      actionSpecificFieldsContainer.id = "meetingActionSpecificFields";

      meetingActionSelect.addEventListener("change", (event) => {
        onMeetingActionChangeCallback(event.target.value);
      });

      situationSpecificElements = [
        createFormGroup("Client Status", clientStatusRadio),
        createFormGroup("Meeting Action", meetingActionSelect),
        actionSpecificFieldsContainer,
      ];

      break;
    }
    case "thank-you": {
      situationSpecificElements = [
        createFormGroup(
          "Reason for Thanks",
          createSelect(
            "thankYouReason",
            [
              { value: "meeting", text: "Recent Meeting" },
              { value: "referral", text: "Referral" },
              { value: "new-business", text: "New Business/Project" },
              { value: "feedback", text: "Valuable Feedback" },
              { value: "general-appreciation", text: "General Appreciation" },
            ],
            "reasonForThanks",
            "Select reason",
            appState.contextualCache?.reasonForThanks || "",
          ),
        ),
        createFormGroup(
          "Specific Detail to Mention",
          createTextarea(
            "thankYouDetail",
            "e.g., Your insights on market trends were very helpful...",
            "specificDetail",
            2,
            appState.contextualCache?.specificDetail || "",
          ),
        ),
      ];
      break;
    }
    default:
      break;
  }

  if (commonFields.length > 0 || situationSpecificElements.length > 0) {
    const heading = document.createElement("h4");
    heading.textContent = "Additional Context";
    heading.className = "contextual-inputs-heading";
    containerElement.appendChild(heading);

    commonFields.forEach((field) => containerElement.appendChild(field));
    situationSpecificElements.forEach((element) => {
      containerElement.appendChild(element);

      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
      ) {
        element.addEventListener("input", onInputChangeCallback);
        element.addEventListener("change", onInputChangeCallback);
      } else if (element.classList.contains("form-group")) {
        const inputEl = element.querySelector(
          "input, textarea, select:not(#meetingActionSelect)",
        );
        if (inputEl) {
          inputEl.addEventListener("input", onInputChangeCallback);
          inputEl.addEventListener("change", onInputChangeCallback);
        }
      }
    });

    if (situation === "meeting-request") {
      const specificFieldsContainer = containerElement.querySelector(
        "#meetingActionSpecificFields",
      );
      if (specificFieldsContainer) {
        _renderMeetingActionSpecificFields(
          appState.selectedMeetingAction || "schedule",
          specificFieldsContainer,
          appState,
          onInputChangeCallback,
        );
      }
    }
  }
}

export function getContextualFormData(containerElement) {
  const data = {};

  const elementsWithDataKey = containerElement.querySelectorAll("[data-key]");

  elementsWithDataKey.forEach((element) => {
    const key = element.dataset.key;
    if (element.classList.contains("radio-group")) {
      const checkedRadio = element.querySelector("input[type='radio']:checked");
      data[key] = checkedRadio ? checkedRadio.value : "";
    } else if (element.type === "checkbox") {
      data[key] = element.checked;
    } else if (element.type === "range") {
      data[key] = element.value;
    } else {
      data[key] = element.value;
    }
  });
  return data;
}
