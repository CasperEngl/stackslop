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

const request = async (path, token, init = {}) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, { ...init, headers });
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
  branch: pr.head.ref,
  additions: pr.additions,
  deletions: pr.deletions,
  state: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open",
});

// Linear's bot comments on linked PRs with this marker, then its "Review in Linear" link.
const LINEAR_REVIEW_LINK = /<!-- linear-review-link -->[\s\S]*?href="(https:\/\/linear\.app\/[^"]+\/review\/[^"]+)"/;

/**
 * Maps each PR number to its review decision ("approved", "changes_requested", or null)
 * and its Linear review URL (or null). Only GraphQL has both in one query, and it needs a
 * token, so without one the map is empty.
 */
const fetchPrDetails = async ({ owner, repo }, numbers, token) => {
  if (!token) return new Map();
  const fields = numbers
    .map((n) => `pr${n}: pullRequest(number: ${n}) { reviewDecision comments(first: 30) { nodes { body } } }`)
    .join(" ");
  const { data, errors } = await request("/graphql", token, {
    method: "POST",
    body: JSON.stringify({
      query: `query($owner: String!, $repo: String!) { repository(owner: $owner, name: $repo) { ${fields} } }`,
      variables: { owner, repo },
    }),
  });
  if (errors) throw new GitHubError(200, errors[0].message);
  return new Map(
    numbers.map((n) => {
      const pr = data.repository[`pr${n}`];
      const linearUrl = pr?.comments.nodes.map((c) => LINEAR_REVIEW_LINK.exec(c.body)?.[1]).find(Boolean);
      return [n, { review: pr?.reviewDecision?.toLowerCase() ?? null, linearUrl: linearUrl ?? null }];
    }),
  );
};

// Details only add to a copy, so a failed lookup must not block it.
const withDetails = (pr, details) => ({
  ...pr,
  review: details.get(pr.number)?.review ?? null,
  linearUrl: details.get(pr.number)?.linearUrl ?? null,
});

export const fetchPr = async ({ owner, repo, number }, token) =>
  toPr(await request(`/repos/${owner}/${repo}/pulls/${number}`, token));

/**
 * Returns the GitHub stack containing the PR, as its trunk branch and its PRs top of the
 * stack first, or null when the PR isn't in a stack.
 */
export const fetchStack = async ({ owner, repo, number }, token) => {
  const stacks = await request(`/repos/${owner}/${repo}/stacks?pull_request=${number}`, token);
  const stack = stacks.find((s) => s.pull_requests.some((pr) => pr.number === number));
  if (!stack) return null;

  // The API lists PRs bottom first; Graphite pastes the top of the stack first.
  const numbers = stack.pull_requests.map((pr) => pr.number).reverse();
  const [prs, details] = await Promise.all([
    Promise.all(numbers.map((n) => fetchPr({ owner, repo, number: n }, token))),
    fetchPrDetails({ owner, repo }, numbers, token).catch(() => new Map()),
  ]);
  return { trunk: stack.base.ref, prs: prs.map((pr) => withDetails(pr, details)) };
};

/** Loads the PR and, when it sits in a stack of two or more PRs, that stack. */
export const fetchPrWithStack = async (ref, token) => {
  const [pr, details, stack] = await Promise.all([
    fetchPr(ref, token),
    fetchPrDetails(ref, [ref.number], token).catch(() => new Map()),
    // A missing stack must not block copying the PR itself.
    fetchStack(ref, token).catch(() => null),
  ]);
  return { pr: withDetails(pr, details), stack: stack !== null && stack.prs.length > 1 ? stack : null };
};
