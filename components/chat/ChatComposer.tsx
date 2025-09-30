"use client";

import { forwardRef } from "react";
import type { FormHTMLAttributes, InputHTMLAttributes, ReactNode, Ref } from "react";
import { useT } from "@/components/hooks/useI18n";

export interface ChatComposerProps extends FormHTMLAttributes<HTMLFormElement> {
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  children?: ReactNode;
}

const ChatComposer = forwardRef<HTMLFormElement, ChatComposerProps>(function ChatComposer(
  { inputProps, inputRef, children, ...formProps },
  ref,
) {
  const t = useT();
  const composerPlaceholder = t("ui.composer.placeholder");

  return (
    <form ref={ref} {...formProps}>
      <input
        {...inputProps}
        ref={inputRef}
        key={t.lang}
        placeholder={composerPlaceholder}
        aria-label={composerPlaceholder}
      />
      {children}
    </form>
  );
});

export default ChatComposer;
