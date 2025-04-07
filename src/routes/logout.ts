import { Router } from "express";
import { APP_ADDRESS } from "../config/contants";

const logout = Router();

// Logout route
logout.get("/logout", (req, res) => {
    req.session.destroy((err) => console.error(err));
    const redirectUri = encodeURIComponent(`${APP_ADDRESS}/`);
    const logoutUrl = `https://eu-west-13haobopxe.auth.eu-west-1.amazoncognito.com/logout?client_id=5l5uqlig4pn7jevhpdd0ddcbkn&logout_uri=${redirectUri}`;
    res.redirect(logoutUrl);
});

export default logout;
