const ENCRYPTION_KEY_STORAGE_KEY = "_apexSecKeyV1_JWK";
const APP_SETTINGS_STORAGE_KEY = "_apexCfgDatV1";
const OLD_APP_SETTINGS_KEY = "appSettingsV2";
const OLD_CRYPTO_KEY_STORAGE_KEY = "_apexSecKeyV1";

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
 * Retrieves the AES-GCM encryption key.
 * It tries to load a JWK from storage and import it.
 * If that fails or no key is found, it generates a new key, exports it as JWK,
 * stores the JWK, and returns the CryptoKey.
 * It also attempts to migrate an old directly stored CryptoKey (if found and extractable).
 * @returns {Promise<CryptoKey>} The encryption key.
 */
async function getEncryptionKey() {
  let storedKeyData = await chrome.storage.local.get([
    ENCRYPTION_KEY_STORAGE_KEY,
    OLD_CRYPTO_KEY_STORAGE_KEY,
  ]);

  if (storedKeyData && storedKeyData[ENCRYPTION_KEY_STORAGE_KEY]) {
    try {
      const jwk = storedKeyData[ENCRYPTION_KEY_STORAGE_KEY];
      const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"],
      );

      return key;
    } catch (e) {
      console.warn("Failed to import stored JWK, will generate a new key.", e);
    }
  }

  if (storedKeyData && storedKeyData[OLD_CRYPTO_KEY_STORAGE_KEY]) {
    console.log("Found old format CryptoKey. Attempting migration to JWK.");
    const oldKeyObject = storedKeyData[OLD_CRYPTO_KEY_STORAGE_KEY];

    if (
      typeof oldKeyObject === "object" &&
      oldKeyObject !== null &&
      "type" in oldKeyObject &&
      "extractable" in oldKeyObject &&
      "algorithm" in oldKeyObject &&
      "usages" in oldKeyObject
    ) {
      try {
        console.warn(
          "Old CryptoKey format found but cannot be reliably migrated without being a true CryptoKey instance or JWK. Generating new key.",
        );
      } catch (migrationError) {
        console.warn(
          "Error during old key migration attempt, generating new key.",
          migrationError,
        );
      }
    }

    await chrome.storage.local.remove(OLD_CRYPTO_KEY_STORAGE_KEY);
  }

  const newKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", newKey);
  await chrome.storage.local.set({ [ENCRYPTION_KEY_STORAGE_KEY]: jwk });

  return newKey;
}

/**
 * Encrypts a string using AES-GCM.
 * @param {CryptoKey} key The encryption key.
 * @param {string} plaintext The string to encrypt.
 * @returns {Promise<{iv: string, ciphertext: string} | null>} Object containing base64 IV and ciphertext, or null if plaintext is null/undefined.
 */
async function encryptString(key, plaintext) {
  if (plaintext === null || typeof plaintext === "undefined") return null;
  if (!(key instanceof CryptoKey)) {
    console.error("Encrypt: Invalid key type. Expected CryptoKey.", key);
    throw new Error("Encryption key is not a valid CryptoKey.");
  }
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
  if (!(key instanceof CryptoKey)) {
    console.error("Decrypt: Invalid key type. Expected CryptoKey.", key);

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

export async function saveEncryptedSettings(settings) {
  const key = await getEncryptionKey();
  if (!(key instanceof CryptoKey)) {
    console.error("SaveSettings: Failed to obtain a valid CryptoKey.");

    throw new Error(
      "Failed to obtain valid encryption key for saving settings.",
    );
  }
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

export async function loadDecryptedSettings() {
  const key = await getEncryptionKey();
  if (!(key instanceof CryptoKey)) {
    console.error(
      "LoadSettings: Failed to obtain a valid CryptoKey. Settings may not be decrypted.",
    );
  }

  let storedData = await chrome.storage.local.get([
    APP_SETTINGS_STORAGE_KEY,
    OLD_APP_SETTINGS_KEY,
  ]);

  let settings = null;

  if (storedData && storedData[APP_SETTINGS_STORAGE_KEY]) {
    settings = storedData[APP_SETTINGS_STORAGE_KEY];
    const decryptedApiKeys = { openai: null, google: null };

    if (settings._secDat?.o) {
      decryptedApiKeys.openai =
        key instanceof CryptoKey
          ? await decryptString(key, settings._secDat.o)
          : null;
      if (decryptedApiKeys.openai === null && settings._secDat.o !== null) {
        console.warn(
          "Failed to decrypt OpenAI API key. It might be corrupted or key changed.",
        );
      }
    }
    if (settings._secDat?.g) {
      decryptedApiKeys.google =
        key instanceof CryptoKey
          ? await decryptString(key, settings._secDat.g)
          : null;
      if (decryptedApiKeys.google === null && settings._secDat.g !== null) {
        console.warn(
          "Failed to decrypt Google API key. It might be corrupted or key changed.",
        );
      }
    }
    settings.apiKeys = decryptedApiKeys;
    delete settings._secDat;
  } else if (storedData && storedData[OLD_APP_SETTINGS_KEY]) {
    console.log(
      `Old settings format ('${OLD_APP_SETTINGS_KEY}') found. Migrating to new encrypted format ('${APP_SETTINGS_STORAGE_KEY}').`,
    );
    const oldSettings = storedData[OLD_APP_SETTINGS_KEY];
    settings = { ...oldSettings };

    const apiKeysToEncrypt = {
      openai: oldSettings.apiKeys?.openai || null,
      google: oldSettings.apiKeys?.google || null,
    };

    const newEncryptedApiKeys = {};
    if (apiKeysToEncrypt.openai && key instanceof CryptoKey) {
      newEncryptedApiKeys.o = await encryptString(key, apiKeysToEncrypt.openai);
    }
    if (apiKeysToEncrypt.google && key instanceof CryptoKey) {
      newEncryptedApiKeys.g = await encryptString(key, apiKeysToEncrypt.google);
    }

    const newStructureToSave = { ...oldSettings };
    delete newStructureToSave.apiKeys;
    newStructureToSave._secDat = newEncryptedApiKeys;

    await chrome.storage.local.set({
      [APP_SETTINGS_STORAGE_KEY]: newStructureToSave,
    });
    await chrome.storage.local.remove(OLD_APP_SETTINGS_KEY);
    console.log(
      "Migration complete. Old settings format removed. API keys re-encrypted.",
    );

    settings.apiKeys = apiKeysToEncrypt;
  }

  if (settings && typeof settings.apiKeys === "undefined") {
    settings.apiKeys = { openai: null, google: null };
  }
  if (settings) {
    settings.outputType = settings.outputType || "email";
    settings.numMessagesForSequence = settings.numMessagesForSequence || 2;
    settings.preferredTone = settings.preferredTone || "professional";
  }

  return settings;
}
