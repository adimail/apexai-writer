// js/content_script.js

(() => {
  // This IIFE structure helps avoid polluting the global scope of the page.

  // Check if the script has already been loaded and initialized in this context.
  // This is a simple guard against multiple executions if injected multiple times,
  // though chrome.scripting.executeScript with 'files' usually handles this.
  // The main logic for handling re-activation is via the message listener.
  if (window.apexAiWriterContentScriptInitialized) {
    return;
  }
  window.apexAiWriterContentScriptInitialized = true;

  let currentHoveredTarget = null;
  let textToPasteGlobal = "";
  let isSelectingActive = false;
  const HIGHLIGHT_CLASS = "apexai-writer-input-highlight";
  const HIGHLIGHT_STYLE_ID = "apexai-writer-highlight-style-v1"; // Unique ID for the style tag
  const BODY_SELECTING_CLASS = "apexai-writer-body-selecting";

  function injectHighlightStyle() {
    if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
      return; // Style already injected
    }
    const style = document.createElement("style");
    style.id = HIGHLIGHT_STYLE_ID;
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 3px dotted #4CAF50 !important; /* Green dotted outline */
        outline-offset: 2px !important;
        background-color: rgba(76, 175, 80, 0.15) !important; /* Light green background */
        box-shadow: 0 0 0 2px #4CAF50 !important; /* Ensure visibility on dark backgrounds */
        cursor: pointer !important;
      }
      body.${BODY_SELECTING_CLASS}, body.${BODY_SELECTING_CLASS} * {
        cursor: crosshair !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isEligible(element) {
    if (!element || !element.isConnected) return false; // Must be part of the DOM

    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : "";

    const isStandardInput =
      tagName === "input" &&
      [
        "text",
        "search",
        "email",
        "url",
        "tel",
        "password",
        "number",
        "",
      ].includes(type);
    const isTextArea = tagName === "textarea";
    const isContentEditable = element.isContentEditable;

    if (!(isStandardInput || isTextArea || isContentEditable)) {
      return false;
    }

    // Check visibility and enabled state
    const computedStyle = window.getComputedStyle(element);
    if (
      computedStyle.display === "none" ||
      computedStyle.visibility === "hidden" ||
      computedStyle.opacity === "0"
    ) {
      return false;
    }
    if (element.disabled || (element.readOnly && !isContentEditable)) {
      // contentEditable doesn't have 'readOnly' attribute in the same way
      return false;
    }

    // Check for zero-size elements that are not contentEditable (which can start empty)
    if (
      !isContentEditable &&
      element.offsetWidth === 0 &&
      element.offsetHeight === 0
    ) {
      return false;
    }

    return true;
  }

  function applyHighlight(target) {
    if (isEligible(target)) {
      target.classList.add(HIGHLIGHT_CLASS);
      currentHoveredTarget = target;
    }
  }

  function removeHighlight(target) {
    if (target) {
      // target might be null if called from cleanup
      target.classList.remove(HIGHLIGHT_CLASS);
      if (currentHoveredTarget === target) {
        currentHoveredTarget = null;
      }
    }
  }

  function handleMouseOver(event) {
    if (!isSelectingActive) return;
    const target = event.target;
    if (target === currentHoveredTarget) return; // Already on this target

    if (currentHoveredTarget) {
      // Remove from old target if exists
      removeHighlight(currentHoveredTarget);
    }
    applyHighlight(target);
  }

  function handleMouseOut(event) {
    if (!isSelectingActive) return;
    // Do not remove highlight if moving to a child of the current highlighted element
    if (
      currentHoveredTarget &&
      event.relatedTarget &&
      currentHoveredTarget.contains(event.relatedTarget)
    ) {
      return;
    }
    removeHighlight(event.target);
  }

  function handleClick(event) {
    if (!isSelectingActive || !currentHoveredTarget) return;

    // Check if the click was on the currently highlighted eligible target
    if (
      isEligible(currentHoveredTarget) &&
      currentHoveredTarget.classList.contains(HIGHLIGHT_CLASS)
    ) {
      event.preventDefault();
      event.stopPropagation();

      const targetElement = currentHoveredTarget; // Use the confirmed highlighted target

      if (targetElement.isContentEditable) {
        targetElement.focus();
        // More robust way to insert/replace text in contentEditable
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (targetElement.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            range.insertNode(document.createTextNode(textToPasteGlobal));
            // Move cursor after inserted text
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // Fallback: selection not in target, replace all content
            targetElement.textContent = textToPasteGlobal;
          }
        } else {
          // No selection, just set content
          targetElement.textContent = textToPasteGlobal;
        }
      } else {
        // For <input> and <textarea>
        targetElement.value = textToPasteGlobal;
        // Dispatch events to notify frameworks of the change
        targetElement.dispatchEvent(
          new Event("input", { bubbles: true, cancelable: true }),
        );
        targetElement.dispatchEvent(
          new Event("change", { bubbles: true, cancelable: true }),
        );
      }

      cleanupSelection();
      // Optionally: chrome.runtime.sendMessage({ action: "textPasted", success: true });
    }
  }

  function handleKeyDown(event) {
    if (isSelectingActive && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cleanupSelection();
      // Optionally: chrome.runtime.sendMessage({ action: "selectionCancelledByEsc" });
    }
  }

  function startSelectionMode(text) {
    // If called while already active, this implies a restart, so clean up first.
    if (isSelectingActive) {
      cleanupSelectionListenersOnly(); // Don't remove style/body class if re-activating immediately
    } else {
      // Only inject style if not already active (first time or after full cleanup)
      injectHighlightStyle();
    }

    textToPasteGlobal = text;
    isSelectingActive = true;
    document.body.classList.add(BODY_SELECTING_CLASS);

    // Use capture phase for robust event handling
    document.addEventListener("mouseover", handleMouseOver, { capture: true });
    document.addEventListener("mouseout", handleMouseOut, { capture: true });
    document.addEventListener("click", handleClick, {
      capture: true,
      once: false,
    }); // Listen until successful click
    document.addEventListener("keydown", handleKeyDown, { capture: true });
  }

  function cleanupSelectionListenersOnly() {
    document.removeEventListener("mouseover", handleMouseOver, {
      capture: true,
    });
    document.removeEventListener("mouseout", handleMouseOut, { capture: true });
    document.removeEventListener("click", handleClick, { capture: true });
    document.removeEventListener("keydown", handleKeyDown, { capture: true });

    if (currentHoveredTarget) {
      removeHighlight(currentHoveredTarget);
    }
  }

  function cleanupSelection() {
    if (!isSelectingActive) return;

    cleanupSelectionListenersOnly();

    document.body.classList.remove(BODY_SELECTING_CLASS);
    // The style tag can remain as it's small and specific.
    // Or, to remove it:
    // const styleTag = document.getElementById(HIGHLIGHT_STYLE_ID);
    // if (styleTag) styleTag.remove();

    isSelectingActive = false;
    textToPasteGlobal = "";
    currentHoveredTarget = null; // Ensure this is cleared
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSelection") {
      // If a selection mode is already active from this content script instance,
      // fully clean it up before starting a new one. This handles popup button clicks.
      if (isSelectingActive) {
        cleanupSelection();
      }
      startSelectionMode(request.textToPaste);
      sendResponse({ status: "selectionStarted" });
      return true; // Indicate that sendResponse might be called asynchronously (good practice)
    }
    // Add other message handlers if needed in the future
  });
})();
