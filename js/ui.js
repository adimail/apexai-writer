import { companyInfo } from "./config.js";

function createFormGroup(labelText, inputElement) {
  const group = document.createElement("div");
  group.className = "form-group contextual-input-group";

  if (labelText) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (
      inputElement.id ||
      (inputElement.classList && inputElement.classList.contains("radio-group"))
    ) {
      // For radio groups, the label is for the group, not a specific input ID.
      // We can associate it if the group has an ID, or just let it be a general label.
      // For now, if inputElement is a radio group, we don't set `htmlFor`.
      if (inputElement.id && !inputElement.classList.contains("radio-group")) {
        label.htmlFor = inputElement.id;
      }
    }
    group.appendChild(label);
  }
  group.appendChild(inputElement);
  return group;
}

function createTextInput(id, placeholder, dataKey) {
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.placeholder = placeholder;
  input.dataset.key = dataKey;
  return input;
}

function createTextarea(id, placeholder, dataKey, rows = 2) {
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.dataset.key = dataKey;
  textarea.rows = rows;
  return textarea;
}

function createSelect(
  id,
  options,
  dataKey,
  defaultOptionText = "Select an option",
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
  return select;
}

function createDateInput(id, dataKey) {
  const input = document.createElement("input");
  input.type = "date";
  input.id = id;
  input.dataset.key = dataKey;
  return input;
}

/**
 * Creates a group of radio buttons.
 * @param {string} name - The common name for the radio buttons in the group.
 * @param {Array<{value: string, text: string}>} options - Array of options for radio buttons.
 * @param {string} dataKey - The data-key attribute for the group container, used for form data retrieval.
 * @param {string|null} [initialValue=null] - The value of the radio button to be checked initially.
 * @returns {HTMLDivElement} The container div for the radio group.
 */
