import { memo } from 'react';

export const MapBackground = memo(function MapBackground() {
    return (
        <>
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                <div className="border-r border-b border-primary/10 flex items-start justify-start p-2">
                    <span className="text-3xs text-primary/40 uppercase tracking-widest font-medium">The Vault</span>
                </div>
                <div className="border-b border-primary/10 flex items-start justify-end p-2">
                    <span className="text-3xs text-primary/40 uppercase tracking-widest font-medium">The Orchard</span>
                </div>
                <div className="border-r border-primary/10 flex items-end justify-start p-2">
                    <span className="text-3xs text-primary/40 uppercase tracking-widest font-medium">The Ember</span>
                </div>
                <div className="flex items-end justify-end p-2">
                    <span className="text-3xs text-primary/40 uppercase tracking-widest font-medium">The Salt Line</span>
                </div>
            </div>

            {/* Axis Labels */}
            <div className="absolute top-1/2 left-2 -translate-y-1/2 text-3xs font-bold text-primary/20 -rotate-90 pointer-events-none">RICH</div>
            <div className="absolute top-1/2 right-2 -translate-y-1/2 text-3xs font-bold text-primary/20 rotate-90 pointer-events-none">CRISP</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-3xs font-bold text-primary/20 pointer-events-none">SAVORY</div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-3xs font-bold text-primary/20 pointer-events-none">SWEET</div>
        </>
    );
});
