'use client';
import React from 'react';

type ChatErrorBoundaryProps = {
  children: React.ReactNode;
};

type ChatErrorBoundaryState = {
  hasError: boolean;
};

export default class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChatErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ChatErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-[720px] p-4 text-sm text-red-400">
          Something went wrong loading the chat UI. Please reload.
        </div>
      );
    }

    return this.props.children;
  }
}