function createRadioGroup(name, options, dataKey, initialValue = null) {
  const groupContainer = document.createElement("div");
  groupContainer.className = "radio-group"; // Apply styling
  groupContainer.dataset.key = dataKey; // For getContextualFormData

  options.forEach((opt) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "radio-option"; // Apply styling

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.id = `${name}_${opt.value.replace(/\s+/g, "-")}`; // Ensure ID is valid
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

export function renderContextualInputs(
  situation,
  containerElement,
  initialRecipientName = "",
  initialRecipientCompany = "",
  // initialClientStatus = null // Not used for client status as it should be selected each time
) {
  containerElement.innerHTML = "";

  const recipientNameInput = createTextInput(
    "contextualRecipientName",
    "e.g., Priya Sharma",
    "recipientName",
  );
  recipientNameInput.value = initialRecipientName;

  const recipientCompanyInput = createTextInput(
    "contextualRecipientCompany",
    "e.g., Innovatech Solutions",
    "recipientCompany",
  );
  recipientCompanyInput.value = initialRecipientCompany;

  const commonRecipientNameField = {
    label: "Recipient Name",
    el: recipientNameInput,
  };
  const commonRecipientCompanyField = {
    label: "Recipient Company Name",
    el: recipientCompanyInput,
  };

  let situationSpecificFields = [];

  switch (situation) {
    case "cold-email":
      situationSpecificFields = [
        {
          label: "Recipient Company Industry/Domain",
          el: createTextInput(
            "coldEmailIndustry",
            "e.g., Fintech, Renewable Energy",
            "recipientIndustry",
          ),
        },
        {
          label: "Specific Pain Point to Address",
          el: createTextarea(
            "coldEmailPainPoint",
            "e.g., Streamlining data analytics pipeline...",
            "painPoint",
          ),
        },
        {
          label: "Desired Outcome",
          el: createSelect(
            "coldEmailOutcome",
            [
              { value: "schedule-call", text: "Schedule a call" },
              { value: "get-demo", text: "Get a demo" },
              { value: "share-info", text: "Share information" },
            ],
            "desiredOutcome",
            "Select desired outcome",
          ),
        },
      ];
      break;
    case "followup":
      situationSpecificFields = [
        {
          label: "Previous Interaction Date ",
          el: createDateInput("followupDate", "previousInteractionDate"),
        },
        {
          label: "Key Point from Previous Interaction",
          el: createTextarea(
            "followupKeyPoint",
            "e.g., Discussed their need for custom AI models...",
            "previousKeyPoint",
          ),
        },
        {
          label: "New Value/Information to Offer",
          el: createTextarea(
            "followupNewValue",
            "e.g., Our new whitepaper on MLOps best practices...",
            "newValue",
          ),
        },
      ];
      break;
    case "pitch-agency":
      situationSpecificFields = [
        {
          label: "Client's Main Challenge/Goal",
          el: createTextarea(
            "pitchClientChallenge",
            "e.g., Enhancing user experience on their platform...",
            "clientChallenge",
          ),
        },
        {
          label: "Specific APEXAI Service to Highlight",
          el: createSelect(
            "pitchServiceHighlight",
            companyInfo.detailedServices.map((s) => ({
              value: s.id,
              text: s.name,
            })),
            "specificService",
            "Select a service",
          ),
        },
      ];
      break;
    case "proposal":
      situationSpecificFields = [
        {
          label: "Project Scope Summary",
          el: createTextarea(
            "proposalScope",
            "Briefly outline the proposed project...",
            "projectScope",
            3,
          ),
        },
        {
          label: "Key Client Objectives (1-3)",
          el: createTextarea(
            "proposalObjectives",
            "e.g., Develop a predictive maintenance system, Improve customer retention by 15%...",
            "keyObjectives",
            3,
          ),
        },
      ];
      break;
    case "meeting-request":
      situationSpecificFields = [
        {
          label: "Client Status",
          el: createRadioGroup(
            "meetingClientStatusRadio", // Unique name for this radio group
            [
              { value: "new", text: "New Client / Prospect" },
              { value: "existing", text: "Existing Client" },
            ],
            "clientStatus", // This dataKey will be used by getContextualFormData
            null, // No initial value, forces user selection.
          ),
        },
        {
          label: "Purpose of Meeting",
          el: createTextInput(
            "meetingPurpose",
            "e.g., Explore partnership for AI integration",
            "meetingPurpose",
          ),
        },
        {
          label: "Proposed Duration",
          el: createSelect(
            "meetingDuration",
            [
              { value: "15min", text: "15 minutes" },
              { value: "30min", text: "30 minutes" },
              { value: "45min", text: "45 minutes" },
              { value: "60min", text: "1 hour" },
            ],
            "meetingDuration",
            "Select duration",
          ),
        },
        {
          label: "Your General Availability ",
          el: createTextInput(
            "meetingAvailability",
            "e.g., Tue/Thu mornings next week",
            "availability",
          ),
        },
      ];
      break;
    case "thank-you":
      situationSpecificFields = [
        {
          label: "Reason for Thanks",
          el: createSelect(
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
          ),
        },
        {
          label: "Specific Detail to Mention",
          el: createTextarea(
            "thankYouDetail",
            "e.g., Your insights on market trends were very helpful...",
            "specificDetail",
          ),
        },
      ];
      break;
    default:
      break;
  }

  const allFields = [
    commonRecipientNameField,
    commonRecipientCompanyField,
    ...situationSpecificFields,
  ];

  if (allFields.length > 0) {
    const heading = document.createElement("h4");
    heading.textContent = "Additional Context";
    heading.className = "contextual-inputs-heading";
    containerElement.appendChild(heading);

    allFields.forEach((field) => {
      containerElement.appendChild(createFormGroup(field.label, field.el));
    });
  }
}

export function getContextualFormData(containerElement) {
  const data = {};
  const elementsWithDataKey = containerElement.querySelectorAll("[data-key]");
  elementsWithDataKey.forEach((element) => {
    const key = element.dataset.key;
    if (element.classList.contains("radio-group")) {
      const checkedRadio = element.querySelector("input[type='radio']:checked");
      data[key] = checkedRadio ? checkedRadio.value : ""; // Store empty if none selected
    } else if (element.type === "checkbox") {
      data[key] = element.checked;
    } else if (element.type === "range") {
      data[key] = element.value;
    } else {
      // Handles text, textarea, select, date
      data[key] = element.value.trim();
    }
  });
  return data;
}
