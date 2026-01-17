import React, { useState } from 'react';
import './ReloadingIcon.css';

/**
 * ReloadingIcon Component - 100% Working Reloading Icon
 * 
 * Usage Examples:
 * 
 * 1. Basic button with icon:
 *    <ReloadingIcon onClick={handleRefresh} />
 * 
 * 2. With loading state:
 *    <ReloadingIcon isLoading={isLoading} onClick={handleRefresh} />
 * 
 * 3. Inline (inside content):
 *    <ReloadingIcon variant="inline" size="small" />
 * 
 * 4. Large with custom color:
 *    <ReloadingIcon size="large" color="#FF5722" />
 */

const ReloadingIcon = ({
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'button', // 'button' or 'inline'
  size = 'medium', // 'small', 'medium', 'large'
  color = '#1976d2',
  tooltip = 'Reload',
  className = '',
  showText = false,
  text = 'Reloading...',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e) => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    
    // Call the onClick handler if provided
    if (onClick) {
      try {
        await onClick(e);
      } catch (error) {
        console.error('Reload action failed:', error);
      }
    }

    // Stop animation after 1 second (minimum)
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  const sizeClasses = {
    small: 'reload-icon-small',
    medium: 'reload-icon-medium',
    large: 'reload-icon-large',
  };

  const iconSize = {
    small: '16px',
    medium: '24px',
    large: '32px',
  };

  const isActive = isLoading || isAnimating;

  if (variant === 'inline') {
    return (
      <span className={`reload-icon-inline ${isActive ? 'rotating' : ''} ${sizeClasses[size]} ${className}`}>
        <svg
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2" />
        </svg>
      </span>
    );
  }

  return (
    <button
      className={`reload-icon-button ${sizeClasses[size]} ${isActive ? 'rotating' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled || isActive}
      title={tooltip}
      type="button"
      aria-label={tooltip}
      aria-busy={isActive}
    >
      <svg
        width={iconSize[size]}
        height={iconSize[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="reload-icon-svg"
      >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2" />
      </svg>
      {showText && <span className="reload-text">{isActive ? text : ''}</span>}
    </button>
  );
};

export default ReloadingIcon;
