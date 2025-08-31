import fs from "fs";
import { Octokit } from "@octokit/rest";

// -----------------------
// Config
// -----------------------
const token =
  process.env.GITHUB_TOKEN;
const username = process.env.GITHUB_USER;
const octokit = new Octokit({ auth: token });

const PORTFOLIO_FILE = "portfolio.json";

// -----------------------
// Load existing portfolio
// -----------------------
let portfolio;
if (fs.existsSync(PORTFOLIO_FILE)) {
  portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf-8"));
} else {
  portfolio = {
    generated_at: "1970-01-01T00:00:00Z",
    user: username,
    prs: [],
  };
}

const lastGenerated = new Date(portfolio.generated_at);

// -----------------------
// Helpers
// -----------------------
async function fetchMergedPRs(user, since) {
  const query = `is:pr is:merged author:${user} created:>${since.toISOString()}`;
  const result = await octokit.rest.search.issuesAndPullRequests({
    q: query,
    per_page: 100,
  });
  return result.data.items;
}

async function fetchPRFiles(owner, repo, number) {
  const files = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: number,
  });
  return files.data.map((f) => ({ filename: f.filename, changes: f.changes }));
}

async function fetchPRComments(owner, repo, number) {
  // Issue comments
  const issueComments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: number,
    per_page: 100,
  });

  // Review comments
  const reviewComments = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });

  const comments = [
    ...issueComments.data.map((c) => ({
      id: c.id,
      user: c.user?.login,
      body: c.body || "",
      reactions: [],
    })),
    ...reviewComments.data.map((c) => ({
      id: c.id,
      user: c.user?.login,
      body: c.body || "",
      reactions: [],
    })),
  ];

  // Add reactions for each comment
  for (const comment of comments) {
    try {
      const reactions = await octokit.rest.reactions.listForIssueComment({
        owner,
        repo,
        comment_id: comment.id,
        per_page: 100,
      });
      comment.reactions = reactions.data.map((r) => ({
        user: r.user?.login,
        content: r.content, // 👍, ❤️, 🚀, etc.
      }));
    } catch (e) {
      // Some review comments don’t support reactions endpoint
    }
  }

  return comments;
}

async function fetchPRFeedback(owner, repo, number) {
  let feedback = [];

  // 1. PR body reactions
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: number,
  });
  const bodyReactions = await octokit.rest.reactions.listForIssue({
    owner,
    repo,
    issue_number: number,
    per_page: 50,
  });
  feedback.push({
    type: "pr_body",
    body: issue.data.body || "",
    reactions: bodyReactions.data.map((r) => r.content),
  });

  // 2. Issue comments (discussion)
  const issueComments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: number,
    per_page: 50,
  });
  for (const c of issueComments.data) {
    const reactions = await octokit.rest.reactions.listForIssueComment({
      owner,
      repo,
      comment_id: c.id,
    });
    feedback.push({
      type: "issue_comment",
      body: c.body,
      user: c.user.login,
      avatar_url: c.user.avatar_url,
      created_at: c.created_at,
      reactions: reactions.data.map((r) => r.content),
    });
  }

  // 3. Review comments (inline on code diff)
  const reviewComments = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: number,
    per_page: 50,
  });
  for (const c of reviewComments.data) {
    const reactions =
      await octokit.rest.reactions.listForPullRequestReviewComment({
        owner,
        repo,
        comment_id: c.id,
      });
    feedback.push({
      type: "review_comment",
      body: c.body,
      user: c.user.login,
      avatar_url: c.user.avatar_url,
      created_at: c.created_at,
      reactions: reactions.data.map((r) => r.content),
    });
  }

    // 4. Reviews for merged PR
  const reviews = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: number,
    per_page: 50,
  });
  for (const c of reviews.data) {

    feedback.push({
      type: "review",
      body: c.body,
      user: c.user.login,
      avatar_url: c.user.avatar_url,
      created_at: c.created_at,
      reactions: [],
    });
  }

  return feedback;
}

