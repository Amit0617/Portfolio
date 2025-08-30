import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import portfolio from "../portfolio.json";
import { Card } from "@/components/ui/card";

// --- Types ---
interface Feedback {
  user?: string;
  body: string;
  reactions: string[];
}

interface PullRequest {
  id: string | number;
  title: string;
  url: string;
  created_at: string;
  closed_at: string;
  tags: string[];
  feedback: Feedback[];
}

interface Portfolio {
  user?: string;
  prs: PullRequest[];
}

interface GitHubCommentProps {
  user: string;
  body: string;
  reactions: string[];
}

interface SectionViewProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  onBack: () => void;
}

// --- GitHub-style comment component ---
function GitHubComment({ user, body, reactions }: GitHubCommentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-gray-50 border rounded-lg p-3 my-3 shadow-sm w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0" />
        <span className="text-sm sm:text-base font-medium truncate max-w-[70%]">
          {user}
        </span>
      </div>

      {/* Body */}
      <p className="text-sm sm:text-base break-words whitespace-pre-wrap">
        {body}
      </p>

      {/* Reactions */}
      {reactions && reactions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 text-xs sm:text-sm">
          {reactions.map((emoji, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 250 }}
              className="bg-gray-200 px-2 py-0.5 rounded-full"
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- Section view ---
function SectionView({ title, icon, children, onBack }: SectionViewProps) {
  const [showSticky, setShowSticky] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {showSticky && (
        <div className="sticky top-0 left-0 w-screen flex items-center justify-center bg-white border-b px-4 py-2 z-50 shadow-sm">
          <button
            onClick={onBack}
            className="absolute left-4 flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            <span className="text-lg">←</span>
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-center truncate max-w-[70%]">
            {icon} {title}
          </h1>
        </div>
      )}

      <motion.div
        ref={titleRef}
        initial={{ y: "50vh", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="flex w-screen justify-center items-center h-[80vh] px-4"
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-snug">
          {icon} {title}
        </h1>
      </motion.div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto px-4 pb-20"
      >
        {children}
      </motion.div>
    </div>
  );
}

// --- Main Timeline ---
export default function Timeline() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const data: Portfolio = portfolio;
  const username = data.user || "This developer";

  // Prepare data
  const communityPRs = data.prs.filter((pr) =>
    pr.tags.includes("community_favorite")
  );
  const appreciationComments = communityPRs.flatMap((pr) =>
    pr.feedback.filter((f) => f.body && /(thank|nice|great|lgtm)/i.test(f.body))
  );

  const fastLanePRs = data.prs.filter((pr) =>
    pr.tags.includes("fast_lane_shipper")
  );

  if (!selectedSection) {
    const sections = [
      {
        key: "community",
        title: `${username} was appreciated ${appreciationComments.length} times 🎉`,
        icon: "👏",
      },
      {
        key: "fastlane",
        title: "Fast Lane Shipper 🏎️",
        icon: "🏁",
      },
    ];

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 sm:gap-8 p-4 sm:p-6">
        {sections.map((sec) => (
          <motion.div
            key={sec.key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedSection(sec.key)}
            className="w-full max-w-sm sm:max-w-md cursor-pointer"
          >
            <Card className="p-4 sm:p-6 shadow-md text-center text-lg sm:text-xl font-semibold">
              <div className="text-2xl sm:text-3xl mb-2">{sec.icon}</div>
              {sec.title}
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  if (selectedSection === "community") {
    return (
      <SectionView
        title={`${username} was appreciated ${appreciationComments.length} times 🎉`}
        icon="👏"
        onBack={() => setSelectedSection(null)}
      >
        {appreciationComments.map((f, idx) => (
          <GitHubComment
            key={idx}
            user={f.user || "unknown"}
            body={f.body}
            reactions={f.reactions}
          />
        ))}
      </SectionView>
    );
  }

  if (selectedSection === "fastlane") {
    return (
      <SectionView
        title="Fast Lane Shipper 🏎️"
        icon="🏁"
        onBack={() => setSelectedSection(null)}
      >
        {fastLanePRs.map((pr) => {
          const created = new Date(pr.created_at);
          const closed = new Date(pr.closed_at);
          const diffMs = closed.getTime() - created.getTime();
          const minutes = Math.round(diffMs / 60000);
          const hours = Math.floor(minutes / 60);
          const duration =
            hours > 0
              ? `${hours} hour${hours > 1 ? "s" : ""}`
              : `${minutes} minutes`;

          return (
            <Card
              key={pr.id}
              className="p-4 mb-4 shadow-sm border hover:shadow-md transition"
            >
              <p className="font-semibold break-words">{pr.title}</p>
              <p className="text-sm text-gray-600">Merged in {duration}</p>
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline break-all"
              >
                View PR →
              </a>
            </Card>
          );
        })}
      </SectionView>
    );
  }

  return null;
}
