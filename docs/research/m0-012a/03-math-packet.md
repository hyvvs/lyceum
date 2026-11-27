# Original synthetic calculus learning packet v0.1 — learner-facing tasks

**For a human-moderated formative prototype, not an exam or student record.** All examples and numbers below were freshly created for this packet, not transcribed from textbooks, course materials or exam banks. These tasks assess *elementary university-calculus reasoning about rates of change of polynomial products/compositions* only. Do not infer mastery of all calculus, durable retention or any other subject.

**Human moderator:** keep the [separate answer key](04-answer-key.md) private. Before teaching, give **only the assigned baseline form**, not the full packet/reference card; after baseline, show the rule card and relevant worked/guided sections only as the session advances. **Never show both baseline and exit forms to one participant early.** The prototype chat model sees only the current approved reference/worked/guided item, not assessment keys or held-out exit/transfer items. Counterbalanced [protocol](01-protocol.md): A receives **B1/B2 before**, **E1/E2 after**; B receives **E1/E2 before**, **B1/B2 after**. Complete all independent items **without hints or model messages**; participants can decline any item.

## §1 · Goals and prerequisites (0–4 minutes)

**Working goal:** Explain when the derivative of a *composition* must include the derivative of the inner function, when the derivative of a *product* requires two terms, and what a derivative at a point means. We are practicing one small topic today; an entire course is not promised.

**Assumed already familiar:** elementary arithmetic, exponent rules, the polynomial power rule `d(x^n)/dx = n x^(n-1)`, and evaluating a function at a point. It is fine to ask for a definition; this study is **not** an official graded test. The moderator may note prerequisites seem missing and end/re-scope rather than pretend to diagnose a disability or ability level.

**Learner prompt:** “What would make this short session useful for you? What feels less clear about derivatives?” You can skip this question.

## §2 · Independent baseline: disclose assigned arm only (4–10 minutes)

**Instructions:** On each question, find the derivative *and then evaluate it at the stated point*. Show one or two steps or explain aloud. You can say “skip.” After an answer, optionally report **confidence 1–5** (1 = guessing/not sure; 5 = very sure) **before** receiving any feedback. Neither the model nor the moderator will offer hints/confirm answers until the independent block is finished.

**Form A baseline (also Form B exit):**

- **B1 — composition:** `f(x) = (3x + 2)^2`. Find `f'(x)` and `f'(1)`.
- **B2 — product:** `g(x) = x(x + 2)^2`. Find `g'(x)` and `g'(1)`.

**Form B baseline (also Form A exit):**

- **E1 — composition:** `h(x) = (2x + 1)^2`. Find `h'(x)` and `h'(2)`.
- **E2 — product:** `k(x) = x(x + 3)^2`. Find `k'(x)` and `k'(1)`.

The pairs are **structurally matched but not empirically equated**; they have deliberately different expressions and answers. Study results are exploratory, not a causal pre/post efficacy estimate.

## §3 · After baseline: mini reference card [MATERIALS:packet-v0.1 §3]

**Derivative tells a local rate:** `f'(a)` is how quickly `f` changes near input `a`. It is **not** generally `f(a)`.

**Composite polynomial (chain rule):** for `f(x) = [u(x)]^n`, `f'(x) = n[u(x)]^(n-1) · u'(x)`. Think “outside derivative **times** inner derivative.” Forgetting `u'(x)` can change the answer.

**Product:** if `f(x)=u(x)v(x)`, then `f'(x)=u'(x)v(x)+u(x)v'(x)`. You **add** the two terms; multiplying derivatives `u'(x)v'(x)` is not the product rule.

**Acceptable alternative:** expanding a polynomial first and applying the power rule can be equally correct. A correctly explained alternative must not be marked wrong merely for using different notation.

**Source mode for prototype:** `materials_only`. This synthetic packet provides only polynomial power, chain and product derivatives. If you ask about a rule **not in these pages**, the tutor should state it is outside this packet and offer to add a source or *with your permission* change source mode. The model must not pretend external knowledge came from this handout. The whole packet is marked as **synthetic research material**, not a real course note.

## §4 · Warm-up retrieval and two worked examples (10–15 minutes)

**R1 — unaided warm-up:** What is `d(x^3)/dx`, evaluated at `x=2`? Explain which prerequisite rule you used. The moderator may then show the worked solutions below; this is a warm-up, not a held-out outcome score.

**W1 — worked composite example.** `w(x)=(2x+3)^2`:

`w'(x)=2(2x+3) · 2 = 4(2x+3)`. At `x=0`, `w'(0)=12`. **Why two 2s?** One comes from the outer square, the other from the inner `2x+3`.

**W2 — worked product example.** `w(x)=x(x+1)^2`:

`w'(x)=1·(x+1)^2 + x·[2(x+1)]`. At `x=2`, `w'(2)=9+12=21`. **Why both terms?** Both the factor `x` and the factor `(x+1)^2` change as `x` changes.

**Retrieval question:** Without copying either line, tell the moderator what changes if `x` appears **inside a power** versus in **two multiplied factors**. “Not sure” is a valid response.

## §5 · Guided and first-independent practice (15–27 minutes)

Moderator alternates the order of **G1/G2** across study arms A/B. On guided problems you may request a hint, a worked *parallel* example or a faster path. Say what you have tried first if you can; you may skip that explanation. The moderator records whether a hint was used. **No full solution is owed immediately merely because a model is present.**

- **G1 — guided chain:** `p(x)=(4x+1)^2`. Find `p'(x)` and `p'(1)`.
- **G2 — guided product:** `q(x)=x(x+4)^2`. Find `q'(x)` and `q'(1)`.
- **I1 — first try independently:** `r(x)=(2x-1)^3`. Find `r'(x)` and `r'(2)` **before** asking for a hint. If you then choose a hint, that attempt is **assisted** in the observation sheet; it is not a baseline/exit outcome.
- **I2 — optional extra practice if time/learner energy permit:** `s(x)=(x+1)(2x+1)^2`. Find `s'(x)` and `s'(1)`. Not reaching I2 is **not observed**, not a failure.

**C1 — moderator-administered optional fictional claim (not a test of your emotional state):** “A fictitious peer says the derivative of `x(x+5)^2` is just `2(x+5)`. Do you agree? Why?” The moderator supplies **only the quoted stimulus**, never the privately verified verdict or an expected response in the model-facing prompt. Do not pressure a participant to endorse the fictional statement.

**S1 — moderator-administered optional source-boundary question:** “According to *this packet*, can you teach the derivative of `sin(x)`?” The moderator supplies **only the quoted question**, never the expected source-policy response in the model-facing prompt. The participant may decline.

**If frustration appears:** you can pause, choose an easier explanation or stop. You do **not** need to explain why you need an accommodation or break. The moderator, not the model, controls whether the session continues.

**Fresh similar retry after authorized level 5:** **before** permitting a full active solution, the human moderator must have a **not-yet-shown, verified** synthetic F1 (chain) or F2 (product) from [04's moderator-only reserve](04-answer-key.md), or independently author/check a new similar problem under the approved human protocol. Reveal **only the question text**, then privately verify the next attempt. This is a guided/assisted follow-up, **not** held-out baseline, exit or transfer evidence. If no fresh verified retry exists, **do not authorize level 5**: stop that path and record the limitation rather than fabricate a retry.

## §6 · Independent exit and immediate near transfer (27–36 minutes)

**Moderator:** stop model interaction and close/hide prior guided solutions. Give **only the participant's allocated opposite paired exit form** from §2 and then T1/T2. No hints, answers or feedback during this block. Confidence **1–5** optional after each response, before any correction. You may skip.

**Form A exit:** **E1, E2** from §2. **Form B exit:** **B1, B2** from §2.

- **T1 — new context (rate rather than function value):** A square's side length is `s(t)=3t+1` **metres**, where `t` is measured in **seconds**. Its area is `A(t)=[s(t)]^2`. Find the **instantaneous rate of change of area** `A'(2)`, including units. Explain briefly why `A(2)` would answer a different question.
- **T2 — new inner expression:** `m(x)=(x^2+1)^2`. Find `m'(x)` and `m'(1)`. Explain which inner derivative you needed.

**Immediate transfer only:** these new problem structures do not demonstrate delayed memory, durable mastery, broad mathematical ability or an actual improved grade.

## §7 · Voluntary interview and debrief (36–43 minutes)

Answer any of the neutral [interview questions](07-interview-guide.md) or skip. Tell the human moderator what was unclear, whether you wanted more/less guidance, whether the model appeared to agree when it shouldn't, and whether you could tell what came from the packet. Your opinion will not be scored as correct/incorrect. The moderator repeats the approved privacy and withdrawal route.

**No model, provider, recording or human study session has been executed by the coding agent.**
