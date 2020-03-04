function removeElement(elementId) {
  // Remove element from doc
  var element = document.getElementById(elementId);
  element.parentNode.removeChild(element);
}
