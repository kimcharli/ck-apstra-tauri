import React from 'react';
import { open } from '@tauri-apps/api/shell';
import './ApstraButton.css';

interface ApstraButtonProps {
  /** The display text for the button */
  label: string;
  /** The URL to open in the browser */
  url: string;
  /** The type of button for styling */
  type: 'blueprint' | 'system' | 'pod' | 'rack' | 'interface';
  /** Optional tooltip text */
  title?: string;
  /** Additional CSS class names */
  className?: string;
  /** Optional click handler for additional logic */
  onClick?: () => void;
}

const ApstraButton: React.FC<ApstraButtonProps> = ({
  label,
  url,
  type,
  title,
  className = '',
  onClick
}) => {
  const handleClick = async () => {
    if (onClick) {
      onClick();
    }
    if (url) {
      await open(url);
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'blueprint':
        return 'apstra-btn apstra-btn-blueprint';
      case 'system':
        return 'apstra-btn apstra-btn-system';
      case 'pod':
        return 'apstra-btn apstra-btn-pod';
      case 'rack':
        return 'apstra-btn apstra-btn-rack';
      case 'interface':
        return 'apstra-btn apstra-btn-interface';
      default:
        return 'apstra-btn';
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'blueprint':
        return `Open blueprint ${label} in Apstra`;
      case 'system':
        return `Open system ${label} in Apstra`;
      case 'pod':
        return `Open pod ${label} in Apstra`;
      case 'rack':
        return `Open rack ${label} in Apstra`;
      case 'interface':
        return `Open interface ${label} in Apstra`;
      default:
        return `Open ${label} in Apstra`;
    }
  };

  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  return (
    <button
      className={`${getButtonClass()} ${className}`}
      onClick={handleClick}
      title={getDefaultTitle()}
    >
      {label}
    </button>
  );
};

export default ApstraButton;