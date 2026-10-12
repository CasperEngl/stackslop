# Stackslop

Copies GitHub pull request links the way Graphite does: `#4377 Title` as a link, followed
by the diff stat `+352/-54` as inline code. Slack and other rich editors get HTML;
plain-text targets get Markdown.

## Install

1. Open `chrome://extensions`, turn on Developer mode, and click **Load unpacked**.
2. Pick this folder.
3. In the extension's options, paste a GitHub token (`gh auth token | pbcopy` works).
   Public repos work without one.

## Use

On a pull request page, click **Copy link** or **Copy stack** in the header or next to
the merge button. Graphite's shortcuts work too, as <kbd>C</kbd> then:

| Key | Copies |
| --- | --- |
| <kbd>P</kbd> | the PR as a rich link with its diff stat |
| <kbd>S</kbd> | its stack |
| <kbd>L</kbd> | the plain PR URL, on GitHub or Linear Reviews per the options |
| <kbd>G</kbd> | the plain GitHub URL, whatever the options say |
| <kbd>T</kbd> | the title |
| <kbd>B</kbd> | the branch name |
| <kbd>C</kbd> | `gh stack checkout <PR URL>`, or `gh pr checkout <number>` outside a stack |

Or click the toolbar icon (or press <kbd>⌥⇧C</kbd>), then:

- <kbd>P</kbd> or <kbd>Enter</kbd> copies the PR.
- <kbd>S</kbd> copies its whole stack: top of the stack first, each PR with its state
  (● ready for review, ○ draft, ✓ merged, ✕ closed) and, with a token, whether it's
  approved or has changes requested. The trunk branch comes last. The
  stack comes from GitHub's stacked PRs, as created with `gh stack`.

## Linear Reviews

If your team reviews in Linear, set **Copied links open in** to **Linear Reviews** in the
options. Copy link, Copy stack, and <kbd>C</kbd> then <kbd>P</kbd>, <kbd>S</kbd>, or
<kbd>L</kbd> then link to each PR's Linear review, taken from the "Review in Linear"
comment Linear's bot leaves. A PR without that comment keeps its GitHub link. This needs a
GitHub token.
