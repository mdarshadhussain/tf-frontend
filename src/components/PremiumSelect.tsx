import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2, Search } from 'lucide-react';
import './PremiumSelect.css';

interface Option {
  label: string;
  value: string;
}

interface PremiumSelectProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PremiumSelect: React.FC<PremiumSelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  required, 
  disabled, 
  placeholder = 'Select option...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    option.value === ''
  );

  return (
    <div className={`premium-select-container ${disabled ? 'disabled' : ''} ${className}`} ref={containerRef}>
      {label && <label className="premium-select-label">{label}</label>}
      <div 
        className={`premium-select-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>{selectedOption && selectedOption.value !== '' ? selectedOption.label : placeholder}</span>
        {!disabled && <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />}
      </div>
      
      {isOpen && !disabled && (
        <div className="premium-select-menu">
          <div className="premium-select-search" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '13px' }}
            />
          </div>
          <div className="premium-select-options" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <div 
                key={option.value}
                className={`premium-select-item ${value === option.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {value === option.value && option.value !== '' && <CheckCircle2 size={14} className="check-icon" />}
              </div>
            )) : (
              <div style={{ padding: '12px 14px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>No options found</div>
            )}
          </div>
        </div>
      )}
      <input type="hidden" value={value} required={required} />
    </div>
  );
};

export default PremiumSelect;
