import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Catches render-time crashes anywhere below it in the tree and shows a
// minimal recovery screen instead of a blank white page. Deliberately does
// NOT use SiteLayout, useLang, or <Link> here: if the crash came from
// inside one of those (Nav, LanguageProvider, etc.), reusing them in the
// fallback risks re-triggering the same error. Plain markup + a hard
// `<a href="/">` (full reload) is the safest possible recovery path.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ZÜMA — uncaught render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          background: "#f5f4f1",
          color: "#111",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            letterSpacing: "0.3em",
            marginBottom: "16px",
            textTransform: "uppercase",
          }}
        >
          Something broke
        </h1>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#666",
            marginBottom: "28px",
            maxWidth: "360px",
          }}
        >
          An unexpected error occurred. Reloading usually fixes it.
        </p>
        <a
          href="/"
          style={{
            padding: "10px 22px",
            border: "1px solid #111",
            fontSize: "11px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#111",
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </div>
    );
  }
}
