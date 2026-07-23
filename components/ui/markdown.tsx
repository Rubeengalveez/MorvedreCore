"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  if (!children || !children.trim()) return null;
  return (
    <div
      className={
        "prose prose-sm text-pool-deep [&_a]:text-pool-blue [&_strong]:text-pool-deep [&_code]:bg-ink-200 [&_pre]:bg-ink-300/30 [&_blockquote]:border-ink-300 [&_blockquote]:text-ink-700 [&_hr]:border-ink-300 max-w-none [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_em]:italic [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h2]:mt-2 [&_h2]:mb-1.5 [&_h2]:text-xl [&_h2]:font-extrabold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-extrabold [&_hr]:my-3 [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:text-xs [&_strong]:font-extrabold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 " +
        (className ?? "")
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : ""}
              alt={alt ?? ""}
              className="my-2 max-w-full rounded-md"
              loading="lazy"
            />
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
