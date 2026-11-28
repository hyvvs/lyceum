/**
 * QA-ONLY renderer entry, never imported by apps/web/src or ordinary Tauri.
 * The resulting artifacts are stored only under .git and excluded from source,
 * packaging and release distribution. The original native guards stay active.
 */
import { createRoot } from "react-dom/client";
import "../../../packages/ui/src/glass.css";
import { ReferencePrototype } from "../m0-005-reference-prototype.stories";

const root = document.documentElement;
root.dataset.theme = "dark";
root.dataset.backdrop = "atmospheric";
root.dataset.transparency = "full";
root.dataset.contrast = "standard";
root.dataset.motion = "full";
root.dataset.textScale = "100%";
root.style.fontSize = "100%";
root.style.margin = "0";
root.style.padding = "0";
document.body.style.margin = "0";
const mount = document.getElementById("root");
if (!mount) throw new Error("Isolated native visual fixture container missing");
createRoot(mount).render(<ReferencePrototype initialScene="today" initialMode="empty" />);
