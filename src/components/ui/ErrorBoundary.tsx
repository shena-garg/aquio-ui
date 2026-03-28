"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex items-center justify-center p-6">
        <div className="rounded-lg bg-gray-100 px-6 py-5 text-center">
          <p className="text-[13px] font-medium text-gray-700">
            Something went wrong
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 rounded-md bg-teal-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
