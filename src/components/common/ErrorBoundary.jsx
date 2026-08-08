import { Component } from 'react';
import { useTranslation } from 'react-i18next';

function ErrorFallback({ onReload }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="font-display text-xl font-semibold text-brand-700">{t('errorBoundary.title')}</p>
      <p className="max-w-xs text-sm text-gray-500">{t('errorBoundary.message')}</p>
      <button
        onClick={onReload}
        className="rounded-card bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-card active:scale-95"
      >
        {t('errorBoundary.reload')}
      </button>
    </div>
  );
}

/**
 * Without this, ANY uncaught error anywhere in the tree — including a lazy
 * page chunk that fails to load on an older/budget mobile browser — makes
 * React unmount everything with nothing rendered: a blank white screen with
 * no way to recover except manually clearing the browser's cache. This
 * catches that class of failure and shows a real screen with a reload
 * button instead, in whichever language the shop already has set.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Logged for debugging via remote logs / browser devtools — never shown
    // raw to the cashier, who just needs a way back in.
    console.error('App crashed:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onReload={this.handleReload} />;
  }
}
