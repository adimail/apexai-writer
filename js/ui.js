import { apexAiCompanyInfo } from "./config.js";

function createFormGroup(labelText, inputElement) {
  const group = document.createElement("div");
  group.className = "form-group contextual-input-group";

  if (labelText) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (inputElement.id) {
      label.htmlFor = inputElement.id;
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

function createRangeInput(id, min, max, step, value, dataKey, unit = "") {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.dataset.key = dataKey;
  input.style.flexGrow = "1";

  const output = document.createElement("span");
  output.id = `${id}-value`;
  output.textContent = `${value} ${unit}`;
  output.style.marginLeft = "10px";
  output.style.minWidth = "50px"; // Adjust as needed

  input.addEventListener("input", () => {
    output.textContent = `${input.value} ${unit}`;
  });

  container.appendChild(input);
  container.appendChild(output);
  return container; // Return the container holding both input and output
}

export function renderContextualInputs(situation, containerElement) {
  containerElement.innerHTML = ""; // Clear previous inputs

  let fields = [];

  switch (situation) {
    case "cold-email":
      fields = [
        {
          label: "Target Company Name",
          el: createTextInput(
            "coldEmailCompany",
            "e.g., Acme Corp",
            "targetCompany",
          ),
        },
        {
          label: "Target Contact Person (Optional)",
          el: createTextInput(
            "coldEmailContact",
            "e.g., Jane Doe, CEO",
            "targetContact",
          ),
        },
        {
          label: "Target Company Industry/Domain",
          el: createTextInput(
            "coldEmailIndustry",
            "e.g., SaaS, E-commerce",
            "targetIndustry",
          ),
        },
        {
          label: "Specific Pain Point to Address",
          el: createTextarea(
            "coldEmailPainPoint",
            "e.g., Difficulty scaling operations...",
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
      fields = [
        {
          label: "Previous Interaction Date (Optional)",
          el: createDateInput("followupDate", "previousInteractionDate"),
        },
        {
          label: "Key Point from Previous Interaction",
          el: createTextarea(
            "followupKeyPoint",
            "e.g., Discussed their interest in AI...",
            "previousKeyPoint",
          ),
        },
        {
          label: "New Value/Information to Offer",
          el: createTextarea(
            "followupNewValue",
            "e.g., We recently launched a relevant case study...",
            "newValue",
          ),
        },
      ];
      break;
    case "pitch-agency":
      fields = [
        {
          label: "Client/Prospect Name",
          el: createTextInput(
            "pitchClientName",
            "e.g., Innovate Ltd.",
            "clientName",
          ),
        },
        {
          label: "Client's Main Challenge/Goal",
          el: createTextarea(
            "pitchClientChallenge",
            "e.g., Looking to improve customer engagement...",
            "clientChallenge",
          ),
        },
        {
          label: "Specific APEXAI Service to Highlight",
          el: createSelect(
            "pitchServiceHighlight",
            apexAiCompanyInfo.detailedServices.map((s) => ({
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
      fields = [
        {
          label: "Client Name",
          el: createTextInput(
            "proposalClientName",
            "e.g., Global Corp",
            "clientName",
          ),
        },
        {
          label: "Project Scope Summary",
          el: createTextarea(
            "proposalScope",
            "Briefly describe the project...",
            "projectScope",
            3,
          ),
        },
        {
          label: "Key Client Objectives (1-3)",
          el: createTextarea(
            "proposalObjectives",
            "e.g., Increase efficiency by 20%, Launch new product line...",
            "keyObjectives",
            3,
          ),
        },
        // Example of a range slider - might be too complex for simple text generation, but demonstrates capability
        // { label: 'Estimated Project Duration (Weeks)', el: createRangeInput('proposalDuration', 2, 52, 1, 8, 'projectDurationWeeks', 'weeks') },
      ];
      break;
    case "meeting-request":
      fields = [
        {
          label: "Purpose of Meeting",
          el: createTextInput(
            "meetingPurpose",
            "e.g., Discuss potential collaboration on X",
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
          label: "Your General Availability (Optional)",
          el: createTextInput(
            "meetingAvailability",
            "e.g., Next Mon-Wed afternoons",
            "availability",
          ),
        },
      ];
      break;
    case "thank-you":
      fields = [
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
            "e.g., Appreciated your insights on X...",
            "specificDetail",
          ),
        },
      ];
      break;
    default:
      // No specific inputs for this situation, or situation not recognized
      break;
  }

  if (fields.length > 0) {
    const heading = document.createElement("h4");
    heading.textContent = "Additional Context";
    heading.className = "contextual-inputs-heading";
    containerElement.appendChild(heading);

    fields.forEach((field) => {
      // If the element is a container (like for range input), append it directly
      // Otherwise, wrap it in a form group
      if (field.el.dataset && field.el.dataset.key) {
        // Simple input
        containerElement.appendChild(createFormGroup(field.label, field.el));
      } else {
        // Likely a composite element like range slider's container
        const group = createFormGroup(field.label, field.el);
        containerElement.appendChild(group);
      }
    });
  }
}

export function getContextualFormData(containerElement) {
  const data = {};
  const inputs = containerElement.querySelectorAll("[data-key]");
  inputs.forEach((input) => {
    const key = input.dataset.key;
    if (input.type === "checkbox") {
      data[key] = input.checked;
    } else if (input.type === "range") {
      data[key] = input.value; // The range input itself has data-key
    } else {
      data[key] = input.value.trim();
    }
  });
  return data;
}
