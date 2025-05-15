import { Router } from "express";
import { REDIRECT_ADDRESS } from "../config/contants";
import { activeSessions } from "../server";

const logout = Router();

// Logout route
logout.get("/logout", (req, res) => {
    req.session.destroy((err) => console.error(err));
    const redirectUri = encodeURIComponent(`${REDIRECT_ADDRESS}/auth`);
    const logoutUrl = `https://eu-west-13haobopxe.auth.eu-west-1.amazoncognito.com/logout?client_id=5l5uqlig4pn7jevhpdd0ddcbkn&logout_uri=${redirectUri}`;
    req.session.destroy((err) => {
        if (!err) activeSessions.dec();
    });
    res.redirect(logoutUrl);
});

export default logout;
