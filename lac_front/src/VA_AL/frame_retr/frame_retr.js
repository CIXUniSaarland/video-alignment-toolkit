import React from "react";
import { Breadcrumbs } from "../VA_AL";

function FrameRetrieval() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Frame Retrieval' }  // Current page, no link
    ];

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2>Frame Retrieval</h2>
        </div>
    );
}

export { FrameRetrieval };