function classifyPR(pr, files, comments_length, feedback) {
  const tags = [];
  const createdAt = new Date(pr.created_at);
  const mergedAt = new Date(pr.closed_at);

  // 📝 Perfectionist: modified docs (.md)
  if (files.some((f) => f.filename.endsWith(".md"))) {
    tags.push("perfectionist");
  }

  // Dependency files list
  const depFiles = [
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "poetry.lock",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "Gemfile",
    "Gemfile.lock",
    "composer.json",
    "composer.lock",
    "Cargo.toml",
    "Cargo.lock",
    "go.mod",
    "go.sum",
    "stack.yaml",
    "cabal.project",
    "mix.exs",
    "mix.lock",
  ];

  // 🧠 Knowledge / Confidence
  if (comments_length < 3) tags.push("knows_his_stuff");
  if (
    files.some(
      (f) =>
        f.filename.endsWith(".rs") ||
        f.filename.endsWith(".hs") ||
        f.filename.endsWith(".zig") ||
        f.filename.endsWith(".cr") ||
        f.filename.endsWith(".nim") ||
        f.filename.endsWith(".d") ||
        f.filename.endsWith(".vala") ||
        f.filename.endsWith(".ml") ||
        f.filename.endsWith(".mli") ||
        f.filename.endsWith(".erl") ||
        f.filename.endsWith(".ex") ||
        f.filename.endsWith(".exs")
    )
  ) {
    tags.push("polyglot_coder");
  }
  if (
    files.length > 0 &&
    files.every((f) =>
      depFiles.some((dep) => f.filename.toLowerCase().endsWith(dep))
    )
  ) {
    tags.push("guardian_of_stability");
  }

  // 💬 Collaboration
  if (comments_length >= 10) tags.push("deep_discussion");

  if (
    feedback.some(
      (f) =>
        /(LGTM|nice work|great catch|thanks|thank you)/i.test(f.body) ||
        (f.reactions && f.reactions > 0)
    )
  ) {
    tags.push("community_favorite");
  }

  // 🚀 Delivery & Hustle
  if ((mergedAt - createdAt) / (1000 * 60 * 60) < 6)
    tags.push("fast_lane_shipper");
  const hour = createdAt.getUTCHours();
  if (
    createdAt.getUTCDay() === 0 ||
    createdAt.getUTCDay() === 6 ||
    hour < 6 ||
    hour > 22
  ) {
    tags.push("code_never_sleeps");
  }

  // 🔧 Problem Solving
  if (
    pr.title.toLowerCase().includes("fix") ||
    pr.title.toLowerCase().includes("bug")
  )
    tags.push("bug_whisperer");
  if (
    pr.title.toLowerCase().includes("perf") ||
    pr.title.toLowerCase().includes("optimiz")
  )
    tags.push("speed_magician");
  if (
    pr.title.toLowerCase().includes("cve") ||
    pr.title.toLowerCase().includes("vulnerab") ||
    pr.title.toLowerCase().includes("secur")
  )
    tags.push("guardian_of_the_gates");

  // 🎨 Creativity
  if (
    files.some(
      (f) =>
        f.filename.toLowerCase().endsWith(".css") ||
        f.filename.toLowerCase().includes("style")
    )
  )
    tags.push("design_conscious_coder");
  if (
    files.some(
      (f) =>
        f.filename.toLowerCase().includes("example") ||
        f.filename.toLowerCase().includes("tutorial")
    )
  )
    tags.push("educator_mode");
  if (pr.title.includes("😀") || pr.body?.includes("😀"))
    tags.push("code_with_personality");

  // 📊 Consistency & Legacy
  if (
    portfolio.prs.every((p) => p.repo[1] !== pr.repository_url.split("/").pop())
  )
    tags.push("trailblazer");
  if (Math.abs(new Date() - createdAt) < 1000 * 60 * 60 * 24 * 7)
    tags.push("still_in_the_game");

  // 🔍 Precision & Accuracy
  const totalChanges = files.reduce((acc, f) => acc + f.changes, 0);
  if (totalChanges < 10) tags.push("eyes_for_precision");
  if (
    pr.requested_reviewers?.length === 0 &&
    pr.review_comments === 0 &&
    pr.comments === 0
  )
    tags.push("first_time_right_engineer");

  return tags;
}

// -----------------------
// Main script
// -----------------------
(async () => {
  console.log(
    `Fetching merged PRs for ${username} since ${lastGenerated.toISOString()}`
  );
  const prs = await fetchMergedPRs(username, lastGenerated);

  for (const pr of prs) {
    const [_, owner, repo] =
      pr.repository_url.match(/repos\/([^/]+)\/([^/]+)/) || [];
    if (!owner || !repo) continue;

    const files = await fetchPRFiles(owner, repo, pr.number);
    const feedback = await fetchPRFeedback(owner, repo, pr.number);

    const tags = classifyPR(pr, files, pr.comments, feedback);

    portfolio.prs.push({
      id: pr.number,
      title: pr.title,
      url: pr.html_url,
      repo: [owner, repo],
      created_at: pr.created_at,
      closed_at: pr.closed_at,
      comments_length: pr.comments,
      feedback,
      tags,
    });
  }

  portfolio.generated_at = new Date().toISOString();
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));

  console.log(`✅ Added ${prs.length} new PRs`);
})();
