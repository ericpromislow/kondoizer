import { BskyAgent }  from '@atproto/api';

let loggedIn = false;
let navLoginButton = null;
let loginForm = null;
let navLogoutButton = null;
let agent = null;

async function loginThroughAgent(loginUsername, loginPassword) {
    if (!agent) {
        agent = new BskyAgent({
            service: "https://bsky.social"
        });
    }
    await agent.login({
        identifier: loginUsername,
        password: loginPassword
    });
}

function toggleLoggedInViews() {
    const visClasses = ["show", "hide", "show"];
    let firstIndex = loggedIn ? 1 : 0;
    for (const elem of document.getElementsByClassName("loggedin-hidden")) {
        elem.classList.add(visClasses[firstIndex + 0]);
        elem.classList.remove(visClasses[firstIndex + 1]);
        // if (loggedIn) {
        //     elem.classList.add("show");
        //     elem.classList.remove("hide");
        // } else {
        //     elem.classList.add("hide");
        //     elem.classList.remove("show");
        // }
    }
    firstIndex = loggedIn ? 0 : 1;
    for (const elem of document.getElementsByClassName("loggedout-hidden")) {
        elem.classList.add(visClasses[firstIndex + 0]);
        elem.classList.remove(visClasses[firstIndex + 1]);
    }
}

function doLogin(event) {
    event.preventDefault();
    loggedIn = true;
    toggleLoggedInViews();
}

async function doLogout(event) {
    event.preventDefault();
    loggedIn = false;
    toggleLoggedInViews();
}

function handleSubmitLogin(event) {
    event.preventDefault();
    loggedIn = true;
    const form = event.currentTarget;
    const loginUsername = form.querySelector("#username").value.trim();
    const loginPassword = form.querySelector("#password").value.trim();
    const info = loginThroughAgent(loginUsername, loginPassword);
    if (info) {
        toggleLoggedInViews();
    }
}

function setupEvents() {
    navLoginButton = document.getElementById('nav-login');
    navLoginButton.addEventListener('click', doLogin);
    navLogoutButton = document.getElementById('nav-logout');
    navLogoutButton.addEventListener('click', doLogout);
    loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleSubmitLogin);
}

function initialize() {
    loggedIn = false;
    console.log("Ready are we recording");
    // toastr.info("Ready are we recording");
    setupEvents()
    toggleLoggedInViews();
    console.log("stop here")
}

window.addEventListener('load', () => {
    initialize();
});
