const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Parses `https://github.com/{owner}/{repo}/pull/{number}` (with any trailing path). */
export const parsePrUrl = (url) => {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(url ?? "");
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
};

const request = async (path, token) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new GitHubError(response.status, body.message ?? response.statusText);
  }
  return response.json();
};

const toPr = (pr) => ({
  number: pr.number,
  title: pr.title,
  url: pr.html_url,
  additions: pr.additions,
  deletions: pr.deletions,
  state: pr.merged_at ? "merged" : pr.state,
});

export const fetchPr = async ({ owner, repo, number }, token) =>
  toPr(await request(`/repos/${owner}/${repo}/pulls/${number}`, token));

/**
 * Returns the open PRs of the GitHub stack containing the PR, top of the stack first,
 * or null when the PR isn't in a stack.
 */
export const fetchStack = async ({ owner, repo, number }, token) => {
  const stacks = await request(`/repos/${owner}/${repo}/stacks?pull_request=${number}`, token);
  const stack = stacks.find((s) => s.pull_requests.some((pr) => pr.number === number));
  if (!stack) return null;

  // The API lists PRs bottom first; Graphite pastes the top of the stack first.
  const open = stack.pull_requests.filter((pr) => pr.state === "open").reverse();
  return Promise.all(open.map((pr) => fetchPr({ owner, repo, number: pr.number }, token)));
};

/** Loads the PR and, when it sits in a stack of two or more open PRs, that stack. */
export const fetchPrWithStack = async (ref, token) => {
  const [pr, stack] = await Promise.all([
    fetchPr(ref, token),
    // A missing stack must not block copying the PR itself.
    fetchStack(ref, token).catch(() => null),
  ]);
  return { pr, stack: stack !== null && stack.length > 1 ? stack : null };
};
