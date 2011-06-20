const EXPORTED_SYMBOLS = ["VTTabbrowserTabs"];
const TAB_DROP_TYPE = "application/x-moz-tabbrowser-tab";

/*
 * Patches for the tabbrowser-tabs object.
 * 
 * These are necessary where the original implementation assumes a
 * horizontal layout.
 */
function VTTabbrowserTabs(tabs) {
    this.tabs = tabs;
    this.init();
}
VTTabbrowserTabs.prototype = {

    init: function() {
        const tabs = this.tabs;
        ["_positionPinnedTabs",
         "_getDropIndex",
         "_isAllowedForDataTransfer",
         "_setEffectAllowedForDataTransfer"].forEach(function(methodname) {
            this.swapMethod(tabs, this, methodname);
        }, this);

        this.onDragOver = this.onDragOver.bind(this);
        tabs.addEventListener('dragover', this.onDragOver, false);
    },

    unload: function() {
        const tabs = this.tabs;
        ["_positionPinnedTabs",
         "_getDropIndex",
         "_isAllowedForDataTransfer",
         "_setEffectAllowedForDataTransfer"].forEach(function(methodname) {
            this.swapMethod(tabs, this, methodname);
        }, this);

        tabs.removeEventListener('dragover', this.onDragOver, false);
    },

    swapMethod: function(obj1, obj2, methodname) {
      let method1 = obj1[methodname];
      let method2 = obj2[methodname];
      obj1[methodname] = method2;
      obj2[methodname] = method1;
    },

    _positionPinnedTabs: function() {
        // TODO we might want to do something here.
    },

    _getDropIndex: function(event) {
        var tabs = this.childNodes;
        var tab = this._getDragTargetTab(event);
        // CHANGE for Vertical Tabs: no ltr handling, X -> Y, width -> height
        // and group support.
        for (let i = tab ? tab._tPos : 0; i < tabs.length; i++) {
            // Dropping on a group will append to that group's children.
            if (tabs[i] == tab && this.VTGroups.isGroup(tabs[i])) {
                return i + 1 + this.VTGroups.getChildren(tab).length;
            }
            if (event.screenY < tabs[i].boxObject.screenY + tabs[i].boxObject.height / 2) 
                return i;
        }
        return tabs.length;
    },

    _isAllowedForDataTransfer: function(node) {
        const window = node.ownerDocument.defaultView;
        return (node instanceof window.XULElement
                && node.localName == "tab"
                && (node.parentNode == this
                    || (node.ownerDocument.defaultView instanceof window.ChromeWindow
                        && node.ownerDocument.documentElement.getAttribute("windowtype") == "navigator:browser")));

    },

    _setEffectAllowedForDataTransfer: function(event) {
        var dt = event.dataTransfer;
        // Disallow dropping multiple items
        if (dt.mozItemCount > 1)
            return dt.effectAllowed = "none";

        var types = dt.mozTypesAt(0);
        // tabs are always added as the first type
        if (types[0] == TAB_DROP_TYPE) {
            let sourceNode = dt.mozGetDataAt(TAB_DROP_TYPE, 0);
            if (this._isAllowedForDataTransfer(sourceNode)) {
                if (sourceNode.parentNode == this &&
                    // CHANGE for Vertical Tabs: X -> Y, width -> height
                    (event.screenY >= sourceNode.boxObject.screenY &&
                     event.screenY <= (sourceNode.boxObject.screenY +
                                       sourceNode.boxObject.height))) {
                    return dt.effectAllowed = "none";
                }

                return dt.effectAllowed = "copyMove";
            }
        }

        if (browserDragAndDrop.canDropLink(event)) {
            // Here we need to do this manually
            return dt.effectAllowed = dt.dropEffect = "link";
        }
        return dt.effectAllowed = "none";
    },

    // Calculate the drop indicator's position for vertical tabs.
    // Overwrites what the original 'dragover' event handler does
    // towards the end.
    onDragOver: function(aEvent) {
        const tabs = this.tabs;
        let ind = tabs._tabDropIndicator;
        let newIndex = tabs._getDropIndex(aEvent);
        let rect = tabs.getBoundingClientRect();
        let newMargin;

        if (newIndex == tabs.childNodes.length) {
            let tabRect = tabs.childNodes[newIndex-1].getBoundingClientRect();
            newMargin = tabRect.bottom - rect.top;
        } else {
            let tabRect = tabs.childNodes[newIndex].getBoundingClientRect();
            newMargin = tabRect.top - rect.top;
        }

        newMargin += ind.clientHeight / 2;
        ind.style.MozTransform = "translate(0, " + Math.round(newMargin) + "px)";
        ind.style.MozMarginStart = null;
        ind.style.marginTop = null;
        ind.style.maxWidth = rect.width + "px";
    }

};
