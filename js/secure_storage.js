const ENCRYPTION_KEY_STORAGE_KEY = "_apexSecKeyV1";
const APP_SETTINGS_STORAGE_KEY = "_apexCfgDatV1";
const OLD_APP_SETTINGS_KEY = "appSettingsV2";

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Retrieves the AES-GCM encryption key from chrome.storage.local.
 * If not found, generates a new key, stores it, and returns it.
 * CryptoKey objects are structured-clonable and can be stored directly.
 * @returns {Promise<CryptoKey>} The encryption key.
 */
async function getEncryptionKey() {
  let keyData = await chrome.storage.local.get(ENCRYPTION_KEY_STORAGE_KEY);
  if (keyData && keyData[ENCRYPTION_KEY_STORAGE_KEY]) {
    return keyData[ENCRYPTION_KEY_STORAGE_KEY];
  } else {
    const newKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
    
      ["encrypt", "decrypt"],
    );
    await chrome.storage.local.set({ [ENCRYPTION_KEY_STORAGE_KEY]: newKey });
    console.log("Generated and stored new encryption key.");
    return newKey;
  }
}

/**
 * Encrypts a string using AES-GCM.
 * @param {CryptoKey} key The encryption key.
 * @param {string} plaintext The string to encrypt.
 * @returns {Promise<{iv: string, ciphertext: string} | null>} Object containing base64 IV and ciphertext, or null if plaintext is null/undefined.
 */
async function encryptString(key, plaintext) {
  if (plaintext === null || typeof plaintext === "undefined") return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedPlaintext,
  );
  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
}

/**
 * Decrypts a string using AES-GCM.
 * @param {CryptoKey} key The encryption key.
 * @param {{iv: string, ciphertext: string}} encryptedPayload Object with base64 IV and ciphertext.
 * @returns {Promise<string|null>} The decrypted string, or null if input is invalid or decryption fails.
 */
async function decryptString(key, encryptedPayload) {
  if (
    !encryptedPayload ||
    typeof encryptedPayload.iv !== "string" ||
    typeof encryptedPayload.ciphertext !== "string"
  ) {
    return null;
  }
  try {
    const iv = base64ToArrayBuffer(encryptedPayload.iv);
    const ciphertext = base64ToArrayBuffer(encryptedPayload.ciphertext);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error, "Payload:", encryptedPayload);
  
  
    return null;
  }
}

/**
 * Saves the application settings to chrome.storage.local after encrypting API keys.
 * Uses a cryptic key name for the settings object and internal sensitive data.
 * @param {object} settings The application settings object (e.g., appState).
 */
export async function saveEncryptedSettings(settings) {
  const key = await getEncryptionKey();
  const settingsToStore = { ...settings };

  const encryptedApiKeys = {};
  if (settings.apiKeys?.openai) {
    encryptedApiKeys.o = await encryptString(key, settings.apiKeys.openai);
  } else {
    encryptedApiKeys.o = null;
  }
  if (settings.apiKeys?.google) {
    encryptedApiKeys.g = await encryptString(key, settings.apiKeys.google);
  } else {
    encryptedApiKeys.g = null;
  }

  settingsToStore._secDat = encryptedApiKeys;
  delete settingsToStore.apiKeys;

  await chrome.storage.local.set({
    [APP_SETTINGS_STORAGE_KEY]: settingsToStore,
  });

}

/**
 * Loads application settings from chrome.storage.local, decrypting API keys.
 * Handles migration from an old settings format (OLD_APP_SETTINGS_KEY) if necessary.
 * @returns {Promise<object|null>} The loaded and decrypted settings object, or null if no settings found.
 */
export async function loadDecryptedSettings() {
  const key = await getEncryptionKey();

  let storedData = await chrome.storage.local.get([
    APP_SETTINGS_STORAGE_KEY,
    OLD_APP_SETTINGS_KEY,
  ]);

  let settings = null;

  if (storedData && storedData[APP_SETTINGS_STORAGE_KEY]) {
  
    settings = storedData[APP_SETTINGS_STORAGE_KEY];
    const decryptedApiKeys = { openai: null, google: null };
    if (settings._secDat?.o) {
      decryptedApiKeys.openai = await decryptString(key, settings._secDat.o);
    }
    if (settings._secDat?.g) {
      decryptedApiKeys.google = await decryptString(key, settings._secDat.g);
    }
    settings.apiKeys = decryptedApiKeys;
    delete settings._secDat;
  } else if (storedData && storedData[OLD_APP_SETTINGS_KEY]) {
  
    console.log(
      `Old settings format ('${OLD_APP_SETTINGS_KEY}') found. Migrating to new encrypted format ('${APP_SETTINGS_STORAGE_KEY}').`,
    );
    const oldSettings = storedData[OLD_APP_SETTINGS_KEY];

  
    settings = { ...oldSettings };
  
    settings.apiKeys = {
      openai: oldSettings.apiKeys?.openai || null,
      google: oldSettings.apiKeys?.google || null,
    };

  
    const newStructureToSave = { ...oldSettings };
    delete newStructureToSave.apiKeys;

    const encryptedApiKeysForStorage = {};
    if (oldSettings.apiKeys?.openai) {
      encryptedApiKeysForStorage.o = await encryptString(
        key,
        oldSettings.apiKeys.openai,
      );
    }
    if (oldSettings.apiKeys?.google) {
      encryptedApiKeysForStorage.g = await encryptString(
        key,
        oldSettings.apiKeys.google,
      );
    }
    newStructureToSave._secDat = encryptedApiKeysForStorage;

    await chrome.storage.local.set({
      [APP_SETTINGS_STORAGE_KEY]: newStructureToSave,
    });
    await chrome.storage.local.remove(OLD_APP_SETTINGS_KEY);
    console.log("Migration complete. Old settings removed.");
  }


  if (settings && typeof settings.apiKeys === "undefined") {
    settings.apiKeys = { openai: null, google: null };
  }

  return settings;
}
