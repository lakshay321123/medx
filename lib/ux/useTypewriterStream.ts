"use client";
import * as React from "react";
import { thinking } from "./thinking";

export function useTypewriterStream() {
  const [text, setText] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);

  const stream = React.useCallback(async (url: string, body: any) => {
    setText(""); setIsStreaming(true);
    thinking.start("Analyzing…");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    thinking.headers(res);
    const reader = res.body?.getReader(); const dec = new TextDecoder();
    if (!reader) { setIsStreaming(false); thinking.stop(); return; }
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      setText(prev => prev + dec.decode(value));
    }
    setIsStreaming(false); thinking.stop();
  }, []);

  return { text, isStreaming, stream, setText };
}
