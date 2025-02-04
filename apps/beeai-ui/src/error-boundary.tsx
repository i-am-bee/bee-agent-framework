import React from "react";

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}> {
  state: { hasError: boolean };

  constructor(props: { children: React.ReactNode; hasError: boolean }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong</h1>;
    }

    return this.props.children;
  }
}
