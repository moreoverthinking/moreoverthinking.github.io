function popup() {
  var menu = document.getElementById("menuPopup");
  var fade = document.getElementById("bodyFade");
  var title = document.getElementById("webName");

  if (menu.style.animationName == "open") {
    title.style.color = "#9b8e84ff";

    menu.style.animationName = "close";
    fade.style.animationName = "fadeIn";

    fade.style.pointerEvents = "none";
    fade.onclick = null;
  }
  else {
    title.style.color = "#d5cbbaff";

    menu.style.animationName = "open";
    fade.style.animationName = "fadeOut";

    fade.style.pointerEvents = "auto";

    fade.onclick = function() {
      title.style.color = "#9b8e84ff";

      menu.style.animationName = "close";
      fade.style.animationName = "fadeIn";

      fade.style.pointerEvents = "none";
      fade.onclick = null;
    };
  }
}
