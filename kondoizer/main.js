import { BskyAgent }  from '@atproto/api';

let loggedIn = false;
let loginForm = null;
let navLogoutButton = null;
let agent = null;
let loginInfo;
let feedCursor = null;
let feedList = null;

const PREFER_POSTS = 1;
const PREFER_REPLIES = 2;
const PREFER_LIKES = 3;
const selectionTypeFromRadioButtons = {
    "getPostFeed" : PREFER_POSTS,
    "getReplyFeed": PREFER_REPLIES,
    "getLikeFeed": PREFER_LIKES
}
let preferredFeedType = PREFER_POSTS;

async function loginThroughAgent(loginUsername, loginPassword) {
    if (!agent) {
        agent = new BskyAgent({
            service: "https://bsky.social"
        });
    }
    const info = await agent.login({
        identifier: loginUsername,
        password: loginPassword
    });
    if (!info) {
        throw new Error("Failed to log in: agent.login => null");
    } else if (!info.success) {
        throw new Error("Failed to log in: agent.success if false");
    }
    loginInfo = info.data;
    localStorage.setItem("loggedInData", JSON.stringify(loginInfo));
    loggedIn = true;
    const elt = document.querySelector('span#nav-span-username');
    if (elt) {
        elt.textContent = "moishe";
    }
    return loginInfo;
}

async function updateFeed(loginInfo) {
    const h = {
        limit: 10,
        actor: loginInfo.did
    };
    if (feedCursor) {
        h.cursor = feedCursor;
    }
    let func = preferredFeedType === PREFER_LIKES ? 'getActorLikes' : 'getAuthorFeed';
    if (preferredFeedType === PREFER_POSTS) {
        h.filter = "posts_no_replies"
    }
    const feed = await agent.app.bsky.feed[func](h);
    console.log(`QQQ: Stop here`);
    // console.table(feed);
    if (!feed || !feed.success) {
        throw new Error("Failed to get a feed");
    }
    if (!feedList) {
        throw new Error("Failed to set  up a feed list element");
    }
    clearFeed();
    populateFeed(feed);
    if (feed.data.cursor) {
        feedCursor = feed.data.cursor;
    }
}

function clearFeed() {
    while (feedList.childElementCount > 0) {
        feedList.removeChild(feedList.firstChild);
    }
}

function populateFeed(feed) {
    if (!feedList) {
        return;
    }
    let func = preferredFeedType === PREFER_LIKES ? 'getActorLikes' : 'getAuthorFeed';
    // if (preferredFeedType === PREFER_POSTS) {
    //     h.filter = "posts_no_replies"
    // }
    feed.data.feed.forEach((item, i) => {
        const post = item.post;
        const uri = post.uri;
        const record = post.record;
        if (preferredFeedType === PREFER_REPLIES && !record.reply) {
            return;
        }
        const text = record.text;
        const date = new Date(record.createdAt).toLocaleString();
        const liString = `${ i }. ${ text } -- ${ date }`;
        const liItem = document.createElement("li");
        liItem.textContent = liString;
        liItem.setAttribute("uri", uri);
        feedList.appendChild(liItem);
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

async function doLogout(event) {
    event.preventDefault();
    loggedIn = false;
    toggleLoggedInViews();
}

async function handleSubmitLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const loginUsername = form.querySelector("#username").value.trim();
    const loginPassword = form.querySelector("#password").value.trim();
    loginInfo = await loginThroughAgent(loginUsername, loginPassword);
    toggleLoggedInViews();
    await updateFeed(loginInfo);
}

function setupEvents() {
    navLogoutButton = document.getElementById('nav-logout');
    navLogoutButton.addEventListener('click', doLogout);
    loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleSubmitLogin);
    feedList = document.getElementById('feedListAnchor');
    document.querySelectorAll('div.feedTypeForm .form-check-input').forEach((elt) => {
        elt.addEventListener('change', handleFeedTypeChange);
    });
}

function handleFeedTypeChange(event) {
    const oldPreferredFeedType = preferredFeedType;
    const form = event.currentTarget;
    event.preventDefault();
    event.target.parentElement.parentElement.classList.remove('show');
    preferredFeedType = selectionTypeFromRadioButtons[event.target.id];
    if (!preferredFeedType) {
        throw new Error(`Can't figure out how to change to ${ event.target.id }`);
    }
    if (preferredFeedType !== oldPreferredFeedType) {
        feedCursor = null;
    }
    if (loggedIn) {
        updateFeed(loginInfo);
    } else {
        console.log("You still need to log in")
    }
}

function tryLoggingInThroughStorage() {
    try {
        localStorage.setItem("loggedInData", JSON.stringify(loginInfo));
        const loggedInDataString = localStorage.getItem("loggedInData");
        if (loggedInDataString) {
            const loggedInData = JSON.parse(loggedInDataString);
            if (loggedInData.did && loggedInData.accessJwt) {
                loggedIn = true;
                loginInfo = loggedInData;
                toggleLoggedInViews();
                setTimeout(updateFeed, 1, loginInfo);
            }
        }
    } catch(ex) {
        console.log(`Ignore error ${ex} `)
    }
}

function initialize() {
    loggedIn = false;
    console.log("Ready are we recording");
    // toastr.info("Ready are we recording");
    setupEvents();
    // tryLoggingInThroughStorage();
    if (!loggedIn) {
        toggleLoggedInViews();
    }
    try {
        const selectedId = document.querySelectorAll('.form-check.feedTypeForm input.form-check-input[checked]')[0].id;
        const x = selectionTypeFromRadioButtons[selectedId];
        preferredFeedType = x || PREFER_POSTS;
    } catch(ex) {
        console.log(`Failed to find the selected item: ${ ex }`)
    }
    console.log("stop here")
}

window.addEventListener('load', () => {
    initialize();
});
