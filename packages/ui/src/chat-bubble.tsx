import { type ReactNode, forwardRef, useId } from "react";

/** Pure reading presentation. Transcripts, generators, scrolling and announcements belong to consumers. */
export interface ChatBubbleProps {
  speaker: "tutor" | "learner";
  /** Visible speaker identity, independent of color or alignment. */
  speakerLabel: string;
  children?: ReactNode;
  /** Tutor-only presentational progress cue; never a live transcript or announcement owner. */
  streaming?: boolean;
  streamingLabel?: string;
  emptyLabel?: string;
  id?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  className?: string;
}

export const ChatBubble = forwardRef<HTMLElement, ChatBubbleProps>(function ChatBubble(
  {
    speaker,
    speakerLabel,
    children,
    streaming = false,
    streamingLabel = "Response in progress",
    emptyLabel = "No message content",
    id,
    lang,
    dir,
    className,
  },
  ref,
) {
  if (speaker !== "tutor" && speaker !== "learner") {
    throw new Error("ChatBubble supports only a tutor or learner speaker.");
  }
  if (!speakerLabel.trim() || !emptyLabel.trim() || !streamingLabel.trim()) {
    throw new Error("ChatBubble requires meaningful speaker and presentation labels.");
  }
  if (streaming && speaker !== "tutor") {
    throw new Error("ChatBubble streaming presentation is tutor-only.");
  }
  const headingId = useId();
  const hasContent = children !== null && children !== undefined && children !== "";
  return (
    <article
      ref={ref}
      id={id}
      lang={lang}
      dir={dir}
      aria-labelledby={headingId}
      data-speaker={speaker}
      data-streaming={streaming || undefined}
      className={[
        speaker === "tutor" ? "glass-reading" : "glass-raised",
        "lyceum-chat-bubble",
        `lyceum-chat-bubble--${speaker}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="lyceum-chat-bubble__speaker" id={headingId}>
        {speakerLabel}
      </h3>
      <div className="lyceum-chat-bubble__content">
        {hasContent ? children : <p className="lyceum-chat-bubble__empty">{emptyLabel}</p>}
      </div>
      {streaming && <p className="lyceum-chat-bubble__streaming">{streamingLabel}</p>}
    </article>
  );
});
