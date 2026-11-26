import { GlassCard, GlassPanel } from "@lyceum/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import { useDocumentTitle } from "./use-document-title";
import { WorkerClient } from "./worker/client";

export function TodayScreen() {
  const { t } = useTranslation();
  useDocumentTitle(t("navigation.today"));
  const worker = useRef<WorkerClient | null>(null);
  const currentRequestId = useRef<string | null>(null);
  const [state, setState] = useState<
    "idle" | "pending" | "connected" | "cancelled" | "aborted" | "failed"
  >("idle");

  useEffect(() => {
    worker.current = createClient();
    return () => {
      worker.current?.close();
      worker.current = null;
      currentRequestId.current = null;
    };
  }, []);

  function createClient(): WorkerClient {
    return new WorkerClient(
      new Worker(new URL("./worker/engine.worker.ts", import.meta.url), { type: "module" }),
      {
        onCancellationAck: (id) => {
          if (id !== currentRequestId.current) return;
          setState((current) => (current === "aborted" ? "cancelled" : current));
        },
      },
    );
  }

  async function check(cancel: boolean) {
    let client = worker.current;
    if (!client) {
      try {
        client = createClient();
        worker.current = client;
      } catch {
        setState("failed");
        return;
      }
    }
    const controller = new AbortController();
    currentRequestId.current = null;
    setState("pending");
    const timer = cancel ? setTimeout(() => controller.abort(), 25) : undefined;
    try {
      const answer = await client.probe(cancel ? 250 : 0, controller.signal, (id) => {
        currentRequestId.current = id;
      });
      setState(
        answer.kind === "aborted"
          ? "aborted"
          : answer.kind === "cancelled"
            ? "cancelled"
            : "connected",
      );
    } catch {
      if (worker.current === client) {
        client.close();
        worker.current = null; // The next action creates a healthy worker.
      }
      setState("failed");
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  return (
    <div className="screen today-screen">
      <GlassPanel level="reading" className="hero" aria-labelledby="welcome-heading">
        <div className="hero-content">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            {t("app.eyebrow")}
          </p>
          <h1 id="welcome-heading" tabIndex={-1}>
            {t("app.title")}
          </h1>
          <p className="lede">{t("app.description")}</p>
          <Link className="primary-action" to="/settings">
            <span>{t("app.setupAction")}</span>
            <Icon name="arrow" />
          </Link>
          <p className="hero-disclaimer">
            <Icon name="shield" />
            {t("app.notConfigured")}
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="orbital orbital-three" />
          <div className="orbit-core">
            <Icon name="spark" />
          </div>
          <div className="orbit-glint" />
        </div>
      </GlassPanel>

      <div className="content-grid">
        <GlassPanel level="raised" className="setup-card" aria-labelledby="setup-title">
          <div className="card-topline">
            <span className="card-icon">
              <Icon name="spark" />
            </span>
            <span className="small-label">{t("setup.steps", { count: 2 })}</span>
          </div>
          <h2 id="setup-title">{t("setup.title")}</h2>
          <ol className="setup-list">
            <li>
              <span className="step-number">01</span>
              <span>{t("setup.first")}</span>
              <span className="step-status">{t("setup.pending")}</span>
            </li>
            <li>
              <span className="step-number">02</span>
              <span>{t("setup.second")}</span>
              <span className="step-status">{t("setup.future")}</span>
            </li>
          </ol>
          <p className="setup-footnote">{t("setup.empty")}</p>
        </GlassPanel>
        <div className="side-stack">
          <GlassCard level="raised" className="mini-card" aria-labelledby="library-heading">
            <div className="mini-icon">
              <Icon name="book" />
            </div>
            <div>
              <h2 id="library-heading">{t("panels.library")}</h2>
              <p>{t("panels.libraryBody")}</p>
            </div>
          </GlassCard>
          <GlassCard className="mini-card" aria-labelledby="session-heading">
            <div className="mini-icon">
              <Icon name="clock" />
            </div>
            <div>
              <h2 id="session-heading">{t("panels.session")}</h2>
              <p>{t("panels.sessionBody")}</p>
            </div>
          </GlassCard>
        </div>
      </div>
      <GlassPanel level="reading" className="worker-card" aria-labelledby="worker-heading">
        <div className="worker-copy">
          <h2 id="worker-heading">{t("panels.worker")}</h2>
          <p>{t("panels.workerBody")}</p>
        </div>
        <div className="worker-controls">
          <output className="worker-status" data-testid="worker-status">
            {t(`panels.${state}`)}
          </output>
          <button
            type="button"
            className="secondary-action"
            disabled={state === "pending"}
            onClick={() => void check(false)}
          >
            {t("panels.check")}
          </button>
          <button
            type="button"
            className="secondary-action"
            disabled={state === "pending"}
            onClick={() => void check(true)}
          >
            {t("panels.cancel")}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
