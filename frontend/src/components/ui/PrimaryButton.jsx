import Spinner from './Spinner';

const WIDTH_CLASSES = {
  auto: 'w-full md:w-auto',
  full: 'w-full',
  hug: '',
};

export default function PrimaryButton({
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  loadingText,
  icon = null,
  width = 'auto',
  className = '',
  children,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-primary ${WIDTH_CLASSES[width] ?? WIDTH_CLASSES.auto} ${className}`}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingText || children}
        </>
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
  );
}
