function popup() {
  var menu = document.getElementById("menuPopup")
  if (menu.style.animationName == "open") {
    menu.style.animationName = "close";
  }
  else {
    menu.style.animationName = "open";
  }
}
