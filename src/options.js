const form = document.getElementById("form");
const input = document.getElementById("token");
const saved = document.getElementById("saved");

const { token, linkTarget = "github" } = await chrome.storage.local.get(["token", "linkTarget"]);
input.value = token ?? "";
form.elements.linkTarget.value = linkTarget;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (value) await chrome.storage.local.set({ token: value });
  else await chrome.storage.local.remove("token");
  await chrome.storage.local.set({ linkTarget: form.elements.linkTarget.value });
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
});
