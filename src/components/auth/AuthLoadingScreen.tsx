interface AuthLoadingScreenProps {
  message?: string;
  submessage?: string;
  compact?: boolean;
  workspace?: boolean;
}

export default function AuthLoadingScreen({
  message = 'Loading…',
  submessage,
  compact = false,
  workspace = false,
}: AuthLoadingScreenProps) {
  if (workspace) {
    return (
      <div className="ws-boot">
        <div className="ws-boot-logo">
          <span className="ws-boot-logo-mark" aria-hidden>∿</span>
          Curvify
        </div>
        <div className="ws-boot-bar" aria-hidden />
        <p className="ws-boot-message">
          {message}
          {submessage && (
            <>
              <br />
              <small>{submessage}</small>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'auth-flow-loading' : 'auth-loading'}>
      <div className="auth-loading-inner">
        <div className="auth-spinner" aria-hidden />
        <div className="auth-loading-text">
          <span>{message}</span>
          {submessage && <small>{submessage}</small>}
        </div>
      </div>
    </div>
  );
}
