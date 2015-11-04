/**
 * Parses string as xml document and returns DOM tree of elements
 * @param xmlString - string to being parsed as xml
 * @returns {*}
 */

function getXMLDocument(xmlString) {
  try {
    var parser;
    if (typeof window.DOMParser != "undefined") {
      parser = function (xmlStr) {
        var p = new window.DOMParser();
        return p.parseFromString(xmlStr, "text/xml");
      };
    } else if (typeof window.ActiveXObject != "undefined" &&
      new window.ActiveXObject("Microsoft.XMLDOM")) {
      parser = function (xmlStr) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlStr);
        return xmlDoc;
      };
    } else {
      throw new Error("No XML parser found");
    }
    return parser(xmlString);
  } catch (e) {
    return getXMLDocument('<parsererror />');
  }
}

/**
 * Checks that xml document has valid structure
 * @param xmlDoc
 * @returns {boolean} true if document has valid structure, false otherwise
 */
function isValidXMLDoc(xmlDoc) {
  var xml;
  try {
    xml = getXMLDocument("<");
    var parserErrorNS = xml.getElementsByTagName("parsererror")[0].namespaceURI;
    return xmlDoc.getElementsByTagNameNS(parserErrorNS, 'parsererror')
        .length == 0;
  } catch (e) {
    // IE throws SyntaxError
    return xmlDoc.getElementsByTagName("parsererror")
        .length == 0;
  }
}

/**
 * Removes all elements with specified tags from document
 * @param xmlDocument
 * @param tag
 */
function removeTags(xmlDocument, tag) {
  var tags = xmlDocument.getElementsByTagName(tag),
    i = tags.length;
  while (i) {
    i -= 1;
    tags[i].parentNode.removeChild(tags[i]);
  }
}

/**
 * Returns string equivalent of document
 * @param xml
 * @returns {string}
 */
function getXMLAsString(xml) {
  if (window.ActiveXObject) return xml.xml;
  else return (new XMLSerializer())
    .serializeToString(xml);
}

/**
 * Extracts error tags from xml document
 * @param xmlDoc
 */
function extractErrors(xmlDoc) {
  var tags = xmlDoc.getElementsByTagName("error"),
    i = tags.length,
    panel = document.getElementById("errors_panel");
  panel.innerHTML = "";
  var ul = panel.appendChild(document.createElement("ol"));
  while (i) {
    i -= 1;
    var text = tags[i].getAttribute("text");
    var code = tags[i].getAttribute("code");
    var item = document.createElement("li");
    var boldCode = document.createElement("b");
    boldCode.innerHTML = "Code " + code + ": ";
    var error = document.createTextNode(text);
    item.appendChild(boldCode);
    item.appendChild(error);
    ul.appendChild(item);
  }
}

/**
 * Extracts warnings tags from xml document
 * @param xmlDoc
 */
function extractWarnings(xmlDoc) {
  var tags = xmlDoc.getElementsByTagName("warning"),
    i = tags.length,
    panel = document.getElementById("warnings_panel");
  panel.innerHTML = "";
  var ul = panel.appendChild(document.createElement("ol"));
  while (i) {
    i -= 1;
    var text = tags[i].getAttribute("text");
    var item = document.createElement("li");
    var error = document.createTextNode(text);
    item.appendChild(error);
    ul.appendChild(item);
  }
}

/**
 * Escapes html entities in string
 * @param string
 * @returns {string}
 */
function escapeXML(string) {
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };
  return String(string)
    .replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
}

/**
 * Parses xml string into document, extracts errors and warnings etc
 * @param xmlString
 * @param status
 */
function parseXml(xmlString, status) {
  var xml = getXMLDocument(xmlString);
  var xmlTab = document.getElementById("xml_tab");
  xmlTab.innerHTML = "XML (" + xmlString.length + " bytes)";
  var statusTab = document.getElementById("status_tab");
  var errorCount = xml.getElementsByTagName("error")
    .length;
  var errorsTab = document.getElementById("errors_tab");
  var warningCount = xml.getElementsByTagName("warning")
    .length;
  var warningTab = document.getElementById("warnings_tab");
  errorsTab.innerHTML = "Errors (" + errorCount + ")";
  warningTab.innerHTML = "Warnings (" + warningCount + ")";
  statusTab.innerHTML = "Status: " + (isValidXMLDoc(xml) ? "OK" : "INCORRECT DATA");
  if (isValidXMLDoc(xml)) {
    extractErrors(xml);
    extractWarnings(xml);
    removeTags(xml, "error");
    removeTags(xml, "warning");
    var panel = document.getElementById("xml_panel");
    panel.innerHTML = highlightXml(xml.childNodes, "");
  } else {
    document.getElementById("xml_panel")
      .innerHTML = "";
    document.getElementById("errors_panel")
      .innerHTML = "";
    document.getElementById("warnings_panel")
      .innerHTML = "";
    hideAllPanels();
    errorsTab.innerHTML = "Errors (0)";
    warningTab.innerHTML = "Warnings (0)";
    xmlTab.innerHTML = "XML (0 bytes)";
  }
}

