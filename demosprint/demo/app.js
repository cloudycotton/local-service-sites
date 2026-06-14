const form = document.querySelector("#proposal-form");
const slugOutput = document.querySelector("#browser-slug");

const toSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 38) || "client";

const updatePreview = () => {
  const values = Object.fromEntries(new FormData(form));

  Object.entries(values).forEach(([name, value]) => {
    document.querySelectorAll(`[data-output="${name}"]`).forEach((output) => {
      output.textContent = value.trim() || "—";
    });
  });

  slugOutput.textContent = toSlug(values.client);
};

form.addEventListener("input", updatePreview);
updatePreview();
