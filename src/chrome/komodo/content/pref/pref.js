var hPrefWindow = null;
var prefPanelTree = null;
var view = null;
var part = null;
var prefInvokeType = "global";
var prefs = Components.classes["@activestate.com/koPrefService;1"].
    getService(Components.interfaces.koIPrefService).prefs;
var lastFilter = "";
var preflog = ko.logging.getLogger('prefs');

var koFilterBox;

/* General startup routine for preferences dialog.
 * Place all necessary modifications to pref tree here.
 *    "windows.arguments[0]" can be null or a string identifying the
 *        pref panel to open. If null, then the last used pref panel
 *        is opened. The correct string is the id attribute of the
 *        <treeitem> tags in preftree.xul. For example: "debuggerItem",
 *        "editorItem", "perlItem".
 */
function Onload()
{
    hPrefWindow = new koPrefWindow('panelFrame', null, true);
    prefPanelTree = document.getElementById( "prefsTree" );

    if (!hPrefWindow) {
        throw new Error("failed to create prefwindow");
    }
    var filteredTreeView = setupFilteredTree();
    hPrefWindow.setTreeView(filteredTreeView);
    document.getElementById("pref-deck").selectedIndex = 1;
    hPrefWindow.prefDeckSwitched(1);

    // The following selects the default selection (see preftree.xul
    // for the ids of the treeitems to choose from)
    // if an argument is passed in, otherwise loads it from a preference.
    var selectedItem;
    if (window.arguments && window.arguments[0] != null) {
        selectedItem = window.arguments[0];
    } else {
        selectedItem = Components.classes["@activestate.com/koPrefService;1"]
              .getService(Components.interfaces.koIPrefService).prefs
              .getStringPref('defaultSelectedPref');
    }
    if (!selectedItem || !document.getElementById(selectedItem)) {
        var firstChild = document.getElementById( "panelChildren" ).firstChild;
        selectedItem = firstChild.getAttribute('id');
    }
    switchToPanel(selectedItem);
    koFilteredTreeView.loadPrefsFullText();
}

function switchToPanel(selectedItem) {
    hPrefWindow.helper.selectRowById(selectedItem);
    prefPanelTree.focus();
}

function doOk() {
    if (!hPrefWindow.onOK())
        return false;
    return true;
}

function doApply() {
    if ( ! hPrefWindow.onApply())
        return false;

    // The pref change itself might trigger more pref changes from
    // observers, give them a bit of time to modify prefs further
    // before we reinitialize
    // todo: use actual events for this
    // todo: block pref ui while this is in progress
    setTimeout(function()
    {
        hPrefWindow.orig_prefset = null;
        hPrefWindow.init();
    }, 500);

    return true;
}

function doCancel() {
    if (!hPrefWindow.onCancel())
        return false;
    return true;
}

function getHelpTag() {
    return hPrefWindow.helper.getSelectedCellValue("helptag");
}

function canHelp() {
    // enable or disable the help button based on whether a tag exists
    var helpTag = getHelpTag();
    // help_tag2page located in launch.js
    if (helpTag) {
        document.getElementById('prefs_help_button').removeAttribute('disabled');
    } else {
        document.getElementById('prefs_help_button').setAttribute('disabled','true');
    }
}

function doHelp() {
    var tag = getHelpTag();
    if (tag.indexOf(".html") >= 0)
    {
        ko.windowManager.getMainWindow().ko.help.open(tag);
    }
    else
    {
        tag = "prefs.html#"+tag.replace(/\_/g,"-").toLowerCase();
        ko.windowManager.getMainWindow().ko.help.open(tag);
    }
}

function setupFilteredTree() {
    var filteredTreeView = koFilteredTreeView.getPrefTreeView.apply(koFilteredTreeView);
    if (!filteredTreeView) {
        throw new Error("Couldn't create a filteredTreeView");
    }
    var filteredTree = document.getElementById("filteredPrefsTree");
    filteredTree.treeBoxObject
                .QueryInterface(Components.interfaces.nsITreeBoxObject)
                .view = filteredTreeView;
    koFilterBox = document.getElementById("pref-filter-textbox");
    return filteredTreeView;
}

function onFilterKeypress(event) {
    try {
        if (event.keyCode == event.DOM_VK_ESCAPE) {
            if (koFilterBox.value !== '') {
                koFilterBox.value = '';
                koFilteredTreeView.updateFilter("");
                lastFilter = "";
                event.cancelBubble = true;
                event.stopPropagation();
                event.preventDefault();
            }
            return;
        }
    } catch (e) {
        preflog.exception(e);
    }
}

function updateFilter(event) {
    lastFilter = koFilterBox.value;
    koFilteredTreeView.updateFilter(koFilterBox.value);
}

