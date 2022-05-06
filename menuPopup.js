function popup() {
  var menu = document.getElementById("menuPopup")
  var fade = document.getElementById("bodyFade")
  if (menu.style.animationName == "open") {
    menu.style.animationName = "close";
    fade.style.animationName = "fadeIn";

    fade.style.pointerEvents = "none";
    fade.onclick = null;
  }
  else {
    menu.style.animationName = "open";
    fade.style.animationName = "fadeOut";

    fade.style.pointerEvents = "auto";
    fade.onclick = function() {
      menu.style.animationName = "close";
      fade.style.animationName = "fadeIn";

      fade.style.pointerEvents = "none";
      fade.onclick = null;
    };
  }
}
