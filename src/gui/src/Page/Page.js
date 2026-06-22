import React from "react";
import { Link } from 'react-router-dom';
import "./Page.css";
import { NavLink } from 'react-router-dom';

function Footer() {
    return (
        <footer style={{ textAlign: 'center', padding: '10px 0', width: '100%' }}>
            <p>&copy;</p>
        </footer>
    );
}
function Navbar() {
    // A guarded page (Training, Align Videos, ...) sets window.__vatGuardActive when it
    // has in-progress state; intercept nav so it can confirm leaving first.
    const guardNav = (e, dest) => {
        if (window.__vatGuardActive) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('vat-confirm-leave', { detail: { dest } }));
        }
    };
    return (
        <nav className="navbar navbar-expand-lg px-5 py-3">
            <a className="navbar-brand me-5" href="/" onClick={(e) => guardNav(e, '/')}>Video Alignment Toolkit</a>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse">
                <ul className="navbar-nav">
                    <li className="nav-item px-2">
                        <NavLink
                            className="nav-link"
                            to="/va-api"
                            activeClassName="active"
                            onClick={(e) => guardNav(e, '/va-api')}
                        >
                            Training
                        </NavLink>
                    </li>
                    <li className="nav-item px-2">
                        <NavLink
                            className="nav-link"
                            to="/va-analysis"
                            activeClassName="active"
                            onClick={(e) => guardNav(e, '/va-analysis')}
                        >
                            Analysis
                        </NavLink>
                    </li>
                    <li className="nav-item px-2">
                        <NavLink
                            className="nav-link"
                            to="/va-instruction"
                            activeClassName="active"
                            onClick={(e) => guardNav(e, '/va-instruction')}
                        >
                            Instruction
                        </NavLink>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

function Page({PageComponent}) {
    return (
        <div className="App">
            <Navbar />
            <div className="container page">
                <PageComponent />
            </div>
            <Footer/>
        </div>
    );
}


const FullPageSpinner = () => {
    return (
        <div className="spinner-custom">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
};

export { Footer, Page, FullPageSpinner };