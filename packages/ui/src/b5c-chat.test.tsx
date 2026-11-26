import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChatBubble } from "./chat-bubble";

describe("B5c semantic display-only conversational reading", () => {
  test("tutor explanation is a named native article on the reading surface", () => {
    const html = renderToStaticMarkup(
      <ChatBubble speaker="tutor" speakerLabel="Study guide">
        <p>An example explanation with a deliberately long second paragraph.</p>
        <p>It remains selectable reading text in a native article.</p>
      </ChatBubble>,
    );
    expect(html).toContain("<article");
    expect(html).toContain('class="glass-reading lyceum-chat-bubble lyceum-chat-bubble--tutor"');
    expect(html).toContain("Study guide");
    expect(html).toContain("<h3");
    expect(html).toContain("It remains selectable reading text");
    expect(html).toContain('aria-labelledby="');
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('role="log"');
  });

  test("learner is visibly distinguished with native semantics and explicit speaker identity", () => {
    const html = renderToStaticMarkup(
      <ChatBubble speaker="learner" speakerLabel="Learner" dir="rtl" lang="es">
        <p>Texto de prueba en varias líneas</p>
      </ChatBubble>,
    );
    expect(html).toContain("lyceum-chat-bubble--learner");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="es"');
    expect(html).toContain("Learner");
    expect(html).toContain("Texto de prueba");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('tabindex="');
  });

  test("React renders consumer-provided untrusted-looking plain text as text, never executable HTML", () => {
    const html = renderToStaticMarkup(
      <ChatBubble speaker="tutor" speakerLabel="Guide">
        {'<img src=x onerror="alert(1)">'}
      </ChatBubble>,
    );
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  test("empty content is truthful and does not invent a conversation", () => {
    const html = renderToStaticMarkup(
      <ChatBubble speaker="tutor" speakerLabel="Guide">
        {null}
      </ChatBubble>,
    );
    expect(html).toContain("No message content");
    expect(html).not.toContain("Hello");
    expect(html).not.toContain("mastery");
  });

  test("purely presentational tutor streaming state does not announce every token", () => {
    const html = renderToStaticMarkup(
      <ChatBubble speaker="tutor" speakerLabel="Guide" streaming>
        Current partial explanation.
      </ChatBubble>,
    );
    expect(html).toContain("Response in progress");
    expect(html).toContain("Current partial explanation");
    expect(html).toContain('data-streaming="true"');
    expect(html).not.toMatch(/aria-live|role="log"|role="status"/);
    expect(() =>
      renderToStaticMarkup(
        <ChatBubble speaker="learner" speakerLabel="Learner" streaming>
          Not owned here
        </ChatBubble>,
      ),
    ).toThrow(/tutor/i);
  });

  test("speaker names and static reader semantics fail closed", () => {
    expect(() =>
      renderToStaticMarkup(
        <ChatBubble speaker="tutor" speakerLabel=" ">
          Text
        </ChatBubble>,
      ),
    ).toThrow(/speaker/i);
    expect(() =>
      renderToStaticMarkup(
        <ChatBubble speaker={"system" as "tutor"} speakerLabel="System">
          Unapproved
        </ChatBubble>,
      ),
    ).toThrow(/speaker/i);
  });
});
