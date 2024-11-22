import { BskyAgent }  from '@atproto/api';

let loggedIn = false;
let loginForm = null;
let navLogoutButton = null;
let agent = null;
let loginInfo;
let feedList = null;
const cursors = [null];
let cursorIndex = 0;
let previousPageLink = null;
let nextPageLink = null;
let checkboxMaster = null;
let deleteTweetsButton = null;

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
        elt.textContent = loginUsername;
    }
    return loginInfo;
}

async function updateFeed(loginInfo, feedCursor=undefined) {
    const h = {
        limit: 10,
        actor: loginInfo.did
    };
    feedCursor ||= currentCursor();
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
    if (feed.data.cursor && feed.data.feed.length === h.limit) {
        // Likes keep barrelling through without finding anything.
        addCursor(feed.data.cursor)
    }
    updateLinksBasedOnCursor();
    updateDeleteButtonStatus();
}

async function doDeleteTweets(event) {
    const itemsToDelete = Array.from(document.querySelectorAll('table#posts tbody#feedListAnchor td input')).filter(elt => elt.checked);
    const h = {
        repo: loginInfo.did,
        collection: "app.bsky.feed.post",
        rkey: "rkey here",
    };
    for (const elt of itemsToDelete) {
        h.rkey = elt.getAttribute("cid");
        // const result = await agent.com.atproto.repo.deleteRecord(h);
        const func = [0, 'deletePost', 'deletePost', 'deleteLike'][preferredFeedType];
        const result = await agent[func](elt.getAttribute("uri"));
        console.log(`QQQ: Deleting ${ h.rkey } => ${ result }`);
    }
    await updateFeed(loginInfo);
}

async function doPreviousPage(event) {
    if (cursorIndex <= 0) {
        throw new Error("Can't go previous at page 1")
    }
    cursorIndex -= 1;
    await updateFeed(loginInfo, currentCursor())
}

async function doNextPage(event) {
    if (cursorIndex >= cursors.length - 1) {
        throw new Error("Can't go to next page at end")
    }
    cursorIndex += 1;
    await updateFeed(loginInfo, currentCursor())
}

function clearFeed() {
    while (feedList.childElementCount > 0) {
        feedList.removeChild(feedList.firstChild);
    }
}

function populateFeed(feed) {
    let func = preferredFeedType === PREFER_LIKES ? 'getActorLikes' : 'getAuthorFeed';
    // if (preferredFeedType === PREFER_POSTS) {
    //     h.filter = "posts_no_replies"
    // }
    let itemNumber = 1;
    feed.data.feed.forEach((item, i) => {
        const post = item.post;
        const uri = post.uri;
        const record = post.record;
        if (preferredFeedType === PREFER_REPLIES && !record.reply) {
            return;
        }
        const text = record.text;
        const date = new Date(record.createdAt).toLocaleString();
        const td1 = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("uri", uri);
        cb.setAttribute("cid", post.cid);
        cb.setAttribute("name", "delete-check");
        cb.addEventListener('click', updateDeleteButtonStatus);
        td1.appendChild(cb);
        const td2 = document.createElement("td");
        td2.textContent = date;
        const td3 = document.createElement("td");
        td3.textContent = text;
        itemNumber += 1;
        const tr = document.createElement("tr");
        tr.classList.add("feed-row")
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        feedList.appendChild(tr);
    });
}

function clearCursor() {
    cursorIndex = 0;
    cursors.splice(1, cursors.length - 1);
}

function addCursor(cursor) {
    while (cursors.length <= cursorIndex + 1) {
        cursors.push("");
    }
    cursors[cursorIndex + 1] = cursor;
}

function currentCursor() {
    return cursors[cursorIndex];
}

function updateLinksBasedOnCursor() {
    if (cursorIndex > 0) {
        previousPageLink.classList.remove('hide');
        previousPageLink.classList.add('show');
    } else {
        previousPageLink.classList.remove('show');
        previousPageLink.classList.add('hide');
    }
    if (cursorIndex < cursors.length - 1) {
        nextPageLink.classList.remove('hide');
        nextPageLink.classList.add('show');
    } else {
        nextPageLink.classList.remove('show');
        nextPageLink.classList.add('hide');
    }
}

function doCheckboxMaster(event) {
    const status = event.target.checked;
    document.querySelectorAll('table#posts tbody#feedListAnchor td input').forEach((elt) => {
        elt.checked = status;
    });
    setTimeout(updateDeleteButtonStatus, 1);
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
    updateDeleteButtonStatus();
}

function updateDeleteButtonStatus() {
    const list = Array.from(document.querySelectorAll('table#posts tbody#feedListAnchor td input'));
    deleteTweetsButton.disabled = !list.some(elt => elt.checked);
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
    previousPageLink = document.querySelector('div#pagination a#previousPage');
    previousPageLink.addEventListener('click', doPreviousPage)
    nextPageLink = document.querySelector('div#pagination a#nextPage');
    nextPageLink.addEventListener('click', doNextPage);
    checkboxMaster = document.querySelector('table#posts thead td input[name="checkboxMaster"]');
    checkboxMaster.addEventListener('click', doCheckboxMaster);
    deleteTweetsButton = document.getElementById('delete-tweets');
    deleteTweetsButton.addEventListener('click', doDeleteTweets);
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
        clearCursor();
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
