const form = document.getElementById("form");
const input = document.getElementById("token");
const saved = document.getElementById("saved");

const { token } = await chrome.storage.local.get("token");
input.value = token ?? "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (value) await chrome.storage.local.set({ token: value });
  else await chrome.storage.local.remove("token");
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
});
