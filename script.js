// HammerJS is a small, standalone javascript-library that enables multitouch gestures like swipe, pinch, rotate, tap and drag
import hammerjs from "https://cdn.skypack.dev/hammerjs@2.0.8";
// Gets the photo element
var el = document.querySelector(".photo");
// Creates the object
var hammerTime = new Hammer(el);

// Unlocks vertical pan and pinch
hammerTime.get("pan").set({ direction: Hammer.DIRECTION_ALL });
hammerTime.get("pinch").set({ enable: true });

hammerTime.on("tap", function (ev) {
    console.log(ev.type);

    el.style.backgroundImage =
        'url("https://picsum.photos/' +
        getRandomIntInclusive(500, 1000) +
        "/" +
        getRandomIntInclusive(500, 1000) +
        '")';
});
// When user grabs the photo..
https: hammerTime.on("pan", function (ev) {
    // When the photo start moving, the transition become "none" to avoid delay while dragging
    el.classList.add("moving");
    // If the photo go 80px left/right, the "nope"/"like" stamp appears using css::after
    el.classList.toggle("nope", ev.deltaX < -80);
    el.classList.toggle("like", ev.deltaX > 80);
    el.classList.toggle("super_like", (ev.deltaY < -72) & (Math.abs(ev.deltaX) < 80));
    // Calculates photo rotation based on offset
    var rotate = ev.deltaX * ev.deltaY * 4e-4;
    // And applies the movement
    el.style.transform =
        "translate(" + ev.deltaX + "px, " + ev.deltaY + "px) rotate(" + rotate + "deg)";
});

// When user releases the photo..
hammerTime.on("panend", function (ev) {
    // Gets the positive value of velocity and X-deslocation
    var absVel = Math.abs(ev.velocity);
    var absDelX = Math.abs(ev.deltaX);
    // Removes the stamps and retrieve the 300ms transition
    el.classList.remove("nope", "like", "super_like", "moving");
    if (absDelX > 80) {
        // If the photo had a "like"/"dislike" reaction
        // Photo fades faster if dragged faster, beetwen 400 and 150ms
        var transitionDuration =
            250 / (absVel + 0.4) > 150
                ? 250 / (absVel + 0.4) > 400
                    ? 400
                    : 250 / (absVel + 0.4)
                : 150;
        el.style.transitionDuration = transitionDuration + "ms";
        var rotate = ev.deltaX * ev.deltaY * 4e-4;
        // And is thrown farther too
        var mult = absVel > 1.4 ? absVel : 1.4;
        el.style.transform =
            "translate(" +
            ev.deltaX * 1.4 * mult +
            "px, " +
            ev.deltaY * mult +
            "px) rotate(" +
            rotate * mult +
            "deg)";
        // Fade out
        el.style.opacity = 0;
        // And the photo returns
        repeat(transitionDuration);
    } else if (ev.deltaY < -72) {
        // If the photo had a "super like" reaction, very similar code to the previous one
        var transitionDuration =
            250 / (absVel + 0.4) > 150
                ? 250 / (absVel + 0.4) > 400
                    ? 400
                    : 250 / (absVel + 0.4)
                : 150;
        el.style.transitionDuration = transitionDuration + "ms";
        var mult = absVel > 2 ? absVel : 2;
        el.style.transform = "translate( 0px, " + ev.deltaY * mult + "px)";
        el.style.opacity = 0;
        repeat(transitionDuration);
    } else {
        // If the photo didn't have a reaction, it goes back to the middle
        el.style.transform = "";
    }
});

hammerTime.on("pinch", function (ev) {
    el.style.transitionDuration = "0ms";
    el.style.transform = "scale(" + ev.scale + ")";
});

hammerTime.on("pinchend", function (ev) {
    el.style.transform = "scale(1)";
});

// The function that brings back the photo
function repeat(transitionDuration = 350) {
    setTimeout(function () {
        el.style.backgroundImage =
            'url("https://picsum.photos/' +
            getRandomIntInclusive(500, 1000) +
            "/" +
            getRandomIntInclusive(500, 1000) +
            '")';
        el.style.transform = "";
        setTimeout(function () {
            el.classList.remove("nope", "like", "super_like", "moving");
            el.style.opacity = 1;
        }, transitionDuration);
    }, transitionDuration);
}

// The "like" and "dislike" animation
function buttonEvent(reaction) {
    // Random transition duration beetwen 300ms and 600ms
    var transitionDuration = Math.random() * 300 + 300;
    el.style.transitionDuration = transitionDuration + "ms";
    // Random X-deslocation beetwen 100px and 400px
    var x = Math.random() * 300 + 100;
    // Random Y-deslocation beetwen -200px and 200px
    var y = Math.random() * 400 - 200;
    var rotate = x * y * 4e-4;
    if (reaction == "like") {
        // If the reaction was a "like", stamps "like"
        el.classList.toggle("like");
    } else if (reaction == "dislike") {
        // If the reaction was a "dislike", stamps "nope" and moves the photo to the left
        el.classList.toggle("nope");
        x *= -1;
    } else if (reaction == "super_like") {
        el.classList.toggle("super_like");
        x = rotate = 0;
        y = y < 0 ? y * 3 : -y * 3;
    }
    el.style.transform =
        "translate(" + x + "px, " + y + "px) rotate(" + rotate + "deg)";
    el.style.opacity = 0;
    repeat(transitionDuration * 0.8);
}

// Creates button actions
document.querySelector(".fa-close").parentNode.addEventListener("click", function () {
    buttonEvent("dislike");
});

document.querySelector(".fa-star").parentNode.addEventListener("click", function () {
    buttonEvent("super_like");
});

document.querySelector(".fa-heart").parentNode.addEventListener("click", function () {
    buttonEvent("like");
});

document
    .querySelector(".fa-circle-info")
    .parentNode.addEventListener("click", function () {
        console.log("info");
    });

// Clock
var clockTicking = setInterval(clock, 1000);
function clock() {
    var d = new Date(),
        displayDate;
    displayDate = d.toLocaleTimeString();
    document.querySelector(".clock").innerHTML = displayDate.substring(0, 5);
}
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}
