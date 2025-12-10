interface HoverBoxProps {
    region: {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        pageNumber: number;
    };
    scale: number;
    onClick: (regionId: string) => void;
}

export function HoverBox({ region, scale, onClick }: HoverBoxProps) {
    return (
        <div
            onClick={(e) => {
                console.log('HoverBox clicked!', region.id);
                e.stopPropagation();
                onClick(region.id);
            }}
            style={{
                position: 'absolute',
                left: `${region.x * scale}px`,
                top: `${region.y * scale}px`,
                width: `${region.width * scale}px`,
                height: `${region.height * scale}px`,
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.6)';
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid transparent';
                e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Click to edit"
        />
    );
}
