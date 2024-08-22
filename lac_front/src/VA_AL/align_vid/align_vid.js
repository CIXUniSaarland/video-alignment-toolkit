import React from "react";
import { Breadcrumbs } from "../VA_AL";

function AlignVideos() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Align Videos' }  // Current page, no link
    ];

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2>Align Videos</h2>
        </div>
    );
}

export { AlignVideos };