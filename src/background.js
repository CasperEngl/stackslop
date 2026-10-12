import { formatPrs, formatStack } from "./format.js";
import { GitHubError, fetchPrWithStack, parsePrUrl } from "./github.js";

// Fetches for the in-page buttons, so the token never reaches github.com's page context.
const loadLinks = async (url) => {
  const ref = parsePrUrl(url);
  if (!ref) return { ok: false, message: "Not a pull request" };

  const { token } = await chrome.storage.local.get("token");
  try {
    const { pr, stack } = await fetchPrWithStack(ref, token);
    return {
      ok: true,
      pr: formatPrs([pr]),
      stack: stack && { ...formatStack(stack), count: stack.prs.length },
      plain: {
        link: pr.url,
        title: pr.title,
        branch: pr.branch,
        // Stacked PRs check out with their whole stack. gh stack reads a bare number as a
        // stack number first, so pass the URL.
        checkout: stack ? `gh stack checkout ${pr.url}` : `gh pr checkout ${pr.number}`,
      },
    };
  } catch (error) {
    const needsToken = error instanceof GitHubError && [401, 403, 404].includes(error.status);
    return { ok: false, needsToken, message: error.message };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "load-links") {
    loadLinks(message.url).then(sendResponse);
    return true;
  }
  if (message.type === "open-options") chrome.runtime.openOptionsPage();
});
