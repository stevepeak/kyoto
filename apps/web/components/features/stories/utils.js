"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoryStatePillStyles = getStoryStatePillStyles;
function getStoryStatePillStyles(state) {
    switch (state) {
        case 'active':
            return {
                className: 'border-chart-1/30 bg-chart-1/10 text-chart-1',
                label: 'Active',
            };
        case 'generated':
            return {
                className: 'border-primary/30 bg-primary/10 text-primary',
                label: 'Review Generated',
            };
        case 'paused':
            return {
                className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
                label: 'Paused',
            };
        case 'archived':
            return {
                className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
                label: 'Archived',
            };
        case 'planned':
            return {
                className: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
                label: 'Planned',
            };
        case 'processing':
            return {
                className: 'border-primary/30 bg-primary/10 text-primary',
                label: 'Processing',
            };
    }
}
