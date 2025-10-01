"use client";

import clsx from "clsx";
import {
  forwardRef,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
  FormHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";
import { useT } from "@/components/hooks/useI18n";

export interface ChatComposerProps extends FormHTMLAttributes<HTMLFormElement> {
  inputProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
  inputRef?: Ref<HTMLTextAreaElement>;
  children?: ReactNode;
  onAttach?: (files: File[]) => void;
}

const ChatComposer = forwardRef<HTMLFormElement, ChatComposerProps>(function ChatComposer(
  { inputProps, inputRef, children, onAttach, ...formProps },
  ref,
) {
  const t = useT();
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mergeFormRef = (node: HTMLFormElement | null) => {
    formRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as MutableRefObject<HTMLFormElement | null>).current = node;
    }
  };

  const mergeTextareaRef = (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof inputRef === "function") {
      inputRef(node);
    } else if (inputRef) {
      (inputRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;
    }
  };

  const {
    className: formClassName,
    ["aria-label"]: ariaLabelProp,
    ...restFormProps
  } = formProps;

  const {
    className: inputClassName,
    onKeyDown: inputOnKeyDown,
    onChange: inputOnChange,
    onInput: inputOnInput,
    placeholder: inputPlaceholder,
    disabled: inputDisabled,
    ["aria-label"]: inputAriaLabel,
    ...restInputProps
  } = inputProps ?? {};

  const normalizeValue = (value: unknown) => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.join(" ");
    return null;
  };

  const controlledValue = restInputProps.value;
  const defaultValue = restInputProps.defaultValue;
  const normalizedControlledValue = normalizeValue(controlledValue);
  const normalizedDefaultValue = normalizeValue(defaultValue);

  const getCurrentValue = () =>
    normalizedControlledValue ??
    normalizedDefaultValue ??
    textareaRef.current?.value ??
    "";

  const [isValueEmpty, setIsValueEmpty] = useState(() => {
    const current = getCurrentValue();
    return current.trim().length === 0;
  });

  const resizeTextarea = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    const next = Math.min(160, Math.max(24, node.scrollHeight));
    node.style.height = `${next}px`;
  };

  useEffect(() => {
    resizeTextarea();
    setIsValueEmpty(getCurrentValue().trim().length === 0);
  }, [normalizedControlledValue, normalizedDefaultValue]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isInputFocused =
        !!active &&
        (active.tagName === "TEXTAREA" ||
          active.tagName === "INPUT" ||
          active.isContentEditable);
      if (isInputFocused) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length === 1) {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submitForm = () => {
    const node = formRef.current;
    if (!node) return;
    if (typeof node.requestSubmit === "function") {
      node.requestSubmit();
      return;
    }
    node.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };

  const handleSurfaceClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if (event.target instanceof HTMLTextAreaElement) return;
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitForm();
    }
    inputOnKeyDown?.(event);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setIsValueEmpty(event.currentTarget.value.trim().length === 0);
    inputOnChange?.(event);
  };

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    resizeTextarea();
    setIsValueEmpty(event.currentTarget.value.trim().length === 0);
    inputOnInput?.(event);
  };

  const triggerFilePicker = () => {
    if (!onAttach || inputDisabled) return;
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !onAttach) return;
    onAttach(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (!onAttach) return;
    if (event.dataTransfer?.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!onAttach) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!onAttach) return;
    event.preventDefault();
    setDragOver(false);
  };

  const attachTooltip = t("ui.composer.upload_aria");
  const sendTooltip = t("ui.composer.send_aria");
  const placeholder = inputPlaceholder ?? t("ui.composer.placeholder");
  const textareaAriaLabel = inputAriaLabel ?? placeholder;
  const isDisabled = Boolean(inputDisabled);
  const sendDisabled = isDisabled || isValueEmpty;
  const hint = t("ui.composer.newline_hint");
  const showHint = hint && hint !== "ui.composer.newline_hint";

  return (
    <form
      ref={mergeFormRef}
      className={clsx("composer-root", formClassName)}
      aria-label={ariaLabelProp ?? placeholder}
      {...restFormProps}
    >
      <div className="composer-wrap">
        <div
          className={clsx("composer-surface", dragOver && "composer-surface--drag")}
          onClick={handleSurfaceClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            className="composer-icon-btn"
            aria-label={attachTooltip}
            title={attachTooltip}
            onClick={(event) => {
              event.stopPropagation();
              triggerFilePicker();
            }}
            disabled={isDisabled || !onAttach}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M16.5 6.5l-7.78 7.78a3 3 0 104.24 4.24l7.07-7.07a5 5 0 10-7.07-7.07L5.86 11.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              tabIndex={-1}
              className="composer-file-input"
              onChange={handleFileChange}
            />
          </button>

          <textarea
            {...restInputProps}
            ref={mergeTextareaRef}
            className={clsx("composer-textarea", inputClassName)}
            placeholder={placeholder}
            aria-label={textareaAriaLabel}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onInput={handleInput}
            disabled={isDisabled}
            rows={(restInputProps.rows as number | undefined) ?? 1}
            dir={restInputProps.dir ?? "auto"}
          />

          <button
            type="submit"
            className="composer-send-btn"
            aria-label={sendTooltip}
            title={sendTooltip}
            disabled={sendDisabled}
            onClick={(event) => event.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M7 11l5-5 5 5M12 6v12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="composer-hint" aria-hidden="true">
          {showHint ? hint : null}
        </div>
        {children}
      </div>
    </form>
  );
});

export default ChatComposer;
