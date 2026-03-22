"use client";
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
              Something went wrong
            </p>
            <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-[var(--so-accent,#06B6D4)] px-4 py-1.5 text-xs font-medium text-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
