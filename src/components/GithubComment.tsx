import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

// format date like GitHub does: "Aug 6, 2024"
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const reactionMap: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  laugh: "😄",
  confused: "😕",
  heart: "❤️",
  hooray: "🎉",
  rocket: "🚀",
  eyes: "👀",
};

type GitHubCommentProps = {
  user: string;
  body: string;
  created_at?: string;
  reactions?: Array<keyof typeof reactionMap>;
  prUrl: string;
};

// function to parse mentions like @username
function renderWithMentions(text: string) {
  const mentionRegex = /(@[a-zA-Z0-9_-]+)/g;

  return text.split(mentionRegex).map((part, i) => {
    if (mentionRegex.test(part)) {
      return (
        <span
          key={i}
          className="bg-yellow-100 font-bold underline"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function GitHubComment({
  user,
  body,
  created_at,
  reactions = [],
  prUrl,
}: GitHubCommentProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Fetch avatar from GitHub API
  useEffect(() => {
    fetch(`https://api.github.com/users/${user}`)
      .then((res) => res.json())
      .then((data) => setAvatarUrl(data.avatar_url))
      .catch(() => setAvatarUrl("https://www.gravatar.com/avatar/?d=mp&s=40"));
  }, [user]);

  // Count reactions automatically
  const reactionCounts = useMemo(() => {
    return reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
  }, [reactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border rounded-md my-4 shadow-sm w-full bg-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-b rounded-t-md">
        <div className="flex items-center gap-2">
          <img src={avatarUrl} alt={user} className="w-6 h-6 rounded-full" />
          <span className="font-semibold -mr-1 text-xs">{user}</span>
          {created_at ? (
            <p className="text-xs">
              <span className="text-gray-500">commented on</span>
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-1 hover:underline"
              >
                {formatDate(created_at)}
              </a>
            </p>
          ) : (
            <p className="text-xs">
              <span className="text-gray-500">left a</span>
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-1 hover:underline"
              >
                comment
              </a>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 ">
          <span className=" px-1 py-0.3 text-[12px] text-gray-500 sm:inline hidden rounded-full border-1">
            Member
          </span>
          <button className="hover:bg-gray-200 text-xl font-extrabold rounded px-1">⋯</button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-xs whitespace-pre-wrap break-words">
        {renderWithMentions(body)}
      </div>

      {/* Reactions */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 text-xs sm:text-sm">
          {Object.entries(reactionCounts).map(([reaction, count], i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 250 }}
              className="border px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              {reactionMap[reaction] ?? reaction} {count}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default GitHubComment;
