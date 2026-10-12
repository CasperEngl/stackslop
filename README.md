# PR Link Copier

Copies GitHub pull request links the way Graphite does: `#4377 Title` as a link, followed
by the diff stat `+352/-54` as inline code. Slack and other rich editors get HTML;
plain-text targets get Markdown.

## Install

1. Open `chrome://extensions`, turn on Developer mode, and click **Load unpacked**.
2. Pick this folder.
3. In the extension's options, paste a GitHub token (`gh auth token | pbcopy` works).
   Public repos work without one.

## Use

On a pull request page, click **Copy link** or **Copy stack** next to the title or the
merge button.
Or click the toolbar icon (or press <kbd>⌥⇧C</kbd>), then:

- <kbd>Enter</kbd> copies the PR.
- <kbd>S</kbd> copies its whole stack: top of the stack first, each PR with its state
  (● ready for review, ○ draft, ✓ merged, ✕ closed) and, with a token, whether it's
  approved or has changes requested. The trunk branch comes last. The
  stack comes from GitHub's stacked PRs, as created with `gh stack`.