/**
 * Wraps element with span and returns string equivalent
 * @param value
 * @param span_class
 * @returns {string}
 */
function wrap(value, span_class) {
  return "<span class='" + span_class + "'>" + escapeXML(value) + "</span>";
}
/**
 * Returns node as spanned string
 * @param node
 * @returns {string}
 */
function getNodeAsText(node) {
  var result = wrap(node.nodeName, "tag_name") + (node.attributes.length > 0 ? " " : "");
  var attrs = node.attributes;
  for (var i = 0; i < attrs.length; i++) {
    result += wrap(attrs[i].nodeName, "attr_name");
    result += '=';
    result += wrap('"' + node.getAttribute(attrs[i].nodeName) + '"', "attr_value");
    if (i !== attrs.length - 1) result += " ";
  }
  return result;
}

/**
 * Highlights nodes and returns string equivalent
 * @param nodes
 * @param offset
 * @returns {string}
 */
function highlightXml(nodes, offset) {
  offset = offset || "";
  var result = "";
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].hasChildNodes()) {
      result += offset + "&lt;" + getNodeAsText(nodes[i]) + "&gt;\n";
      result += highlightXml(nodes[i].childNodes, offset + "&nbsp;&nbsp;");
      result += offset + "&lt;/" + wrap(nodes[i].nodeName, "tag_name") + "&gt;\n";
    } else if (nodes[i].nodeName !== "#text" && nodes[i].nodeName !== "#comment") {
      result += offset + "&lt;" + getNodeAsText(nodes[i]) + "/&gt;\n";
    } else if (nodes[i].nodeName === "#comment") {
      result += offset + wrap("<!-- " + nodes[i].nodeValue + " -->", "comment") + "\n";
    } else if (!(!nodes[i].nodeValue || /^\s*$/.test(nodes[i].nodeValue))) {
      result += offset + wrap(nodes[i].nodeValue, "text_node") + "\n";
    }
  }
  return result;
}

/**
 * onClick listener.
 * Makes GET request after clicking on button.
 */
function onGETButtonClick() {
  var url = document.getElementById("path")
    .value;
  ajaxRequest("GET", url, parseXml)
}
/**
 * onClick listener.
 * Makes POST request after clicking on button.
 */
function onPOSTButtonClick() {
  var url = document.getElementById("path")
    .value;
  ajaxRequest("POST", url, parseXml)
}

/**
 * Hide all panels, but leaves panel leavePanel opened/hidden
 * @param leavePanel
 */
function hideAllPanels(leavePanel) {
  if (leavePanel !== "xml") {
    document.getElementById("xml_panel")
      .style.display = "none";
    document.getElementById("xml_tab")
      .className = "";
  }
  if (leavePanel !== "errors") {
    document.getElementById("errors_panel")
      .style.display = "none";
    document.getElementById("errors_tab")
      .className = "";
  }
  if (leavePanel !== "warnings") {
    document.getElementById("warnings_panel")
      .style.display = "none";
    document.getElementById("warnings_tab")
      .className = "";
  }
}

/**
 * Toggles informational panel
 */
function toggleXMLPanel() {
  hideAllPanels("xml");
  var panel = document.getElementById("xml_panel");
  var tab = document.getElementById("xml_tab");
  // Don't open empty panels
  if (panel.innerHTML.length <= 0) return;
  if (panel.style.display === "none") {
    panel.style.display = "";
    tab.className = "active_tab";
  } else {
    panel.style.display = "none";
    tab.className = "";
  }
}

/**
 * Toggles errors panel
 */
function toggleErrorsPanel() {
  hideAllPanels("errors");
  var panel = document.getElementById("errors_panel");
  var tab = document.getElementById("errors_tab");
  // Don't open empty panels
  if (panel.innerHTML.length <= 0) return;
  if (panel.style.display === "none") {
    panel.style.display = "";
    tab.className = "active_tab";
  } else {
    panel.style.display = "none";
    tab.className = "";
  }
}

/**
 * Toggles warnings panel
 */
function toggleWarningsPanel() {
  hideAllPanels("warnings");
  var panel = document.getElementById("warnings_panel");
  var tab = document.getElementById("warnings_tab");
  // Don't open empty panels
  if (panel.innerHTML.length <= 0) return;
  if (panel.style.display === "none") {
    panel.style.display = "";
    tab.className = "active_tab";
  } else {
    panel.style.display = "none";
    tab.className = "";
  }
}

/**
 * Applies drag listener to elementId's titleId
 * @param elementId
 * @param titleId
 */
