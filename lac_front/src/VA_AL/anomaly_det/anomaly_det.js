import React from "react";
import { Breadcrumbs } from "../VA_AL";

function AnomalyDetection() {
    const breadcrumbItems = [
        { label: 'Home', link: '/' },
        { label: 'Analysis', link: '/va-analysis' },
        { label: 'Anomaly Detection' }  // Current page, no link
    ];

    return (
        <div className="w-100">
            <Breadcrumbs breadcrumbs={breadcrumbItems} />
            <h2>Anomaly Detection</h2>
        </div>
    );
}

export { AnomalyDetection };