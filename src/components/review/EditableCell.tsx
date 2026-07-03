import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string | number;
  type?: 'text' | 'number';
  onChange: (value: string | number) => void;
  className?: string;
}

export default function EditableCell({ value, type = 'text', onChange, className = '' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onChange(type === 'number' ? Number(currentValue) : currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 bg-brand-surface border border-brand-primary rounded text-white focus:outline-none focus:ring-1 focus:ring-brand-primary ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`px-2 py-1 cursor-text hover:bg-white/5 rounded border border-transparent hover:border-brand-border min-h-[32px] flex items-center transition-colors ${className}`}
    >
      {value || (type === 'number' ? '0' : '—')}
    </div>
  );
}
