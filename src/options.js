import { fetchLinearWorkspaces } from "./linear.js";

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

// Says what the tab will do, since the Linear check has no setting of its own to show it.
fetchLinearWorkspaces().then(
  (workspaces) => {
    document.getElementById("linear-status").textContent = workspaces.length
      ? `Signed in to: ${workspaces.join(", ")}.`
      : "You’re not signed in to Linear in this browser, so the tab stays hidden.";
  },
  () => {
    document.getElementById("linear-status").textContent =
      "Linear couldn’t be asked which workspaces you’re in, so the tab shows on every linked PR.";
  },
);
