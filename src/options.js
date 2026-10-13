const form = document.getElementById("form");
const tokenInput = document.getElementById("token");
const saved = document.getElementById("saved");

const {
  token,
  linkTarget = "github",
  linearTab = "show",
} = await chrome.storage.local.get(["token", "linkTarget", "linearTab"]);
tokenInput.value = token ?? "";
form.elements.linkTarget.value = linkTarget;
form.elements.linearTab.value = linearTab;

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
for (const name of ["linkTarget", "linearTab"]) {
  for (const radio of form.elements[name]) {
    radio.addEventListener("change", () => save({ [name]: radio.value }));
  }
}
