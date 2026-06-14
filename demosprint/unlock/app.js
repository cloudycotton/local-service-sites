const RELEASE_FILE = "./DemoSprint-Pro-v1.0.0.dsp.txt";
const DOWNLOAD_NAME = "DemoSprint-Pro-v1.0.0.zip";
const EXPECTED_SHA256 =
  "06eef34fc29d68b65c87056307153423d7796f21fa0c54de3b34e047f745efe3";
const PBKDF2_ITERATIONS = 310000;
const HEADER_LENGTH = 32;

const form = document.querySelector("#unlock-form");
const keyInput = document.querySelector("#delivery-key");
const status = document.querySelector("#status");
const button = form.querySelector("button");

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const setStatus = (message, state = "") => {
  status.textContent = message;
  if (state) {
    status.dataset.state = state;
  } else {
    delete status.dataset.state;
  }
};

const download = (bytes) => {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = DOWNLOAD_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const passphrase = keyInput.value;

  if (!passphrase) {
    setStatus("Enter the delivery key from your paid content.", "error");
    return;
  }

  button.disabled = true;
  setStatus("Downloading and decrypting the release in this browser...");

  try {
    const response = await fetch(RELEASE_FILE, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("The encrypted release could not be downloaded.");
    }

    const release = new Uint8Array(await response.arrayBuffer());
    const magic = new TextDecoder().decode(release.slice(0, 4));
    if (magic !== "DSP1" || release.length <= HEADER_LENGTH + 16) {
      throw new Error("The encrypted release is invalid.");
    }

    const salt = release.slice(4, 20);
    const iv = release.slice(20, 32);
    const encrypted = release.slice(HEADER_LENGTH);
    const encodedKey = new TextEncoder().encode(passphrase);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encodedKey,
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      key,
      encrypted,
    );
    const bytes = new Uint8Array(decrypted);

    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error("The decrypted release is not a ZIP archive.");
    }

    const checksum = toHex(await crypto.subtle.digest("SHA-256", decrypted));
    if (checksum !== EXPECTED_SHA256) {
      throw new Error("The decrypted release failed its integrity check.");
    }

    download(bytes);
    keyInput.value = "";
    setStatus(
      "Verified and downloaded DemoSprint-Pro-v1.0.0.zip.",
      "success",
    );
  } catch (error) {
    const message =
      error.name === "OperationError"
        ? "That delivery key did not unlock the release. Copy the complete key and try again."
        : error.message || "The release could not be unlocked.";
    setStatus(message, "error");
  } finally {
    button.disabled = false;
  }
});
