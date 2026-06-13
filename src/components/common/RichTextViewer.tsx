import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface RichTextViewerProps {
  html: string | null | undefined;
  className?: string;
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h2",
  "h3",
  "h4",
  "a",
  "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

export function RichTextViewer({ html, className }: RichTextViewerProps) {
  const clean = useMemo(() => {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    });
  }, [html]);

  if (!clean) return null;

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words [&_a]:text-primary [&_a]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
