import { memo } from 'react';

export const MapBackground = memo(function MapBackground() {
    return (
        <>
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                <div className="border-r border-b border-primary/10 flex items-start justify-start p-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Lush & Lively</span>
                </div>
                <div className="border-b border-primary/10 flex items-start justify-end p-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Crisp & Clean</span>
                </div>
                <div className="border-r border-primary/10 flex items-end justify-start p-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Decadent & Deep</span>
                </div>
                <div className="flex items-end justify-end p-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Bold & Complex</span>
                </div>
            </div>

            {/* Axis Labels */}
            <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-bold text-primary/30 -rotate-90 pointer-events-none">RICH</div>
            <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-bold text-primary/30 rotate-90 pointer-events-none">CRISP</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary/30 pointer-events-none">COMPLEX / SAVORY</div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary/30 pointer-events-none">SWEET / FRUITY</div>
        </>
    );
});
