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

// Medium / Substack tarzı rahat okuma dili:
// - 16px mobil, 18px desktop gövde
// - geniş satır aralığı, ~65ch okuma genişliği
// - net başlık / liste / blockquote / link / kod stilleri
const READING_TYPOGRAPHY = [
  "prose prose-base sm:prose-lg dark:prose-invert",
  "max-w-prose break-words",
  // başlıklar
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
  "prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl sm:prose-h2:text-2xl",
  "prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-lg sm:prose-h3:text-xl",
  "prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-base sm:prose-h4:text-lg",
  // gövde
  "prose-p:leading-relaxed prose-p:my-4 prose-p:text-foreground/90",
  // listeler
  "prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-li:leading-relaxed marker:text-muted-foreground",
  // alıntı
  "prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  // bağlantı
  "prose-a:text-primary prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-80",
  // ayraç
  "prose-hr:my-8 prose-hr:border-border",
  // güçlü vurgu + kod
  "prose-strong:text-foreground prose-strong:font-semibold",
  "prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5",
  "prose-code:before:hidden prose-code:after:hidden",
  "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-md",
].join(" ");

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
      className={cn(READING_TYPOGRAPHY, className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
