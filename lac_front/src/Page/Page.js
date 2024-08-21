import React from "react";
import { Link } from 'react-router-dom';
import "./Page.css";
import { NavLink } from 'react-router-dom';

function Footer() {
    return (
        <footer style={{ textAlign: 'center', padding: '10px 0', width: '100%' }}>
            <p>&copy; 2024 Computational Interaction Group, Saarland University. All rights reserved.</p>
        </footer>
    );
}
function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg px-5 py-3">
            <a className="navbar-brand me-5" href="/">Video Alignment Toolkit</a>
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
                        >
                            Training
                        </NavLink>
                    </li>
                    <li className="nav-item px-2">
                        <NavLink
                            className="nav-link"
                            to="/va-analysis"
                            activeClassName="active"
                        >
                            Analysis
                        </NavLink>
                    </li>
                    <li className="nav-item px-2">
                        <NavLink
                            className="nav-link"
                            to="/va-instruction"
                            activeClassName="active"
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

export { Footer, Page };