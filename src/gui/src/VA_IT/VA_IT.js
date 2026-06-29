import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./VA_IT.css";

// page id -> markdown file in public/instructions/<file>.md
const PAGES = {
    overview: 'overview',
    training: 'training',
    align: 'align',
    'frame-retrieval': 'frame-retrieval',
    anomaly: 'anomaly',
};

function VA_IT() {
    const [active, setActive] = React.useState('overview');
    const [content, setContent] = React.useState('');
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        setError(false);
        setContent('');
        fetch(`/instructions/${PAGES[active]}.md`)
            .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
            .then(setContent)
            .catch(() => setError(true));
        window.scrollTo({ top: 0 });
    }, [active]);

    const NavItem = ({ id, label }) => (
        <button
            type="button"
            className={`instruction-nav-item ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
        >
            {label}
        </button>
    );

    return (
        <div className="w-100">
            <div className="instruction-layout">
                <aside className="instruction-sidebar">
                    <div className="instruction-sidebar-title">Instructions</div>
                    <NavItem id="overview" label="Overview" />
                    <NavItem id="training" label="Training" />
                    <div className="instruction-sidebar-group">Analysis</div>
                    <div className="instruction-sidebar-children">
                        <NavItem id="align" label="Align Videos" />
                        <NavItem id="frame-retrieval" label="Frame Retrieval" />
                        <NavItem id="anomaly" label="Anomaly Detection" />
                    </div>
                </aside>

                <main className="instruction-content">
                    {error ? (
                        <p className="text-muted">Could not load this page.</p>
                    ) : (
                        <div className="instruction-doc">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export { VA_IT };
