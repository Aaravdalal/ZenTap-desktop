import { Component } from 'react';

/**
 * Keeps one broken piece of the screen from taking the app down with it.
 *
 * Suspense catches a slow child, not a failing one: when the 3D device model
 * could not be fetched, the error propagated all the way up and left a blank
 * window. Anything decorative belongs inside one of these.
 */
export default class SafeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(`[${this.props.label || 'SafeBoundary'}]`, error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
