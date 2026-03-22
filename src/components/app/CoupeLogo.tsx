import { memo } from 'react';

interface CoupeLogoProps {
    className?: string;
}

export const CoupeLogo = memo(function CoupeLogo({ className = 'w-10 h-10' }: CoupeLogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 8c0 0 1 5 8 5s8-5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="13" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" />
            <line x1="8" y1="19" x2="16" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
});
