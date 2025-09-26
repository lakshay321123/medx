import { toPng } from "html-to-image";
import { BRAND_NAME } from "@/lib/brand";

function buildWrapper(element: HTMLElement) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.width = "100%";
  wrapper.style.padding = "32px";
  wrapper.style.background = "linear-gradient(180deg, rgba(226,232,240,0.9), rgba(255,255,255,1))";
  wrapper.style.color = "#0f172a";
  wrapper.style.fontFamily = getComputedStyle(document.documentElement).fontFamily || "Inter, sans-serif";
  wrapper.style.zIndex = "-1";

  const container = document.createElement("div");
  container.style.margin = "0 auto";
  container.style.maxWidth = "720px";
  container.style.background = "rgba(255,255,255,0.94)";
  container.style.borderRadius = "20px";
  container.style.boxShadow = "0 24px 48px rgba(15,23,42,0.12)";
  container.style.padding = "24px";
  container.style.border = "1px solid rgba(148,163,184,0.2)";

  const cloned = element.cloneNode(true) as HTMLElement;
  cloned.style.margin = "0";
  cloned.style.padding = "0";
  cloned.style.background = "transparent";
  cloned.style.boxShadow = "none";
  cloned.style.maxWidth = "100%";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "space-between";
  footer.style.fontSize = "12px";
  footer.style.marginTop = "24px";
  footer.style.opacity = "0.7";

  const brand = document.createElement("span");
  brand.textContent = BRAND_NAME;
  brand.style.fontWeight = "600";
  brand.style.letterSpacing = "0.04em";
  brand.style.textTransform = "uppercase";

  const time = document.createElement("span");
  time.textContent = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  footer.appendChild(brand);
  footer.appendChild(time);

  container.appendChild(cloned);
  container.appendChild(footer);

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);
  return wrapper;
}

export async function exportMessageToPng(element: HTMLElement) {
  const wrapper = buildWrapper(element);
  try {
    const dataUrl = await toPng(wrapper, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio || 2,
      backgroundColor: "#f8fafc",
      quality: 0.95,
    });
    return dataUrl;
  } finally {
    document.body.removeChild(wrapper);
  }
}
