import { useState } from "react";
import { Icon } from "./icons";

type Period = "Week" | "Month" | "Term";

const demoMetrics = [
  {
    icon: "↻",
    label: "Due reviews",
    value: "12",
    detail: "4 high priority",
    points: "0,23 14,20 28,21 42,15 56,17 70,12 84,10 98,8",
  },
  {
    icon: "◎",
    label: "Overall mastery",
    value: "62%",
    detail: "± 8% estimate",
    points: "0,25 14,22 28,20 42,24 56,15 70,13 84,12 98,7",
  },
  {
    icon: "◷",
    label: "Days to exam",
    value: "21",
    detail: "Next mock: 9 days",
    points: "0,10 14,12 28,13 42,15 56,16 70,20 84,22 98,25",
  },
  {
    icon: "✧",
    label: "Study streak",
    value: "8 days",
    detail: "1 grace day available",
    points: "0,25 14,25 28,18 42,18 56,14 70,14 84,8 98,7",
  },
] as const;

const topicSets: Record<Period, { name: string; value: number }[]> = {
  Week: [
    { name: "Algebra", value: 47 },
    { name: "Geometry", value: 68 },
    { name: "Functions", value: 58 },
    { name: "Calculus", value: 86 },
    { name: "Statistics", value: 73 },
    { name: "Proof", value: 41 },
  ],
  Month: [
    { name: "Algebra", value: 58 },
    { name: "Geometry", value: 64 },
    { name: "Functions", value: 70 },
    { name: "Calculus", value: 92 },
    { name: "Statistics", value: 77 },
    { name: "Proof", value: 52 },
  ],
  Term: [
    { name: "Algebra", value: 64 },
    { name: "Geometry", value: 73 },
    { name: "Functions", value: 76 },
    { name: "Calculus", value: 98 },
    { name: "Statistics", value: 83 },
    { name: "Proof", value: 58 },
  ],
};

const demoPlan = [
  { time: "09:00", title: "Review integration rules", kind: "Review", step: 0 },
  { time: "10:30", title: "Substitution practice", kind: "Practice", step: 1 },
  { time: "14:00", title: "Repair sign errors", kind: "Repair", step: 1 },
  { time: "16:00", title: "Recall notes", kind: "Read", step: 2 },
] as const;

export function FidelityToday({
  synthetic,
  goalDraft,
  onGoalChange,
  onSetup,
}: {
  synthetic: boolean;
  goalDraft: string;
  onGoalChange: (text: string) => void;
  onSetup: () => void;
}) {
  const [period, setPeriod] = useState<Period>("Week");
  const [selectedTask, setSelectedTask] = useState(0);
  const topics = topicSets[period];

  return (
    <div className="rp-fidelity-dashboard">
      <div className="rp-fidelity-intro">
        <div>
          <h2 dir="ltr">{synthetic ? "Good evening, Alex" : "Good evening"}</h2>
          <p>
            {synthetic
              ? "12 reviews scheduled · Calculus needs attention"
              : "No goal yet. Create one to get a plan."}
          </p>
        </div>
        <fieldset className="rp-fidelity-periods">
          <legend className="rp-visually-hidden">Chart period</legend>
          {(["Week", "Month", "Term"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={period === value}
              className={period === value ? "is-selected" : ""}
              onClick={() => setPeriod(value)}
            >
              {value}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="rp-fidelity-stats" aria-label="Learning overview">
        {demoMetrics.map((metric) => (
          <section className="rp-fidelity-glass rp-fidelity-stat" key={metric.label}>
            <div className="rp-fidelity-stat-top">
              <span className="rp-fidelity-icon" aria-hidden="true">
                {metric.icon}
              </span>
              <span className="rp-fidelity-stat-context">{synthetic ? period : "No data"}</span>
            </div>
            <div className="rp-fidelity-stat-title">{metric.label}</div>
            <strong className="rp-fidelity-stat-value">{synthetic ? metric.value : "—"}</strong>
            <div className="rp-fidelity-stat-bottom">
              <span>{synthetic ? metric.detail : "Not started"}</span>
              {synthetic && (
                <svg viewBox="0 0 98 32" aria-hidden="true" className="rp-fidelity-spark">
                  <polyline points={metric.points} />
                </svg>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="rp-fidelity-lower">
        <section
          className="rp-fidelity-glass rp-fidelity-chart"
          aria-labelledby="rp-mastery-heading"
        >
          <div className="rp-fidelity-panel-head">
            <div>
              <h3 id="rp-mastery-heading">Mastery by topic</h3>
              <p>{synthetic ? `${period} overview · learning areas` : "No learning data yet"}</p>
            </div>
            <span className="rp-fidelity-panel-metadata">
              {synthetic ? "6 topics" : "0 topics"}
            </span>
          </div>
          {synthetic ? (
            <div className="rp-fidelity-bars" aria-label="Demonstration mastery chart">
              {topics.map((topic) => (
                <div className="rp-fidelity-bar-column" key={topic.name}>
                  <div className="rp-fidelity-bar-track">
                    <div
                      className={
                        topic.name === "Calculus" ? "rp-fidelity-bar is-focus" : "rp-fidelity-bar"
                      }
                      style={{ height: `${topic.value}%` }}
                      aria-label={`${topic.name}: ${topic.value}% illustrative mastery`}
                      role="img"
                    />
                  </div>
                  <span>{topic.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rp-fidelity-chart-empty">
              <p>No mastery measurements have been recorded.</p>
              <button type="button" onClick={onSetup}>
                Create learning goal <Icon name="arrow" />
              </button>
              <label htmlFor="rp-goal">Your learning goal</label>
              <input
                id="rp-goal"
                type="text"
                maxLength={160}
                value={goalDraft}
                placeholder="What do you want to understand?"
                dir="auto"
                autoComplete="off"
                onChange={(event) => onGoalChange(event.target.value)}
              />
              <small>Unsaved draft · cleared by reset or reload</small>
            </div>
          )}
        </section>

        <section
          className="rp-fidelity-glass rp-fidelity-plan"
          aria-labelledby="rp-today-plan-heading"
        >
          <div className="rp-fidelity-panel-head">
            <div>
              <h3 id="rp-today-plan-heading" tabIndex={-1}>
                Today's plan
              </h3>
              <p>{synthetic ? "4 activities · 1 hr 40 min" : "No plan created"}</p>
            </div>
            <span className="rp-fidelity-panel-metadata">{synthetic ? "Today" : "Empty"}</span>
          </div>
          {synthetic ? (
            <div className="rp-fidelity-tasks">
              {demoPlan.map((task, index) => (
                <button
                  key={task.time}
                  type="button"
                  aria-pressed={selectedTask === index}
                  className={
                    selectedTask === index ? "rp-fidelity-task is-selected" : "rp-fidelity-task"
                  }
                  onClick={() => setSelectedTask(index)}
                >
                  <span className="rp-fidelity-task-marker" aria-hidden="true" />
                  <span className="rp-fidelity-task-copy">
                    <strong>{task.title}</strong>
                    <small>
                      {task.time} · {task.kind}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rp-fidelity-plan-empty">
              <p>No planned activities. Set a learning goal first.</p>
              <button type="button" onClick={onSetup}>
                Explore setup <Icon name="arrow" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
