const form = document.getElementById("form");
const tokenInput = document.getElementById("token");
const saved = document.getElementById("saved");

const { token, linkTarget = "github" } = await chrome.storage.local.get(["token", "linkTarget"]);
tokenInput.value = token ?? "";
form.elements.linkTarget.value = linkTarget;

let savedTimer;

// Settings save as they change, so there's no Save button to forget.
const save = async (changes) => {
  if (changes.token === "") {
    await chrome.storage.local.remove("token");
    delete changes.token;
  }
  await chrome.storage.local.set(changes);
  saved.textContent = "Saved";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (saved.textContent = ""), 1500);
};

tokenInput.addEventListener("change", () => save({ token: tokenInput.value.trim() }));
form.addEventListener("submit", (event) => event.preventDefault());
for (const radio of form.elements.linkTarget) {
  radio.addEventListener("change", () => save({ linkTarget: radio.value }));
}