function initDragListener(elementId, titleId) {
  var element = document.getElementById(elementId);
  var title = document.getElementById(titleId);
  var offset = {
    x: 0,
    y: 0
  };

  function addListeners() {
    title.addEventListener('mousedown', mouseDown, false);
    window.addEventListener('mouseup', mouseUp, false);
  }

  function mouseUp() {
    window.removeEventListener('mousemove', elementMove, true);
  }

  function mouseDown(event) {
    offset.x = event.clientX - element.style.left.replace('px', '');
    offset.y = event.clientY - element.style.top.replace('px', '');
    window.addEventListener('mousemove', elementMove, true);
  }

  function elementMove(event) {
    // Do not drag when current active element is input or button
    if ((document.activeElement !== document.getElementById("path")) &&
      (document.activeElement !== document.getElementById("button_get"))) {
      element.style.position = 'absolute';
      element.style.top = event.clientY - offset.y + 'px';
      element.style.left = event.clientX - offset.x + 'px';
    }
  }

  addListeners();
}

/**
 * Makes http request to specified url and calls callback function.
 * @param method - GET or POST
 * @param url - url to request
 * @param callback - function(resultStr)
 */
function ajaxRequest(method, url, callback) {
  var request;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
  } else {
    request = new ActiveXObject("Microsoft.XMLHTTP");
  }
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      if (request.status == 200) {
        callback(request.responseText);
      } else callback("")
    } else callback("")
  };
  request.open(method, url, true);
  request.send();
}

/**
 * Creates new button with onClick listener with specified caption
 * @param caption
 * @returns {HTMLElement} new button as DOM element
 */
function getGetButton(caption) {
  var button = document.createElement("button");
  button.innerHTML = caption;
  button.id = "button_get";
  button.setAttribute("onclick", "onGETButtonClick()");
  return button;
}

/**
 * Creates new button with onClick listener with specified caption
 * @param caption
 * @returns {HTMLElement} new button as DOM element
 */
function getPostButton(caption) {
  var button = document.createElement("button");
  button.innerHTML = caption;
  button.id = "button_post";
  button.setAttribute("onclick", "onPOSTButtonClick()");
  return button;
}

/**
 * Creates new tab button
 * Used for creating tab buttons like "XMl(0 bytes)" etc
 * @param tabId
 * @param tabToggle - toggle listener
 * @param caption
 * @returns {HTMLElement}
 */
function getTabButton(tabId, tabToggle, caption) {
  var tab = document.createElement("a");
  tab.innerHTML = caption;
  tab.id = tabId;
  tab.setAttribute("onclick", tabToggle);
  tab.setAttribute("href", "#");
  return tab;
}

/**
 * Creates tab buttons that expand panels
 * @returns {HTMLElement}
 */
function getTabs() {
  var tab = document.createElement("div");
  tab.innerHTML = "Views: ";
  var xmlTab = getTabButton("xml_tab", "toggleXMLPanel()", "XML (0 bytes)");
  var errorsTab = getTabButton("errors_tab", "toggleErrorsPanel()", "Errors (0)");
  var warningsTab = getTabButton("warnings_tab", "toggleWarningsPanel()", "Warnings (0)");
  tab.appendChild(xmlTab);
  tab.appendChild(document.createTextNode(" | "));
  tab.appendChild(errorsTab);
  tab.appendChild(document.createTextNode(" | "));
  tab.appendChild(warningsTab);
  return tab;
}

/**
 * Creates status label
 * @returns {HTMLElement}
 */
function getStatusTab() {
  var statusTab = document.createElement("div");
  statusTab.innerHTML = "Status: READY";
  statusTab.id = "status_tab";
  return statusTab;
}

/**
 * Creates draggable title
 * @returns {HTMLElement}
 */
function getTitle() {
  var title = document.createElement("div");
  title.id = "title";
  title.innerHTML = "AJAX XML Viewer";
  return title;
}

/**
 * Creates new panel
 * @param panelId - id of panel
 * @param tag - tag, used for creating tab. By default = div
 * @returns {HTMLElement}
 */
function getPanel(panelId, tag) {
  tag = tag || "div";
  var panel = document.createElement(tag);
  panel.style.display = "none";
  panel.id = panelId;
  panel.className = "panel";
  panel.innerHTML = "";
  panel.style.overflow = "auto";
  panel.style.maxHeight = (window.innerHeight / 2) + "px";
  panel.style.maxWidth = (window.innerWidth / 2) + "px";
  return panel;
}

/**
 * Initializes new GUI - creates div's, elements, etc.
 */
function initGUI() {
  window.onload = function () {
    var tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.id = "tooltip";
    var input = document.createElement("input");
    input.id = "path";
    input.setAttribute("placeholder", "file.xml");
    var infoPanel = getPanel("xml_panel", "pre");
    var errorsPanel = getPanel("errors_panel");
    var warningsPanel = getPanel("warnings_panel");
    tooltip.appendChild(getTitle());
    tooltip.appendChild(input);
    tooltip.appendChild(getGetButton("GET"));
    tooltip.appendChild(getPostButton("POST"));
    tooltip.appendChild(getTabs());
    tooltip.appendChild(getStatusTab());
    tooltip.appendChild(infoPanel);
    tooltip.appendChild(errorsPanel);
    tooltip.appendChild(warningsPanel);
    document.body.appendChild(tooltip);
    initDragListener("tooltip", "title");
  };
}

initGUI();